// Headless runs. Every run is fully determined by (content, persona, run seed), so any
// anomaly replays alone with `npm run sim -- --replay=<seed> --persona=<id>`.

import {
  createInitialState,
  currentLane,
  cursor,
  deriveSeed,
  evaluate,
  getGate,
  legalActions,
  majorOf,
  reduce,
  RESOURCE_KEYS,
  scandalCount,
  seedRng,
  type Action,
  type Content,
  type Effect,
  type GameState,
  type GateRecord,
  type Resources,
} from '../core/index.ts';
import { loadContent } from './content.ts';
import { PERSONA_IDS, PERSONA_SALT, PERSONAS, type PersonaId } from './personas.ts';

/** A run that needs more actions than this is counted as soft-locked. A normal run takes ~60. */
export const MAX_ACTIONS = 1_000;

/** Where a run's capital went, by what caused each change. */
export interface CapitalFlow {
  readonly earned: number;
  /** Extra picks and rerolls. */
  readonly draft: number;
  /** Playing cards that exhaust scandals. */
  readonly removal: number;
  /** Playing any other card with a capital price. */
  readonly cards: number;
  /** Drained by scandals at end of turn, or by failed gates. */
  readonly lost: number;
}

export interface TurnSnapshot {
  readonly turn: number;
  readonly hype: number;
  readonly craft: number;
  readonly capital: number;
  readonly heat: number;
  readonly scandals: number;
  /** Effective heat threshold this turn's check used, and the scandals it crystallised. */
  readonly threshold: number;
  readonly crystallised: number;
  /** Scandal cards drawn this turn: hand room they took (the choke). */
  readonly scandalsDrawn: number;
}

export interface RunRecord {
  readonly seed: number;
  readonly persona: PersonaId;
  /** The minor ending, and its major (docs/design/content-expansion.md §1). */
  readonly endingId: string | null;
  readonly majorId: string | null;
  /** The career lane the cards played made by the year's end (null: none played). */
  readonly lane: string | null;
  readonly scandalsAtEnd: number;
  readonly scandalsCrystallised: number;
  /** Crystallised scandals matched to the blamed card by tag (the rest fell back to seeded random). */
  readonly scandalsByTag: number;
  /** Crystallised scandals by scandal card id, and by the card blamed for them ('none' = nothing to blame). */
  readonly crystallisedById: Readonly<Record<string, number>>;
  readonly blamedOn: Readonly<Record<string, number>>;
  /** Turns whose end crystallised 2+ scandals at once, and the most in any one turn. */
  readonly multiScandalTurns: number;
  readonly maxScandalsInTurn: number;
  readonly turnsCompleted: number;
  readonly actions: number;
  readonly cardsPlayed: number;
  readonly gates: readonly GateRecord[];
  /** Every gate offered, and whether its requirement already held when offered (difficulty, free of choice bias). */
  readonly gateChecks: readonly { readonly gateId: string; readonly met: boolean }[];
  /** Resources after end-of-turn resolution of each turn. */
  readonly curve: readonly TurnSnapshot[];
  readonly draws: Readonly<Record<string, number>>;
  readonly plays: Readonly<Record<string, number>>;
  /** Times each card was on a draft offer, and taken. */
  readonly offered: Readonly<Record<string, number>>;
  readonly drafted: Readonly<Record<string, number>>;
  readonly draftPicks: number;
  readonly extraPicks: number;
  readonly rerolls: number;
  /** Capital spent on extra picks and rerolls. */
  readonly draftSpend: number;
  readonly capital: CapitalFlow;
  readonly final: Resources | null;
  /** Flags held when the run ended. */
  readonly flags: readonly string[];
  /** What set each flag: the card whose effect set it, or the gate chosen. */
  readonly flagSources: Readonly<Record<string, string>>;
  readonly softLock: string | null;
  readonly crash: string | null;
}

class InvariantError extends Error {
  override readonly name = 'InvariantError';
}

/** Engine sanity after every action. A violation is reported as a crash. */
function checkInvariants(s: GameState): void {
  const fail = (what: string) => {
    throw new InvariantError(what);
  };
  for (const k of RESOURCE_KEYS) {
    const v = s.resources[k];
    if (!Number.isInteger(v) || v < 0) fail(`resource ${k} = ${v}`);
  }
  if (!Number.isInteger(s.slots) || s.slots < 0) fail(`slots = ${s.slots}`);
  const zones = [s.deck, s.hand, s.discard, s.exhausted];
  const uids = new Set<number>();
  for (const zone of zones) for (const c of zone) uids.add(c.uid);
  const total = zones.reduce((n, z) => n + z.length, 0);
  if (uids.size !== total) fail('a card instance is in two zones');
  if (total !== s.nextUid - 1) fail(`card conservation: ${total} cards, ${s.nextUid - 1} created`);
  const rules = s.content.rules;
  if (s.act < 1 || s.act > rules.acts) fail(`act = ${s.act}`);
  if (s.turn < 1 || s.turn > rules.acts * rules.turnsPerAct) fail(`turn = ${s.turn}`);
  if ((s.phase === 'gate') !== (s.gateOffer.length > 0)) fail(`phase ${s.phase} with ${s.gateOffer.length} gates on offer`);
  if ((s.phase === 'draft') !== (s.draft !== null)) fail(`phase ${s.phase} with draft state ${s.draft === null ? 'absent' : 'present'}`);
}

export type TraceFn = (state: GameState, action: Action | null) => void;

const removalCache = new WeakMap<Content, ReadonlySet<string>>();

/** Cards whose effects exhaust scandals (by a tag some scandal carries), found from content. */
function removalCards(content: Content): ReadonlySet<string> {
  let ids = removalCache.get(content);
  if (!ids) {
    const scandalTags = new Set(content.cards.filter((c) => c.kind === 'scandal').flatMap((c) => c.tags ?? []));
    const exhaustsScandal = (effects: readonly Effect[] | undefined): boolean =>
      (effects ?? []).some((e) =>
        e.op === 'exhaustTag' ? scandalTags.has(e.tag) : e.op === 'conditional' ? exhaustsScandal(e.then) || exhaustsScandal(e.else) : false,
      );
    ids = new Set(content.cards.filter((c) => exhaustsScandal(c.effects)).map((c) => c.id));
    removalCache.set(content, ids);
  }
  return ids;
}

/** How a run is set up beyond its persona and seed: the manager chosen at the opening (round 2b). */
export interface RunOptions {
  readonly manager?: string;
}

export function runOne(content: Content, persona: PersonaId, seed: number, trace?: TraceFn, _options: RunOptions = {}): RunRecord {
  const policy = PERSONAS[persona];
  const decisions = cursor(seedRng(deriveSeed(seed, PERSONA_SALT[persona])));
  const draws: Record<string, number> = {};
  const plays: Record<string, number> = {};
  const curve: TurnSnapshot[] = [];
  const gateChecks: { gateId: string; met: boolean }[] = [];
  const offered: Record<string, number> = {};
  const drafted: Record<string, number> = {};
  let draftPicks = 0;
  let extraPicks = 0;
  let rerolls = 0;
  let draftSpend = 0;
  let scandalsCrystallised = 0;
  let scandalsByTag = 0;
  let multiScandalTurns = 0;
  let maxScandalsInTurn = 0;
  let cardsPlayed = 0;
  let actions = 0;
  let softLock: string | null = null;
  let crash: string | null = null;
  let state: GameState | null = null;
  const capital = { earned: 0, draft: 0, removal: 0, cards: 0, lost: 0 };
  const removal = removalCards(content);
  const scandalIds = new Set(content.cards.filter((c) => c.kind === 'scandal').map((c) => c.id));
  let scandalsDrawnThisTurn = 0;
  const flagSources: Record<string, string> = {};
  const crystallisedById: Record<string, number> = {};
  const blamedOn: Record<string, number> = {};

  const tally = (s: GameState, action: Action | null) => {
    const played = s.events.find((e) => e.type === 'play');
    for (const e of s.events) {
      if (e.type !== 'resource' || e.target !== 'capital') continue;
      if (e.delta > 0) capital.earned += e.delta;
      else if (action?.type === 'DRAFT_EXTRA_PICK' || action?.type === 'DRAFT_REROLL') capital.draft -= e.delta;
      else if (action?.type === 'PLAY_CARD' && played?.type === 'play') {
        if (removal.has(played.cardId)) capital.removal -= e.delta;
        else capital.cards -= e.delta;
      } else capital.lost -= e.delta;
    }
    const crystallisedNow = s.events.filter((e) => e.type === 'scandal').length;
    if (crystallisedNow >= 2) multiScandalTurns++;
    maxScandalsInTurn = Math.max(maxScandalsInTurn, crystallisedNow);
    // Events arrive in order, so a turn's draws sit between its turnStart and its turnEnd.
    for (const e of s.events) {
      if (e.type === 'turnStart') scandalsDrawnThisTurn = 0;
      else if (e.type === 'flag') {
        flagSources[e.flag] ??= e.source ?? (action?.type === 'CHOOSE_GATE' ? action.gateId : 'engine');
      } else if (e.type === 'draw') {
        draws[e.cardId] = (draws[e.cardId] ?? 0) + 1;
        if (scandalIds.has(e.cardId)) scandalsDrawnThisTurn++;
      } else if (e.type === 'play') {
        plays[e.cardId] = (plays[e.cardId] ?? 0) + 1;
        cardsPlayed++;
      } else if (e.type === 'scandal') {
        scandalsCrystallised++;
        if (e.byTag) scandalsByTag++;
        crystallisedById[e.cardId] = (crystallisedById[e.cardId] ?? 0) + 1;
        blamedOn[e.cause ?? 'none'] = (blamedOn[e.cause ?? 'none'] ?? 0) + 1;
      }
      else if (e.type === 'turnEnd') {
        curve.push({
          turn: e.turn,
          ...e.resources,
          scandals: e.scandalCount,
          threshold: e.threshold,
          crystallised: e.crystallised,
          scandalsDrawn: scandalsDrawnThisTurn,
        });
      }
      else if (e.type === 'draftOffer') for (const id of e.cardIds) offered[id] = (offered[id] ?? 0) + 1;
      else if (e.type === 'draftPick') {
        drafted[e.cardId] = (drafted[e.cardId] ?? 0) + 1;
        draftPicks++;
      } else if (e.type === 'draftExtraPick') {
        extraPicks++;
        draftSpend += e.cost;
      } else if (e.type === 'draftReroll') {
        rerolls++;
        draftSpend += e.cost;
      }
    }
  };

  try {
    state = createInitialState(seed, content, { strict: true });
    tally(state, null);
    checkInvariants(state);
    trace?.(state, null);
    while (state.phase !== 'ended') {
      if (actions >= MAX_ACTIONS) {
        softLock = `no ending after ${MAX_ACTIONS} actions`;
        break;
      }
      const legal = legalActions(state);
      if (legal.length === 0) {
        softLock = `no legal action in phase ${state.phase}`;
        break;
      }
      for (const gateId of state.phase === 'gate' ? state.gateOffer : []) {
        gateChecks.push({ gateId, met: evaluate(getGate(state.content, gateId)?.requires, state) });
      }
      const action = policy.choose(state, legal, decisions);
      state = reduce(state, action);
      actions++;
      tally(state, action);
      checkInvariants(state);
      trace?.(state, action);
    }
    if (softLock === null && state.endingId === null) softLock = 'run ended without an ending';
  } catch (err) {
    crash = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  }

  return {
    seed,
    persona,
    endingId: state?.endingId ?? null,
    majorId: state?.endingId ? majorOf(state.content, state.endingId) : null,
    lane: state ? currentLane(state) : null,
    scandalsAtEnd: state ? scandalCount(state) : 0,
    scandalsCrystallised,
    scandalsByTag,
    crystallisedById,
    blamedOn,
    multiScandalTurns,
    maxScandalsInTurn,
    turnsCompleted: curve.length,
    actions,
    cardsPlayed,
    gates: state?.gateHistory ?? [],
    gateChecks,
    curve,
    draws,
    plays,
    offered,
    drafted,
    draftPicks,
    extraPicks,
    rerolls,
    draftSpend,
    capital,
    final: state?.resources ?? null,
    flags: state ? Object.keys(state.flags) : [],
    flagSources,
    softLock,
    crash,
  };
}

/** Everything that must be identical when a seed is replayed. */
function fingerprint(r: RunRecord): string {
  return JSON.stringify([r.endingId, r.scandalsAtEnd, r.actions, r.final, r.curve, r.gates, r.plays, r.draws, r.drafted, r.crash]);
}

/** Run seeds for a batch: the same list for every persona, so personas are compared on identical deals. */
export function runSeeds(batchSeed: number, runs: number): number[] {
  return Array.from({ length: runs }, (_, i) => deriveSeed(batchSeed, i));
}

export interface BatchOptions {
  /** Defaults to /content, validated. */
  readonly content?: Content;
  readonly personas?: readonly PersonaId[];
  /** Runs per persona re-executed to prove seeds replay exactly. */
  readonly replaySample?: number;
}

export interface BatchResult {
  readonly seed: number;
  readonly runsPerPersona: number;
  readonly personas: readonly PersonaId[];
  readonly content: Content;
  readonly records: readonly RunRecord[];
  readonly ms: number;
  readonly replay: { readonly checked: number; readonly mismatches: readonly { seed: number; persona: PersonaId }[] };
}

/** `runs` complete runs per persona, all seeded from `seed`. */
export function runBatch(runs: number, seed: number, options: BatchOptions = {}): BatchResult {
  const content = options.content ?? loadContent();
  const personas = options.personas ?? PERSONA_IDS;
  const seeds = runSeeds(seed, runs);
  const t0 = performance.now();

  const records: RunRecord[] = [];
  for (const persona of personas) for (const s of seeds) records.push(runOne(content, persona, s));

  const sample = Math.min(options.replaySample ?? 5, runs);
  const mismatches: { seed: number; persona: PersonaId }[] = [];
  for (const persona of personas) {
    for (const s of seeds.slice(0, sample)) {
      const first = records.find((r) => r.persona === persona && r.seed === s);
      if (!first || fingerprint(first) !== fingerprint(runOne(content, persona, s))) mismatches.push({ seed: s, persona });
    }
  }

  return {
    seed,
    runsPerPersona: runs,
    personas,
    content,
    records,
    ms: performance.now() - t0,
    replay: { checked: sample * personas.length, mismatches },
  };
}
