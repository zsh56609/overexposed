// The texts' photographs, loaded (round R8b): ui/photos.ts is a chunk of its own, fetched when the year begins (BEGIN),
// so the main bundle does not grow by it. The first text with a photo comes in month 2, long after it has loaded; if it
// has not, the photo waits — the thread's arrival holds at it (ui/screens/Events.tsx) and goes on once it is here.

import { useSyncExternalStore } from 'react';
import type { PhotoId } from '../core/index.ts';

type Photos = typeof import('./photos.ts');
let loaded: Photos | null = null;
let loading: Promise<Photos> | null = null;
const listeners = new Set<() => void>();

/** Starts the photos' chunk loading, once; resolves when it is here. A failed load is tried again on the next call. */
export function loadPhotos(): Promise<Photos> {
  return (loading ??= import('./photos.ts').then(
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

/** A photo's source if the chunk is here, else null. */
export const photoNow = (id: PhotoId): string | null => (loaded ? loaded.photoDataUrl(id) : null);

/** Whether the chunk is here. */
export const photosReady = (): boolean => loaded !== null;

const subscribe = (fn: () => void): (() => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/** A photo's source, rendering again when the chunk arrives; null until then (it asks for the chunk). */
export function usePhoto(id: PhotoId | null): string | null {
  const ready = useSyncExternalStore(subscribe, photosReady);
  if (id === null) return null;
  if (!ready) void loadPhotos().catch(() => {});
  return ready ? photoNow(id) : null;
}
