// Content validation (AGENTS.md §4). Pure: takes parsed JSON, returns issues. No Node APIs,
// so the UI can run the same checks on load in dev later.
//
// The §4 checks: unknown effect ops · references to nonexistent ids · missing i18n keys ·
// cards unreachable in any act · endings not exhaustive (a major per corner, a fallback per major) ·
// numeric ranges · lanes · the content budget.
// Supporting checks: schema shape, run structure, and the §0 code boundaries (see checkBoundaries).

import {
  ADD_CARD_ZONES,
  CARD_KINDS,
  CONDITION_RANGE_KEYS,
  EFFECT_FIELDS,
  EFFECT_OPS,
  FLAG_TEST_KEYS,
  inHandGroup,
  isEffectOp,
  MESSAGE_TRIGGERS,
  messageGroup,
  monthEndGroup,
  NEUTRAL_LANE,
  onceItem,
  playGroup,
  COUNTDOWN_LEVELS,
  PROMINENCES,
  REGISTERS,
  RESOURCE_KEYS,
  scandalGroup,
  YEAR_ONLY_KEYS,
  YEAR_STAT_KEYS,
} from '../core/index.ts';

export const CHECKS = {
  unknownOp: 'unknown effect ops',
  references: 'references to card / gate / ending / lane / paper ids',
  i18n: 'missing i18n keys',
  prose: 'player-facing prose not yet written (warnings)',
  variants: 'variants per line group (warnings)',
  tierWords: 'tier words: one word, at most 10 characters',
  reachability: 'cards unreachable in any act',
  fallback: 'endings exhaustive: a major per corner, a fallback per major',
  ranges: 'numeric ranges',
  schema: 'schema shape (fields, types, duplicates)',
  structure: 'run structure (gates per act, scandal pool, flags)',
  budget: 'content budget (ceilings)',
  boundaries: 'code boundaries (CLAUDE.md §0)',
} as const;
export type CheckId = keyof typeof CHECKS;

export interface Issue {
  readonly level: 'error' | 'warning';
  readonly check: CheckId;
  readonly where: string;
  readonly message: string;
}

/** Content exactly as parsed from JSON. */
export interface RawContent {
  readonly rules: unknown;
  readonly cards: unknown;
  readonly gates: unknown;
  readonly endings: unknown;
  readonly awards: unknown;
  readonly press?: unknown;
  readonly managers?: unknown;
}

export interface ValidationResult {
  readonly issues: readonly Issue[];
  /** Earliest act each card can enter a run; Infinity = never. */
  readonly earliestAct: Readonly<Record<string, number>>;
  readonly counts: {
    readonly cards: number;
    readonly gates: number;
    readonly majors: number;
    readonly minors: number;
    readonly awards: number;
    readonly i18nKeys: number;
  };
}

type Obj = Readonly<Record<string, unknown>>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const ID = /^[a-z][a-z0-9_]*$/;
const q = (v: unknown) => JSON.stringify(v);

const CARD_FIELDS = [
  'id', 'kind', 'cost', 'nameKey', 'textKey', 'headlineKeys', 'register', 'inHandKeys',
  'playable', 'tags', 'actMin', 'requires', 'effects', 'onDraw', 'onEndOfTurn', 'lane',
];
const GATE_FIELDS = ['id', 'act', 'nameKey', 'flavorKeys', 'requires', 'onPass', 'onFail'];
const ENDINGS_FIELDS = ['axes', 'majors', 'minors'];
const AXIS_FIELDS = ['id', 'key', 'from', 'sides', 'unlisted'];
const MAJOR_FIELDS = ['id', 'on', 'nameKey', 'goalKey'];
const MINOR_FIELDS = ['id', 'major', 'conditions', 'fallback', 'nameKey', 'textKeys', 'goalKey'];
const AWARD_FIELDS = ['id', 'nameKey', 'citationKey', 'conditions', 'fallback'];
/** Awards are a separate list, capped at 8 (docs/ui-plan.md §13, decision 20). */
const MAX_AWARDS = 8;
/**
 * The content budget (AGENTS.md → Content budget): a ceiling per kind, not a target. Raised for phase 1 of
 * the content expansion — five screen cards, and endings as 4 majors × 13 minors.
 */
const CONTENT_BUDGET = { action: 25, opportunity: 8, scandal: 6, gate: 8, major: 4, minor: 14 } as const;
const RULES_FIELDS = [
  'acts', 'turnsPerAct', 'actNameKeys', 'actOpenerKeys', 'openingKeys', 'handSize', 'slotsPerTurn', 'gatesOffered',
  'heatThreshold', 'degradePerScandal', 'thresholdFloor', 'vent',
  'startingResources', 'startingDeck', 'draft', 'tiers', 'lanes', 'laneStartingDeck', 'laneEstablished', 'calendar', 'statTips',
];
const DRAFT_FIELDS = ['atTurns', 'offerSize', 'picks', 'extraPickCost', 'maxExtraPicks', 'rerollCost', 'maxRerolls'];

/** Hard numeric bounds. Values outside them are errors, not taste. */
const LIMIT = {
  cost: [0, 10],
  resourceDelta: [-100, 100],
  slotsDelta: [-10, 10],
  count: [1, 10],
  conditionBound: [0, 10_000],
  acts: [1, 10],
  turnsPerAct: [1, 20],
  handSize: [1, 20],
  slotsPerTurn: [1, 20],
  heat: [1, 1_000],
  startingResource: [0, 1_000],
  draftCount: [0, 10],
  price: [0, 100],
} as const satisfies Record<string, readonly [number, number]>;

type Owner =
  | { readonly kind: 'card'; readonly id: string }
  | { readonly kind: 'gate'; readonly id: string; readonly act: number }
  /** A manager's month-end effects: from the first month on. */
  | { readonly kind: 'manager'; readonly id: string };

class Ctx {
  readonly issues: Issue[] = [];
  acts = 3;
  totalTurns = 12;
  readonly cardIds = new Set<string>();
  readonly addCardRefs: { owner: Owner; cardId: string; where: string }[] = [];
  readonly flagsSet = new Map<string, string>();
  readonly flagsRead = new Map<string, string>();
  readonly exhaustTags = new Map<string, string>();
  readonly keysUsed = new Map<string, string>();
  /** rules.lanes, once checked: what a card's lane and a lane test may name. */
  lanes: readonly string[] = [];

  error(check: CheckId, where: string, message: string): void {
    this.issues.push({ level: 'error', check, where, message });
  }
  warn(check: CheckId, where: string, message: string): void {
    this.issues.push({ level: 'warning', check, where, message });
  }

  fields(obj: Obj, allowed: readonly string[], where: string): void {
    for (const k of Object.keys(obj)) if (!allowed.includes(k)) this.error('schema', where, `unknown field ${q(k)}`);
  }

  int(value: unknown, where: string, [lo, hi]: readonly [number, number], opts: { optional?: boolean } = {}): value is number {
    if (value === undefined && opts.optional) return false;
    if (!isInt(value)) {
      this.error('ranges', where, `must be an integer, got ${q(value)}`);
      return false;
    }
    if (value < lo || value > hi) {
      this.error('ranges', where, `${value} is outside ${lo}..${hi}`);
      return false;
    }
    return true;
  }

  key(value: unknown, where: string): void {
    if (!isStr(value)) return this.error('schema', where, 'must be a non-empty i18n key');
    if (!this.keysUsed.has(value)) this.keysUsed.set(value, where);
  }

  /** A line group's variants: a non-empty list of i18n keys, no key twice. */
  keys(value: unknown, where: string): void {
    if (!Array.isArray(value) || value.length === 0) return this.error('schema', where, 'must be a non-empty array of i18n keys (the variants)');
    value.forEach((k, i) => this.key(k, `${where}[${i}]`));
    if (new Set(value).size !== value.length) this.error('schema', where, 'lists a variant twice');
  }

  id(value: unknown, where: string): value is string {
    if (!isStr(value) || !ID.test(value)) {
      this.error('schema', where, `id must match ${ID.source}, got ${q(value)}`);
      return false;
    }
    return true;
  }
}

// ---------------------------------------------------------------------------
// Conditions and effects

function checkCondition(v: Ctx, c: unknown, where: string): void {
  if (!isObj(c)) return v.error('schema', where, 'condition must be an object');
  for (const [key, value] of Object.entries(c)) {
    const at = `${where}.${key}`;
    if ((CONDITION_RANGE_KEYS as readonly string[]).includes(key)) {
      const bounds: readonly [number, number] =
        key === 'act' ? [1, v.acts] : key === 'turn' ? [1, v.totalTurns] : LIMIT.conditionBound;
      checkRange(v, value, at, bounds);
    } else if (key === 'flags') {
      checkFlagTest(v, value, at);
    } else {
      v.error('schema', at, `unknown condition key ${q(key)} (known: ${[...CONDITION_RANGE_KEYS, 'flags'].join(', ')})`);
    }
  }
}

function checkRange(v: Ctx, r: unknown, where: string, bounds: readonly [number, number]): void {
  if (!isObj(r)) return v.error('schema', where, 'range must be an object like { "min": 1 }');
  v.fields(r, ['min', 'max'], where);
  if (r.min === undefined && r.max === undefined) v.error('schema', where, 'range needs "min" and/or "max"');
  const minOk = v.int(r.min, `${where}.min`, bounds, { optional: true });
  const maxOk = v.int(r.max, `${where}.max`, bounds, { optional: true });
  if (minOk && maxOk && (r.min as number) > (r.max as number)) v.error('ranges', where, 'min > max: can never hold');
}

function checkFlagTest(v: Ctx, f: unknown, where: string): void {
  if (!isObj(f)) return v.error('schema', where, 'flags must be an object like { "not": ["x"] }');
  v.fields(f, FLAG_TEST_KEYS, where);
  for (const k of FLAG_TEST_KEYS) {
    const list = f[k];
    if (list === undefined) continue;
    if (!Array.isArray(list)) {
      v.error('schema', `${where}.${k}`, 'must be an array of flag names');
      continue;
    }
    for (const flag of list) {
      if (!isStr(flag)) v.error('schema', `${where}.${k}`, `flag names must be strings, got ${q(flag)}`);
      else if (!v.flagsRead.has(flag)) v.flagsRead.set(flag, where);
    }
  }
}

function checkEffects(v: Ctx, list: unknown, where: string, owner: Owner): void {
  if (!Array.isArray(list)) return v.error('schema', where, 'must be an array of effects');
  list.forEach((e, i) => checkEffect(v, e, `${where}[${i}]`, owner));
}

function checkEffect(v: Ctx, e: unknown, where: string, owner: Owner): void {
  if (!isObj(e)) return v.error('schema', where, 'effect must be an object');
  const op = e.op;
  if (!isEffectOp(op)) return v.error('unknownOp', where, `unknown op ${q(op)} (closed set: ${EFFECT_OPS.join(', ')})`);
  v.fields(e, ['op', ...EFFECT_FIELDS[op]], `${where} (${op})`);

  switch (op) {
    case 'resource':
      if (!(RESOURCE_KEYS as readonly unknown[]).includes(e.target)) {
        v.error('schema', `${where}.target`, `must be one of ${RESOURCE_KEYS.join(', ')}, got ${q(e.target)}`);
      }
      if (v.int(e.value, `${where}.value`, LIMIT.resourceDelta) && e.value === 0) v.warn('ranges', `${where}.value`, 'is 0: no effect');
      return;
    case 'draw':
      v.int(e.count, `${where}.count`, LIMIT.count);
      return;
    case 'addCard':
      if (isStr(e.cardId)) v.addCardRefs.push({ owner, cardId: e.cardId, where: `${where}.cardId` });
      else v.error('schema', `${where}.cardId`, 'must be a card id');
      if (!(ADD_CARD_ZONES as readonly unknown[]).includes(e.to)) {
        v.error('schema', `${where}.to`, `must be one of ${ADD_CARD_ZONES.join(', ')}, got ${q(e.to)}`);
      }
      v.int(e.count, `${where}.count`, LIMIT.count, { optional: true });
      return;
    case 'exhaustTag':
      if (isStr(e.tag)) v.exhaustTags.set(e.tag, where);
      else v.error('schema', `${where}.tag`, 'must be a tag');
      v.int(e.count, `${where}.count`, LIMIT.count, { optional: true });
      return;
    case 'slots':
      if (v.int(e.value, `${where}.value`, LIMIT.slotsDelta) && e.value === 0) v.warn('ranges', `${where}.value`, 'is 0: no effect');
      return;
    case 'setFlag':
      if (isStr(e.flag) && ID.test(e.flag)) {
        if (!v.flagsSet.has(e.flag)) v.flagsSet.set(e.flag, where);
      } else v.error('schema', `${where}.flag`, `flag must match ${ID.source}, got ${q(e.flag)}`);
      return;
    case 'conditional':
      if (e.if === undefined) v.error('schema', `${where}.if`, 'conditional needs "if"');
      else checkCondition(v, e.if, `${where}.if`);
      if (e.then === undefined) v.error('schema', `${where}.then`, 'conditional needs "then"');
      else checkEffects(v, e.then, `${where}.then`, owner);
      if (e.else !== undefined) checkEffects(v, e.else, `${where}.else`, owner);
      return;
  }
}

// ---------------------------------------------------------------------------
// Pieces

function checkRules(v: Ctx, raw: unknown): Obj | null {
  const where = 'rules';
  if (!isObj(raw)) {
    v.error('schema', where, 'content/rules.json must be an object');
    return null;
  }
  v.fields(raw, RULES_FIELDS, where);
  if (v.int(raw.acts, 'rules.acts', LIMIT.acts)) v.acts = raw.acts;
  if (v.int(raw.turnsPerAct, 'rules.turnsPerAct', LIMIT.turnsPerAct)) v.totalTurns = v.acts * raw.turnsPerAct;
  if (!Array.isArray(raw.actNameKeys)) v.error('schema', 'rules.actNameKeys', 'must be an array: one i18n key per act');
  else {
    if (raw.actNameKeys.length !== v.acts) {
      v.error('ranges', 'rules.actNameKeys', `has ${raw.actNameKeys.length} entries for ${v.acts} acts`);
    }
    raw.actNameKeys.forEach((k, i) => v.key(k, `rules.actNameKeys[${i}]`));
  }
  if (raw.actOpenerKeys !== undefined) {
    if (!Array.isArray(raw.actOpenerKeys)) v.error('schema', 'rules.actOpenerKeys', 'must be an array: one list of opener variants per act');
    else {
      if (raw.actOpenerKeys.length !== v.acts) {
        v.error('ranges', 'rules.actOpenerKeys', `has ${raw.actOpenerKeys.length} entries for ${v.acts} acts`);
      }
      raw.actOpenerKeys.forEach((k, i) => v.keys(k, `rules.actOpenerKeys[${i}]`));
    }
  }
  if (raw.openingKeys !== undefined) v.keys(raw.openingKeys, 'rules.openingKeys');
  v.int(raw.handSize, 'rules.handSize', LIMIT.handSize);
  v.int(raw.slotsPerTurn, 'rules.slotsPerTurn', LIMIT.slotsPerTurn);
  v.int(raw.gatesOffered, 'rules.gatesOffered', LIMIT.count);

  if (!Array.isArray(raw.heatThreshold)) v.error('schema', 'rules.heatThreshold', 'must be an array: one threshold per act');
  else {
    if (raw.heatThreshold.length !== v.acts) {
      v.error('ranges', 'rules.heatThreshold', `has ${raw.heatThreshold.length} entries for ${v.acts} acts`);
    }
    raw.heatThreshold.forEach((t, i) => v.int(t, `rules.heatThreshold[${i}]`, LIMIT.heat));
  }

  if (!isObj(raw.startingResources)) v.error('schema', 'rules.startingResources', 'must be an object');
  else {
    v.fields(raw.startingResources, RESOURCE_KEYS, 'rules.startingResources');
    for (const r of RESOURCE_KEYS) v.int(raw.startingResources[r], `rules.startingResources.${r}`, LIMIT.startingResource);
  }

  if (!Array.isArray(raw.startingDeck)) v.error('schema', 'rules.startingDeck', 'must be an array of { cardId, count }');
  else {
    let total = 0;
    raw.startingDeck.forEach((entry, i) => {
      const at = `rules.startingDeck[${i}]`;
      if (!isObj(entry)) return v.error('schema', at, 'must be { cardId, count }');
      v.fields(entry, ['cardId', 'count'], at);
      if (!isStr(entry.cardId)) v.error('schema', `${at}.cardId`, 'must be a card id');
      if (v.int(entry.count, `${at}.count`, LIMIT.count)) total += entry.count;
    });
    if (isInt(raw.handSize) && total < raw.handSize) {
      v.warn('structure', 'rules.startingDeck', `${total} cards can't fill a hand of ${raw.handSize}`);
    }
  }

  // Cascade: effective threshold = max(thresholdFloor[act], base[act] - scandalsHeld * degradePerScandal);
  // each scandal vents `vent` heat, which must stay below every floor so a residue carries over.
  // Floors only ever divide heat, so they may be fractional (e.g. 4.5 above a vent of 4); vent moves
  // heat itself and stays an integer.
  const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
  const floors: readonly unknown[] = Array.isArray(raw.thresholdFloor) ? raw.thresholdFloor : [];
  if (!Array.isArray(raw.thresholdFloor)) v.error('schema', 'rules.thresholdFloor', 'must be an array: one floor per act');
  else if (floors.length !== v.acts) v.error('ranges', 'rules.thresholdFloor', `has ${floors.length} entries for ${v.acts} acts`);
  floors.forEach((f, i) => {
    const [lo, hi] = LIMIT.heat;
    if (!isNum(f) || f < lo || f > hi) v.error('ranges', `rules.thresholdFloor[${i}]`, `must be a number in ${lo}..${hi}, got ${q(f)}`);
  });
  const ventOk = v.int(raw.vent, 'rules.vent', LIMIT.heat);
  const degrade = raw.degradePerScandal;
  if (!isNum(degrade) || degrade < 0 || degrade > 100) {
    v.error('ranges', 'rules.degradePerScandal', `must be a number in 0..100, got ${q(degrade)}`);
  }
  floors.forEach((f, i) => {
    if (!isNum(f)) return;
    if (ventOk && (raw.vent as number) >= f) {
      v.error('ranges', 'rules.vent', `vent ${String(raw.vent)} must be below thresholdFloor[${i}] ${f}: vent < effective threshold always`);
    }
    const base = Array.isArray(raw.heatThreshold) ? raw.heatThreshold[i] : undefined;
    if (isInt(base) && base < f) v.error('ranges', `rules.heatThreshold[${i}]`, `${base} is below thresholdFloor[${i}] ${f}`);
  });

  if (!isObj(raw.draft)) v.error('schema', 'rules.draft', 'must be an object: { offerSize, picks, extraPickCost, maxExtraPicks, rerollCost, maxRerolls }');
  else {
    v.fields(raw.draft, DRAFT_FIELDS, 'rules.draft');
    const atTurns = raw.draft.atTurns;
    if (!Array.isArray(atTurns)) v.error('schema', 'rules.draft.atTurns', 'must be an array of turn-within-act numbers, e.g. [1, 3]');
    else {
      const perAct = isInt(raw.turnsPerAct) ? raw.turnsPerAct : 1;
      atTurns.forEach((t, i) => v.int(t, `rules.draft.atTurns[${i}]`, [1, perAct]));
      if (new Set(atTurns).size !== atTurns.length) v.error('ranges', 'rules.draft.atTurns', 'lists a turn twice');
    }
    v.int(raw.draft.offerSize, 'rules.draft.offerSize', LIMIT.count);
    v.int(raw.draft.picks, 'rules.draft.picks', LIMIT.draftCount);
    v.int(raw.draft.maxExtraPicks, 'rules.draft.maxExtraPicks', LIMIT.draftCount);
    v.int(raw.draft.maxRerolls, 'rules.draft.maxRerolls', LIMIT.draftCount);
    v.int(raw.draft.extraPickCost, 'rules.draft.extraPickCost', LIMIT.price);
    v.int(raw.draft.rerollCost, 'rules.draft.rerollCost', LIMIT.price);
  }
  if (!Array.isArray(raw.lanes) || raw.lanes.length === 0) v.error('schema', 'rules.lanes', 'must be a non-empty array of lane ids, the base first');
  else {
    raw.lanes.forEach((lane, i) => v.id(lane, `rules.lanes[${i}]`));
    if (new Set(raw.lanes).size !== raw.lanes.length) v.error('schema', 'rules.lanes', 'lists a lane twice');
    if (raw.lanes.includes(NEUTRAL_LANE)) v.error('schema', 'rules.lanes', `"${NEUTRAL_LANE}" is not a career lane: it is what counts toward none`);
    v.lanes = raw.lanes.filter(isStr);
  }
  checkTiers(v, raw.tiers);
  // The calendar (round 2c): the month and year the first month of play falls in.
  if (raw.calendar !== undefined) {
    const cal = raw.calendar;
    if (!isObj(cal)) v.error('schema', 'rules.calendar', 'must be { startMonth, startYear }');
    else {
      v.fields(cal, ['startMonth', 'startYear'], 'rules.calendar');
      v.int(cal.startMonth, 'rules.calendar.startMonth', [1, 12]);
      v.int(cal.startYear, 'rules.calendar.startYear', [1, 9999]);
    }
  }
  // The tooltip lines of the stats without tiers (round 2c).
  if (raw.statTips !== undefined) {
    const tips = raw.statTips;
    const fields = ['capital', 'toGo', 'toNext', 'slots'];
    if (!isObj(tips)) v.error('schema', 'rules.statTips', `must be { ${fields.join(', ')} }`);
    else {
      v.fields(tips, fields, 'rules.statTips');
      for (const f of fields) v.key(tips[f], `rules.statTips.${f}`);
    }
  }
  if (raw.laneStartingDeck !== undefined && typeof raw.laneStartingDeck !== 'boolean') v.error('schema', 'rules.laneStartingDeck', 'must be a boolean');
  if (raw.laneEstablished !== undefined) {
    const le = raw.laneEstablished;
    if (!isObj(le)) v.error('schema', 'rules.laneEstablished', 'must be { minPlays, lead }');
    else {
      v.fields(le, ['minPlays', 'lead'], 'rules.laneEstablished');
      v.int(le.minPlays, 'rules.laneEstablished.minPlays', [1, 100]);
      v.int(le.lead, 'rules.laneEstablished.lead', [1, 100]);
    }
  }
  return raw;
}

/**
 * The stat bar's tiers (docs/ui-plan.md §13, decision 25): a word per tier, lowest first, and boundaries
 * that let every tier apply. hype and craft: `from` starts at 0 and rises. heat, read from the distance to
 * the line: points to go falling, lines crossed rising from 1, a word for each tier the two make.
 */
function checkTiers(v: Ctx, raw: unknown): void {
  const where = 'rules.tiers';
  if (raw === undefined) return v.error('schema', where, 'missing: the stat bar needs tiers for hype, heat and craft');
  if (!isObj(raw)) return v.error('schema', where, 'must be an object: { hype, heat, craft }');
  v.fields(raw, ['hype', 'heat', 'craft'], where);
  const words = (t: Obj, at: string): number => {
    if (!Array.isArray(t.nameKeys) || t.nameKeys.length === 0) {
      v.error('schema', `${at}.nameKeys`, 'must be a non-empty array of i18n keys, lowest tier first');
      return 0;
    }
    t.nameKeys.forEach((k, i) => v.key(k, `${at}.nameKeys[${i}]`));
    return t.nameKeys.length;
  };
  const ints = (list: unknown, at: string, lo: number): number[] | null => {
    if (!Array.isArray(list) || list.length === 0) {
      v.error('schema', at, 'must be a non-empty array of integers');
      return null;
    }
    return list.every((n, i) => v.int(n, `${at}[${i}]`, [lo, LIMIT.conditionBound[1]])) ? (list as number[]) : null;
  };
  const strictly = (list: readonly number[], at: string, rise: boolean) => {
    if (list.some((n, i) => i > 0 && (rise ? n <= (list[i - 1] as number) : n >= (list[i - 1] as number)))) {
      v.error('ranges', at, rise ? 'must rise strictly' : 'must fall strictly');
    }
  };
  // Tooltip lines (round 2c): one per tier, in order.
  const tipKeys = (list: unknown, at: string, n: number) => {
    if (list === undefined) return;
    if (!Array.isArray(list)) return v.error('schema', at, 'must be an array of i18n keys, one per tier');
    if (n > 0 && list.length !== n) v.error('structure', at, `has ${list.length} lines for ${n} tiers`);
    list.forEach((k, i) => v.key(k, `${at}[${i}]`));
  };
  for (const stat of ['hype', 'craft'] as const) {
    const t = raw[stat];
    const at = `${where}.${stat}`;
    if (!isObj(t)) {
      v.error('schema', at, 'must be { nameKeys, from }');
      continue;
    }
    v.fields(t, ['nameKeys', 'from', 'tipKeys', 'modeKey', 'laneTips'], at);
    const n = words(t, at);
    tipKeys(t.tipKeys, `${at}.tipKeys`, n);
    if (t.modeKey !== undefined) v.key(t.modeKey, `${at}.modeKey`);
    if (t.laneTips !== undefined) {
      if (!isObj(t.laneTips)) v.error('schema', `${at}.laneTips`, 'must map a lane to { modeKey, tipKeys }');
      else
        for (const [lane, own] of Object.entries(t.laneTips)) {
          const w = `${at}.laneTips.${lane}`;
          if (!v.lanes.includes(lane)) v.error('references', w, `no lane ${q(lane)} in rules.lanes`);
          if (!isObj(own)) {
            v.error('schema', w, 'must be { modeKey, tipKeys }');
            continue;
          }
          v.fields(own, ['modeKey', 'tipKeys'], w);
          v.key(own.modeKey, `${w}.modeKey`);
          tipKeys(own.tipKeys, `${w}.tipKeys`, n);
        }
    }
    const from = ints(t.from, `${at}.from`, 0);
    if (!from) continue;
    if (from[0] !== 0) v.error('ranges', `${at}.from`, 'must start at 0, so some tier always applies');
    strictly(from, `${at}.from`, true);
    if (n > 0 && from.length !== n) v.error('ranges', at, `${from.length} boundaries for ${n} tier words`);
  }
  const heat = raw.heat;
  const at = `${where}.heat`;
  if (!isObj(heat)) return v.error('schema', at, 'must be { nameKeys, toGoAtLeast, linesCrossed }');
  v.fields(heat, ['nameKeys', 'toGoAtLeast', 'linesCrossed', 'tipKeys', 'countdown'], at);
  const n = words(heat, at);
  tipKeys(heat.tipKeys, `${at}.tipKeys`, n);
  // The next-scandal countdown's level per heat tier (round 2c).
  if (heat.countdown !== undefined) {
    const levels: readonly unknown[] = COUNTDOWN_LEVELS;
    if (!Array.isArray(heat.countdown) || (n > 0 && heat.countdown.length !== n)) v.error('structure', `${at}.countdown`, `must give one level per heat tier (${n})`);
    else heat.countdown.forEach((x, i) => {
      if (!levels.includes(x)) v.error('schema', `${at}.countdown[${i}]`, `must be one of ${COUNTDOWN_LEVELS.join(', ')}, got ${q(x)}`);
    });
  }
  const toGo = ints(heat.toGoAtLeast, `${at}.toGoAtLeast`, 1);
  const lines = ints(heat.linesCrossed, `${at}.linesCrossed`, 1);
  if (toGo) strictly(toGo, `${at}.toGoAtLeast`, false);
  if (lines) {
    if (lines[0] !== 1) v.error('ranges', `${at}.linesCrossed`, 'must start at 1: the first tier over a line');
    strictly(lines, `${at}.linesCrossed`, true);
  }
  if (n > 0 && toGo && lines && n !== toGo.length + 1 + lines.length) {
    v.error('ranges', at, `${n} tier words for ${toGo.length + 1} tiers below the line and ${lines.length} over it`);
  }
}

const draftOn = (rules: Obj | null) =>
  !!rules &&
  isObj(rules.draft) &&
  isInt(rules.draft.picks) &&
  rules.draft.picks > 0 &&
  Array.isArray(rules.draft.atTurns) &&
  rules.draft.atTurns.length > 0;
const actMinOf = (c: Obj) => (isInt(c.actMin) ? c.actMin : 1);

function checkList(v: Ctx, raw: unknown, file: string, label: string, each: (o: Obj, where: string) => void): Obj[] {
  if (!Array.isArray(raw)) {
    v.error('schema', file, `${file} must be an array`);
    return [];
  }
  const seen = new Set<string>();
  const out: Obj[] = [];
  raw.forEach((item, i) => {
    if (!isObj(item)) return v.error('schema', `${label}[${i}]`, 'must be an object');
    const where = isStr(item.id) ? `${label} ${item.id}` : `${label}[${i}]`;
    if (v.id(item.id, `${where}.id`)) {
      if (seen.has(item.id)) v.error('schema', where, `duplicate ${label} id`);
      seen.add(item.id);
    }
    each(item, where);
    out.push(item);
  });
  return out;
}

function checkCards(v: Ctx, raw: unknown): Obj[] {
  const cards = checkList(v, raw, 'content/cards.json', 'card', (c, where) => {
    v.fields(c, CARD_FIELDS, where);
    const owner: Owner = { kind: 'card', id: String(c.id) };
    if (!(CARD_KINDS as readonly unknown[]).includes(c.kind)) {
      v.error('schema', `${where}.kind`, `must be one of ${CARD_KINDS.join(', ')}, got ${q(c.kind)}`);
    }
    v.int(c.cost, `${where}.cost`, LIMIT.cost);
    v.key(c.nameKey, `${where}.nameKey`);
    // A card's rules text; a scandal has none — the interface tells its rules from its effects.
    if (c.kind === 'scandal') {
      if (c.textKey !== undefined) v.error('schema', `${where}.textKey`, 'a scandal has no rules text: its in-hand lines are inHandKeys');
    } else v.key(c.textKey, `${where}.textKey`);
    if (c.playable !== undefined && typeof c.playable !== 'boolean') v.error('schema', `${where}.playable`, 'must be a boolean');
    if (c.tags !== undefined && (!Array.isArray(c.tags) || !c.tags.every(isStr))) {
      v.error('schema', `${where}.tags`, 'must be an array of strings');
    }
    v.int(c.actMin, `${where}.actMin`, [1, v.acts], { optional: true });
    if (c.requires !== undefined) checkCondition(v, c.requires, `${where}.requires`);
    for (const field of ['effects', 'onDraw', 'onEndOfTurn'] as const) {
      if (c[field] !== undefined) checkEffects(v, c[field], `${where}.${field}`, owner);
    }
    if (c.kind === 'scandal') {
      if (c.playable !== false) v.error('schema', `${where}.playable`, 'scandal cards must be "playable": false');
      if (c.effects !== undefined) v.warn('schema', `${where}.effects`, 'a scandal is never played: these effects never fire');
    } else if (c.playable === false) {
      v.warn('schema', `${where}.playable`, `an unplayable ${String(c.kind)} card only clogs the hand`);
    }
    // Prose keys (decision 15): every line group is a list of variants. Whether the prose itself is written is
    // the 'prose' check; whether there are enough variants for how often it is seen, the 'variants' check.
    if (c.headlineKeys !== undefined) v.keys(c.headlineKeys, `${where}.headlineKeys`);
    if (c.register !== undefined && !(REGISTERS as readonly unknown[]).includes(c.register)) {
      v.error('schema', `${where}.register`, `must be one of ${REGISTERS.join(', ')}, got ${q(c.register)}`);
    }
    if (c.kind === 'scandal') {
      if (c.inHandKeys !== undefined) v.keys(c.inHandKeys, `${where}.inHandKeys`);
      if (c.register !== undefined) v.error('schema', `${where}.register`, 'a scandal always prints in The Daily Flash: it has no register');
    } else if (c.inHandKeys !== undefined) v.error('schema', `${where}.inHandKeys`, 'only a scandal shows lines while it sits in the hand');
    // The career lane playing it builds (docs/design/content-expansion.md §2). Scandals are never played.
    if (c.kind === 'scandal') {
      if (c.lane !== undefined) v.error('schema', `${where}.lane`, 'a scandal is never played: it has no lane');
    } else if (!isStr(c.lane) || ![...v.lanes, NEUTRAL_LANE].includes(c.lane)) {
      v.error('references', `${where}.lane`, `must be one of ${[...v.lanes, NEUTRAL_LANE].join(', ')}, got ${q(c.lane)}`);
    }
  });
  for (const c of cards) if (isStr(c.id)) v.cardIds.add(c.id);
  return cards;
}

function checkGates(v: Ctx, raw: unknown): Obj[] {
  return checkList(v, raw, 'content/gates.json', 'gate', (g, where) => {
    v.fields(g, GATE_FIELDS, where);
    const act = v.int(g.act, `${where}.act`, [1, v.acts]) ? g.act : 0;
    const owner: Owner = { kind: 'gate', id: String(g.id), act };
    v.key(g.nameKey, `${where}.nameKey`);
    if (g.flavorKeys !== undefined) v.keys(g.flavorKeys, `${where}.flavorKeys`);
    if (g.requires === undefined) v.error('schema', `${where}.requires`, 'gates need "requires"');
    else checkCondition(v, g.requires, `${where}.requires`);
    for (const field of ['onPass', 'onFail'] as const) {
      if (g[field] === undefined) v.error('schema', `${where}.${field}`, `gates need "${field}" (may be [])`);
      else checkEffects(v, g[field], `${where}.${field}`, owner);
    }
  });
}

/**
 * Year conditions (core/year.ts): the condition shape plus a lane test, cards held, alternatives and the
 * year stats. Minor endings and awards read them; `extra` names keys the caller checks itself (`ending`).
 */
function checkYearConditions(v: Ctx, c: unknown, where: string, extra: readonly string[] = []): void {
  if (!isObj(c)) return v.error('schema', where, 'must be an object');
  const own: readonly string[] = [...YEAR_ONLY_KEYS, ...extra];
  checkCondition(v, Object.fromEntries(Object.entries(c).filter(([k]) => !own.includes(k))), where);
  if (c.lane !== undefined) {
    const at = `${where}.lane`;
    if (!isObj(c.lane)) v.error('schema', at, 'must be an object like { "any": ["screen"] }');
    else {
      v.fields(c.lane, ['any', 'not'], at);
      for (const k of ['any', 'not'] as const) {
        const list = c.lane[k];
        if (list === undefined) continue;
        if (!Array.isArray(list)) v.error('schema', `${at}.${k}`, 'must be an array of lane ids');
        else for (const lane of list) if (!v.lanes.includes(lane)) v.error('references', `${at}.${k}`, `no lane ${q(lane)} in rules.lanes`);
      }
    }
  }
  if (c.holds !== undefined) {
    const at = `${where}.holds`;
    if (!isObj(c.holds)) v.error('schema', at, 'must be an object like { "any": ["burnout"] }');
    else {
      v.fields(c.holds, FLAG_TEST_KEYS, at);
      for (const k of FLAG_TEST_KEYS) {
        const list = c.holds[k];
        if (list === undefined) continue;
        if (!Array.isArray(list)) v.error('schema', `${at}.${k}`, 'must be an array of card ids');
        else for (const id of list) if (!v.cardIds.has(id)) v.error('references', `${at}.${k}`, `no card with id ${q(id)}`);
      }
    }
  }
  if (c.anyOf !== undefined) {
    if (!Array.isArray(c.anyOf) || c.anyOf.length < 2) v.error('schema', `${where}.anyOf`, 'must list two or more alternative conditions');
    else c.anyOf.forEach((alt, i) => checkYearConditions(v, alt, `${where}.anyOf[${i}]`));
  }
  for (const k of YEAR_STAT_KEYS) if (c[k] !== undefined) checkRange(v, c[k], `${where}.${k}`, LIMIT.conditionBound);
}

/**
 * Endings, two levels (docs/design/content-expansion.md §1): majors on axes, minors within them. Checked to
 * be exhaustive: exactly one major for every combination of the axes' sides, and one fallback minor per
 * major, last and unconditional. A split on a tiered stat must sit on a tier boundary, so the stat bar's
 * word says which side of it the player is on (decision 25). Ids are unique across majors and minors:
 * an award's ending test may name either.
 */
function checkEndings(v: Ctx, raw: unknown, rules: Obj | null): { majors: Obj[]; minors: Obj[] } {
  const file = 'content/endings.json';
  if (!isObj(raw)) {
    v.error('schema', file, 'must be an object: { axes, majors, minors }');
    return { majors: [], minors: [] };
  }
  v.fields(raw, ENDINGS_FIELDS, file);
  const tiers = rules && isObj(rules.tiers) ? rules.tiers : {};
  const axes = checkList(v, raw.axes, `${file} axes`, 'axis', (a, where) => {
    v.fields(a, AXIS_FIELDS, where);
    if (!(CONDITION_RANGE_KEYS as readonly unknown[]).includes(a.key)) v.error('schema', `${where}.key`, `must be one of ${CONDITION_RANGE_KEYS.join(', ')}, got ${q(a.key)}`);
    const fromOk = v.int(a.from, `${where}.from`, LIMIT.conditionBound);
    if (!Array.isArray(a.sides) || a.sides.length !== 2 || !a.sides.every(isStr) || a.sides[0] === a.sides[1]) {
      v.error('schema', `${where}.sides`, 'must be two different names: [below "from", from "from" on]');
    }
    if (a.unlisted !== undefined) {
      const sides: unknown[] = Array.isArray(a.sides) ? a.sides : [];
      if (!Array.isArray(a.unlisted) || !a.unlisted.every((x) => sides.includes(x))) v.error('schema', `${where}.unlisted`, 'must list some of the axis sides');
      else if (a.unlisted.length >= sides.length) v.error('structure', `${where}.unlisted`, 'cannot hide every side: a major would show nothing of this axis');
    }
    const t = isStr(a.key) ? tiers[a.key] : undefined;
    const bounds: unknown[] = isObj(t) && Array.isArray(t.from) ? t.from : [];
    if (fromOk && bounds.length > 0 && !bounds.includes(a.from)) {
      v.error('structure', `${where}.from`, `${String(a.from)} is not a ${String(a.key)} tier boundary (${bounds.join(', ')}): the stat bar's word must say which side of the split the player is on`);
    }
  });
  if (axes.length === 0) v.error('fallback', file, 'needs at least one axis');
  const axisSides = new Map(axes.filter((a) => isStr(a.id) && Array.isArray(a.sides)).map((a) => [a.id as string, a.sides as string[]]));
  const majors = checkList(v, raw.majors, `${file} majors`, 'major', (m, where) => {
    v.fields(m, MAJOR_FIELDS, where);
    v.key(m.nameKey, `${where}.nameKey`);
    v.key(m.goalKey, `${where}.goalKey`);
    if (!isObj(m.on)) return v.error('schema', `${where}.on`, 'must name its side of every axis, like { "fame": "known" }');
    v.fields(m.on, [...axisSides.keys()], `${where}.on`);
    for (const [axis, sides] of axisSides) {
      if (!sides.includes(m.on[axis] as string)) v.error('schema', `${where}.on.${axis}`, `must be one of ${sides.join(', ')}, got ${q(m.on[axis])}`);
    }
  });
  // Exhaustive and disjoint: every combination of sides has exactly one major.
  let corners: string[][] = [[]];
  for (const sides of axisSides.values()) corners = corners.flatMap((c) => sides.map((side) => [...c, side]));
  const axisIds = [...axisSides.keys()];
  for (const corner of corners) {
    const here = majors.filter((m) => {
      const on = m.on;
      return isObj(on) && axisIds.every((axis, i) => on[axis] === corner[i]);
    });
    const name = axisIds.map((axis, i) => `${axis} ${corner[i]}`).join(', ');
    if (here.length === 0) v.error('fallback', file, `no major for ${name}: a year could end in no ending`);
    if (here.length > 1) v.error('fallback', file, `${here.length} majors for ${name}: ${here.map((m) => String(m.id)).join(', ')}`);
  }
  const majorIds = new Set(majors.map((m) => m.id).filter(isStr));
  const minors = checkList(v, raw.minors, `${file} minors`, 'minor', (m, where) => {
    v.fields(m, MINOR_FIELDS, where);
    if (!majorIds.has(m.major as string)) v.error('references', `${where}.major`, `no major with id ${q(m.major)}`);
    v.key(m.nameKey, `${where}.nameKey`);
    v.keys(m.textKeys, `${where}.textKeys`);
    if (m.goalKey !== undefined) v.key(m.goalKey, `${where}.goalKey`);
    if (m.fallback !== undefined && typeof m.fallback !== 'boolean') v.error('schema', `${where}.fallback`, 'must be a boolean');
    if (m.fallback === true && m.conditions !== undefined) v.error('fallback', where, 'a major\'s fallback takes no conditions: it catches everything else');
    if (m.fallback !== true) {
      if (m.conditions === undefined) v.error('schema', where, 'needs "conditions", or "fallback": true');
      else checkYearConditions(v, m.conditions, `${where}.conditions`);
    }
  });
  for (const major of majorIds) {
    const own = minors.filter((m) => m.major === major);
    const fallbacks = own.filter((m) => m.fallback === true);
    if (fallbacks.length !== 1) v.error('fallback', `major ${major}`, `needs exactly one fallback minor, has ${fallbacks.length}`);
    else if (own.at(-1) !== fallbacks[0]) v.error('fallback', `major ${major}`, `fallback ${String(fallbacks[0]?.id)} must come last: minors after it can never resolve`);
  }
  for (const m of minors) if (majorIds.has(m.id as string)) v.error('schema', `minor ${String(m.id)}`, 'shares its id with a major: an award ending test could not tell them apart');
  return { majors, minors };
}

/**
 * Year-end awards (decisions 16 and 20): the condition shape, plus the award-only keys (the year's ending,
 * and a range on any year stat — YEAR_STAT_KEYS). At most 8, and a fallback so that every year ends with one.
 */
function checkAwards(v: Ctx, raw: unknown, endingIds: ReadonlySet<unknown>): Obj[] {
  const awards = checkList(v, raw, 'content/awards.json', 'award', (a, where) => {
    v.fields(a, AWARD_FIELDS, where);
    v.key(a.nameKey, `${where}.nameKey`);
    v.key(a.citationKey, `${where}.citationKey`);
    if (a.fallback !== undefined && typeof a.fallback !== 'boolean') v.error('schema', `${where}.fallback`, 'must be a boolean');
    if (a.fallback === true && a.conditions !== undefined) v.error('structure', where, 'a fallback award is granted only when no other is: it takes no conditions');
    if (a.fallback !== true && a.conditions === undefined) v.error('structure', where, 'needs "conditions", or "fallback": true');
    if (a.conditions === undefined) return;
    if (!isObj(a.conditions)) return v.error('schema', `${where}.conditions`, 'must be an object');
    checkYearConditions(v, a.conditions, `${where}.conditions`, ['ending']);
    const { ending } = a.conditions;
    if (ending !== undefined) {
      const at = `${where}.conditions.ending`;
      if (!isObj(ending)) v.error('schema', at, 'must be an object like { "any": ["star"] }');
      else {
        v.fields(ending, ['any', 'not'], at);
        for (const k of ['any', 'not'] as const) {
          const list = ending[k];
          if (list === undefined) continue;
          if (!Array.isArray(list)) v.error('schema', `${at}.${k}`, 'must be an array of major or minor ending ids');
          else for (const id of list) if (!endingIds.has(id)) v.error('references', `${at}.${k}`, `no major or minor ending with id ${q(id)}`);
        }
      }
    }
  });
  if (awards.length > MAX_AWARDS) v.error('ranges', 'content/awards.json', `${awards.length} awards; the list is capped at ${MAX_AWARDS}`);
  if (awards.length > 0 && !awards.some((a) => a.fallback === true)) {
    v.error('structure', 'content/awards.json', 'no fallback award: every year must end with at least one');
  }
  return awards;
}

// ---------------------------------------------------------------------------
// Cross-checks

function checkReferences(v: Ctx, rules: Obj | null, cards: readonly Obj[]): void {
  if (rules && Array.isArray(rules.startingDeck)) {
    rules.startingDeck.forEach((entry, i) => {
      if (!isObj(entry) || !isStr(entry.cardId)) return;
      const at = `rules.startingDeck[${i}].cardId`;
      if (!v.cardIds.has(entry.cardId)) return v.error('references', at, `no card with id ${q(entry.cardId)}`);
      const kind = cards.find((c) => c.id === entry.cardId)?.kind;
      if (kind === 'opportunity') v.error('structure', at, `${q(entry.cardId)} is an opportunity: opportunities are draft-only`);
      if (kind === 'scandal') v.warn('structure', at, `${q(entry.cardId)} is a scandal in the starting deck`);
    });
  }
  for (const ref of v.addCardRefs) {
    if (!v.cardIds.has(ref.cardId)) v.error('references', ref.where, `no card with id ${q(ref.cardId)}`);
  }
}

/**
 * Earliest act each card can enter a run:
 *   starting deck → act 1 · scandal → max(1, actMin) via crystallisation ·
 *   any other card → max(1, actMin) via the draft (when drafting is on) ·
 *   addCard in a card's effects → that card's act · addCard in an act-N gate → act N+1.
 * A card whose earliest act is past the last act can never be drawn.
 */
function checkReachability(v: Ctx, rules: Obj | null, cards: readonly Obj[]): Record<string, number> {
  const earliest: Record<string, number> = {};
  for (const id of v.cardIds) earliest[id] = Number.POSITIVE_INFINITY;
  const lower = (id: string, act: number) => {
    if (Object.hasOwn(earliest, id) && act < (earliest[id] as number)) {
      earliest[id] = act;
      return true;
    }
    return false;
  };
  if (rules && Array.isArray(rules.startingDeck)) {
    for (const entry of rules.startingDeck) if (isObj(entry) && isStr(entry.cardId)) lower(entry.cardId, 1);
  }
  for (const c of cards) {
    if (!isStr(c.id)) continue;
    if (c.kind === 'scandal' || draftOn(rules)) lower(c.id, Math.max(1, actMinOf(c)));
  }
  for (let changed = true; changed; ) {
    changed = false;
    for (const ref of v.addCardRefs) {
      const from = ref.owner.kind === 'gate' ? ref.owner.act + 1 : ref.owner.kind === 'manager' ? 1 : (earliest[ref.owner.id] ?? Number.POSITIVE_INFINITY);
      if (lower(ref.cardId, from)) changed = true;
    }
  }
  for (const [id, act] of Object.entries(earliest)) {
    if (act <= v.acts) continue;
    const gateOnly = v.addCardRefs.filter((r) => r.cardId === id && r.owner.kind === 'gate');
    const why =
      act !== Number.POSITIVE_INFINITY && gateOnly.length > 0
        ? `only added by act-${v.acts} gates, after the last turn`
        : 'not in the starting deck, not draftable in any act, not a scandal, and no reachable addCard adds it';
    v.error('reachability', `card ${id}`, `can never be drawn: ${why}`);
  }
  return earliest;
}

function checkStructure(v: Ctx, rules: Obj | null, cards: readonly Obj[], gates: readonly Obj[]): void {
  const gatesOffered = rules && isInt(rules.gatesOffered) ? rules.gatesOffered : 2;
  const requiresHype = (g: Obj) => isObj(g.requires) && isObj(g.requires.hype) && isInt(g.requires.hype.min) && g.requires.hype.min > 0;
  for (let act = 1; act <= v.acts; act++) {
    const actGates = gates.filter((g) => g.act === act);
    const n = actGates.length;
    if (n === 0) v.error('structure', `act ${act}`, 'has no gate');
    else if (n < gatesOffered) v.warn('structure', `act ${act}`, `has ${n} gate(s); ${gatesOffered} are offered per act`);
    // From act 2 on, visibility is required: a pure-craft deck must not pass everything.
    if (act >= 2 && n > 0 && !actGates.some(requiresHype)) v.error('structure', `act ${act}`, 'no gate requires hype; from act 2 on at least one must');

    const scandals = cards.filter((c) => c.kind === 'scandal' && actMinOf(c) <= act);
    if (scandals.length === 0) v.error('structure', `act ${act}`, 'no scandal card can crystallise from heat in this act');

    if (draftOn(rules) && rules && isObj(rules.draft)) {
      const pool = cards.filter((c) => c.kind !== 'scandal' && actMinOf(c) <= act).length;
      const offerSize = isInt(rules.draft.offerSize) ? rules.draft.offerSize : 0;
      if (pool === 0) v.error('structure', `act ${act}`, 'the draft pool is empty: no non-scandal card has actMin <= this act');
      else if (pool < offerSize) v.warn('structure', `act ${act}`, `draft pool has ${pool} card(s); offers are ${offerSize}`);
    }
  }
  for (const g of gates) {
    const not = isObj(g.requires) && isObj(g.requires.flags) && Array.isArray(g.requires.flags.not) ? g.requires.flags.not : [];
    if (not.length > 0) {
      v.warn('structure', `gate ${String(g.id)}.requires.flags.not`, 'a permanent flag lock: once set, the player can never respond; prefer a condition on state at resolution');
    }
  }
  for (const [flag, where] of v.flagsRead) {
    if (!v.flagsSet.has(flag)) v.warn('structure', where, `flag ${q(flag)} is read but no setFlag ever sets it`);
  }
  for (const [flag, where] of v.flagsSet) {
    if (!v.flagsRead.has(flag)) v.warn('structure', where, `flag ${q(flag)} is set but no condition reads it`);
  }
  // Every flag reads two ways (draft v3): once set, and while it is not. Both labels are required — a
  // missing one fails the i18n check; there is no general template to fall back on.
  for (const flag of flagsIn(v)) {
    v.key(`flag.${flag}.positive`, `flag ${flag}`);
    v.key(`flag.${flag}.negative`, `flag ${flag}`);
  }
  const allTags = new Set(cards.flatMap((c) => (Array.isArray(c.tags) ? c.tags : [])));
  for (const [tag, where] of v.exhaustTags) {
    if (!allTags.has(tag)) v.warn('structure', where, `no card carries tag ${q(tag)}: exhausts nothing`);
  }
}

/** Every flag content sets or reads. */
const flagsIn = (v: Ctx): Set<string> => new Set([...v.flagsSet.keys(), ...v.flagsRead.keys()]);

function checkI18n(v: Ctx, i18n: unknown): number {
  if (!isObj(i18n)) {
    v.error('i18n', 'i18n/en.json', 'must be a flat object of "key": "string"');
    return 0;
  }
  for (const [key, value] of Object.entries(i18n)) {
    if (typeof value !== 'string') v.error('i18n', `i18n/en.json ${q(key)}`, 'value must be a string');
  }
  for (const [key, where] of v.keysUsed) {
    if (!Object.hasOwn(i18n, key)) v.error('i18n', where, `missing key ${q(key)} in i18n/en.json`);
    else if (i18n[key] === '') v.error('i18n', where, `key ${q(key)} is empty in i18n/en.json`);
  }
  for (const key of Object.keys(i18n)) {
    if (/^(card|gate|ending|act|award|flag|tier)\./.test(key) && !v.keysUsed.has(key)) {
      v.warn('i18n', `i18n/en.json ${q(key)}`, 'no content uses this key');
    }
  }
  return Object.keys(i18n).length;
}

/** A prose value the author has not written yet (decision 15: agents leave placeholders, never prose). */
export const PROSE_PLACEHOLDER = 'TODO(prose)';

/**
 * Missing player-facing prose, reported as warnings: every card with no headline, every scandal missing its
 * headline or in-hand line, every major missing its name or goal line, every minor missing its name or
 * text, every gate missing its
 * flavour, every season missing its opener, the opening, and a flag label still a placeholder (a missing
 * one is an i18n error). Missing prose must be visible, not silent.
 */
function checkProse(
  v: Ctx,
  i18n: Obj,
  rules: Obj | null,
  cards: readonly Obj[],
  gates: readonly Obj[],
  endings: { readonly majors: readonly Obj[]; readonly minors: readonly Obj[] },
  awards: readonly Obj[],
): void {
  const written = (key: unknown) =>
    isStr(key) && typeof i18n[key] === 'string' && i18n[key] !== '' && !String(i18n[key]).startsWith(PROSE_PLACEHOLDER);
  const nameOf = (o: Obj) => (isStr(o.nameKey) && typeof i18n[o.nameKey] === 'string' ? ` (${String(i18n[o.nameKey])})` : '');
  const anyWritten = (keys: unknown) => Array.isArray(keys) && keys.some(written);
  for (const c of cards) {
    const where = `card ${String(c.id)}${nameOf(c)}`;
    if (c.kind === 'scandal') {
      if (!anyWritten(c.headlineKeys)) v.warn('prose', where, 'no crystallisation headline');
      if (!anyWritten(c.inHandKeys)) v.warn('prose', where, 'no in-hand line');
      continue;
    }
    const headlines = Array.isArray(c.headlineKeys) ? c.headlineKeys.filter(written) : [];
    if (headlines.length === 0) v.warn('prose', where, c.register === undefined ? 'no headline and no register' : 'no headline');
    else if (c.register === undefined) v.warn('prose', where, 'headline has no register');
  }
  // Endings, two levels: a major shows its name and goal line, a minor its name and text.
  for (const m of endings.majors) {
    const missing = (['nameKey', 'goalKey'] as const).filter((f) => !written(m[f])).map((f) => f.replace('Key', ''));
    if (missing.length > 0) v.warn('prose', `major ${String(m.id)}`, `no ${missing.join(', ')}`);
  }
  for (const m of endings.minors) {
    const missing = [...(written(m.nameKey) ? [] : ['name']), ...(anyWritten(m.textKeys) ? [] : ['text'])];
    if (missing.length > 0) v.warn('prose', `minor ${String(m.id)}`, `no ${missing.join(', ')}`);
  }
  for (const g of gates) if (!anyWritten(g.flavorKeys)) v.warn('prose', `gate ${String(g.id)}${nameOf(g)}`, 'no flavour');
  const openers: unknown[] = rules && Array.isArray(rules.actOpenerKeys) ? rules.actOpenerKeys : [];
  for (let act = 1; act <= v.acts; act++) {
    if (!anyWritten(openers[act - 1])) v.warn('prose', `season ${act}`, 'no season opener');
  }
  if (!anyWritten(rules?.openingKeys)) v.warn('prose', 'rules.openingKeys', 'no opening premise');
  for (const a of awards) {
    const missing = (['nameKey', 'citationKey'] as const).filter((f) => !written(a[f])).map((f) => f.replace('Key', ''));
    if (missing.length > 0) v.warn('prose', `award ${String(a.id)}`, `no ${missing.join(', ')}`);
  }
  for (const flag of flagsIn(v)) {
    const unwritten = (['positive', 'negative'] as const).filter((f) => Object.hasOwn(i18n, `flag.${flag}.${f}`) && !written(`flag.${flag}.${f}`));
    if (unwritten.length > 0) v.warn('prose', `flag ${flag}`, `no ${unwritten.join(', ')} label`);
  }
  const tiers = rules && isObj(rules.tiers) ? rules.tiers : {};
  for (const [stat, t] of Object.entries(tiers)) {
    const keys: unknown[] = isObj(t) && Array.isArray(t.nameKeys) ? t.nameKeys : [];
    keys.forEach((k, i) => {
      if (isStr(k) && Object.hasOwn(i18n, k) && !written(k)) v.warn('prose', `${stat} tier ${i + 1}`, 'no tier word');
    });
  }
}

/** Validate parsed content. Pass i18n to check keys and prose (the sim doesn't: it never touches /i18n). */
// ---------------------------------------------------------------------------
// Variants (docs/ui-plan.md §13, decision 15, revised): how many a line group needs follows how often the
// player sees it. Shortfalls are warnings — the writing still to come — never errors.

/** How often the player sees each line group per run: sim/appearances.json, written by npm run sim:variants. */
export interface Appearances {
  /** How it was measured. */
  readonly measured: string;
  /** Average showings per run, player-like personas pooled, by line group id. */
  readonly perRun: Readonly<Record<string, number>>;
  /** The most showings in any one run, by line group id. */
  readonly maxPerRun?: Readonly<Record<string, number>>;
}

/** Variants a line group needs, by its average showings per run: 4 or more → 4; 2 to 4 → 3; under 2 → 2. */
export function variantsNeeded(perRun: number): number {
  return perRun >= 4 ? 4 : perRun >= 2 ? 3 : 2;
}

/** An item shown once per run needs two, so different runs read differently. */
export const ONCE_VARIANTS_NEEDED = 2;

export type VariantGroupKind = 'card' | 'scandal' | 'inHand' | 'spillover' | 'filler' | 'world' | 'once' | 'manager' | 'monthEnd';

/** A line group and its variants, as content lists them. */
export interface VariantGroup {
  /** The line group id (core/lines.ts) or the once-per-run item id (core/variants.ts onceItem). */
  readonly id: string;
  readonly kind: VariantGroupKind;
  /** What it belongs to, for people: a card id, a gate id, a season. */
  readonly owner: string;
  readonly keys: readonly string[];
  /** A card's register and lane, where it has them (what paper it prints in). */
  readonly register: string | null;
  readonly lane: string | null;
}

const keyList = (x: unknown): string[] => (Array.isArray(x) ? x.filter(isStr) : []);

/** Every line group content defines, with its variants. */
export function variantGroups(raw: RawContent): VariantGroup[] {
  const groups: VariantGroup[] = [];
  const list = (x: unknown): Obj[] => (Array.isArray(x) ? x.filter(isObj) : []);
  for (const c of list(raw.cards)) {
    if (!isStr(c.id)) continue;
    const register = isStr(c.register) ? c.register : null;
    const lane = isStr(c.lane) ? c.lane : null;
    if (c.kind === 'scandal') {
      groups.push({ id: scandalGroup(c.id), kind: 'scandal', owner: c.id, keys: keyList(c.headlineKeys), register: null, lane: null });
      groups.push({ id: inHandGroup(c.id), kind: 'inHand', owner: c.id, keys: keyList(c.inHandKeys), register: null, lane: null });
    } else groups.push({ id: playGroup(c.id), kind: 'card', owner: c.id, keys: keyList(c.headlineKeys), register, lane });
  }
  const rules = isObj(raw.rules) ? raw.rules : {};
  const openers: unknown[] = Array.isArray(rules.actOpenerKeys) ? rules.actOpenerKeys : [];
  openers.forEach((keys, i) => groups.push({ id: onceItem.opener(i + 1), kind: 'once', owner: `season ${i + 1}`, keys: keyList(keys), register: null, lane: null }));
  groups.push({ id: onceItem.opening, kind: 'once', owner: 'the opening', keys: keyList(rules.openingKeys), register: null, lane: null });
  for (const g of list(raw.gates)) if (isStr(g.id)) groups.push({ id: onceItem.gate(g.id), kind: 'once', owner: g.id, keys: keyList(g.flavorKeys), register: null, lane: null });
  const endings = isObj(raw.endings) ? raw.endings : {};
  for (const m of list(endings.minors)) if (isStr(m.id)) groups.push({ id: onceItem.ending(m.id), kind: 'once', owner: m.id, keys: keyList(m.textKeys), register: null, lane: null });
  // The press: each paper's frenzy spillover, and its world pool.
  const press = isObj(raw.press) ? raw.press : {};
  for (const p of list(press.papers)) {
    if (!isStr(p.id)) continue;
    if (Array.isArray(p.spilloverKeys)) groups.push({ id: `spillover:${p.id}`, kind: 'spillover', owner: p.id, keys: keyList(p.spilloverKeys), register: null, lane: null });
    if (Array.isArray(p.fillerKeys)) groups.push({ id: `filler:${p.id}`, kind: 'filler', owner: p.id, keys: keyList(p.fillerKeys), register: null, lane: null });
    const world = list(p.world).map((s) => s.key).filter(isStr);
    if (world.length > 0) groups.push({ id: `world:${p.id}`, kind: 'world', owner: p.id, keys: world, register: null, lane: null });
  }
  // The managers (round 2b): each manager's lines per trigger, and the line of their month-end perk.
  const managers = isObj(raw.managers) ? raw.managers : {};
  for (const m of list(managers.managers)) {
    if (!isStr(m.id)) continue;
    const lines = isObj(m.lines) ? m.lines : {};
    for (const [lineKey, keys] of Object.entries(lines)) groups.push({ id: messageGroup(m.id, lineKey), kind: 'manager', owner: m.id, keys: keyList(keys), register: null, lane: null });
    const perk = isObj(m.perk) ? m.perk : {};
    if (perk.monthEnd !== undefined) groups.push({ id: monthEndGroup(m.id), kind: 'monthEnd', owner: m.id, keys: keyList(perk.monthEndKeys), register: null, lane: null });
  }
  return groups;
}

/**
 * Variants a group needs: two for a once-per-run item; for a world pool, as many stories as a run prints on
 * average, so a typical run never repeats one (every paper is readable every month); otherwise by how often
 * it is seen.
 */
export function groupNeeds(group: VariantGroup, appearances: Appearances | undefined): number {
  if (group.kind === 'once') return ONCE_VARIANTS_NEEDED;
  const perRun = appearances?.perRun[group.id] ?? 0;
  if (group.kind === 'world') return Math.max(ONCE_VARIANTS_NEEDED, Math.ceil(perRun));
  return variantsNeeded(perRun);
}

function checkVariants(v: Ctx, raw: RawContent, i18n: Obj, appearances: Appearances | undefined): void {
  const written = (key: string) => typeof i18n[key] === 'string' && i18n[key] !== '' && !String(i18n[key]).startsWith(PROSE_PLACEHOLDER);
  if (!appearances) v.warn('variants', 'sim/appearances.json', 'no appearance data: run npm run sim:variants (every group is held to at least 2)');
  for (const group of variantGroups(raw)) {
    const have = group.keys.filter(written).length;
    const need = groupNeeds(group, appearances);
    if (have >= need) continue;
    const seen = group.kind === 'once' ? 'shown once a run' : `seen ${(appearances?.perRun[group.id] ?? 0).toFixed(1)} times a run`;
    const what = group.kind === 'world' ? (have === 1 ? 'story' : 'stories') : have === 1 ? 'variant' : 'variants';
    v.warn('variants', group.id, `${have} ${what}, ${seen}: needs at least ${need}`);
  }
}

// ---------------------------------------------------------------------------
// Tier words (docs/writing/voice.md): a single word of at most 10 characters — the stat bar's cells are one
// equal width, and a phrase would not fit them.

const TIER_WORD = /^\S{1,10}$/;

function checkTierWords(v: Ctx, rules: Obj | null, i18n: Obj): void {
  const tiers = rules && isObj(rules.tiers) ? rules.tiers : {};
  for (const [stat, t] of Object.entries(tiers)) {
    const keys: unknown[] = isObj(t) && Array.isArray(t.nameKeys) ? t.nameKeys : [];
    keys.forEach((k, i) => {
      const word = isStr(k) ? i18n[k] : undefined;
      if (typeof word === 'string' && !word.startsWith(PROSE_PLACEHOLDER) && !TIER_WORD.test(word)) {
        v.error('tierWords', `${stat} tier ${i + 1}`, `${q(word)} must be one word of at most 10 characters`);
      }
    });
  }
}

export function validateContent(raw: RawContent, i18n?: unknown, appearances?: Appearances): ValidationResult {
  const v = new Ctx();
  const rules = checkRules(v, raw.rules);
  const cards = checkCards(v, raw.cards);
  const gates = checkGates(v, raw.gates);
  const endings = checkEndings(v, raw.endings, rules);
  const endingIds = new Set([...endings.majors, ...endings.minors].map((e) => e.id).filter(isStr));
  const awards = checkAwards(v, raw.awards, endingIds);
  checkReferences(v, rules, cards);
  checkPress(v, raw.press, rules, new Set(endings.majors.map((m) => m.id)));
  checkManagers(v, raw.managers, rules, raw.endings);
  const earliestAct = checkReachability(v, rules, cards);
  checkStructure(v, rules, cards, gates);
  checkBudget(v, cards, gates, endings);
  const i18nKeys = i18n === undefined ? 0 : checkI18n(v, i18n);
  if (isObj(i18n)) {
    checkProse(v, i18n, rules, cards, gates, endings, awards);
    checkVariants(v, raw, i18n, appearances);
    checkTierWords(v, rules, i18n);
  }
  return {
    issues: v.issues,
    earliestAct,
    counts: { cards: cards.length, gates: gates.length, majors: endings.majors.length, minors: endings.minors.length, awards: awards.length, i18nKeys },
  };
}

// ---------------------------------------------------------------------------
// The press (content/press.json, phase 2a): three papers, where each line prints, what they call the player.

const PRESS_FIELDS = ['papers', 'route', 'subjects', 'earlyLane', 'page', 'rival'];
const PAGE_FIELDS = ['slots', 'worldMin', 'loud', 'money', 'scandal', 'spillover', 'frenzyAt', 'spilloverFrom', 'overwhelmScandalFrom', 'overwhelmLaneFrom', 'filler'];

function checkPress(v: Ctx, raw: unknown, rules: Obj | null, majorIds: ReadonlySet<unknown>): void {
  const file = 'content/press.json';
  if (raw === undefined) return v.error('schema', file, 'is missing: the papers every line prints in');
  if (!isObj(raw)) return v.error('schema', file, 'must be an object: { papers, route, subjects, earlyLane }');
  v.fields(raw, PRESS_FIELDS, file);
  const papers = checkList(v, raw.papers, `${file} papers`, 'paper', (p, where) => {
    v.fields(p, ['id', 'mastheadKey', 'world', 'sagas', 'spilloverKeys', 'fillerKeys'], where);
    v.key(p.mastheadKey, `${where}.mastheadKey`);
    // Its world news: a pool of stories, each for any season or only its own.
    if (p.world !== undefined) {
      if (!Array.isArray(p.world) || p.world.length === 0) v.error('schema', `${where}.world`, 'must be a non-empty list of { key, act? }');
      else
        p.world.forEach((story, i) => {
          const at = `${where}.world[${i}]`;
          if (!isObj(story)) return v.error('schema', at, 'must be { key, act? }');
          v.fields(story, ['key', 'act'], at);
          v.key(story.key, `${at}.key`);
          v.int(story.act, `${at}.act`, [1, v.acts], { optional: true });
        });
    }
    if (p.spilloverKeys !== undefined) v.keys(p.spilloverKeys, `${where}.spilloverKeys`);
    // Its sagas (round 2b): the world's stories across the year, a beat per season.
    if (p.sagas !== undefined) {
      const ids = new Set<unknown>();
      if (!Array.isArray(p.sagas)) v.error('schema', `${where}.sagas`, 'must be a list of { id, beats }');
      else
        p.sagas.forEach((saga, i) => {
          const at = `${where}.sagas[${i}]`;
          if (!isObj(saga)) return v.error('schema', at, 'must be { id, beats }');
          v.fields(saga, ['id', 'beats'], at);
          if (v.id(saga.id, `${at}.id`)) {
            if (ids.has(saga.id)) v.error('schema', at, `duplicate saga id ${q(saga.id)}`);
            ids.add(saga.id);
          }
          if (!Array.isArray(saga.beats) || saga.beats.length !== v.acts) v.error('structure', `${at}.beats`, `must give one beat per season (${v.acts})`);
          else saga.beats.forEach((k, j) => v.key(k, `${at}.beats[${j}]`));
        });
    }
    if (p.fillerKeys !== undefined) v.keys(p.fillerKeys, `${where}.fillerKeys`);
  });
  const paperIds = new Set(papers.map((p) => p.id).filter(isStr));
  const paper = (x: unknown, where: string) => {
    if (!paperIds.has(x as string)) v.error('references', where, `no paper with id ${q(x)}`);
  };
  const lanes = [...v.lanes, NEUTRAL_LANE];
  const route = raw.route;
  if (!isObj(route)) v.error('schema', `${file} route`, 'must be { loud, money, scandal }');
  else {
    v.fields(route, ['loud', 'money', 'scandal'], `${file} route`);
    if (!isObj(route.loud)) v.error('schema', `${file} route.loud`, 'must map every lane to a paper');
    else {
      v.fields(route.loud, lanes, `${file} route.loud`);
      for (const lane of lanes) paper(route.loud[lane], `${file} route.loud.${lane}`);
    }
    paper(route.money, `${file} route.money`);
    paper(route.scandal, `${file} route.scandal`);
  }
  // A subject for every lane at every fame tier: the press always has a word for the player.
  const tiers = rules && isObj(rules.tiers) && isObj(rules.tiers.hype) && Array.isArray(rules.tiers.hype.nameKeys) ? rules.tiers.hype.nameKeys.length : 0;
  if (!isObj(raw.subjects)) v.error('schema', `${file} subjects`, 'must give each lane its subjects, one per hype tier');
  else {
    v.fields(raw.subjects, v.lanes, `${file} subjects`);
    for (const lane of v.lanes) {
      const list = raw.subjects[lane];
      const at = `${file} subjects.${lane}`;
      if (!Array.isArray(list)) v.error('schema', at, 'must list one subject key per hype tier');
      else {
        if (tiers > 0 && list.length !== tiers) v.error('structure', at, `has ${list.length} subjects for ${tiers} hype tiers`);
        list.forEach((k, i) => v.key(k, `${at}[${i}]`));
      }
    }
  }
  if (!v.lanes.includes(raw.earlyLane as string)) v.error('references', `${file} earlyLane`, `must be one of ${v.lanes.join(', ')}, got ${q(raw.earlyLane)}`);

  // The front page: its slots, and how prominent the player's lines may be at each fame tier.
  const prominence = (x: unknown, where: string) => {
    if (!(PROMINENCES as readonly unknown[]).includes(x)) v.error('schema', where, `must be one of ${PROMINENCES.join(', ')}, got ${q(x)}`);
  };
  const perTier = (x: unknown, where: string, each: (y: unknown, at: string) => void) => {
    if (!Array.isArray(x)) return v.error('schema', where, 'must list one value per hype tier');
    if (tiers > 0 && x.length !== tiers) v.error('structure', where, `has ${x.length} entries for ${tiers} hype tiers`);
    x.forEach((y, i) => each(y, `${where}[${i}]`));
  };
  const page = raw.page;
  if (page !== undefined) {
    const at = `${file} page`;
    if (!isObj(page)) v.error('schema', at, 'must be an object');
    else {
      v.fields(page, PAGE_FIELDS, at);
      const slots: unknown[] = Array.isArray(page.slots) ? page.slots : [];
      if (slots.length === 0) v.error('schema', `${at}.slots`, 'must list the page slots, most prominent first');
      slots.forEach((x, i) => prominence(x, `${at}.slots[${i}]`));
      perTier(page.worldMin, `${at}.worldMin`, (x, w) => v.int(x, w, [0, slots.length]));
      if (!isObj(page.loud)) v.error('schema', `${at}.loud`, 'must be { inLane, offLane }');
      else {
        v.fields(page.loud, ['inLane', 'offLane'], `${at}.loud`);
        perTier(page.loud.inLane, `${at}.loud.inLane`, prominence);
        perTier(page.loud.offLane, `${at}.loud.offLane`, prominence);
      }
      for (const f of ['money', 'spillover'] as const) prominence(page[f], `${at}.${f}`);
      perTier(page.scandal, `${at}.scandal`, prominence);
      v.int(page.frenzyAt, `${at}.frenzyAt`, [1, 100]);
      for (const f of ['spilloverFrom', 'overwhelmScandalFrom', 'overwhelmLaneFrom'] as const) v.int(page[f], `${at}.${f}`, [0, Math.max(tiers, 1)]);
      // Fame filler (round 2b): from which fame tiers, and how many stories the lane's paper is held to.
      if (page.filler !== undefined) {
        const f = page.filler;
        if (!isObj(f)) v.error('schema', `${at}.filler`, 'must be { laneFrom, laneBelow, fillLaneFrom, scandalPaperFrom }');
        else {
          v.fields(f, ['laneFrom', 'laneBelow', 'fillLaneFrom', 'scandalPaperFrom'], `${at}.filler`);
          for (const k of ['laneFrom', 'fillLaneFrom', 'scandalPaperFrom'] as const) v.int(f[k], `${at}.filler.${k}`, [0, Math.max(tiers, 1)]);
          v.int(f.laneBelow, `${at}.filler.laneBelow`, [1, Math.max(slots.length, 1)]);
          if (papers.every((p) => !Array.isArray(p.fillerKeys))) v.warn('structure', `${at}.filler`, 'no paper has fillerKeys: filler never prints');
        }
      }
    }
  }

  // The rival: one arc per run, a beat per season in a named paper, a closing line, the major she ends in.
  const rival = raw.rival;
  if (rival !== undefined) {
    const at = `${file} rival`;
    if (!isObj(rival)) v.error('schema', at, 'must be { arcs }');
    else {
      v.fields(rival, ['arcs'], at);
      checkList(v, rival.arcs, `${at} arcs`, 'arc', (arc, where) => {
        v.fields(arc, ['id', 'major', 'beats', 'endingKey'], where);
        if (!majorIds.has(arc.major)) v.error('references', `${where}.major`, `no major ending with id ${q(arc.major)}`);
        v.key(arc.endingKey, `${where}.endingKey`);
        if (!Array.isArray(arc.beats) || arc.beats.length !== v.acts) v.error('structure', `${where}.beats`, `must give one beat per season (${v.acts})`);
        else
          arc.beats.forEach((beat, i) => {
            const b = `${where}.beats[${i}]`;
            if (!isObj(beat)) return v.error('schema', b, 'must be { paper, key }');
            v.fields(beat, ['paper', 'key'], b);
            paper(beat.paper, `${b}.paper`);
            v.key(beat.key, `${b}.key`);
          });
      });
    }
  }
}

// ---------------------------------------------------------------------------
// The managers (content/managers.json, round 2b): the choice before month 1, each manager's perk — data the
// engine applies — and a line group per message trigger.

const MANAGERS_FIELDS = ['choice', 'managers', 'messages'];
const MANAGER_FIELDS = ['id', 'nameKey', 'roleKey', 'quoteKey', 'descriptionKey', 'tagKey', 'perk', 'sample', 'lines'];
const PERK_FIELDS = ['nameKey', 'effectKey', 'freeRerollsPerAct', 'freeRerollKey', 'monthEnd', 'monthEndKeys'];
const MESSAGES_FIELDS = ['perMonth', 'priority', 'highFrom', 'knownAxis', 'signedFlag', 'viralFlag', 'stuck'];

/** Every trigger line key content must write, for its majors and lanes (core/manager.ts). */
export function messageLineKeys(majorIds: readonly string[], lanes: readonly string[]): string[] {
  return MESSAGE_TRIGGERS.flatMap((t) =>
    t === 'frenzy' || t === 'first_scandal' ? [`${t}.low`, `${t}.high`] : t === 'checkin' ? majorIds.map((m) => `checkin.${m}`) : t === 'lane' ? lanes.map((l) => `lane.${l}`) : [t],
  );
}

function checkManagers(v: Ctx, raw: unknown, rules: Obj | null, endings: unknown): void {
  const file = 'content/managers.json';
  if (raw === undefined) return v.error('schema', file, 'is missing: the managers the player chooses from before month 1');
  if (!isObj(raw)) return v.error('schema', file, 'must be an object: { choice, managers, messages }');
  v.fields(raw, MANAGERS_FIELDS, file);
  const choice = raw.choice;
  if (!isObj(choice)) v.error('schema', `${file} choice`, 'must be { kickerKey, titleKey, subtitleKey, footerKey }');
  else {
    v.fields(choice, ['kickerKey', 'titleKey', 'subtitleKey', 'footerKey'], `${file} choice`);
    for (const f of ['kickerKey', 'titleKey', 'subtitleKey', 'footerKey'] as const) v.key(choice[f], `${file} choice.${f}`);
  }
  const ends = isObj(endings) ? endings : {};
  const majorIds = (Array.isArray(ends.majors) ? ends.majors : []).filter(isObj).map((m) => m.id).filter(isStr);
  const needed = messageLineKeys(majorIds, v.lanes);
  const managers = checkList(v, raw.managers, `${file} managers`, 'manager', (m, where) => {
    v.fields(m, MANAGER_FIELDS, where);
    for (const f of ['nameKey', 'roleKey', 'quoteKey', 'descriptionKey', 'tagKey'] as const) v.key(m[f], `${where}.${f}`);
    const sample = m.sample;
    if (!isObj(sample)) v.error('schema', `${where}.sample`, 'must be { labelKey, key }');
    else {
      v.fields(sample, ['labelKey', 'key'], `${where}.sample`);
      v.key(sample.labelKey, `${where}.sample.labelKey`);
      v.key(sample.key, `${where}.sample.key`);
    }
    // The perk: data the engine applies.
    const perk = m.perk;
    if (!isObj(perk)) v.error('schema', `${where}.perk`, 'must be { nameKey, effectKey, ... }');
    else {
      v.fields(perk, PERK_FIELDS, `${where}.perk`);
      v.key(perk.nameKey, `${where}.perk.nameKey`);
      v.key(perk.effectKey, `${where}.perk.effectKey`);
      const free = v.int(perk.freeRerollsPerAct, `${where}.perk.freeRerollsPerAct`, LIMIT.draftCount, { optional: true }) && (perk.freeRerollsPerAct as number) > 0;
      if (free) v.key(perk.freeRerollKey, `${where}.perk.freeRerollKey`);
      else if (perk.freeRerollKey !== undefined) v.error('structure', `${where}.perk.freeRerollKey`, 'labels a free reroll the perk does not give');
      if (perk.monthEnd !== undefined) {
        checkEffects(v, perk.monthEnd, `${where}.perk.monthEnd`, { kind: 'manager', id: String(m.id) });
        v.keys(perk.monthEndKeys, `${where}.perk.monthEndKeys`);
      } else if (perk.monthEndKeys !== undefined) v.error('structure', `${where}.perk.monthEndKeys`, 'lines for month-end effects the perk does not have');
      if (!free && perk.monthEnd === undefined) v.warn('structure', `${where}.perk`, 'does nothing: no free rerolls, no month-end effects');
    }
    // A line group for every trigger's case, and none for a case no trigger reads.
    if (!isObj(m.lines)) return v.error('schema', `${where}.lines`, 'must map each trigger line key to its variants');
    for (const [lineKey, keys] of Object.entries(m.lines)) {
      if (!needed.includes(lineKey)) v.error('references', `${where}.lines.${lineKey}`, `no trigger reads it (triggers: ${needed.join(', ')})`);
      else v.keys(keys, `${where}.lines.${lineKey}`);
    }
    for (const lineKey of needed) if (!Object.hasOwn(m.lines, lineKey)) v.warn('prose', `${where}.lines`, `no lines for ${lineKey}: that message would print its key`);
  });
  if (managers.length === 0) v.error('structure', `${file} managers`, 'needs at least one manager: the choice before month 1');

  const msg = raw.messages;
  const at = `${file} messages`;
  if (!isObj(msg)) return v.error('schema', at, `must be { ${MESSAGES_FIELDS.join(', ')} }`);
  v.fields(msg, MESSAGES_FIELDS, at);
  v.int(msg.perMonth, `${at}.perMonth`, LIMIT.count);
  const priority: unknown[] = Array.isArray(msg.priority) ? msg.priority : [];
  const known: readonly unknown[] = MESSAGE_TRIGGERS;
  if (priority.length !== MESSAGE_TRIGGERS.length || new Set(priority).size !== priority.length || !priority.every((t) => known.includes(t))) {
    v.error('schema', `${at}.priority`, `must list every trigger once, highest priority first: ${MESSAGE_TRIGGERS.join(', ')}`);
  }
  const tierCount = (stat: string): number => {
    const tiers = rules && isObj(rules.tiers) ? rules.tiers[stat] : undefined;
    return isObj(tiers) && Array.isArray(tiers.nameKeys) ? tiers.nameKeys.length : 1;
  };
  v.int(msg.highFrom, `${at}.highFrom`, [0, Math.max(0, tierCount('hype') - 1)]);
  const axisIds = (Array.isArray(ends.axes) ? ends.axes : []).filter(isObj).map((a) => a.id);
  if (!axisIds.includes(msg.knownAxis)) v.error('references', `${at}.knownAxis`, `no ending axis with id ${q(msg.knownAxis)}`);
  for (const f of ['signedFlag', 'viralFlag'] as const) {
    const flag = msg[f];
    if (!isStr(flag)) v.error('schema', `${at}.${f}`, 'must be a flag name');
    else if (!v.flagsSet.has(flag)) v.warn('structure', `${at}.${f}`, `no setFlag ever sets ${q(flag)}: the trigger never fires`);
  }
  const stuck = msg.stuck;
  if (!isObj(stuck)) v.error('schema', `${at}.stuck`, 'must be { heatTierFrom, months }');
  else {
    v.fields(stuck, ['heatTierFrom', 'months'], `${at}.stuck`);
    v.int(stuck.heatTierFrom, `${at}.stuck.heatTierFrom`, [0, Math.max(0, tierCount('heat') - 1)]);
    v.int(stuck.months, `${at}.stuck.months`, [1, v.totalTurns]);
  }
}

/** The content budget: a ceiling per kind (CONTENT_BUDGET), not a target. */
function checkBudget(v: Ctx, cards: readonly Obj[], gates: readonly Obj[], endings: { readonly majors: readonly Obj[]; readonly minors: readonly Obj[] }): void {
  const counts: Record<keyof typeof CONTENT_BUDGET, number> = {
    action: cards.filter((c) => c.kind === 'action').length,
    opportunity: cards.filter((c) => c.kind === 'opportunity').length,
    scandal: cards.filter((c) => c.kind === 'scandal').length,
    gate: gates.length,
    major: endings.majors.length,
    minor: endings.minors.length,
  };
  for (const [kind, ceiling] of Object.entries(CONTENT_BUDGET) as [keyof typeof CONTENT_BUDGET, number][]) {
    if (counts[kind] > ceiling) v.error('budget', `${kind} count`, `${counts[kind]} is over the budget of ${ceiling}: a ceiling, not a target`);
  }
}

// ---------------------------------------------------------------------------
// Code boundaries (CLAUDE.md §0): static scan of source text.

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function stripStrings(src: string): string {
  return src.replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g, '""');
}

function importsOf(src: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(/\bfrom\s*['"]([^'"]+)['"]|\bimport\s*\(?\s*['"]([^'"]+)['"]/g)) {
    const spec = m[1] ?? m[2];
    if (spec) out.push(spec);
  }
  return out;
}

// /ui computes no rule (docs/ui-plan.md §1): it asks /core. A heuristic backstop, not a proof — it
// catches the usual slip, comparing a game value in the UI, e.g. `state.resources.capital >= 4`.
const STATE_READ = String.raw`(?:\.resources\s*(?:\.\s*\w+|\[[^\]]*\])|\.slots\b|\bscandalCount\s*\([^)]*\)|\.(?:hype|craft|capital|heat|turn|act)\b)`;
const COMPARE = String.raw`(?:<=|>=|<(?![/=>\w])|(?<![=\-])>(?!=))`;
const UI_RULE = [new RegExp(`${STATE_READ}\\s*${COMPARE}`), new RegExp(`${COMPARE}\\s*[\\w.]*?${STATE_READ}`)];
const UI_HEAT_MATHS = /\b(?:effectiveHeatThreshold|heatThreshold|thresholdFloor|degradePerScandal)\b|\.vent\b/;

export function checkBoundaries(files: readonly { readonly path: string; readonly text: string }[]): Issue[] {
  const issues: Issue[] = [];
  const err = (where: string, message: string) => issues.push({ level: 'error', check: 'boundaries', where, message });
  for (const { path, text } of files) {
    const src = stripComments(text);
    if (/\bMath\s*\.\s*random\b/.test(stripStrings(src))) err(path, 'uses Math.random(); all randomness goes through core/rng.ts');
    for (const spec of importsOf(src)) {
      if (path.startsWith('core/')) {
        // /core: zero runtime dependencies, nothing from outside /core.
        if (!spec.startsWith('./')) err(path, `core may only import sibling core modules, found ${q(spec)}`);
      } else if (path.startsWith('sim/')) {
        if (/(^|\/)(ui|i18n)(\/|$)/.test(spec) || spec === 'react' || spec.startsWith('react-dom')) {
          err(path, `sim must not import /ui or /i18n, found ${q(spec)}`);
        }
      } else if (path.startsWith('ui/')) {
        if (/(^|\/)(sim|check)(\/|$)/.test(spec)) err(path, `ui must not import /sim or /check, found ${q(spec)}`);
      }
    }
    if (path.startsWith('ui/')) {
      for (const line of stripStrings(src).split('\n')) {
        if (UI_HEAT_MATHS.test(line)) err(path, `heat maths in /ui — ask /core (heatOutlook): ${line.trim()}`);
        if (UI_RULE.some((re) => re.test(line))) err(path, `compares a game value in /ui — rules live in /core (legalActions, playCheck, explainCondition, previews): ${line.trim()}`);
      }
    }
  }
  return issues;
}
