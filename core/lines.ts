// The lines a run has printed (docs/ui-plan.md §13, decision 15, revised in phase 2a): which line group each
// belongs to, how many times that group had been shown before it, and so which variant it shows. Read from
// the run's history — the steps the UI played, or the sim's trace — never from the game RNG, so the preview
// and the feed count the same way and the preview shows exactly what will print. Ids, keys and numbers only.

import { CoreError, getCard, type ContentIndex } from './content.ts';
import type { GameEvent, GameState } from './state.ts';
import { bagKey } from './variants.ts';

/** One reducer step as history keeps it: the state it applied to (null for the run's opening), its events, its result. */
export interface HistoryStep {
  readonly before: GameState | null;
  readonly after: GameState;
  readonly events: readonly GameEvent[];
}

// Line groups: a card's headlines, a scandal's crystallisation headlines, a scandal's in-hand lines.
export const playGroup = (cardId: string): string => `card:${cardId}`;
export const scandalGroup = (cardId: string): string => `scandal:${cardId}`;
export const inHandGroup = (cardId: string): string => `inhand:${cardId}`;

/** One showing of a line group: the group, how many times it was shown before, the variant's key. */
export interface LineShow {
  readonly group: string;
  readonly show: number;
  /** Null when the group has no variants (a content gap validate reports). */
  readonly key: string | null;
}

export type LineKind = 'play' | 'scandal' | 'inHand';

/** A showing an event causes: a card's headline, a scandal's headline, or a scandal's in-hand line. */
export interface TakenLine {
  readonly kind: LineKind;
  readonly line: LineShow;
}

/**
 * Counts showings per line group as a run goes on. The feed's walk through history, the preview's
 * hypothetical and the sim all advance one of these, so the same history always gives the same lines.
 */
export class LineCounter {
  readonly content: ContentIndex;
  readonly seed: number;
  private readonly counts: Map<string, number>;

  constructor(content: ContentIndex, seed: number, counts: ReadonlyMap<string, number> = new Map()) {
    this.content = content;
    this.seed = seed;
    this.counts = new Map(counts);
  }

  /** How many times a group has been shown so far. */
  shown(group: string): number {
    return this.counts.get(group) ?? 0;
  }

  /** Every group's count so far. */
  snapshot(): ReadonlyMap<string, number> {
    return new Map(this.counts);
  }

  /** Another counter from here on, leaving this one as it is (a preview's hypothetical). */
  fork(): LineCounter {
    return new LineCounter(this.content, this.seed, this.counts);
  }

  /** The next showing of a group with these variants. */
  next(group: string, keys: readonly string[] | undefined): LineShow {
    const n = this.shown(group);
    this.counts.set(group, n + 1);
    return { group, show: n, key: bagKey(keys, this.seed, group, n) };
  }

  /** A card played: its headline. */
  play(cardId: string): LineShow {
    return this.next(playGroup(cardId), getCard(this.content, cardId)?.headlineKeys);
  }

  /** A scandal card joining the deck (crystallised, or copied by a card): its headline. */
  scandal(cardId: string): LineShow {
    return this.next(scandalGroup(cardId), getCard(this.content, cardId)?.headlineKeys);
  }

  /** A scandal card entering the hand: the line it shows while it sits there. */
  inHand(cardId: string): LineShow {
    return this.next(inHandGroup(cardId), getCard(this.content, cardId)?.inHandKeys);
  }

  /** Advance over one event: the showings it causes, in order. */
  take(e: GameEvent): TakenLine[] {
    const isScandal = (id: string) => getCard(this.content, id)?.kind === 'scandal';
    if (e.type === 'play') return [{ kind: 'play', line: this.play(e.cardId) }];
    if (e.type === 'draw' && isScandal(e.cardId)) return [{ kind: 'inHand', line: this.inHand(e.cardId) }];
    if (e.type === 'addCard' && isScandal(e.cardId)) {
      const taken: TakenLine[] = [{ kind: 'scandal', line: this.scandal(e.cardId) }];
      // A scandal added straight to the hand shows its in-hand line too.
      if (e.to === 'hand') taken.push({ kind: 'inHand', line: this.inHand(e.cardId) });
      return taken;
    }
    return [];
  }
}

/** A line printed for the player, where it sits in history. */
export interface PrintedLine extends LineShow {
  readonly kind: 'play' | 'scandal';
  /** Index of its step in history, and of its event in the step. */
  readonly step: number;
  readonly event: number;
  readonly uid: number;
  readonly cardId: string;
}

export interface RunLines {
  /** Every line printed so far, in history order. */
  readonly printed: readonly PrintedLine[];
  /** The in-hand line of each scandal instance, from the last time it entered the hand. */
  readonly inHand: ReadonlyMap<number, LineShow>;
  /** The counter after the whole history: the next showing of any group follows from it. */
  readonly counter: LineCounter;
}

/** Read a run's history: every printed line with its variant, and each scandal's current in-hand line. */
export function readLines(history: readonly HistoryStep[]): RunLines {
  const first = history[0]?.after;
  if (!first) throw new CoreError('emptyHistory', 'readLines');
  const counter = new LineCounter(first.content, first.seed);
  const printed: PrintedLine[] = [];
  const inHand = new Map<number, LineShow>();
  history.forEach((step, i) => {
    step.events.forEach((e, j) => {
      if (e.type !== 'play' && e.type !== 'draw' && e.type !== 'addCard') return;
      for (const taken of counter.take(e)) {
        if (taken.kind === 'inHand') inHand.set(e.uid, taken.line);
        else printed.push({ ...taken.line, kind: taken.kind, step: i, event: j, uid: e.uid, cardId: e.cardId });
      }
    });
  });
  return { printed, inHand, counter };
}
