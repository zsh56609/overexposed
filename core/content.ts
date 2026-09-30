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
  return typeof op === 'string' && Object.hasOwn(EFFECT_FIELDS, op);
}

// ---------------------------------------------------------------------------
// Content pieces

export interface CardDef {
  readonly id: string;
  readonly kind: CardKind;
  /** Slots spent to play it. */
  readonly cost: number;
  readonly nameKey: string;
  readonly textKey: string;
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
  // Player-facing prose (decision 15): keys only. For a scandal, textKey is the line shown while it is in hand.
  /** Non-scandals: feed headline variants for playing the card. The UI picks one by hash, never by the game RNG. */
  readonly headlineKeys?: readonly string[];
  /** Non-scandals: the voice the feed prints the headline in. */
  readonly register?: Register;
  /** Scandals: the headline printed when it crystallises. */
  readonly headlineKey?: string;
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
  /** Player-facing prose (decision 15): the gate's flavour line. */
  readonly flavorKey?: string;
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
}

export interface MinorDef {
  readonly id: string;
  readonly major: string;
  readonly conditions?: YearConditions;
  /** The major's catch-all: taken when none of its other minors holds. One per major, last, unconditional. */
  readonly fallback?: boolean;
  readonly nameKey: string;
  readonly textKey: string;
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
}

/** Run-level tuning numbers. Data, so the heat loop can be tuned without touching code. */
export interface Rules {
  readonly acts: number;
  readonly turnsPerAct: number;
  /** i18n key naming each act, in order (the seasons). One per act. */
  readonly actNameKeys: readonly string[];
  /** i18n key of each act's season opener (decision 15). One per act. */
  readonly actOpenerKeys?: readonly string[];
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
}

/** Tiers of a value, lowest first. `from[i]` is the lowest value of tier i: 0 first, then ascending. */
export interface ValueTiers {
  readonly nameKeys: readonly string[];
  readonly from: readonly number[];
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
    scandalIds: content.cards.filter((c) => c.kind === 'scandal').map((c) => c.id),
    draftPool: content.cards.filter((c) => c.kind !== 'scandal').map((c) => c.id),
  };
}

export function getCard(index: ContentIndex, id: string): CardDef | undefined {
  return Object.hasOwn(index.cards, id) ? index.cards[id] : undefined;
}

export function getGate(index: ContentIndex, id: string): GateDef | undefined {
  return Object.hasOwn(index.gates, id) ? index.gates[id] : undefined;
}

export const getMajor = (index: ContentIndex, id: string): MajorDef | undefined => index.majors.find((m) => m.id === id);
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
