// The press (docs/design/content-expansion.md §3.1, phase 2a): which paper prints each of the player's lines,
// and what the papers call the player when it prints. Papers print the public acts; the notebook keeps the
// private work. Read-only; ids, keys and numbers only — /ui renders the words.

import { getCard, type ContentIndex, type PaperDef, type Prominence, type RivalArcDef } from './content.ts';
import { establishedLanes } from './lanes.ts';
import { readLines, type HistoryStep, type PrintedLine } from './lines.ts';
import { deriveSeed } from './rng.ts';
import type { GameEvent, GameState } from './state.ts';
import { bagKey, hashId } from './variants.ts';

/**
 * The paper a card's line prints in, by register first: a LOUD card's lane picks the paper; Money prints in
 * the business pages of its paper; every scandal prints in its own paper, whatever the lane. A quiet card
 * prints in no paper (null): private work is the player's notebook, which the mass press never sees.
 */
export function paperOf(c: ContentIndex, cardId: string): string | null {
  const press = c.press;
  const card = getCard(c, cardId);
  if (!press || !card) return null;
  if (card.kind === 'scandal') return press.route.scandal;
  if (card.register === 'money') return press.route.money;
  if (card.register === 'loud') return press.route.loud[card.lane ?? ''] ?? null;
  return null;
}

/** The hype tier a value sits in (0 = lowest), from rules.tiers.hype: the fame tier the press reads. */
export function fameTier(c: ContentIndex, hype: number): number {
  let index = 0;
  (c.rules.tiers?.hype?.from ?? []).forEach((min, i) => {
    if (hype >= min) index = i;
  });
  return index;
}

/**
 * The noun the press uses for the player (press.subjects): by fame tier and the established lane — the
 * early column while none is. Null when content gives none.
 */
export function pressSubject(c: ContentIndex, tier: number, lane: string | null): string | null {
  const press = c.press;
  if (!press) return null;
  const column = press.subjects[lane ?? press.earlyLane] ?? press.subjects[press.earlyLane] ?? [];
  return column[Math.min(tier, column.length - 1)] ?? null;
}

/** Where a line's world stands at the moment it prints: the fame the press sees and the established lane. */
export interface PrintContext {
  readonly hype: number;
  readonly lane: string | null;
}

/**
 * When a step's lines print: once its action has resolved. A month end prints at the turn's end — before
 * the next month's draw can move anything — so its lines read the turnEnd's resources. `lane`: the
 * established lane after the step (core/lanes.ts establishedLanes: it has hysteresis, so it comes from the
 * run's history).
 */
export function printContext(after: GameState, events: readonly GameEvent[], lane: string | null): PrintContext {
  const end = events.find((e) => e.type === 'turnEnd');
  return { hype: end?.type === 'turnEnd' ? end.resources.hype : after.resources.hype, lane };
}

/** A printed line with its press: the paper (null: the notebook), the fame and lane it printed at, the subject. */
export interface PressLine extends PrintedLine {
  readonly paper: string | null;
  readonly fameTier: number;
  readonly lane: string | null;
  readonly subjectKey: string | null;
}

/** A line's press, from the moment it prints. */
export function pressOf(c: ContentIndex, cardId: string, at: PrintContext): Pick<PressLine, 'paper' | 'fameTier' | 'lane' | 'subjectKey'> {
  const tier = fameTier(c, at.hype);
  return { paper: paperOf(c, cardId), fameTier: tier, lane: at.lane, subjectKey: pressSubject(c, tier, at.lane) };
}

/** Every line the run has printed, with its variant and its press. */
export function pressLines(history: readonly HistoryStep[]): PressLine[] {
  const lanes = establishedLanes(history);
  const contexts = new Map<number, PrintContext>();
  return readLines(history).printed.map((line) => {
    const step = history[line.step] as HistoryStep;
    let at = contexts.get(line.step);
    if (!at) contexts.set(line.step, (at = printContext(step.after, step.events, lanes[line.step] ?? null)));
    return { ...line, ...pressOf(step.after.content, line.cardId, at) };
  });
}

// ---------------------------------------------------------------------------
// The front page (phase 2a, Part E). Each month every paper composes a front page — a lead, two secondary
// stories, a brief. The player's lines are placed by prominence, and the rest is the world: the front page
// is itself a fame meter, and at the top of the scale the player is in every paper at once. A pure function
// of the run's history: world news by shuffle bag, the rival fixed by the seed, never the game RNG.

const LEVEL: Readonly<Record<Prominence, number>> = { lead: 0, secondary: 1, brief: 2 };

export type PageItemKind = 'player' | 'spillover' | 'world' | 'rival' | 'saga';

export interface PageItem {
  readonly slot: Prominence;
  /** The player's own line, the frenzy spilling over into this paper, a world story, or the rival's beat. */
  readonly kind: PageItemKind;
  /** The i18n key of its text: a player line's printed variant. */
  readonly key: string | null;
  /** The press subject in the player's lines. */
  readonly subjectKey: string | null;
  /** For the player's line: the printed line itself. */
  readonly line: PressLine | null;
}

export interface FrontPage {
  readonly paper: string;
  /** In slot order, most prominent first. */
  readonly items: readonly PageItem[];
  /** The player may fill it: the scandal paper in a scandal's month; the established lane's paper once Famous. */
  readonly overwhelmed: boolean;
}

export interface MonthPress {
  readonly turn: number;
  readonly act: number;
  /** Index in history of the step whose month end printed it. */
  readonly step: number;
  /** The fame tier and the established lane at the month's end. */
  readonly fameTier: number;
  readonly lane: string | null;
  readonly scandals: number;
  /** Scandals enough for a frenzy; `spilled`: it reached every other paper (only once the player is known). */
  readonly frenzy: boolean;
  readonly spilled: boolean;
  /** Every paper's page, in content order. */
  readonly pages: readonly FrontPage[];
  /** The paper on the desk: the one holding the player's most prominent line. */
  readonly lead: string;
  /** The rival's beat when this month carries it: its paper, its line, whether it made the page. */
  readonly rival: { readonly paper: string; readonly key: string; readonly printed: boolean } | null;
  /** The world's sagas whose beat falls this month: each in its paper, and whether it made the page. */
  readonly sagas: readonly { readonly paper: string; readonly key: string; readonly printed: boolean }[];
}

/** The rival's arc for a run, fixed by the seed at the start — never chosen to contrast the player's. */
export function rivalArc(c: ContentIndex, seed: number): RivalArcDef | null {
  const arcs = c.press?.rival?.arcs ?? [];
  return arcs.length === 0 ? null : (arcs[deriveSeed(seed, hashId('rival')) % arcs.length] ?? null);
}

/** The month of a season that carries the rival's beat (seeded). */
export function rivalBeatTurn(c: ContentIndex, seed: number, act: number): number {
  const perAct = c.rules.turnsPerAct;
  return (act - 1) * perAct + 1 + (deriveSeed(seed, hashId(`rival:${act}`)) % perAct);
}

/** How prominent the player's line may be on its paper's front page: its cap (it may always sit lower). */
export function prominenceOf(c: ContentIndex, line: PressLine): Prominence | null {
  const press = c.press;
  const page = press?.page;
  if (!press || !page || line.paper === null) return null;
  if (line.kind === 'scandal') return page.scandal[Math.min(line.fameTier, page.scandal.length - 1)] ?? 'brief';
  if (getCard(c, line.cardId)?.register === 'money') return page.money;
  // A LOUD line: in the established lane's paper, or off it. Early, its own paper stands for the lane's.
  const lanePaper = line.lane === null ? line.paper : (press.route.loud[line.lane] ?? line.paper);
  const table = line.paper === lanePaper ? page.loud.inLane : page.loud.offLane;
  return table[Math.min(line.fameTier, table.length - 1)] ?? 'brief';
}

/** The month a printed line belongs to: its step's month end if the step ended one, else the month it was played in. */
function monthOf(step: HistoryStep): number {
  const end = step.events.find((e) => e.type === 'turnEnd');
  return end?.type === 'turnEnd' ? end.turn : step.after.turn;
}

/**
 * A paper's world stories for a month: a shuffle bag over its pool — the least printed first, so nothing
 * repeats until the pool is used; not what it printed last month, where it can; a fresh seeded order each
 * time round. A seasonal story only in its season, and once a run.
 */
function worldStories(seed: number, paper: PaperDef, act: number, printed: ReadonlyMap<string, number>, lastMonth: ReadonlySet<string>, n: number): string[] {
  const times = (key: string) => printed.get(key) ?? 0;
  const rank = (key: string) => deriveSeed(deriveSeed(seed, hashId(`world:${paper.id}:${key}`)), times(key));
  return (paper.world ?? [])
    .filter((s) => s.act === undefined || (s.act === act && times(s.key) === 0))
    .map((s) => s.key)
    .sort((a, b) => times(a) - times(b) || Number(lastMonth.has(a)) - Number(lastMonth.has(b)) || rank(a) - rank(b) || a.localeCompare(b))
    .slice(0, Math.max(0, n));
}

/** A candidate for a slot on a page: its cap, what it is, its place in print order. */
interface Candidate {
  readonly cap: Prominence;
  readonly item: Omit<PageItem, 'slot'>;
  readonly order: number;
}

/** Every month's front pages so far: one per month the history has ended. */
export function frontPages(history: readonly HistoryStep[]): MonthPress[] {
  const first = history[0]?.after;
  const press = first?.content.press;
  const page = press?.page;
  if (!first || !press || !page) return [];
  const c = first.content;
  const seed = first.seed;
  const arc = rivalArc(c, seed);
  const byMonth = new Map<number, PressLine[]>();
  for (const line of pressLines(history)) {
    const month = monthOf(history[line.step] as HistoryStep);
    byMonth.set(month, [...(byMonth.get(month) ?? []), line]);
  }
  const lanes = establishedLanes(history);
  const printedWorld = new Map<string, Map<string, number>>(press.papers.map((p) => [p.id, new Map()]));
  const lastWorld = new Map<string, ReadonlySet<string>>(press.papers.map((p) => [p.id, new Set()]));
  const spilled = new Map<string, number>();
  const months: MonthPress[] = [];

  history.forEach((step, index) => {
    const end = step.events.find((e) => e.type === 'turnEnd');
    if (end?.type !== 'turnEnd') return;
    const tier = fameTier(c, end.resources.hype);
    const lane = lanes[index] ?? null;
    const mine = byMonth.get(end.turn) ?? [];
    const scandals = mine.filter((l) => l.kind === 'scandal').length;
    const frenzy = scandals >= page.frenzyAt;
    // Fame amplifies scandal (round 2b): a frenzy spills over only once the player is known.
    const spill = frenzy && tier >= page.spilloverFrom;
    const subjectKey = pressSubject(c, tier, lane);
    // The lane's paper: the established lane's; early, the paper of each LOUD line the player printed.
    const lanePapers = new Set(
      lane !== null
        ? [press.route.loud[lane] ?? '']
        : mine.flatMap((l) => (l.kind === 'play' && l.paper !== null && getCard(c, l.cardId)?.register === 'loud' ? [l.paper] : [])),
    );
    const beat = arc && end.turn === rivalBeatTurn(c, seed, end.act) ? (arc.beats[end.act - 1] ?? null) : null;
    let rivalPrinted = false;

    const pages = press.papers.map((paper): FrontPage => {
      const overwhelmed =
        (paper.id === press.route.scandal && scandals > 0 && tier >= page.overwhelmScandalFrom) || (tier >= page.overwhelmLaneFrom && lanePapers.has(paper.id));
      // The player's candidates, in the order they claim slots: the spillover first (every other paper carries
      // it), then by prominence; at equal prominence a scandal, then a LOUD act before a Money line (a public
      // act is news, a fee is business); then in print order.
      const candidates: Candidate[] = [];
      if (spill && paper.id !== press.route.scandal && (paper.spilloverKeys?.length ?? 0) > 0) {
        const group = `spillover:${paper.id}`;
        const n = spilled.get(group) ?? 0;
        spilled.set(group, n + 1);
        candidates.push({ cap: page.spillover, order: -1, item: { kind: 'spillover', key: bagKey(paper.spilloverKeys, seed, group, n), subjectKey, line: null } });
      }
      mine.forEach((line, order) => {
        if (line.paper !== paper.id) return;
        const cap = prominenceOf(c, line);
        if (cap) candidates.push({ cap, order, item: { kind: 'player', key: line.key, subjectKey: line.subjectKey, line } });
      });
      const news = (cand: Candidate) =>
        cand.item.line?.kind === 'scandal' ? 0 : getCard(c, cand.item.line?.cardId ?? '')?.register === 'money' ? 2 : 1;
      candidates.sort(
        (a, b) =>
          Number(b.item.kind === 'spillover') - Number(a.item.kind === 'spillover') ||
          LEVEL[a.cap] - LEVEL[b.cap] ||
          news(a) - news(b) ||
          a.order - b.order,
      );
      const worldMin = overwhelmed ? 0 : (page.worldMin[Math.min(tier, page.worldMin.length - 1)] ?? 0);
      const slots: (PageItem | null)[] = page.slots.map(() => null);
      let placed = 0;
      for (const cand of candidates) {
        if (placed >= page.slots.length - worldMin) break;
        const at = page.slots.findIndex((slot, i) => slots[i] === null && LEVEL[slot] >= LEVEL[cand.cap]);
        if (at === -1) continue;
        slots[at] = { ...cand.item, slot: page.slots[at] as Prominence };
        placed++;
      }
      // The world fills the rest: the rival's beat first when it is her month in this paper, then the bag.
      const open = slots.flatMap((item, i) => (item === null ? [i] : []));
      const world: Omit<PageItem, 'slot'>[] = [];
      if (beat && beat.paper === paper.id && open.length > 0) {
        world.push({ kind: 'rival', key: beat.key, subjectKey: null, line: null });
        rivalPrinted = true;
      }
      const printed = printedWorld.get(paper.id) as Map<string, number>;
      const stories = worldStories(seed, paper, end.act, printed, lastWorld.get(paper.id) as ReadonlySet<string>, open.length - world.length);
      for (const key of stories) world.push({ kind: 'world', key, subjectKey: null, line: null });
      open.forEach((i, k) => {
        const item = world[k];
        if (item) slots[i] = { ...item, slot: page.slots[i] as Prominence };
      });
      for (const key of stories) printed.set(key, (printed.get(key) ?? 0) + 1);
      lastWorld.set(paper.id, new Set(stories));
      return { paper: paper.id, items: slots.filter((x): x is PageItem => x !== null), overwhelmed };
    });

    months.push({
      turn: end.turn,
      act: end.act,
      step: index,
      fameTier: tier,
      lane,
      scandals,
      frenzy,
      spilled: spill,
      pages,
      lead: leadPaper(c, pages, lane),
      rival: beat ? { paper: beat.paper, key: beat.key, printed: rivalPrinted } : null,
      sagas: [],
    });
  });
  return months;
}

/** The paper of the established lane — the early lane's before one is established. */
export function lanePaper(c: ContentIndex, lane: string | null): string | null {
  const press = c.press;
  return press ? (press.route.loud[lane ?? press.earlyLane] ?? null) : null;
}

/**
 * The month's lead paper — the one on the desk (round 2b): the paper holding the player's most prominent
 * story, a lead before a secondary before a brief. Money lines do not count — a side gig is a business
 * footnote, not the player's story — and a scandal counts only as a lead story: it takes the desk only when
 * it is the month's most prominent story, which means once the player is known. An unknown's scandal month
 * keeps the lane's paper in front, the tabloid behind carrying the scandal as a brief. At equal prominence
 * the established lane's paper wins; a month with nothing of the player's goes to the lane's paper too. The
 * lead paper is usually the player's own lane's.
 */
function leadPaper(c: ContentIndex, pages: readonly FrontPage[], lane: string | null): string {
  const counts = (item: PageItem) =>
    item.kind === 'spillover' ||
    (item.kind === 'player' &&
      getCard(c, item.line?.cardId ?? '')?.register !== 'money' &&
      (item.line?.kind !== 'scandal' || item.slot === 'lead'));
  const rankOf = (fp: FrontPage) => Math.min(Infinity, ...fp.items.filter(counts).map((item) => LEVEL[item.slot]));
  const ranks = pages.map((fp) => ({ paper: fp.paper, rank: rankOf(fp) }));
  const best = Math.min(...ranks.map((r) => r.rank));
  const preferred = lanePaper(c, lane) ?? pages[0]?.paper ?? '';
  if (best === Infinity) return preferred;
  const tied = ranks.filter((r) => r.rank === best).map((r) => r.paper);
  return tied.includes(preferred) ? preferred : (tied[0] ?? preferred);
}

/** How much of a page is the player's: their lines and the spillover, against its slots. */
export function playerShare(fp: FrontPage, slots: number): number {
  return slots === 0 ? 0 : fp.items.filter((i) => i.kind === 'player' || i.kind === 'spillover').length / slots;
}
