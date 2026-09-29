// Headless runs. Every run is fully determined by (content, persona, run seed), so any
// anomaly replays alone with `npm run sim -- --replay=<seed> --persona=<id>`.

import {
  createInitialState,
  cursor,
  deriveSeed,
  evaluate,
  getGate,
  legalActions,
  reduce,
  RESOURCE_KEYS,
  scandalCount,
  seedRng,
  type Action,
  type Content,
  type GameState,
  type GateRecord,
  type Resources,
} from '../core/index.ts';
import { loadContent } from './content.ts';
import { PERSONA_IDS, PERSONA_SALT, PERSONAS, type PersonaId } from './personas.ts';

/** A run that needs more actions than this is counted as soft-locked. A normal run takes ~60. */
export const MAX_ACTIONS = 1_000;

export interface TurnSnapshot {
  readonly turn: number;
  readonly hype: number;
  readonly craft: number;
  readonly capital: number;
  readonly heat: number;
  readonly scandals: number;
}

export interface RunRecord {
  readonly seed: number;
  readonly persona: PersonaId;
  readonly endingId: string | null;
  readonly scandalsAtEnd: number;
  readonly scandalsCrystallised: number;
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
  readonly final: Resources | null;
  /** Flags held when the run ended. */
  readonly flags: readonly string[];
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

export function runOne(content: Content, persona: PersonaId, seed: number, trace?: TraceFn): RunRecord {
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
  let multiScandalTurns = 0;
  let maxScandalsInTurn = 0;
  let cardsPlayed = 0;
  let actions = 0;
  let softLock: string | null = null;
  let crash: string | null = null;
  let state: GameState | null = null;

  const tally = (s: GameState) => {
    const crystallisedNow = s.events.filter((e) => e.type === 'scandal').length;
    if (crystallisedNow >= 2) multiScandalTurns++;
    maxScandalsInTurn = Math.max(maxScandalsInTurn, crystallisedNow);
    for (const e of s.events) {
      if (e.type === 'draw') draws[e.cardId] = (draws[e.cardId] ?? 0) + 1;
      else if (e.type === 'play') {
        plays[e.cardId] = (plays[e.cardId] ?? 0) + 1;
        cardsPlayed++;
      } else if (e.type === 'scandal') scandalsCrystallised++;
      else if (e.type === 'turnEnd') curve.push({ turn: e.turn, ...e.resources, scandals: e.scandalCount });
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
    tally(state);
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
      tally(state);
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
    scandalsAtEnd: state ? scandalCount(state) : 0,
    scandalsCrystallised,
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
    final: state?.resources ?? null,
    flags: state ? Object.keys(state.flags) : [],
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
