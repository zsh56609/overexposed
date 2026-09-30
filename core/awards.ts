// Year-end awards (docs/ui-plan.md §13, decisions 16 and 20): a read-only query on a finished year, like
// heatOutlook. Never a GameEvent: the stats awards need are kept in GameState.year and read through
// core/year.ts, shared with the minor endings. Unlike endings (first match wins), every award whose
// conditions hold is granted; a fallback only when no other award is, so every year ends with at least
// one. Ids and numbers only.

import { AWARD_ONLY_KEYS, type AwardDef } from './content.ts';
import { majorOf } from './endings.ts';
import { yearHolds, yearStats, type YearStats, type YearSubject } from './year.ts';

const AWARD_ONLY: readonly string[] = AWARD_ONLY_KEYS;

/**
 * Whether one (non-fallback) award's conditions hold for a finished year. `endingId` is the minor the year
 * resolved to; an award's `ending` test names minors or majors, and matches either.
 */
export function awardHolds(award: AwardDef, s: YearSubject, endingId: string | null, stats: YearStats = yearStats(s)): boolean {
  const conditions = award.conditions ?? {};
  if (!yearHolds(conditions, s, stats, AWARD_ONLY)) return false;
  const { ending } = conditions;
  if (ending) {
    const ids = endingId === null ? [] : [endingId, majorOf(s.content, endingId)].filter((id): id is string => id !== null);
    if (ending.any && !ending.any.some((id) => ids.includes(id))) return false;
    if (ending.not && ending.not.some((id) => ids.includes(id))) return false;
  }
  return true;
}

/** The awards a finished year earns, as ids in content order. `s` is the year's final state, its ending resolved. */
export function yearAwards(s: YearSubject & { readonly endingId: string | null }): string[] {
  const stats = yearStats(s);
  const won = s.content.awards.filter((a) => !a.fallback && awardHolds(a, s, s.endingId, stats)).map((a) => a.id);
  return won.length > 0 ? won : s.content.awards.filter((a) => a.fallback).map((a) => a.id);
}
