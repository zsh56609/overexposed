// Display strings. Every word the player reads comes from /i18n/en.json by key (CLAUDE.md §3).

// The import attribute lets Node load this module too (npm run check:preview runs the feed itself).
import en from '../i18n/en.json' with { type: 'json' };

const strings: Readonly<Record<string, string>> = en;
const warned = new Set<string>();

/**
 * The string for `key`, with {name} slots filled from `vars`. A missing key renders as the key itself,
 * loudly bracketed, never blank and never a crash (CLAUDE.md §3).
 */
export function t(key: string, vars: Readonly<Record<string, string | number>> = {}): string {
  const s = strings[key];
  if (s === undefined) {
    if (!warned.has(key)) {
      warned.add(key);
      console.warn(`missing i18n key: ${key}`);
    }
    return `⟦${key}⟧`;
  }
  return s.replace(/\{(\w+)\}/g, (slot, name: string) => (Object.hasOwn(vars, name) ? String(vars[name]) : slot));
}

/** Whether content has written a key at all: for the desk's optional words (a masthead's subtitle). */
export const has = (key: string): boolean => Object.hasOwn(strings, key);

const plural = new Intl.PluralRules('en');

/**
 * `t` for a phrase that counts something: `<key>.one` or `<key>.other`, as English plural rules pick for
 * `n` (1 and −1 are one) — "1 slot", "2 slots", never "slot(s)".
 */
export function tp(key: string, n: number, vars: Readonly<Record<string, string | number>> = {}): string {
  return t(`${key}.${plural.select(n)}`, vars);
}
