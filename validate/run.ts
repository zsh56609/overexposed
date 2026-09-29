// npm run validate — content schema, i18n keys and code boundaries. Exit code 1 on any error.

import { loadRawContent, readJson, readSources } from './load.ts';
import { CHECKS, checkBoundaries, validateContent, type CheckId, type Issue, type ValidationResult } from './validate.ts';

const SOURCE_DIRS = ['core', 'sim', 'validate', 'check', 'ui'];

const issues: Issue[] = [];
let result: ValidationResult | null = null;
try {
  result = validateContent(loadRawContent(), readJson('i18n/en.json'));
  issues.push(...result.issues);
} catch (err) {
  issues.push({ level: 'error', check: 'schema', where: 'load', message: (err as Error).message });
}
issues.push(...checkBoundaries(readSources(SOURCE_DIRS)));

const errors = issues.filter((i) => i.level === 'error');
const warnings = issues.filter((i) => i.level === 'warning');

const lines: string[] = [];
if (result) {
  const { cards, gates, endings, awards, i18nKeys } = result.counts;
  lines.push(`validate: ${cards} cards, ${gates} gates, ${endings} endings, ${awards} awards, ${i18nKeys} i18n keys, sources in /${SOURCE_DIRS.join(' /')}`, '');
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
  lines.push(`  ${n === 0 ? 'ok  ' : 'FAIL'}  ${CHECKS[check].padEnd(52)}${n > 0 ? `${n} error(s)` : note}`);
}
const show = (i: Issue) => `  ${i.level === 'error' ? 'ERROR' : 'warn '} [${i.check}] ${i.where}: ${i.message}`;
if (errors.length > 0) lines.push('', ...errors.map(show));
if (warnings.length > 0) lines.push('', ...warnings.map(show));
lines.push('', `${errors.length === 0 ? 'PASS' : 'FAIL'}: ${errors.length} error(s), ${warnings.length} warning(s)`);

console.log(lines.join('\n'));
process.exitCode = errors.length === 0 ? 0 : 1;
