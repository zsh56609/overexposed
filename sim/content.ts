// Load /content for the sim, refusing to run on content that fails validation.
// The sim never reads /i18n, so key checks are left to `npm run validate`.

import type { Content } from '../core/index.ts';
import { loadRawContent } from '../validate/load.ts';
import { validateContent } from '../validate/validate.ts';

export function loadContent(): Content {
  const raw = loadRawContent();
  const errors = validateContent(raw).issues.filter((i) => i.level === 'error');
  if (errors.length > 0) {
    const list = errors.map((i) => `  [${i.check}] ${i.where}: ${i.message}`).join('\n');
    throw new Error(`content failed validation; run npm run validate\n${list}`);
  }
  return raw as Content;
}
