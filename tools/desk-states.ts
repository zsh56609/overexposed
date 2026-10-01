// npm run desk:states — finds the desk states the visual checks and tools replay (round V1a), and records them in
// check/desk-states.json: for each named state, a seed, the persona and manager that played it, and the steps
// ([kind, index] per action) that reach it through the real UI (check/desk-replay.ts).
//
// The sim's personas play seeded runs until every target is met:
// - the reference shots (docs/design/visual/shots 01–10): lane · fame tier · calm or frenzy · season, with near
//   neighbours for the ones play rarely reaches (s01b, s03b, s07b, s07c);
// - more of the desk: no lane yet, each lane famous, frenzies on screen and in celebrity, the countdown's four
//   levels;
// - the biggest hand a draw-seeking player reaches (bigHand);
// - every card of the content in some hand (card:<id>, only for cards no other state already holds);
// - every minor ending (ending:<id>): a run's steps to its ending screen, for the plain-screen audit.
// Run it again after a content change: recorded steps no longer replay once the rules or the cards move.
//
// Usage: node tools/desk-states.ts [--out=check/desk-states.json]

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  createInitialState,
  cursor,
  deriveSeed,
  establishedLanes,
  getCard,
  legalActions,
  nextInt,
  readLines,
  reduce,
  seedRng,
  type Action,
  type Content,
  type GameState,
} from '../core/index.ts';
import { PERSONAS, PERSONA_IDS } from '../sim/personas.ts';
import { deskModel, type DeskModel } from '../ui/desk/model.ts';
import type { PlayedStep } from '../ui/queue.ts';
import { loadRawContent } from '../validate/load.ts';
import { ROOT, type DeskState, type Step } from '../check/desk-replay.ts';

const OUT = process.argv.find((a) => a.startsWith('--out='))?.slice(6) ?? join(ROOT, 'check', 'desk-states.json');
process.chdir(ROOT);
const content = loadRawContent() as Content;
const managers = (content.managers?.managers ?? []).map((m) => m.id);

interface Probe {
  readonly s: GameState;
  readonly lane: string;
  readonly fame: number;
  readonly season: string;
  /** The first play state of its month: a full hand, every bulb lit. */
  readonly fresh: boolean;
  model: () => DeskModel;
}
type Target = (p: Probe) => boolean;
const calm = (p: Probe) => !p.model().crisis;
const crisis = (p: Probe) => p.model().crisis;
const countdown = (level: string) => (p: Probe) => p.model().stats.cells.find((c) => c.id === 'next')?.level === level;

// Fame tiers: Unknown 0, Noticed 1, Rising 2, Known 3, Famous 4.
const TARGETS: Record<string, Target> = {
  s01: (p) => p.lane === 'music' && p.fame === 0 && p.season === 'spring' && p.fresh && calm(p),
  s02: (p) => p.lane === 'music' && p.fame === 2 && p.season === 'summer' && p.fresh && calm(p),
  s03: (p) => p.lane === 'music' && p.fame === 4 && p.season === 'summer' && p.fresh && calm(p),
  s04: (p) => p.lane === 'screen' && p.fame === 4 && p.season === 'autumn' && p.fresh && calm(p),
  s05: (p) => p.lane === 'celebrity' && p.fame === 2 && p.season === 'winter' && p.fresh && calm(p),
  s07: (p) => p.lane === 'music' && p.fame === 0 && p.season === 'summer' && crisis(p),
  s09: (p) => p.lane === 'music' && p.fame === 4 && p.season === 'winter' && crisis(p),
  s10: (p) => p.lane === 'screen' && p.fame === 2 && p.season === 'autumn' && p.fresh && calm(p),
  s01b: (p) => p.lane === 'music' && p.fame <= 1 && (p.season === 'spring' || p.season === 'summer') && calm(p),
  s03b: (p) => p.lane === 'music' && p.fame === 4 && p.fresh && calm(p),
  s07b: (p) => p.lane === 'music' && p.fame <= 2 && crisis(p),
  s07c: (p) => p.lane === 'music' && p.fame <= 1 && crisis(p),
  early: (p) => p.lane === 'early' && p.fresh,
  screenCrisis: (p) => p.lane === 'screen' && p.fame >= 3 && crisis(p),
  celebCrisis: (p) => p.lane === 'celebrity' && p.fame >= 3 && crisis(p),
  celebFamous: (p) => p.lane === 'celebrity' && p.fame === 4 && p.fresh && calm(p),
  cdCalm: countdown('calm'),
  cdAmber: countdown('amber'),
  cdRed: countdown('red'),
  cdCrossed: countdown('crossed'),
};

const found: Record<string, DeskState> = {};
const stepOf = (s: GameState, a: Action, pick: number): Step => {
  if (a.type === 'CHOOSE_MANAGER') return ['manager', pick];
  if (a.type === 'PLAY_CARD') return ['play', s.hand.findIndex((c) => c.uid === a.uid)];
  if (a.type === 'END_TURN') return ['end', 0];
  if (a.type === 'DRAFT_PICK') return ['draft', s.draft?.offer.indexOf(a.cardId) ?? -1];
  if (a.type === 'DRAFT_EXTRA_PICK') return ['extra', 0];
  if (a.type === 'DRAFT_REROLL') return ['reroll', 1];
  return ['gate', s.gateOffer.indexOf(a.gateId)];
};
const fameOf = (s: GameState): number => {
  const hype = content.rules.tiers?.hype;
  return hype ? hype.from.filter((f) => s.resources.hype >= f).length - 1 : 0;
};

/** Plays one persona's run, calling `look` at every play state with the steps that reach it, and `ended` at its end. */
function play(
  seed: number,
  persona: (typeof PERSONA_IDS)[number],
  pick: number,
  look: (p: Probe, steps: Step[]) => boolean,
  ended?: (s: GameState, steps: Step[]) => void,
): void {
  const rng = cursor(seedRng(deriveSeed(seed, 99)));
  let s: GameState = createInitialState(seed, content, { strict: true });
  const history: PlayedStep[] = [{ id: 0, action: null, before: null, after: s, events: s.events }];
  const steps: Step[] = [];
  for (let n = 0; s.phase !== 'ended' && n < 800; n++) {
    if (s.phase === 'play') {
      const lane = establishedLanes(history).at(-1) ?? null;
      let cached: DeskModel | null = null;
      const state = s;
      const probe: Probe = {
        s: state,
        lane: lane === 'music' || lane === 'screen' || lane === 'celebrity' ? lane : 'early',
        fame: fameOf(state),
        season: content.rules.seasons?.[state.act - 1] ?? '',
        fresh: history.at(-1)?.before?.phase !== 'play',
        model: () => (cached ??= deskModel({ state, steps: history, lines: { ...readLines(history), lane } })),
      };
      if (look(probe, steps)) return;
    }
    const a: Action = s.phase === 'manager' ? { type: 'CHOOSE_MANAGER', managerId: managers[pick] as string } : PERSONAS[persona].choose(s, legalActions(s), rng);
    steps.push(stepOf(s, a, pick));
    const next = reduce(s, a);
    history.push({ id: history.length, action: a, before: s, after: next, events: next.events });
    s = next;
  }
  if (s.phase === 'ended') ended?.(s, steps);
}

const record = (name: string, p: Probe, steps: Step[], seed: number, persona: string, pick: number) => {
  found[name] = {
    seed,
    persona,
    manager: managers[pick] as string,
    steps: [...steps],
    note: `turn ${p.s.turn}, ${p.lane}, fame ${p.fame}, ${p.season}, crisis ${p.model().crisis}, hand ${p.s.hand.length}`,
    hand: p.s.hand.map((h) => h.cardId),
  };
  console.log(name.padEnd(14), found[name].note, persona, seed);
};

// 1. The named states.
const names = Object.keys(TARGETS);
outer: for (let i = 0; i < 1500; i++) {
  for (const persona of PERSONA_IDS) {
    const seed = deriveSeed(4242, i * 16 + PERSONA_IDS.indexOf(persona));
    const pick = (i + PERSONA_IDS.indexOf(persona)) % managers.length;
    play(seed, persona, pick, (p, steps) => {
      for (const [name, test] of Object.entries(TARGETS)) if (!found[name] && test(p)) record(name, p, steps, seed, persona, pick);
      return false;
    });
    if (names.every((n) => found[n])) break outer;
  }
}

// 2. The biggest hand: a player who plays every draw card it holds, then anything, then ends the month.
let best = { size: 0, state: null as DeskState | null };
for (let i = 0; i < 3000 && best.size < 9; i++) {
  const seed = deriveSeed(4242, i) % 4_000_000_000 >>> 0;
  const rng = cursor(seedRng(deriveSeed(seed, 7)));
  const pick = i % managers.length;
  let s: GameState = createInitialState(seed, content, { strict: true });
  const steps: Step[] = [];
  for (let n = 0; s.phase !== 'ended' && n < 1000; n++) {
    if (s.phase === 'play' && s.hand.length > best.size) {
      best = { size: s.hand.length, state: { seed, persona: 'drawseeker', manager: managers[pick] as string, steps: [...steps], note: `turn ${s.turn}, hand ${s.hand.length}`, hand: s.hand.map((h) => h.cardId) } };
    }
    const legal = legalActions(s);
    let a: Action;
    if (s.phase === 'manager') a = { type: 'CHOOSE_MANAGER', managerId: managers[pick] as string };
    else if (s.phase === 'play') {
      const plays = legal.filter((x): x is Extract<Action, { type: 'PLAY_CARD' }> => x.type === 'PLAY_CARD');
      const draws = plays.filter((x) => (getCard(s.content, s.hand.find((c) => c.uid === x.uid)?.cardId ?? '')?.effects ?? []).some((e) => e.op === 'draw'));
      const pool = draws.length ? draws : plays;
      a = pool.length ? (pool[nextInt(rng, pool.length)] as Action) : { type: 'END_TURN' };
    } else {
      const pool = legal.filter((x) => x.type !== 'DRAFT_REROLL' && x.type !== 'DRAFT_EXTRA_PICK');
      a = pool[nextInt(rng, pool.length)] as Action;
    }
    steps.push(stepOf(s, a, pick));
    s = reduce(s, a);
  }
}
if (best.state) {
  found.bigHand = best.state;
  console.log('bigHand'.padEnd(14), best.state.note, best.state.seed);
}

// 3. Every card in some hand: the cards no state above holds, each in the first hand that holds it.
const held = new Set(Object.values(found).flatMap((st) => st.hand));
const cards = (Array.isArray(content.cards) ? content.cards : []).map((c) => c.id).filter((id) => !held.has(id));
cards: for (let i = 0; i < 1500 && cards.some((id) => !found[`card:${id}`]); i++) {
  for (const persona of PERSONA_IDS) {
    const seed = deriveSeed(4243, i * 16 + PERSONA_IDS.indexOf(persona));
    const pick = (i + PERSONA_IDS.indexOf(persona)) % managers.length;
    play(seed, persona, pick, (p, steps) => {
      for (const id of cards) if (!found[`card:${id}`] && p.s.hand.some((h) => h.cardId === id)) record(`card:${id}`, p, steps, seed, persona, pick);
      return false;
    });
    if (cards.every((id) => found[`card:${id}`])) break cards;
  }
}

// 4. Every minor ending: the first run that ends in it, all its steps — the replay stops on the ending screen.
const minors = (content.endings?.minors ?? []).map((m) => m.id);
endings: for (let i = 0; i < 1500 && minors.some((id) => !found[`ending:${id}`]); i++) {
  for (const persona of PERSONA_IDS) {
    const seed = deriveSeed(4244, i * 16 + PERSONA_IDS.indexOf(persona));
    const pick = (i + PERSONA_IDS.indexOf(persona)) % managers.length;
    play(
      seed,
      persona,
      pick,
      () => false,
      (s, steps) => {
        const name = `ending:${s.endingId}`;
        if (!s.endingId || found[name]) return;
        found[name] = { seed, persona, manager: managers[pick] as string, steps: [...steps], note: `the ending ${s.endingId}, ${steps.length} steps`, hand: [] };
        console.log(name.padEnd(28), found[name].note, persona, seed);
      },
    );
    if (minors.every((id) => found[`ending:${id}`])) break endings;
  }
}

// One state a line, so a change to one shows as one line in a diff.
const lines = Object.entries(found).map(([name, st]) => `  ${JSON.stringify(name)}: ${JSON.stringify(st)}`);
writeFileSync(OUT, `{\n${lines.join(',\n')}\n}\n`, 'utf8');
const missing = [
  ...names.filter((n) => !found[n]),
  ...cards.filter((id) => !found[`card:${id}`]).map((id) => `card:${id}`),
  ...minors.filter((id) => !found[`ending:${id}`]).map((id) => `ending:${id}`),
];
console.log(`${Object.keys(found).length} states → ${OUT}${missing.length ? `; not found: ${missing.join(', ')}` : ''}`);
