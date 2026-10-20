// The trophies, loaded (round R8c, B1): ui/trophies.ts is a chunk of its own, fetched once the title has painted (when
// the page is idle), so the main bundle does not grow by it: the scrapbook opened from the title has it, and so does
// the night. Until it is here a trophy's box stands empty at its size, and the drawing appears in it when it comes.

import { useSyncExternalStore } from 'react';
import type { TrophyId } from '../core/index.ts';

type Trophies = typeof import('./trophies.ts');
let loaded: Trophies | null = null;
let loading: Promise<Trophies> | null = null;
const listeners = new Set<() => void>();

/** Starts the trophies' chunk loading, once; resolves when it is here. A failed load is tried again on the next call. */
export function loadTrophies(): Promise<Trophies> {
  return (loading ??= import('./trophies.ts').then(
    (m) => {
      loaded = m;
      for (const fn of listeners) fn();
      return m;
    },
    (err: unknown) => {
      loading = null;
      throw err;
    },
  ));
}

/** Whether the chunk is here. */
export const trophiesReady = (): boolean => loaded !== null;

/** Fetches the chunk when the page is next idle (after the title has painted); at once where there is no idle callback. */
export function loadTrophiesWhenIdle(): () => void {
  const go = () => void loadTrophies().catch(() => {});
  if (typeof requestIdleCallback === 'function') {
    const id = requestIdleCallback(go, { timeout: 2000 });
    return () => cancelIdleCallback(id);
  }
  const id = window.setTimeout(go, 200);
  return () => window.clearTimeout(id);
}

const subscribe = (fn: () => void): (() => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/** A trophy's source, rendering again when the chunk arrives; null until then (it asks for the chunk). */
export function useTrophy(id: TrophyId): string | null {
  const ready = useSyncExternalStore(subscribe, trophiesReady);
  if (!ready) void loadTrophies().catch(() => {});
  return ready && loaded ? loaded.trophyDataUrl(id) : null;
}
