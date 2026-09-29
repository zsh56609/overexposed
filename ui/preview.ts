// Previews (docs/ui-plan.md §4): what an action would do, before the player commits to it.
//
// Pure and DOM-free, so the automated match check (check/preview.ts) runs it in Node. Every answer
// comes from /core: a preview is the reducer run on a hypothetical action, read off the events it
// returns. Nothing here evaluates a rule, and nothing reveals hidden information — a hypothetical
// draw reports how many cards, never which.

import {
  explainCondition,
  getCard,
  getGate,
  heatOutlook,
  legalActions,
  playCheck,
  reduce,
  RESOURCE_KEYS,
  type AddCardZone,
  type ClauseReport,
  type GameEvent,
  type GameState,
  type PlayBlocker,
  type ResourceKey,
} from '../core/index.ts';

export type HeatOutlook = ReturnType<typeof heatOutlook>;

/** What a slice of events changed, in player terms. */
export interface Outcome {
  /** Net change per resource (0 when untouched). */
  readonly deltas: Readonly<Record<ResourceKey, number>>;
  /** Cards drawn: a count only, since the deck order is hidden. */
  readonly drawn: number;
  /** New card instances, in order (a crystallised scandal is reported separately, not here). */
  readonly added: readonly { readonly cardId: string; readonly to: AddCardZone }[];
  /** Cards removed for good. */
  readonly exhausted: readonly string[];
  /** Flags set for the first time. */
  readonly flags: readonly string[];
  /** Scandals crystallised, in order. */
  readonly scandals: readonly string[];
}

/** Read an Outcome off a list of events. */
export function outcomeOf(events: readonly GameEvent[]): Outcome {
  const deltas = Object.fromEntries(RESOURCE_KEYS.map((k) => [k, 0])) as Record<ResourceKey, number>;
  let drawn = 0;
  const added: { cardId: string; to: AddCardZone }[] = [];
  const exhausted: string[] = [];
  const flags: string[] = [];
  const scandals: string[] = [];
  const scandalUids = new Set(events.flatMap((e) => (e.type === 'scandal' ? [e.uid] : [])));
  for (const e of events) {
    if (e.type === 'resource') deltas[e.target] += e.delta;
    else if (e.type === 'draw') drawn++;
    else if (e.type === 'addCard' && !scandalUids.has(e.uid)) added.push({ cardId: e.cardId, to: e.to });
    else if (e.type === 'exhaust') exhausted.push(e.cardId);
    else if (e.type === 'flag') flags.push(e.flag);
    else if (e.type === 'scandal') scandals.push(e.cardId);
  }
  return { deltas, drawn, added, exhausted, flags, scandals };
}

/** The events up to and including the first event of the given type (all of them if none matches). */
function through(events: readonly GameEvent[], type: GameEvent['type']): readonly GameEvent[] {
  const i = events.findIndex((e) => e.type === type);
  return i === -1 ? events : events.slice(0, i + 1);
}

// ---------------------------------------------------------------------------
// End of turn

export interface EndTurnPreview {
  /** Exactly what the end-of-turn check would crystallise if the turn ended now. */
  readonly crystallised: number;
  /** onEndOfTurn effects, the scandals and the vent — up to turnEnd, never the next turn's draw. */
  readonly outcome: Outcome;
}

/** END_TURN on a hypothetical, cut at the turnEnd event. Only meaningful in the play phase. */
export function previewEndTurn(state: GameState): EndTurnPreview | null {
  if (state.phase !== 'play') return null;
  const events = through(reduce(state, { type: 'END_TURN' }).events, 'turnEnd');
  const end = events.find((e) => e.type === 'turnEnd');
  return { crystallised: end?.type === 'turnEnd' ? end.crystallised : 0, outcome: outcomeOf(events) };
}

// ---------------------------------------------------------------------------
// Playing a card

export interface PlayPreview {
  readonly uid: number;
  readonly cardId: string;
  readonly ok: boolean;
  /** Every reason it can't be played (empty when ok). */
  readonly blockers: readonly PlayBlocker[];
  readonly outlookBefore: HeatOutlook;
  readonly endTurnNow: EndTurnPreview | null;
  /** The rest describe the card played; null when it can't be. */
  readonly outcome: Outcome | null;
  readonly heatBefore: number;
  readonly heatAfter: number | null;
  readonly slotsAfter: number | null;
  readonly outlookAfter: HeatOutlook | null;
  /** Exactly what ending the turn right after this card would crystallise. */
  readonly endTurnAfter: EndTurnPreview | null;
  /** endTurnAfter − endTurnNow: lines this card pushes heat over (negative: lines it cools back under). */
  readonly linesCrossed: number;
}

export function previewPlay(state: GameState, uid: number): PlayPreview {
  const card = state.hand.find((c) => c.uid === uid);
  const check = playCheck(state, uid);
  const endTurnNow = previewEndTurn(state);
  const base = {
    uid,
    cardId: card?.cardId ?? '',
    ok: check.ok,
    blockers: check.blockers,
    outlookBefore: heatOutlook(state),
    endTurnNow,
    heatBefore: state.resources.heat,
  };
  if (!check.ok) return { ...base, outcome: null, heatAfter: null, slotsAfter: null, outlookAfter: null, endTurnAfter: null, linesCrossed: 0 };
  const after = reduce(state, { type: 'PLAY_CARD', uid });
  const endTurnAfter = previewEndTurn(after);
  return {
    ...base,
    outcome: outcomeOf(after.events),
    heatAfter: after.resources.heat,
    slotsAfter: after.slots,
    outlookAfter: heatOutlook(after),
    endTurnAfter,
    linesCrossed: (endTurnAfter?.crystallised ?? 0) - (endTurnNow?.crystallised ?? 0),
  };
}

// ---------------------------------------------------------------------------
// Gates and draft offers

export interface GatePreview {
  readonly gateId: string;
  /** Every requirement, live: what it asks, what the player has, met or not. */
  readonly clauses: readonly ClauseReport[];
  /** Whether choosing it now passes (from the hypothetical's gate event). */
  readonly passes: boolean;
  /** The branch that would fire now: the gate's effects, up to the next turn or the ending. */
  readonly outcome: Outcome;
}

export function previewGate(state: GameState, gateId: string): GatePreview {
  const events = reduce(state, { type: 'CHOOSE_GATE', gateId }).events;
  const at = events.findIndex((e) => e.type === 'gate');
  const rest = events.slice(at + 1);
  const stop = rest.findIndex((e) => e.type === 'draftOffer' || e.type === 'turnStart' || e.type === 'ending' || e.type === 'gateOffer');
  const gate = events[at];
  return {
    gateId,
    clauses: explainCondition(getGate(state.content, gateId)?.requires, state),
    passes: gate?.type === 'gate' ? gate.passed : false,
    outcome: outcomeOf(stop === -1 ? rest : rest.slice(0, stop)),
  };
}

/** A card on a draft offer can't be played yet: its requirement, live against the current state. */
export function previewDraftCard(state: GameState, cardId: string): readonly ClauseReport[] {
  return explainCondition(getCard(state.content, cardId)?.requires, state);
}

// ---------------------------------------------------------------------------
// What is clickable: legalActions, sorted by kind. The UI enables exactly these and nothing else.

export interface Legal {
  readonly play: ReadonlySet<number>;
  readonly endTurn: boolean;
  readonly picks: ReadonlySet<string>;
  readonly extraPick: boolean;
  readonly reroll: boolean;
  readonly gates: ReadonlySet<string>;
}

export function legalOf(state: GameState): Legal {
  const play = new Set<number>();
  const picks = new Set<string>();
  const gates = new Set<string>();
  let endTurn = false;
  let extraPick = false;
  let reroll = false;
  for (const a of legalActions(state)) {
    if (a.type === 'PLAY_CARD') play.add(a.uid);
    else if (a.type === 'END_TURN') endTurn = true;
    else if (a.type === 'DRAFT_PICK') picks.add(a.cardId);
    else if (a.type === 'DRAFT_EXTRA_PICK') extraPick = true;
    else if (a.type === 'DRAFT_REROLL') reroll = true;
    else if (a.type === 'CHOOSE_GATE') gates.add(a.gateId);
  }
  return { play, endTurn, picks, extraPick, reroll, gates };
}
