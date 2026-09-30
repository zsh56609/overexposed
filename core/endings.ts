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

/**
 * A goals-board clause: a requirement with its verdict — or, for a side its axis leaves unlisted, `state`:
 * the side the player is actually on, shown only when the unlisted side fails ("Already known"). On a stat
 * with tiers, `tierKey` names the tier the split sits on (round 2c: "Known · 80+").
 */
export type MajorClause = ClauseReport & { readonly state?: string; readonly tierKey?: string };

/** The tier whose lowest value is `from`, on a stat with value tiers (the fame split sits on one: validate). */
function tierAt(s: ConditionSubject, key: string, from: number | undefined): string | undefined {
  const t = key === 'hype' || key === 'craft' ? s.content.rules.tiers?.[key] : undefined;
  const i = from === undefined ? -1 : (t?.from.indexOf(from) ?? -1);
  return i === -1 ? undefined : t?.nameKeys[i];
}

/**
 * A major's requirements as clauses (the goals board): its side of each axis as a range, live. A side its
 * axis marks unlisted is not listed as a goal — the tier word and the goal line carry it — but when it fails
 * it shows, as the state the player is in, so no major looks achieved from the other side of the axis.
 * `all`: every side as a plain requirement.
 */
export function majorRequirements(major: MajorDef, s: ConditionSubject, all = false): MajorClause[] {
  return s.content.axes.flatMap((axis): MajorClause[] => {
    const side = major.on[axis.id];
    const range: Range = side === axis.sides[1] ? { min: axis.from } : { max: axis.from - 1 };
    const clauses = explainCondition({ [axis.key]: range }, s).map((c): MajorClause => {
      const tierKey = 'range' in c ? tierAt(s, c.key, c.range.min) : undefined;
      return tierKey ? { ...c, tierKey } : c;
    });
    if (all || side === undefined || !axis.unlisted?.includes(side)) return clauses;
    const actual = axisSide(axis, s);
    return clauses.filter((c) => !c.met).map((c) => ({ ...c, state: actual }));
  });
}
