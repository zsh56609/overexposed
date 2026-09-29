// (state, action) => state. Pure. The only place game state changes.
//
// Run flow (CLAUDE.md §2):
//   start of act:  draft — pick from an offer of cards; capital buys an extra pick or a reroll
//   start of turn: slots refresh, draw to hand size (onDraw fires per card)
//   PLAY_CARD:     spend slots, apply effects, card goes to discard
//   END_TURN:      onEndOfTurn for cards in hand → heat check (Heat → Scandal) → hand discarded
//                  → next turn, or the act's Gate after its last turn
//   CHOOSE_GATE:   requires → onPass / onFail → next act (its draft), or ending resolution after the last act

import { CoreError, getCard, getGate, type GateDef } from './content.ts';
import { effectiveHeatThreshold, evaluate, explainCondition, scandalCount, type ClauseReport } from './conditions.ts';
import { nextInt } from './rng.ts';
import {
  addCard,
  addResource,
  applyCardEffects,
  applyEffects,
  closeDraft,
  drawToHandSize,
  fault,
  openDraft,
  type Draft,
} from './resolve.ts';
import type { GameState } from './state.ts';

export type Action =
  | { readonly type: 'DRAFT_PICK'; readonly cardId: string }
  | { readonly type: 'DRAFT_EXTRA_PICK' }
  | { readonly type: 'DRAFT_REROLL' }
  | { readonly type: 'PLAY_CARD'; readonly uid: number }
  | { readonly type: 'END_TURN' }
  | { readonly type: 'CHOOSE_GATE'; readonly gateId: string };

export function reduce(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'DRAFT_PICK':
      return draftPick(state, action.cardId);
    case 'DRAFT_EXTRA_PICK':
      return draftExtraPick(state);
    case 'DRAFT_REROLL':
      return draftReroll(state);
    case 'PLAY_CARD':
      return playCard(state, action.uid);
    case 'END_TURN':
      return endTurn(state);
    case 'CHOOSE_GATE':
      return chooseGate(state, action.gateId);
    default:
      return illegal(state, 'unknownAction', String((action as { readonly type?: unknown }).type));
  }
}

/** An action the current state doesn't allow: throws in strict mode, otherwise a no-op. */
function illegal(state: GameState, code: string, ref: string): GameState {
  if (state.strict) throw new CoreError(code, ref);
  return state;
}

// ---------------------------------------------------------------------------
// Queries (read-only; for the UI and the sim)

/** Why a card can't be played right now. Ids and numbers only; the UI words them. */
export type PlayBlocker =
  | { readonly code: 'notPlayPhase' }
  | { readonly code: 'notInHand' }
  /** Scandals (and any `playable: false` card) only take up room in the hand. */
  | { readonly code: 'unplayable' }
  | { readonly code: 'slots'; readonly cost: number; readonly slots: number }
  /** The card's `requires` doesn't hold: the clauses that fail. */
  | { readonly code: 'requires'; readonly clauses: readonly ClauseReport[] };

/** Whether a card in hand can be played, and every reason it can't. The one place that rule lives. */
export function playCheck(state: GameState, uid: number): { readonly ok: boolean; readonly blockers: readonly PlayBlocker[] } {
  if (state.phase !== 'play') return { ok: false, blockers: [{ code: 'notPlayPhase' }] };
  const card = state.hand.find((c) => c.uid === uid);
  const def = card && getCard(state.content, card.cardId);
  if (!def) return { ok: false, blockers: [{ code: 'notInHand' }] };
  if (def.playable === false) return { ok: false, blockers: [{ code: 'unplayable' }] };
  const blockers: PlayBlocker[] = [];
  if (def.cost > state.slots) blockers.push({ code: 'slots', cost: def.cost, slots: state.slots });
  if (!evaluate(def.requires, state)) {
    blockers.push({ code: 'requires', clauses: explainCondition(def.requires, state).filter((c) => !c.met) });
  }
  return { ok: blockers.length === 0, blockers };
}

export function canPlay(state: GameState, uid: number): boolean {
  return playCheck(state, uid).ok;
}

/** One more pick from the same offer: affordable, under the cap, and a card left to take. */
export function canBuyExtraPick(state: GameState): boolean {
  const dr = state.draft;
  const cfg = state.content.rules.draft;
  return (
    state.phase === 'draft' &&
    dr !== null &&
    dr.extraPicksBought < cfg.maxExtraPicks &&
    state.resources.capital >= cfg.extraPickCost &&
    dr.offer.length > dr.picksLeft
  );
}

export function canReroll(state: GameState): boolean {
  const dr = state.draft;
  const cfg = state.content.rules.draft;
  return state.phase === 'draft' && dr !== null && dr.rerollsUsed < cfg.maxRerolls && state.resources.capital >= cfg.rerollCost;
}

export function legalActions(state: GameState): Action[] {
  switch (state.phase) {
    case 'draft': {
      const dr = state.draft;
      if (!dr) return [];
      const actions: Action[] = dr.picksLeft > 0 ? dr.offer.map((cardId) => ({ type: 'DRAFT_PICK', cardId })) : [];
      if (canBuyExtraPick(state)) actions.push({ type: 'DRAFT_EXTRA_PICK' });
      if (canReroll(state)) actions.push({ type: 'DRAFT_REROLL' });
      return actions;
    }
    case 'play': {
      const plays: Action[] = state.hand
        .filter((c) => canPlay(state, c.uid))
        .map((c) => ({ type: 'PLAY_CARD', uid: c.uid }));
      return [...plays, { type: 'END_TURN' }];
    }
    case 'gate':
      return state.gateOffer.map((gateId) => ({ type: 'CHOOSE_GATE', gateId }));
    case 'ended':
      return [];
  }
}

/** Turn number within the current act, 1-based. */
export function turnInAct(state: { readonly turn: number; readonly act: number; readonly content: GameState['content'] }): number {
  return state.turn - (state.act - 1) * state.content.rules.turnsPerAct;
}

// ---------------------------------------------------------------------------
// Actions

function draftPick(state: GameState, cardId: string): GameState {
  const dr = state.draft;
  if (state.phase !== 'draft' || !dr || dr.picksLeft <= 0 || !dr.offer.includes(cardId)) {
    return illegal(state, 'illegalDraftPick', cardId);
  }
  const d = openDraft(state);
  const card = addCard(d, cardId, 'deck');
  d.events.push({ type: 'draftPick', uid: card.uid, cardId });
  const offer = dr.offer.filter((id) => id !== cardId);
  d.draft = { ...dr, offer, picksLeft: dr.picksLeft - 1 };
  if (d.draft.picksLeft === 0 || offer.length === 0) {
    d.draft = null;
    startTurn(d);
  }
  return closeDraft(d);
}

function draftExtraPick(state: GameState): GameState {
  const dr = state.draft;
  if (!canBuyExtraPick(state) || !dr) return illegal(state, 'illegalExtraPick', String(state.act));
  const d = openDraft(state);
  const cost = d.content.rules.draft.extraPickCost;
  addResource(d, 'capital', -cost);
  d.draft = { ...dr, picksLeft: dr.picksLeft + 1, extraPicksBought: dr.extraPicksBought + 1 };
  d.events.push({ type: 'draftExtraPick', cost });
  return closeDraft(d);
}

function draftReroll(state: GameState): GameState {
  const dr = state.draft;
  if (!canReroll(state) || !dr) return illegal(state, 'illegalReroll', String(state.act));
  const d = openDraft(state);
  const cost = d.content.rules.draft.rerollCost;
  addResource(d, 'capital', -cost);
  const offer = rollOffer(d);
  d.draft = { ...dr, offer, picksLeft: Math.min(dr.picksLeft, offer.length), rerollsUsed: dr.rerollsUsed + 1 };
  d.events.push({ type: 'draftReroll', cost }, { type: 'draftOffer', act: d.act, cardIds: offer });
  if (d.draft.picksLeft === 0) {
    d.draft = null;
    startTurn(d);
  }
  return closeDraft(d);
}

function playCard(state: GameState, uid: number): GameState {
  if (!canPlay(state, uid)) return illegal(state, 'illegalPlay', String(uid));
  const d = openDraft(state);
  const index = d.hand.findIndex((c) => c.uid === uid);
  const [card] = d.hand.splice(index, 1);
  if (!card) return illegal(state, 'illegalPlay', String(uid));
  const def = getCard(d.content, card.cardId);
  if (!def) return illegal(state, 'unknownCard', card.cardId);

  d.slots -= def.cost;
  d.events.push({ type: 'play', uid: card.uid, cardId: card.cardId, cost: def.cost });
  applyCardEffects(d, card.cardId, def.effects);
  // Opportunities are one-shot: spent, not discarded.
  if (def.kind === 'opportunity') {
    d.exhausted.push(card);
    d.events.push({ type: 'exhaust', uid: card.uid, cardId: card.cardId });
  } else {
    d.discard.push(card);
  }
  return closeDraft(d);
}

function endTurn(state: GameState): GameState {
  if (state.phase !== 'play') return illegal(state, 'illegalEndTurn', state.phase);
  const d = openDraft(state);
  const rules = d.content.rules;

  // 1. End-of-turn penalties/bonuses for every card still in hand, in hand order.
  for (const card of [...d.hand]) {
    if (!d.hand.includes(card)) continue; // removed by an earlier trigger this turn
    applyCardEffects(d, card.cardId, getCard(d.content, card.cardId)?.onEndOfTurn);
  }

  // 2. Heat → Scandal: one scandal per full effective threshold of heat; a residue carries over.
  const threshold = effectiveHeatThreshold(d);
  const crystallised = crystallise(d, threshold);

  // 3. The hand goes to the discard pile, scandals included.
  d.discard.push(...d.hand);
  d.hand = [];
  d.events.push({
    type: 'turnEnd',
    act: d.act,
    turn: d.turn,
    resources: { ...d.resources },
    scandalCount: scandalCount(d),
    threshold,
    crystallised,
  });

  // 4. Next turn (its draft first, if it has one), or this act's Gate.
  if (turnInAct(d) >= rules.turnsPerAct) offerGates(d);
  else {
    d.turn++;
    beginTurn(d);
  }
  return closeDraft(d);
}

function chooseGate(state: GameState, gateId: string): GameState {
  if (state.phase !== 'gate' || !state.gateOffer.includes(gateId)) return illegal(state, 'illegalGate', gateId);
  const gate = getGate(state.content, gateId);
  if (!gate) return illegal(state, 'unknownGate', gateId);
  const d = openDraft(state);

  const passed = evaluate(gate.requires, d);
  d.events.push({ type: 'gate', gateId, passed });
  // Failing a Gate is a setback, never a run-ender: both branches continue the run.
  applyEffects(d, passed ? gate.onPass : gate.onFail);
  d.gateHistory.push({ act: d.act, offered: d.gateOffer, gateId, passed });
  d.gateOffer = [];
  advanceAct(d);
  return closeDraft(d);
}

// ---------------------------------------------------------------------------
// Flow steps (operate on the reducer's draft)

/** Open the current turn: a card draft first if this turn-in-act is listed in draft.atTurns, else play. */
export function beginTurn(d: Draft): void {
  const cfg = d.content.rules.draft;
  if (!cfg || cfg.picks <= 0 || !cfg.atTurns.includes(turnInAct(d))) return startTurn(d);
  const offer = rollOffer(d);
  if (offer.length === 0) {
    fault(d, 'noDraftPool', String(d.act));
    return startTurn(d);
  }
  d.phase = 'draft';
  d.draft = { offer, picksLeft: Math.min(cfg.picks, offer.length), extraPicksBought: 0, rerollsUsed: 0 };
  d.events.push({ type: 'draftOffer', act: d.act, cardIds: offer });
}

/** Seeded sample of distinct draftable cards whose actMin has been reached, in content order. */
function rollOffer(d: Draft): string[] {
  const pool = d.content.draftPool.filter((id) => (getCard(d.content, id)?.actMin ?? 1) <= d.act);
  const n = Math.min(d.content.rules.draft.offerSize, pool.length);
  const order = [...pool];
  for (let i = 0; i < n; i++) {
    const j = i + nextInt(d.rng, order.length - i);
    [order[i], order[j]] = [order[j] as string, order[i] as string];
  }
  const picked = new Set(order.slice(0, n));
  return pool.filter((id) => picked.has(id));
}

/** Refresh slots and draw to hand size. */
export function startTurn(d: Draft): void {
  d.phase = 'play';
  d.slots = d.content.rules.slotsPerTurn;
  d.events.push({ type: 'turnStart', act: d.act, turn: d.turn });
  drawToHandSize(d);
}

/**
 * count = floor(heat / threshold): add `count` Scandals to the discard pile and remove vent × count
 * heat. vent < threshold, so a residue always carries into the next turn — the cascade's medium —
 * and each new scandal lowers the next turn's threshold. Returns the count.
 *
 * Failure is never random: scandal k is blamed on the card whose heat pushed the level over its
 * line, k × threshold (found by replaying this turn's heat changes), and becomes the kind of trouble
 * that card courts — see pickScandal. Then a new heat ledger opens for the next turn.
 */
function crystallise(d: Draft, threshold: number): number {
  const ledger = d.heatLedger;
  const count = threshold > 0 ? Math.floor(d.resources.heat / threshold) : 0;

  const blame: (string | null)[] = [];
  let level = ledger.start;
  let lastPusher = ledger.startSource;
  for (let k = 1; k <= count && k * threshold <= level; k++) blame[k] = ledger.startSource;
  for (const change of ledger.changes) {
    const before = level;
    level += change.delta;
    if (change.delta <= 0) continue;
    lastPusher = change.cardId;
    for (let k = Math.floor(before / threshold) + 1; k <= count && k * threshold <= level; k++) blame[k] = change.cardId;
  }

  const pool = d.content.scandalIds.filter((id) => (getCard(d.content, id)?.actMin ?? 1) <= d.act);
  let made = 0;
  if (count > 0 && pool.length === 0) fault(d, 'noScandalForAct', String(d.act));
  else {
    for (let k = 1; k <= count; k++) {
      const cause = blame[k] ?? lastPusher;
      const { cardId, byTag } = pickScandal(d, pool, cause);
      const card = addCard(d, cardId, 'discard');
      d.events.push({ type: 'scandal', uid: card.uid, cardId, cause, byTag });
      made++;
    }
    if (made > 0) addResource(d, 'heat', -d.content.rules.vent * made);
  }
  d.heatLedger = { start: d.resources.heat, startSource: lastPusher, changes: [] };
  return made;
}

/**
 * The kind of trouble you courted: a scandal sharing a tag with the blamed card (tags every scandal
 * carries don't count). Among several, the one held fewest of, then content order. Seeded random
 * only when nothing matches, e.g. heat from a gate.
 */
function pickScandal(d: Draft, pool: readonly string[], cause: string | null): { cardId: string; byTag: boolean } {
  const shared = d.content.scandalSharedTags;
  const causeTags = (cause === null ? [] : (getCard(d.content, cause)?.tags ?? [])).filter((t) => !shared.includes(t));
  const matches = pool.filter((id) => getCard(d.content, id)?.tags?.some((t) => causeTags.includes(t)));
  if (matches.length === 0) return { cardId: pool[nextInt(d.rng, pool.length)] as string, byTag: false };
  const held = (id: string) => [d.deck, d.hand, d.discard].reduce((n, zone) => n + zone.filter((c) => c.cardId === id).length, 0);
  let best = matches[0] as string;
  for (const id of matches) if (held(id) < held(best)) best = id;
  return { cardId: best, byTag: true };
}

function offerGates(d: Draft): void {
  const rules = d.content.rules;
  const all = d.content.gatesByAct[String(d.act)] ?? [];
  let offer: readonly GateDef[] = all;
  if (all.length > rules.gatesOffered) {
    // Seeded partial Fisher–Yates, then back into content order.
    const pool = [...all];
    for (let i = 0; i < rules.gatesOffered; i++) {
      const j = i + nextInt(d.rng, pool.length - i);
      [pool[i], pool[j]] = [pool[j] as GateDef, pool[i] as GateDef];
    }
    const picked = new Set(pool.slice(0, rules.gatesOffered));
    offer = all.filter((g) => picked.has(g));
  }
  if (offer.length === 0) {
    // No gate for this act: the run must still complete.
    fault(d, 'noGateForAct', String(d.act));
    advanceAct(d);
    return;
  }
  d.phase = 'gate';
  d.gateOffer = offer.map((g) => g.id);
  d.events.push({ type: 'gateOffer', gateIds: d.gateOffer });
}

function advanceAct(d: Draft): void {
  if (d.act < d.content.rules.acts) {
    d.act++;
    d.turn++;
    beginTurn(d);
  } else {
    resolveEnding(d);
  }
}

/** Descending priority, first match wins. Validation guarantees a priority-0 unconditional fallback. */
function resolveEnding(d: Draft): void {
  const ending = d.content.endings.find((e) => evaluate(e.conditions, d));
  d.phase = 'ended';
  d.endingId = ending?.id ?? null;
  if (!ending) fault(d, 'noEndingMatched', String(d.turn));
  d.events.push({ type: 'ending', endingId: d.endingId });
}
