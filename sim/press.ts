// npm run sim:press -- [--runs=1000] [--seed=20260929]
//
// The front pages across a batch (phase 2a, Part E): which paper leads each month, per persona; the fame
// meter — how much of the lead paper's front page is the player's at each fame tier, and how often a page is
// overwhelmed; the rival's arcs and how often her major differs from the player's; and the world pools —
// every story repeated within a run. Every run's history is composed the way the UI composes it
// (core/press.ts frontPages). Ids and numbers only.

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { frontPages, majorOf, playerShare, rivalArc, type GameState, type HistoryStep, type MonthPress } from '../core/index.ts';
import { runOne, runSeeds } from './batch.ts';
import { loadContent } from './content.ts';
import { isProbe, PERSONA_IDS, type PersonaId } from './personas.ts';
import { ROOT } from '../validate/load.ts';

const arg = (name: string, fallback: number) => Number(process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback);
const RUNS = arg('runs', 1000);
const SEED = arg('seed', 20260929);

const content = loadContent();
const papers = (content.press?.papers ?? []).map((p) => p.id);
const slots = content.press?.page?.slots.length ?? 0;
const tierCount = content.rules.tiers?.hype?.nameKeys.length ?? 0;
const players = PERSONA_IDS.filter((p) => !isProbe(p));
const t0 = performance.now();

interface Tally {
  months: number;
  led: Record<string, number>;
}
const byPersona = new Map<PersonaId, Tally>();
// The fame meter, player-like runs pooled: per month-end tier.
const meter = Array.from({ length: tierCount }, () => ({ months: 0, share: 0, leadOverwhelmed: 0, anyOverwhelmed: 0, pages: 0, overwhelmedPages: 0, playerLeads: 0, allShare: 0, papersIn: 0 }));
const arcs = new Map<string, { runs: number; differs: number }>();
let rivalBeats = 0;
let rivalShown = 0;
const world = new Map<string, { runs: number; printed: number; distinct: number; repeatedRuns: number; repeats: number; maxPrinted: number; maxOneStory: number }>(
  papers.map((p) => [p, { runs: 0, printed: 0, distinct: 0, repeatedRuns: 0, repeats: 0, maxPrinted: 0, maxOneStory: 0 }]),
);
let playerRuns = 0;

for (const persona of PERSONA_IDS) {
  const tally: Tally = { months: 0, led: Object.fromEntries(papers.map((p) => [p, 0])) };
  byPersona.set(persona, tally);
  for (const seed of runSeeds(SEED, RUNS)) {
    const history: HistoryStep[] = [];
    let before: GameState | null = null;
    runOne(content, persona, seed, (state) => {
      history.push({ before, after: state, events: state.events });
      before = state;
    });
    const months: MonthPress[] = frontPages(history);
    for (const month of months) {
      tally.months++;
      tally.led[month.lead] = (tally.led[month.lead] ?? 0) + 1;
    }
    if (!players.includes(persona)) continue;
    playerRuns++;
    const last = history.at(-1)?.after;
    for (const month of months) {
      const m = meter[month.fameTier];
      const lead = month.pages.find((p) => p.paper === month.lead);
      if (!m || !lead) continue;
      m.months++;
      m.share += playerShare(lead, slots);
      if (lead.overwhelmed) m.leadOverwhelmed++;
      if (month.pages.some((p) => p.overwhelmed)) m.anyOverwhelmed++;
      m.pages += month.pages.length;
      m.overwhelmedPages += month.pages.filter((p) => p.overwhelmed).length;
      // Diagnostics: the player's story as the lead's lead; their share of all three papers; papers they are in.
      if (lead.items[0] && (lead.items[0].kind === 'player' || lead.items[0].kind === 'spillover')) m.playerLeads++;
      m.allShare += month.pages.reduce((n, p) => n + playerShare(p, slots), 0) / Math.max(1, month.pages.length);
      m.papersIn += month.pages.filter((p) => playerShare(p, slots) > 0).length;
      if (month.rival) {
        rivalBeats++;
        if (month.rival.printed) rivalShown++;
      }
    }
    // The rival's year against the player's.
    const arc = last ? rivalArc(last.content, seed) : null;
    if (arc && last?.endingId) {
      const a = arcs.get(arc.id) ?? { runs: 0, differs: 0 };
      a.runs++;
      if (majorOf(last.content, last.endingId) !== arc.major) a.differs++;
      arcs.set(arc.id, a);
    }
    // World pools: what each paper printed this run, and what it printed twice.
    for (const paper of papers) {
      const counts = new Map<string, number>();
      for (const month of months)
        for (const item of month.pages.find((p) => p.paper === paper)?.items ?? []) if (item.kind === 'world' && item.key) counts.set(item.key, (counts.get(item.key) ?? 0) + 1);
      const w = world.get(paper);
      if (!w) continue;
      const printed = [...counts.values()].reduce((a, b) => a + b, 0);
      const repeats = printed - counts.size;
      w.runs++;
      w.printed += printed;
      w.distinct += counts.size;
      w.repeats += repeats;
      if (repeats > 0) w.repeatedRuns++;
      w.maxPrinted = Math.max(w.maxPrinted, printed);
      w.maxOneStory = Math.max(w.maxOneStory, ...counts.values(), 0);
    }
  }
}

const pct = (n: number, d: number) => (d === 0 ? '-' : `${((100 * n) / d).toFixed(1)}%`);
const tierKeys = content.rules.tiers?.hype?.nameKeys ?? [];
const lines: string[] = [`PRESS  seed=${SEED}  ${RUNS} runs x ${PERSONA_IDS.length} personas  (${((performance.now() - t0) / 1000).toFixed(1)}s)`, ''];
lines.push('MONTHS LED BY EACH PAPER  (the lead paper: the one holding the player\'s most prominent story)');
const W = Math.max(12, ...PERSONA_IDS.map((p) => p.length + 3));
lines.push(`  ${'paper'.padEnd(10)}${PERSONA_IDS.map((p) => (isProbe(p) ? `${p}*` : p).padStart(W)).join('')}`);
for (const paper of papers) lines.push(`  ${paper.padEnd(10)}${PERSONA_IDS.map((p) => pct(byPersona.get(p)?.led[paper] ?? 0, byPersona.get(p)?.months ?? 0).padStart(W)).join('')}`);
lines.push('  * = probe', '');
lines.push("THE FAME METER  (player-like runs pooled; by the fame tier at the month's end)");
lines.push(`  ${'tier'.padEnd(12)}${'months'.padStart(8)}${"player's share of the lead page".padStart(34)}${'lead page overwhelmed'.padStart(24)}${'pages overwhelmed'.padStart(20)}${'player leads it'.padStart(18)}${'share of all 3'.padStart(16)}${'papers in'.padStart(11)}`);
meter.forEach((m, i) =>
  lines.push(
    `  ${(tierKeys[i] ?? `tier ${i + 1}`).padEnd(12)}${String(m.months).padStart(8)}${(m.months ? `${((100 * m.share) / m.months).toFixed(1)}%` : '-').padStart(34)}${pct(m.leadOverwhelmed, m.months).padStart(24)}${pct(m.overwhelmedPages, m.pages).padStart(20)}${pct(m.playerLeads, m.months).padStart(18)}${(m.months ? `${((100 * m.allShare) / m.months).toFixed(1)}%` : '-').padStart(16)}${(m.months ? (m.papersIn / m.months).toFixed(2) : '-').padStart(11)}`,
  ),
);
lines.push('');
lines.push("THE RIVAL  (player-like runs; her major is fixed by her arc)");
for (const [id, a] of [...arcs].sort(([x], [y]) => x.localeCompare(y))) lines.push(`  ${id.padEnd(14)} drawn ${pct(a.runs, playerRuns).padStart(6)}   her major differs from the player's in ${pct(a.differs, a.runs)}`);
const allDiffer = [...arcs.values()].reduce((n, a) => n + a.differs, 0);
lines.push(`  all arcs: her major differs from the player's in ${pct(allDiffer, playerRuns)}; her beats made the page ${pct(rivalShown, rivalBeats)} of the time`, '');
lines.push('WORLD POOLS  (player-like runs; every paper is readable every month)');
lines.push(`  ${'paper'.padEnd(10)}${'pool'.padStart(6)}${'printed/run'.padStart(13)}${'distinct/run'.padStart(14)}${'runs with a repeat'.padStart(20)}${'repeats/run'.padStart(13)}${'most/run'.padStart(10)}${'one story, most/run'.padStart(21)}`);
for (const paper of papers) {
  const w = world.get(paper);
  const pool = content.press?.papers.find((p) => p.id === paper)?.world?.length ?? 0;
  if (!w) continue;
  lines.push(
    `  ${paper.padEnd(10)}${String(pool).padStart(6)}${(w.printed / w.runs).toFixed(1).padStart(13)}${(w.distinct / w.runs).toFixed(1).padStart(14)}${pct(w.repeatedRuns, w.runs).padStart(20)}${(w.repeats / w.runs).toFixed(1).padStart(13)}${String(w.maxPrinted).padStart(10)}${String(w.maxOneStory).padStart(21)}`,
  );
}
console.log(lines.join('\n'));
writeFileSync(
  join(ROOT, 'sim/out/press.json'),
  JSON.stringify({ seed: SEED, runs: RUNS, led: Object.fromEntries(byPersona), meter, arcs: Object.fromEntries(arcs), rival: { beats: rivalBeats, shown: rivalShown }, world: Object.fromEntries(world) }, null, 2),
);
