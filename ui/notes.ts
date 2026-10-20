// The manager's notes (round R8b, B1): six short notes in the manager's hand, each at the moment it matters in a new
// player's first year. Which have come (`seen`) and which have had the first time's highlight (`lit`) are kept in this
// browser under overexposed.notes — guarded as the settings are: unreadable or unavailable means both empty, and a
// failed write still applies to this session. The switch itself is House rules' "Manager's notes" (ui/settings.ts).

import { useSyncExternalStore } from 'react';

/** The six, in the order they take turns when two could come at once (B3). */
export const NOTE_IDS = ['stats', 'actions', 'heat', 'end', 'mirror', 'scandal'] as const;
export type NoteId = (typeof NOTE_IDS)[number];

/** The two whose words change under touch or pen (B6): "hold" where a mouse would hover — notes.<note>.<manager>.touch. */
export const TOUCH_NOTES: readonly NoteId[] = ['actions', 'mirror'];

/** A note's marks (B4): each is drawn as its stat's icon from the stat bar; validate flags any other (B6). */
export const NOTE_MARKS = ['hype', 'craft', 'heat'] as const;
export type NoteMark = (typeof NOTE_MARKS)[number];

export interface NotesStore {
  readonly seen: readonly NoteId[];
  readonly lit: readonly NoteId[];
}

const KEY = 'overexposed.notes';
const EMPTY: NotesStore = { seen: [], lit: [] };
const listeners = new Set<() => void>();

const ids = (x: unknown): NoteId[] => (Array.isArray(x) ? NOTE_IDS.filter((id) => x.includes(id)) : []);

function load(): NotesStore {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    if (parsed && typeof parsed === 'object') {
      const p = parsed as Partial<Record<keyof NotesStore, unknown>>;
      return { seen: ids(p.seen), lit: ids(p.lit) };
    }
  } catch {
    // unreadable or unavailable: both empty
  }
  return EMPTY;
}

let current: NotesStore = load();
/** Bumped each time the switch is turned on, so a run can tell the steps since then (the mirror's note, B2). */
let turnedOn = 0;

function save(next: NotesStore): void {
  current = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // not saved; applies to this session
  }
  for (const fn of listeners) fn();
}

export const notesStore = (): NotesStore => current;
export const notesTurnedOn = (): number => turnedOn;

/** A note has come: it joins `seen` (and is not shown again until the switch is turned back on). */
export function markSeen(id: NoteId): void {
  if (!current.seen.includes(id)) save({ ...current, seen: [...current.seen, id] });
}

/** A note has had its first-time highlight: it joins `lit`, and is never highlighted again. */
export function markLit(id: NoteId): void {
  if (!current.lit.includes(id)) save({ ...current, lit: [...current.lit, id] });
}

/** The switch turned on (B1): `seen` empties, so the notes come again from the start; `lit` is kept. */
export function notesOn(): void {
  turnedOn++;
  save({ ...current, seen: [] });
}

const subscribe = (fn: () => void): (() => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const useNotesStore = (): NotesStore => useSyncExternalStore(subscribe, notesStore);
