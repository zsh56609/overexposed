// The stat bar's tiers (docs/ui-plan.md §13, decision 25): ambient state as words. A read-only query, like
// heatOutlook — the boundaries live in content (rules.tiers), /core picks the tier, /ui shows its word and
// never computes a boundary. Ids, keys and numbers only.

import { heatOutlook, type ConditionSubject } from './conditions.ts';
import type { ContentIndex, CountdownLevel, HeatTiers, ValueTiers } from './content.ts';

export const TIER_STATS = ['hype', 'heat', 'craft'] as const;
export type TierStat = (typeof TIER_STATS)[number];

export interface StatTier {
  /** 0 = the lowest tier. */
  readonly index: number;
  /** How many tiers the stat has. */
  readonly count: number;
  readonly nameKey: string;
}

const tier = (nameKeys: readonly string[], index: number): StatTier | null => {
  const nameKey = nameKeys[index];
  return nameKey === undefined ? null : { index, count: nameKeys.length, nameKey };
};

/** The last tier whose lowest value `value` reaches. */
function valueTier(t: ValueTiers, value: number): StatTier | null {
  let index = 0;
  t.from.forEach((min, i) => {
    if (value >= min) index = i;
  });
  return tier(t.nameKeys, index);
}

/**
 * Pressure, from the distance to the line (heatOutlook): below the first line, how many points still to
 * go; over it, how many lines are crossed. It describes pressure only and states no scandal count.
 */
function heatTier(t: HeatTiers, s: ConditionSubject): StatTier | null {
  const { scandalsIfTurnEndedNow: crossed, heatToNextScandal: toGo } = heatOutlook(s);
  if (crossed === 0) {
    const i = t.toGoAtLeast.findIndex((min) => toGo >= min);
    return tier(t.nameKeys, i === -1 ? t.toGoAtLeast.length : i);
  }
  let j = 0;
  t.linesCrossed.forEach((min, i) => {
    if (crossed >= min) j = i;
  });
  return tier(t.nameKeys, t.toGoAtLeast.length + 1 + j);
}

/**
 * A tier's tooltip line (round 2c), and the word for the set it speaks in: a lane's own set while that lane
 * is established (craft reads as acting on the screen lane), else the stat's own. `lane`: the established
 * lane (core/lanes.ts establishedLanes).
 */
export function tierTip(c: ContentIndex, stat: TierStat, index: number, lane: string | null): { readonly tipKey: string | null; readonly modeKey: string | null } {
  const t = c.rules.tiers?.[stat];
  if (!t) return { tipKey: null, modeKey: null };
  const own = 'laneTips' in t && lane !== null ? t.laneTips?.[lane] : undefined;
  const tipKeys = own?.tipKeys ?? t.tipKeys;
  return { tipKey: tipKeys?.[index] ?? null, modeKey: own?.modeKey ?? ('modeKey' in t ? (t.modeKey ?? null) : null) };
}

/** How loud the next-scandal countdown is now (round 2c): by the heat tier, as content maps it. */
export function countdownLevel(s: ConditionSubject): CountdownLevel {
  const t = s.content.rules.tiers?.heat;
  const tier = t ? heatTier(t, s) : null;
  return (tier && t?.countdown?.[tier.index]) ?? 'calm';
}

/** The fame band (rules.fameBands) a fame tier sits in: the last band whose `from` it reaches. */
export function fameBand(c: ContentIndex, tier: number): string | null {
  let band: string | null = null;
  for (const b of c.rules.fameBands ?? []) if (tier >= b.from) band = b.id;
  return band;
}

/** Each stat's tier as the state stands; null for a stat content gives no tiers. */
export function statTiers(s: ConditionSubject): Readonly<Record<TierStat, StatTier | null>> {
  const t = s.content.rules.tiers;
  return {
    hype: t?.hype ? valueTier(t.hype, s.resources.hype) : null,
    heat: t?.heat ? heatTier(t.heat, s) : null,
    craft: t?.craft ? valueTier(t.craft, s.resources.craft) : null,
  };
}
