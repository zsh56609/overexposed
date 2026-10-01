// npm run tune:thresholds -- [--runs=1000] [--seed=20260929] [--manager=<id>] [--dump=<file.json>]
// The distributions behind the year-end thresholds of awards and minor endings, over the same runs as npm run sim:
// final hype, craft and capital, the year's peak hype and best month, scandals at the year's peak and at its end,
// and how far they came down — per persona and pooled over the player-like ones, then within each major (a minor's
// threshold splits its major's runs). A threshold is placed where the share of runs it should catch reaches it
// (docs/decisions.md: the award thresholds, The Redemption Arc's drop, Flash in the Pan's peak hype).
// --dump writes every run's year end as JSON, for a search of your own. Each manager in turn unless --manager names one.

import { writeFileSync } from 'node:fs';
import { endingIfYearEndedNow, lanePlays, scandalCount, yearStats, type GameState } from '../../core/index.ts';
import { loadContent } from '../content.ts';
import { PERSONA_IDS } from '../personas.ts';
import { flag, GROUPS, label, MANAGER, managersToRun, ofGroup, pct, quantile, RUNS, SEED, yearEnds, type YearEnd } from './common.ts';

const content = loadContent();
const Q = [0.1, 0.25, 0.5, 0.75, 0.9, 0.95];
const MEASURES: [string, (s: GameState) => number][] = [
  ['final hype', (s) => s.resources.hype],
  ['peak hype', (s) => yearStats(s).peakHype],
  ['best month hype', (s) => yearStats(s).bestMonthHype],
  ['final craft', (s) => s.resources.craft],
  ['final capital', (s) => s.resources.capital],
  ['scandals at the peak', (s) => yearStats(s).peakScandals],
  ['scandals at the end', (s) => scandalCount(s)],
  ['scandal drop', (s) => yearStats(s).scandalDrop],
];
const COUNTS = MEASURES.filter(([m]) => m.startsWith('scandal'));
const row = (name: string, xs: number[]) => `  ${name.padEnd(22)}${Q.map((q) => String(quantile(xs, q)).padStart(6)).join('')}   n ${xs.length}`;
const dump: unknown[] = [];

for (const [i, manager] of managersToRun(content, MANAGER).entries()) {
  if (i > 0) console.log('\n');
  const ends = yearEnds(content, manager);
  const players = ofGroup(ends, 'players');
  console.log(`THRESHOLDS  seed=${SEED}  manager=${manager ?? 'none'}  ${RUNS} runs x ${PERSONA_IDS.length} personas; * = probe, not in "players"`);
  console.log(`${'quantiles'.padEnd(24)}${Q.map((q) => `p${Math.round(q * 100)}`.padStart(6)).join('')}`);
  for (const [name, f] of MEASURES) {
    console.log(`\n${name}`);
    for (const g of GROUPS) console.log(row(label(g), ofGroup(ends, g).map((e) => f(e.final))));
  }

  // Within each major, player-like runs: where a minor's threshold falls among the runs it splits.
  const byMajor = new Map<string, YearEnd[]>();
  for (const e of players) {
    const major = endingIfYearEndedNow(e.final)?.majorId ?? '?';
    byMajor.set(major, [...(byMajor.get(major) ?? []), e]);
  }
  for (const [major, rs] of byMajor) {
    console.log(`\nwithin ${major} (${pct(rs.length, players.length)} of player-like runs)`);
    for (const [name, f] of MEASURES) console.log(row(name, rs.map((e) => f(e.final))));
  }

  // The scandal counts are small integers: their whole distribution, player-like runs pooled.
  console.log('\nscandal counts, player-like runs: share of runs at each value');
  for (const [name, f] of COUNTS) {
    const xs = players.map((e) => f(e.final));
    const top = Math.max(0, ...xs);
    console.log(`  ${name.padEnd(22)}${Array.from({ length: top + 1 }, (_, v) => `${v}: ${pct(xs.filter((x) => x === v).length, xs.length)}`).join('  ')}`);
  }

  if (flag('dump')) {
    for (const e of ends) {
      const s = e.final;
      const st = yearStats(s);
      dump.push({
        persona: e.persona,
        probe: e.probe,
        seed: e.seed,
        manager: manager ?? null,
        ending: s.endingId,
        major: endingIfYearEndedNow(s)?.majorId ?? null,
        resources: s.resources,
        scandals: scandalCount(s),
        flags: Object.keys(s.flags),
        lanePlays: lanePlays(s),
        ...st,
        careerPlays: s.careerPlays,
      });
    }
  }
}
const out = flag('dump');
if (out) {
  writeFileSync(out, JSON.stringify(dump), 'utf8');
  console.log(`\n${dump.length} year ends → ${out}`);
}
