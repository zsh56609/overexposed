// The content the browser build plays: the same JSON the sim loads, bundled by Vite.

import type { Content } from '../core/index.ts';
import awards from '../content/awards.json';
import cards from '../content/cards.json';
import endings from '../content/endings.json';
import gates from '../content/gates.json';
import rules from '../content/rules.json';
import en from '../i18n/en.json';

export const content = { rules, cards, gates, endings, awards } as unknown as Content;

/** Dev builds run with strict /core: bad content or an illegal action throws, loudly. The shipped build degrades. */
export const STRICT = import.meta.env.DEV;

/**
 * Dev only: the same checks as `npm run validate`, printed to the console. Load failures are loud in
 * dev, graceful in the shipped build (CLAUDE.md §4) — production never loads the validator.
 */
export async function checkContentInDev(): Promise<void> {
  if (!import.meta.env.DEV) return;
  const { validateContent } = await import('../validate/validate.ts');
  for (const issue of validateContent({ rules, cards, gates, endings, awards }, en).issues) {
    const line = `[content ${issue.check}] ${issue.where}: ${issue.message}`;
    if (issue.level === 'error') console.error(line);
    else console.warn(line);
  }
}
