// The event feed as a queue (docs/ui-plan.md §7).
//
// Every action goes reducer → Step (new state + its events) → this queue. The UI reads the settled
// state and the feed from here, never from the reducer directly. Layer 1 has no animation, so play()
// drains a step the moment it arrives. Layer 3 replaces play() with a timed player — one event at a
// time, skippable, a click fast-forwards via skip() — and nothing upstream changes.

import type { Action, GameEvent, GameState } from '../core/index.ts';

/** One reducer step: the action, the events it produced, the state it ended on. */
export interface Step {
  readonly action: Action | null;
  readonly state: GameState;
  readonly events: readonly GameEvent[];
}

/** A played event, stamped with the season and month it happened in. */
export interface FeedItem {
  readonly id: number;
  readonly act: number;
  readonly turn: number;
  readonly event: GameEvent;
}

export interface Snapshot {
  /** The state the player sees and acts on: every played event applied. */
  readonly state: GameState;
  /** Every played event, oldest first. */
  readonly feed: readonly FeedItem[];
  /** True while events are still waiting to play (never in layer 1). */
  readonly busy: boolean;
}

export class EventQueue {
  private readonly pending: Step[] = [];
  private readonly listeners = new Set<() => void>();
  private feed: FeedItem[] = [];
  private nextId = 1;
  private act: number;
  private turn: number;
  private snapshot: Snapshot;

  constructor(first: Step) {
    this.act = first.state.act;
    this.turn = first.state.turn;
    this.snapshot = { state: first.state, feed: [], busy: false };
    this.enqueue(first);
  }

  /** The newest state, including steps not played yet: the one the next action applies to. */
  get latest(): GameState {
    return this.pending.at(-1)?.state ?? this.snapshot.state;
  }

  get busy(): boolean {
    return this.pending.length > 0;
  }

  enqueue(step: Step): void {
    this.pending.push(step);
    this.play();
  }

  /** Layer 1: play everything pending at once. */
  play(): void {
    this.drain();
  }

  /** Fast-forward: play everything pending now. Layer 3 calls this on click. */
  skip(): void {
    this.drain();
  }

  private drain(): void {
    if (this.pending.length === 0) return;
    let state = this.snapshot.state;
    const feed = [...this.feed];
    for (const step of this.pending.splice(0)) {
      for (const event of step.events) {
        if (event.type === 'turnStart') [this.act, this.turn] = [event.act, event.turn];
        feed.push({ id: this.nextId++, act: this.act, turn: this.turn, event });
      }
      state = step.state;
    }
    this.feed = feed;
    this.snapshot = { state, feed, busy: false };
    for (const fn of this.listeners) fn();
  }

  readonly subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  readonly getSnapshot = (): Snapshot => this.snapshot;
}
