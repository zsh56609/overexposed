// npm run sim:press -- [--runs=1000] [--seed=20260929] [--manager=<id>]
//
// The front pages across a batch (phase 2a, Part E; round 2b): which paper leads each month — per persona,
// by established lane and by fame tier; how often a scandal leads The Daily Flash; the fame meter — how much
// of the lead paper's front page is the player's at each fame tier, and how often a page is overwhelmed; the
// established lane's fallbacks to early; the rival; and the world — repeats overall and in the lead paper,
// saga beats printed. Every run's history is composed the way the UI composes it (core/press.ts frontPages).
// Ids and numbers only.

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { establishedLanes, frontPages, majorOf, playerShare, rivalArc, type GameState, type HistoryStep, type MonthPress } from '../core/index.ts';
import { runOne, runSeeds } from './batch.ts';
import { loadContent } from './content.ts';
import { isProbe, PERSONA_IDS, type PersonaId } from './personas.ts';
import { ROOT } from '../validate/load.ts';

const arg = (name: string, fallback: number) => Number(process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback);
const RUNS = arg('runs', 1000);
const SEED = arg('seed', 20260929);
const MANAGER = process.argv.find((a) => a.startsWith('--manager='))?.split('=')[1];

const content = loadContent();
const papers = (content.press?.papers ?? []).map((p) => p.id);
const flash = content.press?.route.scandal ?? 'flash';
const slots = content.press?.page?.slots.length ?? 0;
const tierCount = content.rules.tiers?.hype?.nameKeys.length ?? 0;
const lanes = ['early', ...(content.rules.lanes ?? [])];
const players = PERSONA_IDS.filter((p) => !isProbe(p));
const t0 = performance.now();

const zeros = (keys: readonly string[]) => Object.fromEntries(keys.map((k) => [k, 0])) as Record<string, number>;
const ledBy = new Map<PersonaId, { months: number; led: Record<string, number> }>();
const byLane = Object.fromEntries(lanes.map((l) => [l, { months: 0, led: zeros(papers) }]));
const byTier = Array.from({ length: tierCount }, () => ({ months: 0, led: zeros(papers) }));
const scandalLead = Array.from({ length: tierCount }, () => ({ months: 0, leadsFlash: 0, flashOnDesk: 0 }));
const meter = Array.from({ length: tierCount }, () => ({ months: 0, share: 0, realShare: 0, leadOverwhelmed: 0, pages: 0, overwhelmedPages: 0, playerLeads: 0, fillerLeads: 0, allShare: 0, papersIn: 0, filler: 0 }));
const fallback = { runs: 0, established: 0, laterEnds: 0, earlyEnds: 0, runsFallingBack: 0, changes: 0 };
const arcs = new Map<string, { runs: number; differs: number }>();
let rivalBeats = 0;
let rivalShown = 0;
const sagas = { beats: 0, printed: 0, byPaper: {} as Record<string, { beats: number; printed: number }> };
const world = new Map<string, { runs: number; printed: number; distinct: number; repeatedRuns: number; repeats: number; maxPrinted: number; maxOneStory: number }>(
  papers.map((p) => [p, { runs: 0, printed: 0, distinct: 0, repeatedRuns: 0, repeats: 0, maxPrinted: 0, maxOneStory: 0 }]),
);
const leadWorld = { runs: 0, read: 0, repeatedRuns: 0, repeats: 0 };
let playerRuns = 0;

for (const persona of PERSONA_IDS) {
  const tally = { months: 0, led: zeros(papers) };
  ledBy.set(persona, tally);
  for (const seed of runSeeds(SEED, RUNS)) {
    const history: HistoryStep[] = [];
    let before: GameState | null = null;
    runOne(content, persona, seed, (state) => {
      history.push({ before, after: state, events: state.events });
      before = state;
    }, { manager: MANAGER });
    const months: MonthPress[] = frontPages(history);
    for (const month of months) {
      tally.months++;
      tally.led[month.lead] = (tally.led[month.lead] ?? 0) + 1;
    }
    if (!players.includes(persona)) continue;
    playerRuns++;
    const last = history.at(-1)?.after;
    // Month by month: the lead paper by lane and tier, the scandal's place, the fame meter.
    for (const month of months) {
      const lane = month.lane ?? 'early';
      const lead = month.pages.find((p) => p.paper === month.lead);
      const l = byLane[lane];
      const t = byTier[month.fameTier];
      if (l) {
        l.months++;
        l.led[month.lead] = (l.led[month.lead] ?? 0) + 1;
      }
      if (t) {
        t.months++;
        t.led[month.lead] = (t.led[month.lead] ?? 0) + 1;
      }
      const sc = scandalLead[month.fameTier];
      if (sc && month.scandals > 0) {
        sc.months++;
        const top = month.pages.find((p) => p.paper === flash)?.items[0];
        if (top?.kind === 'player' && top.line?.kind === 'scandal') sc.leadsFlash++;
        if (month.lead === flash) sc.flashOnDesk++;
      }
      const m = meter[month.fameTier];
      if (m && lead) {
        m.months++;
        m.share += playerShare(lead, slots);
        m.realShare += playerShare(lead, slots, false);
        m.filler += month.pages.reduce((n, p) => n + p.items.filter((i) => i.kind === 'filler').length, 0);
        if (lead.overwhelmed) m.leadOverwhelmed++;
        m.pages += month.pages.length;
        m.overwhelmedPages += month.pages.filter((p) => p.overwhelmed).length;
        if (lead.items[0]?.kind === 'player' || lead.items[0]?.kind === 'spillover') m.playerLeads++;
        if (lead.items[0]?.kind === 'filler') m.fillerLeads++;
        m.allShare += month.pages.reduce((n, p) => n + playerShare(p, slots), 0) / Math.max(1, month.pages.length);
        m.papersIn += month.pages.filter((p) => playerShare(p, slots) > 0).length;
      }
      if (month.rival) {
        rivalBeats++;
        if (month.rival.printed) rivalShown++;
      }
      for (const beat of month.sagas ?? []) {
        sagas.beats++;
        if (beat.printed) sagas.printed++;
        const p = (sagas.byPaper[beat.paper] ??= { beats: 0, printed: 0 });
        p.beats++;
        if (beat.printed) p.printed++;
      }
    }
    // The established lane at each month end: after it first settles, how often it reads early again.
    const laneAt = establishedLanes(history);
    const ends = months.map((m) => laneAt[m.step] ?? null);
    const first = ends.findIndex((x) => x !== null);
    fallback.runs++;
    if (first !== -1) {
      fallback.established++;
      const later = ends.slice(first + 1);
      fallback.laterEnds += later.length;
      const early = later.filter((x) => x === null).length;
      fallback.earlyEnds += early;
      if (early > 0) fallback.runsFallingBack++;
      if (ends.some((x, i) => i > first && x !== null && x !== ends[first])) fallback.changes++;
    }
    // The rival's year against the player's.
    const arc = last ? rivalArc(last.content, seed) : null;
    if (arc && last?.endingId) {
      const a = arcs.get(arc.id) ?? { runs: 0, differs: 0 };
      a.runs++;
      if (majorOf(last.content, last.endingId) !== arc.major) a.differs++;
      arcs.set(arc.id, a);
    }
    // World pools: each paper's one-off stories this run, and what repeated; and what the player read in the
    // lead paper, which is what they mostly see.
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
    const seen = new Map<string, number>();
    for (const month of months)
      for (const item of month.pages.find((p) => p.paper === month.lead)?.items ?? []) if (item.kind === 'world' && item.key) seen.set(item.key, (seen.get(item.key) ?? 0) + 1);
    const read = [...seen.values()].reduce((a, b) => a + b, 0);
    leadWorld.runs++;
    leadWorld.read += read;
    leadWorld.repeats += read - seen.size;
    if (read > seen.size) leadWorld.repeatedRuns++;
  }
}

const pct = (n: number, d: number) => (d === 0 ? '-' : `${((100 * n) / d).toFixed(1)}%`);
const tierKeys = content.rules.tiers?.hype?.nameKeys ?? [];
const lines: string[] = [`PRESS  seed=${SEED}  ${RUNS} runs x ${PERSONA_IDS.length} personas${MANAGER ? `  manager=${MANAGER}` : ''}  (${((performance.now() - t0) / 1000).toFixed(1)}s)`, ''];
const W = Math.max(12, ...PERSONA_IDS.map((p) => p.length + 3));
lines.push("MONTHS LED BY EACH PAPER  (the lead paper: the one holding the player's most prominent story)");
lines.push(`  ${'paper'.padEnd(10)}${PERSONA_IDS.map((p) => (isProbe(p) ? `${p}*` : p).padStart(W)).join('')}`);
for (const paper of papers) lines.push(`  ${paper.padEnd(10)}${PERSONA_IDS.map((p) => pct(ledBy.get(p)?.led[paper] ?? 0, ledBy.get(p)?.months ?? 0).padStart(W)).join('')}`);
lines.push('  * = probe', '');
const table = (title: string, rows: { label: string; months: number; led: Record<string, number> }[]) => {
  lines.push(title, `  ${''.padEnd(14)}${'months'.padStart(8)}${papers.map((p) => p.padStart(10)).join('')}`);
  for (const r of rows) lines.push(`  ${r.label.padEnd(14)}${String(r.months).padStart(8)}${papers.map((p) => pct(r.led[p] ?? 0, r.months).padStart(10)).join('')}`);
  lines.push('');
};
table("LEAD PAPER BY ESTABLISHED LANE  (player-like, pooled; the lane at the month's end)", lanes.map((l) => ({ label: l, ...(byLane[l] ?? { months: 0, led: {} }) })));
table("LEAD PAPER BY FAME TIER  (player-like, pooled; the tier at the month's end)", byTier.map((t, i) => ({ label: tierKeys[i] ?? `tier ${i + 1}`, ...t })));
lines.push('A SCANDAL IN THE DAILY FLASH  (player-like; months in which a scandal printed)');
lines.push(`  ${'tier'.padEnd(14)}${'months'.padStart(8)}${'scandal leads the Flash'.padStart(26)}${'the Flash on the desk'.padStart(24)}`);
scandalLead.forEach((s, i) => lines.push(`  ${(tierKeys[i] ?? `tier ${i + 1}`).padEnd(14)}${String(s.months).padStart(8)}${pct(s.leadsFlash, s.months).padStart(26)}${pct(s.flashOnDesk, s.months).padStart(24)}`));
lines.push('');
lines.push("THE FAME METER  (player-like runs pooled; by the fame tier at the month's end; share = the player's stories, fame filler included, and without it)");
lines.push(`  ${'tier'.padEnd(14)}${'months'.padStart(8)}${'share of lead page'.padStart(20)}${'(real only)'.padStart(13)}${'lead overwhelmed'.padStart(18)}${'pages overwhelmed'.padStart(19)}${'player leads it'.padStart(17)}${'filler leads it'.padStart(17)}${'filler/month'.padStart(14)}${'share of all 3'.padStart(16)}${'papers in'.padStart(11)}`);
const mean = (x: number, n: number) => (n ? `${((100 * x) / n).toFixed(1)}%` : '-');
meter.forEach((m, i) =>
  lines.push(
    `  ${(tierKeys[i] ?? `tier ${i + 1}`).padEnd(14)}${String(m.months).padStart(8)}${mean(m.share, m.months).padStart(20)}${mean(m.realShare, m.months).padStart(13)}${pct(m.leadOverwhelmed, m.months).padStart(18)}${pct(m.overwhelmedPages, m.pages).padStart(19)}${pct(m.playerLeads, m.months).padStart(17)}${pct(m.fillerLeads, m.months).padStart(17)}${(m.months ? (m.filler / m.months).toFixed(2) : '-').padStart(14)}${mean(m.allShare, m.months).padStart(16)}${(m.months ? (m.papersIn / m.months).toFixed(2) : '-').padStart(11)}`,
  ),
);
lines.push('');
lines.push('THE ESTABLISHED LANE  (player-like; with hysteresis, round 2b)');
lines.push(
  `  established by the year's end in ${pct(fallback.established, fallback.runs)} of runs; after it first settles, ${pct(fallback.earlyEnds, fallback.laterEnds)} of later month ends read early again (${pct(fallback.runsFallingBack, fallback.established)} of those runs ever do); it changes lane in ${pct(fallback.changes, fallback.established)}`,
  '',
);
lines.push('THE RIVAL  (player-like runs; her major is fixed by her arc)');
for (const [id, a] of [...arcs].sort(([x], [y]) => x.localeCompare(y))) lines.push(`  ${id.padEnd(14)} drawn ${pct(a.runs, playerRuns).padStart(6)}   her major differs from the player's in ${pct(a.differs, a.runs)}`);
const allDiffer = [...arcs.values()].reduce((n, a) => n + a.differs, 0);
lines.push(`  all arcs: her major differs from the player's in ${pct(allDiffer, playerRuns)}; her beats made the page ${pct(rivalShown, rivalBeats)} of the time`);
if (sagas.beats > 0) {
  lines.push(`  world sagas: ${(sagas.beats / playerRuns).toFixed(1)} beats due a run; ${pct(sagas.printed, sagas.beats)} of them made the page`);
  for (const [paper, p] of Object.entries(sagas.byPaper)) lines.push(`    ${paper.padEnd(10)} ${(p.beats / playerRuns).toFixed(1)} beats due a run, ${pct(p.printed, p.beats)} printed`);
}
lines.push('');
lines.push('WORLD POOLS  (player-like runs; one-off stories; every paper is readable every month)');
lines.push(`  ${'paper'.padEnd(10)}${'pool'.padStart(6)}${'printed/run'.padStart(13)}${'distinct/run'.padStart(14)}${'runs with a repeat'.padStart(20)}${'repeats/run'.padStart(13)}${'most/run'.padStart(10)}${'one story, most/run'.padStart(21)}`);
for (const paper of papers) {
  const w = world.get(paper);
  const pool = content.press?.papers.find((p) => p.id === paper)?.world?.length ?? 0;
  if (!w) continue;
  lines.push(
    `  ${paper.padEnd(10)}${String(pool).padStart(6)}${(w.printed / w.runs).toFixed(1).padStart(13)}${(w.distinct / w.runs).toFixed(1).padStart(14)}${pct(w.repeatedRuns, w.runs).padStart(20)}${(w.repeats / w.runs).toFixed(1).padStart(13)}${String(w.maxPrinted).padStart(10)}${String(w.maxOneStory).padStart(21)}`,
  );
}
lines.push(
  `  in the lead paper (what the player reads by default): ${(leadWorld.read / Math.max(1, leadWorld.runs)).toFixed(1)} world stories a run, ${(leadWorld.repeats / Math.max(1, leadWorld.runs)).toFixed(2)} of them repeats; ${pct(leadWorld.repeatedRuns, leadWorld.runs)} of runs read a repeat there`,
);
console.log(lines.join('\n'));
writeFileSync(
  join(ROOT, 'sim/out/press.json'),
  JSON.stringify({ seed: SEED, runs: RUNS, manager: MANAGER ?? null, led: Object.fromEntries(ledBy), byLane, byTier, scandalLead, meter, fallback, arcs: Object.fromEntries(arcs), rival: { beats: rivalBeats, shown: rivalShown }, sagas, world: Object.fromEntries(world), leadWorld }, null, 2),
);
