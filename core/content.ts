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
}

export interface GateDef {
  readonly id: string;
  readonly act: number;
  readonly nameKey: string;
  readonly requires: Condition;
  readonly onPass: readonly Effect[];
  readonly onFail: readonly Effect[];
}

export interface EndingDef {
  readonly id: string;
  /** Resolved in descending priority; first match wins. Priority 0 is the unconditional fallback. */
  readonly priority: number;
  readonly conditions?: Condition;
  readonly textKey: string;
}

/** The draft that opens each act. Prices are in capital. */
export interface DraftRules {
  /** Cards offered from the draftable pool. */
  readonly offerSize: number;
  /** Free picks per act. 0 turns drafting off. */
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
  readonly handSize: number;
  readonly slotsPerTurn: number;
  /** Gates offered at the end of each act; the player picks one. */
  readonly gatesOffered: number;
  /** Base threshold per act: heatThreshold(act) = heatThreshold[act - 1]. See effectiveHeatThreshold. */
  readonly heatThreshold: readonly number[];
  /** Threshold lost per scandal held: tolerance falls as scandals pile up. */
  readonly degradePerScandal: number;
  /** The effective threshold never drops below this. */
  readonly thresholdFloor: number;
  /** Heat removed per scandal crystallised. Must stay below thresholdFloor so a residue always carries over. */
  readonly vent: number;
  readonly startingResources: Resources;
  /** Opportunity cards may not appear here: they are draft-only. */
  readonly startingDeck: readonly { readonly cardId: string; readonly count: number }[];
  readonly draft: DraftRules;
}

export interface Content {
  readonly rules: Rules;
  readonly cards: readonly CardDef[];
  readonly gates: readonly GateDef[];
  readonly endings: readonly EndingDef[];
}

// ---------------------------------------------------------------------------
// Index: built once per run by createInitialState, stored in GameState.

export interface ContentIndex {
  readonly rules: Rules;
  readonly cards: Readonly<Record<string, CardDef>>;
  readonly gates: Readonly<Record<string, GateDef>>;
  /** Gates grouped by act, in content order. */
  readonly gatesByAct: Readonly<Record<string, readonly GateDef[]>>;
  /** Endings in resolution order: descending priority, ties in content order. */
  readonly endings: readonly EndingDef[];
  /** Scandal card ids in content order: the pool heat crystallises from. */
  readonly scandalIds: readonly string[];
  /** Every non-scandal card id in content order: the pool drafts are offered from (filtered by actMin). */
  readonly draftPool: readonly string[];
}

export function indexContent(content: Content): ContentIndex {
  const gatesByAct: Record<string, GateDef[]> = {};
  for (const gate of content.gates) (gatesByAct[String(gate.act)] ??= []).push(gate);
  return {
    rules: content.rules,
    cards: Object.fromEntries(content.cards.map((c) => [c.id, c])),
    gates: Object.fromEntries(content.gates.map((g) => [g.id, g])),
    gatesByAct,
    endings: [...content.endings].sort((a, b) => b.priority - a.priority),
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

export function heatThreshold(rules: Rules, act: number): number {
  const t = rules.heatThreshold;
  return t[Math.min(act, t.length) - 1] ?? Number.POSITIVE_INFINITY;
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
