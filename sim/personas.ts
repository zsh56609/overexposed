// Player personas. Each is a policy: (state, legal actions) → action.
//
// The three strategic personas share one greedy player and differ only in what they value.
// None of them knows any card, gate or ending id: they read resources, scandals and the
// rules, so content can change without touching this file.
//
// Greedy step: simulate every playable card through the pure reducer, score the resulting
// state, play the best gain per slot; end the turn when no card improves the score.
// Gates: simulate each choice, score the result, add a bonus if the gate would pass.
// (Simulating draw effects peeks at the seeded deck. The score only counts hand size,
// not which cards arrived, so the peek is worth little.)

import {
  evaluate,
  getCard,
  getGate,
  heatThreshold,
  nextInt,
  reduce,
  scandalCount,
  type Action,
  type GameState,
  type RngCursor,
} from '../core/index.ts';

export const PERSONA_IDS = ['minmaxer', 'random', 'crafter', 'hypechaser'] as const;
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
}

const END_TURN: Action = { type: 'END_TURN' };

function score(s: GameState, w: Weights): number {
  const r = s.resources;
  const atRisk = s.phase === 'play' && r.heat >= heatThreshold(s.content.rules, s.act) ? 1 : 0;
  return (
    w.hype * r.hype +
    w.craft * r.craft +
    w.capital * r.capital +
    w.heat * r.heat +
    w.scandal * scandalCount(s) +
    w.risk * atRisk +
    w.hand * s.hand.length
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

export const PERSONAS: { readonly [K in PersonaId]: Persona } = {
  // Balanced: grows everything, treats heat as debt, buys off scandals, dodges thresholds.
  minmaxer: greedy('minmaxer', { hype: 1, craft: 1, capital: 0.5, heat: -0.5, scandal: -8, risk: -6, hand: 1.5, slots: 2, gatePass: 6 }),
  random,
  // Craft first, very heat-averse.
  crafter: greedy('crafter', { hype: 0.25, craft: 1.5, capital: 0.4, heat: -1, scandal: -10, risk: -8, hand: 1, slots: 1.5, gatePass: 6 }),
  // Hype first, blind to heat and scandals.
  hypechaser: greedy('hypechaser', { hype: 1.5, craft: 0.25, capital: 0.3, heat: 0, scandal: 0, risk: 0, hand: 1, slots: 1.5, gatePass: 6 }),
};

/** Salt that separates each persona's decision stream from the game's own RNG. */
export const PERSONA_SALT: { readonly [K in PersonaId]: number } = {
  minmaxer: 0x6d696e6d,
  random: 0x72616e64,
  crafter: 0x63726166,
  hypechaser: 0x68797065,
};
