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
  type GameEvent,
  type PlayBlocker,
  type Range,
  type ResourceKey,
} from '../core/index.ts';
import { t } from './i18n.ts';

const signedFormat = new Intl.NumberFormat('en', { signDisplay: 'exceptZero' });
/** "+3", "-2", "0". */
export const signed = (n: number): string => signedFormat.format(n);

export const cardName = (c: ContentIndex, id: string): string => t(getCard(c, id)?.nameKey ?? `card.${id}.name`);
export const cardText = (c: ContentIndex, id: string): string => t(getCard(c, id)?.textKey ?? `card.${id}.text`);
export const gateName = (c: ContentIndex, id: string): string => t(getGate(c, id)?.nameKey ?? `gate.${id}.name`);
export const seasonName = (c: ContentIndex, act: number): string => t(c.rules.actNameKeys[act - 1] ?? `act.${act}.name`);
export const resourceName = (k: ResourceKey): string => t(`ui.resource.${k}`);
export const flagName = (flag: string): string => t(`ui.flag.${flag}`);
export const zoneName = (zone: AddCardZone): string => t(`ui.zone.${zone}`);
export const tagName = (tag: string): string => t(`ui.tag.${tag}`);

const whatName = (key: string): string =>
  key === 'hype' || key === 'craft' || key === 'capital' || key === 'heat' ? resourceName(key) : t(`ui.what.${key}`);

/** A range as words: "Craft 18+", "Scandals 4 or fewer". `prefix` picks the clause (live) or cond (static) keys. */
function rangeText(prefix: 'ui.clause' | 'ui.cond', key: string, range: Range, value?: number): string {
  const vars = { what: whatName(key), min: range.min ?? '', max: range.max ?? '', value: value ?? '' };
  if (range.min !== undefined && range.max !== undefined) return t(`${prefix}.between`, vars);
  if (range.min !== undefined) return t(`${prefix}.min`, vars);
  return t(`${prefix}.max`, vars);
}

function flagsText(test: { readonly all?: readonly string[]; readonly any?: readonly string[]; readonly not?: readonly string[] }): string {
  const parts: string[] = [];
  if (test.all?.length) parts.push(t('ui.clause.flagsAll', { flags: test.all.map(flagName).join(', ') }));
  if (test.any?.length) parts.push(t('ui.clause.flagsAny', { flags: test.any.map(flagName).join(', ') }));
  if (test.not?.length) parts.push(t('ui.clause.flagsNot', { flags: test.not.map(flagName).join(', ') }));
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
export function conditionText(cond: Condition): string {
  return Object.entries(cond)
    .map(([key, v]) => (key === 'flags' ? flagsText(v as object) : rangeText('ui.cond', key, v as Range)))
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
      return t('ui.reason.slots', { cost: b.cost, slots: b.slots });
    case 'requires':
      return t('ui.reason.requires', { clauses: b.clauses.map(clauseText).join('; ') });
  }
}

export function effectText(c: ContentIndex, e: Effect): string {
  switch (e.op) {
    case 'resource':
      return t('ui.effect.resource', { delta: signed(e.value), resource: resourceName(e.target) });
    case 'draw':
      return t('ui.effect.draw', { count: e.count });
    case 'addCard':
      return t('ui.effect.addCard', { count: e.count ?? 1, card: cardName(c, e.cardId), zone: zoneName(e.to) });
    case 'exhaustTag':
      return t('ui.effect.exhaustTag', { count: e.count ?? 1, tag: tagName(e.tag) });
    case 'slots':
      return t('ui.effect.slots', { delta: signed(e.value) });
    case 'setFlag':
      return t('ui.effect.setFlag', { flag: flagName(e.flag) });
    case 'conditional': {
      const vars = { cond: conditionText(e.if), then: effectsText(c, e.then), else: effectsText(c, e.else ?? []) };
      return t(e.else?.length ? 'ui.effect.conditionalElse' : 'ui.effect.conditional', vars);
    }
  }
}

export const effectsText = (c: ContentIndex, effects: readonly Effect[]): string =>
  effects.length ? effects.map((e) => effectText(c, e)).join(', ') : t('ui.effect.none');

/** One headline per GameEvent (docs/ui-plan.md §3). Layer 1: a plain line of text. */
export function eventText(c: ContentIndex, e: GameEvent): string {
  switch (e.type) {
    case 'turnStart':
      return t('ui.event.turnStart', { season: seasonName(c, e.act), turn: e.turn });
    case 'shuffle':
      return t('ui.event.shuffle', { count: e.count });
    case 'draw':
      return t('ui.event.draw', { card: cardName(c, e.cardId) });
    case 'play':
      return t('ui.event.play', { card: cardName(c, e.cardId) });
    case 'resource':
      return t('ui.event.resource', { resource: resourceName(e.target), delta: signed(e.delta), value: e.value });
    case 'slots':
      return t('ui.event.slots', { delta: signed(e.delta), value: e.value });
    case 'flag':
      return t('ui.event.flag', { flag: flagName(e.flag) });
    case 'addCard':
      return t('ui.event.addCard', { card: cardName(c, e.cardId), zone: zoneName(e.to) });
    case 'exhaust':
      return t('ui.event.exhaust', { card: cardName(c, e.cardId) });
    case 'scandal':
      return e.cause === null
        ? t('ui.event.scandalUnblamed', { card: cardName(c, e.cardId) })
        : t('ui.event.scandal', { card: cardName(c, e.cardId), cause: cardName(c, e.cause) });
    case 'turnEnd':
      return t('ui.event.turnEnd', { turn: e.turn, n: e.crystallised });
    case 'draftOffer':
      return t('ui.event.draftOffer', { cards: e.cardIds.map((id) => cardName(c, id)).join(' · ') });
    case 'draftPick':
      return t('ui.event.draftPick', { card: cardName(c, e.cardId) });
    case 'draftExtraPick':
      return t('ui.event.draftExtraPick', { cost: e.cost });
    case 'draftReroll':
      return t('ui.event.draftReroll', { cost: e.cost });
    case 'gateOffer':
      return t('ui.event.gateOffer', { season: seasonName(c, c.gates[e.gateIds[0] ?? '']?.act ?? 1) });
    case 'gate':
      return t(e.passed ? 'ui.event.gatePass' : 'ui.event.gateFail', { gate: gateName(c, e.gateId) });
    case 'ending':
      return t('ui.event.ending');
    case 'warning':
      return t('ui.event.warning', { code: e.code, ref: e.ref });
  }
}
