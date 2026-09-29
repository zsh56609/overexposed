import { indexContent, CoreError, getCard, type AddCardZone, type Content, type ContentIndex, type ResourceKey, type Resources } from './content.ts';
import { cursor, seedRng, shuffleInPlace, type RngState } from './rng.ts';
import { closeDraft, EFFECT_BUDGET, type Draft } from './resolve.ts';
import { beginTurn } from './reducer.ts';

export type Phase = 'draft' | 'play' | 'gate' | 'ended';

/**
 * Heat changes since the last end-of-turn check, each with the card whose effect caused it (null for
 * gates). Crystallisation replays them to blame each scandal on the card that pushed heat over its line.
 */
export interface HeatLedger {
  readonly start: number;
  /** Who pushed heat up most recently before `start` — blamed for lines already crossed then. */
  readonly startSource: string | null;
  readonly changes: readonly { readonly cardId: string | null; readonly delta: number }[];
}

/** A card draft inside an act: pick from the offer; capital buys an extra pick or a new offer. */
export interface DraftState {
  /** Card ids on offer, distinct. */
  readonly offer: readonly string[];
  readonly picksLeft: number;
  readonly extraPicksBought: number;
  readonly rerollsUsed: number;
}

/** One physical card in the run. Duplicates of a card id have distinct uids. */
export interface CardInstance {
  readonly uid: number;
  readonly cardId: string;
}

export interface GateRecord {
  readonly act: number;
  readonly offered: readonly string[];
  readonly gateId: string;
  readonly passed: boolean;
}

/**
 * What the last action did, in order. Ids and numbers only.
 * The UI replays these for motion (card flight, number roll-up); the sim tallies them.
 */
export type GameEvent =
  | { readonly type: 'turnStart'; readonly act: number; readonly turn: number }
  | { readonly type: 'shuffle'; readonly count: number }
  | { readonly type: 'draw'; readonly uid: number; readonly cardId: string }
  | { readonly type: 'play'; readonly uid: number; readonly cardId: string; readonly cost: number }
  | { readonly type: 'resource'; readonly target: ResourceKey; readonly delta: number; readonly value: number }
  | { readonly type: 'slots'; readonly delta: number; readonly value: number }
  | { readonly type: 'flag'; readonly flag: string }
  | { readonly type: 'addCard'; readonly uid: number; readonly cardId: string; readonly to: AddCardZone }
  | { readonly type: 'exhaust'; readonly uid: number; readonly cardId: string }
  /** `cause`: the card blamed for pushing heat over the line; `byTag`: the scandal matches its tag (false = seeded fallback). */
  | { readonly type: 'scandal'; readonly uid: number; readonly cardId: string; readonly cause: string | null; readonly byTag: boolean }
  | {
      readonly type: 'turnEnd';
      readonly act: number;
      readonly turn: number;
      readonly resources: Resources;
      readonly scandalCount: number;
      /** Effective heat threshold used by this turn's check, and the scandals it crystallised. */
      readonly threshold: number;
      readonly crystallised: number;
    }
  | { readonly type: 'draftOffer'; readonly act: number; readonly cardIds: readonly string[] }
  | { readonly type: 'draftPick'; readonly uid: number; readonly cardId: string }
  | { readonly type: 'draftExtraPick'; readonly cost: number }
  | { readonly type: 'draftReroll'; readonly cost: number }
  | { readonly type: 'gateOffer'; readonly gateIds: readonly string[] }
  | { readonly type: 'gate'; readonly gateId: string; readonly passed: boolean }
  | { readonly type: 'ending'; readonly endingId: string | null }
  /** Only in non-strict (shipped) mode, where bad content degrades instead of throwing. */
  | { readonly type: 'warning'; readonly code: string; readonly ref: string };

export interface GameState {
  readonly seed: number;
  /** true: bad content or an illegal action throws (dev, sim). false: degrade gracefully (shipped build). */
  readonly strict: boolean;
  readonly content: ContentIndex;
  readonly rng: RngState;

  readonly phase: Phase;
  /** 1-based. */
  readonly act: number;
  /** 1-based, global across acts: act 2 starts at turn turnsPerAct + 1. */
  readonly turn: number;
  /** Per-turn energy; refreshed at the start of each turn. Not a resource. */
  readonly slots: number;
  readonly resources: Resources;
  readonly flags: Readonly<Record<string, true>>;
  readonly heatLedger: HeatLedger;

  /** Draw pile. The top of the deck is the END of the array. */
  readonly deck: readonly CardInstance[];
  readonly hand: readonly CardInstance[];
  readonly discard: readonly CardInstance[];
  /** Permanently removed (exhaustTag). */
  readonly exhausted: readonly CardInstance[];
  readonly nextUid: number;

  /** Non-null only in the 'draft' phase. */
  readonly draft: DraftState | null;
  /** Gate ids on offer; non-empty only in the 'gate' phase. */
  readonly gateOffer: readonly string[];
  readonly gateHistory: readonly GateRecord[];
  /** Set when phase becomes 'ended'. */
  readonly endingId: string | null;

  readonly events: readonly GameEvent[];
}

export interface StateOptions {
  /** Default true. The shipped build passes false. */
  readonly strict?: boolean;
}

/** Build the run and open turn 1: the returned state waits on its draft (or on play if drafting is off). */
export function createInitialState(seed: number, content: Content, options: StateOptions = {}): GameState {
  const index = indexContent(content);
  const strict = options.strict ?? true;
  const rules = index.rules;

  const deck: CardInstance[] = [];
  let uid = 1;
  for (const entry of rules.startingDeck) {
    if (!getCard(index, entry.cardId)) {
      if (strict) throw new CoreError('unknownCard', entry.cardId);
      continue;
    }
    for (let i = 0; i < entry.count; i++) deck.push({ uid: uid++, cardId: entry.cardId });
  }

  const d: Draft = {
    seed: seed >>> 0,
    strict,
    content: index,
    rng: cursor(seedRng(seed)),
    phase: 'play',
    act: 1,
    turn: 1,
    slots: 0,
    resources: { ...rules.startingResources },
    flags: {},
    heatLedger: { start: rules.startingResources.heat, startSource: null, changes: [] },
    source: null,
    deck,
    hand: [],
    discard: [],
    exhausted: [],
    nextUid: uid,
    draft: null,
    gateOffer: [],
    gateHistory: [],
    endingId: null,
    events: [],
    budget: EFFECT_BUDGET,
  };
  shuffleInPlace(d.rng, d.deck);
  beginTurn(d);
  return closeDraft(d);
}
