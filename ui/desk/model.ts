// The one adapter from /core to the desk (round V1a; docs/design/visual/README.md §1–§7). Every number and
// word the scene shows is a field here, and every field comes from a /core query or from content: the
// components render fields and never compute them. Pure and DOM-free, so check:preview holds it to /core.
//
// The papers on the desk are this month's issue as it stands (README §9): in the play phase, the month's
// front pages as they would print if the month ended now — the stories printed so far and the scandals the
// month's end would add, from the same reducer run as the END TURN preview; while drafting, the month so far;
// at a gate, the month just printed.

import {
  bagIndex,
  boxOffice,
  calendarDate,
  cardFace,
  deriveSeed,
  endingIfYearEndedNow,
  fameBand,
  frontPages,
  getCard,
  issueNow,
  majorRequirements,
  managerMessages,
  playCheck,
  pressLines,
  reduce,
  statTiers,
  type CardFace,
  type CountdownLevel,
  type FrontPage,
  type GameEvent,
  type GameState,
  type MajorClause,
  type MonthPress,
  type NoteColour,
  type PageItem,
  type SceneId,
  type SeasonId,
} from '../../core/index.ts';
import { has, t, tp } from '../i18n.ts';
import { legalOf, outcomeOf, previewEndTurn, type EndTurnPreview, type LinesSoFar } from '../preview.ts';
import type { PlayedStep } from '../queue.ts';
import { statCells } from '../stats.ts';
import {
  calendarLabel,
  cardFlavor,
  cardName,
  cardRuleLines,
  cardText,
  clauseText,
  conditionText,
  dateLine,
  flagName,
  lineText,
  majorGoal,
  majorName,
  managerName,
  mastheadName,
  messageBubbles,
  minorName,
  pageItemText,
  resourceName,
  signed,
  signedAmount,
  signedMoney,
} from '../text.ts';

/** How many drawings each photograph scene has (README §2: several variants of the same drawing). */
export const PHOTO_VARIANTS = 3;

export type LaneClass = 'music' | 'screen' | 'celebrity' | 'early';
export type IconId = 'star' | 'note' | 'clap' | 'flame' | 'paper' | 'cash' | 'cards';

export interface StatCellModel {
  readonly id: 'hype' | 'craft' | 'heat' | 'next' | 'money';
  readonly icon: IconId;
  /** The bold word: a tier, the countdown, the money. */
  readonly word: string;
  /** The small number beside a tier word. */
  readonly number: string | null;
  readonly level: CountdownLevel | null;
  readonly tipHeader: string;
  readonly tipLine: string;
}

export interface StatBarModel {
  readonly cells: readonly StatCellModel[];
  readonly actions: { readonly total: number; readonly left: number; readonly tipHeader: string; readonly tipLine: string };
  readonly when: { readonly date: string; readonly marks: readonly ('past' | 'now' | 'next')[]; readonly tipHeader: string; readonly tipLine: string };
  /** The deck's button (the deck itself is a screen of round V2). */
  readonly deck: string;
}

export interface NoteReq {
  readonly met: boolean;
  /** ✓ or ✗. */
  readonly mark: string;
  readonly icon: 'star' | 'paper' | null;
  readonly text: string;
}

export interface MirrorNote {
  readonly majorId: string;
  readonly colour: NoteColour;
  readonly name: string;
  readonly goal: string;
  readonly reqs: readonly NoteReq[];
}

export interface MirrorModel {
  readonly kicker: string;
  readonly today: { readonly major: string; readonly minor: string } | null;
  /** The other three majors, in content's order. */
  readonly notes: readonly MirrorNote[];
  /** In a frenzy, the red clipping stuck to the glass: the month's newest scandal headline. */
  readonly clipping: string | null;
}

export interface ItemModel {
  readonly kind: PageItem['kind'];
  readonly kicker: string;
  readonly text: string;
  readonly dek: string | null;
  /** The margin rule when Mark my stories is on: the player's own, or the rival's. */
  readonly mark: 'you' | 'rival' | null;
  /** A scandal of the player's: red type. */
  readonly red: boolean;
  readonly brief: boolean;
  /** Not printed yet: a scandal this month's end would print (V1b animates it). */
  readonly coming: boolean;
}

export type RightModel =
  | { readonly kind: 'photo'; readonly scene: SceneId; readonly variant: number; readonly season: SeasonId; readonly caption: string }
  | { readonly kind: 'boxoffice'; readonly title: string; readonly rows: readonly { readonly rank: number; readonly title: string; readonly gross: string; readonly fresh: string | null; readonly player: boolean }[] }
  | null;

export interface PageModel {
  readonly paper: string;
  readonly masthead: { readonly name: string; readonly sub: string | null; readonly earLeft: string; readonly earRight: string; readonly date: string; readonly issue: string; readonly tagline: string };
  readonly lead: ItemModel | null;
  readonly row: readonly ItemModel[];
  readonly right: RightModel;
  readonly overwhelmed: boolean;
}

export interface PapersModel {
  /** The issue's month: the papers change only when it does. */
  readonly turn: number;
  /** The lead paper, /core's: the one on the desk unless the player pulls another forward. */
  readonly lead: string;
  readonly pages: readonly PageModel[];
  /** A paper behind the front one: its title, what a click does. */
  readonly forwardLabel: string;
}

export interface ScriptModel {
  readonly heading: string;
  readonly lines: readonly { readonly kind: 'you' | 'other' | 'action'; readonly cue: string | null; readonly text: string }[];
}

export interface PhoneModel {
  /** The lock screen's notifications, newest first: the manager's (blue) and, in a frenzy, the press's (red). */
  readonly notes: readonly ('mgr' | 'press')[];
}

export interface MessagesModel {
  readonly from: string;
  /** This month's messages; a message's id is its month and its place in the month (README §5). */
  readonly messages: readonly { readonly id: string; readonly bubbles: readonly string[] }[];
  /** The tapback row: calm ❤️ 😂 👍, in a frenzy 💔 😭 👍. */
  readonly reactions: readonly string[];
}

/** The words drawn on the desk's props (README §4). */
export interface DeskLabels {
  readonly gloss: string;
  readonly clapper: { readonly prod: string; readonly scene: string; readonly take: string; readonly roll: string; readonly int: string };
  readonly metronome: string;
  readonly sheet: { readonly bridge: string; readonly breathe: string; readonly dynamic: string };
}

export interface ValueChip {
  /** `flag`: what the card marks the player as ("Went viral"), in the flag's own words. */
  readonly kind: 'hype' | 'craft' | 'heat' | 'gain' | 'cost' | 'draw' | 'flag' | 'text';
  readonly icon: IconId | null;
  readonly text: string;
}

export interface HandCardModel {
  readonly uid: number;
  readonly cardId: string;
  readonly face: CardFace;
  readonly scandal: boolean;
  readonly name: string;
  /** Values for a card whose effects are all plain values (round V1a, 0.3); else null and `rules` holds its text. */
  readonly values: readonly ValueChip[] | null;
  /** A conditional card's rules; a scandal's, when drawn and at month end. */
  readonly rules: string | null;
  /** What a card with plain values needs to be played ("Needs 20 Hype"). */
  readonly needs: string | null;
  readonly flavour: string | null;
  /** Actions it costs: bulbs on the face only above one. */
  readonly cost: number;
  readonly playable: boolean;
  /** Why it cannot be played now, as /core's playCheck says: a scandal, no actions left, or its requirement. */
  readonly why: 'scandal' | 'actions' | 'requires' | null;
}

/** The hand's own words: a face's printed header, the notes a click on a card that can't be played shows. */
export interface HandWords {
  readonly callsheet: string;
  readonly revision: string;
  readonly pass: string;
  /** The scandal face's ✕. */
  readonly cross: string;
  readonly scandal: string;
  readonly noActions: string;
}

export interface EndTurnModel {
  readonly title: string;
  readonly sub: string;
  readonly printing: number;
  readonly legal: boolean;
}

export interface DeskModel {
  /** The play phase: the hand and END TURN are on the desk. */
  readonly playing: boolean;
  readonly season: SeasonId;
  readonly crisis: boolean;
  readonly lane: LaneClass;
  readonly fameTier: number;
  readonly stats: StatBarModel;
  readonly mirror: MirrorModel;
  readonly papers: PapersModel | null;
  readonly notebook: string | null;
  readonly script: ScriptModel | null;
  readonly phone: PhoneModel;
  readonly messages: MessagesModel | null;
  readonly labels: DeskLabels;
  /** The frenzy's two crumpled paper balls: each its own shape, from the run's seed. */
  readonly balls: readonly [number, number];
  readonly hand: readonly HandCardModel[];
  readonly handWords: HandWords;
  readonly endTurn: EndTurnModel;
  /** The END TURN preview, for its hover (null outside the play phase). */
  readonly endPreview: EndTurnPreview | null;
}

export interface DeskInput {
  readonly state: GameState;
  readonly steps: readonly PlayedStep[];
  readonly lines: LinesSoFar;
}

const seasonOf = (s: GameState): SeasonId => s.content.rules.seasons?.[s.act - 1] ?? 'summer';

/**
 * The issue on the desk (see the header): in the play phase, the month's front pages as they would print if
 * the player ended the month now — composed from the history with that month end added, which `history`
 * returns; otherwise /core's issueNow.
 */
export function deskIssue(s: GameState, steps: readonly PlayedStep[]): { readonly issue: MonthPress | null; readonly history: readonly PlayedStep[] } {
  if (s.phase !== 'play') return { issue: issueNow(steps), history: steps };
  const after = reduce(s, { type: 'END_TURN' });
  const history = [...steps, { id: -1, action: { type: 'END_TURN' as const }, before: s, after, events: after.events }];
  return { issue: frontPages(history).at(-1) ?? null, history };
}

export function deskModel({ state: s, steps, lines }: DeskInput): DeskModel {
  const lane = lines.lane;
  const laneClass: LaneClass = lane === 'music' || lane === 'screen' || lane === 'celebrity' ? lane : 'early';
  const tiers = statTiers(s);
  const fame = tiers.hype?.index ?? 0;
  const { issue, history } = deskIssue(s, steps);
  const endPreview = s.phase === 'play' ? previewEndTurn(s, lines.counter, lane) : null;
  const season = seasonOf(s);

  return {
    playing: s.phase === 'play',
    season,
    crisis: issue?.frenzy ?? false,
    lane: laneClass,
    fameTier: fame,
    stats: statBar(s, lane),
    mirror: mirror(s, issue),
    papers: issue ? papers(s, issue, history, steps.length) : null,
    notebook: notebook(steps),
    script: laneClass === 'screen' ? script(s, fame) : null,
    phone: phone(s, steps, issue),
    messages: messages(s, steps, issue?.frenzy ?? false),
    labels: labels(),
    balls: [deriveSeed(s.seed, 0xba11), deriveSeed(s.seed, 0xba12)],
    hand: hand(s, lines),
    handWords: HAND_WORDS(),
    endTurn: endTurn(s, endPreview),
    endPreview,
  };
}

// ---------------------------------------------------------------------------
// The stat bar (README §1)

function statBar(s: GameState, lane: string | null): StatBarModel {
  const c = s.content;
  const cells = statCells(s, lane);
  const cell = (id: string) => cells.find((x) => x.id === id);
  const icon: Record<string, IconId> = { hype: 'star', craft: lane === 'screen' ? 'clap' : 'note', heat: 'flame', next: 'paper', money: 'cash' };
  const out: StatCellModel[] = (['hype', 'craft', 'heat', 'next', 'money'] as const).map((id) => {
    const x = cell(id);
    return {
      id,
      icon: icon[id] as IconId,
      word: x?.tier ?? x?.value ?? '',
      number: x?.tier !== null && x?.tier !== undefined ? x.value : null,
      level: x?.level ?? null,
      tipHeader: x?.tipHeader ?? '',
      tipLine: x?.tipLine ?? '',
    };
  });
  // The month's actions are all still ahead until it is played.
  const total = c.rules.slotsPerTurn;
  const left = s.phase === 'play' ? s.slots : total;
  const actionsCell = cell('actions');
  const date = calendarDate(c, s.turn);
  return {
    cells: out,
    actions: { total, left, tipHeader: t('ui.tip.actions', { stat: t('ui.stat.slotsName'), n: left }), tipLine: actionsCell?.tipLine ?? '' },
    when: {
      date: calendarLabel(c, s.turn),
      marks: Array.from({ length: date.seasonMonths }, (_, i) => (i + 1 < date.monthOfSeason ? 'past' : i + 1 === date.monthOfSeason ? 'now' : 'next')),
      tipHeader: calendarLabel(c, s.turn),
      tipLine: dateLine(c, s.turn),
    },
    deck: t('ui.deck.open'),
  };
}

// ---------------------------------------------------------------------------
// The mirror (README §3)

const NOTE_ORDER: readonly NoteColour[] = ['yellow', 'green', 'blue', 'pink'];

/** A goals-board clause in the stat bar's words, on a sticky note: never "(you have N)" — README §3. */
function noteReq(clause: MajorClause): NoteReq {
  const mark = (met: boolean) => t(met ? 'ui.note.met' : 'ui.note.unmet');
  if (clause.state !== undefined) return { met: false, mark: mark(false), icon: 'star', text: t(`goals.note.${clause.state}`) };
  if ('range' in clause) {
    const { min, max } = clause.range;
    if (clause.tierKey && min !== undefined && max === undefined) return { met: clause.met, mark: mark(clause.met), icon: 'star', text: t('goals.note.hypeMin', { tier: t(clause.tierKey), min }) };
    if (clause.key === 'scandalCount' && max !== undefined && min === undefined) return { met: clause.met, mark: mark(clause.met), icon: 'paper', text: t('goals.note.scandalsMax', { n: max }) };
    if (clause.key === 'scandalCount' && min !== undefined && max === undefined) return { met: clause.met, mark: mark(clause.met), icon: 'paper', text: t('goals.note.scandalsMin', { n: min }) };
  }
  return { met: clause.met, mark: mark(clause.met), icon: null, text: clauseText(clause) };
}

function mirror(s: GameState, issue: MonthPress | null): MirrorModel {
  const c = s.content;
  const today = endingIfYearEndedNow(s);
  // The frenzy's red clipping: the newest of the month's scandals, as the papers print it.
  const scandals = issue?.frenzy ? issue.pages.flatMap((p) => p.items).filter(isScandalLine) : [];
  const newest = scandals.reduce<PageItem | null>((a, x) => (a === null || (x.line?.step ?? 0) > (a.line?.step ?? 0) ? x : a), null);
  return {
    kicker: t('ui.goals.today'),
    today: today ? { major: majorName(c, today.majorId), minor: minorName(c, today.minorId) } : null,
    notes: c.majors
      .map((m, i) => ({ m, colour: m.note ?? (NOTE_ORDER[i % NOTE_ORDER.length] as NoteColour) }))
      .filter(({ m }) => m.id !== today?.majorId)
      .slice(0, 3)
      .map(({ m, colour }) => ({ majorId: m.id, colour, name: majorName(c, m.id), goal: majorGoal(c, m.id), reqs: majorRequirements(m, s).map(noteReq) })),
    clipping: newest ? pageItemText(c, newest) : null,
  };
}

// ---------------------------------------------------------------------------
// The papers (README §2, §7)

function papers(s: GameState, issue: MonthPress, history: readonly PlayedStep[], realSteps: number): PapersModel {
  const c = s.content;
  const press = c.press;
  const bo = press?.boxOffice;
  const season = s.content.rules.seasons?.[issue.act - 1] ?? 'summer';
  const pages = issue.pages.map((fp): PageModel => {
    const def = press?.papers.find((p) => p.id === fp.paper);
    const id = fp.paper;
    const lead = fp.items[0] ?? null;
    const leadItem = lead ? item(s, id, lead, true, history, realSteps) : null;
    return {
      paper: id,
      masthead: {
        name: mastheadName(c, id),
        sub: has(`paper.${id}.sub`) ? t(`paper.${id}.sub`) : null,
        earLeft: t(`paper.${id}.ear.left`, has(`paper.${id}.weather.${season}`) ? { weather: t(`paper.${id}.weather.${season}`) } : {}),
        earRight: t(`paper.${id}.ear.right`),
        date: calendarLabel(c, issue.turn),
        issue: t(`paper.${id}.issue`, { n: ((def?.issue?.base ?? 0) + issue.turn * (def?.issue?.step ?? 1)).toLocaleString('en-GB') }),
        tagline: t(`paper.${id}.tagline`),
      },
      lead: leadItem,
      row: fp.items.slice(1, 4).map((x) => item(s, id, x, false, history, realSteps)),
      right: right(s, fp, lead, issue, season, bo),
      overwhelmed: fp.overwhelmed,
    };
  });
  return { turn: issue.turn, lead: issue.lead, pages, forwardLabel: t('ui.desk.paperForward') };
}

const isScandalLine = (x: PageItem): boolean => x.kind === 'player' && x.line?.kind === 'scandal';

function item(s: GameState, paper: string, x: PageItem, isLead: boolean, history: readonly PlayedStep[], realSteps: number): ItemModel {
  const c = s.content;
  const scandal = isScandalLine(x);
  const mine = x.kind === 'player' || x.kind === 'filler' || x.kind === 'spillover';
  const brief = x.slot === 'brief';
  const kicker = brief || x.kind === 'spillover' ? t('paper.kicker.brief') : scandal ? t('paper.kicker.scandal') : mine || x.kind === 'rival' ? t(`paper.${paper}.kicker.player`) : t(`paper.${paper}.kicker.world`);
  return {
    kind: x.kind,
    kicker,
    text: pageItemText(c, x),
    dek: isLead ? dek(s, x, history) : null,
    mark: mine ? 'you' : x.kind === 'rival' ? 'rival' : null,
    red: scandal,
    brief,
    coming: x.line !== null && x.line.step >= realSteps,
  };
}

/** The lead's dek: the card behind the player's story and what it did; a scandal's card and the card blamed. */
function dek(s: GameState, x: PageItem, history: readonly PlayedStep[]): string | null {
  const c = s.content;
  const line = x.line;
  if (x.kind !== 'player' || !line) return null;
  const step = history[line.step];
  if (!step) return null;
  if (line.kind === 'scandal') {
    const e: GameEvent | undefined = step.events[line.event];
    const cause = e?.type === 'addCard' ? step.events.find((ev) => ev.type === 'scandal' && ev.uid === e.uid) : undefined;
    const blamed = cause?.type === 'scandal' ? cause.cause : null;
    return blamed ? t('paper.dek.scandal', { card: cardName(c, line.cardId), cause: cardName(c, blamed) }) : cardName(c, line.cardId);
  }
  const deltas = outcomeOf(step.events).deltas;
  const effects = (['hype', 'craft', 'heat', 'capital'] as const)
    .filter((k) => deltas[k] !== 0)
    .map((k) => t('ui.effect.resource', { delta: signedAmount(k, deltas[k]), resource: resourceName(k) }))
    .join(' · ');
  return effects ? t('paper.dek', { card: cardName(c, line.cardId), effects }) : cardName(c, line.cardId);
}

function right(s: GameState, fp: FrontPage, lead: PageItem | null, issue: MonthPress, season: SeasonId, bo: NonNullable<GameState['content']['press']>['boxOffice']): RightModel {
  const c = s.content;
  if (!lead) return null;
  // The Marquee's right column (README §2, as the mockup sets it): the weekend box office, unless the lead
  // is the rival's, a scandal, or the player's own story before they are famous — those carry a photograph.
  const mine = lead.kind === 'player' || lead.kind === 'filler' || lead.kind === 'spillover';
  const photographed = lead.kind === 'rival' || isScandalLine(lead) || (mine && issue.fameTier < (bo?.player.fromTier ?? Infinity));
  if (bo && fp.paper === bo.paper && !photographed) {
    const rows = boxOffice(c, s.seed, issue.turn, issue.fameTier, issue.lane);
    return {
      kind: 'boxoffice',
      title: t(`paper.${bo.paper}.boxoffice.title`),
      rows: rows.map((r, i) => ({ rank: i + 1, title: t(r.titleKey), gross: t(`paper.${bo.paper}.boxoffice.gross`, { m: (r.gross / 10).toFixed(1) }), fresh: r.fresh ? t(`paper.${bo.paper}.boxoffice.new`) : null, player: r.player })),
    };
  }
  const scene = lead.scene;
  if (!scene) return null;
  // Several drawings a scene, chosen by shuffle bag on /core's count of this paper's leads with the scene:
  // never the same picture on the same paper two times running. The street is drawn in the issue's season.
  const variant = bagIndex(s.seed, `photo:${fp.paper}:${scene}`, lead.photo ?? 0, PHOTO_VARIANTS);
  const caption = isScandalLine(lead) || lead.kind === 'spillover' ? 'paper.caption.scandal' : mine ? 'paper.caption.player' : lead.kind === 'rival' ? 'paper.caption.rival' : 'paper.caption.world';
  return { kind: 'photo', scene, variant, season, caption: t(caption) };
}

// ---------------------------------------------------------------------------
// The desk (README §4)

/** The notebook's page: the player's latest quiet line — private work, never in the press. */
function notebook(steps: readonly PlayedStep[]): string | null {
  const quiet = pressLines(steps).filter((l) => l.paper === null && l.kind === 'play');
  const last = quiet.at(-1);
  const first = steps[0]?.after;
  return last && first ? lineText(first.content, last, last.cardId, last.subjectKey) : null;
}

/** The script on an actor's desk: its fame band's scenes, one a season. */
function script(s: GameState, fame: number): ScriptModel | null {
  const c = s.content;
  const band = fameBand(c, fame);
  const scripts = (c.scripts?.scripts ?? []).filter((x) => x.band === band);
  const sc = scripts[(s.act - 1) % Math.max(1, scripts.length)];
  if (!sc) return null;
  return {
    heading: t(sc.headingKey),
    lines: sc.lines.map((l) => {
      const text = t(l.key);
      if (l.kind === 'action') return { kind: 'action' as const, cue: null, text };
      const at = text.indexOf(': ');
      return at > 0 ? { kind: l.kind, cue: text.slice(0, at), text: text.slice(at + 2) } : { kind: l.kind, cue: null, text };
    }),
  };
}

// ---------------------------------------------------------------------------
// The phone and the manager (README §5)

function thisMonth(s: GameState, steps: readonly PlayedStep[]) {
  return managerMessages(steps).find((m) => m.turn === s.turn) ?? null;
}

function phone(s: GameState, steps: readonly PlayedStep[], issue: MonthPress | null): PhoneModel {
  const mgr = thisMonth(s, steps)?.messages.length ?? 0;
  // In a frenzy the press piles in: one alert for each story of the player's that is a scandal or spills over.
  const alerts = issue?.frenzy ? issue.pages.flatMap((p) => p.items).filter((x) => isScandalLine(x) || x.kind === 'spillover').length : 0;
  const press = Math.min(alerts, Math.max(0, 6 - mgr));
  const notes: ('mgr' | 'press')[] = [];
  for (let i = 0; i < Math.max(mgr, press); i++) {
    if (i < press) notes.push('press');
    if (i < mgr) notes.push('mgr');
  }
  return { notes };
}

function messages(s: GameState, steps: readonly PlayedStep[], frenzy: boolean): MessagesModel | null {
  if (s.manager === null) return null;
  const month = thisMonth(s, steps);
  return {
    // The manager by their first name, as the mockup labels the bubbles ("Marguerite · Manager"): the full name
    // runs into the mirror's bulbs.
    from: t('ui.phone.from', { name: managerName(s.content, s.manager).split(/\s+/)[0] ?? '' }),
    messages: (month?.messages ?? []).map((m, i) => ({ id: `${month?.turn ?? s.turn}.${i}`, bubbles: messageBubbles(s.manager as string, m) })),
    reactions: t(frenzy ? 'ui.react.frenzy' : 'ui.react.calm').split(' '),
  };
}

function labels(): DeskLabels {
  return {
    gloss: t('desk.gloss'),
    clapper: { prod: t('desk.clapper.prod'), scene: t('desk.clapper.scene'), take: t('desk.clapper.take'), roll: t('desk.clapper.roll'), int: t('desk.clapper.int') },
    metronome: t('desk.metronome'),
    sheet: { bridge: t('desk.sheet.bridge'), breathe: t('desk.sheet.breathe'), dynamic: t('desk.sheet.dynamic') },
  };
}

// ---------------------------------------------------------------------------
// The hand (README §6)

/** The effects a face shows as values; a flag it sets is a value too, named by the flag's own label. */
const PLAIN_OPS = new Set(['resource', 'draw', 'slots', 'setFlag']);

/**
 * A card's effects as values (round V1a, 0.3): icon and number in the resource's colour — craft's icon the
 * stat bar's, by the established lane; drawing is "Draw N"; extra actions and a flag set in their words.
 */
function chips(s: GameState, cardId: string, lane: string | null): ValueChip[] | null {
  const card = getCard(s.content, cardId);
  const effects = card?.effects ?? [];
  if (!card || !effects.every((e) => PLAIN_OPS.has(e.op))) return null;
  return effects.map((e): ValueChip => {
    if (e.op === 'draw') return { kind: 'draw', icon: 'cards', text: t('ui.card.draw', { n: e.count }) };
    if (e.op === 'resource') {
      if (e.target === 'capital') return { kind: e.value >= 0 ? 'gain' : 'cost', icon: null, text: signedMoney(e.value) };
      if (e.target === 'hype') return { kind: 'hype', icon: 'star', text: signed(e.value) };
      if (e.target === 'craft') return { kind: 'craft', icon: lane === 'screen' ? 'clap' : 'note', text: signed(e.value) };
      return { kind: 'heat', icon: 'flame', text: signed(e.value) };
    }
    if (e.op === 'setFlag') return { kind: 'flag', icon: null, text: flagName(e.flag) };
    if (e.op === 'slots') return { kind: 'text', icon: null, text: tp('ui.effect.slots', e.value, { delta: signed(e.value) }) };
    return { kind: 'text', icon: null, text: cardText(s.content, cardId) };
  });
}

const capitalised = (text: string): string => text.charAt(0).toLocaleUpperCase('en') + text.slice(1);

const HAND_WORDS = (): HandWords => ({
  callsheet: t('ui.face.callsheet'),
  revision: t('ui.face.revision'),
  pass: t('ui.face.pass'),
  cross: t('ui.face.cross'),
  scandal: t('ui.toast.scandal'),
  noActions: t('ui.toast.noActions'),
});

function hand(s: GameState, lines: LinesSoFar): HandCardModel[] {
  const c = s.content;
  const legal = legalOf(s);
  return s.hand.map((h) => {
    const def = getCard(c, h.cardId);
    const scandal = def?.kind === 'scandal';
    const values = scandal ? [{ kind: 'text' as const, icon: null, text: t('ui.card.cantPlay') }] : chips(s, h.cardId, lines.lane);
    const playable = legal.play.has(h.uid);
    const check = playable ? null : playCheck(s, h.uid);
    return {
      uid: h.uid,
      cardId: h.cardId,
      face: cardFace(c, h.cardId) ?? 'notebook',
      scandal,
      name: cardName(c, h.cardId),
      values,
      rules: scandal ? cardRuleLines(c, h.cardId).join(' ') || null : values === null ? cardText(c, h.cardId) : null,
      needs: !scandal && values !== null && def?.requires ? capitalised(t('ui.card.needs', { cond: conditionText(c, def.requires) })) : null,
      flavour: scandal ? lineText(c, lines.inHand.get(h.uid), h.cardId) : cardFlavor(c, h.cardId),
      cost: def?.cost ?? 1,
      playable,
      why: scandal ? 'scandal' : !check ? null : check.blockers.some((b) => b.code === 'slots') ? 'actions' : 'requires',
    };
  });
}

function endTurn(s: GameState, preview: EndTurnPreview | null): EndTurnModel {
  const n = preview?.scandalCards.length ?? 0;
  return { title: t('ui.end.title'), sub: n === 0 ? t('ui.end.none') : n === 1 ? t('ui.end.one') : t('ui.end.many', { n }), printing: n, legal: legalOf(s).endTurn };
}
