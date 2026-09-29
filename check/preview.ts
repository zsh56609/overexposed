// npm run check:preview — the UI's previews (ui/preview.ts) against the real outcome, over a batch of
// seeded states (docs/ui-plan.md §4, §11). A preview must match what actually happens, exactly.
//
// Seeded walks through /core, one per run seed, choosing like the random persona (any playable card
// before ending the turn), so play reaches heat, crossings, gates and endings. At every state the check
// takes each action the UI previews and compares the preview with the action's real result:
//   play phase — every card in hand, and END_TURN; gate phase — every offered gate; draft phase — the
//   live requirement of every card on offer.
// Exit code 1 on any mismatch.

import {
  createInitialState,
  cursor,
  deriveSeed,
  evaluate,
  explainCondition,
  getCard,
  getGate,
  heatLine,
  legalActions,
  nextInt,
  reduce,
  RESOURCE_KEYS,
  seedRng,
  type Action,
  type Content,
  type GameEvent,
  type GameState,
} from '../core/index.ts';
import { validateContent } from '../validate/validate.ts';
import { loadRawContent } from '../validate/load.ts';
import { addedBy, outcomeOf, previewDraftCard, previewEndTurn, previewGate, previewPlay } from '../ui/preview.ts';

const RUNS = Number(process.argv.find((a) => a.startsWith('--runs='))?.slice(7) ?? 300);
const SEED = 20260929;

const raw = loadRawContent();
const errors = validateContent(raw).issues.filter((i) => i.level === 'error');
if (errors.length > 0) throw new Error('content fails validation; run npm run validate');
const content = raw as Content;

let mismatches = 0;
const counts = { states: 0, plays: 0, blocked: 0, endTurns: 0, gates: 0, draftCards: 0, crossings: 0, monthEndScandals: 0, copies: 0, finalGates: 0 };
const report = (what: string, seed: number, turn: number, detail: string) => {
  mismatches++;
  if (mismatches <= 20) console.log(`MISMATCH ${what}  seed=${seed} turn=${turn}  ${detail}`);
};
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const turnEndOf = (events: readonly GameEvent[]) => events.find((e) => e.type === 'turnEnd');

function checkPlayPhase(s: GameState, seed: number): void {
  const legal = new Set(legalActions(s).flatMap((a) => (a.type === 'PLAY_CARD' ? [a.uid] : [])));
  for (const card of s.hand) {
    const p = previewPlay(s, card.uid);
    if (p.ok !== legal.has(card.uid)) report('playable', seed, s.turn, `${card.cardId}: preview ok=${p.ok}, legal=${legal.has(card.uid)}`);
    if (!p.ok) {
      counts.blocked++;
      if (p.blockers.length === 0) report('blockers', seed, s.turn, `${card.cardId}: unplayable with no reason`);
      const def = getCard(s.content, card.cardId);
      const requires = p.blockers.find((b) => b.code === 'requires');
      if (requires && evaluate(def?.requires, s)) report('blockers', seed, s.turn, `${card.cardId}: 'requires' blocker but requires holds`);
      continue;
    }
    counts.plays++;
    const real = reduce(s, { type: 'PLAY_CARD', uid: card.uid });
    const o = p.outcome;
    if (!o) {
      report('outcome', seed, s.turn, `${card.cardId}: playable preview without an outcome`);
      continue;
    }
    for (const k of RESOURCE_KEYS) {
      const delta = real.resources[k] - s.resources[k];
      if (o.deltas[k] !== delta) report('delta', seed, s.turn, `${card.cardId} ${k}: preview ${o.deltas[k]}, real ${delta}`);
    }
    if (p.heatAfter !== real.resources.heat) report('heat', seed, s.turn, `${card.cardId}: preview ${p.heatAfter}, real ${real.resources.heat}`);
    if (p.slotsAfter !== real.slots) report('slots', seed, s.turn, `${card.cardId}: preview ${p.slotsAfter}, real ${real.slots}`);
    if (!same(p.lineAfter, heatLine(real))) report('heat line', seed, s.turn, `${card.cardId}: preview ${JSON.stringify(p.lineAfter)}, real ${JSON.stringify(heatLine(real))}`);
    // The whole outcome — draws, cards added and removed, flags — as the real play's events tell it.
    if (!same(o, outcomeOf(real.events))) report('outcome', seed, s.turn, `${card.cardId}: preview ${JSON.stringify(o)}, real ${JSON.stringify(outcomeOf(real.events))}`);
    const newFlags = Object.keys(real.flags).filter((f) => !Object.hasOwn(s.flags, f));
    if (!same([...o.flags].sort(), newFlags.sort())) report('flags', seed, s.turn, `${card.cardId}: preview ${o.flags}, real ${newFlags}`);
    // The crossing: what ending the turn right after this card really crystallises.
    const end = turnEndOf(reduce(real, { type: 'END_TURN' }).events);
    const realAfter = end?.type === 'turnEnd' ? end.crystallised : -1;
    if (p.endTurnAfter?.crystallised !== realAfter) report('crossing', seed, s.turn, `${card.cardId}: preview ${p.endTurnAfter?.crystallised}, real ${realAfter}`);
    if (p.linesCrossed !== 0) counts.crossings++;
  }
  // END_TURN
  counts.endTurns++;
  const pe = previewEndTurn(s);
  const real = reduce(s, { type: 'END_TURN' });
  const end = turnEndOf(real.events);
  if (!pe || end?.type !== 'turnEnd') {
    report('endTurn', seed, s.turn, 'no preview or no turnEnd');
    return;
  }
  if (pe.crystallised !== end.crystallised) report('endTurn', seed, s.turn, `crystallised preview ${pe.crystallised}, real ${end.crystallised}`);
  for (const k of RESOURCE_KEYS) {
    const delta = end.resources[k] - s.resources[k];
    if (pe.outcome.deltas[k] !== delta) report('endTurn delta', seed, s.turn, `${k}: preview ${pe.outcome.deltas[k]}, real ${delta}`);
  }
  const scandals = real.events.flatMap((e) => (e.type === 'scandal' ? [e.cardId] : []));
  if (!same(pe.outcome.scandals, scandals)) report('endTurn scandals', seed, s.turn, `preview ${pe.outcome.scandals}, real ${scandals}`);
  // Every scandal card month end adds, from any cause, with its cause (decision 2): read off the real events.
  const head = real.events.slice(0, real.events.indexOf(end) + 1);
  const blamed = new Map(head.flatMap((e) => (e.type === 'scandal' ? [[e.uid, e.cause] as const] : [])));
  const realCards = head.flatMap((e) =>
    e.type === 'addCard' && getCard(s.content, e.cardId)?.kind === 'scandal'
      ? [{ cardId: e.cardId, cause: blamed.has(e.uid) ? { kind: 'crystallised', cardId: blamed.get(e.uid) ?? null } : { kind: 'added', byCardId: addedBy(s, e.cardId) } }]
      : [],
  );
  if (!same(pe.scandalCards, realCards)) report('endTurn scandal cards', seed, s.turn, `preview ${JSON.stringify(pe.scandalCards)}, real ${JSON.stringify(realCards)}`);
  if (pe.heatAfter !== end.resources.heat) report('endTurn carry', seed, s.turn, `preview ${pe.heatAfter}, real ${end.resources.heat}`);
  counts.monthEndScandals += realCards.length;
  counts.copies += realCards.filter((x) => x.cause.kind === 'added').length;
  // The preview never reveals the next turn's draw.
  if (pe.outcome.drawn !== 0) report('endTurn leak', seed, s.turn, `preview reports ${pe.outcome.drawn} next-turn draws`);
}

function checkGatePhase(s: GameState, seed: number): void {
  for (const gateId of s.gateOffer) {
    counts.gates++;
    const p = previewGate(s, gateId);
    const real = reduce(s, { type: 'CHOOSE_GATE', gateId });
    const gate = real.events.find((e) => e.type === 'gate');
    const passed = gate?.type === 'gate' && gate.passed;
    if (p.passes !== passed) report('gate', seed, s.turn, `${gateId}: preview passes=${p.passes}, real ${passed}`);
    // The final gate names the ending it leads to (decision 11); every other gate leads to none.
    const ending = real.events.find((e) => e.type === 'ending');
    const realEnding = ending?.type === 'ending' ? ending.endingId : null;
    if (p.endingId !== realEnding) report('gate ending', seed, s.turn, `${gateId}: preview ${p.endingId}, real ${realEnding}`);
    if (realEnding !== null) counts.finalGates++;
    if (p.clauses.every((c) => c.met) !== evaluate(getGate(s.content, gateId)?.requires, s)) report('gate clauses', seed, s.turn, `${gateId}: clauses disagree with evaluate`);
    // Independent of the events: the next season opens on its draft (or the run ends) before anything
    // else can touch resources, so the real state diff is exactly the gate's branch.
    if (real.phase === 'draft' || real.phase === 'ended') {
      for (const k of RESOURCE_KEYS) {
        const delta = real.resources[k] - s.resources[k];
        if (p.outcome.deltas[k] !== delta) report('gate delta', seed, s.turn, `${gateId} ${k}: preview ${p.outcome.deltas[k]}, real ${delta}`);
      }
    } else report('gate delta', seed, s.turn, `${gateId}: next season did not open on a draft (${real.phase})`);
  }
}

function checkDraftPhase(s: GameState, seed: number): void {
  for (const cardId of s.draft?.offer ?? []) {
    counts.draftCards++;
    const clauses = previewDraftCard(s, cardId);
    if (clauses.every((c) => c.met) !== evaluate(getCard(s.content, cardId)?.requires, s)) report('draft clauses', seed, s.turn, `${cardId}: clauses disagree with evaluate`);
    if (!same(clauses, explainCondition(getCard(s.content, cardId)?.requires, s))) report('draft clauses', seed, s.turn, `${cardId}: not /core's explanation`);
  }
}

/** The random persona's choice: any playable card before ending the turn; otherwise any legal action. */
function choose(s: GameState, rng: ReturnType<typeof cursor>): Action {
  const legal = legalActions(s);
  const plays = s.phase === 'play' ? legal.filter((a) => a.type === 'PLAY_CARD') : [];
  const pool = plays.length > 0 ? plays : legal;
  return pool[nextInt(rng, pool.length)] as Action;
}

const t0 = performance.now();
for (let i = 0; i < RUNS; i++) {
  const seed = deriveSeed(SEED, i);
  const rng = cursor(seedRng(deriveSeed(seed, 0x75693121)));
  let s = createInitialState(seed, content, { strict: true });
  for (let steps = 0; s.phase !== 'ended' && steps < 1000; steps++) {
    counts.states++;
    if (s.phase === 'play') checkPlayPhase(s, seed);
    else if (s.phase === 'gate') checkGatePhase(s, seed);
    else if (s.phase === 'draft') checkDraftPhase(s, seed);
    s = reduce(s, choose(s, rng));
  }
  if (s.phase !== 'ended') report('walk', seed, s.turn, 'run did not end');
}

console.log(
  `preview check: ${RUNS} seeded runs, ${counts.states} states — ${counts.plays} card plays (${counts.crossings} cross or cool a line), ` +
    `${counts.blocked} unplayable cards, ${counts.endTurns} end turns (${counts.monthEndScandals} month-end scandal cards, ${counts.copies} of them copies), ` +
    `${counts.gates} gate choices (${counts.finalGates} final, naming an ending), ${counts.draftCards} draft offers ` +
    `(${((performance.now() - t0) / 1000).toFixed(1)}s)`,
);
console.log(mismatches === 0 ? 'PASS: every preview matched the real outcome' : `FAIL: ${mismatches} mismatch(es)`);
process.exitCode = mismatches === 0 ? 0 : 1;
