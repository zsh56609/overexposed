// The press (docs/design/content-expansion.md §3.1, phase 2a): which paper prints each of the player's lines,
// and what the papers call the player when it prints. Papers print the public acts; the notebook keeps the
// private work. Read-only; ids, keys and numbers only — /ui renders the words.

import { getCard, type ContentIndex } from './content.ts';
import { establishedLane } from './lanes.ts';
import { readLines, type HistoryStep, type PrintedLine } from './lines.ts';
import type { GameEvent, GameState } from './state.ts';

/**
 * The paper a card's line prints in, by register first: a LOUD card's lane picks the paper; Money prints in
 * the business pages of its paper; every scandal prints in its own paper, whatever the lane. A quiet card
 * prints in no paper (null): private work is the player's notebook, which the mass press never sees.
 */
export function paperOf(c: ContentIndex, cardId: string): string | null {
  const press = c.press;
  const card = getCard(c, cardId);
  if (!press || !card) return null;
  if (card.kind === 'scandal') return press.route.scandal;
  if (card.register === 'money') return press.route.money;
  if (card.register === 'loud') return press.route.loud[card.lane ?? ''] ?? null;
  return null;
}

/** The hype tier a value sits in (0 = lowest), from rules.tiers.hype: the fame tier the press reads. */
export function fameTier(c: ContentIndex, hype: number): number {
  let index = 0;
  (c.rules.tiers?.hype?.from ?? []).forEach((min, i) => {
    if (hype >= min) index = i;
  });
  return index;
}

/**
 * The noun the press uses for the player (press.subjects): by fame tier and the established lane — the
 * early column while none is. Null when content gives none.
 */
export function pressSubject(c: ContentIndex, tier: number, lane: string | null): string | null {
  const press = c.press;
  if (!press) return null;
  const column = press.subjects[lane ?? press.earlyLane] ?? press.subjects[press.earlyLane] ?? [];
  return column[Math.min(tier, column.length - 1)] ?? null;
}

/** Where a line's world stands at the moment it prints: the fame the press sees and the established lane. */
export interface PrintContext {
  readonly hype: number;
  readonly lane: string | null;
}

/**
 * When a step's lines print: once its action has resolved. A month end prints at the turn's end — before
 * the next month's draw can move anything — so its lines read the turnEnd's resources.
 */
export function printContext(after: GameState, events: readonly GameEvent[]): PrintContext {
  const end = events.find((e) => e.type === 'turnEnd');
  return { hype: end?.type === 'turnEnd' ? end.resources.hype : after.resources.hype, lane: establishedLane(after) };
}

/** A printed line with its press: the paper (null: the notebook), the fame and lane it printed at, the subject. */
export interface PressLine extends PrintedLine {
  readonly paper: string | null;
  readonly fameTier: number;
  readonly lane: string | null;
  readonly subjectKey: string | null;
}

/** A line's press, from the moment it prints. */
export function pressOf(c: ContentIndex, cardId: string, at: PrintContext): Pick<PressLine, 'paper' | 'fameTier' | 'lane' | 'subjectKey'> {
  const tier = fameTier(c, at.hype);
  return { paper: paperOf(c, cardId), fameTier: tier, lane: at.lane, subjectKey: pressSubject(c, tier, at.lane) };
}

/** Every line the run has printed, with its variant and its press. */
export function pressLines(history: readonly HistoryStep[]): PressLine[] {
  const contexts = new Map<number, PrintContext>();
  return readLines(history).printed.map((line) => {
    const step = history[line.step] as HistoryStep;
    let at = contexts.get(line.step);
    if (!at) contexts.set(line.step, (at = printContext(step.after, step.events)));
    return { ...line, ...pressOf(step.after.content, line.cardId, at) };
  });
}
