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
