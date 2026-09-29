// Content validation (CLAUDE.md §4). Pure: takes parsed JSON, returns issues. No Node APIs,
// so the UI can run the same checks on load in dev later.
//
// The §4 checks: unknown effect ops · references to nonexistent ids · missing i18n keys ·
// cards unreachable in any act · missing priority-0 fallback ending · numeric ranges.
// Supporting checks: schema shape, run structure, and the §0 code boundaries (see checkBoundaries).

import {
  ADD_CARD_ZONES,
  CARD_KINDS,
  CONDITION_RANGE_KEYS,
  EFFECT_FIELDS,
  EFFECT_OPS,
  FLAG_TEST_KEYS,
  isEffectOp,
  RESOURCE_KEYS,
} from '../core/index.ts';

export const CHECKS = {
  unknownOp: 'unknown effect ops',
  references: 'references to card / gate / ending ids',
  i18n: 'missing i18n keys',
  reachability: 'cards unreachable in any act',
  fallback: 'priority-0 fallback ending',
  ranges: 'numeric ranges',
  schema: 'schema shape (fields, types, duplicates)',
  structure: 'run structure (gates per act, scandal pool, flags)',
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
}

export interface ValidationResult {
  readonly issues: readonly Issue[];
  /** Earliest act each card can enter a run; Infinity = never. */
  readonly earliestAct: Readonly<Record<string, number>>;
  readonly counts: { readonly cards: number; readonly gates: number; readonly endings: number; readonly i18nKeys: number };
}

type Obj = Readonly<Record<string, unknown>>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const ID = /^[a-z][a-z0-9_]*$/;
const q = (v: unknown) => JSON.stringify(v);

const CARD_FIELDS = ['id', 'kind', 'cost', 'nameKey', 'textKey', 'playable', 'tags', 'actMin', 'requires', 'effects', 'onDraw', 'onEndOfTurn'];
const GATE_FIELDS = ['id', 'act', 'nameKey', 'requires', 'onPass', 'onFail'];
const ENDING_FIELDS = ['id', 'priority', 'conditions', 'textKey'];
const RULES_FIELDS = ['acts', 'turnsPerAct', 'handSize', 'slotsPerTurn', 'gatesOffered', 'heatThreshold', 'heatVent', 'startingResources', 'startingDeck', 'draft'];
const DRAFT_FIELDS = ['offerSize', 'picks', 'extraPickCost', 'maxExtraPicks', 'rerollCost', 'maxRerolls'];

/** Hard numeric bounds. Values outside them are errors, not taste. */
const LIMIT = {
  cost: [0, 10],
  resourceDelta: [-100, 100],
  slotsDelta: [-10, 10],
  count: [1, 10],
  priority: [0, 100_000],
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

type Owner = { readonly kind: 'card'; readonly id: string } | { readonly kind: 'gate'; readonly id: string; readonly act: number };

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
  v.int(raw.handSize, 'rules.handSize', LIMIT.handSize);
  v.int(raw.slotsPerTurn, 'rules.slotsPerTurn', LIMIT.slotsPerTurn);
  v.int(raw.gatesOffered, 'rules.gatesOffered', LIMIT.count);
  v.int(raw.heatVent, 'rules.heatVent', LIMIT.heat);

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

  if (!isObj(raw.draft)) v.error('schema', 'rules.draft', 'must be an object: { offerSize, picks, extraPickCost, maxExtraPicks, rerollCost, maxRerolls }');
  else {
    v.fields(raw.draft, DRAFT_FIELDS, 'rules.draft');
    v.int(raw.draft.offerSize, 'rules.draft.offerSize', LIMIT.count);
    v.int(raw.draft.picks, 'rules.draft.picks', LIMIT.draftCount);
    v.int(raw.draft.maxExtraPicks, 'rules.draft.maxExtraPicks', LIMIT.draftCount);
    v.int(raw.draft.maxRerolls, 'rules.draft.maxRerolls', LIMIT.draftCount);
    v.int(raw.draft.extraPickCost, 'rules.draft.extraPickCost', LIMIT.price);
    v.int(raw.draft.rerollCost, 'rules.draft.rerollCost', LIMIT.price);
  }
  return raw;
}

const draftOn = (rules: Obj | null) => !!rules && isObj(rules.draft) && isInt(rules.draft.picks) && rules.draft.picks > 0;
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
    v.key(c.textKey, `${where}.textKey`);
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
    if (g.requires === undefined) v.error('schema', `${where}.requires`, 'gates need "requires"');
    else checkCondition(v, g.requires, `${where}.requires`);
    for (const field of ['onPass', 'onFail'] as const) {
      if (g[field] === undefined) v.error('schema', `${where}.${field}`, `gates need "${field}" (may be [])`);
      else checkEffects(v, g[field], `${where}.${field}`, owner);
    }
  });
}

function checkEndings(v: Ctx, raw: unknown): Obj[] {
  const endings = checkList(v, raw, 'content/endings.json', 'ending', (e, where) => {
    v.fields(e, ENDING_FIELDS, where);
    v.int(e.priority, `${where}.priority`, LIMIT.priority);
    if (e.conditions !== undefined) checkCondition(v, e.conditions, `${where}.conditions`);
    v.key(e.textKey, `${where}.textKey`);
  });

  const unconditional = (e: Obj) => e.conditions === undefined || (isObj(e.conditions) && Object.keys(e.conditions).length === 0);
  const fallbacks = endings.filter((e) => e.priority === 0);
  if (fallbacks.length === 0) {
    v.error('fallback', 'content/endings.json', 'missing the priority: 0 fallback ending; a run must always resolve');
  }
  for (const f of fallbacks) {
    if (!unconditional(f)) v.error('fallback', `ending ${String(f.id)}`, 'priority 0 is the unconditional fallback: remove its conditions');
  }
  if (fallbacks.length > 1) v.warn('fallback', 'content/endings.json', 'several priority-0 endings: only the first in file order can resolve');

  const byPriority = new Map<unknown, string>();
  for (const e of endings) {
    const prev = byPriority.get(e.priority);
    if (prev !== undefined) v.warn('structure', `ending ${String(e.id)}`, `shares priority ${String(e.priority)} with ${prev}: file order breaks the tie`);
    else byPriority.set(e.priority, String(e.id));
  }
  for (const u of endings.filter(unconditional)) {
    for (const e of endings) {
      if (isInt(e.priority) && isInt(u.priority) && e.priority < u.priority) {
        v.warn('structure', `ending ${String(e.id)}`, `can never resolve: shadowed by unconditional ending ${String(u.id)}`);
      }
    }
  }
  return endings;
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
      const from = ref.owner.kind === 'gate' ? ref.owner.act + 1 : (earliest[ref.owner.id] ?? Number.POSITIVE_INFINITY);
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
  for (let act = 1; act <= v.acts; act++) {
    const n = gates.filter((g) => g.act === act).length;
    if (n === 0) v.error('structure', `act ${act}`, 'has no gate');
    else if (n < gatesOffered) v.warn('structure', `act ${act}`, `has ${n} gate(s); ${gatesOffered} are offered per act`);

    const scandals = cards.filter((c) => c.kind === 'scandal' && actMinOf(c) <= act);
    if (scandals.length === 0) v.error('structure', `act ${act}`, 'no scandal card can crystallise from heat in this act');

    if (draftOn(rules) && rules && isObj(rules.draft)) {
      const pool = cards.filter((c) => c.kind !== 'scandal' && actMinOf(c) <= act).length;
      const offerSize = isInt(rules.draft.offerSize) ? rules.draft.offerSize : 0;
      if (pool === 0) v.error('structure', `act ${act}`, 'the draft pool is empty: no non-scandal card has actMin <= this act');
      else if (pool < offerSize) v.warn('structure', `act ${act}`, `draft pool has ${pool} card(s); offers are ${offerSize}`);
    }
  }
  for (const [flag, where] of v.flagsRead) {
    if (!v.flagsSet.has(flag)) v.warn('structure', where, `flag ${q(flag)} is read but no setFlag ever sets it`);
  }
  for (const [flag, where] of v.flagsSet) {
    if (!v.flagsRead.has(flag)) v.warn('structure', where, `flag ${q(flag)} is set but no condition reads it`);
  }
  const allTags = new Set(cards.flatMap((c) => (Array.isArray(c.tags) ? c.tags : [])));
  for (const [tag, where] of v.exhaustTags) {
    if (!allTags.has(tag)) v.warn('structure', where, `no card carries tag ${q(tag)}: exhausts nothing`);
  }
}

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
    if (/^(card|gate|ending)\./.test(key) && !v.keysUsed.has(key)) {
      v.warn('i18n', `i18n/en.json ${q(key)}`, 'no content uses this key');
    }
  }
  return Object.keys(i18n).length;
}

/** Validate parsed content. Pass i18n to check keys (the sim doesn't: it never touches /i18n). */
export function validateContent(raw: RawContent, i18n?: unknown): ValidationResult {
  const v = new Ctx();
  const rules = checkRules(v, raw.rules);
  const cards = checkCards(v, raw.cards);
  const gates = checkGates(v, raw.gates);
  const endings = checkEndings(v, raw.endings);
  checkReferences(v, rules, cards);
  const earliestAct = checkReachability(v, rules, cards);
  checkStructure(v, rules, cards, gates);
  const i18nKeys = i18n === undefined ? 0 : checkI18n(v, i18n);
  return { issues: v.issues, earliestAct, counts: { cards: cards.length, gates: gates.length, endings: endings.length, i18nKeys } };
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
      }
    }
  }
  return issues;
}
