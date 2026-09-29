// Aggregate a batch into the §5 report: JSON-able data plus console tables.
// Ids and numbers only; no content display strings.

import { MAX_ACTIONS, type BatchResult, type RunRecord, type TurnSnapshot } from './batch.ts';
import { COMEBACK_SWITCH_AT, ignoredAxes, PERSONA_IDS, type PersonaId, type ProbeAxis } from './personas.ts';
import { chiSquare2xK, mean, median, quantile, sum, totalVariation } from './stats.ts';

/**
 * Tuning targets, CLAUDE.md §5. Population: every persona, equal runs each on the same seeds.
 * Per-persona bands are checked on each persona separately; pooled bands weight personas equally.
 * Two persona classes (see ignoredAxes): player-like personas carry the concentration band; control
 * probes carry assertions that fail if the design thesis breaks.
 */
export const BANDS = {
  /** Per player-like persona: no single ending may take more than this share of its runs. */
  personaEndingMax: 0.7,
  /** A probe ignoring heat must reach the collapse ending (the one with a scandal floor) in more than this share. */
  probeHeatCollapseMin: 0.8,
  /** A probe ignoring hype must reach the top-hype ending (the one demanding the most hype) in less than this share. */
  probeHypeTopMax: 0.05,
  /** Pooled median scandals held at run end. */
  scandalMedian: [2, 5],
  /** Pooled per gate: requirement already satisfied when offered. */
  gateMet: [0.35, 0.65],
  /** Pooled play rate = times played / times drawn. */
  cardPlayRate: 0.02,
  /** "Significantly different" made concrete: chi-square p below this AND total variation distance at least… */
  skillP: 0.01,
  skillTvd: 0.2,
} as const;

const METRICS = ['hype', 'craft', 'capital', 'heat', 'scandals', 'threshold', 'crystallised', 'scandalsDrawn'] as const;
/** Metrics printed with one decimal in the curve tables. */
const FINE: readonly string[] = ['scandals', 'threshold', 'crystallised', 'scandalsDrawn'];
type Metric = (typeof METRICS)[number];
type Group = PersonaId | 'pooled';

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
    readonly runsPerPersona: number;
    readonly personas: readonly PersonaId[];
    readonly totalRuns: number;
    readonly seconds: number;
    readonly acts: number;
    readonly turnsPerAct: number;
    /** Per persona: the axes it ignores entirely. Empty = player-like; any = control probe. */
    readonly ignores: Readonly<Record<string, readonly ProbeAxis[]>>;
    /** Endings the probe assertions name, derived from content. */
    readonly collapseEnding: string | null;
    readonly topHypeEnding: string | null;
    /** Scandals held at which comeback switches from spiking to cleaning up (a fixed persona parameter). */
    readonly comebackLimit: number | null;
  };
  readonly health: {
    readonly crashes: readonly { seed: number; persona: PersonaId; error: string }[];
    readonly softLocks: readonly { seed: number; persona: PersonaId; reason: string }[];
    readonly replay: BatchResult['replay'];
  };
  readonly endings: { readonly ids: readonly string[]; readonly share: Readonly<Record<Group, Readonly<Record<string, number>>>> };
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
    /** Draft offers containing the card, times it was taken, and taken / offered (pooled). */
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
  const byPersona = (p: PersonaId) => records.filter((r) => r.persona === p);
  const groups: [Group, readonly RunRecord[]][] = [...personas.map((p): [Group, RunRecord[]] => [p, byPersona(p)]), ['pooled', records]];
  const healthy = records.filter((r) => r.crash === null && r.softLock === null);

  // Endings
  const endingIds = content.endings.map((e) => e.id);
  const share = Object.fromEntries(
    groups.map(([g, rs]) => {
      const done = rs.filter((r) => r.endingId !== null);
      return [g, Object.fromEntries(endingIds.map((id) => [id, done.filter((r) => r.endingId === id).length / Math.max(1, done.length)]))];
    }),
  ) as Record<Group, Record<string, number>>;

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
  for (const r of records) for (const [cause, n] of Object.entries(r.blamedOn)) blameCounts[cause] = (blameCounts[cause] ?? 0) + n;
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

  // Gates
  const gates = content.gates.map((gate) => {
    const offeredIn = (rs: readonly RunRecord[]) => rs.flatMap((r) => r.gates).filter((g) => g.offered.includes(gate.id));
    const chosenIn = (rs: readonly RunRecord[]) => rs.flatMap((r) => r.gates).filter((g) => g.gateId === gate.id);
    const offered = offeredIn(healthy).length;
    const chosen = chosenIn(healthy);
    const passed = chosen.filter((g) => g.passed).length;
    const checks = healthy.flatMap((r) => r.gateChecks).filter((c) => c.gateId === gate.id);
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
  const cards = content.cards.map((card) => ({
    id: card.id,
    kind: card.kind,
    playRate: card.playable === false ? null : ratio(count(healthy, 'plays', card.id), count(healthy, 'draws', card.id)),
    runsPlayed: healthy.filter((r) => (r.plays[card.id] ?? 0) > 0).length / Math.max(1, healthy.length),
    offered: count(healthy, 'offered', card.id),
    drafted: count(healthy, 'drafted', card.id),
    draftRate: ratio(count(healthy, 'drafted', card.id), count(healthy, 'offered', card.id)),
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
  const pooledShare = share.pooled;
  const bands: BandCheck[] = [];
  const topEnding = (p: PersonaId) =>
    endingIds.map((id) => ({ id, share: share[p][id] ?? 0 })).reduce((a, b) => (b.share > a.share ? b : a));
  const ignores = Object.fromEntries(personas.map((p) => [p, ignoredAxes(p)])) as Record<PersonaId, readonly ProbeAxis[]>;
  const players = personas.filter((p) => ignores[p].length === 0);
  const concentrated = players.filter((p) => topEnding(p).share > BANDS.personaEndingMax);
  bands.push({
    target: `player-like personas: no single ending > ${pct(BANDS.personaEndingMax)} of its runs`,
    pass: players.length === 0 ? null : concentrated.length === 0,
    actual:
      players.length === 0
        ? 'no player-like persona in this batch'
        : players
            .map((p) => {
              const t = topEnding(p);
              return `${p} ${t.id} ${pct(t.share)}${t.share > BANDS.personaEndingMax ? ' (over)' : ''}`;
            })
            .join(', '),
  });

  // Probe assertions. Their endings come from content: the collapse ending sets a scandal floor
  // (highest priority first); the top-hype ending demands the most hype among the rest — a collapse
  // ending with a high hype floor must never pass for the reward.
  const collapseEnding =
    [...content.endings].sort((a, b) => b.priority - a.priority).find((e) => e.conditions?.scandalCount?.min !== undefined)?.id ?? null;
  const topHypeEnding =
    content.endings
      .filter((e) => e.conditions?.hype?.min !== undefined && e.conditions.scandalCount?.min === undefined)
      .reduce<{ id: string; min: number } | null>((best, e) => {
        const min = e.conditions?.hype?.min as number;
        return best === null || min > best.min ? { id: e.id, min } : best;
      }, null)?.id ?? null;
  // With every persona in the batch, a missing probe is a broken instrument: fail. A filtered batch: n/a.
  const fullBatch = PERSONA_IDS.every((p) => personas.includes(p));
  const probeBand = (axis: ProbeAxis, ending: string | null, target: string, holds: (x: number) => boolean): BandCheck => {
    const probes = personas.filter((p) => ignores[p].includes(axis));
    if (ending === null) return { target, pass: false, actual: `no ending to assert on (${axis === 'heat' ? 'none sets a scandal floor' : 'none demands hype'})` };
    if (probes.length === 0) return { target, pass: fullBatch ? false : null, actual: `no persona in this batch ignores ${axis}` };
    const x = (p: PersonaId) => share[p][ending] ?? 0;
    return {
      target,
      pass: probes.every((p) => holds(x(p))),
      actual: probes.map((p) => `${p} ${ending} ${pct(x(p))}${holds(x(p)) ? '' : ' (thesis broken)'}`).join(', '),
    };
  };
  bands.push(
    probeBand(
      'heat',
      collapseEnding,
      `probes ignoring heat: ${collapseEnding ?? 'collapse ending'} > ${pct(BANDS.probeHeatCollapseMin)} of runs`,
      (x) => x > BANDS.probeHeatCollapseMin,
    ),
    probeBand(
      'hype',
      topHypeEnding,
      `probes ignoring hype: ${topHypeEnding ?? 'top-hype ending'} < ${pct(BANDS.probeHypeTopMax)} of runs`,
      (x) => x < BANDS.probeHypeTopMax,
    ),
  );
  const med = scandalsHeld.pooled.median;
  bands.push({
    target: `scandals held at run end: median ${BANDS.scandalMedian[0]}-${BANDS.scandalMedian[1]} (pooled)`,
    pass: med >= BANDS.scandalMedian[0] && med <= BANDS.scandalMedian[1],
    actual: `median ${med}; ` + personas.map((p) => `${p} ${scandalsHeld[p].median}`).join(', '),
  });
  const gateOut = gates.filter((g) => g.metRate === null || g.metRate < BANDS.gateMet[0] || g.metRate > BANDS.gateMet[1]);
  bands.push({
    target: `gate difficulty: met% ${pct(BANDS.gateMet[0])}-${pct(BANDS.gateMet[1])} per gate (requirement satisfied when offered, pooled)`,
    pass: gateOut.length === 0,
    actual: gateOut.length === 0 ? 'all in band' : `out of band: ${gateOut.map((g) => `${g.id} ${pct(g.metRate)}`).join(', ')}`,
  });
  const cardsOut = cards.filter((c) => c.kind !== 'scandal' && (c.playRate === null || c.playRate <= BANDS.cardPlayRate));
  bands.push({
    target: `every playable card play rate > ${pct(BANDS.cardPlayRate)} (played/drawn, pooled)`,
    pass: cardsOut.length === 0,
    actual: cardsOut.length === 0 ? 'all above' : `at or below: ${cardsOut.map((c) => `${c.id} ${pct(c.playRate)}`).join(', ')}`,
  });
  bands.push({
    target: `minmaxer vs random endings significantly different (p < ${BANDS.skillP}, TVD >= ${BANDS.skillTvd})`,
    pass: skill === null ? null : skill.p < BANDS.skillP && skill.tvd >= BANDS.skillTvd,
    actual: skill === null ? 'needs both personas' : `${fmtP(skill.p)}, TVD = ${skill.tvd.toFixed(2)}`,
  });
  bands.push({ target: 'soft-locks: 0', pass: softLocks.length === 0, actual: String(softLocks.length) });
  bands.push({ target: 'crashes: 0', pass: crashes.length === 0, actual: String(crashes.length) });

  const playerScandals = records.filter((r) => r.crash === null && players.includes(r.persona)).map((r) => r.scandalsAtEnd);
  const diagnostics = [
    { label: 'ending distribution (pooled)', value: endingIds.map((id) => `${id} ${pct(pooledShare[id] ?? 0)}`).join(', ') },
    { label: 'scandals held at run end, player-like personas only', value: playerScandals.length ? `median ${median(playerScandals)}` : 'n/a' },
    {
      label: 'gate met%, player-like personas only',
      value: gates
        .map((g) => {
          const checks = healthy.filter((r) => players.includes(r.persona)).flatMap((r) => r.gateChecks).filter((c) => c.gateId === g.id);
          return `${g.id} ${pct(ratio(checks.filter((c) => c.met).length, checks.length))}`;
        })
        .join(', '),
    },
    { label: 'gate pass% (passed when chosen, pooled)', value: gates.map((g) => `${g.id} ${pct(g.passRate)}`).join(', ') },
  ];

  return {
    meta: {
      seed: batch.seed,
      runsPerPersona: batch.runsPerPersona,
      personas,
      totalRuns: records.length,
      seconds: batch.ms / 1000,
      acts: content.rules.acts,
      turnsPerAct: content.rules.turnsPerAct,
      ignores,
      collapseEnding,
      topHypeEnding,
      comebackLimit: personas.includes('comeback') ? COMEBACK_SWITCH_AT : null,
    },
    health: { crashes, softLocks, replay: batch.replay },
    endings: { ids: endingIds, share },
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
  const isProbe = (p: PersonaId) => (r.meta.ignores[p] ?? []).length > 0;
  const P = [...r.meta.personas.filter((p) => !isProbe(p)), ...r.meta.personas.filter(isProbe)];
  const out: string[] = [];
  const h = (title: string) => out.push('', title);

  out.push(
    `SIM  seed=${r.meta.seed}  ${r.meta.runsPerPersona} runs x ${P.length} personas = ${r.meta.totalRuns} runs  (${r.meta.seconds.toFixed(1)}s)`,
    `crashes: ${r.health.crashes.length}   soft-locks: ${r.health.softLocks.length} (limit ${MAX_ACTIONS} actions)   ` +
      `replay check: ${r.health.replay.checked - r.health.replay.mismatches.length}/${r.health.replay.checked} identical`,
  );
  const probes = P.filter(isProbe);
  out.push(
    `persona classes: player-like ${P.filter((p) => !isProbe(p)).join(', ') || '-'}; ` +
      `probes ${probes.map((p) => `${p} (ignores ${(r.meta.ignores[p] ?? []).join(' and ')})`).join(', ') || '-'}`,
  );
  if (r.meta.comebackLimit !== null) {
    out.push(`comeback switches from spike to clean-up at ${r.meta.comebackLimit} scandals held (fixed persona parameter)`);
  }
  for (const c of r.health.crashes.slice(0, 10)) out.push(`  CRASH  --replay=${c.seed} --persona=${c.persona}  ${c.error}`);
  for (const s of r.health.softLocks.slice(0, 10)) out.push(`  SOFT-LOCK  --replay=${s.seed} --persona=${s.persona}  ${s.reason}`);

  h('ENDING DISTRIBUTION');
  out.push(table(['ending', ...P, 'pooled'], r.endings.ids.map((id) => [id, ...[...P, 'pooled' as const].map((g) => pc(r.endings.share[g][id] ?? 0))])));

  h('SCANDALS  (held at run end; crystallised per run; turns per run that crystallised 2+ at once; most in one turn)');
  out.push(
    table(
      ['group', 'median', 'mean', 'p90', 'max', 'crystallised', 'by tag', '2+ turns', 'max/turn'],
      [...P, 'pooled' as const].map((g) => {
        const s = r.scandalsHeld[g];
        return [g, n1(s.median), n1(s.mean), n1(s.p90), n0(s.max), n1(s.crystallised), pc(s.byTag), n1(s.multiTurns), n0(s.maxInTurn)];
      }),
    ),
  );

  h('CRYSTALLISATION PER TURN  (share of turns that ended with this many scandals crystallised)');
  out.push(
    table(
      ['group', '0', '1', '2', '3+'],
      [...P, 'pooled' as const].map((g) => [g, ...r.crystalTurns[g].map((x) => pc(x))]),
    ),
  );

  h('SCANDAL KINDS  (crystallised per run / share of runs it crystallised in)');
  out.push(
    table(
      ['scandal', 'kind', ...P, 'pooled'],
      r.scandalKinds.map((s) => [
        s.id,
        s.kinds.join('+') || '-',
        ...[...P, 'pooled' as const].map((g) => {
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
      [...P, 'pooled' as const].map((g) => {
        const byAct = r.cascadeByAct[g] ?? [];
        const peak = byAct.reduce((best, a, i) => (a.perTurn > (byAct[best]?.perTurn ?? -1) ? i : best), 0);
        const quiet = byAct.every((a) => a.perTurn === 0);
        return [g, ...byAct.map((a) => `${a.threshold.toFixed(1)} / ${a.perTurn.toFixed(2)} / ${pc(a.multi)} / ${a.drawn.toFixed(2)}`), quiet ? '-' : `act ${peak + 1}`];
      }),
    ),
  );

  h('GATES  (met% = requirement held when offered; pick% = chosen when offered; pass% = passed when chosen)');
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
      ['flag', ...P, 'pooled'],
      Object.keys(r.flagsHeld).map((f) => [f, ...[...P, 'pooled' as const].map((g) => pc(r.flagsHeld[f]?.[g] ?? 0))]),
    ),
  );

  h('FLAG SOURCES  (of the runs that set the flag: share set by each card or gate; runs setting it in brackets)');
  out.push(
    table(
      ['flag', 'source', ...P, 'pooled'],
      Object.entries(r.flagSources).flatMap(([flag, byGroup]) => {
        const sources = [...new Set(Object.values(byGroup).flatMap((x) => Object.keys(x.bySource)))].sort();
        return sources.map((src) => [
          flag,
          src,
          ...[...P, 'pooled' as const].map((g) => {
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

  h('CARDS  (per persona: plays per run / play rate = played / drawn; draft% = taken when offered)');
  out.push(
    table(
      ['card', 'kind', ...P, 'pooled play%', 'runs played', 'draft%'],
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

  h('BANDS  (CLAUDE.md §5)');
  for (const b of r.bands) {
    const mark = b.pass === null ? 'n/a ' : b.pass ? 'PASS' : 'FAIL';
    out.push(`  [${mark}] ${b.target}`, `         ${b.actual}`);
  }
  return out.join('\n');
}
