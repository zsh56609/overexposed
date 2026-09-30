// Words for what /core returns: ids and numbers in, display strings out, all through i18n keys.
// Nothing here decides anything — a clause arrives already marked met or unmet by /core.

import {
  getCard,
  getGate,
  getMajor,
  getMinor,
  onceItem,
  onceKey,
  type AddCardZone,
  type ClauseReport,
  type Condition,
  type ContentIndex,
  type Effect,
  type LineShow,
  type PlayBlocker,
  type Range,
  type ResourceKey,
} from '../core/index.ts';
import { t, tp } from './i18n.ts';

const signedFormat = new Intl.NumberFormat('en', { signDisplay: 'exceptZero' });
/** "+3", "-2", "0". */
export const signed = (n: number): string => signedFormat.format(n);

/**
 * Money as the player reads it (phase 2a): capital × £1,000 — capital 4 is "£4,000". Display only: every
 * value and rule stays in capital. A turn is a month, so the figures read true; money is for spending, not
 * status, so it has no tier word.
 */
const MONEY_UNIT = 1000;
const moneyFormat = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });
const signedMoneyFormat = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0, signDisplay: 'exceptZero' });
export const money = (capital: number): string => moneyFormat.format(capital * MONEY_UNIT);
export const signedMoney = (capital: number): string => signedMoneyFormat.format(capital * MONEY_UNIT);
/** An amount of a resource or condition key as the player reads it: money for capital, a number otherwise. */
export const amount = (key: string, n: number): string => (key === 'capital' ? money(n) : String(n));
export const signedAmount = (key: string, n: number): string => (key === 'capital' ? signedMoney(n) : signed(n));

export const cardName = (c: ContentIndex, id: string): string => t(getCard(c, id)?.nameKey ?? `card.${id}.name`);
/** A card's text: its rules, or for a scandal the line shown while it sits in hand. */
export const cardText = (c: ContentIndex, id: string): string => t(getCard(c, id)?.textKey ?? `card.${id}.text`);
export const gateName = (c: ContentIndex, id: string): string => t(getGate(c, id)?.nameKey ?? `gate.${id}.name`);
export const seasonName = (c: ContentIndex, act: number): string => t(c.rules.actNameKeys[act - 1] ?? `act.${act}.name`);
export const resourceName = (k: ResourceKey): string => t(`ui.resource.${k}`);
/** A flag's two labels (draft v3): what it reads as once set, and while it is not. Validate requires both. */
export const flagName = (flag: string): string => t(`flag.${flag}.positive`);
export const flagNegative = (flag: string): string => t(`flag.${flag}.negative`);
export const zoneName = (zone: AddCardZone): string => t(`ui.zone.${zone}`);
export const tagName = (tag: string): string => t(`ui.tag.${tag}`);

// ---------------------------------------------------------------------------
// Player-facing prose (docs/ui-plan.md §13, decision 15). The author controls every line; a value
// starting with the placeholder marker has not been written yet and is shown as such, never hidden.

const PLACEHOLDER = 'TODO(prose)';
export const isPlaceholder = (text: string): boolean => text.startsWith(PLACEHOLDER);

// Items shown once per run pick their variant by a hash of the run seed and the item's id (core/variants.ts),
// so different runs read differently.
export const gateFlavor = (c: ContentIndex, seed: number, id: string): string =>
  t(onceKey(getGate(c, id)?.flavorKeys, seed, onceItem.gate(id)) ?? `gate.${id}.flavor`);
export const seasonOpener = (c: ContentIndex, seed: number, act: number): string =>
  t(onceKey(c.rules.actOpenerKeys?.[act - 1], seed, onceItem.opener(act)) ?? `act.${act}.opener`);
/** The opening premise, for the run this seed starts. */
export const openingText = (c: { readonly rules: { readonly openingKeys?: readonly string[] } }, seed: number): string =>
  t(onceKey(c.rules.openingKeys, seed, onceItem.opening) ?? 'story.opening');
// Endings, two levels (docs/design/content-expansion.md §1): a major has a name and a goal line, a minor a
// name and its text.
export const majorName = (c: ContentIndex, id: string): string => t(getMajor(c, id)?.nameKey ?? `ending.${id}.name`);
export const majorGoal = (c: ContentIndex, id: string): string => t(getMajor(c, id)?.goalKey ?? `ending.${id}.goal`);
export const minorName = (c: ContentIndex, id: string): string => t(getMinor(c, id)?.nameKey ?? `ending.${id}.name`);
export const minorText = (c: ContentIndex, seed: number, id: string): string =>
  t(onceKey(getMinor(c, id)?.textKeys, seed, onceItem.ending(id)) ?? `ending.${id}.text`);
/** A year's ending in full: "The Breakthrough · Leading Role". */
export const endingPair = (c: ContentIndex, majorId: string, minorId: string): string =>
  t('ui.ending.pair', { major: majorName(c, majorId), minor: minorName(c, minorId) });
export const awardName = (c: ContentIndex, id: string): string => t(c.awards.find((a) => a.id === id)?.nameKey ?? `award.${id}.name`);
export const awardCitation = (c: ContentIndex, id: string): string => t(c.awards.find((a) => a.id === id)?.citationKey ?? `award.${id}.citation`);
/**
 * A line group's showing as words: the variant /core's shuffle bag picked from the run's history (decision 15,
 * revised) — the same in the preview and the feed. A group with no variants shows the card's name, loudly.
 */
export const lineText = (c: ContentIndex, show: LineShow | null | undefined, cardId: string): string =>
  show?.key ? t(show.key) : t('ui.feed.noHeadline', { card: cardName(c, cardId) });

// ---------------------------------------------------------------------------
// The heat display (decision 1): where heat sits against the line. It counts no scandals.

export const heatText = (line: { readonly toNext: number; readonly crossed: boolean }): string =>
  t(line.crossed ? 'ui.stat.crossed' : 'ui.stat.toGo', { n: line.toNext });

// ---------------------------------------------------------------------------
// Conditions and effects

const whatName = (key: string): string =>
  key === 'hype' || key === 'craft' || key === 'capital' || key === 'heat' ? resourceName(key) : t(`ui.what.${key}`);

/** A range as words: "Craft 18+", "Scandals 4 or fewer". `prefix` picks the clause (live) or cond (static) keys. */
function rangeText(prefix: 'ui.clause' | 'ui.cond', key: string, range: Range, value?: number): string {
  const shown = (n: number | undefined) => (n === undefined ? '' : amount(key, n));
  const vars = { what: whatName(key), min: shown(range.min), max: shown(range.max), value: shown(value) };
  if (range.min !== undefined && range.max !== undefined) return t(`${prefix}.between`, vars);
  if (range.min !== undefined) return t(`${prefix}.min`, vars);
  return t(`${prefix}.max`, vars);
}

/** A season window in words — "in Winter", "from Summer on" — since the player knows seasons, not act numbers. */
function actText(c: ContentIndex, range: Range): string {
  const last = c.rules.acts;
  const { min, max } = range;
  if (min !== undefined && (min === max || (max === undefined && min === last))) return t('ui.cond.actIn', { season: seasonName(c, min) });
  if (min !== undefined && max !== undefined) return t('ui.cond.actBetween', { from: seasonName(c, min), to: seasonName(c, max) });
  if (min !== undefined) return t('ui.cond.actFrom', { season: seasonName(c, min) });
  return t('ui.cond.actUntil', { season: seasonName(c, max ?? last) });
}

function flagsText(test: { readonly all?: readonly string[]; readonly any?: readonly string[]; readonly not?: readonly string[] }): string {
  const parts: string[] = [];
  if (test.all?.length) parts.push(t('ui.clause.flagsAll', { flags: test.all.map(flagName).join(', ') }));
  if (test.any?.length) parts.push(t('ui.clause.flagsAny', { flags: test.any.map(flagName).join(', ') }));
  // A negative requirement reads as each flag's own negative label (draft v3), never a general template.
  if (test.not?.length) parts.push(test.not.map(flagNegative).join(', '));
  return parts.join('; ');
}

/** A clause /core has already checked: its words, without the verdict mark. */
export function clauseText(clause: ClauseReport): string {
  if (clause.key === 'flags') return flagsText(clause.test);
  if (clause.key === 'unknown') return t('ui.clause.unknown', { name: clause.name });
  return rangeText('ui.clause', clause.key, clause.range, clause.value);
}

/** With the verdict mark /core gave it. */
export const clauseLine = (clause: ClauseReport): string =>
  t(clause.met ? 'ui.clause.met' : 'ui.clause.unmet', { text: clauseText(clause) });

/** A condition as static words (for conditional effects), no verdict. */
export function conditionText(c: ContentIndex, cond: Condition): string {
  return Object.entries(cond)
    .map(([key, v]) => (key === 'flags' ? flagsText(v as object) : key === 'act' ? actText(c, v as Range) : rangeText('ui.cond', key, v as Range)))
    .join(', ');
}

export function blockerText(b: PlayBlocker): string {
  switch (b.code) {
    case 'notPlayPhase':
      return t('ui.reason.notPlayPhase');
    case 'notInHand':
      return t('ui.reason.notInHand');
    case 'unplayable':
      return t('ui.reason.unplayable');
    case 'slots':
      return tp('ui.reason.slots', b.cost, { cost: b.cost, slots: b.slots });
    case 'requires':
      return t('ui.reason.requires', { clauses: b.clauses.map(clauseText).join('; ') });
  }
}

/** An effect in words. `self`: the card the effect belongs to, so a card adding a copy of itself says so. */
export function effectText(c: ContentIndex, e: Effect, self?: string): string {
  switch (e.op) {
    case 'resource':
      return t('ui.effect.resource', { delta: signedAmount(e.target, e.value), resource: resourceName(e.target) });
    case 'draw':
      return t('ui.effect.draw', { count: e.count });
    case 'addCard':
      if (e.cardId === self) return t('ui.effect.copySelf', { count: e.count ?? 1, zone: zoneName(e.to) });
      return t('ui.effect.addCard', { count: e.count ?? 1, card: cardName(c, e.cardId), zone: zoneName(e.to) });
    case 'exhaustTag':
      return tp('ui.effect.exhaustTag', e.count ?? 1, { count: e.count ?? 1, tag: tagName(e.tag) });
    case 'slots':
      return tp('ui.effect.slots', e.value, { delta: signed(e.value) });
    case 'setFlag':
      return t('ui.effect.setFlag', { flag: flagName(e.flag) });
    case 'conditional': {
      const vars = { cond: conditionText(c, e.if), then: effectsText(c, e.then, self), else: effectsText(c, e.else ?? [], self) };
      return t(e.else?.length ? 'ui.effect.conditionalElse' : 'ui.effect.conditional', vars);
    }
  }
}

export const effectsText = (c: ContentIndex, effects: readonly Effect[], self?: string): string =>
  effects.length ? effects.map((e) => effectText(c, e, self)).join(', ') : t('ui.effect.none');

/**
 * A card's rules, told by the interface from its effects — for a scandal, whose text is prose (its in-hand
 * line): what it does when drawn and at month end. Empty for a card with neither.
 */
export function cardRuleLines(c: ContentIndex, id: string): string[] {
  const card = getCard(c, id);
  const lines: string[] = [];
  if (card?.onDraw?.length) lines.push(t('ui.card.whenDrawn', { effects: effectsText(c, card.onDraw, id) }));
  if (card?.onEndOfTurn?.length) lines.push(t('ui.card.atMonthEnd', { effects: effectsText(c, card.onEndOfTurn, id) }));
  return lines;
}
