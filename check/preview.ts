// npm run check:preview — the UI's previews (ui/preview.ts) against the real outcome, over a batch of
// seeded states (docs/ui-plan.md §4, §11). A preview must match what actually happens, exactly.
//
// Seeded walks through /core, one per run seed, choosing like the random persona (any playable card
// before ending the turn), so play reaches heat, crossings, gates and endings. At every state the check
// takes each action the UI previews and compares the preview with the action's real result:
//   play phase — every card in hand (its outcome, and its headline against the feed's), and END_TURN;
//   gate phase — every offered gate, and at the final gate the ending (major and minor) and awards each
//                option predicts;
//   draft phase — the live requirement of every card on offer;
//   every state — the stat bar's tiers, and the goals board: the major the marker names is the one major
//                whose requirements all show met.
// Exit code 1 on any mismatch.

import {
  bagIndex,
  createInitialState,
  cursor,
  deriveSeed,
  endingIfYearEndedNow,
  evaluate,
  explainCondition,
  frontPages,
  getCard,
  getGate,
  heatLine,
  legalActions,
  majorOf,
  majorRequirements,
  nextInt,
  readLines,
  reduce,
  RESOURCE_KEYS,
  seedRng,
  statTiers,
  yearAwards,
  type Action,
  type Content,
  type GameEvent,
  type GameState,
} from '../core/index.ts';
import { validateContent } from '../validate/validate.ts';
import { loadRawContent } from '../validate/load.ts';
import { addedBy, outcomeOf, previewDraftCard, previewEndTurn, previewGate, previewPlay } from '../ui/preview.ts';
import { feedLines } from '../ui/feed.ts';
import type { PlayedStep } from '../ui/queue.ts';
import { lineText } from '../ui/text.ts';

const RUNS = Number(process.argv.find((a) => a.startsWith('--runs='))?.slice(7) ?? 300);
const SEED = 20260929;

const raw = loadRawContent();
const errors = validateContent(raw).issues.filter((i) => i.level === 'error');
if (errors.length > 0) throw new Error('content fails validation; run npm run validate');
const content = raw as Content;

let mismatches = 0;
const counts = { pages: 0, months: 0, states: 0, plays: 0, blocked: 0, endTurns: 0, gates: 0, draftCards: 0, crossings: 0, monthEndScandals: 0, copies: 0, finalGates: 0, headlines: 0, eitherWay: 0, awardsShown: 0, tierStates: 0 };
const report = (what: string, seed: number, turn: number, detail: string) => {
  mismatches++;
  if (mismatches <= 20) console.log(`MISMATCH ${what}  seed=${seed} turn=${turn}  ${detail}`);
};
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const turnEndOf = (events: readonly GameEvent[]) => events.find((e) => e.type === 'turnEnd');

/**
 * What the real feed code prints for a hypothetical next step, read off the whole history as the UI's queue
 * holds it: a line's variant depends on every showing before it (decision 15, revised).
 */
function feedFor(history: readonly PlayedStep[], action: Action, s: GameState, real: GameState) {
  const id = (history.at(-1)?.id ?? 0) + 1;
  return feedLines([...history, { id, action, before: s, after: real, events: real.events }]).filter((l) => l.id.startsWith(`${id}.`));
}

function checkPlayPhase(s: GameState, seed: number, history: readonly PlayedStep[]): void {
  const legal = new Set(legalActions(s).flatMap((a) => (a.type === 'PLAY_CARD' ? [a.uid] : [])));
  const lines = readLines(history);
  for (const card of s.hand) {
    const p = previewPlay(s, card.uid, lines);
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
    // Decision 21: the headline the preview leads with is the one the feed prints once the card is played —
    // the real feed code, run on the whole history and the real step, so the variant is the same too.
    // Paper, subject and variant, each as the feed prints them (phase 2a, D6).
    const shown = lineText(s.content, p.headline, card.cardId, p.press?.subjectKey ?? null);
    const line = feedFor(history, { type: 'PLAY_CARD', uid: card.uid }, s, real).find((l) => l.kind === 'headline');
    if (shown !== line?.text) report('headline', seed, s.turn, `${card.cardId}: preview ${JSON.stringify(shown)}, feed ${JSON.stringify(line?.text)}`);
    if ((p.headline?.key ?? null) !== line?.key) report('headline variant', seed, s.turn, `${card.cardId}: preview ${p.headline?.key}, feed ${line?.key}`);
    if ((p.press?.paper ?? null) !== line?.paper) report('headline paper', seed, s.turn, `${card.cardId}: preview ${p.press?.paper}, feed ${line?.paper}`);
    if ((p.press?.subjectKey ?? null) !== line?.subjectKey) report('headline subject', seed, s.turn, `${card.cardId}: preview ${p.press?.subjectKey}, feed ${line?.subjectKey}`);
    counts.headlines++;
  }
  // END_TURN
  counts.endTurns++;
  const pe = previewEndTurn(s, lines.counter);
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
  const previewed = pe.scandalCards.map(({ cardId, cause }) => ({ cardId, cause }));
  if (!same(previewed, realCards)) report('endTurn scandal cards', seed, s.turn, `preview ${JSON.stringify(previewed)}, real ${JSON.stringify(realCards)}`);
  // Each scandal's headline in the preview is the one the feed leads the month end with, variant and all.
  const leads = feedFor(history, { type: 'END_TURN' }, s, real).filter((l) => l.kind === 'lead').map((l) => [l.text, l.paper, l.subjectKey]);
  const previewLeads = pe.scandalCards.map((x) => [lineText(s.content, x.line, x.cardId, x.press.subjectKey), x.press.paper, x.press.subjectKey]);
  if (!same(previewLeads, leads)) report('endTurn headlines', seed, s.turn, `preview ${JSON.stringify(previewLeads)}, feed ${JSON.stringify(leads)}`);
  if (pe.heatAfter !== end.resources.heat) report('endTurn carry', seed, s.turn, `preview ${pe.heatAfter}, real ${end.resources.heat}`);
  // Heat carries into a next month unless this month end leads straight to the year's end.
  const yearEnds = real.phase === 'gate' && reduce(real, { type: 'CHOOSE_GATE', gateId: real.gateOffer[0] ?? '' }).phase === 'ended';
  if (pe.carries === yearEnds) report('endTurn carries', seed, s.turn, `preview carries=${pe.carries}, but the year ${yearEnds ? 'ends' : 'goes on'}`);
  counts.monthEndScandals += realCards.length;
  counts.copies += realCards.filter((x) => x.cause.kind === 'added').length;
  // The preview never reveals the next turn's draw.
  if (pe.outcome.drawn !== 0) report('endTurn leak', seed, s.turn, `preview reports ${pe.outcome.drawn} next-turn draws`);
}

function checkGatePhase(s: GameState, seed: number): void {
  const predicted: string[] = [];
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
    // Named as major · minor: the major is the real minor's own major.
    const realMajor = realEnding === null ? null : (majorOf(real.content, realEnding) ?? 'unknown');
    if (p.majorId !== realMajor) report('gate major', seed, s.turn, `${gateId}: preview ${p.majorId}, real ${realMajor}`);
    if (realEnding !== null) counts.finalGates++;
    // ...and the awards it brings (decision 23): those of the real finished year.
    const realAwards = real.phase === 'ended' ? yearAwards(real) : null;
    if (!same(p.awardIds, realAwards)) report('gate awards', seed, s.turn, `${gateId}: preview ${JSON.stringify(p.awardIds)}, real ${JSON.stringify(realAwards)}`);
    predicted.push(`${p.majorId}:${p.endingId}|${(p.awardIds ?? []).join()}`);
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
  // A final gate (decision 23): the ending said once when every option gives the same one ("either way"),
  // and each option's awards shown only when the options bring different ones.
  if (predicted.length > 1 && !predicted.some((x) => x.startsWith('null:'))) {
    if (new Set(predicted.map((x) => x.split('|')[0])).size === 1) counts.eitherWay++;
    if (new Set(predicted.map((x) => x.split('|')[1])).size > 1) counts.awardsShown++;
  }
}

/**
 * The goals board (design §1.5): the marker's major, from /core's endingIfYearEndedNow, is the one major
 * whose requirements all show met — the board and its marker can never point at different corners.
 */
function checkGoals(s: GameState, seed: number): void {
  const today = endingIfYearEndedNow(s);
  const met = s.content.majors.filter((m) => majorRequirements(m, s, true).every((c) => c.met)).map((m) => m.id);
  if (today === null || met.length !== 1 || met[0] !== today.majorId) report('goals', seed, s.turn, `marker ${today?.majorId}, requirements met for [${met.join()}]`);
  else if (majorOf(s.content, today.minorId) !== today.majorId) report('goals', seed, s.turn, `minor ${today.minorId} is not under ${today.majorId}`);
}

/**
 * The stat bar's tiers (decision 25), at every state: hype's and craft's tier brackets the value, and heat's
 * pressure tier agrees with the heat display on whether a line is crossed — two surfaces, one answer.
 */
function checkTiers(s: GameState, seed: number): void {
  counts.tierStates++;
  const tiers = statTiers(s);
  const rules = s.content.rules.tiers;
  for (const stat of ['hype', 'craft'] as const) {
    const bounds = rules?.[stat]?.from;
    const tier = tiers[stat];
    if (!bounds || !tier) {
      report('tier', seed, s.turn, `${stat}: no tier`);
      continue;
    }
    const value = s.resources[stat];
    if (value < (bounds[tier.index] ?? 0) || value >= (bounds[tier.index + 1] ?? Infinity)) report('tier', seed, s.turn, `${stat} ${value} shown as tier ${tier.index + 1}`);
  }
  const heat = tiers.heat;
  const below = rules?.heat?.toGoAtLeast.length;
  if (!heat || below === undefined) return report('tier', seed, s.turn, 'heat: no tier');
  const line = heatLine(s);
  if ((heat.index > below) !== line.crossed) report('heat tier', seed, s.turn, `tier ${heat.index + 1} but the display says crossed=${line.crossed}`);
}

function checkDraftPhase(s: GameState, seed: number): void {
  for (const cardId of s.draft?.offer ?? []) {
    counts.draftCards++;
    const clauses = previewDraftCard(s, cardId);
    if (clauses.every((c) => c.met) !== evaluate(getCard(s.content, cardId)?.requires, s)) report('draft clauses', seed, s.turn, `${cardId}: clauses disagree with evaluate`);
    if (!same(clauses, explainCondition(getCard(s.content, cardId)?.requires, s))) report('draft clauses', seed, s.turn, `${cardId}: not /core's explanation`);
  }
}

/**
 * The front pages (Part E, E11) are a pure function of state and history: composing a month twice from the
 * same history gives the same page, and a month's page is the same whether it is composed at its own month
 * end or at the year's end — nothing later rewrites it.
 */
function checkPages(history: readonly PlayedStep[], seed: number): void {
  const final = frontPages(history);
  if (!same(final, frontPages(history))) report('page purity', seed, 12, 'composing the same history twice gave different pages');
  for (const month of final) {
    counts.months++;
    const atTheTime = frontPages(history.slice(0, month.step + 1)).at(-1);
    if (!same(atTheTime, month)) report('page purity', seed, month.turn, `month ${month.turn}: composed at its end differs from composed at the year's end`);
    counts.pages += month.pages.length;
    // Every page is full, and the lead paper holds the player's most prominent story (or is the default).
    for (const fp of month.pages) if (fp.items.length !== (history[0]?.after.content.press?.page?.slots.length ?? 0)) report('page', seed, month.turn, `${fp.paper}: ${fp.items.length} stories`);
  }
}

/** The random persona's choice: any playable card before ending the turn; otherwise any legal action. */
function choose(s: GameState, rng: ReturnType<typeof cursor>): Action {
  const legal = legalActions(s);
  const plays = s.phase === 'play' ? legal.filter((a) => a.type === 'PLAY_CARD') : [];
  const pool = plays.length > 0 ? plays : legal;
  return pool[nextInt(rng, pool.length)] as Action;
}

/**
 * The shuffle bag's promises (decision 15, revised), for every group size content can have: within a cycle
 * every variant once; across a reshuffle never the same line twice in a row.
 */
function checkBags(): number {
  let sequences = 0;
  for (let size = 1; size <= 8; size++) {
    for (let k = 0; k < 200; k++) {
      const seed = deriveSeed(SEED, k);
      const group = `check:${size}:${k}`;
      const seq = Array.from({ length: size * 6 }, (_, n) => bagIndex(seed, group, n, size));
      for (let c = 0; c < 6; c++) {
        const cycle = seq.slice(c * size, (c + 1) * size);
        if (new Set(cycle).size !== size) report('bag cycle', seed, 0, `size ${size}: cycle ${c} is ${cycle.join(',')}`);
      }
      if (size > 1 && seq.some((x, n) => n > 0 && x === seq[n - 1])) report('bag repeat', seed, 0, `size ${size}: the same variant twice in a row in ${seq.join(',')}`);
      sequences++;
    }
  }
  return sequences;
}

const t0 = performance.now();
const bagSequences = checkBags();
for (let i = 0; i < RUNS; i++) {
  const seed = deriveSeed(SEED, i);
  const rng = cursor(seedRng(deriveSeed(seed, 0x75693121)));
  let s = createInitialState(seed, content, { strict: true });
  // The run's history as the UI's queue holds it: every step, oldest first.
  const history: PlayedStep[] = [{ id: 1, action: null, before: null, after: s, events: s.events }];
  for (let steps = 0; s.phase !== 'ended' && steps < 1000; steps++) {
    counts.states++;
    checkTiers(s, seed);
    checkGoals(s, seed);
    if (s.phase === 'play') checkPlayPhase(s, seed, history);
    else if (s.phase === 'gate') checkGatePhase(s, seed);
    else if (s.phase === 'draft') checkDraftPhase(s, seed);
    const action = choose(s, rng);
    const next = reduce(s, action);
    history.push({ id: history.length + 1, action, before: s, after: next, events: next.events });
    s = next;
  }
  if (s.phase !== 'ended') report('walk', seed, s.turn, 'run did not end');
  checkPages(history, seed);
}

console.log(
  `preview check: ${RUNS} seeded runs, ${counts.states} states — ${counts.plays} card plays (${counts.crossings} cross or cool a line, ${counts.headlines} headlines matched to the feed), ` +
    `${counts.blocked} unplayable cards, ${counts.endTurns} end turns (${counts.monthEndScandals} month-end scandal cards, ${counts.copies} of them copies), ` +
    `${counts.gates} gate choices (${counts.finalGates} final, naming an ending (major · minor) and its awards; ${counts.eitherWay} final gates said "either way", ` +
    `${counts.awardsShown} showed each option's awards), ${counts.draftCards} draft offers, stat tiers and the goals board at ${counts.tierStates} states, ` +
    `${bagSequences} shuffle-bag sequences, ${counts.months} months of front pages (${counts.pages} pages) recomposed ` +
    `(${((performance.now() - t0) / 1000).toFixed(1)}s)`,
);
console.log(mismatches === 0 ? 'PASS: every preview matched the real outcome' : `FAIL: ${mismatches} mismatch(es)`);
process.exitCode = mismatches === 0 ? 0 : 1;
