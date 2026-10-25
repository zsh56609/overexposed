// npm run sim:awards -- [--runs=1000] [--seed=20260929] [--manager=<id>] [--skip-first-draft]   (default: each manager in turn)
// Year-end award rates (docs/ui-plan.md §13, decisions 16 and 20): the same personas and seeds as
// `npm run sim`, the /core awards query run on each finished year.
// Awards are read-only, so this changes no run: `npm run sim` stays byte-identical. Ids and numbers only.
//
// Tuning target: every award won in at least a few percent and at most about 40% of player-like runs,
// and no run ends with zero awards. Since round R8c (twelve awards) it also reports how many a year wins — the share
// of player-like years with 5+ and 7+, the most any run won — and ten sample years with 5+.

import { yearAwards, type GameState } from '../core/index.ts';
import { managersToRun, runOne, runSeeds, skipFirstDraftArg } from './batch.ts';
import { loadContent } from './content.ts';
import { isProbe, PERSONA_IDS, type PersonaId } from './personas.ts';

const arg = (name: string, fallback: number) => Number(process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback);
const RUNS = arg('runs', 1000);
const SEED = arg('seed', 20260929);
const MANAGER = process.argv.find((a) => a.startsWith('--manager='))?.split('=')[1];
const SKIP = skipFirstDraftArg(process.argv);
const BAND = { min: 0.03, max: 0.4 } as const;

const content = loadContent();
const awardIds = (content.awards ?? []).map((a) => a.id);
const seeds = runSeeds(SEED, RUNS);

/** One manager's report (round 2b: every band runs once per manager). True when it passes. */
function awardsFor(manager: string | undefined): boolean {
  type Tally = { runs: number; won: Record<string, number>; byCount: Record<number, number> };
  const tally = (): Tally => ({ runs: 0, won: Object.fromEntries(awardIds.map((id) => [id, 0])), byCount: {} });
  const perPersona = new Map<PersonaId, Tally>();
  const players = tally();
  /** Player-like years with five or more awards (round R8c), for ten samples: the most awards first, persona by persona. */
  const candidates: { persona: PersonaId; n: number; line: string }[] = [];

  const t0 = performance.now();
  for (const persona of PERSONA_IDS) {
    const t = tally();
    for (const seed of seeds) {
      let last: GameState | null = null;
      runOne(
        content,
        persona,
        seed,
        (state) => {
          last = state;
        },
        { ...(manager === undefined ? {} : { manager }), ...(SKIP ? { skipFirstDraft: true } : {}) },
      );
      const final = last as GameState | null;
      if (!final || final.phase !== 'ended') continue;
      const won = yearAwards(final);
      if (!isProbe(persona) && won.length >= 5) candidates.push({ persona, n: won.length, line: `${persona} seed=${seed} ending=${final.endingId ?? '-'}: ${won.length} — ${won.join(', ')}` });
      for (const target of isProbe(persona) ? [t] : [t, players]) {
        target.runs++;
        for (const id of won) target.won[id] = (target.won[id] ?? 0) + 1;
        target.byCount[won.length] = (target.byCount[won.length] ?? 0) + 1;
      }
    }
    perPersona.set(persona, t);
  }

  const pct = (n: number, d: number) => (d === 0 ? '-' : `${((100 * n) / d).toFixed(1)}%`);
  const pad = (s: string, n: number) => s.padEnd(n);
  const cols = [...PERSONA_IDS.map((p) => (isProbe(p) ? `${p}*` : p)), 'players'];
  // Wide enough for the longest persona name, and a gap between columns.
  const W = Math.max(12, ...cols.map((c) => c.length + 2));
  const lines: string[] = [];
  lines.push(`AWARDS  seed=${SEED}${manager ? `  manager=${manager}` : ''}  ${RUNS} runs x ${PERSONA_IDS.length} personas  (${((performance.now() - t0) / 1000).toFixed(1)}s)`);
  lines.push(`share of runs winning each award; * = probe, not in "players"`, '');
  lines.push(pad('award', 26) + cols.map((c) => c.padStart(W)).join(''));
  const tallies = [...PERSONA_IDS.map((p) => perPersona.get(p) as Tally), players];
  for (const id of awardIds) lines.push(pad(id, 26) + tallies.map((t) => pct(t.won[id] ?? 0, t.runs).padStart(W)).join(''));
  lines.push('');
  const maxCount = Math.max(...tallies.flatMap((t) => Object.keys(t.byCount).map(Number)));
  for (let n = 0; n <= maxCount; n++) {
    lines.push(pad(`runs with ${n} award(s)`, 26) + tallies.map((t) => pct(t.byCount[n] ?? 0, t.runs).padStart(W)).join(''));
  }
  const atLeast = (t: Tally, n: number) => Object.entries(t.byCount).reduce((sum, [k, v]) => sum + (Number(k) >= n ? v : 0), 0);
  for (const n of [2, 5, 7]) lines.push(pad(`runs with ${n}+ awards`, 26) + tallies.map((t) => pct(atLeast(t, n), t.runs).padStart(W)).join(''));
  const most = (t: Tally) => Math.max(0, ...Object.keys(t.byCount).map(Number));
  lines.push(pad('the most one run won', 26) + tallies.map((t) => String(most(t)).padStart(W)).join(''));
  // Ten samples: the most awards first; among equals, one persona at a time, in persona order.
  const queue = [...candidates].sort((a, b) => b.n - a.n);
  const samples: string[] = [];
  while (samples.length < 10 && queue.length > 0) {
    const taken = new Set<PersonaId>();
    const top = queue[0]?.n ?? 0;
    for (let i = 0; i < queue.length && samples.length < 10; ) {
      const x = queue[i] as (typeof queue)[number];
      if (x.n === top && !taken.has(x.persona)) {
        taken.add(x.persona);
        samples.push(x.line);
        queue.splice(i, 1);
      } else i++;
    }
    if (taken.size === 0) queue.shift();
  }
  lines.push('', `sample years with 5+ awards (player-like; ${candidates.length} in all, ten shown, the most awards first):`, ...samples.map((x) => `  ${x}`));
  lines.push('');

  let pass = true;
  for (const id of awardIds) {
    const share = (players.won[id] ?? 0) / players.runs;
    const ok = share >= BAND.min && share <= BAND.max;
    if (!ok) pass = false;
    lines.push(`  [${ok ? 'PASS' : 'FAIL'}] ${pad(id, 26)} ${pct(players.won[id] ?? 0, players.runs)} of player-like runs (band ${BAND.min * 100}%-${BAND.max * 100}%)`);
  }
  const zero = players.byCount[0] ?? 0;
  if (zero > 0) pass = false;
  lines.push(`  [${zero === 0 ? 'PASS' : 'FAIL'}] runs with zero awards: ${zero}`);
  lines.push('', pass ? 'PASS: every award inside its band, no run without an award' : 'FAIL: see above');
  console.log(lines.join('\n'));
  return pass;
}

let ok = true;
for (const [i, manager] of managersToRun(content, MANAGER).entries()) {
  if (i > 0) console.log('\n');
  ok = awardsFor(manager) && ok;
}
process.exitCode = ok ? 0 : 1;
