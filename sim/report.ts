// Aggregate a batch into the §5 report: JSON-able data plus console tables.
// Ids and numbers only; no content display strings.

import { MAX_ACTIONS, type BatchResult, type RunRecord, type TurnSnapshot } from './batch.ts';
import type { PersonaId } from './personas.ts';
import { chiSquare2xK, mean, median, quantile, sum, totalVariation } from './stats.ts';

/** Tuning targets, CLAUDE.md §5. */
export const BANDS = {
  endingMin: 0.1,
  endingMax: 0.45,
  scandalMedian: [2, 5],
  gatePass: [0.4, 0.8],
  /** Play rate = times played / times drawn, pooled over personas. */
  cardPlayRate: 0.02,
  /** "Significantly different" made concrete: chi-square p below this AND total variation distance at least… */
  skillP: 0.01,
  skillTvd: 0.2,
} as const;

const METRICS = ['hype', 'craft', 'capital', 'heat', 'scandals'] as const;
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
  };
  readonly health: {
    readonly crashes: readonly { seed: number; persona: PersonaId; error: string }[];
    readonly softLocks: readonly { seed: number; persona: PersonaId; reason: string }[];
    readonly replay: BatchResult['replay'];
  };
  readonly endings: { readonly ids: readonly string[]; readonly share: Readonly<Record<Group, Readonly<Record<string, number>>>> };
  readonly scandalsHeld: Readonly<Record<Group, { median: number; mean: number; p90: number; max: number }>>;
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
  readonly cards: readonly {
    id: string;
    kind: string;
    playRate: number | null;
    runsPlayed: number;
    byPersona: Readonly<Record<string, { drawnPerRun: number; playedPerRun: number; playRate: number | null }>>;
  }[];
  readonly runLength: Readonly<
    Record<string, { turns: [number, number]; actions: { mean: number; min: number; max: number }; cardsPlayedMean: number }>
  >;
  readonly curves: Readonly<Record<string, readonly ({ turn: number } & Record<Metric, Dist>)[]>>;
  readonly skill: { chi2: number; df: number; p: number; tvd: number } | null;
  readonly bands: readonly BandCheck[];
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
      const xs = rs.filter((r) => r.crash === null).map((r) => r.scandalsAtEnd);
      return [g, { median: median(xs), mean: mean(xs), p90: quantile(xs, 0.9), max: Math.max(...xs) }];
    }),
  ) as Record<Group, { median: number; mean: number; p90: number; max: number }>;

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

  // Cards
  const count = (rs: readonly RunRecord[], field: 'draws' | 'plays', id: string) => sum(rs.map((r) => r[field][id] ?? 0));
  const cards = content.cards.map((card) => ({
    id: card.id,
    kind: card.kind,
    playRate: card.playable === false ? null : ratio(count(healthy, 'plays', card.id), count(healthy, 'draws', card.id)),
    runsPlayed: healthy.filter((r) => (r.plays[card.id] ?? 0) > 0).length / Math.max(1, healthy.length),
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
  bands.push({
    target: `each ending reached >= ${pct(BANDS.endingMin)}, none > ${pct(BANDS.endingMax)} (pooled)`,
    pass: endingIds.every((id) => (pooledShare[id] ?? 0) >= BANDS.endingMin && (pooledShare[id] ?? 0) <= BANDS.endingMax),
    actual: endingIds.map((id) => `${id} ${pct(pooledShare[id] ?? 0)}`).join(', '),
  });
  const med = scandalsHeld.pooled.median;
  bands.push({
    target: `scandals held at run end: median ${BANDS.scandalMedian[0]}-${BANDS.scandalMedian[1]} (pooled)`,
    pass: med >= BANDS.scandalMedian[0] && med <= BANDS.scandalMedian[1],
    actual: `median ${med}; ` + personas.map((p) => `${p} ${scandalsHeld[p].median}`).join(', '),
  });
  const gateOut = gates.filter((g) => g.passRate === null || g.passRate < BANDS.gatePass[0] || g.passRate > BANDS.gatePass[1]);
  bands.push({
    target: `gate pass rate ${pct(BANDS.gatePass[0])}-${pct(BANDS.gatePass[1])} per gate (when chosen, pooled)`,
    pass: gateOut.length === 0,
    actual: gateOut.length === 0 ? 'all in band' : `out of band: ${gateOut.map((g) => `${g.id} ${pct(g.passRate)}`).join(', ')}`,
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

  return {
    meta: {
      seed: batch.seed,
      runsPerPersona: batch.runsPerPersona,
      personas,
      totalRuns: records.length,
      seconds: batch.ms / 1000,
    },
    health: { crashes, softLocks, replay: batch.replay },
    endings: { ids: endingIds, share },
    scandalsHeld,
    gates,
    flagsHeld,
    cards,
    runLength,
    curves,
    skill,
    bands,
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
  const P = r.meta.personas;
  const out: string[] = [];
  const h = (title: string) => out.push('', title);

  out.push(
    `SIM  seed=${r.meta.seed}  ${r.meta.runsPerPersona} runs x ${P.length} personas = ${r.meta.totalRuns} runs  (${r.meta.seconds.toFixed(1)}s)`,
    `crashes: ${r.health.crashes.length}   soft-locks: ${r.health.softLocks.length} (limit ${MAX_ACTIONS} actions)   ` +
      `replay check: ${r.health.replay.checked - r.health.replay.mismatches.length}/${r.health.replay.checked} identical`,
  );
  for (const c of r.health.crashes.slice(0, 10)) out.push(`  CRASH  --replay=${c.seed} --persona=${c.persona}  ${c.error}`);
  for (const s of r.health.softLocks.slice(0, 10)) out.push(`  SOFT-LOCK  --replay=${s.seed} --persona=${s.persona}  ${s.reason}`);

  h('ENDING DISTRIBUTION');
  out.push(table(['ending', ...P, 'pooled'], r.endings.ids.map((id) => [id, ...[...P, 'pooled' as const].map((g) => pc(r.endings.share[g][id] ?? 0))])));

  h('SCANDALS HELD AT RUN END');
  out.push(
    table(
      ['group', 'median', 'mean', 'p90', 'max'],
      [...P, 'pooled' as const].map((g) => {
        const s = r.scandalsHeld[g];
        return [g, n1(s.median), n1(s.mean), n1(s.p90), n0(s.max)];
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

  h('CARDS  (per persona: plays per run / play rate = played / drawn)');
  out.push(
    table(
      ['card', 'kind', ...P, 'pooled play%', 'runs played'],
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

  h('RESOURCE CURVES  (mean after end-of-turn resolution; act boundaries after T4, T8)');
  for (const p of P) {
    const rows = r.curves[p] ?? [];
    out.push(`  ${p}`);
    out.push(
      table(
        ['', ...rows.map((row) => `T${row.turn}`)],
        METRICS.map((m) => [m, ...rows.map((row) => (m === 'scandals' ? n1(row[m].mean) : n0(row[m].mean)))]),
        '    ',
      ),
    );
  }

  if (r.skill) {
    h('SKILL CHECK  minmaxer vs random ending distribution');
    out.push(`  chi2 = ${r.skill.chi2.toFixed(1)}, df = ${r.skill.df}, ${fmtP(r.skill.p)}, total variation distance = ${r.skill.tvd.toFixed(2)}`);
  }

  h('BANDS  (CLAUDE.md §5)');
  for (const b of r.bands) {
    const mark = b.pass === null ? 'n/a ' : b.pass ? 'PASS' : 'FAIL';
    out.push(`  [${mark}] ${b.target}`, `         ${b.actual}`);
  }
  return out.join('\n');
}
