// npm run sim:memory -- [--runs=1000] [--seed=20260929] [--manager=<id>]
//
// The next run remembers the last (round R7, Part E): every persona plays two runs in a row, the second on a new seed,
// once from the first's memory and once without — and the report shows, per persona, what the second run met and read
// again: the events of the first it met, and the lines shown once a run it read again, variant for variant. The lines
// are the ones the game shows: the opening, the season cards after spring's (spring's is the opening card), the doors
// offered, the minor ending's text. Ids and keys only.

import { deriveSeed, onceItem, type GameState, type RunMemory } from '../core/index.ts';
import { managersToRun, runOne, runSeeds } from './batch.ts';
import { loadContent } from './content.ts';
import { isProbe, PERSONA_IDS, type PersonaId } from './personas.ts';

const flag = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const RUNS = Number(flag('runs') ?? 1000);
const SEED = Number(flag('seed') ?? 20260929);
const content = loadContent();

/** What a run met and read: the events offered, and the key of every line it showed once. Null: it crashed. */
function played(persona: PersonaId, seed: number, manager: string | undefined, memory?: RunMemory): { events: string[]; lines: Record<string, string> } | null {
  let last: GameState | null = null;
  const record = runOne(content, persona, seed, (s) => (last = s), { ...(manager === undefined ? {} : { manager }), ...(memory ? { memory } : {}) });
  const end = last as GameState | null;
  if (record.crash !== null || end === null) return null;
  const items = [
    onceItem.opening,
    ...Array.from({ length: end.content.rules.acts - 1 }, (_, i) => onceItem.opener(i + 2)),
    ...end.gateHistory.flatMap((g) => g.offered.map((id) => onceItem.gate(id))),
    ...(end.endingId ? [onceItem.ending(end.endingId)] : []),
  ];
  const lines: Record<string, string> = {};
  for (const item of items) {
    const key = end.onceLines[item];
    if (key !== undefined) lines[item] = key;
  }
  return { events: record.events.map((e) => e.eventId), lines };
}

for (const manager of managersToRun(content, flag('manager'))) {
  console.log(`\nMEMORY  seed=${SEED}  manager=${manager ?? 'none'}  ${RUNS} pairs of runs per persona (the second on a new seed)`);
  console.log('  persona        events  again  again with memory   lines  again  again with memory');
  for (const persona of PERSONA_IDS) {
    let n = 0, events = 0, againPlain = 0, againMemory = 0, lines = 0, readPlain = 0, readMemory = 0;
    for (const seed of runSeeds(SEED, RUNS)) {
      const first = played(persona, seed, manager);
      if (!first) continue;
      const next = deriveSeed(seed, 2);
      const plain = played(persona, next, manager);
      const remembered = played(persona, next, manager, { events: first.events, lines: first.lines });
      if (!plain || !remembered) continue;
      n++;
      events += remembered.events.length;
      againPlain += plain.events.filter((e) => first.events.includes(e)).length;
      againMemory += remembered.events.filter((e) => first.events.includes(e)).length;
      lines += Object.keys(remembered.lines).length;
      readPlain += Object.entries(plain.lines).filter(([item, key]) => first.lines[item] === key).length;
      readMemory += Object.entries(remembered.lines).filter(([item, key]) => first.lines[item] === key).length;
    }
    const per = (x: number) => (x / Math.max(1, n)).toFixed(2).padStart(5);
    console.log(`  ${(persona + (isProbe(persona) ? '*' : '')).padEnd(14)} ${per(events)}  ${per(againPlain)}  ${per(againMemory)}             ${per(lines)}  ${per(readPlain)}  ${per(readMemory)}`);
  }
}
console.log('\n* a probe. events: met in the second run; again: of them, met in the first too. lines: shown once a run in the');
console.log('  second; again: the same variant the first showed. Without memory the second run is played as runs always were.');
