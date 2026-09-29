// npm run sim:awards -- [--runs=1000] [--seed=20260929]
// Year-end award rates (docs/ui-plan.md §13, decisions 16 and 20): the same personas and seeds as
// `npm run sim`, each run's event history collected, the /core awards query run on the finished year.
// Awards are read-only, so this changes no run: `npm run sim` stays byte-identical. Ids and numbers only.
//
// Tuning target: every award won in at least a few percent and at most about 40% of player-like runs,
// and no run ends with zero awards.

import { yearAwards, type GameEvent, type GameState } from '../core/index.ts';
import { runOne, runSeeds } from './batch.ts';
import { loadContent } from './content.ts';
import { isProbe, PERSONA_IDS, type PersonaId } from './personas.ts';

const arg = (name: string, fallback: number) => Number(process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback);
const RUNS = arg('runs', 1000);
const SEED = arg('seed', 20260929);
const BAND = { min: 0.03, max: 0.4 } as const;

const content = loadContent();
const awardIds = (content.awards ?? []).map((a) => a.id);
const seeds = runSeeds(SEED, RUNS);

type Tally = { runs: number; won: Record<string, number>; byCount: Record<number, number> };
const tally = (): Tally => ({ runs: 0, won: Object.fromEntries(awardIds.map((id) => [id, 0])), byCount: {} });
const perPersona = new Map<PersonaId, Tally>();
const players = tally();

const t0 = performance.now();
for (const persona of PERSONA_IDS) {
  const t = tally();
  for (const seed of seeds) {
    const history: GameEvent[] = [];
    let last: GameState | null = null;
    runOne(content, persona, seed, (state) => {
      history.push(...state.events);
      last = state;
    });
    const final = last as GameState | null;
    if (!final || final.phase !== 'ended') continue;
    const won = yearAwards(final, history);
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
const lines: string[] = [];
lines.push(`AWARDS  seed=${SEED}  ${RUNS} runs x ${PERSONA_IDS.length} personas  (${((performance.now() - t0) / 1000).toFixed(1)}s)`);
lines.push(`share of runs winning each award; * = control probe, not in "players"`, '');
lines.push(pad('award', 26) + cols.map((c) => c.padStart(12)).join(''));
const tallies = [...PERSONA_IDS.map((p) => perPersona.get(p) as Tally), players];
for (const id of awardIds) lines.push(pad(id, 26) + tallies.map((t) => pct(t.won[id] ?? 0, t.runs).padStart(12)).join(''));
lines.push('');
const maxCount = Math.max(...tallies.flatMap((t) => Object.keys(t.byCount).map(Number)));
for (let n = 0; n <= maxCount; n++) {
  lines.push(pad(`runs with ${n} award(s)`, 26) + tallies.map((t) => pct(t.byCount[n] ?? 0, t.runs).padStart(12)).join(''));
}
const multi = (t: Tally) => Object.entries(t.byCount).reduce((sum, [k, v]) => sum + (Number(k) >= 2 ? v : 0), 0);
lines.push(pad('runs with 2+ awards', 26) + tallies.map((t) => pct(multi(t), t.runs).padStart(12)).join(''));
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
process.exitCode = pass ? 0 : 1;
