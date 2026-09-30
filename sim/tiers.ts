// npm run sim:tiers -- [--runs=1000] [--seed=20260929]
// The stat bar's tiers in play (docs/ui-plan.md §13, decision 25): the same personas and seeds as
// `npm run sim`, the /core tier query run on every state a player would see — the start and after every
// action. Tiers are read-only, so this changes no run: `npm run sim` stays byte-identical. Ids and numbers
// only: tiers are reported by their i18n keys.
//
// Tuning target: every tier is actually reached in play — in at least 5% of player-like runs.

import { statTiers, TIER_STATS, type GameState, type TierStat } from '../core/index.ts';
import { runOne, runSeeds } from './batch.ts';
import { loadContent } from './content.ts';
import { isProbe, PERSONA_IDS, type PersonaId } from './personas.ts';

const arg = (name: string, fallback: number) => Number(process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback);
const RUNS = arg('runs', 1000);
const SEED = arg('seed', 20260929);
const MIN_REACH = 0.05;

const content = loadContent();
const tierKeys = (stat: TierStat): readonly string[] => content.rules.tiers?.[stat]?.nameKeys ?? [];
const seeds = runSeeds(SEED, RUNS);

type Tally = { runs: number; states: number; reached: Record<TierStat, number[]>; time: Record<TierStat, number[]> };
const zeros = (stat: TierStat) => tierKeys(stat).map(() => 0);
const tally = (): Tally => ({
  runs: 0,
  states: 0,
  reached: { hype: zeros('hype'), heat: zeros('heat'), craft: zeros('craft') },
  time: { hype: zeros('hype'), heat: zeros('heat'), craft: zeros('craft') },
});
const perPersona = new Map<PersonaId, Tally>();
const players = tally();

const t0 = performance.now();
for (const persona of PERSONA_IDS) {
  const t = tally();
  for (const seed of seeds) {
    const seen: Record<TierStat, Set<number>> = { hype: new Set(), heat: new Set(), craft: new Set() };
    const time: Record<TierStat, number[]> = { hype: zeros('hype'), heat: zeros('heat'), craft: zeros('craft') };
    let states = 0;
    runOne(content, persona, seed, (state: GameState) => {
      states++;
      const tiers = statTiers(state);
      for (const stat of TIER_STATS) {
        const tier = tiers[stat];
        if (!tier) continue;
        seen[stat].add(tier.index);
        time[stat][tier.index] = (time[stat][tier.index] ?? 0) + 1;
      }
    });
    for (const target of isProbe(persona) ? [t] : [t, players]) {
      target.runs++;
      target.states += states;
      for (const stat of TIER_STATS) {
        for (const i of seen[stat]) target.reached[stat][i] = (target.reached[stat][i] ?? 0) + 1;
        time[stat].forEach((n, i) => (target.time[stat][i] = (target.time[stat][i] ?? 0) + n));
      }
    }
  }
  perPersona.set(persona, t);
}

const pct = (n: number, d: number) => (d === 0 ? '-' : `${((100 * n) / d).toFixed(1)}%`);
const cols = [...PERSONA_IDS.map((p) => (isProbe(p) ? `${p}*` : p)), 'players'];
// Wide enough for the longest persona name, and a gap between columns.
const W = Math.max(12, ...cols.map((c) => c.length + 2));
const tallies = [...PERSONA_IDS.map((p) => perPersona.get(p) as Tally), players];
const lines: string[] = [];
lines.push(`TIERS  seed=${SEED}  ${RUNS} runs x ${PERSONA_IDS.length} personas  (${((performance.now() - t0) / 1000).toFixed(1)}s)`);
lines.push('reached = share of runs that show the tier at least once; time = share of all states shown in it', '* = probe, not in "players"', '');
lines.push('reached'.padEnd(18) + cols.map((c) => c.padStart(W)).join(''));
for (const stat of TIER_STATS) {
  tierKeys(stat).forEach((key, i) => lines.push(key.padEnd(18) + tallies.map((t) => pct(t.reached[stat][i] ?? 0, t.runs).padStart(W)).join('')));
}
lines.push('', 'time'.padEnd(18) + cols.map((c) => c.padStart(W)).join(''));
for (const stat of TIER_STATS) {
  tierKeys(stat).forEach((key, i) => lines.push(key.padEnd(18) + tallies.map((t) => pct(t.time[stat][i] ?? 0, t.states).padStart(W)).join('')));
}
lines.push('');

let pass = true;
for (const stat of TIER_STATS) {
  const keys = tierKeys(stat);
  if (keys.length === 0) {
    pass = false;
    lines.push(`  [FAIL] ${stat}: no tiers in content/rules.json`);
  }
  keys.forEach((key, i) => {
    const share = (players.reached[stat][i] ?? 0) / players.runs;
    const ok = share >= MIN_REACH;
    if (!ok) pass = false;
    lines.push(`  [${ok ? 'PASS' : 'FAIL'}] ${key.padEnd(14)} reached in ${pct(players.reached[stat][i] ?? 0, players.runs)} of player-like runs (at least ${MIN_REACH * 100}%)`);
  });
}
lines.push('', pass ? 'PASS: every tier is reached in play' : 'FAIL: see above');
console.log(lines.join('\n'));
process.exitCode = pass ? 0 : 1;
