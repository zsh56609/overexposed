// Effect application and card-zone mechanics.
//
// Everything here mutates a Draft: a private working copy that exists only inside one reducer
// call (openDraft → mutate → closeDraft). The GameState passed to the reducer is never touched,
// so from the outside the reducer stays (state, action) => state and pure.

import {
  ADD_CARD_ZONES,
  CoreError,
  getCard,
  RESOURCE_KEYS,
  type AddCardZone,
  type ContentIndex,
  type Effect,
  type ResourceKey,
} from './content.ts';
import { evaluate } from './conditions.ts';
import { cursor, nextInt, shuffleInPlace, type RngCursor } from './rng.ts';
import type { CardInstance, DraftState, GameEvent, GameState, GateRecord, Phase, RerollRecord, YearRecord } from './state.ts';

/** Max effect applications per action. A content loop (onDraw → draw → …) fails loudly instead of hanging. */
export const EFFECT_BUDGET = 10_000;

export interface Draft {
  seed: number;
  strict: boolean;
  content: ContentIndex;
  rng: RngCursor;
  phase: Phase;
  act: number;
  turn: number;
  slots: number;
  resources: Record<ResourceKey, number>;
  flags: Record<string, true>;
  heatLedger: { start: number; startSource: string | null; changes: { cardId: string | null; delta: number }[] };
  /** The card whose effects are resolving right now (null: a gate or the engine). Draft-only, never in GameState. */
  source: string | null;
  deck: CardInstance[];
  hand: CardInstance[];
  discard: CardInstance[];
  exhausted: CardInstance[];
  nextUid: number;
  /** Immutable; replaced whole on change. */
  draft: DraftState | null;
  gateOffer: string[];
  gateHistory: GateRecord[];
  rerolls: RerollRecord[];
  manager: string | null;
  establishedLane: string | null;
  endingId: string | null;
  careerPlays: Record<string, number>;
  year: YearRecord;
  events: GameEvent[];
  budget: number;
}

export function openDraft(s: GameState): Draft {
  return {
    seed: s.seed,
    strict: s.strict,
    content: s.content,
    rng: cursor(s.rng),
    phase: s.phase,
    act: s.act,
    turn: s.turn,
    slots: s.slots,
    resources: { ...s.resources },
    flags: { ...s.flags },
    heatLedger: { start: s.heatLedger.start, startSource: s.heatLedger.startSource, changes: [...s.heatLedger.changes] },
    source: null,
    deck: [...s.deck],
    hand: [...s.hand],
    discard: [...s.discard],
    exhausted: [...s.exhausted],
    nextUid: s.nextUid,
    draft: s.draft,
    gateOffer: [...s.gateOffer],
    gateHistory: [...s.gateHistory],
    rerolls: [...s.rerolls],
    manager: s.manager,
    establishedLane: s.establishedLane,
    endingId: s.endingId,
    careerPlays: { ...s.careerPlays },
    year: s.year,
    events: [],
    budget: EFFECT_BUDGET,
  };
}

/** Hand the draft's arrays over as the new state. The draft must not be used afterwards. */
export function closeDraft(d: Draft): GameState {
  return {
    seed: d.seed,
    strict: d.strict,
    content: d.content,
    rng: d.rng,
    phase: d.phase,
    act: d.act,
    turn: d.turn,
    slots: d.slots,
    resources: d.resources,
    flags: d.flags,
    heatLedger: d.heatLedger,
    deck: d.deck,
    hand: d.hand,
    discard: d.discard,
    exhausted: d.exhausted,
    nextUid: d.nextUid,
    draft: d.draft,
    gateOffer: d.gateOffer,
    gateHistory: d.gateHistory,
    rerolls: d.rerolls,
    manager: d.manager,
    establishedLane: d.establishedLane,
    endingId: d.endingId,
    careerPlays: d.careerPlays,
    year: d.year,
    events: d.events,
  };
}

/** Bad content: throw in strict mode, otherwise record a warning and carry on. */
export function fault(d: Draft, code: string, ref: string): void {
  if (d.strict) throw new CoreError(code, ref);
  d.events.push({ type: 'warning', code, ref });
}

function isCount(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 0;
}

function isDelta(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n);
}

// ---------------------------------------------------------------------------
// Effects

export function applyEffects(d: Draft, effects: readonly Effect[] | undefined): void {
  if (!effects) return;
  for (const effect of effects) applyEffect(d, effect);
}

function applyEffect(d: Draft, e: Effect): void {
  if (d.budget <= 0) return;
  if (--d.budget === 0) {
    fault(d, 'effectBudgetExceeded', String(EFFECT_BUDGET));
    return;
  }
  switch (e.op) {
    case 'resource':
      if (!(RESOURCE_KEYS as readonly string[]).includes(e.target)) return fault(d, 'unknownResource', String(e.target));
      if (!isDelta(e.value)) return fault(d, 'badNumber', 'resource.value');
      addResource(d, e.target, e.value);
      return;
    case 'draw':
      if (!isCount(e.count)) return fault(d, 'badNumber', 'draw.count');
      drawCards(d, e.count);
      return;
    case 'addCard': {
      const count = e.count ?? 1;
      if (!getCard(d.content, e.cardId)) return fault(d, 'unknownCard', String(e.cardId));
      if (!(ADD_CARD_ZONES as readonly string[]).includes(e.to)) return fault(d, 'unknownZone', String(e.to));
      if (!isCount(count)) return fault(d, 'badNumber', 'addCard.count');
      for (let i = 0; i < count; i++) addCard(d, e.cardId, e.to);
      return;
    }
    case 'exhaustTag': {
      const count = e.count ?? 1;
      if (!isCount(count)) return fault(d, 'badNumber', 'exhaustTag.count');
      exhaustTag(d, e.tag, count);
      return;
    }
    case 'slots':
      if (!isDelta(e.value)) return fault(d, 'badNumber', 'slots.value');
      addSlots(d, e.value);
      return;
    case 'setFlag':
      setFlag(d, e.flag);
      return;
    case 'conditional':
      applyEffects(d, evaluate(e.if, d) ? e.then : e.else);
      return;
    default:
      // Content is JSON, so an op outside the closed set can still arrive at runtime.
      return fault(d, 'unknownOp', String((e as { readonly op?: unknown }).op));
  }
}

// ---------------------------------------------------------------------------
// Primitives. All numbers floor at 0.

export function addResource(d: Draft, target: ResourceKey, delta: number): void {
  const before = d.resources[target];
  const after = Math.max(0, before + delta);
  d.resources[target] = after;
  if (after === before) return;
  d.events.push({ type: 'resource', target, delta: after - before, value: after });
  if (target === 'heat') d.heatLedger.changes.push({ cardId: d.source, delta: after - before });
}

/** Apply a card's effects with that card recorded as their source (for heat blame). */
export function applyCardEffects(d: Draft, cardId: string, effects: readonly Effect[] | undefined): void {
  if (!effects) return;
  const previous = d.source;
  d.source = cardId;
  applyEffects(d, effects);
  d.source = previous;
}

export function addSlots(d: Draft, delta: number): void {
  const before = d.slots;
  d.slots = Math.max(0, before + delta);
  if (d.slots !== before) d.events.push({ type: 'slots', delta: d.slots - before, value: d.slots });
}

function setFlag(d: Draft, flag: string): void {
  if (Object.prototype.hasOwnProperty.call(d.flags, flag)) return;
  d.flags[flag] = true;
  d.events.push({ type: 'flag', flag, source: d.source });
}

/** Create a new card instance. 'deck' shuffles it in at a seeded random position. */
export function addCard(d: Draft, cardId: string, to: AddCardZone): CardInstance {
  const card: CardInstance = { uid: d.nextUid++, cardId };
  if (to === 'deck') d.deck.splice(nextInt(d.rng, d.deck.length + 1), 0, card);
  else if (to === 'hand') d.hand.push(card);
  else d.discard.push(card);
  d.events.push({ type: 'addCard', uid: card.uid, cardId, to });
  return card;
}

/** Permanently remove up to `count` cards carrying `tag`, searching hand, then discard, then deck. */
function exhaustTag(d: Draft, tag: string, count: number): void {
  let left = count;
  for (const zone of [d.hand, d.discard, d.deck]) {
    for (let i = 0; i < zone.length && left > 0; ) {
      const card = zone[i] as CardInstance;
      if (getCard(d.content, card.cardId)?.tags?.includes(tag)) {
        zone.splice(i, 1);
        d.exhausted.push(card);
        d.events.push({ type: 'exhaust', uid: card.uid, cardId: card.cardId });
        left--;
      } else {
        i++;
      }
    }
  }
}

/** Draw one card, reshuffling the discard pile when the deck is empty. False if both are empty. */
function drawOne(d: Draft): boolean {
  if (d.deck.length === 0) {
    if (d.discard.length === 0) return false;
    d.deck = d.discard;
    d.discard = [];
    shuffleInPlace(d.rng, d.deck);
    d.events.push({ type: 'shuffle', count: d.deck.length });
  }
  const card = d.deck.pop() as CardInstance;
  d.hand.push(card);
  d.events.push({ type: 'draw', uid: card.uid, cardId: card.cardId });
  applyCardEffects(d, card.cardId, getCard(d.content, card.cardId)?.onDraw);
  return true;
}

export function drawCards(d: Draft, count: number): void {
  for (let i = 0; i < count; i++) if (!drawOne(d)) return;
}

/** Refill the hand up to handSize. Cards already in hand (e.g. added by effects) count. */
export function drawToHandSize(d: Draft): void {
  while (d.hand.length < d.content.rules.handSize && d.budget > 0) {
    if (!drawOne(d)) return;
  }
}
