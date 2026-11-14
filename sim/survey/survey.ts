// Round R11a: the content survey (measure only). What a player sees across five consecutive years, with the between-run
// memory working as in the game.
//
//   node sim/survey/survey.ts [--sequences=2000] [--seed=20261114] [--workers=<n>] [--out=sim/survey/results]
//
// Writes <out>/survey.json (the inventory and every cell's raw counts) and <out>/tables.md (the tables the report quotes).
// Seeded and deterministic: all counts are integers merged in a fixed order, no timings reach the files, so two runs with
// the same flags write identical bytes. Changes nothing the game or the sim reads; it only imports /core, /sim and /validate.
//
// How a five-year sequence is played: year 1 as a new player's (skipFirstDraft: the first month opens without offers, as
// a run made with the manager's notes on does, ui/App.tsx makeRun); years 2-5 as a returning player's, from the memory the
// UI keeps (ui/memory.ts, reproduced below in `nextMemory`): the events the latest earlier run met (when it met any), and for
// each once-a-run text group the variant last shown. Everything else the memory touches is core's, run by core.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMainThread, parentPort, Worker, workerData } from 'node:worker_threads';
import {
  cursor,
  deriveSeed,
  establishedLanes,
  eventCandidates,
  evaluate,
  explainCondition,
  frontPages,
  getEvent,
  LineCounter,
  managerMessages,
  monthEndLines,
  nextInt,
  NO_MEMORY,
  onceItem,
  rivalArc,
  runChains,
  seedRng,
  yearAwards,
  type ClauseReport,
  type Content,
  type EventDef,
  type GameState,
  type HistoryStep,
  type RunMemory,
} from '../../core/index.ts';
import { ROOT, loadRawContent } from '../../validate/load.ts';
import { variantGroups } from '../../validate/validate.ts';
import { runOne } from '../batch.ts';
import { loadContent } from '../content.ts';
import { isProbe, PERSONA_IDS } from '../personas.ts';
import { buildInventory, conditionText } from './inventory.ts';

const YEARS = 5;
const MIXED = 'mixed';
/** The strategy a "mixed" player draws from each year: the player-like personas (not the control or lane probes). */
const MIX_POOL = PERSONA_IDS.filter((p) => !isProbe(p));

/** Types of item the survey follows. `variant` ones are (group|key) pairs; the rest are ids. */
export const TYPES = [
  'card_offered', 'card_taken', 'card_played',
  'event', 'chain',
  'scandal_card',
  'door', 'door_taken',
  'ending_minor', 'ending_major', 'award',
  'once_text', 'manager_msg', 'headline', 'headline_desk', 'play_line', 'inhand_line', 'event_line',
] as const;
export type ItemType = (typeof TYPES)[number];
export const VARIANT_TYPES: readonly ItemType[] = ['once_text', 'manager_msg', 'headline', 'play_line', 'inhand_line', 'event_line'];

interface Cell { readonly id: string; readonly strategy: string; readonly manager: string }

// ---------------------------------------------------------------------------------------------------------------------
// One year

interface SlotInfo {
  readonly turn: number;
  /** 'followUp' | 'first' | 'draw' */
  readonly how: string;
  readonly chosen: string;
  /** Eligible openers/one-offs before the memory's filter; after it. */
  readonly pool0: number;
  readonly pool1: number;
  /** The last year's events were all that was eligible: the draw fell back to them. */
  readonly memoryFell: boolean;
  readonly poolIds0: readonly string[];
  readonly reasons: Readonly<Record<string, string>>;
}

interface YearData {
  readonly items: Record<string, Set<string>>;
  readonly groups: Record<string, Record<string, Set<string>>>;
  readonly slots: SlotInfo[];
  readonly context: { cardsPlayed: number; offersTaken: number; events: number; scandalsPrinted: number; scandalsCrystallised: number; cardsOffered: number };
  readonly offerAct: Record<number, { distinct: number; shown: number }>;
  readonly scandalAct: Record<number, { distinct: number; total: number }>;
  readonly worldAct: Record<string, { distinct: number; shown: number }>;
  readonly onceShown: Record<string, string>;
  readonly eventIds: string[];
  readonly endingId: string;
  readonly majorId: string;
  readonly persona: string;
}

const rangeText = (key: string, r: { min?: number; max?: number }) => `${key}${r.min !== undefined ? `>=${r.min}` : ''}${r.max !== undefined ? `<=${r.max}` : ''}`;
function unmetText(report: ClauseReport, held: Readonly<Record<string, true>>): string {
  if (report.key === 'flags') {
    const t = report.test;
    const parts: string[] = [];
    const missing = (t.all ?? []).filter((f) => !(f in held));
    if (missing.length) parts.push(`needs ${missing.join(',')}`);
    if (t.any?.length && !t.any.some((f) => f in held)) parts.push(`needs one of ${t.any.join(',')}`);
    const blocked = (t.not ?? []).filter((f) => f in held);
    if (blocked.length) parts.push(`blocked by ${blocked.join(',')}`);
    return `flags: ${parts.join('; ')}`;
  }
  if (report.key === 'unknown') return `unknown ${report.name}`;
  return rangeText(report.key, report.range);
}

/** Why each event is, or is not, a candidate at the slot this state has just opened (the draw's own rules, core/events.ts). */
function slotOf(state: GameState, content: Content): SlotInfo {
  const without = eventCandidates({ ...state, memory: NO_MEMORY });
  const withMemory = eventCandidates(state);
  const rules = content.rules.events;
  const met = new Set(state.eventLog.map((r) => r.eventId));
  const arc = rivalArc(state.content, state.seed)?.id;
  const chains = runChains(state);
  const last = content.rules.acts * content.rules.turnsPerAct;
  const inFresh = new Set(withMemory.pool.map((p) => p.event.id));
  const inPool0 = new Set(without.pool.map((p) => p.event.id));
  const firstRun = without.pool.length > 0 && without.pool.every((p) => p.event.when.first === true);
  const reasons: Record<string, string> = {};
  for (const ev of (content.events?.events ?? []) as readonly EventDef[]) {
    let why: string;
    if (met.has(ev.id)) why = 'already met this year';
    else if (state.turn < ev.when.months.from || state.turn > (ev.when.months.to ?? last)) why = 'month window';
    else if (ev.when.rival !== undefined && !(arc !== undefined && ev.when.rival.includes(arc))) why = 'rival arc';
    else if (!evaluate(ev.when.condition, state)) why = `condition: ${explainCondition(ev.when.condition, state).filter((x) => !x.met).map((x) => unmetText(x, state.flags)).join(' & ')}`;
    else if (ev.chain?.role === 'followUp' && !chains.some((c) => c.open && c.chain === ev.chain?.id)) why = 'chain not open';
    else if (ev.chain?.role === 'opener' && chains.length >= (rules?.maxChains ?? 99)) why = 'chains full';
    else if (without.followUp !== null) why = without.followUp.id === ev.id ? 'candidate' : 'a follow-up took the slot';
    else if (ev.chain?.role === 'followUp') why = 'a follow-up took the slot';
    else if (firstRun && ev.when.first !== true) why = 'a first-marked one-off took the slot';
    else if (inPool0.has(ev.id) && !inFresh.has(ev.id)) why = "left out: met last year";
    else if (inPool0.has(ev.id)) why = 'candidate';
    else why = 'other';
    reasons[ev.id] = why;
  }
  return {
    turn: state.turn,
    how: without.followUp !== null ? 'followUp' : firstRun ? 'first' : 'draw',
    chosen: state.event ?? '',
    pool0: without.followUp !== null ? 1 : without.pool.length,
    memoryFell: without.followUp === null && state.memory.events.length > 0 && without.pool.length > 0 && without.pool.every((p) => state.memory.events.includes(p.event.id)) && !firstRun,
    pool1: withMemory.followUp !== null ? 1 : withMemory.pool.length,
    poolIds0: without.followUp !== null ? [without.followUp.id] : without.pool.map((p) => p.event.id),
    reasons,
  };
}

function playYear(content: Content, persona: string, manager: string, seed: number, memory: RunMemory | undefined, newPlayer: boolean): YearData {
  const history: HistoryStep[] = [];
  const slots: SlotInfo[] = [];
  let before: GameState | null = null;
  const rec = runOne(
    content,
    persona as (typeof PERSONA_IDS)[number],
    seed,
    (state) => {
      history.push({ before, after: state, events: state.events });
      if (state.phase === 'event' && state.event !== null && before?.phase !== 'event') slots.push(slotOf(state, content));
      before = state;
    },
    { manager, ...(memory ? { memory } : {}), ...(newPlayer ? { skipFirstDraft: true } : {}) },
  );
  const last = history.at(-1)?.after;
  if (rec.crash !== null || rec.softLock !== null || !last || last.endingId === null) throw new Error(`run failed: ${persona} ${manager} seed ${seed}: ${rec.crash ?? rec.softLock}`);
  const first = history[0]?.after as GameState;

  const items: Record<string, Set<string>> = {};
  const groups: Record<string, Record<string, Set<string>>> = {};
  const add = (type: ItemType, id: string) => void (items[type] ??= new Set()).add(id);
  const addVariant = (type: ItemType, group: string, key: string) => {
    add(type, `${group}|${key}`);
    ((groups[type] ??= {})[group] ??= new Set()).add(key);
  };

  for (const id of Object.keys(rec.offered)) add('card_offered', id);
  for (const id of Object.keys(rec.drafted)) add('card_taken', id);
  for (const id of Object.keys(rec.plays)) add('card_played', id);
  for (const e of rec.events) {
    add('event', e.eventId);
    const chain = getEvent(first.content, e.eventId)?.chain;
    if (chain) add('chain', chain.id);
  }
  for (const id of Object.keys(rec.crystallisedById)) add('scandal_card', id);
  for (const g of rec.gates) {
    for (const id of g.offered) add('door', id);
    add('door_taken', g.gateId);
  }
  add('ending_minor', last.endingId as string);
  add('ending_major', rec.majorId as string);
  for (const id of yearAwards(last)) add('award', id);

  // The printed lines, as core/lines.ts readLines walks them — plus the in-hand lines it leaves out.
  const counter = new LineCounter(first.content, first.seed);
  const lanes = establishedLanes(history);
  let scandalsPrinted = 0;
  history.forEach((step, i) => {
    for (const e of step.events)
      for (const taken of counter.take(e, i > 0 ? (lanes[i - 1] ?? null) : null)) {
        if (taken.line.key === null) continue;
        if (taken.source) addVariant('event_line', taken.line.group, taken.line.key);
        else addVariant(taken.kind === 'inHand' ? 'inhand_line' : 'play_line', taken.line.group, taken.line.key);
        if (taken.kind === 'scandal' && !taken.source) scandalsPrinted++;
      }
  });

  // The press: every paper's world stories, spillovers, filler, the rival's beats, the sagas'.
  const worldAct: Record<string, { distinct: number; shown: number }> = {};
  const worldSeen = new Map<string, Set<string>>();
  for (const month of frontPages(history)) {
    for (const page of month.pages) {
      for (const item of page.items) {
        if (item.key === null || item.kind === 'player') continue;
        const group = item.kind === 'rival' ? 'rival' : item.kind === 'saga' ? 'saga' : `${item.kind}:${page.paper}`;
        addVariant('headline', group, item.key);
        if (page.paper === month.lead) add('headline_desk', `${group}|${item.key}`);
        if (item.kind === 'world') {
          const slot = `${page.paper}|${month.act}`;
          const rec2 = (worldAct[slot] ??= { distinct: 0, shown: 0 });
          rec2.shown++;
          const s = worldSeen.get(slot) ?? new Set<string>();
          if (!s.has(item.key)) rec2.distinct++;
          s.add(item.key);
          worldSeen.set(slot, s);
        }
      }
    }
  }

  // The manager: messages, sign-offs, the month-end perk's line.
  for (const month of managerMessages(history))
    for (const m of month.messages) {
      if (m.bubbles[0] !== undefined) addVariant('manager_msg', m.group, m.bubbles[0]);
      if (m.signoff?.key) addVariant('manager_msg', m.signoff.group, m.signoff.key);
    }
  for (const line of monthEndLines(history)) if (line.key !== null) addVariant('manager_msg', line.group, line.key);

  // The once-a-run lines, as the UI shows (and remembers) them: the opening, each season's card after the first, the doors, the ending.
  const onceShown: Record<string, string> = {};
  const shownItems = [onceItem.opening, ...Array.from({ length: last.act - 1 }, (_, i) => onceItem.opener(i + 2)), ...last.gateHistory.flatMap((g) => g.offered.map((id) => onceItem.gate(id))), onceItem.ending(last.endingId)];
  for (const item of shownItems) {
    const key = last.onceLines[item];
    if (key !== undefined) {
      onceShown[item] = key;
      addVariant('once_text', item, key);
    }
  }

  // Offers and scandals per season: what each season's slots were filled with.
  const offerAct: Record<number, { distinct: number; shown: number }> = {};
  const scandalAct: Record<number, { distinct: number; total: number }> = {};
  const offerSeen = new Map<number, Set<string>>();
  const scandalSeen = new Map<number, Set<string>>();
  for (const step of history)
    for (const e of step.events) {
      if (e.type === 'draftOffer') {
        const o = (offerAct[e.act] ??= { distinct: 0, shown: 0 });
        const s = offerSeen.get(e.act) ?? new Set<string>();
        for (const id of e.cardIds) {
          o.shown++;
          if (!s.has(id)) o.distinct++;
          s.add(id);
        }
        offerSeen.set(e.act, s);
      } else if (e.type === 'scandal') {
        const act = step.before?.act ?? 1;
        const o = (scandalAct[act] ??= { distinct: 0, total: 0 });
        const s = scandalSeen.get(act) ?? new Set<string>();
        o.total++;
        if (!s.has(e.cardId)) o.distinct++;
        s.add(e.cardId);
        scandalSeen.set(act, s);
      }
    }

  return {
    items,
    groups,
    slots,
    context: {
      cardsPlayed: rec.cardsPlayed,
      offersTaken: rec.draftPicks + rec.extraPicks,
      events: rec.events.length,
      scandalsPrinted,
      scandalsCrystallised: rec.scandalsCrystallised,
      cardsOffered: Object.values(offerAct).reduce((n, o) => n + o.shown, 0),
    },
    offerAct,
    scandalAct,
    worldAct,
    onceShown,
    eventIds: rec.events.map((e) => e.eventId),
    endingId: last.endingId,
    majorId: rec.majorId as string,
    persona,
  };
}

/** The memory the UI keeps (ui/memory.ts): the events of the latest earlier run that met any, and the variant each once-a-run group last showed. */
function nextMemory(prev: RunMemory | undefined, year: YearData): RunMemory {
  return { events: year.eventIds.length > 0 ? year.eventIds : (prev?.events ?? []), lines: { ...(prev?.lines ?? {}), ...year.onceShown } };
}

// ---------------------------------------------------------------------------------------------------------------------
// Counts (integers only, so merging in any order gives the same totals)

interface TypeCounts {
  /** Per year 1..5: items shown (distinct within the year), of them already seen in an earlier year, and the running union. */
  shown: number[];
  repeat: number[];
  union: number[];
  /** Per item: in how many sequences it was seen in exactly n of the five years (n = 0..5; index 0 is filled at the end). */
  hist: Record<string, number[]>;
}
interface GroupCounts {
  /** Sequences in which the group showed in at least one year; in at least two; in which some variant showed in two or more years. */
  any: number; twoYears: number; repeated: number;
  /** Neighbouring years in which the group showed in both; of them, in which a variant showed in both. */
  adjPairs: number; adjSame: number;
}
interface SlotCounts { n: number; empty: number; how: Record<string, number>; pool0: Record<string, number>; pool1: Record<string, number>; memoryEmptied: number; reasons: Record<string, Record<string, number>>; chosen: Record<string, number>; inPool: Record<string, number> }

interface CellCounts {
  cell: Cell;
  sequences: number;
  types: Record<string, TypeCounts>;
  groups: Record<string, Record<string, GroupCounts>>;
  slots: Record<string, SlotCounts>;
  context: Record<string, number[]>;
  offerAct: Record<string, { years: number; distinct: number; shown: number }>;
  scandalAct: Record<string, { years: number; distinct: number; total: number }>;
  worldAct: Record<string, { years: number; distinct: number; shown: number }>;
  endings: {
    distinctMinorHist: number[]; distinctMajorHist: number[]; distinctAwardsHist: number[];
    sameMinor3: number; sameMajor3: number; sameMinorAll5: number;
    /** Sequences by the most times one minor ending came in the five years (index = times, 0..5). */
    maxMinorHist: number[];
  };
  strategyYears: Record<string, number>;
  eventsAgain: { shownYear: number[]; again: number[] };
}

const zeros = (n: number) => Array.from({ length: n }, () => 0);
const emptyCounts = (cell: Cell): CellCounts => ({
  cell, sequences: 0, types: {}, groups: {}, slots: {}, context: {}, offerAct: {}, scandalAct: {}, worldAct: {}, strategyYears: {},
  endings: { distinctMinorHist: zeros(YEARS + 1), distinctMajorHist: zeros(YEARS + 1), distinctAwardsHist: zeros(20), sameMinor3: 0, sameMajor3: 0, sameMinorAll5: 0, maxMinorHist: zeros(YEARS + 1) },
  eventsAgain: { shownYear: zeros(YEARS), again: zeros(YEARS) },
});
const bump = (rec: Record<string, number>, key: string, by = 1) => void (rec[key] = (rec[key] ?? 0) + by);

function accumulate(c: CellCounts, years: YearData[]): void {
  c.sequences++;
  // Items per type.
  for (const type of TYPES) {
    const t = (c.types[type] ??= { shown: zeros(YEARS), repeat: zeros(YEARS), union: zeros(YEARS), hist: {} });
    const seen = new Map<string, number>();
    years.forEach((y, k) => {
      const set = y.items[type] ?? new Set<string>();
      t.shown[k] = (t.shown[k] as number) + set.size;
      let again = 0;
      for (const id of set) {
        if (seen.has(id)) again++;
        seen.set(id, (seen.get(id) ?? 0) + 1);
      }
      t.repeat[k] = (t.repeat[k] as number) + again;
      t.union[k] = (t.union[k] as number) + seen.size;
    });
    for (const [id, n] of seen) {
      const h = (t.hist[id] ??= zeros(YEARS + 1));
      h[n] = (h[n] as number) + 1;
    }
  }
  // Variant groups: does a group's variant come round again?
  for (const type of VARIANT_TYPES) {
    const byGroup = (c.groups[type] ??= {});
    const names = new Set(years.flatMap((y) => Object.keys(y.groups[type] ?? {})));
    for (const group of names) {
      const g = (byGroup[group] ??= { any: 0, twoYears: 0, repeated: 0, adjPairs: 0, adjSame: 0 });
      const perYear = years.map((y) => y.groups[type]?.[group]);
      const shownYears = perYear.filter((s) => s !== undefined).length;
      g.any++;
      if (shownYears >= 2) g.twoYears++;
      const keyYears = new Map<string, number>();
      for (const s of perYear) for (const k of s ?? []) keyYears.set(k, (keyYears.get(k) ?? 0) + 1);
      if ([...keyYears.values()].some((n) => n >= 2)) g.repeated++;
      for (let k = 1; k < YEARS; k++) {
        const a = perYear[k - 1];
        const b = perYear[k];
        if (a && b) {
          g.adjPairs++;
          if ([...a].some((x) => b.has(x))) g.adjSame++;
        }
      }
    }
  }
  // Event slots.
  years.forEach((y) => {
    const seenTurns = new Set<number>();
    for (const s of y.slots) {
      seenTurns.add(s.turn);
      const sc = (c.slots[String(s.turn)] ??= { n: 0, empty: 0, how: {}, pool0: {}, pool1: {}, memoryEmptied: 0, reasons: {}, chosen: {}, inPool: {} });
      sc.n++;
      bump(sc.how, s.how);
      bump(sc.pool0, String(s.pool0));
      bump(sc.pool1, String(s.pool1));
      if (s.memoryFell) sc.memoryEmptied++;
      bump(sc.chosen, s.chosen);
      for (const id of s.poolIds0) bump(sc.inPool, id);
      for (const [id, why] of Object.entries(s.reasons)) bump((sc.reasons[id] ??= {}), why);
    }
    // Event months a run reached without an event (nothing eligible): a slot unfilled.
    for (const m of EVENT_MONTHS)
      if (!seenTurns.has(m)) {
        const sc = (c.slots[String(m)] ??= { n: 0, empty: 0, how: {}, pool0: {}, pool1: {}, memoryEmptied: 0, reasons: {}, chosen: {}, inPool: {} });
        sc.n++;
        sc.empty++;
        bump(sc.pool0, '0');
        bump(sc.pool1, '0');
      }
  });
  // Context per year.
  years.forEach((y, k) => {
    for (const [name, v] of Object.entries(y.context)) {
      const a = (c.context[name] ??= zeros(YEARS));
      a[k] = (a[k] as number) + v;
    }
    bump(c.strategyYears, y.persona);
    for (const [a, o] of Object.entries(y.offerAct)) {
      const r = (c.offerAct[a] ??= { years: 0, distinct: 0, shown: 0 });
      r.years++; r.distinct += o.distinct; r.shown += o.shown;
    }
    for (const [a, o] of Object.entries(y.scandalAct)) {
      const r = (c.scandalAct[a] ??= { years: 0, distinct: 0, total: 0 });
      r.years++; r.distinct += o.distinct; r.total += o.total;
    }
    for (const [slot, o] of Object.entries(y.worldAct)) {
      const r = (c.worldAct[slot] ??= { years: 0, distinct: 0, shown: 0 });
      r.years++; r.distinct += o.distinct; r.shown += o.shown;
    }
    // Events seen again: of this year's events, those the year before also met (the memory's target).
    if (k > 0) {
      const prev = new Set((years[k - 1] as YearData).eventIds);
      c.eventsAgain.shownYear[k] = (c.eventsAgain.shownYear[k] as number) + y.eventIds.length;
      c.eventsAgain.again[k] = (c.eventsAgain.again[k] as number) + y.eventIds.filter((id) => prev.has(id)).length;
    } else c.eventsAgain.shownYear[0] = (c.eventsAgain.shownYear[0] as number) + y.eventIds.length;
  });
  // Endings and awards across the five years.
  const minors = years.map((y) => y.endingId);
  const majors = years.map((y) => y.majorId);
  const awards = new Set(years.flatMap((y) => [...(y.items.award ?? [])]));
  const count = (xs: string[]) => xs.reduce<Record<string, number>>((m, x) => ((m[x] = (m[x] ?? 0) + 1), m), {});
  const cm = count(minors);
  const cM = count(majors);
  const e = c.endings;
  const dm = Object.keys(cm).length;
  e.distinctMinorHist[dm] = (e.distinctMinorHist[dm] as number) + 1;
  const dM = Object.keys(cM).length;
  e.distinctMajorHist[dM] = (e.distinctMajorHist[dM] as number) + 1;
  e.distinctAwardsHist[awards.size] = ((e.distinctAwardsHist[awards.size] as number) ?? 0) + 1;
  const maxMinor = Math.max(...Object.values(cm));
  e.maxMinorHist[maxMinor] = (e.maxMinorHist[maxMinor] as number) + 1;
  if (maxMinor >= 3) e.sameMinor3++;
  if (maxMinor >= 5) e.sameMinorAll5++;
  if (Math.max(...Object.values(cM)) >= 3) e.sameMajor3++;
}

// ---------------------------------------------------------------------------------------------------------------------
// Sequences

let EVENT_MONTHS: readonly number[] = [];

function playSequence(content: Content, cell: Cell, seqSeed: number): YearData[] {
  const years: YearData[] = [];
  const mix = cursor(seedRng(deriveSeed(seqSeed, 0x6d1c)));
  let memory: RunMemory | undefined;
  for (let y = 1; y <= YEARS; y++) {
    const persona = cell.strategy === MIXED ? (MIX_POOL[nextInt(mix, MIX_POOL.length)] as string) : cell.strategy;
    const data = playYear(content, persona, cell.manager, deriveSeed(seqSeed, y), memory, y === 1);
    years.push(data);
    memory = nextMemory(memory, data);
  }
  return years;
}

// ---------------------------------------------------------------------------------------------------------------------
// Workers

interface Task { readonly cell: Cell; readonly from: number; readonly to: number; readonly seed: number }

function runTask(content: Content, task: Task): CellCounts {
  const c = emptyCounts(task.cell);
  for (let i = task.from; i < task.to; i++) accumulate(c, playSequence(content, task.cell, deriveSeed(task.seed, i)));
  return c;
}

function mergeInto(a: CellCounts, b: CellCounts): void {
  a.sequences += b.sequences;
  const addArr = (x: number[], y: number[]) => y.forEach((v, i) => (x[i] = (x[i] ?? 0) + v));
  for (const [type, t] of Object.entries(b.types)) {
    const at = (a.types[type] ??= { shown: zeros(YEARS), repeat: zeros(YEARS), union: zeros(YEARS), hist: {} });
    addArr(at.shown, t.shown); addArr(at.repeat, t.repeat); addArr(at.union, t.union);
    for (const [id, h] of Object.entries(t.hist)) addArr((at.hist[id] ??= zeros(YEARS + 1)), h);
  }
  for (const [type, gs] of Object.entries(b.groups))
    for (const [group, g] of Object.entries(gs)) {
      const ag = ((a.groups[type] ??= {})[group] ??= { any: 0, twoYears: 0, repeated: 0, adjPairs: 0, adjSame: 0 });
      ag.any += g.any; ag.twoYears += g.twoYears; ag.repeated += g.repeated; ag.adjPairs += g.adjPairs; ag.adjSame += g.adjSame;
    }
  for (const [turn, s] of Object.entries(b.slots)) {
    const as = (a.slots[turn] ??= { n: 0, empty: 0, how: {}, pool0: {}, pool1: {}, memoryEmptied: 0, reasons: {}, chosen: {}, inPool: {} });
    as.n += s.n; as.empty += s.empty; as.memoryEmptied += s.memoryEmptied;
    for (const k of ['how', 'pool0', 'pool1', 'chosen', 'inPool'] as const) for (const [x, v] of Object.entries(s[k])) bump(as[k], x, v);
    for (const [id, rs] of Object.entries(s.reasons)) for (const [why, v] of Object.entries(rs)) bump((as.reasons[id] ??= {}), why, v);
  }
  for (const [name, arr] of Object.entries(b.context)) addArr((a.context[name] ??= zeros(YEARS)), arr);
  for (const [k, v] of Object.entries(b.strategyYears)) bump(a.strategyYears, k, v);
  for (const [k, o] of Object.entries(b.offerAct)) { const r = (a.offerAct[k] ??= { years: 0, distinct: 0, shown: 0 }); r.years += o.years; r.distinct += o.distinct; r.shown += o.shown; }
  for (const [k, o] of Object.entries(b.scandalAct)) { const r = (a.scandalAct[k] ??= { years: 0, distinct: 0, total: 0 }); r.years += o.years; r.distinct += o.distinct; r.total += o.total; }
  for (const [k, o] of Object.entries(b.worldAct)) { const r = (a.worldAct[k] ??= { years: 0, distinct: 0, shown: 0 }); r.years += o.years; r.distinct += o.distinct; r.shown += o.shown; }
  const ae = a.endings; const be = b.endings;
  addArr(ae.distinctMinorHist, be.distinctMinorHist); addArr(ae.distinctMajorHist, be.distinctMajorHist); addArr(ae.distinctAwardsHist, be.distinctAwardsHist); addArr(ae.maxMinorHist, be.maxMinorHist);
  ae.sameMinor3 += be.sameMinor3; ae.sameMajor3 += be.sameMajor3; ae.sameMinorAll5 += be.sameMinorAll5;
  addArr(a.eventsAgain.shownYear, b.eventsAgain.shownYear); addArr(a.eventsAgain.again, b.eventsAgain.again);
}

/** Sorts every object's keys, so the JSON written is the same bytes whatever order the workers finished in. */
function canonical(x: unknown): unknown {
  if (Array.isArray(x)) return x.map(canonical);
  if (x && typeof x === 'object') return Object.fromEntries(Object.keys(x).sort().map((k) => [k, canonical((x as Record<string, unknown>)[k])]));
  return x;
}

if (!isMainThread) {
  const content = loadContent();
  EVENT_MONTHS = content.rules.events?.months ?? [];
  parentPort?.on('message', (msg: { task: Task; index: number } | 'done') => {
    if (msg === 'done') process.exit(0);
    parentPort?.postMessage({ index: msg.index, counts: runTask(content, msg.task) });
  });
  parentPort?.postMessage({ ready: true, workerData });
} else {
  await main();
}

async function main(): Promise<void> {
  const flag = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
  const SEQUENCES = Number(flag('sequences') ?? 2000);
  const SEED = Number(flag('seed') ?? 20261114);
  const WORKERS = Number(flag('workers') ?? Math.max(1, availableParallelism() - 1));
  const OUT = resolve(ROOT, flag('out') ?? 'sim/survey/results');
  const CHUNK = 50;
  const t0 = performance.now();

  const content = loadContent();
  EVENT_MONTHS = content.rules.events?.months ?? [];
  const managers = (content.managers?.managers ?? []).map((m) => m.id);
  const strategies = [...PERSONA_IDS, MIXED];
  const cells: Cell[] = managers.flatMap((manager) => strategies.map((strategy) => ({ id: `${strategy}/${manager}`, strategy, manager })));
  const raw = loadRawContent();
  const i18n = JSON.parse(readFileSync(join(ROOT, 'i18n/en.json'), 'utf8')) as Record<string, string>;
  const inventory = buildInventory(raw, i18n);

  // The tasks, and a pool of workers pulling them; results are stored by task index and merged in that order.
  const tasks: Task[] = cells.flatMap((cell) => Array.from({ length: Math.ceil(SEQUENCES / CHUNK) }, (_, k) => ({ cell, from: k * CHUNK, to: Math.min(SEQUENCES, (k + 1) * CHUNK), seed: SEED })));
  const results: CellCounts[] = new Array(tasks.length);
  let next = 0;
  let finished = 0;
  await new Promise<void>((resolve, reject) => {
    const workers: Worker[] = [];
    const feed = (w: Worker) => {
      if (next < tasks.length) {
        const index = next++;
        w.postMessage({ task: tasks[index], index });
      } else w.postMessage('done');
    };
    for (let i = 0; i < WORKERS; i++) {
      const w = new Worker(fileURLToPath(import.meta.url), { workerData: { id: i } });
      workers.push(w);
      w.on('error', reject);
      w.on('message', (m: { ready?: boolean; index?: number; counts?: CellCounts }) => {
        if (m.ready) return feed(w);
        results[m.index as number] = m.counts as CellCounts;
        finished++;
        if (finished % 20 === 0) process.stderr.write(`  ${finished}/${tasks.length} tasks (${((performance.now() - t0) / 1000).toFixed(0)}s)\n`);
        if (finished === tasks.length) {
          for (const x of workers) void x.terminate();
          resolve();
        } else feed(w);
      });
    }
  });

  const merged = new Map<string, CellCounts>();
  tasks.forEach((task, i) => {
    const part = results[i] as CellCounts;
    const cell = merged.get(task.cell.id) ?? emptyCounts(task.cell);
    mergeInto(cell, part);
    merged.set(task.cell.id, cell);
  });

  // Pools and gates: what each type could show, and what keeps an item out (for the report's tables).
  const groupsAll = variantGroups(raw);
  const pools: Record<string, Record<string, string[]>> = {}; // type -> manager|'*' -> ids
  const setPool = (type: string, manager: string, ids: string[]) => ((pools[type] ??= {})[manager] = ids);
  const draftable = content.cards.filter((c) => c.kind !== 'scandal').map((c) => c.id);
  for (const m of [...managers, '*']) {
    setPool('card_offered', m, draftable); setPool('card_taken', m, draftable); setPool('card_played', m, draftable);
    setPool('event', m, (content.events?.events ?? []).map((e) => e.id));
    setPool('chain', m, [...new Set((content.events?.events ?? []).flatMap((e) => (e.chain ? [e.chain.id] : [])))]);
    setPool('scandal_card', m, content.cards.filter((c) => c.kind === 'scandal').map((c) => c.id));
    setPool('door', m, content.gates.map((g) => g.id)); setPool('door_taken', m, content.gates.map((g) => g.id));
    setPool('ending_minor', m, content.endings.minors.map((x) => x.id)); setPool('ending_major', m, content.endings.majors.map((x) => x.id));
    setPool('award', m, (content.awards ?? []).map((a) => a.id));
    const keyed = (kinds: string[], owner?: string) => groupsAll.filter((g) => kinds.includes(g.kind) && (owner === undefined || g.owner === owner)).flatMap((g) => g.keys.map((k) => `${g.id}|${k}`));
    setPool('once_text', m, keyed(['once']));
    setPool('play_line', m, keyed(['card', 'scandal']));
    setPool('inhand_line', m, keyed(['inHand']));
    setPool('event_line', m, (content.events?.events ?? []).flatMap((e) => e.choices.flatMap((c, i) => (c.press ? c.press.lineKeys.map((k: string) => `event:${e.id}:${i}|${k}`) : []))));
    setPool('manager_msg', m, m === '*' ? keyed(['manager', 'signoff', 'monthEnd']) : keyed(['manager', 'signoff', 'monthEnd'], m));
    const press = content.press;
    const head: string[] = [];
    for (const p of press?.papers ?? []) {
      for (const w of p.world ?? []) head.push(`world:${p.id}|${w.key}`);
      for (const k of p.spilloverKeys ?? []) head.push(`spillover:${p.id}|${k}`);
      for (const k of p.fillerKeys ?? []) head.push(`filler:${p.id}|${k}`);
      for (const s of p.sagas ?? []) for (const k of s.beats) head.push(`saga|${k}`);
    }
    for (const a of press?.rival?.arcs ?? []) for (const b of a.beats) head.push(`rival|${b.key}`);
    setPool('headline', m, head);
    setPool('headline_desk', m, head);
  }
  const gateText: Record<string, Record<string, string>> = { event: {}, card_offered: {}, door: {}, ending_minor: {}, award: {}, scandal_card: {}, headline: {} };
  for (const e of inventory.events.list) gateText.event![e.id] = `months ${e.from}-${e.to}${e.condition !== '-' ? `; ${e.condition}` : ''}${e.chain ? `; ${e.chain}` : ''}${e.rival ? `; rival ${e.rival.join('/')}` : ''}${e.first ? '; first-marked' : ''}${e.lane ? `; lane ${e.lane} (weight x2)` : ''}${e.weight !== 1 ? `; weight ${e.weight}` : ''}`;
  for (const c of inventory.cards.list) {
    gateText.card_offered![c.id] = c.kind === 'scandal' ? 'not draftable' : `from act ${c.actMin}; lane ${c.lane}`;
    if (c.kind === 'scandal') gateText.scandal_card![c.id] = `from act ${c.actMin}; tags ${c.tags.join('/')}`;
  }
  for (const d of inventory.doors) for (const g of d.gates) gateText.door![g.id] = `act ${d.act}; requires ${g.requires}`;
  for (const m of inventory.endings.minors) gateText.ending_minor![m.id] = `${m.major}: ${m.condition}`;
  for (const a of inventory.awards.list) gateText.award![a.id] = a.condition;
  for (const p of content.press?.papers ?? []) for (const w of p.world ?? []) if (w.act !== undefined) gateText.headline![`world:${p.id}|${w.key}`] = `world story, season ${w.act} only, once a run`;

  // What keeps a text variant out, in words: the group's own trigger (the variant itself is the shuffle bag's choice).
  const page = ((content.press as unknown as { page?: Record<string, any> } | undefined)?.page ?? {}) as Record<string, any>;
  const describe = (group: string): string => {
    const [kind = '', a = '', b = ''] = group.split(':');
    if (group === 'opening') return 'the opening card, every year';
    if (kind === 'opener') return `season ${a} opening card, every year that reaches it`;
    if (kind === 'gate') return `door ${a}'s flavour text (the door is offered every year)`;
    if (kind === 'ending') return `only in a year that ends as ${a} (${gateText.ending_minor?.[a] ?? ''})`;
    if (kind === 'manager') return `${a}'s line for the trigger "${[b, ...group.split(':').slice(3)].join(':')}"`;
    if (kind === 'signoff') return `${a}'s sign-off bubble after a one-bubble ${b} message`;
    if (kind === 'monthEnd') return `${a}'s month-end perk line (months the perk lowers heat)`;
    if (kind === 'world') return `world story in ${a}`;
    if (kind === 'spillover') return `${a}: frenzy spill-over (a month with ${page.frenzyAt}+ scandals, spilling to the other papers from fame tier ${page.spilloverFrom})`;
    if (kind === 'filler') return `${a}: fame filler about the player (page.filler: ${JSON.stringify(page.filler)})`;
    if (group === 'saga') return "a world saga's beat in its season";
    if (group === 'rival') return "the rival's beat: only the seed's arc (one of four) prints";
    if (kind === 'card') return `card ${a} played${b ? ` in the ${b} lane` : ''}`;
    if (kind === 'scandal') return `scandal ${a} crystallising`;
    if (kind === 'inhand') return `scandal ${a} in the hand`;
    if (kind === 'event') return `answer ${b} to event ${a} (needs the event, then that answer)`;
    return group;
  };
  for (const t of ['once_text', 'manager_msg', 'headline', 'headline_desk', 'play_line', 'inhand_line', 'event_line']) {
    const own = (gateText[t] ??= {});
    for (const id of pools[t]?.['*'] ?? []) own[id] ??= describe(id.split('|')[0] as string);
  }

  const output = {
    survey: 'R11a content survey',
    command: 'node sim/survey/survey.ts',
    flags: { sequences: SEQUENCES, seed: SEED },
    years: YEARS,
    notes: {
      cells: 'strategy x manager; "mixed" draws one of the player-like personas (' + MIX_POOL.join(', ') + ') at random each year',
      newPlayer: 'year 1: skipFirstDraft (no offers in the first month); years 2-5: returning player, with the memory (events of the last year; the last variant of each once-a-run text)',
      seeds: 'sequence i of every cell uses seed deriveSeed(seed, i); its year y runs on deriveSeed(sequenceSeed, y)',
    },
    cells: cells.map((c) => c.id),
    inventory,
    pools,
    gateText,
    eventMonths: EVENT_MONTHS,
    results: Object.fromEntries([...merged].map(([id, c]) => [id, c])),
  };
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'survey.json'), `${JSON.stringify(canonical(output))}\n`);
  const { renderTables } = await import('./tables.ts');
  writeFileSync(join(OUT, 'tables.md'), renderTables(canonical(output) as never));
  console.log(`survey: ${cells.length} cells x ${SEQUENCES} five-year sequences (${cells.length * SEQUENCES * YEARS} runs), seed ${SEED}, ${WORKERS} workers, ${((performance.now() - t0) / 1000).toFixed(0)}s -> ${OUT}`);
}

export { conditionText };
