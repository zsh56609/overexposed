// Year-end awards (docs/ui-plan.md §13, decisions 16 and 20): a read-only query on a finished year — its
// final state and the run's event history — like heatOutlook. Never a GameEvent, never a GameState field:
// the stats awards need come from the history and the year's end. Unlike endings (first match wins), every
// award whose conditions hold is granted; a fallback only when no other award is, so every year ends with
// at least one. Ids and numbers only.

import { evaluate, inRange, scandalCount, type ConditionSubject } from './conditions.ts';
import { AWARD_ONLY_KEYS, YEAR_STAT_KEYS, type AwardDef, type Condition, type YearStatKey } from './content.ts';
import type { GameEvent } from './state.ts';

/** What only a whole year shows (YEAR_STAT_KEYS): read off its events and its final state. */
export type YearStats = Readonly<Record<YearStatKey, number>>;

/** `s`: the year's final state; `history`: every event of the run. */
export function yearStats(s: ConditionSubject, history: readonly GameEvent[]): YearStats {
  let peakScandals = 0;
  let bestMonthHype = 0;
  let previous = s.content.rules.startingResources.hype;
  for (const e of history) {
    if (e.type !== 'turnEnd') continue;
    peakScandals = Math.max(peakScandals, e.scandalCount);
    bestMonthHype = Math.max(bestMonthHype, e.resources.hype - previous);
    previous = e.resources.hype;
  }
  // A comeback is how far the year recovered, not an absolute low (docs/decisions.md): never negative.
  const scandalDrop = Math.max(0, peakScandals - scandalCount(s));
  return { peakScandals, scandalDrop, bestMonthHype };
}

const AWARD_ONLY: readonly string[] = AWARD_ONLY_KEYS;

/** Whether one (non-fallback) award's conditions hold for a finished year. */
export function awardHolds(award: AwardDef, s: ConditionSubject, endingId: string | null, stats: YearStats): boolean {
  const conditions = award.conditions ?? {};
  const base = Object.fromEntries(Object.entries(conditions).filter(([k]) => !AWARD_ONLY.includes(k))) as Condition;
  if (!evaluate(base, s)) return false;
  const { ending } = conditions;
  if (ending?.any && (endingId === null || !ending.any.includes(endingId))) return false;
  if (ending?.not && endingId !== null && ending.not.includes(endingId)) return false;
  for (const k of YEAR_STAT_KEYS) {
    const range = conditions[k];
    if (range && !inRange(stats[k], range)) return false;
  }
  return true;
}

/**
 * The awards a finished year earns, as ids in content order. `s` is the year's final state (its ending
 * resolved); `history` is every event of the run, the final action's included.
 */
export function yearAwards(s: ConditionSubject & { readonly endingId: string | null }, history: readonly GameEvent[]): string[] {
  const stats = yearStats(s, history);
  const won = s.content.awards.filter((a) => !a.fallback && awardHolds(a, s, s.endingId, stats)).map((a) => a.id);
  return won.length > 0 ? won : s.content.awards.filter((a) => a.fallback).map((a) => a.id);
}
