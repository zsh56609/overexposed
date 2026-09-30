// Aggregate a batch into the report (AGENTS.md §5, docs/sim.md): JSON-able data plus console tables.
// Ids and numbers only; no content display strings.

import { MAX_ACTIONS, type BatchResult, type RunRecord, type TurnSnapshot } from './batch.ts';
import { COMEBACK_SWITCH_AT, ignoredAxes, isProbe, PERSONA_IDS, seeksLane, type PersonaId, type ProbeAxis } from './personas.ts';
import { chiSquare2xK, mean, median, quantile, sum, totalVariation } from './stats.ts';

/**
 * Tuning targets (docs/sim.md → Tuning targets). Every persona runs the same seeds, equal runs each. Two
 * persona classes (see isProbe): player-like personas are the band population — the concentration bands
 * per persona, the aggregate bands pooled over them with equal weight. Probes — control probes ignoring
 * an axis, lane probes pursuing a lane — only carry assertions that fail if the design breaks; their draws
 * never set gate difficulty, the scandal median or minor reachability.
 */
export const BANDS = {
  /** Per player-like persona: no single (minor) ending may take more than this share of its runs. */
  personaEndingMax: 0.7,
  /** Per player-like persona: no single major ending may take more than this share of its runs. */
  personaMajorMax: 0.7,
  /**
   * Exempt from the major band only (the author, round a83fa88): a cautious, craft-led player is playing the
   * long game — the major reflects the approach, and variety belongs at the minor level, where it stays.
   */
  personaMajorExempt: ['artisan'] as readonly PersonaId[],
  /**
   * Player-like, pooled: every minor ending reached in at least this share of runs — "reachable", meaning
   * not effectively impossible, not "common". Rare minors are the collection's achievements; the axes are
   * not bent to inflate them. 1.4% (round b59f9d6): The Redemption Arc needs a genuine comeback and sits at
   * 1.46–1.84%, within seed noise of 1.5%.
   */
  minorReachMin: 0.014,
  /** A probe ignoring heat must end on the damaged side of the scandal axis in more than this share. */
  probeHeatCollapseMin: 0.8,
  /** A probe ignoring hype must end on the famous side of the hype axis in less than this share. */
  probeHypeTopMax: 0.05,
  /** A lane probe must end the year in its own lane in more than this share of its runs (most of them). */
  laneProbeMin: 0.5,
  /** Player-like, pooled: median scandals held at run end. */
  scandalMedian: [2, 5],
  /** Player-like, pooled, per gate: requirement already satisfied when offered. */
  gateMet: [0.35, 0.65],
  /** Player-like, pooled: play rate = times played / times drawn. */
  cardPlayRate: 0.02,
  /** "Significantly different" made concrete: chi-square p below this AND total variation distance at least… */
  skillP: 0.01,
  skillTvd: 0.2,
  /**
   * Player-like, pooled: dead cards (scandals) drawn per turn, averaged per act, must rise act by act —
   * lowest in the first act, highest in the last. What the player feels is how many of the hand's cards
   * are dead this turn, so "the spiral lands in winter" is measured as clogging, not crystallisation.
   */
  clogging: 'rising',
} as const;

const METRICS = ['hype', 'craft', 'capital', 'heat', 'scandals', 'threshold', 'crystallised', 'scandalsDrawn'] as const;
/** Metrics printed with one decimal in the curve tables. */
const FINE: readonly string[] = ['scandals', 'threshold', 'crystallised', 'scandalsDrawn'];
type Metric = (typeof METRICS)[number];
/** A persona, or 'players': every player-like persona pooled with equal weight (the band population). */
type Group = PersonaId | 'players';

interface Dist {
  readonly mean: number;
  readonly p10: number;
  readonly p50: number;
  readonly p90: number;
}

export interface BandCheck {
  readonly target: string;
  readonly pass: boolean | null;
  readonly actual: string;
}

export interface Report {
  readonly meta: {
    readonly seed: number;
    /** The manager every run chose (round 2b); null when content has none. */
    readonly manager: string | null;
    readonly runsPerPersona: number;
    readonly personas: readonly PersonaId[];
    readonly totalRuns: number;
    readonly seconds: number;
    readonly acts: number;
    readonly turnsPerAct: number;
    /** Per persona: the axes it ignores entirely (a control probe), and the lane it pursues (a lane probe). */
    readonly ignores: Readonly<Record<string, readonly ProbeAxis[]>>;
    readonly seeks: Readonly<Record<string, string | null>>;
    /** Majors the probe assertions name, derived from content: the damaged side of the scandal axis, the famous side of the hype axis. */
    readonly collapseMajors: readonly string[];
    readonly topHypeMajors: readonly string[];
    /** Scandals held at which comeback switches from spiking to cleaning up (a fixed persona parameter). */
    readonly comebackLimit: number | null;
  };
  readonly health: {
    readonly crashes: readonly { seed: number; persona: PersonaId; error: string }[];
    readonly softLocks: readonly { seed: number; persona: PersonaId; reason: string }[];
    readonly replay: BatchResult['replay'];
  };
  /** Minor endings (grouped by major), majors, and the lane each run ended in: shares of runs per group. */
  readonly endings: { readonly ids: readonly string[]; readonly majorOf: Readonly<Record<string, string>>; readonly share: Readonly<Record<Group, Readonly<Record<string, number>>>> };
  readonly majors: { readonly ids: readonly string[]; readonly share: Readonly<Record<Group, Readonly<Record<string, number>>>> };
  readonly lanes: { readonly ids: readonly string[]; readonly share: Readonly<Record<Group, Readonly<Record<string, number>>>> };
  readonly scandalsHeld: Readonly<
    Record<
      Group,
      { median: number; mean: number; p90: number; max: number; crystallised: number; byTag: number | null; multiTurns: number; maxInTurn: number }
    >
  >;
  /** Share of turns ending with 0, 1, 2, 3+ scandals crystallised. */
  readonly crystalTurns: Readonly<Record<Group, readonly [number, number, number, number]>>;
  /** Per scandal card: its kind tags, crystallised per run, and the share of runs it crystallised in at least once. */
  readonly scandalKinds: readonly {
    id: string;
    kinds: readonly string[];
    byGroup: Readonly<Record<Group, { perRun: number; runs: number }>>;
  }[];
  /** Pooled: share of all crystallised scandals blamed on each card ('none' = no card to blame). */
  readonly blame: readonly { cause: string; share: number }[];
  /**
   * Per act (index 0 = act 1), over every turn of that act: mean effective threshold at the heat
   * check, scandals crystallised per turn, the share of turns that crystallised 2+ at once, and
   * scandal cards drawn per turn (the choke: hand room lost to scandals).
   */
  readonly cascadeByAct: Readonly<Record<Group, readonly { threshold: number; perTurn: number; multi: number; drawn: number }[]>>;
  readonly gates: readonly {
    id: string;
    act: number;
    offered: number;
    chosen: number;
    passed: number;
    /** Requirement already held when offered, whether or not it was chosen. */
    metRate: number | null;
    pickRate: number;
    passRate: number | null;
    byPersona: Readonly<Record<string, { chosen: number; passRate: number | null }>>;
  }[];
  /** Share of runs holding each flag at the end. */
  readonly flagsHeld: Readonly<Record<string, Readonly<Record<Group, number>>>>;
  /** Per flag and group: runs that set it, and the share of those set by each source (card or gate id). */
  readonly flagSources: Readonly<Record<string, Readonly<Record<Group, { runs: number; bySource: Readonly<Record<string, number>> }>>>>;
  /** Per persona, per run: cards acquired in drafts, extra picks bought, rerolls, capital spent on them. */
  readonly draft: Readonly<
    Record<
      string,
      {
        acquired: { mean: number; min: number; max: number };
        extraPicks: number;
        rerolls: number;
        spend: number;
        capitalAtEnd: number;
        /** Per-run means of the capital flow. */
        capital: { earned: number; draft: number; removal: number; cards: number; lost: number };
      }
    >
  >;
  readonly cards: readonly {
    id: string;
    kind: string;
    playRate: number | null;
    runsPlayed: number;
    /** Player-like, pooled: draft offers containing the card, times it was taken, and taken / offered. */
    offered: number;
    drafted: number;
    draftRate: number | null;
    byPersona: Readonly<Record<string, { drawnPerRun: number; playedPerRun: number; playRate: number | null }>>;
  }[];
  readonly runLength: Readonly<
    Record<string, { turns: [number, number]; actions: { mean: number; min: number; max: number }; cardsPlayedMean: number }>
  >;
  readonly curves: Readonly<Record<string, readonly ({ turn: number } & Record<Metric, Dist>)[]>>;
  readonly skill: { chi2: number; df: number; p: number; tvd: number } | null;
  readonly bands: readonly BandCheck[];
  /** Reported for context, not pass/fail: they measure the persona mix as much as the game. */
  readonly diagnostics: readonly { readonly label: string; readonly value: string }[];
}

const ratio = (a: number, b: number) => (b === 0 ? null : a / b);

function dist(xs: readonly number[]): Dist {
  return { mean: mean(xs), p10: quantile(xs, 0.1), p50: quantile(xs, 0.5), p90: quantile(xs, 0.9) };
}

export function buildReport(batch: BatchResult): Report {
  const { records, personas, content } = batch;
  const ignores = Object.fromEntries(personas.map((p) => [p, ignoredAxes(p)])) as Record<PersonaId, readonly ProbeAxis[]>;
  const seeks = Object.fromEntries(personas.map((p) => [p, seeksLane(p)])) as Record<PersonaId, string | null>;
  const players = personas.filter((p) => !isProbe(p));
  const byPersona = (p: PersonaId) => records.filter((r) => r.persona === p);
  const playerRecords = records.filter((r) => players.includes(r.persona));
  const groups: [Group, readonly RunRecord[]][] = [...personas.map((p): [Group, RunRecord[]] => [p, byPersona(p)]), ['players', playerRecords]];
  const healthy = records.filter((r) => r.crash === null && r.softLock === null);
  /** The band population: healthy runs of player-like personas. */
  const healthyPlayers = healthy.filter((r) => players.includes(r.persona));

  // Endings: minors (the ending), their majors, and the lane each run ended in
  const endingIds = content.endings.minors.map((m) => m.id);
  const majorIds = content.endings.majors.map((m) => m.id);
  const laneIds = content.rules.lanes ?? [];
  const shareBy = (ids: readonly string[], of: (r: RunRecord) => string | null) =>
    Object.fromEntries(
      groups.map(([g, rs]) => {
        const done = rs.filter((r) => r.endingId !== null);
        return [g, Object.fromEntries(ids.map((id) => [id, done.filter((r) => of(r) === id).length / Math.max(1, done.length)]))];
      }),
    ) as Record<Group, Record<string, number>>;
  const share = shareBy(endingIds, (r) => r.endingId);
  const majorShare = shareBy(majorIds, (r) => r.majorId);
  const laneShare = shareBy(laneIds, (r) => r.lane);

  // Scandals held at the end of the run
  const scandalsHeld = Object.fromEntries(
    groups.map(([g, rs]) => {
      const ok = rs.filter((r) => r.crash === null);
      const xs = ok.map((r) => r.scandalsAtEnd);
      return [
        g,
        {
          median: median(xs),
          mean: mean(xs),
          p90: quantile(xs, 0.9),
          max: Math.max(...xs),
          crystallised: mean(ok.map((r) => r.scandalsCrystallised)),
          byTag: ratio(sum(ok.map((r) => r.scandalsByTag)), sum(ok.map((r) => r.scandalsCrystallised))),
          multiTurns: mean(ok.map((r) => r.multiScandalTurns)),
          maxInTurn: Math.max(...ok.map((r) => r.maxScandalsInTurn)),
        },
      ];
    }),
  ) as Report['scandalsHeld'];

  const crystalTurns = {} as Record<Group, readonly [number, number, number, number]>;
  for (const [g, rs] of groups) {
    const counts: [number, number, number, number] = [0, 0, 0, 0];
    let turns = 0;
    for (const r of rs) {
      for (const s of r.curve) {
        const k = Math.min(3, s.crystallised) as 0 | 1 | 2 | 3;
        counts[k] += 1;
        turns++;
      }
    }
    crystalTurns[g] = [counts[0] / Math.max(1, turns), counts[1] / Math.max(1, turns), counts[2] / Math.max(1, turns), counts[3] / Math.max(1, turns)];
  }

  // Scandal kinds: which scandals actually appear, and which cards they are blamed on
  const scandalCards = content.cards.filter((c) => c.kind === 'scandal');
  const sharedTags = (scandalCards[0]?.tags ?? []).filter((t) => scandalCards.every((c) => c.tags?.includes(t)));
  const scandalKinds = scandalCards.map((c) => ({
    id: c.id,
    kinds: (c.tags ?? []).filter((t) => !sharedTags.includes(t)),
    byGroup: Object.fromEntries(
      groups.map(([g, rs]) => {
        const ok = rs.filter((r) => r.crash === null);
        return [
          g,
          {
            perRun: mean(ok.map((r) => r.crystallisedById[c.id] ?? 0)),
            runs: ok.filter((r) => (r.crystallisedById[c.id] ?? 0) > 0).length / Math.max(1, ok.length),
          },
        ];
      }),
    ) as Record<Group, { perRun: number; runs: number }>,
  }));
  const blameCounts: Record<string, number> = {};
  for (const r of playerRecords) for (const [cause, n] of Object.entries(r.blamedOn)) blameCounts[cause] = (blameCounts[cause] ?? 0) + n;
  const blamed = sum(Object.values(blameCounts));
  const blame = Object.entries(blameCounts)
    .map(([cause, n]) => ({ cause, share: n / Math.max(1, blamed) }))
    .sort((a, b) => b.share - a.share);

  const { acts, turnsPerAct } = content.rules;
  const cascadeByAct = {} as Record<Group, { threshold: number; perTurn: number; multi: number; drawn: number }[]>;
  for (const [g, rs] of groups) {
    cascadeByAct[g] = Array.from({ length: acts }, (_, i) => {
      const snaps = rs.filter((r) => r.crash === null).flatMap((r) => r.curve.filter((s) => Math.ceil(s.turn / turnsPerAct) === i + 1));
      return {
        threshold: mean(snaps.map((s) => s.threshold)),
        perTurn: mean(snaps.map((s) => s.crystallised)),
        multi: snaps.filter((s) => s.crystallised >= 2).length / Math.max(1, snaps.length),
        drawn: mean(snaps.map((s) => s.scandalsDrawn)),
      };
    });
  }

  // Gates: aggregates over the player-like population; per persona below
  const gates = content.gates.map((gate) => {
    const offeredIn = (rs: readonly RunRecord[]) => rs.flatMap((r) => r.gates).filter((g) => g.offered.includes(gate.id));
    const chosenIn = (rs: readonly RunRecord[]) => rs.flatMap((r) => r.gates).filter((g) => g.gateId === gate.id);
    const offered = offeredIn(healthyPlayers).length;
    const chosen = chosenIn(healthyPlayers);
    const passed = chosen.filter((g) => g.passed).length;
    const checks = healthyPlayers.flatMap((r) => r.gateChecks).filter((c) => c.gateId === gate.id);
    return {
      id: gate.id,
      act: gate.act,
      offered,
      chosen: chosen.length,
      passed,
      metRate: ratio(checks.filter((c) => c.met).length, checks.length),
      pickRate: ratio(chosen.length, offered) ?? 0,
      passRate: ratio(passed, chosen.length),
      byPersona: Object.fromEntries(
        personas.map((p) => {
          const c = chosenIn(healthy.filter((r) => r.persona === p));
          return [p, { chosen: c.length, passRate: ratio(c.filter((g) => g.passed).length, c.length) }];
        }),
      ),
    };
  });

  // Flags held at run end
  const flagIds = [...new Set(healthy.flatMap((r) => r.flags))].sort();
  const flagsHeld = Object.fromEntries(
    flagIds.map((flag) => [
      flag,
      Object.fromEntries(
        groups.map(([g, rs]) => {
          const ok = rs.filter((r) => r.crash === null && r.softLock === null);
          return [g, ok.filter((r) => r.flags.includes(flag)).length / Math.max(1, ok.length)];
        }),
      ),
    ]),
  ) as Record<string, Record<Group, number>>;

  // What set each flag, among the runs that set it
  const flagSources = Object.fromEntries(
    flagIds.map((flag) => [
      flag,
      Object.fromEntries(
        groups.map(([g, rs]) => {
          const set = rs.filter((r) => r.crash === null && r.softLock === null && r.flagSources[flag] !== undefined);
          const bySource: Record<string, number> = {};
          for (const r of set) bySource[r.flagSources[flag] as string] = (bySource[r.flagSources[flag] as string] ?? 0) + 1;
          for (const src of Object.keys(bySource)) bySource[src] = (bySource[src] as number) / set.length;
          return [g, { runs: set.length, bySource }];
        }),
      ),
    ]),
  ) as Report['flagSources'];

  // Draft
  const draft = Object.fromEntries(
    personas.map((p) => {
      const rs = healthy.filter((r) => r.persona === p);
      const acquired = rs.map((r) => r.draftPicks);
      return [
        p,
        {
          acquired: { mean: mean(acquired), min: Math.min(...acquired), max: Math.max(...acquired) },
          extraPicks: mean(rs.map((r) => r.extraPicks)),
          rerolls: mean(rs.map((r) => r.rerolls)),
          spend: mean(rs.map((r) => r.draftSpend)),
          capitalAtEnd: mean(rs.map((r) => r.final?.capital ?? 0)),
          capital: {
            earned: mean(rs.map((r) => r.capital.earned)),
            draft: mean(rs.map((r) => r.capital.draft)),
            removal: mean(rs.map((r) => r.capital.removal)),
            cards: mean(rs.map((r) => r.capital.cards)),
            lost: mean(rs.map((r) => r.capital.lost)),
          },
        },
      ];
    }),
  );

  // Cards
  const count = (rs: readonly RunRecord[], field: 'draws' | 'plays' | 'offered' | 'drafted', id: string) =>
    sum(rs.map((r) => r[field][id] ?? 0));
  // Cards: aggregates over the player-like population; per persona below
  const cards = content.cards.map((card) => ({
    id: card.id,
    kind: card.kind,
    playRate: card.playable === false ? null : ratio(count(healthyPlayers, 'plays', card.id), count(healthyPlayers, 'draws', card.id)),
    runsPlayed: healthyPlayers.filter((r) => (r.plays[card.id] ?? 0) > 0).length / Math.max(1, healthyPlayers.length),
    offered: count(healthyPlayers, 'offered', card.id),
    drafted: count(healthyPlayers, 'drafted', card.id),
    draftRate: ratio(count(healthyPlayers, 'drafted', card.id), count(healthyPlayers, 'offered', card.id)),
    byPersona: Object.fromEntries(
      personas.map((p) => {
        const rs = healthy.filter((r) => r.persona === p);
        const drawn = count(rs, 'draws', card.id);
        const played = count(rs, 'plays', card.id);
        return [
          p,
          {
            drawnPerRun: drawn / Math.max(1, rs.length),
            playedPerRun: played / Math.max(1, rs.length),
            playRate: card.playable === false ? null : ratio(played, drawn),
          },
        ];
      }),
    ),
  }));

  // Run length
  const runLength = Object.fromEntries(
    personas.map((p) => {
      const rs = healthy.filter((r) => r.persona === p);
      const acts = rs.map((r) => r.actions);
      const turns = rs.map((r) => r.turnsCompleted);
      return [
        p,
        {
          turns: [Math.min(...turns), Math.max(...turns)] as [number, number],
          actions: { mean: mean(acts), min: Math.min(...acts), max: Math.max(...acts) },
          cardsPlayedMean: mean(rs.map((r) => r.cardsPlayed)),
        },
      ];
    }),
  );

  // Resource curves: value after end-of-turn resolution, by turn
  const totalTurns = content.rules.acts * content.rules.turnsPerAct;
  const curves = Object.fromEntries(
    personas.map((p) => {
      const rs = healthy.filter((r) => r.persona === p);
      const rows = Array.from({ length: totalTurns }, (_, i) => {
        const snaps = rs.map((r) => r.curve[i]).filter((s): s is TurnSnapshot => s !== undefined);
        const row = { turn: i + 1 } as { turn: number } & Record<Metric, Dist>;
        for (const m of METRICS) row[m] = dist(snaps.map((s) => s[m]));
        return row;
      });
      return [p, rows];
    }),
  );

  // Skill expression: minmaxer vs random ending distributions
  let skill: Report['skill'] = null;
  if (personas.includes('minmaxer') && personas.includes('random')) {
    const counts = (p: PersonaId) => endingIds.map((id) => healthy.filter((r) => r.persona === p && r.endingId === id).length);
    const a = counts('minmaxer');
    const b = counts('random');
    const { stat, df, p } = chiSquare2xK(a, b);
    skill = { chi2: stat, df, p, tvd: totalVariation(a, b) };
  }

  const crashes = records.filter((r) => r.crash !== null).map((r) => ({ seed: r.seed, persona: r.persona, error: r.crash as string }));
  const softLocks = records.filter((r) => r.softLock !== null).map((r) => ({ seed: r.seed, persona: r.persona, reason: r.softLock as string }));

  // Bands
  const pct = (x: number | null) => (x === null ? 'n/a' : `${(x * 100).toFixed(1)}%`);
  const bands: BandCheck[] = [];
  const concentration = (ids: readonly string[], sh: Record<Group, Record<string, number>>, max: number, what: string, exempt: readonly PersonaId[] = []): BandCheck => {
    const top = (p: PersonaId) => ids.map((id) => ({ id, share: sh[p][id] ?? 0 })).reduce((a, b) => (b.share > a.share ? b : a));
    const held = players.filter((p) => !exempt.includes(p));
    const excused = players.filter((p) => exempt.includes(p));
    return {
      target: `player-like personas: no single ${what} > ${pct(max)} of its runs${excused.length ? ` (exempt: ${excused.join(', ')})` : ''}`,
      pass: held.length === 0 ? null : held.every((p) => top(p).share <= max),
      actual:
        players.length === 0
          ? 'no player-like persona in this batch'
          : players
              .map((p) => {
                const t = top(p);
                return `${p} ${t.id} ${pct(t.share)}${exempt.includes(p) ? ' (exempt)' : t.share > max ? ' (over)' : ''}`;
              })
              .join(', '),
    };
  };
  bands.push(
    concentration(majorIds, majorShare, BANDS.personaMajorMax, 'major ending', BANDS.personaMajorExempt),
    concentration(endingIds, share, BANDS.personaEndingMax, 'minor ending'),
  );
  const rare = endingIds.filter((id) => (share.players[id] ?? 0) < BANDS.minorReachMin);
  bands.push({
    target: `every minor ending reached in >= ${pct(BANDS.minorReachMin)} of runs (player-like, pooled)`,
    pass: players.length === 0 ? null : rare.length === 0,
    actual: rare.length === 0 ? `lowest ${[...endingIds].sort((a, b) => (share.players[a] ?? 0) - (share.players[b] ?? 0)).slice(0, 3).map((id) => `${id} ${pct(share.players[id] ?? 0)}`).join(', ')}` : `below: ${rare.map((id) => `${id} ${pct(share.players[id] ?? 0)}`).join(', ')}`,
  });

  // Probe assertions. Their majors come from content: ignoring heat must end on the damaged side of the
  // axis on scandals held, ignoring hype must never end on the famous side of the axis on hype.
  const sideMajors = (key: string) => {
    const axis = content.endings.axes.find((a) => a.key === key);
    return axis ? content.endings.majors.filter((m) => m.on[axis.id] === axis.sides[1]).map((m) => m.id) : [];
  };
  const collapseMajors = sideMajors('scandalCount');
  const topHypeMajors = sideMajors('hype');
  // With every persona in the batch, a missing probe is a broken instrument: fail. A filtered batch: n/a.
  const fullBatch = PERSONA_IDS.every((p) => personas.includes(p));
  const probeBand = (axis: ProbeAxis, majors: readonly string[], target: string, holds: (x: number) => boolean): BandCheck => {
    const probes = personas.filter((p) => ignores[p].includes(axis));
    if (majors.length === 0) return { target, pass: false, actual: `no major to assert on (no axis on ${axis === 'heat' ? 'scandalCount' : 'hype'})` };
    if (probes.length === 0) return { target, pass: fullBatch ? false : null, actual: `no persona in this batch ignores ${axis}` };
    const x = (p: PersonaId) => majors.reduce((sum, id) => sum + (majorShare[p][id] ?? 0), 0);
    return {
      target,
      pass: probes.every((p) => holds(x(p))),
      actual: probes.map((p) => `${p} ${majors.join('+')} ${pct(x(p))}${holds(x(p)) ? '' : ' (thesis broken)'}`).join(', '),
    };
  };
  bands.push(
    probeBand('heat', collapseMajors, `probes ignoring heat: ${collapseMajors.join(' or ') || 'damaged majors'} > ${pct(BANDS.probeHeatCollapseMin)} of runs`, (x) => x > BANDS.probeHeatCollapseMin),
    probeBand('hype', topHypeMajors, `probes ignoring hype: ${topHypeMajors.join(' or ') || 'famous majors'} < ${pct(BANDS.probeHypeTopMax)} of runs`, (x) => x < BANDS.probeHypeTopMax),
  );
  // Lane probes: each lane must be reachable by a persona that pursues it (docs/design/content-expansion.md §8).
  const laneProbes = personas.filter((p) => seeks[p] !== null);
  const unsought = laneIds.filter((lane) => lane !== laneIds[0] && !laneProbes.some((p) => seeks[p] === lane));
  bands.push({
    target: `lane probes: each ends the year in its own lane in > ${pct(BANDS.laneProbeMin)} of runs`,
    pass: laneProbes.length === 0 ? (fullBatch ? false : null) : laneProbes.every((p) => (laneShare[p][seeks[p] as string] ?? 0) > BANDS.laneProbeMin) && unsought.length === 0,
    actual:
      laneProbes.map((p) => `${p} ${seeks[p]} ${pct(laneShare[p][seeks[p] as string] ?? 0)}`).join(', ') +
      (unsought.length ? `; no probe pursues ${unsought.join(', ')}` : ''),
  });
  // Clogging: dead cards drawn per turn, by act, must rise act by act (lowest first, highest last).
  const rising = (xs: readonly number[]) => xs.every((x, i) => i === 0 || x > (xs[i - 1] as number));
  const clog = (g: Group) => (cascadeByAct[g] ?? []).map((a) => a.drawn);
  const clogPlayers = clog('players');
  const flat = players.filter((p) => !rising(clog(p)));
  bands.push({
    target: 'clogging: dead cards drawn per turn rise act by act, lowest in act 1, highest in the last act (player-like, pooled)',
    pass: players.length === 0 ? null : rising(clogPlayers),
    actual:
      clogPlayers.map((x) => x.toFixed(2)).join(' < ') +
      (flat.length ? `; not rising for ${flat.map((p) => `${p} (${clog(p).map((x) => x.toFixed(2)).join('/')})`).join(', ')}` : '; rising for every player-like persona'),
  });

  const med = scandalsHeld.players.median;
  bands.push({
    target: `scandals held at run end: median ${BANDS.scandalMedian[0]}-${BANDS.scandalMedian[1]} (player-like, pooled)`,
    pass: players.length === 0 ? null : med >= BANDS.scandalMedian[0] && med <= BANDS.scandalMedian[1],
    actual: `median ${med}; ` + players.map((p) => `${p} ${scandalsHeld[p].median}`).join(', '),
  });
  const gateOut = gates.filter((g) => g.metRate === null || g.metRate < BANDS.gateMet[0] || g.metRate > BANDS.gateMet[1]);
  bands.push({
    target: `gate difficulty: met% ${pct(BANDS.gateMet[0])}-${pct(BANDS.gateMet[1])} per gate (requirement satisfied when offered, player-like, pooled)`,
    pass: players.length === 0 ? null : gateOut.length === 0,
    actual: gateOut.length === 0 ? 'all in band' : `out of band: ${gateOut.map((g) => `${g.id} ${pct(g.metRate)}`).join(', ')}`,
  });
  const cardsOut = cards.filter((c) => c.kind !== 'scandal' && (c.playRate === null || c.playRate <= BANDS.cardPlayRate));
  bands.push({
    target: `every playable card play rate > ${pct(BANDS.cardPlayRate)} (played/drawn, player-like, pooled)`,
    pass: players.length === 0 ? null : cardsOut.length === 0,
    actual: cardsOut.length === 0 ? 'all above' : `at or below: ${cardsOut.map((c) => `${c.id} ${pct(c.playRate)}`).join(', ')}`,
  });
  bands.push({
    target: `minmaxer vs random endings significantly different (p < ${BANDS.skillP}, TVD >= ${BANDS.skillTvd})`,
    pass: skill === null ? null : skill.p < BANDS.skillP && skill.tvd >= BANDS.skillTvd,
    actual: skill === null ? 'needs both personas' : `${fmtP(skill.p)}, TVD = ${skill.tvd.toFixed(2)}`,
  });
  bands.push({ target: 'soft-locks: 0', pass: softLocks.length === 0, actual: String(softLocks.length) });
  bands.push({ target: 'crashes: 0', pass: crashes.length === 0, actual: String(crashes.length) });

  // Probes as diagnostics: the same aggregates with every persona counted, for comparison only.
  const allScandals = records.filter((r) => r.crash === null).map((r) => r.scandalsAtEnd);
  const allPlayRates = cards
    .filter((c) => c.kind !== 'scandal')
    .map((c) => ({ id: c.id, rate: ratio(count(healthy, 'plays', c.id), count(healthy, 'draws', c.id)) }))
    .sort((a, b) => (a.rate ?? 0) - (b.rate ?? 0));
  const diagnostics = [
    { label: 'major distribution (player-like, pooled)', value: majorIds.map((id) => `${id} ${pct(majorShare.players[id] ?? 0)}`).join(', ') },
    { label: 'minor distribution (player-like, pooled)', value: endingIds.map((id) => `${id} ${pct(share.players[id] ?? 0)}`).join(', ') },
    { label: 'lane at year end (player-like, pooled)', value: laneIds.map((id) => `${id} ${pct(laneShare.players[id] ?? 0)}`).join(', ') },
    { label: 'gate pass% (passed when chosen, player-like, pooled)', value: gates.map((g) => `${g.id} ${pct(g.passRate)}`).join(', ') },
    { label: 'scandals held at run end, all personas (probes included)', value: allScandals.length ? `median ${median(allScandals)}` : 'n/a' },
    {
      label: 'gate met%, all personas (probes included)',
      value: gates
        .map((g) => {
          const checks = healthy.flatMap((r) => r.gateChecks).filter((c) => c.gateId === g.id);
          return `${g.id} ${pct(ratio(checks.filter((c) => c.met).length, checks.length))}`;
        })
        .join(', '),
    },
    { label: 'lowest card play rate, all personas (probes included)', value: allPlayRates[0] ? `${allPlayRates[0].id} ${pct(allPlayRates[0].rate)}` : 'n/a' },
  ];

  return {
    meta: {
      seed: batch.seed,
      manager: batch.manager,
      runsPerPersona: batch.runsPerPersona,
      personas,
      totalRuns: records.length,
      seconds: batch.ms / 1000,
      acts: content.rules.acts,
      turnsPerAct: content.rules.turnsPerAct,
      ignores,
      seeks,
      collapseMajors,
      topHypeMajors,
      comebackLimit: personas.includes('comeback') ? COMEBACK_SWITCH_AT : null,
    },
    health: { crashes, softLocks, replay: batch.replay },
    endings: { ids: endingIds, majorOf: Object.fromEntries(content.endings.minors.map((m) => [m.id, m.major])), share },
    majors: { ids: majorIds, share: majorShare },
    lanes: { ids: laneIds, share: laneShare },
    scandalsHeld,
    crystalTurns,
    scandalKinds,
    blame,
    cascadeByAct,
    gates,
    flagsHeld,
    flagSources,
    draft,
    cards,
    runLength,
    curves,
    skill,
    bands,
    diagnostics,
  };
}

/** "p = 0.004", "p = 3.1e-5", "p < 1e-12". */
function fmtP(p: number): string {
  return p < 1e-12 ? 'p < 1e-12' : `p = ${p < 0.001 ? p.toExponential(1) : p.toFixed(3)}`;
}

// ---------------------------------------------------------------------------
// Console

function table(header: readonly string[], rows: readonly (readonly string[])[], indent = '  '): string {
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length)));
  const line = (cells: readonly string[]) =>
    indent + cells.map((c, i) => (i === 0 ? c.padEnd(widths[i] ?? 0) : c.padStart(widths[i] ?? 0))).join('  ');
  return [line(header), ...rows.map(line)].join('\n');
}

const pc = (x: number | null) => (x === null ? '-' : `${(x * 100).toFixed(1)}%`);
const n1 = (x: number) => (Number.isFinite(x) ? x.toFixed(1) : '-');
const n0 = (x: number) => (Number.isFinite(x) ? x.toFixed(0) : '-');

export function formatReport(r: Report): string {
  // Player-like personas first, control probes last, so the two classes read separately.
  const isProbe = (p: PersonaId) => (r.meta.ignores[p] ?? []).length > 0 || (r.meta.seeks[p] ?? null) !== null;
  const P = [...r.meta.personas.filter((p) => !isProbe(p)), ...r.meta.personas.filter(isProbe)];
  const out: string[] = [];
  const h = (title: string) => out.push('', title);

  out.push(
    `SIM  seed=${r.meta.seed}${r.meta.manager ? `  manager=${r.meta.manager}` : ''}  ${r.meta.runsPerPersona} runs x ${P.length} personas = ${r.meta.totalRuns} runs  (${r.meta.seconds.toFixed(1)}s)`,
    `crashes: ${r.health.crashes.length}   soft-locks: ${r.health.softLocks.length} (limit ${MAX_ACTIONS} actions)   ` +
      `replay check: ${r.health.replay.checked - r.health.replay.mismatches.length}/${r.health.replay.checked} identical`,
  );
  const probes = P.filter(isProbe);
  out.push(
    `persona classes: player-like ${P.filter((p) => !isProbe(p)).join(', ') || '-'}; ` +
      `probes ${probes.map((p) => `${p} (${r.meta.seeks[p] ? `seeks ${r.meta.seeks[p]}` : `ignores ${(r.meta.ignores[p] ?? []).join(' and ')}`})`).join(', ') || '-'}`,
    `'players' columns pool the player-like personas: the band population. Probes appear only in their own columns.`,
  );
  if (r.meta.comebackLimit !== null) {
    out.push(`comeback switches from spike to clean-up at ${r.meta.comebackLimit} scandals held (fixed persona parameter)`);
  }
  for (const c of r.health.crashes.slice(0, 10)) out.push(`  CRASH  --replay=${c.seed} --persona=${c.persona}  ${c.error}`);
  for (const s of r.health.softLocks.slice(0, 10)) out.push(`  SOFT-LOCK  --replay=${s.seed} --persona=${s.persona}  ${s.reason}`);

  const G = [...P, 'players' as const];
  h('MAJOR ENDINGS');
  out.push(table(['major', ...P, 'players'], r.majors.ids.map((id) => [id, ...G.map((g) => pc(r.majors.share[g][id] ?? 0))])));
  h('MINOR ENDINGS  (grouped by major)');
  out.push(table(['minor', ...P, 'players'], r.endings.ids.map((id) => [`${r.endings.majorOf[id] ?? '?'} / ${id}`, ...G.map((g) => pc(r.endings.share[g][id] ?? 0))])));
  h('LANE AT YEAR END  (the most-played career lane; ties to the first)');
  out.push(table(['lane', ...P, 'players'], r.lanes.ids.map((id) => [id, ...G.map((g) => pc(r.lanes.share[g][id] ?? 0))])));

  h('SCANDALS  (held at run end; crystallised per run; turns per run that crystallised 2+ at once; most in one turn)');
  out.push(
    table(
      ['group', 'median', 'mean', 'p90', 'max', 'crystallised', 'by tag', '2+ turns', 'max/turn'],
      [...P, 'players' as const].map((g) => {
        const s = r.scandalsHeld[g];
        return [g, n1(s.median), n1(s.mean), n1(s.p90), n0(s.max), n1(s.crystallised), pc(s.byTag), n1(s.multiTurns), n0(s.maxInTurn)];
      }),
    ),
  );

  h('CRYSTALLISATION PER TURN  (share of turns that ended with this many scandals crystallised)');
  out.push(
    table(
      ['group', '0', '1', '2', '3+'],
      [...P, 'players' as const].map((g) => [g, ...r.crystalTurns[g].map((x) => pc(x))]),
    ),
  );

  h('SCANDAL KINDS  (crystallised per run / share of runs it crystallised in)');
  out.push(
    table(
      ['scandal', 'kind', ...P, 'players'],
      r.scandalKinds.map((s) => [
        s.id,
        s.kinds.join('+') || '-',
        ...[...P, 'players' as const].map((g) => {
          const x = s.byGroup[g];
          return x ? `${n1(x.perRun)} / ${pc(x.runs)}` : '-';
        }),
      ]),
    ),
  );
  out.push(`  blamed on (share of all crystallised scandals): ${r.blame.map((b) => `${b.cause} ${pc(b.share)}`).join(', ')}`);

  h('CASCADE BY ACT  (per turn: mean effective threshold / scandals crystallised / share of turns with 2+ / scandal cards drawn (choke); peak = act crystallising most per turn)');
  out.push(
    table(
      ['group', ...Array.from({ length: r.meta.acts }, (_, i) => `act ${i + 1}`), 'peak'],
      [...P, 'players' as const].map((g) => {
        const byAct = r.cascadeByAct[g] ?? [];
        const peak = byAct.reduce((best, a, i) => (a.perTurn > (byAct[best]?.perTurn ?? -1) ? i : best), 0);
        const quiet = byAct.every((a) => a.perTurn === 0);
        return [g, ...byAct.map((a) => `${a.threshold.toFixed(1)} / ${a.perTurn.toFixed(2)} / ${pc(a.multi)} / ${a.drawn.toFixed(2)}`), quiet ? '-' : `act ${peak + 1}`];
      }),
    ),
  );

  h('CLOGGING BY ACT  (dead cards — scandals — drawn per turn, averaged over each act; the band wants them rising act by act)');
  out.push(
    table(
      ['group', ...Array.from({ length: r.meta.acts }, (_, i) => `act ${i + 1}`), 'rising'],
      [...P, 'players' as const].map((g) => {
        const xs = (r.cascadeByAct[g] ?? []).map((a) => a.drawn);
        const up = xs.every((x, i) => i === 0 || x > (xs[i - 1] as number));
        const none = xs.every((x) => x === 0);
        return [g, ...xs.map((x) => x.toFixed(2)), none ? '-' : up ? 'yes' : 'no'];
      }),
    ),
  );

  h('GATES  (player-like, pooled: met% = requirement held when offered; pick% = chosen when offered; pass% = passed when chosen)');
  out.push(
    table(
      ['gate', 'act', 'offered', 'met%', 'pick%', 'pass%', ...P.map((p) => `${p} pass%`)],
      r.gates.map((g) => [
        g.id,
        String(g.act),
        String(g.offered),
        pc(g.metRate),
        pc(g.pickRate),
        pc(g.passRate),
        ...P.map((p) => {
          const b = g.byPersona[p];
          return b && b.chosen > 0 ? `${pc(b.passRate)} (${b.chosen})` : '-';
        }),
      ]),
    ),
  );

  h('FLAGS HELD AT RUN END  (share of runs)');
  out.push(
    table(
      ['flag', ...P, 'players'],
      Object.keys(r.flagsHeld).map((f) => [f, ...[...P, 'players' as const].map((g) => pc(r.flagsHeld[f]?.[g] ?? 0))]),
    ),
  );

  h('FLAG SOURCES  (of the runs that set the flag: share set by each card or gate; runs setting it in brackets)');
  out.push(
    table(
      ['flag', 'source', ...P, 'players'],
      Object.entries(r.flagSources).flatMap(([flag, byGroup]) => {
        const sources = [...new Set(Object.values(byGroup).flatMap((x) => Object.keys(x.bySource)))].sort();
        return sources.map((src) => [
          flag,
          src,
          ...[...P, 'players' as const].map((g) => {
            const x = byGroup[g];
            return x && x.runs > 0 ? `${pc(x.bySource[src] ?? 0)} (${x.runs})` : '-';
          }),
        ]);
      }),
    ),
  );

  h('DRAFT  (per run: cards acquired, extra picks bought, rerolls, capital spent on them, capital left at the end)');
  out.push(
    table(
      ['persona', 'acquired', 'min', 'max', 'extra picks', 'rerolls', 'capital spent', 'capital at end'],
      P.map((p) => {
        const d = r.draft[p];
        if (!d) return [p, '-', '-', '-', '-', '-', '-', '-'];
        return [p, n1(d.acquired.mean), n0(d.acquired.min), n0(d.acquired.max), n1(d.extraPicks), n1(d.rerolls), n1(d.spend), n1(d.capitalAtEnd)];
      }),
    ),
  );

  h('CAPITAL FLOW  (per run: starting stake + earned = spent on draft extras + removal cards + other cards + lost to scandals/gates + left)');
  out.push(
    table(
      ['persona', 'earned', 'draft', 'removal', 'other cards', 'lost', 'left'],
      P.map((p) => {
        const d = r.draft[p];
        if (!d) return [p, '-', '-', '-', '-', '-', '-'];
        const c = d.capital;
        return [p, n1(c.earned), n1(c.draft), n1(c.removal), n1(c.cards), n1(c.lost), n1(d.capitalAtEnd)];
      }),
    ),
  );

  h('CARDS  (per persona: plays per run / play rate = played / drawn; players = player-like pooled; draft% = taken when offered)');
  out.push(
    table(
      ['card', 'kind', ...P, 'players play%', 'runs played', 'draft%'],
      r.cards.map((c) => [
        c.id,
        c.kind,
        ...P.map((p) => {
          const b = c.byPersona[p];
          if (!b) return '-';
          return c.kind === 'scandal' ? `drawn ${n1(b.drawnPerRun)}` : `${n1(b.playedPerRun)} / ${pc(b.playRate)}`;
        }),
        pc(c.playRate),
        c.kind === 'scandal' ? '-' : pc(c.runsPlayed),
        c.kind === 'scandal' ? '-' : `${pc(c.draftRate)} (${c.offered})`,
      ]),
    ),
  );

  h('RUN LENGTH');
  out.push(
    table(
      ['persona', 'turns', 'actions mean', 'min', 'max', 'cards played'],
      P.map((p) => {
        const l = r.runLength[p];
        if (!l) return [p, '-', '-', '-', '-', '-'];
        const turns = l.turns[0] === l.turns[1] ? String(l.turns[0]) : `${l.turns[0]}-${l.turns[1]}`;
        return [p, turns, n1(l.actions.mean), n0(l.actions.min), n0(l.actions.max), n1(l.cardsPlayedMean)];
      }),
    ),
  );

  const boundaries = Array.from({ length: r.meta.acts - 1 }, (_, i) => `T${(i + 1) * r.meta.turnsPerAct}`).join(', ');
  h(`RESOURCE CURVES  (mean after end-of-turn resolution; act boundaries after ${boundaries})`);
  for (const p of P) {
    const rows = r.curves[p] ?? [];
    out.push(`  ${p}`);
    out.push(
      table(
        ['', ...rows.map((row) => `T${row.turn}`)],
        METRICS.map((m) => [m, ...rows.map((row) => (FINE.includes(m) ? n1(row[m].mean) : n0(row[m].mean)))]),
        '    ',
      ),
    );
  }

  if (r.skill) {
    h('SKILL CHECK  minmaxer vs random ending distribution');
    out.push(`  chi2 = ${r.skill.chi2.toFixed(1)}, df = ${r.skill.df}, ${fmtP(r.skill.p)}, total variation distance = ${r.skill.tvd.toFixed(2)}`);
  }

  h('DIAGNOSTICS  (not bands: they measure the persona mix as much as the game)');
  for (const d of r.diagnostics) out.push(`  ${d.label}: ${d.value}`);

  h('BANDS  (docs/sim.md → Tuning targets)');
  for (const b of r.bands) {
    const mark = b.pass === null ? 'n/a ' : b.pass ? 'PASS' : 'FAIL';
    out.push(`  [${mark}] ${b.target}`, `         ${b.actual}`);
  }
  return out.join('\n');
}
