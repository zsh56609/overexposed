// npm run check:queue (its last step) — the month end's pace (round R2, 0.2), from real reducer steps: how long each month end and
// each season change keeps the next decision waiting, unskipped, in full motion. The time is the presentation's
// own timeline (ui/timeline.ts) — the queue holds input until it settles — plus a door's ACCEPTED stamp (0.56 s)
// before a season change's action goes. Runs the sim's personas, under both managers, over --runs seeds.
//
// The targets: a calm month end at most 4 s; a month with scandals at most 6 s plus 0.6 s for each scandal after
// the first; a season change (the door's choice to the next offers) at most 5.5 s. Exit code 1 when one is missed.
//
// Usage: node check/pace.ts [--runs=40]

import { getCard, type Content, type GameState } from '../core/index.ts';
import { runOne } from '../sim/batch.ts';
import { loadContent } from '../sim/content.ts';
import type { PersonaId } from '../sim/personas.ts';
import type { PlayedStep } from '../ui/queue.ts';
import { timeline } from '../ui/timeline.ts';

const RUNS = Number(process.argv.find((a) => a.startsWith('--runs='))?.slice(7) ?? 40);
const STAMP = 560;
const content = loadContent() as Content;
const managers = (content.managers?.managers ?? []).map((m) => m.id);
const personas: PersonaId[] = ['random', 'minmaxer', 'dealseeker', 'comeback', 'hypechaser'];

type Kind = string;
const samples = new Map<Kind, number[]>();
const add = (kind: Kind, ms: number) => samples.set(kind, [...(samples.get(kind) ?? []), ms]);
const limit = (kind: Kind): number => (kind === 'calm' ? 4000 : kind === 'season' ? 5500 : 6000 + 600 * (Number(kind.split(':')[1]) - 1));

for (const manager of managers)
  for (const persona of personas)
    for (let seed = 1; seed <= RUNS; seed++) {
      const history: PlayedStep[] = [];
      let before: GameState | null = null;
      runOne(
        content,
        persona,
        seed * 7919,
        (after, action) => {
          const step: PlayedStep = { id: history.length + 1, action, before, after, events: after.events };
          if (action?.type === 'END_TURN' || (action?.type === 'CHOOSE_GATE' && after.phase !== 'ended')) {
            const plan = timeline(step, history, 'full');
            const scandals = step.events.filter((e) => e.type === 'addCard' && getCard(after.content, e.cardId)?.kind === 'scandal').length;
            if (plan) add(action.type === 'CHOOSE_GATE' ? 'season' : scandals === 0 ? 'calm' : `scandals:${scandals}`, plan.duration + (action.type === 'CHOOSE_GATE' ? STAMP : 0));
          }
          history.push(step);
          before = after;
        },
        { manager },
      );
    }

const q = (xs: number[], p: number) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(p * xs.length))] ?? 0;
let failed = false;
const kinds = [...samples.keys()].sort((a, b) => (a === 'calm' ? -1 : b === 'calm' ? 1 : a === 'season' ? 1 : b === 'season' ? -1 : a.localeCompare(b, 'en', { numeric: true })));
for (const kind of kinds) {
  const xs = samples.get(kind) ?? [];
  const max = Math.max(...xs);
  const ok = max <= limit(kind);
  if (!ok) failed = true;
  console.log(`${kind.padEnd(12)} n=${String(xs.length).padStart(5)}  median ${(q(xs, 0.5) / 1000).toFixed(2)} s  p90 ${(q(xs, 0.9) / 1000).toFixed(2)} s  max ${(max / 1000).toFixed(2)} s  target ${(limit(kind) / 1000).toFixed(1)} s  ${ok ? 'PASS' : 'FAIL'}`);
}
console.log(failed ? 'FAIL: a month end keeps the next decision waiting too long' : 'PASS: every month end and season change within its target');
process.exit(failed ? 1 : 0);
