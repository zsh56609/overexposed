// npm run check:options — the options of round R11b (rules.events.rideAlong / months / memoryDepth, rules.gateSelection):
//   with no option set the game plays exactly as v1.0 (run records identical, with and without the options spelled out as
//   their defaults); ride-along never drops what is due; depth 2 never leaves a slot empty that depth 1 would fill; door
//   draws are a function of the seed, and 'craftHype' always offers one Craft-led and one Hype-led door.
// Real reducer steps through sim/batch.ts runOne, as check/queue.ts runs them; no browser.

import assert from 'node:assert/strict';
import { createInitialState, eventCandidates, freshPool, gateLead, indexContent, legalActions, memoryFor, NO_MEMORY, reduce, type Content, type EventDef, type GameState, type RunMemory } from '../core/index.ts';
import { runOne } from '../sim/batch.ts';
import { loadContent } from '../sim/content.ts';
import { configure, EVENT_CONFIGS } from '../sim/options/configs.ts';
import { PLACEHOLDER_DOORS } from '../sim/options/doors.ts';

const base = loadContent();
const PERSONAS = ['minmaxer', 'random', 'dealseeker', 'artisan'] as const;
const SEEDS = Array.from({ length: 40 }, (_, i) => 1000 + i * 7);
const MANAGERS = (base.managers?.managers ?? []).map((m) => m.id);

const withRules = (c: Content, patch: { events?: object; gateSelection?: 'any' | 'craftHype' }): Content => ({
  ...c,
  rules: { ...c.rules, ...(patch.gateSelection ? { gateSelection: patch.gateSelection } : {}), ...(patch.events ? { events: { ...c.rules.events!, ...patch.events } } : {}) },
});

// 1. Default equals old behaviour: the options spelled out as their defaults change nothing, run by run.
{
  const spelled = withRules(base, { events: { rideAlong: false, memoryDepth: 1 }, gateSelection: 'any' });
  const memory: RunMemory = { events: ['sam_rent', 'mum_sunday', 'juno_hello'], lines: {} };
  let runs = 0;
  for (const persona of PERSONAS)
    for (const manager of MANAGERS)
      for (const seed of SEEDS.slice(0, 10)) {
        for (const options of [{ manager }, { manager, memory }]) {
          const a = runOne(base, persona, seed, undefined, options);
          const b = runOne(spelled, persona, seed, undefined, options);
          assert.equal(a.crash, null);
          assert.equal(JSON.stringify(a), JSON.stringify(b), `defaults spelled out changed ${persona}/${manager}/${seed}`);
          runs++;
        }
      }
  // E0 and D0 are the identity.
  assert.equal(configure(base, 'E0', 'D0'), base, 'E0/D0 must return the content untouched');
  console.log(`defaults: ${runs} runs identical with the options spelled out as defaults; E0/D0 is the identity`);
}

// 2. Ride-along: the month's due follow-up or first-marked one-off still comes first; the second is drawn by its own rules;
// no month has more than two events; and until the first month that gets a second event, a ride-along run is the baseline run.
{
  const ride = configure(base, 'E1', 'D0');
  const cfg = EVENT_CONFIGS.E1!;
  assert.equal(cfg.rideAlong, true);
  let twoEventMonths = 0;
  let followUpFirst = 0;
  let pairs = 0;
  for (const persona of PERSONAS)
    for (const manager of MANAGERS)
      for (const seed of SEEDS) {
        let before: GameState | null = null;
        const rec = runOne(ride, persona, seed, (state) => {
          if (state.phase === 'event' && state.event !== null && (before?.phase !== 'event' || before.event !== state.event)) {
            const second = state.eventLog.some((r) => r.turn === state.turn);
            if (!second) {
              const due = eventCandidates(state);
              if (due.followUp) {
                assert.equal(state.event, due.followUp.id, `a due follow-up must come first (${persona}/${manager}/${seed} month ${state.turn})`);
                followUpFirst++;
              } else if (due.pool.length > 0 && due.pool.every((p) => p.event.when.first === true)) {
                assert.ok(due.pool.some((p) => p.event.id === state.event), 'a due first-marked one-off must come first');
              }
            } else {
              const { pool, followUp } = eventCandidates(state, 'second');
              assert.equal(followUp, null, 'the second event is never a follow-up');
              assert.ok(pool.some((p) => p.event.id === state.event), 'the second event comes from the second pool');
              const first = state.eventLog.filter((r) => r.turn === state.turn);
              assert.equal(first.length, 1, 'at most two events a month');
            }
          }
          before = state;
        }, { manager });
        assert.equal(rec.crash, null, String(rec.crash));
        const byMonth = new Map<number, string[]>();
        for (const e of rec.events) byMonth.set(e.turn, [...(byMonth.get(e.turn) ?? []), e.eventId]);
        for (const ids of byMonth.values()) assert.ok(ids.length <= 2, 'more than two events in a month');
        const firstDouble = [...byMonth].filter(([, ids]) => ids.length === 2).map(([m]) => m).sort((a, b) => a - b)[0];
        twoEventMonths += [...byMonth.values()].filter((ids) => ids.length === 2).length;
        // Up to and including the first double month, the run is the baseline run: nothing due was dropped or reordered.
        const off = runOne(base, persona, seed, undefined, { manager });
        const offByMonth = new Map<number, string>();
        for (const e of off.events) if (!offByMonth.has(e.turn)) offByMonth.set(e.turn, e.eventId);
        for (const [month, ids] of byMonth) {
          if (firstDouble !== undefined && month > firstDouble) continue;
          assert.equal(ids[0], offByMonth.get(month), `${persona}/${manager}/${seed} month ${month}: the first event differs from the baseline run`);
          pairs++;
        }
      }
  assert.ok(twoEventMonths > 0, 'ride-along never produced a second event: the option is not exercised');
  assert.ok(followUpFirst > 0, 'no follow-up came in the sample');
  console.log(`ride-along: ${twoEventMonths} two-event months, ${followUpFirst} due follow-ups all first, ${pairs} first events equal the baseline run's up to the first double month`);
}

// 3. Event months: events come only in the months listed.
{
  for (const id of ['E3', 'E5']) {
    const months = new Set(EVENT_CONFIGS[id]!.months);
    const c = configure(base, id, 'D0');
    let events = 0;
    for (const persona of PERSONAS)
      for (const seed of SEEDS.slice(0, 15)) {
        const rec = runOne(c, persona, seed, undefined, { manager: MANAGERS[0]! });
        assert.equal(rec.crash, null);
        assert.equal(rec.softLock, null);
        for (const e of rec.events) {
          assert.ok(months.has(e.turn), `${id}: event ${e.eventId} in month ${e.turn}`);
          events++;
        }
      }
    assert.ok(events > 0);
  }
  console.log('event months: E3 and E5 runs complete, every event in a listed month');
}

// 4. Memory depth.
{
  // freshPool, by hand: the oldest year is relaxed first, then the next, and a slot is never empty while the pool is not.
  const ev = (id: string): { event: EventDef; weight: number } => ({ event: { id } as EventDef, weight: 1 });
  const ids = (xs: readonly { event: EventDef }[]) => xs.map((x) => x.event.id).join();
  const memory = (events: string[], past?: string[][]): RunMemory => ({ events, lines: {}, ...(past ? { past } : {}) });
  assert.equal(ids(freshPool([ev('a'), ev('b'), ev('c')], memory(['a'], [['b']]), 2).pool), 'c');
  assert.equal(ids(freshPool([ev('a'), ev('b'), ev('c')], memory(['a'], [['b']]), 1).pool), 'b,c');
  const relaxOldest = freshPool([ev('a'), ev('b')], memory(['a'], [['b']]), 2);
  assert.equal(ids(relaxOldest.pool), 'b');
  assert.equal(relaxOldest.relaxed, 1);
  const all = freshPool([ev('a')], memory(['a'], [['a']]), 2);
  assert.equal(ids(all.pool), 'a');
  assert.equal(all.relaxed, 2);
  assert.equal(freshPool([], memory(['a'], [['b']]), 2).relaxed, 0);
  assert.equal(ids(freshPool([ev('a'), ev('b')], memory(['a'], [['b']]), 1).pool), 'b');
  assert.equal(ids(freshPool([ev('a'), ev('b')], NO_MEMORY, 3).pool), 'a,b');
  // memoryFor keeps the past, and leaves out events content no longer has.
  const kept = memoryFor(indexContent(base), memory(['sam_rent', 'gone'], [['mum_sunday', 'gone']]));
  assert.deepEqual(kept.events, ['sam_rent']);
  assert.deepEqual(kept.past, [['mum_sunday']]);
  assert.equal('past' in memoryFor(indexContent(base), memory(['sam_rent'])), false);

  // On real slots: depth 2 never leaves a slot empty that depth 1 would fill, never gives a pool larger than the eligible one,
  // and with no past it is depth 1. Memories are built the way the survey builds them: the events of the last years.
  const deep = withRules(base, { events: { memoryDepth: 2 } });
  let slots = 0;
  let differ = 0;
  for (const persona of PERSONAS)
    for (const seed of SEEDS.slice(0, 20)) {
      const events: string[][] = [];
      let memoryNow: RunMemory | undefined;
      for (let year = 1; year <= 4; year++) {
        const yearMemory = memoryNow;
        let before: GameState | null = null;
        const rec = runOne(deep, persona, seed + year * 100003, (state) => {
          if (state.phase === 'event' && state.event !== null && (before?.phase !== 'event' || before.event !== state.event)) {
            const d2 = eventCandidates(state);
            const d1 = eventCandidates({ ...state, content: { ...state.content, rules: { ...state.content.rules, events: { ...state.content.rules.events!, memoryDepth: 1 } } } });
            const free = eventCandidates({ ...state, memory: NO_MEMORY });
            slots++;
            if (d1.pool.length > 0) assert.ok(d2.pool.length > 0, 'depth 2 left a slot empty that depth 1 fills');
            assert.ok(d2.pool.length <= free.pool.length || d2.followUp !== null || free.followUp !== null);
            if (d2.relaxed === 0) for (const p of d2.pool) assert.ok(d1.pool.some((q) => q.event.id === p.event.id), 'depth 2 pool must lie inside depth 1 pool when nothing is relaxed');
            if (ids(d1.pool) !== ids(d2.pool)) differ++;
            if (!state.memory.past || state.memory.past.length === 0) assert.equal(ids(d1.pool), ids(d2.pool), 'with no past, depth 2 is depth 1');
          }
          before = state;
        }, { manager: MANAGERS[0]!, ...(yearMemory ? { memory: yearMemory } : {}) });
        assert.equal(rec.crash, null);
        const met = rec.events.map((e) => e.eventId);
        events.push(met);
        // The memory after the year: its events, and the year before as the past.
        memoryNow = { events: met, lines: {}, past: events.slice(0, -1).reverse().slice(0, 1) };
      }
    }
  assert.ok(slots > 100 && differ > 0, `depth 2 never differed from depth 1 on ${slots} slots`);
  console.log(`memory depth: freshPool relaxes the oldest year first; ${slots} real slots, depth 2 never emptier than depth 1, ${differ} where it chose differently`);
}

// 5. Doors.
{
  const seasons = [1, 2, 3, 4];
  const doorOffers = (c: Content, seed: number, persona: (typeof PERSONAS)[number]) => {
    const rec = runOne(c, persona, seed, undefined, { manager: MANAGERS[0]! });
    assert.equal(rec.crash, null);
    return rec.gates.map((g) => g.offered.join('+'));
  };
  // Today's doors: both offered, every year.
  const pairs0 = new Set<string>();
  for (const seed of SEEDS) for (const o of doorOffers(base, seed, 'minmaxer')) pairs0.add(o);
  assert.equal(pairs0.size, 4, 'v1.0 offers one fixed pair a season');
  // Placeholders: four doors a season, two offered. Every placeholder keeps its sibling's lead.
  const d1 = configure(base, 'E0', 'D1');
  const d2 = configure(base, 'E0', 'D2');
  for (const act of seasons) assert.equal(d1.gates.filter((g) => g.act === act).length, 4);
  for (const g of d1.gates.filter((x) => x.id.endsWith('_alt'))) assert.equal(gateLead(g), gateLead(d1.gates.find((s) => `${s.id}_alt` === g.id)!), g.id);
  assert.equal(Object.keys(PLACEHOLDER_DOORS).length, 8);
  // Deterministic for a seed.
  for (const c of [d1, d2]) for (const seed of SEEDS.slice(0, 10)) assert.deepEqual(doorOffers(c, seed, 'random'), doorOffers(c, seed, 'random'));
  // D1: any pair (more than one pair appears in a season); D2: always one Craft-led and one Hype-led.
  const seen = new Map<number, Set<string>>();
  let pairs2 = 0;
  for (const persona of PERSONAS)
    for (const seed of SEEDS) {
      const rec1 = runOne(d1, persona, seed, undefined, { manager: MANAGERS[0]! });
      for (const g of rec1.gates) (seen.get(g.act) ?? seen.set(g.act, new Set()).get(g.act)!).add(g.offered.join('+'));
      const rec2 = runOne(d2, persona, seed, undefined, { manager: MANAGERS[0]! });
      for (const g of rec2.gates) {
        assert.equal(g.offered.length, 2);
        const leads = g.offered.map((id) => gateLead(d2.gates.find((x) => x.id === id)!)).sort();
        assert.deepEqual(leads, ['craft', 'hype'], `season ${g.act}: ${g.offered.join(' ')}`);
        pairs2++;
      }
    }
  for (const act of seasons) assert.ok((seen.get(act)?.size ?? 0) > 1, `D1 season ${act} always offered the same pair`);
  console.log(`doors: v1.0 offers 4 fixed pairs; D1 varies the pair in every season; D2 offered a Craft-led and a Hype-led door in all ${pairs2} draws; draws are deterministic`);
}

// An explicit smoke of the reducer: the second event leaves the month's actions as the first left them.
{
  const c = configure(base, 'E1', 'D0');
  let found = 0;
  for (const seed of SEEDS) {
    let state = createInitialState(seed, c, { strict: true });
    while (state.phase !== 'ended') {
      const legal = legalActions(state);
      const action = legal.find((a) => a.type === 'CHOOSE_MANAGER') ?? legal.find((a) => a.type === 'CHOOSE_EVENT' && a.choice === legal.filter((x) => x.type === 'CHOOSE_EVENT').length - 1) ?? legal[0]!;
      const next = reduce(state, action);
      if (state.phase === 'event' && next.phase === 'event' && next.event !== state.event) {
        assert.equal(next.slots, state.slots, 'the second event must not refresh the month\'s actions');
        found++;
      }
      state = next;
    }
    if (found > 3) break;
  }
  assert.ok(found > 0, 'no second event reached');
  console.log(`ride-along: ${found} second events left the month's actions as the first answer left them`);
}

console.log('options: defaults identical, ride-along, event months, memory depth and door pool — PASS');
