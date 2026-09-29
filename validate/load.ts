// Node-side file loading shared by the validate and sim CLIs.

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { RawContent } from './validate.ts';

export const ROOT = join(import.meta.dirname, '..');

export const CONTENT_FILES = {
  rules: 'content/rules.json',
  cards: 'content/cards.json',
  gates: 'content/gates.json',
  endings: 'content/endings.json',
} as const satisfies Record<keyof RawContent, string>;

export function readJson(relPath: string): unknown {
  const text = readFileSync(join(ROOT, relPath), 'utf8');
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`${relPath}: invalid JSON (${(err as Error).message})`);
  }
}

export function loadRawContent(): RawContent {
  return {
    rules: readJson(CONTENT_FILES.rules),
    cards: readJson(CONTENT_FILES.cards),
    gates: readJson(CONTENT_FILES.gates),
    endings: readJson(CONTENT_FILES.endings),
  };
}

/** Every .ts/.tsx source file under the given top-level directories, as project-relative paths. */
export function readSources(dirs: readonly string[]): { path: string; text: string }[] {
  const out: { path: string; text: string }[] = [];
  const walk = (abs: string) => {
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      const child = join(abs, entry.name);
      if (entry.isDirectory()) walk(child);
      else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
        out.push({ path: relative(ROOT, child).replaceAll('\\', '/'), text: readFileSync(child, 'utf8') });
      }
    }
  };
  for (const dir of dirs) walk(join(ROOT, dir));
  return out;
}
