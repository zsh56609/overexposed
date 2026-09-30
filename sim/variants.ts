// npm run sim:variants -- [--runs=1000] [--seed=20260929]
//
// How often the player sees each line group, and so how many variants it needs (docs/ui-plan.md §13,
// decision 15, revised): the player-like personas play the batch, every run's history is read the way the
// UI reads it (core/lines.ts), and each group's showings are averaged per run. Writes sim/appearances.json —
// what npm run validate holds the variants to — and prints the variant gap list, most short first: the
// writing still to come is drafted against it. Ids and numbers only.

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { onceItem, readLines, type GameState, type HistoryStep } from '../core/index.ts';
import { runOne, runSeeds } from './batch.ts';
import { loadContent } from './content.ts';
import { isProbe, PERSONA_IDS } from './personas.ts';
import { ROOT, loadRawContent } from '../validate/load.ts';
import { groupNeeds, variantGroups, type Appearances } from '../validate/validate.ts';

const arg = (name: string, fallback: number) => Number(process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback);
const RUNS = arg('runs', 1000);
const SEED = arg('seed', 20260929);

const content = loadContent();
const players = PERSONA_IDS.filter((p) => !isProbe(p));
const sum = new Map<string, number>();
const max = new Map<string, number>();
let runs = 0;
const t0 = performance.now();

for (const persona of players) {
  for (const seed of runSeeds(SEED, RUNS)) {
    const history: HistoryStep[] = [];
    let before: GameState | null = null;
    runOne(content, persona, seed, (state) => {
      history.push({ before, after: state, events: state.events });
      before = state;
    });
    const shown = new Map(readLines(history).counter.snapshot());
    // The items shown once per run: each season reached, the ending reached, every gate offered, the opening.
    const last = history.at(-1)?.after;
    for (let act = 1; last && act <= last.act; act++) shown.set(onceItem.opener(act), 1);
    if (last?.endingId) shown.set(onceItem.ending(last.endingId), 1);
    for (const gate of last?.gateHistory ?? []) for (const id of gate.offered) shown.set(onceItem.gate(id), 1);
    shown.set(onceItem.opening, 1);
    for (const [group, n] of shown) {
      sum.set(group, (sum.get(group) ?? 0) + n);
      max.set(group, Math.max(max.get(group) ?? 0, n));
    }
    runs++;
  }
}

const round = (x: number) => Math.round(x * 100) / 100;
const appearances: Appearances = {
  measured: `npm run sim:variants — player-like personas (${players.join(', ')}), ${RUNS} runs each, seed ${SEED}`,
  perRun: Object.fromEntries([...sum].sort(([a], [b]) => a.localeCompare(b)).map(([g, n]) => [g, round(n / runs)])),
  maxPerRun: Object.fromEntries([...max].sort(([a], [b]) => a.localeCompare(b))),
};
writeFileSync(join(ROOT, 'sim/appearances.json'), `${JSON.stringify(appearances, null, 2)}\n`);

// The gap list: one row per line group, the shortest of variants first.
const rows = variantGroups(loadRawContent()).map((g) => {
  const perRun = g.kind === 'once' ? (appearances.perRun[g.id] ?? 0) : (appearances.perRun[g.id] ?? 0);
  const needs = groupNeeds(g, appearances);
  return { g, perRun, have: g.keys.length, needs, short: Math.max(0, needs - g.keys.length) };
});
rows.sort((a, b) => b.short - a.short || b.perRun - a.perRun || a.g.id.localeCompare(b.g.id));
const pad = (s: string, n: number) => s.padEnd(n);
const lines = [
  `VARIANT GAP LIST  ${appearances.measured}  (${((performance.now() - t0) / 1000).toFixed(1)}s)`,
  'needs: seen 4+ a run → 4 · 2 to 4 → 3 · under 2 → 2 · once-per-run items → 2',
  '',
  `${pad('group', 30)}${pad('register', 10)}${'per run'.padStart(8)}${'max'.padStart(6)}${'have'.padStart(6)}${'needs'.padStart(7)}${'short'.padStart(7)}`,
  ...rows.map(
    (r) =>
      `${pad(r.g.id, 30)}${pad(r.g.register ?? '-', 10)}${r.perRun.toFixed(2).padStart(8)}${String(appearances.maxPerRun?.[r.g.id] ?? 0).padStart(6)}${String(r.have).padStart(6)}${String(r.needs).padStart(7)}${String(r.short).padStart(7)}`,
  ),
  '',
  `${rows.filter((r) => r.short > 0).length} of ${rows.length} groups short, ${rows.reduce((n, r) => n + r.short, 0)} variants to write. Wrote sim/appearances.json.`,
];
console.log(lines.join('\n'));
