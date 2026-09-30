// npm run sim -- [--runs=1000] [--seed=20260929] [--persona=minmaxer,random] [--manager=<id>|none] [--out=path] [--no-json]
// npm run sim -- --replay=<run seed> --persona=<id> [--manager=<id>|none]      one run, action by action
//
// Every band runs once per manager (round 2b): without --manager, one report per manager in content, in turn.
// --manager=none runs the base game, without managers (round 2c).
//
// Exit code 1 if any run crashed or soft-locked. Out-of-band balance is reported, not fatal.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import type { GameEvent } from '../core/index.ts';
import { ROOT } from '../validate/load.ts';
import { managersToRun, runBatch, runOne, type RunRecord } from './batch.ts';
import { loadContent } from './content.ts';
import { PERSONA_IDS, type PersonaId } from './personas.ts';
import { buildReport, formatReport } from './report.ts';

const OPTIONS = ['runs', 'seed', 'persona', 'manager', 'replay', 'out', 'no-json'];
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

function replay(seed: number, persona: PersonaId, manager: string | undefined): RunRecord {
  const content = loadContent();
  const record = runOne(
    content,
    persona,
    seed,
    (state) => {
      const parts = state.events.map(describe);
      console.log(parts.join(', ').replaceAll(', \n', '\n'));
    },
    manager === undefined ? {} : { manager },
  );
  console.log(`replay seed=${seed} persona=${persona} manager=${record.manager ?? 'none'}`);
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
    const r = replay(toUint(args.replay, 'replay'), personas[0] as PersonaId, args.manager);
    return r.crash || r.softLock ? 1 : 0;
  }

  const runs = toUint(args.runs ?? '1000', 'runs');
  const seed = toUint(args.seed ?? String(DEFAULT_SEED), 'seed');
  const content = loadContent();
  const managers = managersToRun(content, args.manager);
  let failures = 0;
  for (const [i, manager] of managers.entries()) {
    if (i > 0) console.log('\n');
    failures += simulate(runs, seed, content, toPersonas(args.persona), manager, managers.length > 1, args);
  }
  return failures > 0 ? 1 : 0;
}

/** One batch under one manager: its report, and its JSON (report.<manager>.json when several run). Returns its crashes and soft-locks. */
function simulate(runs: number, seed: number, content: ReturnType<typeof loadContent>, personas: PersonaId[], manager: string | undefined, several: boolean, args: Record<string, string>): number {
  const batch = runBatch(runs, seed, { content, personas, ...(manager === undefined ? {} : { manager }) });
  const report = buildReport(batch);
  console.log(formatReport(report));

  if (args['no-json'] === undefined) {
    const base = args.out ?? join(ROOT, 'sim', 'out', 'report.json');
    const out = several && manager ? base.replace(/(\.json)?$/, `.${manager}.json`) : base;
    mkdirSync(dirname(out), { recursive: true });
    const runsJson = batch.records.map((r) =>
      JSON.stringify({
        seed: r.seed,
        persona: r.persona,
        manager: r.manager,
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
  return report.health.crashes.length + report.health.softLocks.length;
}

try {
  process.exitCode = main();
} catch (err) {
  console.error((err as Error).message);
  process.exitCode = 2;
}
