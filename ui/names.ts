// People's names in running text (round R8c, E2): a text split into pieces, each name found with its person. Names are
// found as whole words, case-sensitive, the longest first ("Juno Vale" before "Juno"); the characters are unchanged.
// Plain TypeScript, so validate can run it; ui/Named.tsx renders it.

import { PEOPLE, type PersonId } from './people.ts';

export interface NamePiece {
  readonly text: string;
  /** The person this piece names, or null for the words between names. */
  readonly person: PersonId | null;
}

const NAMES: readonly (readonly [string, PersonId])[] = (Object.keys(PEOPLE) as PersonId[])
  .flatMap((id) => PEOPLE[id].names.map((name) => [name, id] as const))
  .sort((a, b) => b[0].length - a[0].length);
const PERSON = new Map(NAMES);
const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** A name, not inside a longer word: nothing letter- or digit-like on either side. */
const FIND = new RegExp(`(?<![\\p{L}\\p{N}_])(?:${NAMES.map(([name]) => escape(name)).join('|')})(?![\\p{L}\\p{N}_])`, 'gu');

/** The text in pieces: the names found, each with its person, and the words between them. */
export function splitNames(text: string): NamePiece[] {
  const pieces: NamePiece[] = [];
  let at = 0;
  for (const m of text.matchAll(FIND)) {
    const start = m.index ?? 0;
    if (start > at) pieces.push({ text: text.slice(at, start), person: null });
    pieces.push({ text: m[0], person: PERSON.get(m[0]) ?? null });
    at = start + m[0].length;
  }
  if (at < text.length || pieces.length === 0) pieces.push({ text: text.slice(at), person: null });
  return pieces;
}
