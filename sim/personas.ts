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
// Flags: a flag that conditions require (flags.all / flags.any) is worth `flagUnlock`, one they
// forbid (flags.not) costs `flagLock`, each weighted by what reads it — an ending 1.0, a gate 0.4,
// a card condition 0.1, summed over the distinct tiers. `flagScores` overrides that per flag id.

import {
  effectiveHeatThreshold,
  evaluate,
  getCard,
  getGate,
  lanePlays,
  nextInt,
  reduce,
  RESOURCE_KEYS,
  scandalCount,
  type Action,
  type CardDef,
  type Condition,
  type ContentIndex,
  type Effect,
  type GameState,
  type Range,
  type ResourceKey,
  type RngCursor,
  type YearConditions,
} from '../core/index.ts';

export const PERSONA_IDS = ['minmaxer', 'random', 'crafter', 'hypechaser', 'dealseeker', 'comeback', 'artisan', 'screenseeker', 'celebseeker'] as const;
export type PersonaId = (typeof PERSONA_IDS)[number];

export interface Persona {
  readonly id: PersonaId;
  /** Every weight table the persona decides by (comeback has two modes). Absent: it doesn't score states. */
  readonly weights?: readonly Weights[];
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
  /** Per scandal the current heat will crystallise at end of turn: floor(heat / threshold). */
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
  /**
   * A career lane to pursue (docs/design/content-expansion.md §2), and how hard: `lanePull` per play of
   * lead that lane holds over the next lane in cards played. Absent: lanes are not valued at all.
   */
  readonly lane?: string;
  readonly lanePull?: number;
}

const END_TURN: Action = { type: 'END_TURN' };

/** How much a flag matters by what reads it: an ending outranks a gate, which outranks a card condition. */
const TIER = { ending: 1, gate: 0.4, card: 0.1 } as const;
type Tier = keyof typeof TIER;

interface FlagRefs {
  /** Flag → summed tier weight of the distinct tiers that require / forbid it. */
  readonly unlocks: ReadonlyMap<string, number>;
  readonly locks: ReadonlyMap<string, number>;
}

const flagRefsCache = new WeakMap<ContentIndex, FlagRefs>();

/** Which flags the content's conditions require or forbid, and how much they matter. Computed once per content. */
function flagRefs(content: ContentIndex): FlagRefs {
  const cached = flagRefsCache.get(content);
  if (cached) return cached;
  const unlockTiers = new Map<string, Set<Tier>>();
  const lockTiers = new Map<string, Set<Tier>>();
  const note = (map: Map<string, Set<Tier>>, flag: string, tier: Tier) => {
    const tiers = map.get(flag) ?? new Set<Tier>();
    tiers.add(tier);
    map.set(flag, tiers);
  };
  const scan = (c: Condition | undefined, tier: Tier) => {
    for (const f of [...(c?.flags?.all ?? []), ...(c?.flags?.any ?? [])]) note(unlockTiers, f, tier);
    for (const f of c?.flags?.not ?? []) note(lockTiers, f, tier);
  };
  const scanEffects = (effects: readonly Effect[] | undefined, tier: Tier) => {
    for (const e of effects ?? []) {
      if (e.op !== 'conditional') continue;
      scan(e.if, tier);
      scanEffects(e.then, tier);
      scanEffects(e.else, tier);
    }
  };
  // Endings read flags in their minors' year conditions, alternatives included.
  const scanYear = (c: YearConditions | undefined) => {
    scan(c, 'ending');
    for (const alt of c?.anyOf ?? []) scanYear(alt);
  };
  for (const minor of content.minors) scanYear(minor.conditions);
  for (const gate of Object.values(content.gates)) {
    scan(gate.requires, 'gate');
    scanEffects(gate.onPass, 'gate');
    scanEffects(gate.onFail, 'gate');
  }
  for (const card of Object.values(content.cards)) {
    scan(card.requires, 'card');
    scanEffects(card.effects, 'card');
    scanEffects(card.onDraw, 'card');
    scanEffects(card.onEndOfTurn, 'card');
  }
  const total = (map: Map<string, Set<Tier>>) =>
    new Map([...map].map(([flag, tiers]) => [flag, [...tiers].reduce((sum, t) => sum + TIER[t], 0)] as const));
  const refs = { unlocks: total(unlockTiers), locks: total(lockTiers) };
  flagRefsCache.set(content, refs);
  return refs;
}

function flagValue(flag: string, content: ContentIndex, w: Weights): number {
  if (w.flagScores && Object.hasOwn(w.flagScores, flag)) return w.flagScores[flag] as number;
  const refs = flagRefs(content);
  return w.flagUnlock * (refs.unlocks.get(flag) ?? 0) - w.flagLock * (refs.locks.get(flag) ?? 0);
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

/** How far the persona's lane leads the next lane in cards played (negative: it trails). */
function laneLead(s: GameState, lane: string): number {
  const plays = lanePlays(s);
  const others = Object.entries(plays).filter(([l]) => l !== lane).map(([, n]) => n);
  return (plays[lane] ?? 0) - Math.max(0, ...others);
}

function score(s: GameState, w: Weights): number {
  const r = s.resources;
  const threshold = effectiveHeatThreshold(s);
  const atRisk = s.phase === 'play' && threshold > 0 ? Math.floor(r.heat / threshold) : 0;
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
    flags +
    (w.lane !== undefined && w.lanePull ? w.lanePull * laneLead(s, w.lane) : 0)
  );
}

// ---------------------------------------------------------------------------
// Drafting: the card's own effects scored straight off the weight table, discounted by how likely it is
// to be playable and, for one-shots, by being used up. No simulation.

const weightOf = (target: ResourceKey, w: Weights) =>
  target === 'hype' ? w.hype : target === 'craft' ? w.craft : target === 'capital' ? w.capital : w.heat;

const scandalTagCache = new WeakMap<ContentIndex, ReadonlySet<string>>();

/** Tags carried by scandal cards: exhausting one of these removes a scandal. */
function scandalTags(content: ContentIndex): ReadonlySet<string> {
  let tags = scandalTagCache.get(content);
  if (!tags) {
    tags = new Set(content.scandalIds.flatMap((id) => getCard(content, id)?.tags ?? []));
    scandalTagCache.set(content, tags);
  }
  return tags;
}

/** Conditionals take the branch that holds in the current state. */
function effectsValue(effects: readonly Effect[] | undefined, s: GameState, w: Weights): number {
  let v = 0;
  for (const e of effects ?? []) {
    switch (e.op) {
      case 'resource':
        v += weightOf(e.target, w) * e.value;
        break;
      case 'draw':
        v += w.hand * e.count;
        break;
      case 'slots':
        v += w.slots * e.value;
        break;
      case 'setFlag':
        if (!Object.hasOwn(s.flags, e.flag)) v += flagValue(e.flag, s.content, w);
        break;
      case 'exhaustTag':
        if (scandalTags(s.content).has(e.tag)) v -= w.scandal * (e.count ?? 1);
        break;
      case 'conditional':
        v += effectsValue(evaluate(e.if, s) ? e.then : e.else, s, w);
        break;
      case 'addCard':
        break;
    }
  }
  return v;
}

/** Value per slot of playing the card once; a card in the pursued lane adds the lane's pull. */
function playValue(s: GameState, def: CardDef, w: Weights): number {
  const lane = w.lane !== undefined && def.lane === w.lane ? (w.lanePull ?? 0) : 0;
  return (effectsValue(def.effects, s, w) + effectsValue(def.onDraw, s, w) + lane) / Math.max(1, def.cost);
}

const within = (value: number, r: Range) => (r.min === undefined || value >= r.min) && (r.max === undefined || value <= r.max);

/**
 * How likely a `requires` condition is to hold when the card comes up, 0..1: the product over its
 * clauses. A minimum already met counts 1; an unmet one is projected at the run's growth so far (gain
 * per completed turn) and counts the share of the remaining turns in which it will hold — 0 if it
 * won't be reached in time, an even 0.5 on turn 1 with no history. A maximum exceeded now counts 0.5
 * (it can come back down). An act/turn window counts the share of remaining turns inside it. A
 * forbidden flag already held is permanent: 0. A required flag not held yet: 0.5.
 */
function requiresOdds(c: Condition | undefined, s: GameState): number {
  if (!c) return 1;
  const rules = s.content.rules;
  const total = rules.acts * rules.turnsPerAct;
  const remaining = Math.max(1, total - s.turn + 1);
  const elapsed = s.turn - 1;
  const clause = (value: number, start: number, r: Range | undefined): number => {
    if (!r) return 1;
    let odds = r.max !== undefined && value > r.max ? 0.5 : 1;
    if (r.min !== undefined && value < r.min) {
      const rate = elapsed > 0 ? (value - start) / elapsed : 0;
      if (elapsed === 0) odds *= 0.5;
      else if (rate <= 0) return 0;
      else {
        const turnsToReach = (r.min - value) / rate;
        if (turnsToReach >= remaining) return 0;
        odds *= (remaining - turnsToReach) / remaining;
      }
    }
    return odds;
  };
  let odds = 1;
  for (const key of RESOURCE_KEYS) odds *= clause(s.resources[key], rules.startingResources[key], c[key]);
  odds *= clause(scandalCount(s), 0, c.scandalCount);
  if (c.act || c.turn) {
    let inside = 0;
    for (let t = s.turn; t <= total; t++) {
      if ((!c.act || within(Math.ceil(t / rules.turnsPerAct), c.act)) && (!c.turn || within(t, c.turn))) inside++;
    }
    odds *= inside / remaining;
  }
  const f = c.flags;
  if (f) {
    const has = (flag: string) => Object.hasOwn(s.flags, flag);
    if (f.not?.some(has)) return 0; // flags are never unset
    if (f.all && !f.all.every(has)) odds *= 0.5;
    if (f.any && !f.any.some(has)) odds *= 0.5;
  }
  return odds;
}

/** The part of effectsValue that sets flags: permanent, so it is gained once however often the card is played. */
function flagsValue(effects: readonly Effect[] | undefined, s: GameState, w: Weights): number {
  let v = 0;
  for (const e of effects ?? []) {
    if (e.op === 'setFlag' && !Object.hasOwn(s.flags, e.flag)) v += flagValue(e.flag, s.content, w);
    else if (e.op === 'conditional') v += flagsValue(evaluate(e.if, s) ? e.then : e.else, s, w);
  }
  return v;
}

/**
 * Draft value (docs/sim.md → Drafting): the odds its `requires` will hold × value per slot of one play, with a
 * one-shot's repeatable part scaled by the share of a kept card's uses it gets. The rest of the run
 * draws a card about remainingTurns × handSize ÷ (cards owned + 1) times; a kept card can be played
 * each time, a one-shot (opportunity) only once, so its repeatable effects count min(1, 1 ÷ draws).
 * Setting a flag is permanent and counts in full either way. Kept cards stay in per-play units, so the
 * capital prices of rerolls and extra picks keep their meaning.
 */
function draftValue(s: GameState, cardId: string, w: Weights): number {
  const def = getCard(s.content, cardId);
  if (!def) return 0;
  const rules = s.content.rules;
  const remaining = Math.max(1, rules.acts * rules.turnsPerAct - s.turn + 1);
  const owned = s.deck.length + s.hand.length + s.discard.length;
  const draws = (remaining * rules.handSize) / (owned + 1);
  const useShare = def.kind === 'opportunity' ? Math.min(1, 1 / draws) : 1;
  const perPlay = playValue(s, def, w);
  const once = (flagsValue(def.effects, s, w) + flagsValue(def.onDraw, s, w)) / Math.max(1, def.cost);
  return requiresOdds(def.requires, s) * ((perPlay - once) * useShare + once);
}

function draftChoice(state: GameState, legal: readonly Action[], w: Weights): Action {
  const dr = state.draft;
  if (!dr) return legal[0] as Action;
  const cfg = state.content.rules.draft;
  const ranked = dr.offer.map((id) => ({ id, v: draftValue(state, id, w) })).sort((a, b) => b.v - a.v);
  const can = (type: Action['type']) => legal.some((a) => a.type === type);
  // Nothing on offer is worth what a reroll costs: reroll.
  if (can('DRAFT_REROLL') && (ranked.at(0)?.v ?? 0) < cfg.rerollCost * w.capital) return { type: 'DRAFT_REROLL' };
  // The best card these picks would leave behind is worth more than an extra pick costs: buy one.
  const leftBehind = ranked.at(dr.picksLeft);
  if (can('DRAFT_EXTRA_PICK') && leftBehind && leftBehind.v > cfg.extraPickCost * w.capital) return { type: 'DRAFT_EXTRA_PICK' };
  const best = ranked.at(0);
  return best ? { type: 'DRAFT_PICK', cardId: best.id } : (legal[0] as Action);
}

// ---------------------------------------------------------------------------

function greedyChoose(state: GameState, legal: readonly Action[], w: Weights): Action {
  if (state.phase === 'draft') return draftChoice(state, legal, w);
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
}

function greedy(id: PersonaId, w: Weights): Persona {
  return { id, weights: [w], choose: (state, legal) => greedyChoose(state, legal, w) };
}

// ---------------------------------------------------------------------------
// comeback: spike hype, then pay to clean up — the route the design says exists.

/**
 * Scandals held at which comeback stops spiking and starts cleaning up (N). An instrument setting,
 * fixed here on purpose: it used to be derived from star's scandal ceiling, so tuning that ceiling
 * silently changed the tester's behaviour too. 5 is the value the derivation gave when it was
 * frozen (round 4); change it only as a deliberate change to the instrument.
 */
export const COMEBACK_SWITCH_AT = 5;

/** Below N: all-in on hype, heat ignored, capital banked for later. */
const COMEBACK_SPIKE: Weights = {
  hype: 1.5, craft: 0.5, capital: 0.6, heat: 0, scandal: -2, risk: 0, hand: 1, slots: 1.5, gatePass: 6,
  flagUnlock: 20, flagLock: 10, dealDrive: 1,
};
/** At or above N: buy scandals off and stop feeding heat. */
const COMEBACK_CLEANUP: Weights = {
  hype: 0.8, craft: 0.5, capital: 0.8, heat: -1, scandal: -15, risk: -10, hand: 1, slots: 1.5, gatePass: 6,
  flagUnlock: 20, flagLock: 10, dealDrive: 1,
};

const comeback: Persona = {
  id: 'comeback',
  weights: [COMEBACK_SPIKE, COMEBACK_CLEANUP],
  choose: (state, legal) =>
    greedyChoose(state, legal, scandalCount(state) < COMEBACK_SWITCH_AT ? COMEBACK_SPIKE : COMEBACK_CLEANUP),
};

/**
 * Plays a uniformly random playable card until none is playable. Gates and drafts: a uniformly
 * random legal action (so it also buys extra picks and rerolls at random when it can afford them).
 */
const random: Persona = {
  id: 'random',
  choose(state, legal, rng) {
    const pool = state.phase === 'play' ? legal.filter((a) => a.type === 'PLAY_CARD') : legal;
    return pool.length === 0 ? END_TURN : (pool[nextInt(rng, pool.length)] as Action);
  },
};

const BALANCED = { hype: 1, craft: 1, capital: 0.5, heat: -0.5, scandal: -8, risk: -6, hand: 1.5, slots: 2, gatePass: 6 };

/**
 * A lane probe's pull, per play of lead its lane holds (an instrument setting, like COMEBACK_SWITCH_AT:
 * fixed, not derived from content). About one good card's worth, so the lane outweighs a card's own
 * value without making the probe ignore its resources.
 */
export const LANE_PULL = 6;

export const PERSONAS: { readonly [K in PersonaId]: Persona } = {
  // Balanced: grows everything, treats heat as debt, buys off scandals, dodges thresholds.
  minmaxer: greedy('minmaxer', { ...BALANCED, flagUnlock: 12, flagLock: 12, dealDrive: 0 }),
  random,
  // Probe: craft only, very heat-averse, hype ignored entirely.
  crafter: greedy('crafter', { hype: 0, craft: 1.5, capital: 0.4, heat: -1, scandal: -10, risk: -8, hand: 1, slots: 1.5, gatePass: 6, flagUnlock: 6, flagLock: 6, dealDrive: 0 }),
  // Probe: hype first, heat and scandals ignored entirely.
  hypechaser: greedy('hypechaser', { hype: 1.5, craft: 0.25, capital: 0.3, heat: 0, scandal: 0, risk: 0, hand: 1, slots: 1.5, gatePass: 6, flagUnlock: 6, flagLock: 6, dealDrive: 0 }),
  // Balanced resources, but weights flags heavily and plays toward the gates that grant them.
  dealseeker: greedy('dealseeker', { ...BALANCED, flagUnlock: 40, flagLock: 20, dealDrive: 1 }),
  // Spikes hype until it holds COMEBACK_SWITCH_AT scandals, then switches to paying them off.
  comeback,
  // Player-like, craft-leaning: high craft, moderate hype, risk-averse. No weight is zero, so the
  // probe rule can never capture it (it is the player crafter no longer models).
  artisan: greedy('artisan', { hype: 0.5, craft: 1.5, capital: 0.5, heat: -1, scandal: -10, risk: -8, hand: 1.5, slots: 2, gatePass: 6, flagUnlock: 6, flagLock: 6, dealDrive: 0.25 }),
  // Lane probes: balanced, but pursuing one career lane. Experiments on lane reachability, not players.
  screenseeker: greedy('screenseeker', { ...BALANCED, flagUnlock: 12, flagLock: 12, dealDrive: 0, lane: 'screen', lanePull: LANE_PULL }),
  celebseeker: greedy('celebseeker', { ...BALANCED, flagUnlock: 12, flagLock: 12, dealDrive: 0, lane: 'celebrity', lanePull: LANE_PULL }),
};

/** Salt that separates each persona's decision stream from the game's own RNG. */
export const PERSONA_SALT: { readonly [K in PersonaId]: number } = {
  minmaxer: 0x6d696e6d,
  random: 0x72616e64,
  crafter: 0x63726166,
  hypechaser: 0x68797065,
  dealseeker: 0x6465616c,
  comeback: 0x636f6d65,
  artisan: 0x61727469,
  screenseeker: 0x73637265,
  celebseeker: 0x63656c65,
};

// ---------------------------------------------------------------------------
// Classes (docs/sim.md → Tuning targets), derived from weights, never from ids. A persona that gives an axis zero
// weight in every mode ignores it entirely: it is a control probe — an experiment on the design
// thesis, not a model of a player. One that pursues a single career lane in every mode is a lane probe —
// an experiment on lane reachability. Everyone else is player-like, random included (it scores nothing).

export type ProbeAxis = 'heat' | 'hype';

/** Axes the persona ignores entirely. heat: heat, scandal and risk weights all 0. hype: hype weight 0. */
export function ignoredAxes(id: PersonaId): readonly ProbeAxis[] {
  const modes = PERSONAS[id].weights ?? [];
  if (modes.length === 0) return [];
  const axes: ProbeAxis[] = [];
  if (modes.every((w) => w.heat === 0 && w.scandal === 0 && w.risk === 0)) axes.push('heat');
  if (modes.every((w) => w.hype === 0)) axes.push('hype');
  return axes;
}

/**
 * The career lane the persona pursues: every mode pulls toward the same lane. A lane seeker is a probe
 * too — an experiment on lane reachability, never a model of a player.
 */
export function seeksLane(id: PersonaId): string | null {
  const modes = PERSONAS[id].weights ?? [];
  const lane = modes[0]?.lane;
  return lane !== undefined && modes.every((w) => w.lane === lane && (w.lanePull ?? 0) > 0) ? lane : null;
}

export function isProbe(id: PersonaId): boolean {
  return ignoredAxes(id).length > 0 || seeksLane(id) !== null;
}
