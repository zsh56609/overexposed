// Round R11b, Part D: the configurations side by side.
//
//   for each configuration: node sim/survey/survey.ts --events=<E0..E5> --doors=<D0..D2> --out=sim/out/r11b/<id>
//   node sim/survey/configs.ts --run      runs all eight (about 2 minutes each), then compares
//   node sim/survey/configs.ts            reads those results (sim/out/r11b/<id>/survey.json) and writes sim/survey/results-r11b/comparison.md and .json
//
// Configurations: E0..E5 on the doors as they are (D0); D1 and D2 on E0 (sim/options/configs.ts). Everything is read from
// the survey's own integer counts; two runs of the same inputs write the same bytes. Ids and numbers only.

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../../validate/load.ts';
import { DOOR_CONFIGS, EVENT_CONFIGS } from '../options/configs.ts';

/** The survey's raw counts per configuration (sim/out is not committed: ~1.7 MB each, rebuilt by the commands above). */
const RAW = join(ROOT, 'sim/out/r11b');
/** What is committed: the comparison. */
const DIR = join(ROOT, 'sim/survey/results-r11b');
const YEARS = 5;
const IDS = ['E0', 'E1', 'E2', 'E3', 'E4', 'E5', 'D1', 'D2'] as const;
const PLAYER_LIKE = ['minmaxer', 'random', 'dealseeker', 'comeback', 'artisan', 'mixed'];
const MAJOR_FLAG = 3; // points

type Counts = Record<string, number>;
interface MonthExtras { n: number; evHist: number[]; drawn: number; regSum: number; regClass: Counts; regLane: Counts; potSum: number; potClass: Counts; potLane: Counts }
interface Cell {
  cell: { id: string; strategy: string; manager: string };
  sequences: number;
  types: Record<string, { shown: number[]; repeat: number[]; union: number[]; hist: Record<string, number[]> }>;
  slots: Record<string, { n: number; empty: number; how: Counts; pool0: Counts; pool1: Counts; memoryEmptied: number }>;
  context: Record<string, number[]>;
  extras: { years: number; final: Counts; gates: Record<string, { offered: number; taken: number; passed: number }>; adj: Record<string, { pairs: number; same: number }>; months: Record<string, MonthExtras> };
}
interface Run { id: string; cells: Record<string, Cell>; eventMonths: number[]; config: { events: string; doors: string; memoryDepth: number; eventClass: Record<string, { cls: string; lane: string }> }; pools: Record<string, Record<string, string[]>> }

const load = (id: string): Run => {
  const j = JSON.parse(readFileSync(join(RAW, id, 'survey.json'), 'utf8')) as { results: Record<string, Cell>; eventMonths: number[]; config: Run['config']; pools: Run['pools'] };
  return { id, cells: j.results, eventMonths: j.eventMonths, config: j.config, pools: j.pools };
};

const pct = (x: number, d = 1) => `${(100 * x).toFixed(d)}%`;
const pts = (x: number) => `${x >= 0 ? '+' : ''}${(100 * x).toFixed(1)}`;
const f2 = (x: number) => x.toFixed(2);
const d2 = (x: number) => `${x >= 0 ? '+' : ''}${x.toFixed(2)}`;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const table = (head: string[], rows: (string | number)[][]) => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');

/** Share of years in which an item is seen: Σ n·hist[n] / (5 N). */
function share(c: Cell, type: string, id: string): number {
  const h = c.types[type]?.hist[id] ?? [];
  return h.reduce((a, v, n) => a + n * v, 0) / (YEARS * c.sequences);
}
const perYear = (c: Cell, name: string): number => sum(c.context[name] ?? []) / (YEARS * c.sequences);
const awardsPerYear = (c: Cell): number => sum(c.types.award?.shown ?? []) / (YEARS * c.sequences);
const finalMean = (c: Cell, r: string): number => (c.extras.final[r] ?? 0) / c.extras.years;
const doorPass = (c: Cell): number => {
  const g = Object.values(c.extras.gates);
  return sum(g.map((x) => x.passed)) / Math.max(1, sum(g.map((x) => x.taken)));
};
const MAJORS = ['breakthrough', 'long_game', 'overexposed', 'hard_way'];

/** The mixed player's two cells added. */
const mixed = (r: Run): Cell[] => Object.values(r.cells).filter((c) => c.cell.strategy === 'mixed');

function repeatRate(type: string, cells: Cell[], k: number): number {
  const shown = sum(cells.map((c) => c.types[type]?.shown[k] ?? 0));
  return shown === 0 ? 0 : sum(cells.map((c) => c.types[type]?.repeat[k] ?? 0)) / shown;
}
const distinct = (cells: Cell[], type: string, k = 4): number => sum(cells.map((c) => c.types[type]?.union[k] ?? 0)) / sum(cells.map((c) => c.sequences));
const adjRate = (cells: Cell[], type: string): number => sum(cells.map((c) => c.extras.adj[type]?.same ?? 0)) / Math.max(1, sum(cells.map((c) => c.extras.adj[type]?.pairs ?? 0)));

function slotStats(cells: Cell[], key: string) {
  const s = cells.map((c) => c.slots[key]).filter((x): x is NonNullable<typeof x> => x !== undefined);
  const n = sum(s.map((x) => x.n));
  const cand = (h: Counts) => Object.entries(h).reduce((a, [k, v]) => a + Number(k) * v, 0);
  return { n, mean: n === 0 ? 0 : sum(s.map((x) => cand(x.pool0))) / n, meanAfter: n === 0 ? 0 : sum(s.map((x) => cand(x.pool1))) / n, empty: n === 0 ? 0 : sum(s.map((x) => x.empty)) / n, fell: n === 0 ? 0 : sum(s.map((x) => x.memoryEmptied)) / n, follow: n === 0 ? 0 : sum(s.map((x) => x.how.followUp ?? 0)) / n, first: n === 0 ? 0 : sum(s.map((x) => x.how.first ?? 0)) / n };
}

export function compare(): { md: string; json: unknown } {
  const runs = Object.fromEntries(IDS.map((id) => [id, load(id)])) as Record<(typeof IDS)[number], Run>;
  const base = runs.E0;
  const out: string[] = [];
  const h = (t: string) => out.push(`\n## ${t}\n`);
  const summary: Record<string, Record<string, number | string>> = {};

  for (const id of IDS) {
    const r = runs[id];
    const mx = mixed(r);
    const seqs = sum(mx.map((c) => c.sequences));
    const eventsPerYear = sum(mx.map((c) => sum(c.context.events ?? []))) / (YEARS * seqs);
    const months = r.eventMonths;
    // the largest shift against E0 (all cells; player-like cells)
    let maxMajor = 0, maxMajorCell = '', maxMajorId = '', maxPlayer = 0, maxMinor = 0, maxMinorCell = '', maxMinorId = '';
    let over = 0;
    for (const [cellId, c] of Object.entries(r.cells)) {
      const b = base.cells[cellId] as Cell;
      for (const m of MAJORS) {
        const delta = Math.abs(share(c, 'ending_major', m) - share(b, 'ending_major', m));
        if (delta > maxMajor) { maxMajor = delta; maxMajorCell = cellId; maxMajorId = m; }
        if (PLAYER_LIKE.includes(c.cell.strategy) && delta > maxPlayer) maxPlayer = delta;
        if (delta > MAJOR_FLAG / 100) over++;
      }
      for (const m of r.pools.ending_minor?.['*'] ?? []) {
        const delta = Math.abs(share(c, 'ending_minor', m) - share(b, 'ending_minor', m));
        if (delta > maxMinor) { maxMinor = delta; maxMinorCell = cellId; maxMinorId = m; }
      }
    }
    summary[id] = {
      events: r.config.events, doors: r.config.doors, months: months.join(','), depth: r.config.memoryDepth,
      eventsPerYear, eventRepeatY2: repeatRate('event', mx, 1), eventRepeatY3: repeatRate('event', mx, 2), eventRepeatY4: repeatRate('event', mx, 3), eventRepeatY5: repeatRate('event', mx, 4),
      distinctEvents5: distinct(mx, 'event'), eventAdj: adjRate(mx, 'event'),
      twoEventMonthsPerYear: sum(mx.map((c) => sum(Object.values(c.extras.months).map((m) => m.evHist[2] ?? 0)))) / (YEARS * seqs),
      doorAdj: adjRate(mx, 'door'), doorTakenAdj: adjRate(mx, 'door_taken'), distinctDoors5: distinct(mx, 'door'), distinctDoorsTaken5: distinct(mx, 'door_taken'),
      maxMajorShift: maxMajor, maxMajorCell: `${maxMajorCell} ${maxMajorId}`, maxPlayerMajorShift: maxPlayer, cellsOverFlag: over, maxMinorShift: maxMinor, maxMinorCell: `${maxMinorCell} ${maxMinorId}`,
    };
  }

  // ---- 1. Events per year and per month
  for (const id of IDS.slice(0, 6)) {
    const r = runs[id];
    const mx = mixed(r);
    const seqs = sum(mx.map((c) => c.sequences));
    h(`${id}: ${EVENT_CONFIGS[id]!.rideAlong ? 'ride-along' : 'no ride-along'}, months ${r.eventMonths.join(',')}, memory depth ${r.config.memoryDepth} — mixed player`);
    out.push(`Events a year: **${f2(summary[id]!.eventsPerYear as number)}**; months with two events: ${f2(summary[id]!.twoEventMonthsPerYear as number)} a year.\n`);
    out.push(table(['month', 'first-slot candidates (before memory)', 'after memory', 'slot empty', 'filled only by falling back on held-back events', 'taken by a follow-up', 'taken by a first-marked text', 'second event', 'second-slot candidates'], r.eventMonths.map((m) => {
      const a = slotStats(mx, String(m));
      const b = slotStats(mx, `${m}r`);
      const twice = sum(mx.map((c) => c.extras.months[String(m)]?.evHist[2] ?? 0)) / (sum(mx.map((c) => c.extras.months[String(m)]?.n ?? 0)) || 1);
      return [m, f2(a.mean), f2(a.meanAfter), pct(a.empty), pct(a.fell), pct(a.follow, 0), pct(a.first, 0), pct(twice, 0), b.n ? `${f2(b.mean)} (fell back ${pct(b.fell, 0)})` : '-'];
    })));
    out.push(`\n(${seqs} sequences; "candidates" = events eligible when the slot opens, a follow-up that takes the slot counting 1.)`);
  }

  // ---- 2. Repeat and distinct
  h('Event repeat rate and distinct events — mixed player');
  out.push(table(['config', 'events / year', 'repeat Y2', 'Y3', 'Y4', 'Y5', 'events also in the year before', 'distinct events after 5 (of 28)'], IDS.slice(0, 6).map((id) => {
    const s = summary[id]!;
    return [id, f2(s.eventsPerYear as number), pct(s.eventRepeatY2 as number), pct(s.eventRepeatY3 as number), pct(s.eventRepeatY4 as number), pct(s.eventRepeatY5 as number), pct(s.eventAdj as number), f2(s.distinctEvents5 as number)];
  })));
  out.push('\n"Repeat Yk" = of the distinct events of year k, the share already met in years 1..k-1 (R11a). "Also in the year before" = share of year k\'s events that year k-1 also met, k = 2..5.');

  // ---- Doors
  h('Doors — mixed player (each on E0)');
  out.push(table(['config', 'doors that exist / season', 'doors offered that were offered the year before', 'doors taken that were taken the year before', 'distinct doors offered after 5', 'distinct doors taken after 5', 'overall pass rate'], ['E0', 'D1', 'D2'].map((id) => {
    const r = runs[id as keyof typeof runs];
    const mx = mixed(r);
    const exist = (r.pools.door?.['*']?.length ?? 8) / 4;
    return [id === 'E0' ? 'D0' : id, exist, pct(adjRate(mx, 'door')), pct(adjRate(mx, 'door_taken')), f2(distinct(mx, 'door')), f2(distinct(mx, 'door_taken')), pct(sum(mx.map(doorPass)) / mx.length)];
  })));
  const gateIds = (runs.D1.pools.door?.['*'] ?? []).slice();
  out.push('\nPass rate and how often each door is taken, per door (mixed player; taken = share of years):\n');
  out.push(table(['door', 'D0 offered', 'D0 taken', 'D0 pass', 'D1 offered', 'D1 taken', 'D1 pass', 'D2 offered', 'D2 taken', 'D2 pass'], gateIds.map((g) => {
    const cells = (id: 'E0' | 'D1' | 'D2') => {
      const mx = mixed(runs[id]);
      const yrs = sum(mx.map((c) => c.extras.years));
      const t = (k: 'offered' | 'taken' | 'passed') => sum(mx.map((c) => c.extras.gates[g]?.[k] ?? 0));
      return [t('offered') === 0 ? '-' : pct(t('offered') / yrs, 0), t('taken') === 0 ? '-' : pct(t('taken') / yrs, 0), t('taken') === 0 ? '-' : pct(t('passed') / t('taken'), 0)];
    };
    return [g, ...cells('E0'), ...cells('D1'), ...cells('D2')];
  })));

  // ---- 3. Drift
  const driftRows = (id: (typeof IDS)[number]) => {
    const r = runs[id];
    const flagged: string[] = [];
    const rows = Object.entries(r.cells).map(([cellId, c]) => {
      const b = base.cells[cellId] as Cell;
      const dm = MAJORS.map((m) => share(c, 'ending_major', m) - share(b, 'ending_major', m));
      const worst = Math.max(...dm.map(Math.abs));
      let minorId = '';
      let minorMax = 0;
      for (const m of r.pools.ending_minor?.['*'] ?? []) {
        const x = share(c, 'ending_minor', m) - share(b, 'ending_minor', m);
        if (Math.abs(x) > Math.abs(minorMax)) { minorMax = x; minorId = m; }
      }
      const flag = worst > MAJOR_FLAG / 100;
      if (flag) flagged.push(`${cellId} (${MAJORS.map((m, i) => `${m} ${pts(dm[i] as number)}`).join(', ')})`);
      return [flag ? `⚠ ${cellId}` : cellId, ...dm.map((x) => pts(x)), `${minorId} ${pts(minorMax)}`,
        d2(finalMean(c, 'hype') - finalMean(b, 'hype')), d2(finalMean(c, 'craft') - finalMean(b, 'craft')), d2(finalMean(c, 'heat') - finalMean(b, 'heat')), d2(finalMean(c, 'capital') - finalMean(b, 'capital')),
        d2(perYear(c, 'scandalsPrinted') - perYear(b, 'scandalsPrinted')), d2(perYear(c, 'scandalsCrystallised') - perYear(b, 'scandalsCrystallised')), d2(awardsPerYear(c) - awardsPerYear(b)), pts(doorPass(c) - doorPass(b))];
    });
    return { rows, flagged };
  };
  const driftHead = ['cell', ...MAJORS.map((m) => `Δ ${m} (pts)`), 'largest Δ minor (pts)', 'Δ final hype', 'Δ craft', 'Δ heat', 'Δ money', 'Δ scandals printed/yr', 'Δ crystallised/yr', 'Δ awards/yr', 'Δ door pass (pts)'];
  const flagsByConfig: Record<string, string[]> = {};
  h('What moves against E0 (D0 for the doors): per persona and manager');
  out.push(`Every cell is 2000 five-year sequences on the same seeds as E0. Major endings: change in the share of years (percentage points); ⚠ marks a cell where a major ending moves by more than ${MAJOR_FLAG} points. Final resources: mean at the year's end, change against E0. Per-year figures are means over the 10,000 years of the cell.\n`);
  for (const id of ['E1', 'E2', 'E3', 'E4', 'E5', 'D1', 'D2'] as const) {
    const { rows, flagged } = driftRows(id);
    flagsByConfig[id] = flagged;
    out.push(`\n### ${id} against ${id.startsWith('D') ? 'D0 (=E0)' : 'E0'}\n`);
    out.push(table(driftHead, rows));
    out.push(`\nCells with a major ending moving by more than ${MAJOR_FLAG} points: ${flagged.length === 0 ? 'none' : flagged.join('; ')}.`);
  }

  // ---- 4. Capacity
  h('Capacity: where a new regular event would stand');
  out.push('For each month, per year: how often the month draws from the regular pool (a ride-along second event counts), and the regular pool\'s candidates at the month\'s first slot, before the memory, split by what gates them: **open** (no condition), **hype-gated**, **flag-gated** (needs an earlier answer); and by lane (a lane doubles an event\'s weight; it is not a gate). Follow-ups and first-marked texts are not part of the regular pool. All means are per year, mixed player.\n');
  for (const id of ['E0', 'E1', 'E3', 'E5'] as const) {
    const r = runs[id];
    const mx = mixed(r);
    out.push(`\n**${id}** (months ${r.eventMonths.join(',')}):\n`);
    out.push(table(['month', 'regular draw happens', 'candidates when it does', 'pool at first slot', 'open', 'hype-gated', 'flag-gated', 'music', 'screen', 'celebrity', 'no lane'], r.eventMonths.map((m) => {
      const mm = mx.map((c) => c.extras.months[String(m)]).filter((x): x is MonthExtras => x !== undefined);
      const n = sum(mm.map((x) => x.n));
      const drawn = sum(mm.map((x) => x.drawn));
      const cls = (k: string) => f2(sum(mm.map((x) => x.potClass[k] ?? 0)) / n);
      const lane = (k: string) => f2(sum(mm.map((x) => x.potLane[k] ?? 0)) / n);
      return [m, pct(drawn / n, 0), drawn === 0 ? '-' : f2(sum(mm.map((x) => x.regSum)) / drawn), f2(sum(mm.map((x) => x.potSum)) / n), cls('open'), cls('hype-gated'), cls('flag-gated'), lane('music'), lane('screen'), lane('celebrity'), lane('none')];
    })));
  }

  // ---- Side by side
  h('Side by side');
  out.push(table(['config', 'event months', 'ride-along', 'memory depth', 'events / year', 'year-3 repeat', 'distinct events after 5', 'two-event months / year', 'largest major shift (pts, any cell)', 'cells over 3 pts', 'largest shift, player-like cells (pts)', 'largest minor shift (pts)'], IDS.slice(0, 6).map((id) => {
    const s = summary[id]!;
    return [id, (s.months as string).replaceAll(',', ' '), EVENT_CONFIGS[id]!.rideAlong ? 'on' : 'off', String(s.depth), f2(s.eventsPerYear as number), pct(s.eventRepeatY3 as number), f2(s.distinctEvents5 as number), f2(s.twoEventMonthsPerYear as number),
      id === 'E0' ? '-' : `${pts(s.maxMajorShift as number).replace('+', '')} (${s.maxMajorCell})`, id === 'E0' ? '-' : String(s.cellsOverFlag), id === 'E0' ? '-' : pts(s.maxPlayerMajorShift as number).replace('+', ''), id === 'E0' ? '-' : `${pts(s.maxMinorShift as number).replace('+', '')} (${s.maxMinorCell})`];
  })));
  out.push('\nDoors:\n');
  out.push(table(['config', 'doors exist / offered per season', 'selection', 'doors repeating from the year before', 'distinct doors offered after 5', 'largest major shift (pts, any cell)', 'cells over 3 pts', 'largest minor shift (pts)'], ['E0', 'D1', 'D2'].map((id) => {
    const s = summary[id]!;
    const d = id === 'E0' ? 'D0' : id;
    return [d, `${DOOR_CONFIGS[d]!.placeholders ? 4 : 2} / 2`, DOOR_CONFIGS[d]!.selection, pct(s.doorAdj as number), f2(s.distinctDoors5 as number), id === 'E0' ? '-' : `${pts(s.maxMajorShift as number).replace('+', '')} (${s.maxMajorCell})`, id === 'E0' ? '-' : String(s.cellsOverFlag), id === 'E0' ? '-' : `${pts(s.maxMinorShift as number).replace('+', '')} (${s.maxMinorCell})`];
  })));

  return { md: `${out.join('\n')}\n`, json: { flagged: flagsByConfig, summary } };
}

if (process.argv.includes("--run"))
  for (const [e, d, id] of [["E0", "D0", "E0"], ["E1", "D0", "E1"], ["E2", "D0", "E2"], ["E3", "D0", "E3"], ["E4", "D0", "E4"], ["E5", "D0", "E5"], ["E0", "D1", "D1"], ["E0", "D2", "D2"]] as const) {
    const r = spawnSync(process.execPath, [join(ROOT, "sim/survey/survey.ts"), `--events=${e}`, `--doors=${d}`, `--out=sim/out/r11b/${id}`], { cwd: ROOT, stdio: "inherit" });
    if (r.status !== 0) process.exit(r.status ?? 1);
  }

const { md, json } = compare();
writeFileSync(join(DIR, 'comparison.md'), md);
writeFileSync(join(DIR, 'comparison.json'), `${JSON.stringify(json, null, 1)}\n`);
console.log(`comparison → ${DIR}`);
