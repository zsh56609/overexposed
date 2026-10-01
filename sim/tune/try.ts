// npm run tune:try -- --patch='<js>' [--seeds=20260929,1,424242] [--runs=1000] [--manager=<id>]
// A content change tried before it is made. The patch — a JS function body run on a copy of the content
// (sim/tune/common.ts patchContent: cards, gates, endings, awards, rules, press, managers, scripts, and card(id),
// gate(id), major(id), minor(id), award(id), axis(id)) — is validated, then the sim's batch plays it in memory on each
// seed, under each manager unless --manager names one, and prints the bands that fail, with the majors and minors
// pooled over the player-like personas. Nothing is written: content/ stays as it is. Without --patch, the content as
// it stands, for the comparison. When the change is made, npm run sim is the record.
// e.g. --patch="card('side_gig').effects[0].value = 4"   --patch="rules.draft.rerollCost = 3"

import { indexContent, type Content } from '../../core/index.ts';
import { validateContent, type RawContent } from '../../validate/validate.ts';
import { runBatch } from '../batch.ts';
import { loadContent } from '../content.ts';
import { buildReport } from '../report.ts';
import { flag, MANAGER, managersToRun, patchContent, RUNS } from './common.ts';

const body = flag('patch');
const content = body === undefined ? loadContent() : patchContent(loadContent(), body);
const errors = validateContent(content as unknown as RawContent).issues.filter((i) => i.level === 'error');
if (errors.length > 0) {
  console.error(`the patched content fails validation\n${errors.map((i) => `  [${i.check}] ${i.where}: ${i.message}`).join('\n')}`);
  process.exit(1);
}
const seeds = (flag('seeds') ?? '20260929,1,424242').split(',').map(Number);
const index = indexContent(content as Content);
const share = (sh: Readonly<Record<string, number>>, ids: readonly string[]) =>
  ids
    .filter((id) => (sh[id] ?? 0) > 0)
    .map((id) => `${id} ${((sh[id] ?? 0) * 100).toFixed(1)}%`)
    .join(' · ');

console.log(`TRY  ${body === undefined ? 'the content as it stands' : `patch: ${body}`}  ${RUNS} runs per persona`);
let failing = 0;
for (const seed of seeds) {
  for (const manager of managersToRun(content, MANAGER)) {
    const report = buildReport(runBatch(RUNS, seed, { content, ...(manager === undefined ? {} : { manager }) }));
    const fails = report.bands.filter((b) => b.pass === false);
    failing += fails.length;
    const health = report.health.crashes.length + report.health.softLocks.length;
    console.log(`\nseed ${seed}  manager ${manager ?? 'none'}: ${report.bands.length - fails.length} of ${report.bands.length} bands pass${health ? `; ${health} crashes or soft-locks` : ''}`);
    for (const b of fails) console.log(`  FAIL ${b.target}\n       ${b.actual}`);
    console.log(`  majors (players): ${share(report.majors.share.players, report.majors.ids)}`);
    console.log(`  minors (players): ${share(report.endings.share.players, index.minors.map((m) => m.id))}`);
  }
}
console.log(`\n${failing === 0 ? 'every band passes' : `${failing} failing band(s) across the seeds`}`);
