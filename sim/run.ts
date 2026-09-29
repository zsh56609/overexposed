// npm run sim -- [--runs=1000] [--seed=20260929] [--persona=minmaxer,random] [--out=path] [--no-json]
// npm run sim -- --replay=<run seed> --persona=<id>      one run, action by action
//
// Exit code 1 if any run crashed or soft-locked. Out-of-band balance is reported, not fatal.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import type { GameEvent } from '../core/index.ts';
import { ROOT } from '../validate/load.ts';
import { runBatch, runOne, type RunRecord } from './batch.ts';
import { loadContent } from './content.ts';
import { PERSONA_IDS, type PersonaId } from './personas.ts';
import { buildReport, formatReport } from './report.ts';

const OPTIONS = ['runs', 'seed', 'persona', 'replay', 'out', 'no-json'];
const DEFAULT_SEED = 20260929;

function parseArgs(argv: readonly string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (const arg of argv) {
    const m = /^--([a-z-]+)(?:=(.*))?$/.exec(arg);
    if (!m || !OPTIONS.includes(m[1] as string)) throw new Error(`unknown argument ${arg} (options: ${OPTIONS.map((o) => `--${o}`).join(' ')})`);
    args[m[1] as string] = m[2] ?? 'true';
  }
  return args;
}

function toUint(value: string, name: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 0xffffffff) throw new Error(`--${name} must be an integer 0..4294967295, got ${value}`);
  return n;
}

function toPersonas(value: string | undefined): PersonaId[] {
  if (value === undefined) return [...PERSONA_IDS];
  return value.split(',').map((p) => {
    if (!(PERSONA_IDS as readonly string[]).includes(p)) throw new Error(`unknown persona ${p} (${PERSONA_IDS.join(', ')})`);
    return p as PersonaId;
  });
}

function describe(e: GameEvent): string {
  const signed = (n: number) => (n > 0 ? `+${n}` : String(n));
  switch (e.type) {
    case 'turnStart': return `\nT${e.turn} act ${e.act}`;
    case 'shuffle': return `(shuffle ${e.count})`;
    case 'draw': return `draw ${e.cardId}`;
    case 'play': return `PLAY ${e.cardId}`;
    case 'resource': return `${e.target} ${signed(e.delta)}=${e.value}`;
    case 'slots': return `slots ${signed(e.delta)}=${e.value}`;
    case 'flag': return `flag ${e.flag}`;
    case 'addCard': return `add ${e.cardId}->${e.to}`;
    case 'exhaust': return `exhaust ${e.cardId}`;
    case 'scandal': return `SCANDAL ${e.cardId} <- ${e.cause ?? '?'}${e.byTag ? '' : ' (no tag match: seeded)'}`;
    case 'turnEnd': {
      const r = e.resources;
      return `end T${e.turn}: hype ${r.hype} craft ${r.craft} capital ${r.capital} heat ${r.heat} scandals ${e.scandalCount}`;
    }
    case 'draftOffer': return `\nDRAFT act ${e.act}: ${e.cardIds.join(' | ')}`;
    case 'draftPick': return `DRAFT PICK ${e.cardId}`;
    case 'draftExtraPick': return `EXTRA PICK -${e.cost} capital`;
    case 'draftReroll': return `REROLL -${e.cost} capital`;
    case 'gateOffer': return `GATE OFFER ${e.gateIds.join(' | ')}`;
    case 'gate': return `GATE ${e.gateId} ${e.passed ? 'PASS' : 'FAIL'}`;
    case 'ending': return `ENDING ${e.endingId ?? 'none'}`;
    case 'warning': return `WARNING ${e.code} ${e.ref}`;
  }
}

function replay(seed: number, persona: PersonaId): RunRecord {
  const content = loadContent();
  console.log(`replay seed=${seed} persona=${persona}`);
  const record = runOne(content, persona, seed, (state) => {
    const parts = state.events.map(describe);
    console.log(parts.join(', ').replaceAll(', \n', '\n'));
  });
  console.log(`\nending ${record.endingId}, scandals held ${record.scandalsAtEnd}, actions ${record.actions}`);
  if (record.crash) console.log(`CRASH ${record.crash}`);
  if (record.softLock) console.log(`SOFT-LOCK ${record.softLock}`);
  return record;
}

function main(): number {
  const args = parseArgs(process.argv.slice(2));

  if (args.replay !== undefined) {
    const personas = toPersonas(args.persona);
    if (personas.length !== 1) throw new Error('--replay needs exactly one --persona');
    const r = replay(toUint(args.replay, 'replay'), personas[0] as PersonaId);
    return r.crash || r.softLock ? 1 : 0;
  }

  const runs = toUint(args.runs ?? '1000', 'runs');
  const seed = toUint(args.seed ?? String(DEFAULT_SEED), 'seed');
  const batch = runBatch(runs, seed, { content: loadContent(), personas: toPersonas(args.persona) });
  const report = buildReport(batch);
  console.log(formatReport(report));

  if (args['no-json'] === undefined) {
    const out = args.out ?? join(ROOT, 'sim', 'out', 'report.json');
    mkdirSync(dirname(out), { recursive: true });
    const runsJson = batch.records.map((r) =>
      JSON.stringify({
        seed: r.seed,
        persona: r.persona,
        ending: r.endingId,
        scandalsAtEnd: r.scandalsAtEnd,
        scandalsCrystallised: r.scandalsCrystallised,
        actions: r.actions,
        cardsPlayed: r.cardsPlayed,
        gates: r.gates.map((g) => [g.gateId, g.passed]),
        final: r.final,
        softLock: r.softLock,
        crash: r.crash,
      }),
    );
    writeFileSync(out, `{"report": ${JSON.stringify(report, null, 2)},\n"runs": [\n${runsJson.join(',\n')}\n]}\n`, 'utf8');
    console.log(`\nJSON report: ${relative(ROOT, out).replaceAll('\\', '/')}`);
  }
  return report.health.crashes.length + report.health.softLocks.length > 0 ? 1 : 0;
}

try {
  process.exitCode = main();
} catch (err) {
  console.error((err as Error).message);
  process.exitCode = 2;
}
