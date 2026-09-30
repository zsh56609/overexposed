// Words for what /core returns: ids and numbers in, display strings out, all through i18n keys.
// Nothing here decides anything — a clause arrives already marked met or unmet by /core.

import {
  getCard,
  getGate,
  type AddCardZone,
  type ClauseReport,
  type Condition,
  type ContentIndex,
  type Effect,
  type PlayBlocker,
  type Range,
  type Register,
  type ResourceKey,
} from '../core/index.ts';
import { t, tp } from './i18n.ts';
import { playHeadlineKey } from './preview.ts';

const signedFormat = new Intl.NumberFormat('en', { signDisplay: 'exceptZero' });
/** "+3", "-2", "0". */
export const signed = (n: number): string => signedFormat.format(n);

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

export const gateFlavor = (c: ContentIndex, id: string): string => t(getGate(c, id)?.flavorKey ?? `gate.${id}.flavor`);
export const seasonOpener = (c: ContentIndex, act: number): string => t(c.rules.actOpenerKeys?.[act - 1] ?? `act.${act}.opener`);
export const endingName = (c: ContentIndex, id: string): string => t(c.endings.find((e) => e.id === id)?.nameKey ?? `ending.${id}.name`);
export const endingGoal = (c: ContentIndex, id: string): string => t(c.endings.find((e) => e.id === id)?.goalKey ?? `ending.${id}.goal`);
export const endingText = (c: ContentIndex, id: string): string => t(c.endings.find((e) => e.id === id)?.textKey ?? `ending.${id}.text`);
export const awardName = (c: ContentIndex, id: string): string => t(c.awards.find((a) => a.id === id)?.nameKey ?? `award.${id}.name`);
export const awardCitation = (c: ContentIndex, id: string): string => t(c.awards.find((a) => a.id === id)?.citationKey ?? `award.${id}.citation`);
/** The headline a scandal prints when it crystallises. */
export const scandalHeadline = (c: ContentIndex, id: string): string => t(getCard(c, id)?.headlineKey ?? `card.${id}.headline`);

/**
 * The feed headline for a card played. The variant is a pure hash of the run seed, the month and the card
 * instance — never the game RNG, so prose can't move a sim result or break a replay (decision 15).
 */
export function playHeadline(c: ContentIndex, seed: number, turn: number, uid: number, cardId: string): { text: string; register: Register | null } {
  const key = playHeadlineKey(c, seed, turn, uid, cardId);
  const register = getCard(c, cardId)?.register ?? null;
  return { text: key === null ? t('ui.feed.noHeadline', { card: cardName(c, cardId) }) : t(key), register };
}

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
  const vars = { what: whatName(key), min: range.min ?? '', max: range.max ?? '', value: value ?? '' };
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
      return t('ui.effect.resource', { delta: signed(e.value), resource: resourceName(e.target) });
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
