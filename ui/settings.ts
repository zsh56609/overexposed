// "House rules" (README §9, settings; round R1): Mark my stories, on by default, and Reduce motion, off. UI state
// only — no rule reads it. Kept in this browser (guarded like the endings collection). Reduce motion drives the
// existing reduced mode (ui/motion.ts) through the same switch the OS preference and the audits use.

import { useSyncExternalStore } from 'react';

export interface Settings {
  readonly markStories: boolean;
  readonly reduceMotion: boolean;
}

const KEY = 'overexposed.settings';
const DEFAULTS: Settings = { markStories: true, reduceMotion: false };
const listeners = new Set<() => void>();

function load(): Settings {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    if (parsed && typeof parsed === 'object') {
      const p = parsed as Partial<Record<keyof Settings, unknown>>;
      return {
        markStories: typeof p.markStories === 'boolean' ? p.markStories : DEFAULTS.markStories,
        reduceMotion: typeof p.reduceMotion === 'boolean' ? p.reduceMotion : DEFAULTS.reduceMotion,
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

const subscribe = (fn: () => void): (() => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const useSettings = (): Settings => useSyncExternalStore(subscribe, settings);
