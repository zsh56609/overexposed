// Round R11a: the survey's tables, read back from survey.json's data. Pure functions of the data: the same data gives the same text.
// "Mixed" below is the mixed player's two cells (one per manager) added together; every percentage is a ratio of integer counts.

import { renderInventory } from './inventory-tables.ts';

type Counts = Record<string, number>;
interface TypeCounts { shown: number[]; repeat: number[]; union: number[]; hist: Record<string, number[]> }
interface GroupCounts { any: number; twoYears: number; repeated: number; adjPairs: number; adjSame: number }
interface SlotCounts { n: number; empty: number; how: Counts; pool0: Counts; pool1: Counts; memoryEmptied: number; reasons: Record<string, Counts>; chosen: Counts; inPool: Counts }
interface CellCounts {
  cell: { id: string; strategy: string; manager: string };
  sequences: number;
  types: Record<string, TypeCounts>;
  groups: Record<string, Record<string, GroupCounts>>;
  slots: Record<string, SlotCounts>;
  context: Record<string, number[]>;
  offerAct: Record<string, { years: number; distinct: number; shown: number }>;
  scandalAct: Record<string, { years: number; distinct: number; total: number }>;
  worldAct: Record<string, { years: number; distinct: number; shown: number }>;
  endings: { distinctMinorHist: number[]; distinctMajorHist: number[]; distinctAwardsHist: number[]; sameMinor3: number; sameMajor3: number; sameMinorAll5: number; maxMinorHist: number[] };
  strategyYears: Counts;
  eventsAgain: { shownYear: number[]; again: number[] };
}
export interface SurveyData {
  flags: { sequences: number; seed: number };
  cells: string[];
  inventory: any;
  pools: Record<string, Record<string, string[]>>;
  gateText: Record<string, Record<string, string>>;
  eventMonths: number[];
  results: Record<string, CellCounts>;
}

const YEARS = 5;
const LABEL: Record<string, string> = {
  card_offered: 'cards offered in drafts', card_taken: 'cards drafted', card_played: 'cards played',
  event: 'between-month events', chain: 'event chains (any step)',
  scandal_card: 'scandal cards crystallised',
  door: 'doors offered', door_taken: 'doors taken',
  ending_minor: 'minor endings', ending_major: 'major endings', award: 'awards',
  once_text: 'once-a-run texts (variant)', manager_msg: "manager's lines (variant)", headline: 'newspaper items, every paper (variant)', headline_desk: 'newspaper items, the lead paper only (variant)',
  play_line: "player's printed headlines (variant)", inhand_line: 'scandal in-hand lines (variant)', event_line: "events' printed answers (variant)",
};
const MAIN_TYPES = ['card_offered', 'card_taken', 'card_played', 'event', 'chain', 'scandal_card', 'door', 'door_taken', 'ending_minor', 'ending_major', 'award', 'once_text', 'manager_msg', 'headline', 'headline_desk', 'play_line', 'inhand_line', 'event_line'];
const VARIANT_TYPES = ['once_text', 'manager_msg', 'headline', 'play_line', 'inhand_line', 'event_line'];

const pct = (x: number, d = 1) => `${(100 * x).toFixed(d)}%`;
const f2 = (x: number) => x.toFixed(2);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const table = (head: string[], rows: (string | number)[][]) => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');

export function renderTables(data: SurveyData): string {
  const R = data.results;
  const cells = Object.values(R);
  const N = data.flags.sequences;
  const mixedCells = cells.filter((c) => c.cell.strategy === 'mixed');
  const poolOf = (type: string, manager: string) => data.pools[type]?.[manager] ?? [];
  const out: string[] = [];
  const h = (t: string) => out.push(`\n## ${t}\n`);
  out.push('# A. Inventory (counted from the content files)\n');
  out.push(renderInventory(data.inventory));
  out.push('\n# B. Five years in a row (measured by the simulation)\n');

  /** Pooled per-year numbers of a type over a selection of cells. */
  const pooled = (type: string, sel: CellCounts[]) => {
    const shown = zeros(), repeat = zeros(), union = zeros();
    let seqs = 0, poolSeq = 0;
    for (const c of sel) {
      const t = c.types[type];
      seqs += c.sequences;
      poolSeq += c.sequences * poolOf(type, c.cell.manager).length;
      if (!t) continue;
      for (let k = 0; k < YEARS; k++) { shown[k] = (shown[k] as number) + (t.shown[k] as number); repeat[k] = (repeat[k] as number) + (t.repeat[k] as number); union[k] = (union[k] as number) + (t.union[k] as number); }
    }
    return { shown, repeat, union, seqs, poolSeq, poolSize: sel.length ? poolOf(type, (sel[0] as CellCounts).cell.manager).length : 0 };
  };
  function zeros() { return Array.from({ length: YEARS }, () => 0); }
  const firstOver = (p: ReturnType<typeof pooled>): string => {
    for (let k = 1; k < YEARS; k++) if ((p.shown[k] as number) > 0 && (p.repeat[k] as number) / (p.shown[k] as number) > 0.5) return `year ${k + 1}`;
    return 'none in 5';
  };
  const repeatRow = (type: string, sel: CellCounts[]) => {
    const p = pooled(type, sel);
    const rates = p.shown.map((s, k) => (k === 0 ? '-' : s === 0 ? 'n/a' : pct((p.repeat[k] as number) / s)));
    return { p, rates };
  };

  // ---- 1. Repeat-rate table, mixed player
  h('T1. Repeat rate by year — mixed player (both managers added)');
  out.push(`Repeat rate of year k = of the distinct items shown in year k, the share already shown in years 1..k-1. ${mixedCells.reduce((n, c) => n + c.sequences, 0)} five-year sequences. Year 1 is always "-" (nothing before it).\n`);
  out.push(table(['type', 'pool', 'items/yr (Y1..Y5)', 'Y2', 'Y3', 'Y4', 'Y5', 'first year > 50%'], MAIN_TYPES.map((t) => {
    const { p, rates } = repeatRow(t, mixedCells);
    return [LABEL[t] as string, p.poolSize, p.shown.map((s) => f2(s / p.seqs)).join(' / '), rates[1] as string, rates[2] as string, rates[3] as string, rates[4] as string, firstOver(p)];
  })));

  h('T2. Coverage — mixed player: share of the whole pool seen after k years');
  out.push(table(['type', 'pool', 'after 1', 'after 2', 'after 3', 'after 4', 'after 5'], MAIN_TYPES.map((t) => {
    const p = pooled(t, mixedCells);
    return [LABEL[t] as string, p.poolSize, ...p.union.map((u) => pct(u / p.poolSeq))];
  })));

  h('T3. Repeat rate and coverage by cell (strategy × manager) — events, cards offered, newspaper items');
  for (const type of ['event', 'card_offered', 'headline', 'once_text']) {
    out.push(`\n**${LABEL[type]}** — repeat rate Y2..Y5 · first year > 50% · coverage after 5 years\n`);
    out.push(table(['cell', 'Y2', 'Y3', 'Y4', 'Y5', 'first > 50%', 'coverage Y5', 'items/yr'], cells.map((c) => {
      const { p, rates } = repeatRow(type, [c]);
      return [c.cell.id, rates[1] as string, rates[2] as string, rates[3] as string, rates[4] as string, firstOver(p), pct((p.union[4] as number) / p.poolSeq), f2(sum(p.shown) / YEARS / p.seqs)];
    })));
  }

  // ---- 4. Slots
  const inv = data.inventory;
  const rows: { kind: string; slot: string; candidates: number; slots: number; ratio: number; note: string }[] = [];
  h('T4a. Event slots (one event or none per event month) — mixed player, pooled');
  const eventSlotRows: (string | number)[][] = [];
  const evList = inv.events.list as { id: string; from: number; to: number; condition: string; chain: string | null }[];
  const slotAgg: Record<string, SlotCounts> = {};
  for (const c of mixedCells) for (const [turn, s] of Object.entries(c.slots)) {
    const a = (slotAgg[turn] ??= { n: 0, empty: 0, how: {}, pool0: {}, pool1: {}, memoryEmptied: 0, reasons: {}, chosen: {}, inPool: {} });
    a.n += s.n; a.empty += s.empty; a.memoryEmptied += s.memoryEmptied;
    for (const k of ['how', 'pool0', 'pool1', 'chosen', 'inPool'] as const) for (const [x, v] of Object.entries(s[k])) a[k][x] = (a[k][x] ?? 0) + v;
    for (const [id, rs] of Object.entries(s.reasons)) for (const [why, v] of Object.entries(rs)) ((a.reasons[id] ??= {})[why] = (a.reasons[id]?.[why] ?? 0) + v);
  }
  const histStats = (hist: Counts) => {
    const entries = Object.entries(hist).map(([k, v]) => [Number(k), v] as const).sort((a, b) => a[0] - b[0]);
    const n = sum(entries.map(([, v]) => v));
    const mean = n === 0 ? 0 : sum(entries.map(([k, v]) => k * v)) / n;
    const q = (p: number) => { let acc = 0; for (const [k, v] of entries) { acc += v; if (acc >= p * n) return k; } return 0; };
    const le = (x: number) => sum(entries.filter(([k]) => k <= x).map(([, v]) => v)) / (n || 1);
    return { n, mean, p10: q(0.1), median: q(0.5), min: entries[0]?.[0] ?? 0, max: entries.at(-1)?.[0] ?? 0, le0: le(0), le1: le(1), le2: le(2) };
  };
  for (const m of data.eventMonths) {
    const s = slotAgg[String(m)];
    if (!s) continue;
    const a = histStats(s.pool0);
    const b = histStats(s.pool1);
    const window = evList.filter((e) => m >= e.from && m <= e.to).length;
    eventSlotRows.push([m, inv.events.byMonth.find((x: any) => x.month === m)?.season, window, f2(a.mean), a.min, a.p10, a.median, pct(a.le0), pct(a.le1), pct(a.le2), f2(b.mean), pct(s.memoryEmptied / s.n), pct((s.how.followUp ?? 0) / s.n), pct((s.how.first ?? 0) / s.n)]);
    rows.push({ kind: 'event month', slot: `month ${m}`, candidates: a.mean, slots: 1, ratio: a.mean, note: `${window} events have this month in their window; median ${a.median}, <=1 candidate in ${pct(a.le1)}, empty ${pct(a.le0)}; a follow-up takes it ${pct((s.how.followUp ?? 0) / s.n)}` });
  }
  out.push('Candidates = events eligible at the moment the slot opens (window, rival year, condition, chain open, not met) before the last year\'s memory is applied; a follow-up that takes the slot counts as 1.\n');
  out.push(table(['month', 'season', 'events in window', 'mean candidates', 'min', 'p10', 'median', 'none', '<=1', '<=2', 'mean after memory', 'memory empties pool', 'follow-up takes slot', 'first-marked takes slot'], eventSlotRows));

  h('T4b. Event slots in detail — who can fill each slot, and what keeps the rest out (mixed, pooled)');
  for (const m of data.eventMonths) {
    const s = slotAgg[String(m)];
    if (!s) continue;
    out.push(`\n**Month ${m}** (${s.n} slot-years). Candidate = in the pool when the slot opened; chosen = actually shown.\n`);
    const lines = evList
      .map((e) => {
        const cand = (s.inPool[e.id] ?? 0) / s.n;
        const chosen = (s.chosen[e.id] ?? 0) / s.n;
        const why = Object.entries(s.reasons[e.id] ?? {}).filter(([w]) => w !== 'candidate').sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]));
        const top = why.slice(0, 2).map(([w, v]) => `${w} ${pct(v / s.n, 0)}`).join('; ');
        return { id: e.id, cand, chosen, top };
      })
      .filter((e) => e.cand > 0 || e.chosen > 0 || m >= (evList.find((x) => x.id === e.id)?.from ?? 99))
      .sort((x, y) => y.cand - x.cand || x.id.localeCompare(y.id));
    out.push(table(['event', 'candidate', 'chosen', 'what keeps it out otherwise'], lines.map((e) => [e.id, pct(e.cand), pct(e.chosen), e.top])));
  }

  // other pools
  h('T4c. Other pools — candidates against slots filled in a year (mixed, pooled)');
  const mixedYears = mixedCells.reduce((n, c) => n + c.sequences * YEARS, 0);
  const doors = inv.doors as { act: number; offeredPerSeason: number; gates: unknown[] }[];
  rows.push({ kind: 'doors', slot: 'each season (4 slots)', candidates: Math.min(...doors.map((d) => d.gates.length)), slots: doors[0]?.offeredPerSeason ?? 2, ratio: 1, note: `${doors.map((d) => d.gates.length).join('/')} doors exist per season, ${doors[0]?.offeredPerSeason} are offered: every door is offered every year` });
  for (const a of inv.cards.byAct as { act: number; pool: number; offerSlots: number; scandalPool: string[] }[]) {
    const shown = sum(mixedCells.map((c) => c.offerAct[String(a.act)]?.shown ?? 0));
    const distinct = sum(mixedCells.map((c) => c.offerAct[String(a.act)]?.distinct ?? 0));
    const yrs = sum(mixedCells.map((c) => c.offerAct[String(a.act)]?.years ?? 0));
    rows.push({ kind: 'card offers', slot: `season ${a.act}`, candidates: a.pool, slots: shown / yrs, ratio: a.pool / (shown / yrs), note: `${a.pool} draftable cards, ${f2(shown / yrs)} cards shown per year in the season (${f2(distinct / yrs)} distinct)` });
    const crystallised = sum(mixedCells.map((c) => c.scandalAct[String(a.act)]?.total ?? 0)) / mixedYears;
    const scandalYears = sum(mixedCells.map((c) => c.scandalAct[String(a.act)]?.distinct ?? 0)) / mixedYears;
    rows.push({ kind: 'scandal cards', slot: `season ${a.act}`, candidates: a.scandalPool.length, slots: crystallised, ratio: crystallised > 0 ? a.scandalPool.length / crystallised : 99, note: `${a.scandalPool.length} scandal cards available, ${f2(crystallised)} crystallised per year in the season (${f2(scandalYears)} distinct)` });
  }
  for (const p of inv.press.papers as { id: string; world: number; worldAlways: number; worldByAct: number[] }[])
    for (let act = 1; act <= 4; act++) {
      const key = `${p.id}|${act}`;
      const shown = sum(mixedCells.map((c) => c.worldAct[key]?.shown ?? 0)) / mixedYears;
      const cand = p.worldAlways + (p.worldByAct[act - 1] ?? 0);
      rows.push({ kind: 'world stories', slot: `${p.id}, season ${act}`, candidates: cand, slots: shown, ratio: shown > 0 ? cand / shown : 99, note: `${cand} stories can print (${p.worldAlways} any season + ${p.worldByAct[act - 1]} this season's), ${f2(shown)} printed per year in the season` });
    }
  const onceGroups = inv.oneTimeTexts.groups as { id: string; variants: number }[];
  const two = onceGroups.filter((g) => g.variants <= 2);
  rows.push({ kind: 'once-a-run texts', slot: `${two.length} groups of ${onceGroups.length} with <= 2 variants`, candidates: 2, slots: 1, ratio: 2, note: 'one variant shown per group per year; with the last year\'s variant barred, a 2-variant group alternates' });
  const ranked = [...rows].sort((a, b) => a.ratio - b.ratio || a.slot.localeCompare(b.slot));
  out.push(table(['rank', 'pool', 'slot', 'candidates', 'slots filled / year', 'candidates per slot', 'note'], ranked.map((r, i) => [i + 1, r.kind, r.slot, f2(r.candidates), f2(r.slots), r.ratio >= 99 ? 'n/a' : f2(r.ratio), r.note])));

  // ---- 5. Top 20
  const rate = (type: string, id: string, sel: CellCounts[]) => {
    let seen = 0, years = 0, ge4 = 0, ge3 = 0, seqs = 0;
    for (const c of sel) {
      if (!poolOf(type, c.cell.manager).includes(id) && poolOf(type, c.cell.manager).length > 0) continue;
      const hist = c.types[type]?.hist[id] ?? [];
      for (let n = 1; n <= YEARS; n++) { const v = hist[n] ?? 0; seen += v; years += n * v; if (n >= 4) ge4 += v; if (n >= 3) ge3 += v; }
      seqs += c.sequences;
    }
    return { rate: years / (YEARS * (seqs || 1)), ge4: ge4 / (seqs || 1), ge3: ge3 / (seqs || 1), ever: seen / (seqs || 1), seqs };
  };
  const allItems = (type: string) => poolOf(type, '*').length ? poolOf(type, '*') : [];
  h('T5. The items seen most often — mixed player');
  const ranking: { type: string; id: string; rate: number; ge4: number; ge3: number }[] = [];
  for (const t of MAIN_TYPES)
    for (const id of allItems(t)) { const r = rate(t, id, mixedCells); if (r.rate > 0) ranking.push({ type: t, id, rate: r.rate, ge4: r.ge4, ge3: r.ge3 }); }
  ranking.sort((a, b) => b.rate - a.rate || b.ge4 - a.ge4 || a.id.localeCompare(b.id));
  const CONTENT_TYPES = ['card_offered', 'card_played', 'event', 'chain', 'scandal_card', 'ending_minor', 'award'];
  out.push('The 20 most-seen items among cards, events, scandal cards, minor endings and awards (doors, drafted cards and major endings left out; the text variants follow below). Share of years = of the 5N year-runs, the share that show the item; ties broken by "4+ of 5".\n');
  out.push(table(['#', 'type', 'item', 'share of years seen', 'seen in 4+ of 5 years', 'in 3+ of 5'], ranking.filter((r) => CONTENT_TYPES.includes(r.type)).slice(0, 20).map((r, i) => [i + 1, r.type, r.id, pct(r.rate), pct(r.ge4, 0), pct(r.ge3, 0)])));
  out.push('\nThe 10 most-seen of each type (events and cards offered in full):\n');
  for (const t of ['event', 'card_offered', 'card_played', 'scandal_card', 'ending_minor', 'award']) {
    const list = ranking.filter((r) => r.type === t).slice(0, t === 'event' || t === 'card_offered' ? 20 : 10);
    out.push(`- **${LABEL[t]}**: ${list.map((r) => `${r.id} ${pct(r.rate, 0)} (4+ of 5: ${pct(r.ge4, 0)})`).join(', ')}`);
  }
  out.push('\nText variants: how many items are seen in 99%+ of years (every year, in effect), and the first ones:\n');
  for (const t of VARIANT_TYPES.concat(['headline_desk'])) {
    const all = ranking.filter((r) => r.type === t);
    out.push(`- **${LABEL[t]}**: ${all.filter((r) => r.rate >= 0.99).length} of ${allItems(t).length} items in 99%+ of years; ${all.filter((r) => r.rate >= 0.5).length} in half the years or more; next: ${all.filter((r) => r.rate < 0.99).slice(0, 5).map((r) => `${r.id} ${pct(r.rate, 0)}`).join(', ')}`);
  }
  out.push('\nDoors and major endings (structural):\n');
  for (const t of ['door', 'ending_major']) out.push(`- **${LABEL[t]}**: ${allItems(t).map((id) => `${id} ${pct(rate(t, id, mixedCells).rate, 0)}`).join(', ')}`);

  // ---- 6. Rare
  h('T6. Items seen in under 2% of years — mixed player, with the gate that keeps them out');
  const rareCounts: (string | number)[][] = [];
  const rareLists: string[] = [];
  for (const t of MAIN_TYPES) {
    const ids = allItems(t);
    const rare = ids.filter((id) => rate(t, id, mixedCells).rate < 0.02);
    const never = rare.filter((id) => rate(t, id, mixedCells).ever === 0);
    rareCounts.push([LABEL[t] as string, ids.length, rare.length, never.length]);
    const detail = ['event', 'card_offered', 'card_played', 'card_taken', 'scandal_card', 'ending_minor', 'ending_major', 'award', 'door', 'chain'].includes(t) || rare.length <= 40;
    if (rare.length > 0 && detail) rareLists.push(`\n**${LABEL[t]}** (${rare.length} of ${ids.length}):\n\n` + table(['item', 'share of years', 'gate / what keeps it out'], rare.map((id) => [id, pct(rate(t, id, mixedCells).rate, 2), data.gateText[t]?.[id] ?? ''])));
    else if (rare.length > 0) rareLists.push(`\n**${LABEL[t]}**: ${rare.length} of ${ids.length} items (${never.length} never seen); full list in survey.json (hist per item). By group: ` + groupCounts(rare));
  }
  out.push(table(['type', 'items in pool', 'under 2% of years', 'of them never seen'], rareCounts));
  out.push(...rareLists);
  {
    out.push('\nUnder 5% of years for the mixed player, with the best single strategy\'s rate (both managers pooled) — the items nobody reaches are those under 2% for every strategy:\n');
    const stratIds = [...new Set(cells.map((c) => c.cell.strategy))].filter((s) => s !== 'mixed');
    const near: (string | number)[][] = [];
    for (const t of ['event', 'card_offered', 'card_played', 'scandal_card', 'ending_minor', 'award']) {
      for (const id of allItems(t)) {
        const r = rate(t, id, mixedCells).rate;
        let best = 0;
        let bestS = '';
        for (const s of stratIds) {
          const rs = rate(t, id, cells.filter((c) => c.cell.strategy === s)).rate;
          if (rs > best) { best = rs; bestS = s; }
        }
        if (r < 0.05 || best < 0.02) near.push([LABEL[t] as string, id, pct(r, 2), `${pct(best, 2)} (${bestS})`, best < 0.02 ? '**under 2% for every strategy**' : '', data.gateText[t]?.[id] ?? '']);
      }
    }
    out.push(table(['type', 'item', 'mixed, share of years', 'best strategy', '', 'gate'], near));
  }

  // ---- 7. Endings and awards
  h('T7. Endings and awards across five years — mixed player');
  const endTotals = mixedCells.reduce((a, c) => ({ seq: a.seq + c.sequences, m3: a.m3 + c.endings.sameMinor3, M3: a.M3 + c.endings.sameMajor3, m5: a.m5 + c.endings.sameMinorAll5 }), { seq: 0, m3: 0, M3: 0, m5: 0 });
  const addHist = (key: 'distinctMinorHist' | 'distinctMajorHist' | 'distinctAwardsHist' | 'maxMinorHist') => { const o: number[] = []; for (const c of mixedCells) c.endings[key].forEach((v, i) => (o[i] = (o[i] ?? 0) + v)); return o; };
  const hist = (hs: number[]) => hs.map((v, i) => [i, pct(v / endTotals.seq)]).filter((_, i) => (hs[i] ?? 0) > 0);
  out.push('Distinct minor endings seen in five years:\n');
  out.push(table(['distinct', 'share of sequences'], hist(addHist('distinctMinorHist')) as string[][]));
  out.push('\nDistinct major endings:\n');
  out.push(table(['distinct', 'share of sequences'], hist(addHist('distinctMajorHist')) as string[][]));
  out.push(`\nSame minor ending 3 or more times in five years: **${pct(endTotals.m3 / endTotals.seq)}**; all five years the same minor: ${pct(endTotals.m5 / endTotals.seq)}; same major 3 or more times: ${pct(endTotals.M3 / endTotals.seq)}.\n`);
  out.push('Most times one minor ending came (sequences):\n');
  out.push(table(['times', 'share'], hist(addHist('maxMinorHist')) as string[][]));
  out.push('\nDistinct awards won after five years (of 12 awards, one of them the fallback):\n');
  out.push(table(['distinct awards', 'share of sequences'], hist(addHist('distinctAwardsHist')) as string[][]));
  const awardRows = allItems('award').map((id) => { const r = rate('award', id, mixedCells); return [id, pct(r.rate, 2), pct(r.ever, 1), data.gateText.award?.[id] ?? '']; });
  out.push('\nEach award: share of years won, share of sequences that win it at least once in five years:\n');
  out.push(table(['award', 'share of years', 'ever in 5 years', 'conditions'], awardRows));
  const endRows = allItems('ending_minor').map((id) => { const r = rate('ending_minor', id, mixedCells); return [id, pct(r.rate, 2), pct(r.ever, 1), data.gateText.ending_minor?.[id] ?? '']; });
  out.push('\nEach minor ending:\n');
  out.push(table(['ending', 'share of years', 'ever in 5 years', 'major: condition'], endRows));

  // ---- 8. Variants
  h('T8. Reading the same variant twice within five years — mixed player');
  out.push('A group "repeats" in a sequence when one of its variants shows in two or more different years. Chance = among sequences in which the group showed in 2+ years. "Same as the year before" counts neighbouring years in which the group showed in both: how often a variant of year k-1 comes straight back in year k.\n');
  const vrows: (string | number)[][] = [];
  const vsum: Record<string, { two: number; rep: number; pairs: number; same: number; groups: number }> = {};
  const merged: Record<string, Record<string, GroupCounts>> = {};
  for (const t of VARIANT_TYPES) {
    merged[t] = {};
    for (const c of mixedCells) for (const [g, gc] of Object.entries(c.groups[t] ?? {})) {
      const a = (merged[t] as Record<string, GroupCounts>)[g] ?? { any: 0, twoYears: 0, repeated: 0, adjPairs: 0, adjSame: 0 };
      a.any += gc.any; a.twoYears += gc.twoYears; a.repeated += gc.repeated; a.adjPairs += gc.adjPairs; a.adjSame += gc.adjSame;
      (merged[t] as Record<string, GroupCounts>)[g] = a;
    }
    const gs = Object.values(merged[t] as Record<string, GroupCounts>);
    const s = { two: sum(gs.map((g) => g.twoYears)), rep: sum(gs.map((g) => g.repeated)), pairs: sum(gs.map((g) => g.adjPairs)), same: sum(gs.map((g) => g.adjSame)), groups: gs.length };
    vsum[t] = s;
    vrows.push([LABEL[t] as string, s.groups, s.two === 0 ? 'n/a' : pct(s.rep / s.two), s.pairs === 0 ? 'n/a' : pct(s.same / s.pairs)]);
  }
  out.push(table(['text', 'groups shown', 'chance a group reads the same variant twice in 5 years (given shown in 2+ years)', 'same variant as the year before (given shown both years)'], vrows));
  out.push('\nOnce-a-run text groups, one by one (variants: from content):\n');
  const onceVar = Object.fromEntries((inv.oneTimeTexts.groups as { id: string; variants: number }[]).map((g) => [g.id, g.variants]));
  const onceRows = Object.entries(merged.once_text as Record<string, GroupCounts>).map(([g, gc]) => [g, onceVar[g] ?? '?', gc.any, gc.twoYears === 0 ? 'n/a' : pct(gc.repeated / gc.twoYears), gc.adjPairs === 0 ? 'n/a' : pct(gc.adjSame / gc.adjPairs)]);
  out.push(table(['group', 'variants', 'sequences shown', 'same variant twice in 5 years', 'same as year before'], onceRows as (string | number)[][]));
  // Groups with highest repeat chance per type (top 8 by shown-2+ volume)
  for (const t of ['play_line', 'manager_msg', 'headline', 'inhand_line']) {
    const gs = Object.entries(merged[t] as Record<string, GroupCounts>).filter(([, g]) => g.twoYears >= 200).map(([id, g]) => ({ id, chance: g.repeated / g.twoYears, n: g.twoYears })).sort((a, b) => b.chance - a.chance).slice(0, 8);
    out.push(`\n${LABEL[t]}: the groups most likely to repeat a variant (groups shown in 2+ years in at least 200 sequences): ${gs.map((g) => `${g.id} ${pct(g.chance, 0)}`).join(', ')}`);
  }

  // ---- 9. Context
  h('T9. Per year, for context — mixed player (means per year)');
  const ctxNames = ['cardsPlayed', 'offersTaken', 'cardsOffered', 'events', 'scandalsPrinted', 'scandalsCrystallised'];
  const seqMixed = mixedCells.reduce((n, c) => n + c.sequences, 0);
  out.push(table(['per year', 'Y1 (new player)', 'Y2', 'Y3', 'Y4', 'Y5'], ctxNames.map((n) => [n, ...Array.from({ length: YEARS }, (_, k) => f2(sum(mixedCells.map((c) => c.context[n]?.[k] ?? 0)) / seqMixed))])));
  out.push(`\nEvents met in a year that the year before also met (memory working): ${Array.from({ length: YEARS - 1 }, (_, i) => `Y${i + 2} ${pct(sum(mixedCells.map((c) => c.eventsAgain.again[i + 1] ?? 0)) / Math.max(1, sum(mixedCells.map((c) => c.eventsAgain.shownYear[i + 1] ?? 0))))}`).join(', ')}.`);
  out.push(`\nStrategies drawn by the mixed player (years): ${Object.entries(mixedCells.reduce<Counts>((a, c) => { for (const [k, v] of Object.entries(c.strategyYears)) a[k] = (a[k] ?? 0) + v; return a; }, {})).sort(([x], [y]) => x.localeCompare(y)).map(([k, v]) => `${k} ${v}`).join(', ')}.`);
  out.push(`\nSequences per cell: ${N}. Cells: ${data.cells.join(', ')}.`);

  // ---- Per-strategy summary for events
  h('T10. Per cell: events per year, distinct events after 5 years, minor endings distinct, awards distinct');
  out.push(table(['cell', 'events / yr', 'distinct events after 5', 'distinct minors (mean)', 'same minor 3+ times', 'distinct awards (mean)'], cells.map((c) => {
    const p = pooled('event', [c]);
    const dm = c.endings.distinctMinorHist.reduce((a, v, i) => a + v * i, 0) / c.sequences;
    const da = c.endings.distinctAwardsHist.reduce((a, v, i) => a + v * i, 0) / c.sequences;
    return [c.cell.id, f2(sum(p.shown) / YEARS / p.seqs), f2((p.union[4] as number) / p.seqs), f2(dm), pct(c.endings.sameMinor3 / c.sequences), f2(da)];
  })));
  return `${out.join('\n')}\n`;
}

function groupCounts(ids: string[]): string {
  const by: Counts = {};
  for (const id of ids) { const g = id.split('|')[0] as string; by[g] = (by[g] ?? 0) + 1; }
  const top = Object.entries(by).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 12);
  return top.map(([g, n]) => `${g} ${n}`).join(', ') + (Object.keys(by).length > 12 ? `, … (${Object.keys(by).length} groups)` : '');
}
