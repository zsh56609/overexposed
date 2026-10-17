// The endings collection (design §1.5): the minor endings found, kept in this browser only. A completion record —
// it changes nothing in play. Storage can be missing or refuse (private windows, blocked site data): every access
// is guarded, and the collection then holds this run's ending alone, never failing.

const KEY = 'overexposed.endingsFound';

/** Every minor ending found so far. */
export function readFound(): ReadonlySet<string> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return new Set(Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

/** Adds this year's ending to the collection; returns every minor found, this one included. */
export function recordEnding(minorId: string): ReadonlySet<string> {
  const found = new Set([...readFound(), minorId]);
  try {
    localStorage.setItem(KEY, JSON.stringify([...found]));
  } catch {
    // not saved; still shown
  }
  return found;
}
