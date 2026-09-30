// What a year has shown (docs/design/content-expansion.md §1): the year stats kept at each month end, and
// the year conditions minor endings and awards are written in. Read-only; ids and numbers only.

import { evaluate, inRange, scandalCount, type ConditionSubject } from './conditions.ts';
import { YEAR_ONLY_KEYS, YEAR_STAT_KEYS, type Condition, type FlagTest, type YearConditions, type YearStatKey } from './content.ts';
import { currentLane } from './lanes.ts';
import type { YearRecord } from './state.ts';

/** GameState and the reducer's Draft both satisfy it. */
export interface YearSubject extends ConditionSubject {
  readonly careerPlays: Readonly<Record<string, number>>;
  readonly year: YearRecord;
}

export type YearStats = Readonly<Record<YearStatKey, number>>;

/** The year so far: peaks and the best month from the month ends, and how far scandals are below their peak now. */
export function yearStats(s: YearSubject): YearStats {
  return {
    peakScandals: s.year.peakScandals,
    // A comeback is how far the year recovered, not an absolute low: never negative.
    scandalDrop: Math.max(0, s.year.peakScandals - scandalCount(s)),
    bestMonthHype: s.year.bestMonthHype,
    peakHype: s.year.peakHype,
  };
}

const YEAR_ONLY: readonly string[] = YEAR_ONLY_KEYS;

/** The plain condition inside year conditions (and an award's `ending`, stripped by the caller's key list). */
export function baseCondition(c: object, strip: readonly string[] = YEAR_ONLY): Condition {
  return Object.fromEntries(Object.entries(c).filter(([k]) => !strip.includes(k))) as Condition;
}

function heldIds(s: ConditionSubject): ReadonlySet<string> {
  return new Set([...s.deck, ...s.hand, ...s.discard].map((c) => c.cardId));
}

function holdsTest(held: ReadonlySet<string>, t: FlagTest): boolean {
  if (t.all && !t.all.every((id) => held.has(id))) return false;
  if (t.any && !t.any.some((id) => held.has(id))) return false;
  if (t.not && t.not.some((id) => held.has(id))) return false;
  return true;
}

/** Whether year conditions hold. `strip`: extra keys the caller handles (an award's `ending`). */
export function yearHolds(c: YearConditions | undefined, s: YearSubject, stats: YearStats = yearStats(s), strip: readonly string[] = YEAR_ONLY): boolean {
  if (!c) return true;
  if (!evaluate(baseCondition(c, strip), s)) return false;
  if (c.lane) {
    const lane = currentLane(s);
    if (c.lane.any && (lane === null || !c.lane.any.includes(lane))) return false;
    if (c.lane.not && lane !== null && c.lane.not.includes(lane)) return false;
  }
  if (c.holds && !holdsTest(heldIds(s), c.holds)) return false;
  for (const k of YEAR_STAT_KEYS) {
    const range = c[k];
    if (range && !inRange(stats[k], range)) return false;
  }
  if (c.anyOf && !c.anyOf.some((alt) => yearHolds(alt, s, stats))) return false;
  return true;
}
