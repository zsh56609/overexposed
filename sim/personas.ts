// Player personas. Each is a policy: (state, legal actions) → action.
//
// The strategic personas share one greedy player and differ only in what they value.
// None of them needs to know any card, gate or ending id: they read resources, scandals,
// flags and the rules, so content can change without touching this file.
//
// Greedy step: simulate every playable card through the pure reducer, score the resulting
// state, play the best gain per slot; end the turn when no card improves the score.
// Gates: simulate each choice, score the result, add a bonus if the gate would pass.
// (Simulating draw effects peeks at the seeded deck. The score only counts hand size,
// not which cards arrived, so the peek is worth little.)
//
// Flags: a flag that some ending, gate or card condition requires (flags.all / flags.any)
// is worth `flagUnlock`; one that a condition forbids (flags.not) costs `flagLock`.
// `flagScores` overrides that per flag id.

import {
  evaluate,
  getCard,
  getGate,
  heatThreshold,
  nextInt,
  reduce,
  scandalCount,
  type Action,
  type Condition,
  type ContentIndex,
  type Effect,
  type GameState,
  type RngCursor,
} from '../core/index.ts';

export const PERSONA_IDS = ['minmaxer', 'random', 'crafter', 'hypechaser', 'dealseeker'] as const;
export type PersonaId = (typeof PERSONA_IDS)[number];

export interface Persona {
  readonly id: PersonaId;
  /** `legal` is never empty. `rng` is the persona's own seeded stream, separate from the game's. */
  choose(state: GameState, legal: readonly Action[], rng: RngCursor): Action;
}

interface Weights {
  readonly hype: number;
  readonly craft: number;
  readonly capital: number;
  readonly heat: number;
  /** Per scandal owned. */
  readonly scandal: number;
  /** Heat at or over this act's threshold: a scandal crystallises at end of turn. */
  readonly risk: number;
  /** Per card in hand: what draw effects are worth. */
  readonly hand: number;
  /** Per slot gained beyond the card's own cost. */
  readonly slots: number;
  /** Added to a gate choice that would pass. */
  readonly gatePass: number;
  /** Per flag held that some condition requires. */
  readonly flagUnlock: number;
  /** Per flag held that some condition forbids (subtracted). */
  readonly flagLock: number;
  /** Per-flag overrides by flag id. */
  readonly flagScores?: Readonly<Record<string, number>>;
  /**
   * Pull toward this act's gates whose onPass sets a valued flag: their flag value × progress
   * (0..1) toward the gate's requirements. 0 = off. Lets a persona plan for a deal it wants.
   */
  readonly dealDrive: number;
}

const END_TURN: Action = { type: 'END_TURN' };

interface FlagRefs {
  readonly unlocks: ReadonlySet<string>;
  readonly locks: ReadonlySet<string>;
}

const flagRefsCache = new WeakMap<ContentIndex, FlagRefs>();

/** Which flags the content's conditions require or forbid. Computed once per content. */
function flagRefs(content: ContentIndex): FlagRefs {
  const cached = flagRefsCache.get(content);
  if (cached) return cached;
  const unlocks = new Set<string>();
  const locks = new Set<string>();
  const scan = (c: Condition | undefined) => {
    for (const f of [...(c?.flags?.all ?? []), ...(c?.flags?.any ?? [])]) unlocks.add(f);
    for (const f of c?.flags?.not ?? []) locks.add(f);
  };
  const scanEffects = (effects: readonly Effect[] | undefined) => {
    for (const e of effects ?? []) {
      if (e.op !== 'conditional') continue;
      scan(e.if);
      scanEffects(e.then);
      scanEffects(e.else);
    }
  };
  for (const ending of content.endings) scan(ending.conditions);
  for (const gate of Object.values(content.gates)) {
    scan(gate.requires);
    scanEffects(gate.onPass);
    scanEffects(gate.onFail);
  }
  for (const card of Object.values(content.cards)) {
    scan(card.requires);
    scanEffects(card.effects);
    scanEffects(card.onDraw);
    scanEffects(card.onEndOfTurn);
  }
  const refs = { unlocks, locks };
  flagRefsCache.set(content, refs);
  return refs;
}

function flagValue(flag: string, content: ContentIndex, w: Weights): number {
  if (w.flagScores && Object.hasOwn(w.flagScores, flag)) return w.flagScores[flag] as number;
  const refs = flagRefs(content);
  return (refs.unlocks.has(flag) ? w.flagUnlock : 0) - (refs.locks.has(flag) ? w.flagLock : 0);
}

/** How close the state is to meeting a condition, 0..1: each `min` scores value/min, other clauses 0 or 1. */
function progress(c: Condition, s: GameState): number {
  const parts: number[] = [];
  for (const key of ['hype', 'craft', 'capital', 'heat'] as const) {
    const min = c[key]?.min;
    if (min !== undefined && min > 0) parts.push(Math.min(1, s.resources[key] / min));
  }
  const rest: Condition = { scandalCount: c.scandalCount, act: c.act, turn: c.turn, flags: c.flags };
  if (Object.values(rest).some((v) => v !== undefined)) parts.push(evaluate(rest, s) ? 1 : 0);
  return parts.length === 0 ? 1 : parts.reduce((a, b) => a + b, 0) / parts.length;
}

function dealPull(s: GameState, w: Weights): number {
  let total = 0;
  for (const gate of s.content.gatesByAct[String(s.act)] ?? []) {
    let gain = 0;
    for (const e of gate.onPass) {
      if (e.op === 'setFlag' && !Object.hasOwn(s.flags, e.flag)) gain += Math.max(0, flagValue(e.flag, s.content, w));
    }
    if (gain > 0) total += gain * progress(gate.requires, s);
  }
  return total;
}

function score(s: GameState, w: Weights): number {
  const r = s.resources;
  const atRisk = s.phase === 'play' && r.heat >= heatThreshold(s.content.rules, s.act) ? 1 : 0;
  let flags = 0;
  for (const flag of Object.keys(s.flags)) flags += flagValue(flag, s.content, w);
  if (w.dealDrive !== 0 && s.phase !== 'ended') flags += w.dealDrive * dealPull(s, w);
  return (
    w.hype * r.hype +
    w.craft * r.craft +
    w.capital * r.capital +
    w.heat * r.heat +
    w.scandal * scandalCount(s) +
    w.risk * atRisk +
    w.hand * s.hand.length +
    flags
  );
}

function greedy(id: PersonaId, w: Weights): Persona {
  return {
    id,
    choose(state, legal) {
      if (state.phase === 'gate') {
        let best = legal[0] as Action;
        let bestScore = Number.NEGATIVE_INFINITY;
        for (const action of legal) {
          if (action.type !== 'CHOOSE_GATE') continue;
          const gate = getGate(state.content, action.gateId);
          const passes = gate !== undefined && evaluate(gate.requires, state);
          const s = score(reduce(state, action), w) + (passes ? w.gatePass : 0);
          if (s > bestScore) [best, bestScore] = [action, s];
        }
        return best;
      }

      const base = score(state, w);
      const seen = new Set<string>();
      let best: Action = END_TURN;
      let bestGain = 0;
      for (const action of legal) {
        if (action.type !== 'PLAY_CARD') continue;
        const cardId = state.hand.find((c) => c.uid === action.uid)?.cardId ?? '';
        if (seen.has(cardId)) continue; // duplicates in hand score the same
        seen.add(cardId);
        const cost = getCard(state.content, cardId)?.cost ?? 0;
        const next = reduce(state, action);
        // The played card leaving the hand isn't a loss, and neither are the slots it cost:
        // only extra cards drawn and extra slots gained count.
        const gain = score(next, w) - base + w.hand + w.slots * (next.slots - state.slots + cost);
        const perSlot = gain / Math.max(1, cost);
        if (perSlot > bestGain + 1e-9) [best, bestGain] = [action, perSlot];
      }
      return best;
    },
  };
}

/** Plays a uniformly random playable card until none is playable; picks a random gate. */
const random: Persona = {
  id: 'random',
  choose(state, legal, rng) {
    const pool = state.phase === 'gate' ? legal : legal.filter((a) => a.type === 'PLAY_CARD');
    return pool.length === 0 ? END_TURN : (pool[nextInt(rng, pool.length)] as Action);
  },
};

const BALANCED = { hype: 1, craft: 1, capital: 0.5, heat: -0.5, scandal: -8, risk: -6, hand: 1.5, slots: 2, gatePass: 6 };

export const PERSONAS: { readonly [K in PersonaId]: Persona } = {
  // Balanced: grows everything, treats heat as debt, buys off scandals, dodges thresholds.
  minmaxer: greedy('minmaxer', { ...BALANCED, flagUnlock: 12, flagLock: 12, dealDrive: 0 }),
  random,
  // Craft first, very heat-averse.
  crafter: greedy('crafter', { hype: 0.25, craft: 1.5, capital: 0.4, heat: -1, scandal: -10, risk: -8, hand: 1, slots: 1.5, gatePass: 6, flagUnlock: 6, flagLock: 6, dealDrive: 0 }),
  // Hype first, blind to heat and scandals.
  hypechaser: greedy('hypechaser', { hype: 1.5, craft: 0.25, capital: 0.3, heat: 0, scandal: 0, risk: 0, hand: 1, slots: 1.5, gatePass: 6, flagUnlock: 6, flagLock: 6, dealDrive: 0 }),
  // Balanced resources, but weights flags heavily and plays toward the gates that grant them.
  dealseeker: greedy('dealseeker', { ...BALANCED, flagUnlock: 40, flagLock: 20, dealDrive: 1 }),
};

/** Salt that separates each persona's decision stream from the game's own RNG. */
export const PERSONA_SALT: { readonly [K in PersonaId]: number } = {
  minmaxer: 0x6d696e6d,
  random: 0x72616e64,
  crafter: 0x63726166,
  hypechaser: 0x68797065,
  dealseeker: 0x6465616c,
};
