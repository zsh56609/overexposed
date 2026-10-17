// The collections (design §1.5; round R4, A7): the minor endings found and the awards won, kept in this browser only.
// Completion records — they change nothing in play. Storage can be missing or refuse (private windows, blocked site
// data): every access is guarded, and a collection then holds this session's alone, never failing.

/** One kept set of ids: this session's are kept even when storage refuses them, so the scrapbook still shows them. */
function kept(key: string): { readonly read: () => ReadonlySet<string>; readonly add: (ids: readonly string[]) => ReadonlySet<string> } {
  const session = new Set<string>();
  const read = (): ReadonlySet<string> => {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
      return new Set([...(Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []), ...session]);
    } catch {
      return new Set(session);
    }
  };
  const add = (ids: readonly string[]): ReadonlySet<string> => {
    for (const id of ids) session.add(id);
    const all = new Set([...read(), ...ids]);
    try {
      localStorage.setItem(key, JSON.stringify([...all]));
    } catch {
      // not saved; still shown
    }
    return all;
  };
  return { read, add };
}

const endings = kept('overexposed.endingsFound');
const awards = kept('overexposed.awardsWon');

/** Every minor ending found so far. */
export const readFound = (): ReadonlySet<string> => endings.read();

/** Adds this year's ending to the collection; returns every minor found, this one included. */
export const recordEnding = (minorId: string): ReadonlySet<string> => endings.add([minorId]);

/** Every award won so far (round R4, A7): an award is not an ending — a year can win several. */
export const readAwards = (): ReadonlySet<string> => awards.read();

/** Adds this year's awards; returns every award won so far, and those won for the first time this year. */
export function recordAwards(ids: readonly string[]): { readonly won: ReadonlySet<string>; readonly fresh: ReadonlySet<string> } {
  const before = awards.read();
  return { won: awards.add(ids), fresh: new Set(ids.filter((id) => !before.has(id))) };
}
