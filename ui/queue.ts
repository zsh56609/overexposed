// The event feed as a queue (docs/ui-plan.md §7).
//
// Every action goes reducer → Step (new state + its events) → this queue. The UI reads the settled
// state and the played steps from here, never from the reducer directly. Layer 1 has no animation, so
// play() drains a step the moment it arrives. Layer 3 replaces play() with a timed player — one event at
// a time, skippable, a click fast-forwards via skip() — and nothing upstream changes.

import type { Action, GameEvent, GameState } from '../core/index.ts';

/** One reducer step: the action, the events it produced, the state it ended on. */
export interface Step {
  readonly action: Action | null;
  readonly state: GameState;
  readonly events: readonly GameEvent[];
}

/** A step as played. The feed groups its events per action (docs/ui-plan.md §13, decision 5). */
export interface PlayedStep {
  readonly id: number;
  readonly action: Action | null;
  /** The state the action applied to; null for the run's opening step. */
  readonly before: GameState | null;
  readonly after: GameState;
  readonly events: readonly GameEvent[];
}

export interface Snapshot {
  /** The state the player sees and acts on: every played step applied. */
  readonly state: GameState;
  /** Every played step, oldest first. */
  readonly steps: readonly PlayedStep[];
  /** True while events are still waiting to play (never in layer 1). */
  readonly busy: boolean;
}

export class EventQueue {
  private readonly pending: Step[] = [];
  private readonly listeners = new Set<() => void>();
  private steps: PlayedStep[] = [];
  private nextId = 1;
  private snapshot: Snapshot;

  constructor(first: Step) {
    this.snapshot = { state: first.state, steps: [], busy: false };
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
    const steps = [...this.steps];
    for (const step of this.pending.splice(0)) {
      steps.push({ id: this.nextId++, action: step.action, before: steps.length === 0 ? null : state, after: step.state, events: step.events });
      state = step.state;
    }
    this.steps = steps;
    this.snapshot = { state, steps, busy: false };
    for (const fn of this.listeners) fn();
  }

  readonly subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  readonly getSnapshot = (): Snapshot => this.snapshot;
}
