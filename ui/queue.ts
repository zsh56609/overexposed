// GameEvents determine the timeline. Presentation never changes the reducer result.
import type { Action, GameEvent, GameState } from '../core/index.ts';
export interface Step { readonly action: Action | null; readonly state: GameState; readonly events: readonly GameEvent[] }
export interface PlayedStep { readonly id: number; readonly action: Action | null; readonly before: GameState | null; readonly after: GameState; readonly events: readonly GameEvent[] }
export type MotionMode = 'full' | 'reduced' | 'off';
export interface ActiveStep { readonly step: PlayedStep; readonly beat: 'lift' | 'land'; readonly mode: MotionMode }
export interface Snapshot { readonly state: GameState; readonly steps: readonly PlayedStep[]; readonly busy: boolean; readonly active: ActiveStep | null; readonly skipped: number }
export const CARD_TIMING = { lift: 200, carry: 290, land: 740, settle: 930 } as const;
export class EventQueue {
  private readonly pending: Step[] = [];
  private readonly listeners = new Set<() => void>();
  private nextId = 1;
  private snapshot: Snapshot;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private tailTimer: ReturnType<typeof setTimeout> | undefined;
  private tailUntil = 0;
  private readonly mode: () => MotionMode;
  constructor(first: Step, mode: () => MotionMode = () => 'off') {
    this.mode = mode;
    this.snapshot = { state: first.state, steps: [], busy: false, active: null, skipped: 0 }; this.enqueue(first);
  }
  get latest(): GameState { return this.pending.slice(-1)[0]?.state ?? this.snapshot.active?.step.after ?? this.snapshot.state; }
  get busy(): boolean { return this.snapshot.busy; }
  enqueue(step: Step): void { this.pending.push(step); this.play(); }
  play(): void {
    if (this.busy) return;
    const next = this.pending.shift(); if (!next) return;
    const step: PlayedStep = { id: this.nextId++, action: next.action, before: this.snapshot.steps.length ? this.snapshot.state : null, after: next.state, events: next.events };
    const mode = this.mode();
    // Part D supplies month-end beats next round. Other steps currently settle immediately.
    if (!step.events.some(e => e.type === 'play') || mode === 'off') { this.apply(step, null); this.play(); return; }
    this.snapshot = { ...this.snapshot, busy: true, active: { step, beat: 'lift', mode } }; this.emit();
    this.timers.push(setTimeout(() => this.apply(step, { step, beat: 'land', mode }), mode === 'reduced' ? 0 : CARD_TIMING.land));
    this.timers.push(setTimeout(() => { this.timers = []; this.snapshot = { ...this.snapshot, busy: this.tailTimer !== undefined, active: null }; this.emit(); this.play(); }, mode === 'reduced' ? 150 : CARD_TIMING.settle));
  }
  /** Presentation tails (printing, handwriting, deltas) still consume a skip click after the card lands. */
  readonly hold = (ms: number): void => {
    this.tailUntil = Math.max(this.tailUntil, Date.now() + ms);
    clearTimeout(this.tailTimer);
    this.tailTimer = setTimeout(() => {
      this.tailTimer = undefined; this.tailUntil = 0;
      if (!this.snapshot.active) { this.snapshot = { ...this.snapshot, busy: false }; this.emit(); this.play(); }
    }, Math.max(0, this.tailUntil - Date.now()));
    if (!this.busy) { this.snapshot = { ...this.snapshot, busy: true }; this.emit(); }
  };
  skip(): void {
    this.clearTimers(); const active = this.snapshot.active;
    this.snapshot = { ...this.snapshot, skipped: this.snapshot.skipped + 1 };
    if (active?.beat === 'lift') this.apply(active.step, null);
    else { this.snapshot = { ...this.snapshot, busy: false, active: null }; this.emit(); }
    for (const next of this.pending.splice(0)) this.apply({ id: this.nextId++, action: next.action, before: this.snapshot.state, after: next.state, events: next.events }, null);
  }
  dispose(): void { this.clearTimers(); this.listeners.clear(); }
  private clearTimers(): void { for (const timer of this.timers) clearTimeout(timer); this.timers = []; clearTimeout(this.tailTimer); this.tailTimer = undefined; this.tailUntil = 0; }
  private apply(step: PlayedStep, active: ActiveStep | null): void { this.snapshot = { ...this.snapshot, state: step.after, steps: [...this.snapshot.steps, step], busy: active !== null, active }; this.emit(); }
  private emit(): void { for (const fn of this.listeners) fn(); }
  readonly subscribe = (fn: () => void): (() => void) => { this.listeners.add(fn); return () => this.listeners.delete(fn); };
  readonly getSnapshot = (): Snapshot => this.snapshot;
}
