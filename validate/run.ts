// npm run validate — content schema, i18n keys and code boundaries. Exit code 1 on any error.

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadRawContent, readJson, readSources, ROOT } from './load.ts';
import { CHECKS, checkBoundaries, validateContent, type Appearances, type CheckId, type Issue, type ValidationResult } from './validate.ts';

const SOURCE_DIRS = ['core', 'sim', 'validate', 'check', 'ui'];

const issues: Issue[] = [];
let result: ValidationResult | null = null;
try {
  // How often each line group is seen per run, measured by npm run sim:variants: what the variant check needs.
  const appearances = existsSync(join(ROOT, 'sim/appearances.json')) ? (readJson('sim/appearances.json') as Appearances) : undefined;
  result = validateContent(loadRawContent(), readJson('i18n/en.json'), appearances);
  issues.push(...result.issues);
} catch (err) {
  issues.push({ level: 'error', check: 'schema', where: 'load', message: (err as Error).message });
}
issues.push(...checkBoundaries(readSources(SOURCE_DIRS)));

const errors = issues.filter((i) => i.level === 'error');
const warnings = issues.filter((i) => i.level === 'warning');

const lines: string[] = [];
if (result) {
  const { cards, gates, majors, minors, awards, i18nKeys } = result.counts;
  lines.push(`validate: ${cards} cards, ${gates} gates, ${majors} major and ${minors} minor endings, ${awards} awards, ${i18nKeys} i18n keys, sources in /${SOURCE_DIRS.join(' /')}`, '');
}
for (const check of Object.keys(CHECKS) as CheckId[]) {
  const n = errors.filter((i) => i.check === check).length;
  let note = '';
  if (check === 'reachability' && result) {
    const acts = Object.values(result.earliestAct).filter(Number.isFinite);
    note = `${acts.length} reachable, earliest act ${Math.min(...acts)}..${Math.max(...acts)}`;
  }
  if (check === 'prose') {
    const gaps = warnings.filter((i) => i.check === 'prose').length;
    note = gaps === 0 ? 'all written' : `${gaps} piece(s) still to write, listed below`;
  }
  if (check === 'variants') {
    const short = warnings.filter((i) => i.check === 'variants').length;
    note = short === 0 ? 'enough everywhere' : `${short} group(s) short of variants, listed below`;
  }
  lines.push(`  ${n === 0 ? 'ok  ' : 'FAIL'}  ${CHECKS[check].padEnd(52)}${n > 0 ? `${n} error(s)` : note}`);
}
const show = (i: Issue) => `  ${i.level === 'error' ? 'ERROR' : 'warn '} [${i.check}] ${i.where}: ${i.message}`;
if (errors.length > 0) lines.push('', ...errors.map(show));
if (warnings.length > 0) lines.push('', ...warnings.map(show));
lines.push('', `${errors.length === 0 ? 'PASS' : 'FAIL'}: ${errors.length} error(s), ${warnings.length} warning(s)`);

console.log(lines.join('\n'));
process.exitCode = errors.length === 0 ? 0 : 1;
