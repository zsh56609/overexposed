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
  evaluate,
  explainCondition,
  fameBand,
  frontPages,
  getCard,
  getEvent,
  getManager,
  heatLine,
  SCENE_DRAWINGS,
  issueNow,
  majorRequirements,
  managerMessages,
  playCheck,
  pressLines,
  reduce,
  scandalCount,
  statTiers,
  type AvatarId,
  type CardFace,
  type Condition,
  type ContentIndex,
  type CountdownLevel,
  type Effect,
  type FlagTest,
  type Range,
  type FrontPage,
  type GameEvent,
  type GameState,
  type CardInstance,
  type ClauseReport,
  type MajorClause,
  type MonthPress,
  type NoteColour,
  type PageItem,
  type SceneId,
  type SeasonId,
} from '../../core/index.ts';
import { has, t, tp } from '../i18n.ts';
import { legalOf, outcomeOf, previewEndTurn, type EndTurnPreview, type LinesSoFar, type Outcome } from '../preview.ts';
import type { PlayedStep } from '../queue.ts';
import { statCells } from '../stats.ts';
import {
  calendarLabel,
  cardFlavor,
  cardName,
  clauseText,
  conditionText,
  countWords,
  dateLine,
  effectText,
  flagName,
  flagNegative,
  gateName,
  lineText,
  majorGoal,
  majorName,
  managerName,
  mastheadName,
  messageBubbles,
  minorName,
  money,
  pageItemText,
  resourceName,
  seasonName,
  signed,
  signedAmount,
  signedMoney,
  tagName,
  zoneName,
  type CountWords,
} from '../text.ts';

/** How many drawings each photograph scene has (README §2: several variants of the same drawing): core's. */
export const PHOTO_VARIANTS = SCENE_DRAWINGS;

export type LaneClass = 'music' | 'screen' | 'celebrity' | 'early';
export type IconId = 'star' | 'note' | 'clap' | 'flame' | 'paper' | 'cash' | 'cards' | 'gear' | 'bulb';

export interface StatCellModel {
  readonly id: 'hype' | 'craft' | 'heat' | 'next' | 'money';
  readonly icon: IconId;
  /** The cell's label (round R9b, B1): the stat's name, "Next scandal", "Money". */
  readonly label: string;
  /** The small word beside the big number — a tier, the countdown's words ("to go") — or, for money, the money itself. */
  readonly word: string;
  /** The big number: a stat's value, the countdown's count; none for money, whose money is its big value. */
  readonly number: string | null;
  /** Words before the countdown's count, for a language that puts them there; empty in English. */
  readonly lead: string;
  readonly level: CountdownLevel | null;
  readonly tipHeader: string;
  readonly tipLine: string;
}

export interface StatBarModel {
  readonly cells: readonly StatCellModel[];
  readonly actions: { readonly total: number; readonly left: number; readonly tipHeader: string; readonly tipLine: string };
  readonly when: { readonly date: string; readonly marks: readonly ('past' | 'now' | 'next')[]; readonly tipHeader: string; readonly tipLine: string };
  /**
   * The deck's cell, and House rules' (round R1, G1 and G3): since round R9b (B1) cells of the bar — Deck & discard with
   * the cards still to draw and played, each its count among its words, the deck viewer's own counts.
   */
  readonly deck: { readonly label: string; readonly toDraw: CountWords; readonly played: CountWords };
  readonly settings: string;
  /** The scandals held — deck, hand and discard — on the deck's button, and its tooltip (round R3, D1). */
  readonly held: { readonly n: number; readonly tipHeader: string; readonly tipLine: string };
}

export interface NoteReq {
  readonly met: boolean;
  /** ✓ or ✗. */
  readonly mark: string;
  readonly icon: 'star' | 'paper' | null;
  readonly text: string;
  /** A scandal clause's "(you have N)", as the doors show it (round R3, D1). */
  readonly have?: string;
}

export interface MirrorNote {
  readonly majorId: string;
  readonly colour: NoteColour;
  readonly name: string;
  /** Its goal line: no longer on the note (round R8a, E3), its tooltip since round R8b (B7). */
  readonly goal: string;
  readonly reqs: readonly NoteReq[];
}

export interface MirrorModel {
  readonly kicker: string;
  /** The black card: where the year would land today; its major's goal line is its tooltip (round R8b, B7). */
  readonly today: { readonly majorId: string; readonly major: string; readonly minor: string; readonly goal: string } | null;
  /** The other three majors, in content's order. */
  readonly notes: readonly MirrorNote[];
  /** In a frenzy, the red clipping stuck to the glass: the month's newest scandal headline. */
  readonly clipping: string | null;
  /** The season's two doors on a white index card (round R9b, A3); null when the act's doors are not one fixed pair. */
  readonly doors: DoorsCardModel | null;
}

/**
 * A door's requirement as the door states it (round R9b, A3: one helper for the doors and the mirror's doors card): the
 * stat's icon and its threshold in the stat's colour — "18+", "4 or fewer", "$4,000+" — with what the player has; a
 * requirement without a stat ("Signed to a label") is its words.
 */
export interface RequirementChip {
  readonly met: boolean;
  readonly icon: IconId | null;
  /** The value colour's class: r-hype, r-craft, r-heat, r-gain (money), r-cost (scandals); none for words. */
  readonly cls: string | null;
  readonly text: string;
  /** "(you have N)", for a stat. */
  readonly have: string | null;
}

/** A door on the mirror's card (round R9b, A3): ✓ when every requirement is met now — the door's Likely — its name, its chips. */
export interface DoorRow {
  readonly gateId: string;
  readonly met: boolean;
  /** ✓ or ✗. */
  readonly mark: string;
  readonly name: string;
  readonly chips: readonly RequirementChip[];
}

export interface DoorsCardModel {
  /** "End of spring · one door"; in the last act "Winter · the last door". */
  readonly kicker: string;
  readonly rows: readonly DoorRow[];
}

export interface ItemModel {
  readonly story: string;
  readonly stars: string | null;
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

/** The bars the lock screen holds (round R8a, C2): the redrawn phone's taller screen holds seven. */
export const LOCK_BARS = 7;

export interface PhoneModel {
  /**
   * The lock screen's press alerts, red, below the manager's bars (round R8a, C2): in a frenzy, one for each of the
   * player's stories that is a scandal or spills over, filling what the month's bubbles leave of the screen's seven —
   * counted from the month's start, so none goes as a bubble comes. The manager's bars are not the model's: one for
   * each bubble on screen, the desk counts them as they come (DeskItems' Bubbles and Phone).
   */
  readonly press: number;
}

export interface MessagesModel {
  /** The month the messages are for (round R3, C2: a bubble once shown stays until it ends). */
  readonly month: number;
  readonly from: string;
  /** The manager's face (round R8a): it begins the name row. */
  readonly avatar: AvatarId | null;
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
  /** `flag`: what the card marks the player as ("Went viral"), in the flag's own words; `add`: a card added. */
  readonly kind: 'hype' | 'craft' | 'heat' | 'gain' | 'cost' | 'draw' | 'flag' | 'scandal' | 'action' | 'text' | 'add';
  readonly icon: IconId | null;
  readonly text: string;
  /** Before the icon (round R8a): a card added's sign, "+" or "+2×". */
  readonly lead?: string;
}

/**
 * A line of a card's body (round R1, H2): its words ("Needs", "Otherwise", a flag's label, "At month end:"), the
 * condition in icons, an arrow for a branch, and what the line gives as value chips.
 */
export interface FaceLine {
  readonly label: string | null;
  readonly cond: readonly ValueChip[];
  readonly arrow: boolean;
  readonly chips: readonly ValueChip[];
}

export interface HandCardModel {
  readonly uid: number;
  readonly cardId: string;
  readonly face: CardFace;
  readonly scandal: boolean;
  readonly name: string;
  /** Its body, in order (round R1, H1–H2): what it needs, its effects as icons and numbers, a scandal's rules. */
  readonly lines: readonly FaceLine[];
  /** An opportunity: a small label on the face, like the cost bulbs (round R1, H2). */
  readonly opportunity: boolean;
  /**
   * The italic line, always last on the face; a scandal's is its in-hand line. Round R8a (E1): a card in the hand — and
   * so in flight and on the pile — has none but a scandal's; its preview shows it. An offer's or the deck's face keeps it.
   */
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
  readonly opportunity: string;
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
  return { issue: frontPages(history).slice(-1)[0] ?? null, history };
}

/**
 * The paper a play brings to the front (round R1, H3; README §2): of the papers whose visible stories — the lead
 * and the row of three — the play changes, the one whose lead changed; when both or neither changed their lead,
 * the one with the played card's own story. None when the play changes no visible story. Read from the desk's
 * issue before and after the play, as the desk shows them; `history` is the run before the play.
 */
export function paperForPlay(history: readonly PlayedStep[], step: PlayedStep): string | null {
  if (!step.before || step.before.phase !== 'play' || step.after.phase !== 'play' || !step.events.some((e) => e.type === 'play')) return null;
  const before = deskIssue(step.before, history).issue;
  const after = deskIssue(step.after, [...history, step]).issue;
  if (!before || !after) return null;
  const id = (x: PageItem): string => (x.line ? `${x.line.step}:${x.line.event}` : `${x.kind}:${x.key ?? ''}`);
  const visible = (paper: string, issue: MonthPress): string[] => (issue.pages.find((p) => p.paper === paper)?.items ?? []).slice(0, 4).map(id);
  const changed = after.pages.map((p) => p.paper).filter((paper) => visible(paper, after).join('|') !== visible(paper, before).join('|'));
  if (changed.length <= 1) return changed[0] ?? null;
  const leads = changed.filter((paper) => visible(paper, after)[0] !== visible(paper, before)[0]);
  if (leads.length === 1) return leads[0] ?? null;
  const own = changed.find((paper) => (after.pages.find((p) => p.paper === paper)?.items ?? []).slice(0, 4).some((x) => x.line?.step === history.length && x.line.kind === 'play'));
  return own ?? changed[0] ?? null;
}

export function deskModel({ state: s, steps, lines }: DeskInput): DeskModel {
  const lane = lines.lane;
  const laneClass: LaneClass = lane === 'music' || lane === 'screen' || lane === 'celebrity' ? lane : 'early';
  const tiers = statTiers(s);
  const fame = tiers.hype?.index ?? 0;
  const { issue, history } = deskIssue(s, steps);
  const endPreview = s.phase === 'play' ? previewEndTurn(s, lines.counter, lane) : null;
  const season = seasonOf(s);

  const msgs = messages(s, steps, issue?.frenzy ?? false);
  return {
    playing: s.phase === 'play',
    season,
    crisis: issue?.frenzy ?? false,
    lane: laneClass,
    fameTier: fame,
    stats: statBar(s, lane),
    mirror: mirror(s, issue, lane),
    papers: issue ? papers(s, issue, history, steps.length) : null,
    notebook: notebook(steps),
    script: laneClass === 'screen' ? script(s, fame) : null,
    phone: phone(issue, (msgs?.messages ?? []).reduce((n, m) => n + m.bubbles.length, 0)),
    messages: msgs,
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

export function statBar(s: GameState, lane: string | null): StatBarModel {
  const c = s.content;
  const cells = statCells(s, lane);
  const cell = (id: string) => cells.find((x) => x.id === id);
  const icon: Record<string, IconId> = { hype: 'star', craft: lane === 'screen' ? 'clap' : 'note', heat: 'flame', next: 'paper', money: 'cash' };
  // The countdown's count set big among its words (round R9b, B1): "7" and "to go".
  const line = heatLine(s);
  const count = countWords(line.crossed ? 'ui.stat.crossed' : 'ui.stat.toGo', line.toNext);
  const out: StatCellModel[] = (['hype', 'craft', 'heat', 'next', 'money'] as const).map((id) => {
    const x = cell(id);
    return {
      id,
      icon: icon[id] as IconId,
      label: x?.label ?? '',
      word: id === 'next' ? count.tail : (x?.tier ?? x?.value ?? ''),
      number: id === 'next' ? count.n : x?.tier !== null && x?.tier !== undefined ? x.value : null,
      lead: id === 'next' ? count.lead : '',
      level: x?.level ?? null,
      tipHeader: x?.tipHeader ?? '',
      tipLine: x?.tipLine ?? '',
    };
  });
  // The month's actions are all still ahead until it is played.
  const total = c.rules.slotsPerTurn;
  // This month's actions show from its first decision on: in play, or once an event has been answered (round R2).
  const left = s.phase === 'play' || s.eventLog.some((r) => r.turn === s.turn) ? s.slots : total;
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
    deck: { label: t('ui.deck.open'), toDraw: countWords('ui.stat.toDraw', s.deck.length), played: countWords('ui.stat.played', s.discard.length) },
    settings: t('ui.title.settings'),
    held: { n: scandalCount(s), tipHeader: t('ui.tip.held', { n: scandalCount(s) }), tipLine: t('ui.tip.heldLine') },
  };
}

// ---------------------------------------------------------------------------
// The mirror (README §3)

const NOTE_ORDER: readonly NoteColour[] = ['yellow', 'green', 'blue', 'pink'];

/**
 * A goals-board clause in the stat bar's words, on a sticky note (README §3). Its number stays off the note but for a
 * scandal clause's "(you have N)", as the doors show it (round R3, D1): the stat bar shows no count of scandals held.
 * A scandal clause says its threshold the doors' way (round R5, B7): the mark, the scandal icon, "6+" or "5 or fewer".
 */
function noteReq(clause: MajorClause): NoteReq {
  const mark = (met: boolean) => t(met ? 'ui.note.met' : 'ui.note.unmet');
  if (clause.state !== undefined) return { met: false, mark: mark(false), icon: 'star', text: t(`goals.note.${clause.state}`) };
  if ('range' in clause) {
    const { min, max } = clause.range;
    if (clause.tierKey && min !== undefined && max === undefined) return { met: clause.met, mark: mark(clause.met), icon: 'star', text: t('goals.note.hypeMin', { tier: t(clause.tierKey), min }) };
    // The scandals held, beside a scandal clause (round R3, D1): the one count the stat bar does not show.
    const have = clause.key === 'scandalCount' && 'value' in clause ? t('ui.doors.have', { n: clause.value }) : undefined;
    if (clause.key === 'scandalCount' && max !== undefined && min === undefined) return { met: clause.met, mark: mark(clause.met), icon: 'paper', text: t('ui.doors.max', { n: max }), have };
    if (clause.key === 'scandalCount' && min !== undefined && max === undefined) return { met: clause.met, mark: mark(clause.met), icon: 'paper', text: t('ui.doors.min', { n: min }), have };
  }
  return { met: clause.met, mark: mark(clause.met), icon: null, text: clauseText(clause) };
}

/** A requirement's stat: its icon and its value colour, as the stat bar and the cards show it. */
const REQUIREMENT_STAT: Partial<Record<ClauseReport['key'], { readonly icon: (lane: string | null) => IconId; readonly cls: string }>> = {
  hype: { icon: () => 'star', cls: 'r-hype' },
  craft: { icon: (lane) => (lane === 'screen' ? 'clap' : 'note'), cls: 'r-craft' },
  heat: { icon: () => 'flame', cls: 'r-heat' },
  capital: { icon: () => 'cash', cls: 'r-gain' },
  scandalCount: { icon: () => 'paper', cls: 'r-cost' },
};

/** A door's requirement as a chip (see RequirementChip): the doors' "Requires" and the mirror's doors card. */
export function requirementChip(clause: ClauseReport, lane: string | null): RequirementChip {
  const stat = REQUIREMENT_STAT[clause.key];
  if (stat && 'range' in clause) {
    const { min, max } = clause.range;
    const n = (x: number) => (clause.key === 'capital' ? money(x) : String(x));
    const text = min !== undefined && max === undefined ? t('ui.doors.min', { n: n(min) }) : max !== undefined && min === undefined ? t('ui.doors.max', { n: n(max) }) : clauseText(clause);
    return { met: clause.met, icon: stat.icon(lane), cls: stat.cls, text, have: t('ui.doors.have', { n: n(clause.value) }) };
  }
  return { met: clause.met, icon: null, cls: null, text: clauseText(clause), have: null };
}

/**
 * The season's doors on the mirror (round R9b, A3): the act's pair is fixed and needs no draw — true only while each act
 * has exactly the doors a season offers, else no card. Each door: ✓ when every requirement is met now, the test the
 * reducer runs at the door (its Likely), its name and its requirements as the door states them.
 */
function doorsCard(s: GameState, lane: string | null): DoorsCardModel | null {
  const c = s.content;
  const gates = c.gatesByAct[String(s.act)] ?? [];
  if (gates.length !== c.rules.gatesOffered) return null;
  const season = seasonName(c, s.act);
  return {
    kicker: s.act === c.rules.acts ? t('ui.doors.lastKicker', { season }) : t('ui.doors.kicker', { season: season.toLocaleLowerCase('en') }),
    rows: gates.map((gate) => {
      const met = evaluate(gate.requires, s);
      return { gateId: gate.id, met, mark: t(met ? 'ui.note.met' : 'ui.note.unmet'), name: gateName(c, gate.id), chips: explainCondition(gate.requires, s).map((clause) => requirementChip(clause, lane)) };
    }),
  };
}

function mirror(s: GameState, issue: MonthPress | null, lane: string | null): MirrorModel {
  const c = s.content;
  const today = endingIfYearEndedNow(s);
  // The frenzy's red clipping: the newest of the month's scandals, as the papers print it.
  const scandals = issue?.frenzy ? issue.pages.flatMap((p) => p.items).filter(isScandalLine) : [];
  const newest = scandals.reduce<PageItem | null>((a, x) => (a === null || (x.line?.step ?? 0) > (a.line?.step ?? 0) ? x : a), null);
  return {
    kicker: t('ui.goals.today'),
    today: today ? { majorId: today.majorId, major: majorName(c, today.majorId), minor: minorName(c, today.minorId), goal: majorGoal(c, today.majorId) } : null,
    notes: c.majors
      .map((m, i) => ({ m, colour: m.note ?? (NOTE_ORDER[i % NOTE_ORDER.length] as NoteColour) }))
      .filter(({ m }) => m.id !== today?.majorId)
      .slice(0, 3)
      .map(({ m, colour }) => ({ majorId: m.id, colour, name: majorName(c, m.id), goal: majorGoal(c, m.id), reqs: majorRequirements(m, s).map(noteReq) })),
    clipping: newest ? pageItemText(c, newest) : null,
    doors: doorsCard(s, lane),
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
  const coming = x.line !== null && x.line.step >= realSteps;
  const review = paper === c.press?.route.loud.music && x.kind === 'player' && x.line?.kind === 'play' && getCard(c, x.line.cardId)?.release;
  // A review remembers the craft at the release, rather than changing with later practice.
  const craft = x.line ? statTiers(history[x.line.step]?.after ?? s).craft : null;
  const kicker = coming ? t('paper.kicker.coming') : brief || x.kind === 'spillover' ? t('paper.kicker.brief') : scandal ? t('paper.kicker.scandal') : mine || x.kind === 'rival' ? t(`paper.${paper}.kicker.player`) : t(`paper.${paper}.kicker.world`);
  return {
    kind: x.kind,
    story: x.line ? `${x.line.step}:${x.line.event}` : `${x.kind}:${pageItemText(c, x)}`,
    stars: review && craft ? t(`paper.review.${craft.index}`) : null,
    kicker,
    text: pageItemText(c, x),
    dek: isLead ? dek(s, x, history) : null,
    mark: mine ? 'you' : x.kind === 'rival' ? 'rival' : null,
    red: scandal,
    brief,
    coming,
  };
}

/** The lead's dek: the card behind the player's story and what it did; a scandal's card and the card blamed. */
function dek(s: GameState, x: PageItem, history: readonly PlayedStep[]): string | null {
  const c = s.content;
  const line = x.line;
  if (x.kind !== 'player' || !line) return null;
  const step = history[line.step];
  if (!step) return null;
  if (line.source) {
    // An event's answer (round R2, Part D): the player's own reply stands where a card's name does, then what it did.
    const reply = getEvent(c, line.source.eventId)?.choices[line.source.choice]?.replyKey;
    const rest = step.events.slice(line.event + 1);
    const stop = rest.findIndex((e) => e.type === 'draftOffer' || e.type === 'turnStart');
    const deltas = outcomeOf(stop === -1 ? rest : rest.slice(0, stop)).deltas;
    const did = (['hype', 'craft', 'heat', 'capital'] as const)
      .filter((k) => deltas[k] !== 0)
      .map((k) => t('ui.effect.resource', { delta: signedAmount(k, deltas[k]), resource: resourceName(k) }))
      .join(' · ');
    const words = reply ? t(reply) : '';
    return did ? t('paper.dek', { card: words, effects: did }) : words || null;
  }
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
  const last = quiet.slice(-1)[0];
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

/** The phone's press bars (round R8a, C2), from the month's issue and the bubbles its messages will bring. */
function phone(issue: MonthPress | null, bubbles: number): PhoneModel {
  // In a frenzy the press piles in: one alert for each story of the player's that is a scandal or spills over.
  const alerts = issue?.frenzy ? issue.pages.flatMap((p) => p.items).filter((x) => isScandalLine(x) || x.kind === 'spillover').length : 0;
  return { press: Math.min(alerts, Math.max(0, LOCK_BARS - bubbles)) };
}

function messages(s: GameState, steps: readonly PlayedStep[], frenzy: boolean): MessagesModel | null {
  if (s.manager === null) return null;
  const month = thisMonth(s, steps);
  return {
    month: month?.turn ?? s.turn,
    // The manager by their first name, as the mockup labels the bubbles ("Marguerite · Manager"): the full name
    // runs into the mirror's bulbs.
    from: t('ui.phone.from', { name: managerName(s.content, s.manager).split(/\s+/)[0] ?? '' }),
    avatar: getManager(s.content, s.manager)?.avatar ?? null,
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

/** The stat bar's order, the order a condition's stats are shown in. */
const COND_ORDER: readonly (keyof Condition)[] = ['hype', 'craft', 'heat', 'scandalCount', 'capital', 'act', 'turn', 'flags'];

const craftIcon = (lane: string | null): IconId => (lane === 'screen' ? 'clap' : 'note');

/**
 * The craft a card builds (round R4, A8): craft stays one number, its colour says which stat it is, and its icon says
 * what kind of craft — a music card's note, a screen card's clapperboard, whatever the career; a card shown as a lane
 * variant (round R3, E2: Vocal Coaching as Scene Study) takes the variant's lane. Neutral and celebrity cards keep
 * the career's icon, as the stat bar and the doors' thresholds do — the note before a lane is established: she
 * starts as a singer.
 */
export function craftLane(c: ContentIndex, cardId: string, career: string | null): string | null {
  const def = getCard(c, cardId);
  if (career !== null && def?.laneText?.[career]) return career;
  return def?.lane === 'music' || def?.lane === 'screen' ? def.lane : career;
}
const capitalised = (text: string): string => text.charAt(0).toLocaleUpperCase('en') + text.slice(1);

/**
 * A card added that is no scandal (round R8a, D1): a short chip, not a sentence — "+", the cards icon, the card's name;
 * "+2×" for more. The same on the faces, the replies, the previews and the doors; a scandal added keeps its newspaper.
 */
export const addChip = (c: ContentIndex, cardId: string, count: number): ValueChip => ({ kind: 'add', lead: count > 1 ? `+${count}×` : '+', icon: 'cards', text: cardName(c, cardId) });

/**
 * One effect as value chips (round V1a, 0.3; every number an icon and a number since round R1, H2): a resource in
 * its colour — craft's icon the stat bar's, by the established lane; drawing "Draw N"; scandals removed or added as the
 * countdown's newspaper in scandal red; a card added as its chip (round R8a); a flag set in its own words; what is no
 * number in a short phrase of the existing words ("Remove a Stunt card").
 */
function effectChip(c: ContentIndex, e: Effect, lane: string | null, self?: string): ValueChip[] {
  switch (e.op) {
    case 'draw':
      return [{ kind: 'draw', icon: 'cards', text: t('ui.card.draw', { n: e.count }) }];
    case 'resource':
      if (e.target === 'capital') return [{ kind: e.value >= 0 ? 'gain' : 'cost', icon: null, text: signedMoney(e.value) }];
      if (e.target === 'hype') return [{ kind: 'hype', icon: 'star', text: signed(e.value) }];
      if (e.target === 'craft') return [{ kind: 'craft', icon: craftIcon(lane), text: signed(e.value) }];
      return [{ kind: 'heat', icon: 'flame', text: signed(e.value) }];
    case 'setFlag':
      return [{ kind: 'flag', icon: null, text: flagName(e.flag) }];
    case 'slots':
      return [{ kind: 'text', icon: null, text: tp('ui.face.slots', e.value, { delta: signed(e.value) }) }];
    case 'exhaustTag':
      if (e.tag === 'scandal') return [{ kind: 'scandal', icon: 'paper', text: signed(-(e.count ?? 1)) }];
      return [{ kind: 'text', icon: null, text: tp('ui.face.exhaust', e.count ?? 1, { count: e.count ?? 1, tag: capitalised(tagName(e.tag)) }) }];
    case 'addCard':
      if (e.cardId === self) return [{ kind: 'text', icon: null, text: capitalised(t('ui.effect.copySelf', { zone: zoneName(e.to) })) }];
      if (getCard(c, e.cardId)?.kind === 'scandal') return [scandalChip(e.count ?? 1)];
      return [addChip(c, e.cardId, e.count ?? 1)];
    case 'conditional':
      return [{ kind: 'text', icon: null, text: capitalised(effectText(c, e, self)) }];
  }
}

/** A threshold in icons: "★ 25+", "📰 2+", "$4,000" (money needs no plus), "♪ 6 or fewer". */
function thresholdChip(key: 'hype' | 'craft' | 'heat' | 'capital' | 'scandalCount', range: Range, lane: string | null): ValueChip {
  const n = (x: number) => (key === 'capital' ? money(x) : String(x));
  const { min, max } = range;
  const text = min !== undefined && max === undefined ? (key === 'capital' ? n(min) : t('ui.doors.min', { n: n(min) })) : max !== undefined && min === undefined ? t('ui.doors.max', { n: n(max) }) : `${n(min ?? 0)}–${n(max ?? 0)}`;
  if (key === 'scandalCount') return { kind: 'scandal', icon: 'paper', text };
  if (key === 'capital') return { kind: 'gain', icon: null, text };
  if (key === 'hype') return { kind: 'hype', icon: 'star', text };
  if (key === 'craft') return { kind: 'craft', icon: craftIcon(lane), text };
  return { kind: 'heat', icon: 'flame', text };
}

/** A flag test in the flags' own labels — the short one a card reads ("Signed") where there is one. */
function flagWords(test: FlagTest): string {
  const short = (f: string) => (has(`ui.face.flag.${f}`) ? t(`ui.face.flag.${f}`) : flagName(f));
  const parts = [...(test.all ?? []).map(short), ...(test.any?.length ? [t('ui.clause.flagsAny', { flags: test.any.map(short).join(', ') })] : []), ...(test.not ?? []).map(flagNegative)];
  return parts.join(', ');
}

/** A condition as a line's head: its stats as threshold chips, a flag or a season in words. */
function conditionHead(c: ContentIndex, cond: Condition, lane: string | null): { readonly label: string | null; readonly chips: ValueChip[] } {
  const words: string[] = [];
  const chips: ValueChip[] = [];
  for (const key of COND_ORDER) {
    const v = cond[key];
    if (v === undefined) continue;
    if (key === 'flags') words.push(flagWords(v as FlagTest));
    else if (key === 'act') {
      const r = v as Range;
      words.push(r.min !== undefined && (r.min === r.max || (r.max === undefined && r.min === c.rules.acts)) ? seasonName(c, r.min) : capitalised(conditionText(c, { act: r })));
    } else if (key === 'turn') words.push(capitalised(conditionText(c, { turn: v as Range })));
    else chips.push(thresholdChip(key, v as Range, lane));
  }
  return { label: words.length ? words.join(', ') : null, chips };
}

/** Effects as a face's lines: plain values on one line, each conditional's branches on one line each. */
function effectLines(c: ContentIndex, effects: readonly Effect[], lane: string | null, self: string): FaceLine[] {
  const lines: FaceLine[] = [];
  let plain: ValueChip[] = [];
  const flush = () => {
    if (plain.length) lines.push({ label: null, cond: [], arrow: false, chips: plain });
    plain = [];
  };
  for (const e of effects) {
    if (e.op !== 'conditional') {
      plain.push(...effectChip(c, e, lane, self));
      continue;
    }
    flush();
    const head = conditionHead(c, e.if, lane);
    lines.push({ label: head.label, cond: head.chips, arrow: true, chips: e.then.flatMap((x) => effectChip(c, x, lane, self)) });
    if (e.else?.length) lines.push({ label: t('ui.face.otherwise'), cond: [], arrow: true, chips: e.else.flatMap((x) => effectChip(c, x, lane, self)) });
  }
  flush();
  return lines;
}

/** A rule that fires when drawn or at month end: its label on the line when the rule is one plain line, else above. */
function ruleLines(c: ContentIndex, label: string, effects: readonly Effect[], lane: string | null, self: string): FaceLine[] {
  const lines = effectLines(c, effects, lane, self);
  const first = lines[0];
  if (lines.length === 1 && first && !first.arrow) return [{ ...first, label }];
  return [{ label, cond: [], arrow: false, chips: [] }, ...lines];
}

/**
 * A card's body (round R1, H1–H2), in one order on every face: what it needs, then its effects — every number an
 * icon and a number — and for a scandal "Can't be played" and its rules. The flavour line follows the body.
 */
export function faceLines(c: ContentIndex, cardId: string, career: string | null): FaceLine[] {
  const def = getCard(c, cardId);
  if (!def) return [];
  const lane = craftLane(c, cardId, career);
  const lines: FaceLine[] = [];
  if (def.kind === 'scandal') lines.push({ label: null, cond: [], arrow: false, chips: [{ kind: 'text', icon: null, text: t('ui.card.cantPlay') }] });
  if (def.requires) {
    const head = conditionHead(c, def.requires, lane);
    lines.push({ label: t('ui.face.needs'), cond: head.label ? [{ kind: 'text', icon: null, text: head.label }, ...head.chips] : head.chips, arrow: false, chips: [] });
  }
  lines.push(...effectLines(c, def.effects ?? [], lane, cardId));
  if (def.onDraw?.length) lines.push(...ruleLines(c, t('ui.face.whenDrawn'), def.onDraw, lane, cardId));
  if (def.onEndOfTurn?.length) lines.push(...ruleLines(c, t('ui.face.atMonthEnd'), def.onEndOfTurn, lane, cardId));
  return lines;
}

/** A door's outcomes (round R1): each effect as value chips, as on a card. */
export function effectChips(c: ContentIndex, effects: readonly Effect[], lane: string | null): ValueChip[] {
  return effects.flatMap((e) => effectChip(c, e, lane));
}

/** Actions spent or gained (round R2): the action bulb and a signed number, as the events and previews show them. */
export const actionChip = (delta: number): ValueChip => ({ kind: 'action', icon: 'bulb', text: signed(delta) });

/** Scandal cards added (or removed): the countdown's newspaper and a signed number, in scandal red (round R2). */
export const scandalChip = (delta: number): ValueChip => ({ kind: 'scandal', icon: 'paper', text: signed(delta) });

/**
 * An outcome as the card faces show it (round R2, 0.3): each resource that moved as its chip — heat apart, for
 * the preview's own heat line — actions as the bulb, cards drawn as "Draw N", scandal cards added or removed as
 * the newspaper; what involves no number stays in words (a card added, a card removed, a flag set).
 */
export function outcomeChips(c: ContentIndex, o: Outcome, lane: string | null, opts: { readonly heat?: boolean; readonly slots?: number; readonly flags?: boolean } = {}): { readonly chips: ValueChip[]; readonly words: string[] } {
  const chips: ValueChip[] = [];
  const words: string[] = [];
  for (const target of ['hype', 'craft', 'capital', 'heat'] as const) {
    if (o.deltas[target] === 0 || (target === 'heat' && !opts.heat)) continue;
    chips.push(...effectChip(c, { op: 'resource', target, value: o.deltas[target] }, lane));
  }
  if (opts.slots) chips.push(actionChip(opts.slots));
  if (o.drawn) chips.push(...effectChip(c, { op: 'draw', count: o.drawn }, lane));
  const scandal = (id: string) => getCard(c, id)?.kind === 'scandal';
  const added = o.added.filter((a) => scandal(a.cardId)).length;
  const removed = o.exhausted.filter(scandal).length;
  if (added) chips.push(scandalChip(added));
  if (removed) chips.push(scandalChip(-removed));
  // The cards added that are no scandal, each card once, with how many (round R8a, D1).
  const cards = new Map<string, number>();
  for (const a of o.added) if (!scandal(a.cardId)) cards.set(a.cardId, (cards.get(a.cardId) ?? 0) + 1);
  for (const [cardId, n] of cards) chips.push(addChip(c, cardId, n));
  for (const id of o.exhausted) if (!scandal(id)) words.push(t('ui.preview.exhausted', { card: cardName(c, id) }));
  if (opts.flags !== false) for (const f of o.flags) words.push(t('ui.preview.flag', { flag: flagName(f) }));
  return { chips, words };
}

/**
 * An event's answer as chips from its content (round R2), for one that can't be chosen now — what it would do; an
 * answer that can be chosen shows the reducer's outcome instead. An action as the bulb, a scandal card added as the
 * newspaper; a flag it sets is "↺ remembered", never its name.
 */
export function eventEffectChips(c: ContentIndex, effects: readonly Effect[], lane: string | null): ValueChip[] {
  return effects.flatMap((e): ValueChip[] =>
    e.op === 'slots' ? [actionChip(e.value)] : e.op === 'addCard' && getCard(c, e.cardId)?.kind === 'scandal' ? [scandalChip(e.count ?? 1)] : e.op === 'setFlag' ? [] : effectChip(c, e, lane),
  );
}

/** A requirement's threshold in icons ("★ 25+", "📰 1+"), as a face's "Needs" line shows it; null for one with no number. */
export function clauseChip(clause: ClauseReport, lane: string | null): ValueChip | null {
  if (clause.key === 'hype' || clause.key === 'craft' || clause.key === 'heat' || clause.key === 'capital' || clause.key === 'scandalCount') return thresholdChip(clause.key, clause.range, lane);
  return null;
}

/** A card on an offer or in the deck viewer (round R1): the hand's face, nothing about playing it now. */
export function offerCardModel(s: GameState, cardId: string, lane: string | null, uid = -1): HandCardModel {
  const c = s.content;
  const def = getCard(c, cardId);
  const scandal = def?.kind === 'scandal';
  return {
    uid,
    cardId,
    face: cardFace(c, cardId) ?? 'notebook',
    scandal,
    name: cardName(c, cardId, lane),
    lines: faceLines(c, cardId, lane),
    opportunity: def?.kind === 'opportunity',
    // A scandal off the hand shows its first in-hand line; in the hand, the one the bag gave it (lines.inHand).
    flavour: scandal ? (def?.inHandKeys?.[0] ? t(def.inHandKeys[0]) : null) : cardFlavor(c, cardId),
    cost: def?.cost ?? 1,
    playable: !scandal,
    why: scandal ? 'scandal' : null,
  };
}

const HAND_WORDS = (): HandWords => ({
  callsheet: t('ui.face.callsheet'),
  revision: t('ui.face.revision'),
  pass: t('ui.face.pass'),
  cross: t('ui.face.cross'),
  opportunity: t('ui.face.opportunity'),
  scandal: t('ui.toast.scandal'),
  noActions: t('ui.toast.noActions'),
});

function hand(s: GameState, lines: LinesSoFar): HandCardModel[] {
  const legal = legalOf(s);
  return s.hand.map(h=>cardModel(s,h,lines,legal.play.has(h.uid)));
}
export function cardModel(s: GameState, h: CardInstance, lines: LinesSoFar, playable = false): HandCardModel {
    const c = s.content;
    const def = getCard(c, h.cardId);
    const scandal = def?.kind === 'scandal';
    const check = playable ? null : playCheck(s, h.uid);
    return {
      uid: h.uid,
      cardId: h.cardId,
      face: cardFace(c, h.cardId) ?? 'notebook',
      scandal,
      name: cardName(c, h.cardId, lines.lane),
      lines: faceLines(c, h.cardId, lines.lane),
      opportunity: def?.kind === 'opportunity',
      // In the hand, only a scandal's line (round R8a, E1): any other card's flavour is in its preview.
      flavour: scandal ? lineText(c, lines.inHand.get(h.uid), h.cardId) : null,
      cost: def?.cost ?? 1,
      playable,
      why: scandal ? 'scandal' : !check ? null : check.blockers.some((b) => b.code === 'slots') ? 'actions' : 'requires',
    };
}

function endTurn(s: GameState, preview: EndTurnPreview | null): EndTurnModel {
  const n = preview?.scandalCards.length ?? 0;
  return { title: t('ui.end.title'), sub: n === 0 ? t('ui.end.none') : n === 1 ? t('ui.end.one') : t('ui.end.many', { n }), printing: n, legal: legalOf(s).endTurn };
}
