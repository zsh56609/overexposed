// npm run sim:variants -- [--runs=1000] [--seed=20260929]
//
// How often the player sees each line group, and so how many variants it needs (docs/ui-plan.md §13,
// decision 15, revised): the player-like personas play the batch under each manager, every run's history is
// read the way the UI reads it (core/lines.ts, core/manager.ts), and each group's showings are averaged per
// run — a manager's own groups over that manager's runs. Writes sim/appearances.json —
// what npm run validate holds the variants to — and prints the variant gap list, most short first: the
// writing still to come is drafted against it. Ids and numbers only.

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { frontPages, indexContent, managerMessages, monthEndLines, onceItem, paperOf, readLines, type GameState, type HistoryStep } from '../core/index.ts';
import { managersToRun, runOne, runSeeds } from './batch.ts';
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
/** Runs per manager: a manager's own line groups average over those. */
const managerRuns = new Map<string, number>();
const managers = managersToRun(content, undefined);
const t0 = performance.now();

for (const manager of managers)
for (const persona of players) {
  for (const seed of runSeeds(SEED, RUNS)) {
    const history: HistoryStep[] = [];
    let before: GameState | null = null;
    runOne(
      content,
      persona,
      seed,
      (state) => {
        history.push({ before, after: state, events: state.events });
        before = state;
      },
      manager === undefined ? {} : { manager },
    );
    if (manager !== undefined) managerRuns.set(manager, (managerRuns.get(manager) ?? 0) + 1);
    const shown = new Map(readLines(history).counter.snapshot());
    // The items shown once per run: each season reached, the ending reached, every gate offered, the opening.
    const last = history.at(-1)?.after;
    for (let act = 1; last && act <= last.act; act++) shown.set(onceItem.opener(act), 1);
    if (last?.endingId) shown.set(onceItem.ending(last.endingId), 1);
    for (const gate of last?.gateHistory ?? []) for (const id of gate.offered) shown.set(onceItem.gate(id), 1);
    shown.set(onceItem.opening, 1);
    // The press: each paper's world stories and frenzy spillovers printed this run (every paper is readable).
    for (const month of frontPages(history)) {
      for (const page of month.pages) {
        for (const item of page.items) {
          const group = item.kind === 'world' ? `world:${page.paper}` : item.kind === 'spillover' ? `spillover:${page.paper}` : item.kind === 'filler' ? `filler:${page.paper}` : null;
          if (group) shown.set(group, (shown.get(group) ?? 0) + 1);
        }
      }
    }
    // The manager: each message's line group, and the month-end perk line's.
    for (const month of managerMessages(history)) for (const m of month.messages) shown.set(m.group, (shown.get(m.group) ?? 0) + 1);
    for (const line of monthEndLines(history)) shown.set(line.group, (shown.get(line.group) ?? 0) + 1);
    for (const [group, n] of shown) {
      sum.set(group, (sum.get(group) ?? 0) + n);
      max.set(group, Math.max(max.get(group) ?? 0, n));
    }
    runs++;
  }
}

const round = (x: number) => Math.round(x * 100) / 100;
// A manager's groups ('manager:<id>:…', 'monthEnd:<id>') over that manager's runs; the rest over every run.
const runsFor = (group: string): number => {
  const [kind, owner] = group.split(':');
  return (kind === 'manager' || kind === 'monthEnd') && owner !== undefined ? (managerRuns.get(owner) ?? runs) : runs;
};
const appearances: Appearances = {
  measured: `npm run sim:variants — player-like personas (${players.join(', ')}), ${RUNS} runs each under each manager (${managers.join(', ')}), seed ${SEED}`,
  perRun: Object.fromEntries([...sum].sort(([a], [b]) => a.localeCompare(b)).map(([g, n]) => [g, round(n / runsFor(g))])),
  maxPerRun: Object.fromEntries([...max].sort(([a], [b]) => a.localeCompare(b))),
};
writeFileSync(join(ROOT, 'sim/appearances.json'), `${JSON.stringify(appearances, null, 2)}\n`);

// The gap list: one row per line group, the shortest of variants first — with the paper it prints in
// ('notebook': a quiet line no paper prints; 'hand': a scandal's in-hand line; '-': shown once a run).
const index = indexContent(content);
const paperFor = (kind: string, owner: string): string =>
  kind === 'card' || kind === 'scandal'
    ? (paperOf(index, owner) ?? 'notebook')
    : kind === 'inHand'
      ? 'hand'
      : kind === 'world' || kind === 'spillover' || kind === 'filler'
        ? owner
        : kind === 'manager'
          ? 'phone'
          : kind === 'monthEnd'
            ? 'feed'
            : '-';
const rows = variantGroups(loadRawContent()).map((g) => {
  const perRun = g.kind === 'once' ? (appearances.perRun[g.id] ?? 0) : (appearances.perRun[g.id] ?? 0);
  const needs = groupNeeds(g, appearances);
  return { g, perRun, have: g.keys.length, needs, short: Math.max(0, needs - g.keys.length) };
});
rows.sort((a, b) => b.short - a.short || b.perRun - a.perRun || a.g.id.localeCompare(b.g.id));
const pad = (s: string, n: number) => s.padEnd(n);
const lines = [
  `VARIANT GAP LIST  ${appearances.measured}  (${((performance.now() - t0) / 1000).toFixed(1)}s)`,
  'needs: seen 4+ a run → 4 · 2 to 4 → 3 · under 2 → 2 · once-per-run items → 2 · a world pool → the stories a run prints on average',
  '',
  `${pad('group', 40)}${pad('paper', 10)}${pad('register', 10)}${'per run'.padStart(8)}${'max'.padStart(6)}${'have'.padStart(6)}${'needs'.padStart(7)}${'short'.padStart(7)}`,
  ...rows.map(
    (r) =>
      `${pad(r.g.id, 40)}${pad(paperFor(r.g.kind, r.g.owner), 10)}${pad(r.g.kind === 'scandal' ? 'scandal' : (r.g.register ?? '-'), 10)}${r.perRun.toFixed(2).padStart(8)}${String(appearances.maxPerRun?.[r.g.id] ?? 0).padStart(6)}${String(r.have).padStart(6)}${String(r.needs).padStart(7)}${String(r.short).padStart(7)}`,
  ),
  '',
  `${rows.filter((r) => r.short > 0).length} of ${rows.length} groups short, ${rows.reduce((n, r) => n + r.short, 0)} variants to write. Wrote sim/appearances.json.`,
];
console.log(lines.join('\n'));
