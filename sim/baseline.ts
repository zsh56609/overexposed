// npm run sim:baseline -- --out=sim/out/<name> — records the four sim reports on the reference seeds into one
// folder, so a later round can prove its changes left the game's numbers alone (npm run sim:compare).
//
// For each seed (default 20260929, 1 and 424242): `sim` (its console report, and its JSON run records per
// manager), `sim:awards`, `sim:tiers` and `sim:managers`, each run as `npm run` would run it.
// Usage: node sim/baseline.ts --out=sim/out/baseline-v1b [--seeds=20260929,1,424242]
// sim/out is not committed: keep a baseline on the machine that compares against it.

import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const flag = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const out = flag('out');
if (!out) {
  console.error('usage: node sim/baseline.ts --out=sim/out/<name> [--seeds=20260929,1,424242]');
  process.exit(1);
}
const seeds = (flag('seeds') ?? '20260929,1,424242').split(',');
const dir = resolve(ROOT, out);
mkdirSync(dir, { recursive: true });

const run = (script: string, args: string[], file: string) => {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [join(ROOT, script), ...args], { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  writeFileSync(join(dir, file), (r.stdout ?? '') + (r.stderr ?? ''), 'utf8');
  console.log(`${file.padEnd(28)} ${r.status === 0 ? 'ok' : `exit ${r.status}`} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  return r.status === 0;
};

let ok = true;
for (const seed of seeds) {
  ok = run('sim/run.ts', [`--seed=${seed}`, `--out=${join(dir, `sim-${seed}.json`)}`], `sim-${seed}.txt`) && ok;
  ok = run('sim/awards.ts', [`--seed=${seed}`], `awards-${seed}.txt`) && ok;
  ok = run('sim/tiers.ts', [`--seed=${seed}`], `tiers-${seed}.txt`) && ok;
  ok = run('sim/managers.ts', [`--seed=${seed}`], `managers-${seed}.txt`) && ok;
}
console.log(`${ok ? 'recorded' : 'recorded, with failures'} → ${dir}`);
process.exit(ok ? 0 : 1);
