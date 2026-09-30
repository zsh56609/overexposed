// The year's calendar (round 2c): which month and year each month of play falls in, and where it sits in its
// season and in the year. A read-only query; numbers only — /ui names the months.

import type { ContentIndex } from './content.ts';

export interface CalendarDate {
  /** The calendar month, 1 (January) to 12. */
  readonly month: number;
  readonly year: number;
  /** The month of play (1-based), its season (act), and its place in the season: 1 to `seasonMonths`. */
  readonly turn: number;
  readonly act: number;
  readonly monthOfSeason: number;
  readonly seasonMonths: number;
  /** Months of play in the year, and how many are left after this one. */
  readonly months: number;
  readonly monthsLeft: number;
}

/** The date of a month of play: the calendar starts at `rules.calendar` (default: January of year 1). */
export function calendarDate(c: ContentIndex, turn: number): CalendarDate {
  const r = c.rules;
  const start = r.calendar ?? { startMonth: 1, startYear: 1 };
  const index = start.startMonth - 1 + (turn - 1);
  const months = r.acts * r.turnsPerAct;
  return {
    month: (index % 12) + 1,
    year: start.startYear + Math.floor(index / 12),
    turn,
    act: Math.ceil(turn / r.turnsPerAct),
    monthOfSeason: turn - (Math.ceil(turn / r.turnsPerAct) - 1) * r.turnsPerAct,
    seasonMonths: r.turnsPerAct,
    months,
    monthsLeft: months - turn,
  };
}
