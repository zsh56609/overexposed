// The run's memory of the last (round R7, Part E; core/memory.ts), kept in this browser beside the collections: the
// events of the run being played, each written as it is offered, so a run left or reloaded still counts; the events of
// the latest earlier run that met any; and for each group shown once a run, the variant last shown, written as it is
// shown. Storage can be missing or refuse (private windows, blocked site data): every access is guarded as the
// collections' are (ui/collection.ts), but with no session copy — then a run simply has no memory. A run replayed with
// ?seed= neither reads nor writes it (App). Never read or written inside React's state initialisers or updaters:
// StrictMode runs those twice.

import type { RunMemory } from '../core/index.ts';

const KEY = 'overexposed.memory';

interface Kept {
  /** The events of the run being played, as they were offered. */
  readonly current: readonly string[];
  /** The events of the latest earlier run that met any. */
  readonly last: readonly string[];
  /** For each group shown once a run, the variant last shown. */
  readonly lines: Readonly<Record<string, string>>;
}

const strings = (x: unknown): string[] => (Array.isArray(x) ? x.filter((y): y is string => typeof y === 'string') : []);

/** What is kept, or null where storage is missing or refuses. */
function read(): Kept | null {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    const o = raw !== null && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    const lines: Record<string, string> = {};
    if (o.lines !== null && typeof o.lines === 'object') for (const [item, key] of Object.entries(o.lines as object)) if (typeof key === 'string') lines[item] = key;
    return { current: strings(o.current), last: strings(o.last), lines };
  } catch {
    return null;
  }
}

function write(kept: Kept): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(kept));
  } catch {
    // not kept: the next run starts with what was
  }
}

/**
 * A run starts: the run before it, if it met any events, becomes the last one; the memory it starts from is returned
 * (null: no storage, no memory). A run that met none — left at the title, reloaded before its first event — changes
 * nothing.
 */
export function beginRun(): RunMemory | null {
  const kept = read();
  if (!kept) return null;
  const next: Kept = kept.current.length > 0 ? { current: [], last: kept.current, lines: kept.lines } : { ...kept, current: [] };
  write(next);
  return { events: next.last, lines: next.lines };
}

/** An event offered to the run being played. */
export function rememberEvent(eventId: string): void {
  const kept = read();
  if (kept && !kept.current.includes(eventId)) write({ ...kept, current: [...kept.current, eventId] });
}

/** A group shown once a run, and the variant it showed. */
export function rememberLine(item: string, key: string): void {
  const kept = read();
  if (kept && kept.lines[item] !== key) write({ ...kept, lines: { ...kept.lines, [item]: key } });
}
