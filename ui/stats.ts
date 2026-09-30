// The stat bar and its tooltips (round 2c; docs/design/visual/README.md §1): words for what /core reports.
// Every tier, value, countdown level and tooltip line comes from a /core query or from content — nothing
// here compares a game value. Pure and DOM-free, so check:preview holds each tooltip to its cell.

import { countdownLevel, heatLine, statTiers, tierTip, type CountdownLevel, type GameState } from '../core/index.ts';
import { t } from './i18n.ts';
import { heatText, money, resourceName } from './text.ts';

export type StatId = 'hype' | 'craft' | 'heat' | 'next' | 'money' | 'actions';

export interface StatCell {
  readonly id: StatId;
  readonly label: string;
  /** The tier word, for a stat with tiers. */
  readonly tier: string | null;
  /** What the cell shows beside it: the number, the countdown, the money, the action pips. */
  readonly value: string;
  /** The countdown's level (A4): plain, amber, red, crossed. */
  readonly level: CountdownLevel | null;
  /** The tooltip: a header with stat, tier and value — "Hype · Rising · 34" — then its line. */
  readonly tipHeader: string;
  readonly tipLine: string;
}

/**
 * The stat bar, in its order (A1): hype · craft · heat · next scandal · money · actions. `lane`: the
 * established lane (core/lanes.ts establishedLanes) — craft's lines speak of acting on the screen lane.
 */
export function statCells(s: GameState, lane: string | null): StatCell[] {
  const c = s.content;
  const tiers = statTiers(s);
  const line = (key: string | null | undefined) => (key ? t(key) : '');
  const tiered = (id: 'hype' | 'craft' | 'heat'): StatCell => {
    const tier = tiers[id];
    const label = resourceName(id);
    const word = tier ? t(tier.nameKey) : null;
    const value = String(s.resources[id]);
    const tip = tier ? tierTip(c, id, tier.index, lane) : { tipKey: null, modeKey: null };
    const tipHeader = tip.modeKey
      ? t('ui.tip.headerMode', { stat: label, mode: t(tip.modeKey), tier: word ?? '', value })
      : t('ui.tip.header', { stat: label, tier: word ?? '', value });
    return { id, label, tier: word, value, level: null, tipHeader, tipLine: line(tip.tipKey) };
  };
  const heat = heatLine(s);
  const next = t('ui.stat.next');
  const cash = money(s.resources.capital);
  const actions = t('ui.stat.slotsName');
  const slots = c.rules.slotsPerTurn;
  return [
    tiered('hype'),
    tiered('craft'),
    tiered('heat'),
    {
      id: 'next',
      label: next,
      tier: null,
      value: heatText(heat),
      level: countdownLevel(s),
      tipHeader: t(heat.crossed ? 'ui.tip.toNext' : 'ui.tip.toGo', { stat: next, n: heat.toNext }),
      tipLine: line(heat.crossed ? c.rules.statTips?.toNext : c.rules.statTips?.toGo),
    },
    { id: 'money', label: resourceName('capital'), tier: null, value: cash, level: null, tipHeader: t('ui.tip.headerPlain', { stat: resourceName('capital'), value: cash }), tipLine: line(c.rules.statTips?.capital) },
    {
      id: 'actions',
      label: actions,
      tier: null,
      value: t('ui.stat.slotOn').repeat(s.slots) + t('ui.stat.slotOff').repeat(Math.max(0, slots - s.slots)),
      level: null,
      tipHeader: t('ui.tip.actions', { stat: actions, n: s.slots }),
      tipLine: line(c.rules.statTips?.slots),
    },
  ];
}
