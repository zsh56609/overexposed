// Content schema (CLAUDE.md §2): the shapes /content JSON must take, the closed sets the
// engine understands, and the lookup index the reducer runs against.
// Ids and i18n keys only — never display strings.

export const RESOURCE_KEYS = ['hype', 'craft', 'capital', 'heat'] as const;
export type ResourceKey = (typeof RESOURCE_KEYS)[number];
export type Resources = Readonly<Record<ResourceKey, number>>;

export const CARD_KINDS = ['action', 'opportunity', 'scandal'] as const;
export type CardKind = (typeof CARD_KINDS)[number];

export const ADD_CARD_ZONES = ['deck', 'discard', 'hand'] as const;
export type AddCardZone = (typeof ADD_CARD_ZONES)[number];

/** A card's face in the visual phase (round 2c; docs/design/visual/README.md §6): the paper tells the lane. */
export const CARD_FACES = ['flyer', 'score', 'script', 'revision', 'callsheet', 'headshot', 'gloss', 'gold', 'pass', 'notebook', 'scandal'] as const;
export type CardFace = (typeof CARD_FACES)[number];

/** The newspaper photographs' scenes (round 2c; the visual phase draws each in code). Only a lead story has one. */
export const SCENE_IDS = ['singer', 'rival', 'crowd', 'paparazzi', 'carpet', 'filmset', 'street', 'trophy'] as const;
export type SceneId = (typeof SCENE_IDS)[number];

/** The seasons the scene can light (round V1a; docs/design/visual/README.md): one per act, in content. */
export const SEASON_IDS = ['spring', 'summer', 'autumn', 'winter'] as const;
export type SeasonId = (typeof SEASON_IDS)[number];

/** The mirror's sticky notes (round V1a; README §3): each major's colour. */
export const NOTE_COLOURS = ['yellow', 'green', 'blue', 'pink'] as const;
export type NoteColour = (typeof NOTE_COLOURS)[number];

/** The feed's three voices (docs/ui-plan.md §13, decision 15): which typography a card's headline gets. */
export const REGISTERS = ['loud', 'quiet', 'money'] as const;
export type Register = (typeof REGISTERS)[number];

/**
 * A card's lane when it builds no career (docs/design/content-expansion.md §2): draws, relief, money and
 * removal. Plays of neutral cards never count toward the career lane.
 */
export const NEUTRAL_LANE = 'neutral';

// ---------------------------------------------------------------------------
// Conditions — one shape everywhere:
//   { "craft": { "min": 20 }, "scandalCount": { "max": 2 }, "flags": { "not": ["went_tabloid"] } }
// Every key present must hold (AND). Ranges are inclusive.

export interface Range {
  readonly min?: number;
  readonly max?: number;
}

export interface FlagTest {
  readonly all?: readonly string[];
  readonly any?: readonly string[];
  readonly not?: readonly string[];
}

export interface Condition {
  readonly hype?: Range;
  readonly craft?: Range;
  readonly capital?: Range;
  readonly heat?: Range;
  /** Scandal cards currently owned (deck + hand + discard; exhausted ones don't count). */
  readonly scandalCount?: Range;
  readonly act?: Range;
  /** Global turn number, 1-based across all acts. */
  readonly turn?: Range;
  readonly flags?: FlagTest;
}

export const CONDITION_RANGE_KEYS = [...RESOURCE_KEYS, 'scandalCount', 'act', 'turn'] as const;
export type ConditionRangeKey = (typeof CONDITION_RANGE_KEYS)[number];
export const CONDITION_KEYS = [...CONDITION_RANGE_KEYS, 'flags'] as const;
export const FLAG_TEST_KEYS = ['all', 'any', 'not'] as const;

// ---------------------------------------------------------------------------
// Effect ops — a closed set. Extend the set; never special-case a card.

export type Effect =
  | { readonly op: 'resource'; readonly target: ResourceKey; readonly value: number }
  | { readonly op: 'draw'; readonly count: number }
  | { readonly op: 'addCard'; readonly cardId: string; readonly to: AddCardZone; readonly count?: number }
  | { readonly op: 'exhaustTag'; readonly tag: string; readonly count?: number }
  | { readonly op: 'slots'; readonly value: number }
  | { readonly op: 'setFlag'; readonly flag: string }
  | {
      readonly op: 'conditional';
      readonly if: Condition;
      readonly then: readonly Effect[];
      readonly else?: readonly Effect[];
    };

export type EffectOp = Effect['op'];

/** Field names each op accepts. Keyed by EffectOp, so adding an op without listing it here fails typecheck. */
export const EFFECT_FIELDS: { readonly [K in EffectOp]: readonly string[] } = {
  resource: ['target', 'value'],
  draw: ['count'],
  addCard: ['cardId', 'to', 'count'],
  exhaustTag: ['tag', 'count'],
  slots: ['value'],
  setFlag: ['flag'],
  conditional: ['if', 'then', 'else'],
};

export const EFFECT_OPS = Object.keys(EFFECT_FIELDS) as readonly EffectOp[];

export function isEffectOp(op: unknown): op is EffectOp {
  return typeof op === 'string' && Object.prototype.hasOwnProperty.call(EFFECT_FIELDS, op);
}

// ---------------------------------------------------------------------------
// Content pieces

export interface CardDef {
  /** A public release, eligible for the music paper's craft review (V1b). */
  readonly release?: boolean;
  readonly id: string;
  readonly kind: CardKind;
  /** Slots spent to play it. */
  readonly cost: number;
  readonly nameKey: string;
  /** Non-scandals: the card's rules. Scandals have none: the interface tells their rules from their effects. */
  readonly textKey?: string;
  /** Non-scandals: the card's flavour line, italic on its face (round 2c). A scandal's is its in-hand line. */
  readonly flavorKey?: string;
  /** Its face in the visual phase (round 2c): overrides the lane's default in rules.cardFaces. */
  readonly face?: CardFace;
  /** Default true. Scandals are false: they only take up room in the hand. */
  readonly playable?: boolean;
  readonly tags?: readonly string[];
  /** Earliest act this card may be offered in a draft. Default 1. Scandals only crystallise from this act on. */
  readonly actMin?: number;
  /** Engine extension: the card can only be played while this condition holds (e.g. a capital price). */
  readonly requires?: Condition;
  readonly effects?: readonly Effect[];
  readonly onDraw?: readonly Effect[];
  /** Fires at end of turn while the card is in hand. */
  readonly onEndOfTurn?: readonly Effect[];
  // Player-facing prose (decision 15): keys only. Every line group is a list of variants, shown through a
  // shuffle bag (core/variants.ts), never by the game RNG.
  /** Headline variants: a non-scandal's for playing it, a scandal's for crystallising (or being copied). */
  readonly headlineKeys?: readonly string[];
  /** Non-scandals: the voice the feed prints the headline in. */
  readonly register?: Register;
  /** Scandals: the lines shown while it sits in the hand. */
  readonly inHandKeys?: readonly string[];
  /**
   * Non-scandals: the career lane playing it builds (core/lanes.ts) — one of rules.lanes, or NEUTRAL_LANE.
   * Scandals are never played and carry none.
   */
  readonly lane?: string;
}

export interface GateDef {
  readonly id: string;
  readonly act: number;
  readonly nameKey: string;
  /** Player-facing prose (decision 15): the gate's flavour line, one variant per run (core/variants.ts). */
  readonly flavorKeys?: readonly string[];
  readonly requires: Condition;
  readonly onPass: readonly Effect[];
  readonly onFail: readonly Effect[];
}

/**
 * What only a whole year shows, kept at each month end in GameState.year (core/year.ts). Any minor ending
 * or award may put a range on any of them; none belongs to one ending or award.
 */
export const YEAR_STAT_KEYS = ['peakScandals', 'scandalDrop', 'bestMonthHype', 'peakHype'] as const;
export type YearStatKey = (typeof YEAR_STAT_KEYS)[number];

/** One of `any` (when given), none of `not`. */
export interface IdTest {
  readonly any?: readonly string[];
  readonly not?: readonly string[];
}

/**
 * The condition shape plus what a year has shown (core/year.ts): the career lane, the cards held, a
 * choice of alternatives, and the year stats. Minor endings and awards read it.
 */
export interface YearConditions extends Condition {
  /** The career lane the cards played make (core/lanes.ts). */
  readonly lane?: IdTest;
  /** Card ids held in deck, hand or discard: one of `any`, all of `all`, none of `not`. */
  readonly holds?: FlagTest;
  /** Holds when any one of these holds. */
  readonly anyOf?: readonly YearConditions[];
  /** The most scandals held at any month end. */
  readonly peakScandals?: Range;
  /** How far the year came down from that peak: peak minus the scandals held now. */
  readonly scandalDrop?: Range;
  /** The biggest hype gain from one month end to the next: the fastest rise. */
  readonly bestMonthHype?: Range;
  /** The most hype held at any month end. */
  readonly peakHype?: Range;
}

export const YEAR_ONLY_KEYS = ['lane', 'holds', 'anyOf', ...YEAR_STAT_KEYS] as const;

/** An award's conditions: year conditions plus the ending the year resolved to (a major or a minor id). */
export interface AwardConditions extends YearConditions {
  readonly ending?: IdTest;
}

export const AWARD_ONLY_KEYS = ['ending', ...YEAR_ONLY_KEYS] as const;

// ---------------------------------------------------------------------------
// Endings, two levels (docs/design/content-expansion.md §1). Majors partition the year's end on axes;
// minors refine each major, first match in content order, else the major's fallback. Exhaustive at both
// levels by construction: every state has one side on every axis, every major one fallback.

/** A split of the year's end: `sides[0]` below `from`, `sides[1]` from it on. */
export interface AxisDef {
  readonly id: string;
  readonly key: ConditionRangeKey;
  readonly from: number;
  readonly sides: readonly [string, string];
  /**
   * Sides the goals board does not list as a requirement: the tier word and the goal line carry them
   * ("Hype 79 or fewer" would read as if staying unknown were the goal).
   */
  readonly unlisted?: readonly string[];
}

export interface MajorDef {
  readonly id: string;
  /** Its side of every axis, by axis id. */
  readonly on: Readonly<Record<string, string>>;
  readonly nameKey: string;
  /** Its goals-board line. */
  readonly goalKey: string;
  /** Its sticky note's colour on the mirror (round V1a). */
  readonly note?: NoteColour;
}

export interface MinorDef {
  readonly id: string;
  readonly major: string;
  readonly conditions?: YearConditions;
  /** The major's catch-all: taken when none of its other minors holds. One per major, last, unconditional. */
  readonly fallback?: boolean;
  readonly nameKey: string;
  /** Its text, one variant per run (core/variants.ts). */
  readonly textKeys: readonly string[];
  /** The goal line it had as a flat ending; kept, no longer shown (the goals board shows majors). */
  readonly goalKey?: string;
}

/** content/endings.json. Majors in goals-board order; minors in resolution order within their major. */
export interface EndingsDef {
  readonly axes: readonly AxisDef[];
  readonly majors: readonly MajorDef[];
  readonly minors: readonly MinorDef[];
}

/**
 * A year-end award (docs/ui-plan.md §13, decisions 16 and 20). It presents an outcome and changes no play.
 * Every award whose conditions hold is granted; a fallback only when no other award is, so every year
 * ends with at least one.
 */
export interface AwardDef {
  readonly id: string;
  readonly nameKey: string;
  readonly citationKey: string;
  readonly conditions?: AwardConditions;
  readonly fallback?: boolean;
}

// ---------------------------------------------------------------------------
// The press (docs/design/content-expansion.md §3.1, phase 2a): three papers, which one prints a line, and
// what they call the player. Papers print the public acts; the notebook keeps the private work.

/** A story from beyond the player, in one paper's own pool: any season, or only its own (once a run). */
export interface WorldStoryDef {
  readonly key: string;
  /** The season (act) it belongs to; absent: any. */
  readonly act?: number;
}

/**
 * A story the world tells across the year, in one paper (round 2b): a beat per season, each printed in one
 * month of its season chosen by the seed — the world has its own timeline, like the rival's.
 */
export interface SagaDef {
  readonly id: string;
  /** One i18n key per season, in order. */
  readonly beats: readonly string[];
}

export interface PaperDef {
  readonly id: string;
  readonly mastheadKey: string;
  /** Its world news: what fills a front page around the player (drawn with a shuffle bag). */
  readonly world?: readonly WorldStoryDef[];
  /** Its sagas: the world's stories that develop across the year. */
  readonly sagas?: readonly SagaDef[];
  /** Its frenzy-spillover lines: the scandal reaching this paper too. */
  readonly spilloverKeys?: readonly string[];
  /** Its fame filler: what it prints about a famous player who did nothing newsworthy (a line group, with the subject). */
  readonly fillerKeys?: readonly string[];
  /** Its issue number on the desk (round V1a): base + month × step. */
  readonly issue?: { readonly base: number; readonly step: number };
}

/**
 * A paper's weekend box office (round V1a; README §2): a ring of film titles, one entering at the top each
 * month and sliding down; the player's film tops it once they are famous on its lane.
 */
export interface BoxOfficeDef {
  readonly paper: string;
  readonly titleKeys: readonly string[];
  readonly rows: number;
  /** Each row's takings in tenths of a million, top first; each month adds a seeded 0…jitter−1. */
  readonly grosses: readonly number[];
  readonly jitter: number;
  readonly player: { readonly titleKey: string; readonly gross: number; readonly fromTier: number; readonly lane: string };
}

/** How prominent a story is on a front page, most first. */
export const PROMINENCES = ['lead', 'secondary', 'brief'] as const;
export type Prominence = (typeof PROMINENCES)[number];

/**
 * How a month's front page is composed (phase 2a, Part E): its slots, and how prominent the player's lines
 * may be — the front page is itself a fame meter. Per hype tier, lowest first, where a list is given.
 */
export interface PageRules {
  /** The page's slots, most prominent first. */
  readonly slots: readonly Prominence[];
  /** World stories on every page, by fame tier — unless the page is overwhelmed. */
  readonly worldMin: readonly number[];
  /** A LOUD line's prominence by fame tier: in the established lane's paper, and in another paper. */
  readonly loud: { readonly inLane: readonly Prominence[]; readonly offLane: readonly Prominence[] };
  readonly money: Prominence;
  /**
   * A scandal's prominence in its paper by fame tier (round 2b): fame amplifies scandal — an unknown's
   * scandal costs them in full, but the world barely notices.
   */
  readonly scandal: readonly Prominence[];
  readonly spillover: Prominence;
  /** Scandals printed in a month that make a frenzy. */
  readonly frenzyAt: number;
  /** From this fame tier on, a frenzy spills over: a line in every other paper. */
  readonly spilloverFrom: number;
  /** From this fame tier on, the scandal paper is overwhelmed in a month a scandal printed. */
  readonly overwhelmScandalFrom: number;
  /** From this fame tier on, the established lane's paper is overwhelmed: the player may fill it. */
  readonly overwhelmLaneFrom: number;
  /**
   * Fame filler (round 2b): from `laneFrom`, the established lane's paper gets a filler line when the player
   * has fewer than `laneBelow` stories in it; from `fillLaneFrom`, filler fills it; from `scandalPaperFrom`,
   * the scandal paper (The Daily Flash) gets one filler line whatever the lane. Filler ranks below the
   * player's real stories, and leads only a page with nothing real of the player's.
   */
  readonly filler?: { readonly laneFrom: number; readonly laneBelow: number; readonly fillLaneFrom: number; readonly scandalPaperFrom: number };
}

/** One season's beat of the rival's arc: in which paper, and its line. */
export interface RivalBeatDef {
  readonly paper: string;
  readonly key: string;
}

/** The rival's year, fixed by the seed at the run's start: a beat per season, a closing line, her major. */
export interface RivalArcDef {
  readonly id: string;
  readonly major: string;
  readonly beats: readonly RivalBeatDef[];
  readonly endingKey: string;
}

/**
 * Which paper prints a line — by register first: a LOUD line by the card's lane, Money and every scandal by
 * name. A quiet line has no paper: it goes in the player's own notebook.
 */
export interface PressRoute {
  /** Card lane → paper id, for LOUD lines. */
  readonly loud: Readonly<Record<string, string>>;
  readonly money: string;
  readonly scandal: string;
}

/** content/press.json. */
export interface PressDef {
  readonly papers: readonly PaperDef[];
  readonly route: PressRoute;
  /** The noun the press uses for the player: per lane, one i18n key per hype tier, lowest first. */
  readonly subjects: Readonly<Record<string, readonly string[]>>;
  /** The subjects column read while no lane is established. */
  readonly earlyLane: string;
  readonly page?: PageRules;
  /**
   * The lead story's photograph (round 2c): a scene by paper and story kind, and overrides by line group id
   * or i18n key (the rival's winter nominations take the trophy).
   */
  readonly scenes?: {
    readonly player: Readonly<Record<string, SceneId>>;
    readonly scandal: SceneId;
    readonly rival: SceneId;
    readonly world: Readonly<Record<string, SceneId>>;
    readonly overrides?: Readonly<Record<string, SceneId>>;
  };
  /** The rival (design §3.3): the jam's light rival, introduced through the press. */
  readonly rival?: { readonly arcs: readonly RivalArcDef[] };
  readonly boxOffice?: BoxOfficeDef;
}

// ---------------------------------------------------------------------------
// The managers (design §3.2, round 2b): chosen before month 1, the player's own voice in the year. Each has
// one small perk — data the engine applies, never a special case — and a line group per message trigger.

/**
 * The manager's message triggers, a closed set: /core detects them in the run's history (core/manager.ts).
 * In priority order is content's (messages.priority). Their line keys: `frenzy` and `first_scandal` take a
 * `.low` or `.high` fame suffix, `checkin` the major's id, `lane` the lane's; the rest are bare.
 */
export const MESSAGE_TRIGGERS = ['frenzy', 'first_scandal', 'checkin', 'known', 'signed', 'viral', 'lane', 'gate_failed', 'gate_passed', 'stuck', 'rival', 'opening', 'quiet'] as const;
export type MessageTrigger = (typeof MESSAGE_TRIGGERS)[number];

/** A manager's perk. Each field is optional: a perk is what its fields say, applied by the engine. */
export interface ManagerPerk {
  readonly nameKey: string;
  /** Its rule text, plain like a card's: the stat and the number. */
  readonly effectKey: string;
  /** Draft rerolls each season that cost nothing: the first N the season takes. */
  readonly freeRerollsPerAct?: number;
  /** The reroll button's label while a free reroll is available. */
  readonly freeRerollKey?: string;
  /** More cards on every draft offer (round 2c: Dex's D1), drawn after the rest, and their label. */
  readonly extraOffer?: number;
  readonly extraOfferKey?: string;
  /**
   * Effects at the end of every month, after the month's check has resolved and its turnEnd is recorded —
   * applied like a card's effects, so the heat formula is untouched (decisions.md, round 2b).
   */
  readonly monthEnd?: readonly Effect[];
  /** The months (turns) whose end the month-end effects land on (round 2c); absent, every month. */
  readonly monthEndTurns?: readonly number[];
  /** The feed's line when the month-end effects change something: a line group on the shuffle bag. */
  readonly monthEndKeys?: readonly string[];
}

export interface ManagerDef {
  readonly id: string;
  readonly nameKey: string;
  readonly roleKey: string;
  readonly quoteKey: string;
  readonly descriptionKey: string;
  readonly tagKey: string;
  readonly perk: ManagerPerk;
  /** The choice screen's sample message and its label. */
  readonly sample: { readonly labelKey: string; readonly key: string };
  /** Message variants by trigger line key; each variant is its bubbles' keys, one or two (round 2c). */
  readonly lines: Readonly<Record<string, readonly (readonly string[])[]>>;
  /** Each message has two bubbles: a one-bubble variant takes a sign-off from the pool for its mood (round 2c). */
  readonly signoffs?: { readonly easy: readonly string[]; readonly hard: readonly string[] };
  /** The last word on the ending screen, keyed by major id: two bubbles (round 2c). */
  readonly lastWord?: Readonly<Record<string, readonly string[]>>;
}

/** When the managers speak (core/manager.ts): the triggers' parameters and the monthly cap. */
export interface MessageRules {
  /** Messages a month at most: the highest-priority triggers that fired. */
  readonly perMonth: number;
  /** Every trigger, highest priority first. */
  readonly priority: readonly MessageTrigger[];
  /** The fame tier (rules.tiers.hype, 0-based) from which a scandal trigger is `.high`. */
  readonly highFrom: number;
  /** The ending axis whose split `known` fires on, the first time the player reaches it. */
  readonly knownAxis: string;
  readonly signedFlag: string;
  readonly viralFlag: string;
  /** `stuck`: heat at this pressure tier (rules.tiers.heat, 0-based) or above at this many month ends running. */
  readonly stuck: { readonly heatTierFrom: number; readonly months: number };
  /** The triggers, or trigger line keys, whose sign-off is from the hard pool; the rest are easy. */
  readonly hard: readonly string[];
  /** `quiet` fires in a month no other trigger does, when this many months before it brought no message. */
  readonly quietAfter: number;
}

/** content/managers.json. */
export interface ManagersDef {
  readonly choice: { readonly kickerKey: string; readonly titleKey: string; readonly subtitleKey: string; readonly footerKey: string };
  readonly managers: readonly ManagerDef[];
  readonly messages: MessageRules;
}

// ---------------------------------------------------------------------------
// Desk scripts (round 2c): the script on an actor's desk, by fame — shown in the visual phase.

/** A band of fame tiers (rules.tiers.hype, 0-based): from its `from` to the next band's. */
export interface FameBand {
  readonly id: string;
  readonly from: number;
}

export const SCRIPT_LINE_KINDS = ['you', 'other', 'action'] as const;
export type ScriptLineKind = (typeof SCRIPT_LINE_KINDS)[number];

export interface DeskScriptDef {
  readonly id: string;
  readonly band: string;
  readonly headingKey: string;
  /** In order: the player's own lines (`you`, highlighted like an actor's copy), others', and action lines. */
  readonly lines: readonly { readonly key: string; readonly kind: ScriptLineKind }[];
}

/** content/scripts.json. The bands are rules.fameBands. */
export interface DeskScriptsDef {
  readonly scripts: readonly DeskScriptDef[];
}

/** The drafts inside each act. Prices are in capital; caps are per draft. */
export interface DraftRules {
  /** Turn-within-act numbers (1-based) whose start opens a draft. */
  readonly atTurns: readonly number[];
  /** Cards offered from the draftable pool. */
  readonly offerSize: number;
  /** Free picks per draft. 0 turns drafting off. */
  readonly picks: number;
  /** Price of one more pick from the same offer. */
  readonly extraPickCost: number;
  readonly maxExtraPicks: number;
  /** Price of replacing the offer with a fresh one. */
  readonly rerollCost: number;
  readonly maxRerolls: number;
  /** Lane-weighted drafting (round 2c): once a lane is established, at least this many of its cards on every offer. */
  readonly laneCards?: number;
}

/** Run-level tuning numbers. Data, so the heat loop can be tuned without touching code. */
export interface Rules {
  readonly acts: number;
  readonly turnsPerAct: number;
  /** i18n key naming each act, in order (the seasons). One per act. */
  readonly actNameKeys: readonly string[];
  /** The season each act is (round V1a): the scene's light and the stat bar's marks. One per act. */
  readonly seasons?: readonly SeasonId[];
  /** Each act's season opener variants (decision 15), one list per act; one variant per run. */
  readonly actOpenerKeys?: readonly (readonly string[])[];
  /** The opening premise's variants, shown on the title screen; one per run. */
  readonly openingKeys?: readonly string[];
  readonly handSize: number;
  readonly slotsPerTurn: number;
  /** Gates offered at the end of each act; the player picks one. */
  readonly gatesOffered: number;
  /** Base threshold per act: heatThreshold(act) = heatThreshold[act - 1]. See effectiveHeatThreshold. */
  readonly heatThreshold: readonly number[];
  /** Threshold lost per scandal held: tolerance falls as scandals pile up. */
  readonly degradePerScandal: number;
  /**
   * Per act: the effective threshold never drops below thresholdFloor[act - 1]. Tightening season by
   * season keeps degradation from exhausting itself early, so the spiral lands late.
   */
  readonly thresholdFloor: readonly number[];
  /** Heat removed per scandal crystallised. Must stay below every floor so a residue always carries over. */
  readonly vent: number;
  readonly startingResources: Resources;
  /** Opportunity cards may not appear here: they are draft-only. */
  readonly startingDeck: readonly { readonly cardId: string; readonly count: number }[];
  readonly draft: DraftRules;
  /** The stat bar's words (decision 25): boundaries only — /core picks the tier (core/tiers.ts). */
  readonly tiers?: StatTierRules;
  /** Career lanes (core/lanes.ts), the base first: a tie in cards played resolves to the earlier lane. */
  readonly lanes?: readonly string[];
  /**
   * Whether plays of starting-deck cards count toward the career lane. False: the lane is read from the
   * cards the player added — the starting deck is where every career begins, the same in every run.
   */
  readonly laneStartingDeck?: boolean;
  /**
   * When the career lane counts as established, for display (core/lanes.ts establishedLane): the leading
   * lane has at least `minPlays` plays and leads the next by at least `lead`. Endings never read it.
   */
  readonly laneEstablished?: { readonly minPlays: number; readonly lead: number };
  /**
   * Bands of fame tiers (round 2c), lowest first: low from Unknown, mid from Rising, high from Known. The
   * quiet-month trigger and the desk scripts read them (core/tiers.ts fameBand).
   */
  readonly fameBands?: readonly FameBand[];
  /** Each lane's card face, and the scandals' (round 2c): a card's `face` overrides it. */
  readonly cardFaces?: Readonly<Record<string, CardFace>>;
  /** The year's calendar (round 2c): the month and year the first month falls in. */
  readonly calendar?: { readonly startMonth: number; readonly startYear: number };
  /** The stat bar's tooltip lines for the stats without tiers (round 2c): money, the countdown, actions. */
  readonly statTips?: StatTips;
}

/** Tooltip lines for the stats that have no tiers: money, the next-scandal countdown (to go, or to the next once a line is crossed), actions. */
export interface StatTips {
  readonly capital: string;
  readonly toGo: string;
  readonly toNext: string;
  readonly slots: string;
}

/** How loud the next-scandal countdown is (round 2c), per heat tier: plain, amber, red, and crossed. */
export const COUNTDOWN_LEVELS = ['calm', 'amber', 'red', 'crossed'] as const;
export type CountdownLevel = (typeof COUNTDOWN_LEVELS)[number];

/** Tiers of a value, lowest first. `from[i]` is the lowest value of tier i: 0 first, then ascending. */
export interface ValueTiers {
  readonly nameKeys: readonly string[];
  readonly from: readonly number[];
  /** The tooltip line of each tier (round 2c), and the word naming the set the lines speak in ("singing"). */
  readonly tipKeys?: readonly string[];
  readonly modeKey?: string;
  /** Another set of lines while a lane is established — craft reads as acting on the screen lane. */
  readonly laneTips?: Readonly<Record<string, { readonly modeKey: string; readonly tipKeys: readonly string[] }>>;
}

/**
 * Heat's pressure tiers, lowest first, read from the distance to the line — never from the threshold, so
 * the frozen heat display holds. Below the first line, tier i is the first whose `toGoAtLeast[i]` the
 * points still to go reach (none: the last of these). Over a line, the tiers after them: the last whose
 * `linesCrossed` minimum is met. nameKeys: toGoAtLeast.length + 1 + linesCrossed.length.
 */
export interface HeatTiers {
  readonly nameKeys: readonly string[];
  readonly toGoAtLeast: readonly number[];
  readonly linesCrossed: readonly number[];
  /** The tooltip line of each tier (round 2c). */
  readonly tipKeys?: readonly string[];
  /** The next-scandal countdown's level at each tier (round 2c). */
  readonly countdown?: readonly CountdownLevel[];
}

export interface StatTierRules {
  readonly hype?: ValueTiers;
  readonly craft?: ValueTiers;
  readonly heat?: HeatTiers;
}

export interface Content {
  readonly rules: Rules;
  readonly cards: readonly CardDef[];
  readonly gates: readonly GateDef[];
  readonly endings: EndingsDef;
  /** A separate list, capped at 8 (decision 20). Absent: no awards. */
  readonly awards?: readonly AwardDef[];
  /** The press (phase 2a). Absent: no papers — every line is the player's own. */
  readonly press?: PressDef;
  /** The managers (round 2b). Absent: no choice before month 1, and no messages. */
  readonly managers?: ManagersDef;
  /** Desk scripts (round 2c), for the visual phase. */
  readonly scripts?: DeskScriptsDef;
}

// ---------------------------------------------------------------------------
// Index: built once per run by createInitialState, stored in GameState.

export interface ContentIndex {
  readonly rules: Rules;
  readonly cards: Readonly<Record<string, CardDef>>;
  readonly gates: Readonly<Record<string, GateDef>>;
  /** Gates grouped by act, in content order. */
  readonly gatesByAct: Readonly<Record<string, readonly GateDef[]>>;
  /** The axes the majors partition the year's end on. */
  readonly axes: readonly AxisDef[];
  /** Major endings in goals-board order (content order). */
  readonly majors: readonly MajorDef[];
  /** Minor endings in content order; by major, in resolution order. */
  readonly minors: readonly MinorDef[];
  readonly minorsByMajor: Readonly<Record<string, readonly MinorDef[]>>;
  /** Awards in content order. */
  readonly awards: readonly AwardDef[];
  readonly press: PressDef | null;
  readonly managers: ManagersDef | null;
  /** The desk scripts (round 2c), for the desk (round V1a). */
  readonly scripts: DeskScriptsDef | null;
  /** Scandal card ids in content order: the pool heat crystallises from. */
  readonly scandalIds: readonly string[];
  /** Tags every scandal carries (e.g. the marker removal cards target). They say nothing about the kind of trouble. */
  readonly scandalSharedTags: readonly string[];
  /** Every non-scandal card id in content order: the pool drafts are offered from (filtered by actMin). */
  readonly draftPool: readonly string[];
}

export function indexContent(content: Content): ContentIndex {
  const gatesByAct: Record<string, GateDef[]> = {};
  for (const gate of content.gates) (gatesByAct[String(gate.act)] ??= []).push(gate);
  const minorsByMajor: Record<string, MinorDef[]> = {};
  for (const minor of content.endings.minors) (minorsByMajor[minor.major] ??= []).push(minor);
  const scandals = content.cards.filter((c) => c.kind === 'scandal');
  const firstTags = scandals[0]?.tags ?? [];
  return {
    scandalSharedTags: firstTags.filter((t) => scandals.every((c) => c.tags?.includes(t))),
    rules: content.rules,
    cards: Object.fromEntries(content.cards.map((c) => [c.id, c])),
    gates: Object.fromEntries(content.gates.map((g) => [g.id, g])),
    gatesByAct,
    axes: content.endings.axes,
    majors: content.endings.majors,
    minors: content.endings.minors,
    minorsByMajor,
    awards: content.awards ?? [],
    press: content.press ?? null,
    managers: content.managers ?? null,
    scripts: content.scripts ?? null,
    scandalIds: content.cards.filter((c) => c.kind === 'scandal').map((c) => c.id),
    draftPool: content.cards.filter((c) => c.kind !== 'scandal').map((c) => c.id),
  };
}

export function getCard(index: ContentIndex, id: string): CardDef | undefined {
  return Object.prototype.hasOwnProperty.call(index.cards, id) ? index.cards[id] : undefined;
}

export function getGate(index: ContentIndex, id: string): GateDef | undefined {
  return Object.prototype.hasOwnProperty.call(index.gates, id) ? index.gates[id] : undefined;
}

export const getMajor = (index: ContentIndex, id: string): MajorDef | undefined => index.majors.find((m) => m.id === id);

/** A card's face (round 2c): its own, or its lane's default — a scandal's, the scandals'. */
export function cardFace(index: ContentIndex, id: string): CardFace | null {
  const card = getCard(index, id);
  if (!card) return null;
  const faces = index.rules.cardFaces;
  return card.face ?? faces?.[card.kind === 'scandal' ? 'scandal' : (card.lane ?? NEUTRAL_LANE)] ?? null;
}
export const getManager = (index: ContentIndex, id: string | null): ManagerDef | undefined =>
  id === null ? undefined : index.managers?.managers.find((m) => m.id === id);
export const getMinor = (index: ContentIndex, id: string): MinorDef | undefined => index.minors.find((m) => m.id === id);

export function heatThreshold(rules: Rules, act: number): number {
  const t = rules.heatThreshold;
  return t[Math.min(act, t.length) - 1] ?? Number.POSITIVE_INFINITY;
}

/** The act's floor under the effective threshold. */
export function thresholdFloor(rules: Rules, act: number): number {
  const f = rules.thresholdFloor;
  return f[Math.min(act, f.length) - 1] ?? 0;
}

/** Errors thrown by /core carry a machine-readable code and the offending id — never prose. */
export class CoreError extends Error {
  readonly code: string;
  readonly ref: string;
  constructor(code: string, ref: string) {
    super(`${code}: ${ref}`);
    this.name = 'CoreError';
    this.code = code;
    this.ref = ref;
  }
}
