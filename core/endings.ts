// Endings, two levels (docs/design/content-expansion.md §1). The major is the year's end partitioned on
// the axes — fame and reputation — so every state has exactly one; the minor is the first of that major's
// minors whose year conditions hold, else its fallback. The goals board's marker and the reducer both
// resolve through endingIfYearEndedNow, so they cannot disagree. Read-only; ids and numbers only.

import { explainCondition, rangeValue, type ClauseReport, type ConditionSubject } from './conditions.ts';
import { getMinor, type AxisDef, type ContentIndex, type MajorDef, type Range } from './content.ts';
import { yearHolds, yearStats, type YearSubject } from './year.ts';

export interface EndingResult {
  readonly majorId: string;
  readonly minorId: string;
}

/** The state's side of an axis: `sides[1]` from `from` on, `sides[0]` below it. */
export function axisSide(axis: AxisDef, s: ConditionSubject): string {
  return rangeValue(axis.key, s) >= axis.from ? axis.sides[1] : axis.sides[0];
}

/** The major the year's end would fall in now. */
export function majorNow(s: ConditionSubject): MajorDef | undefined {
  return s.content.majors.find((m) => s.content.axes.every((axis) => m.on[axis.id] === axisSide(axis, s)));
}

/** The ending the year would resolve to if it ended now: its major, and the minor within it. */
export function endingIfYearEndedNow(s: YearSubject): EndingResult | null {
  const major = majorNow(s);
  if (!major) return null;
  const stats = yearStats(s);
  const minors = s.content.minorsByMajor[major.id] ?? [];
  const minor = minors.find((m) => !m.fallback && yearHolds(m.conditions, s, stats)) ?? minors.find((m) => m.fallback);
  return minor ? { majorId: major.id, minorId: minor.id } : null;
}

/** The major a minor belongs to. */
export function majorOf(content: ContentIndex, minorId: string): string | null {
  return getMinor(content, minorId)?.major ?? null;
}

/** A major's requirements as clauses (the goals board): its side of each axis as a range, live. */
export function majorRequirements(major: MajorDef, s: ConditionSubject): ClauseReport[] {
  return s.content.axes.flatMap((axis) => {
    const range: Range = major.on[axis.id] === axis.sides[1] ? { min: axis.from } : { max: axis.from - 1 };
    return explainCondition({ [axis.key]: range }, s);
  });
}
