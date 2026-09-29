// (state, action) => state. Pure. The only place game state changes.
//
// Run flow (CLAUDE.md §2):
//   start of act:  draft — pick from an offer of cards; capital buys an extra pick or a reroll
//   start of turn: slots refresh, draw to hand size (onDraw fires per card)
//   PLAY_CARD:     spend slots, apply effects, card goes to discard
//   END_TURN:      onEndOfTurn for cards in hand → heat check (Heat → Scandal) → hand discarded
//                  → next turn, or the act's Gate after its last turn
//   CHOOSE_GATE:   requires → onPass / onFail → next act (its draft), or ending resolution after the last act

import { CoreError, getCard, getGate, heatThreshold, type GateDef } from './content.ts';
import { evaluate, scandalCount } from './conditions.ts';
import { nextInt } from './rng.ts';
import {
  addCard,
  addResource,
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

export function canPlay(state: GameState, uid: number): boolean {
  if (state.phase !== 'play') return false;
  const card = state.hand.find((c) => c.uid === uid);
  const def = card && getCard(state.content, card.cardId);
  if (!def || def.playable === false) return false;
  return def.cost <= state.slots && evaluate(def.requires, state);
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
  applyEffects(d, def.effects);
  d.discard.push(card);
  return closeDraft(d);
}

function endTurn(state: GameState): GameState {
  if (state.phase !== 'play') return illegal(state, 'illegalEndTurn', state.phase);
  const d = openDraft(state);
  const rules = d.content.rules;

  // 1. End-of-turn penalties/bonuses for every card still in hand, in hand order.
  for (const card of [...d.hand]) {
    if (!d.hand.includes(card)) continue; // removed by an earlier trigger this turn
    applyEffects(d, getCard(d.content, card.cardId)?.onEndOfTurn);
  }

  // 2. Heat → Scandal: at most one crystallisation per turn.
  crystallise(d);

  // 3. The hand goes to the discard pile, scandals included.
  d.discard.push(...d.hand);
  d.hand = [];
  d.events.push({
    type: 'turnEnd',
    act: d.act,
    turn: d.turn,
    resources: { ...d.resources },
    scandalCount: scandalCount(d),
  });

  // 4. Next turn, or this act's Gate.
  if (turnInAct(d) >= rules.turnsPerAct) offerGates(d);
  else {
    d.turn++;
    startTurn(d);
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

/** Open the current act: its draft if drafting is on and the pool has cards, else straight to its first turn. */
export function beginAct(d: Draft): void {
  const cfg = d.content.rules.draft;
  if (!cfg || cfg.picks <= 0) return startTurn(d);
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
 * If heat >= heatThreshold(act): add one Scandal to the discard pile and vent heat.
 * The scandal comes from those whose actMin has been reached; which one is a seeded pick.
 */
function crystallise(d: Draft): void {
  const rules = d.content.rules;
  if (d.resources.heat < heatThreshold(rules, d.act)) return;
  const pool = d.content.scandalIds.filter((id) => (getCard(d.content, id)?.actMin ?? 1) <= d.act);
  if (pool.length === 0) return fault(d, 'noScandalForAct', String(d.act));
  const cardId = pool[nextInt(d.rng, pool.length)] as string;
  const card = addCard(d, cardId, 'discard');
  d.events.push({ type: 'scandal', uid: card.uid, cardId });
  addResource(d, 'heat', -rules.heatVent);
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
    beginAct(d);
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
