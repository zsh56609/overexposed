// Year-end awards (docs/ui-plan.md §13, decisions 16 and 20): a read-only query on a finished year — its
// final state and the run's event history — like heatOutlook. Never a GameEvent, never a GameState field:
// the two stats awards need come from the history. Unlike endings (first match wins), every award whose
// conditions hold is granted; a fallback only when no other award is, so every year ends with at least one.
// Ids and numbers only.

import { evaluate, inRange, type ConditionSubject } from './conditions.ts';
import type { AwardDef, Condition } from './content.ts';
import type { GameEvent } from './state.ts';

/** What only a whole year shows, read off its events. */
export interface YearStats {
  /** The most scandals held at any month end. */
  readonly peakScandals: number;
  /** The biggest hype gain from one month end to the next (the first month counts from the starting hype). */
  readonly bestMonthHype: number;
}

export function yearStats(history: readonly GameEvent[], startingHype: number): YearStats {
  let peakScandals = 0;
  let bestMonthHype = 0;
  let previous = startingHype;
  for (const e of history) {
    if (e.type !== 'turnEnd') continue;
    peakScandals = Math.max(peakScandals, e.scandalCount);
    bestMonthHype = Math.max(bestMonthHype, e.resources.hype - previous);
    previous = e.resources.hype;
  }
  return { peakScandals, bestMonthHype };
}

/** Whether one (non-fallback) award's conditions hold for a finished year. */
export function awardHolds(award: AwardDef, s: ConditionSubject, endingId: string | null, stats: YearStats): boolean {
  const { ending, peakScandals, bestMonthHype, ...rest } = award.conditions ?? {};
  const base: Condition = rest;
  if (!evaluate(base, s)) return false;
  if (ending?.any && (endingId === null || !ending.any.includes(endingId))) return false;
  if (ending?.not && endingId !== null && ending.not.includes(endingId)) return false;
  if (peakScandals && !inRange(stats.peakScandals, peakScandals)) return false;
  if (bestMonthHype && !inRange(stats.bestMonthHype, bestMonthHype)) return false;
  return true;
}

/**
 * The awards a finished year earns, as ids in content order. `s` is the year's final state (its ending
 * resolved); `history` is every event of the run, the final action's included.
 */
export function yearAwards(s: ConditionSubject & { readonly endingId: string | null }, history: readonly GameEvent[]): string[] {
  const stats = yearStats(history, s.content.rules.startingResources.hype);
  const won = s.content.awards.filter((a) => !a.fallback && awardHolds(a, s, s.endingId, stats)).map((a) => a.id);
  return won.length > 0 ? won : s.content.awards.filter((a) => a.fallback).map((a) => a.id);
}
