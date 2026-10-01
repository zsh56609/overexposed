// npm run sim:compare -- <dirA> <dirB> — whether two sim baselines (npm run sim:baseline) are the same game: every
// JSON run record identical, every report identical line for line once timings and the JSON file's own path are
// set aside. Prints each file's verdict and the first differing lines; exits 1 if anything differs.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const [a, b] = process.argv.slice(2).filter((x) => !x.startsWith('--'));
if (!a || !b) {
  console.error('usage: node sim/compare.ts <dirA> <dirB>');
  process.exit(1);
}
const strip = (t: string) =>
  t
    .split(/\r?\n/)
    .filter((l) => !/^JSON report:/.test(l))
    .map((l) => l.replace(/\(\d+(\.\d+)?s\)/g, '(Ts)').replace(/\d+(\.\d+)?ms/g, 'Tms'))
    .join('\n');

let diffs = 0;
let files = 0;
for (const f of readdirSync(a).sort()) {
  const fa = join(a, f);
  const fb = join(b, f);
  if (!f.endsWith('.json') && !f.endsWith('.txt')) continue;
  files++;
  if (!existsSync(fb)) {
    console.log(`only in ${a}: ${f}`);
    diffs++;
    continue;
  }
  if (f.endsWith('.json')) {
    const ja = JSON.parse(readFileSync(fa, 'utf8')) as { runs?: unknown };
    const jb = JSON.parse(readFileSync(fb, 'utf8')) as { runs?: unknown };
    const same = JSON.stringify(ja.runs ?? ja) === JSON.stringify(jb.runs ?? jb);
    if (!same) diffs++;
    console.log(`${same ? 'same' : 'DIFF'}  ${f}  (${Array.isArray(ja.runs) ? ja.runs.length : '?'} runs)`);
  } else {
    const la = strip(readFileSync(fa, 'utf8')).split('\n');
    const lb = strip(readFileSync(fb, 'utf8')).split('\n');
    const block: string[] = [];
    for (let i = 0; i < Math.max(la.length, lb.length); i++) if (la[i] !== lb[i]) block.push(`    - ${la[i] ?? ''}\n    + ${lb[i] ?? ''}`);
    if (block.length) diffs++;
    console.log(`${block.length ? 'DIFF' : 'same'}  ${f}${block.length ? `\n${block.slice(0, 6).join('\n')}` : ''}`);
  }
}
console.log(diffs === 0 ? `IDENTICAL: ${files} files` : `${diffs} of ${files} files differ`);
process.exit(diffs === 0 ? 0 : 1);
