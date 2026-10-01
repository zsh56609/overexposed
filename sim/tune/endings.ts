// npm run tune:endings -- [--patch='<js>' ...] [--awards] [--runs=1000] [--seed=20260929] [--manager=<id>]
// The endings the sim's finished years resolve to — majors, and minors within them — per persona and pooled over the
// player-like ones, under the content as it stands and under each --patch: a JS function body run on a copy of the
// content (sim/tune/common.ts patchContent), e.g. --patch="axis('reputation').from = 5" or
// --patch="minor('redemption_arc').conditions.scandalDrop.min = 1". Several --patch options compare candidates side by side.
// The years are played once, then resolved again under each patch by /core's own ending query (endingIfYearEndedNow):
// exact for splits and thresholds. A patch that adds or removes a flag test changes how the personas play (they weigh
// a flag by what reads it): measure that with npm run tune:try, which plays the runs again.
// --awards adds, per minor ending, the awards its player-like runs win. Each manager in turn unless --manager names one.

import { endingIfYearEndedNow, indexContent, yearAwards, type Content } from '../../core/index.ts';
import { validateContent, type RawContent } from '../../validate/validate.ts';
import { loadContent } from '../content.ts';
import { flags, GROUPS, label, MANAGER, managersToRun, ofGroup, pct, patchContent, RUNS, SEED, yearEnds } from './common.ts';

const content = loadContent();
const candidates: [string, Content][] = [['the content as it stands', content]];
for (const body of flags('patch')) {
  const patched = patchContent(content, body);
  const errors = validateContent(patched as unknown as RawContent).issues.filter((i) => i.level === 'error');
  if (errors.length > 0) {
    console.error(`patch ${body}: the content fails validation\n${errors.map((i) => `  [${i.check}] ${i.where}: ${i.message}`).join('\n')}`);
    process.exit(1);
  }
  candidates.push([`patch: ${body}`, patched]);
}
const W = Math.max(12, ...GROUPS.map((g) => label(g).length + 2));
const head = (first: string) => first.padEnd(22) + GROUPS.map((g) => label(g).padStart(W)).join('');

for (const [i, manager] of managersToRun(content, MANAGER).entries()) {
  if (i > 0) console.log('\n');
  const ends = yearEnds(content, manager);
  console.log(`ENDINGS  seed=${SEED}  manager=${manager ?? 'none'}  ${RUNS} runs per persona; * = probe, not in "players"`);
  for (const [name, c] of candidates) {
    const index = indexContent(c);
    const resolved = ends.map((e) => {
      const s = { ...e.final, content: index };
      const r = endingIfYearEndedNow(s);
      return { e, major: r?.majorId ?? '?', minor: r?.minorId ?? '?', awards: yearAwards({ ...s, endingId: r?.minorId ?? null }) };
    });
    const share = (g: (typeof GROUPS)[number], test: (r: (typeof resolved)[number]) => boolean) => {
      const rs = resolved.filter((r) => ofGroup([r.e], g).length > 0);
      return pct(rs.filter(test).length, rs.length);
    };
    console.log(`\n${name}`);
    console.log(head('major'));
    for (const m of index.majors) console.log(m.id.padEnd(22) + GROUPS.map((g) => share(g, (r) => r.major === m.id).padStart(W)).join(''));
    console.log(head('minor'));
    for (const m of index.majors) {
      for (const minor of index.minorsByMajor[m.id] ?? []) {
        console.log(`${minor.id}${minor.fallback ? ' (else)' : ''}`.padEnd(22) + GROUPS.map((g) => share(g, (r) => r.minor === minor.id).padStart(W)).join(''));
      }
    }
    if (process.argv.includes('--awards')) {
      console.log('\nawards each minor ending brings, player-like runs');
      const players = resolved.filter((r) => !r.e.probe);
      for (const minor of index.minors) {
        const rs = players.filter((r) => r.minor === minor.id);
        if (rs.length === 0) continue;
        const won: Record<string, number> = {};
        for (const r of rs) for (const a of r.awards) won[a] = (won[a] ?? 0) + 1;
        const list = Object.entries(won)
          .sort((a, b) => b[1] - a[1])
          .map(([a, n]) => `${a} ${pct(n, rs.length)}`);
        console.log(`  ${minor.id.padEnd(20)} ${String(rs.length).padStart(5)} runs: ${list.join(' · ') || 'none'}`);
      }
    }
  }
}
