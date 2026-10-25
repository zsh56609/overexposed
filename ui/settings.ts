// "House rules" (README §9, settings; round R1): Mark my stories, on by default, and Reduce motion, off; since round
// R4, Sound effects and Music, both on; since round R8b, Manager's notes, on (ui/notes.ts). UI state only — no rule
// reads it. Kept in this browser (guarded like the
// endings collection). Reduce motion drives the existing reduced mode (ui/motion.ts) through the same switch the OS
// preference and the audits use; the two sound switches drive ui/sound/sound.ts.

import { useSyncExternalStore } from 'react';

export interface Settings {
  readonly markStories: boolean;
  /** The effects (round R4, B5; the room's ambience it also covered went in round R6). */
  readonly soundEffects: boolean;
  /** The six tracks (round R4, B5). */
  readonly music: boolean;
  readonly reduceMotion: boolean;
  /**
   * The manager's notes (round R8b, B1), on by default — a player of v0.7, with no such setting stored, has it on and
   * sees the notes too. It turns itself off once all seven have come (six before round R9b) and none is up.
   */
  readonly notes: boolean;
}

const KEY = 'overexposed.settings';
const DEFAULTS: Settings = { markStories: true, soundEffects: true, music: true, reduceMotion: false, notes: true };
const listeners = new Set<() => void>();

function load(): Settings {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    if (parsed && typeof parsed === 'object') {
      const p = parsed as Partial<Record<keyof Settings, unknown>>;
      return {
        markStories: typeof p.markStories === 'boolean' ? p.markStories : DEFAULTS.markStories,
        soundEffects: typeof p.soundEffects === 'boolean' ? p.soundEffects : DEFAULTS.soundEffects,
        music: typeof p.music === 'boolean' ? p.music : DEFAULTS.music,
        reduceMotion: typeof p.reduceMotion === 'boolean' ? p.reduceMotion : DEFAULTS.reduceMotion,
        notes: typeof p.notes === 'boolean' ? p.notes : DEFAULTS.notes,
      };
    }
  } catch {
    // unreadable or unavailable: the defaults
  }
  return DEFAULTS;
}

let current: Settings = load();

/** Reduce motion asks for the reduced mode; off, the OS preference decides again. An audit's own mode is left alone. */
function applyMotion(s: Settings): void {
  const root = document.documentElement;
  if (s.reduceMotion) {
    if (root.dataset.motion !== 'off') root.dataset.motion = 'reduced';
  } else if (root.dataset.motion === 'reduced') delete root.dataset.motion;
}
applyMotion(current);

export const settings = (): Settings => current;

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
  current = { ...current, [key]: value };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // not saved; applies to this session
  }
  applyMotion(current);
  for (const fn of listeners) fn();
}

/** Told whenever a setting changes (the sound layer listens, round R4). */
export const subscribeSettings = (fn: () => void): (() => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const subscribe = subscribeSettings;

export const useSettings = (): Settings => useSyncExternalStore(subscribe, settings);
