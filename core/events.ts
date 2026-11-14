// Events (phase 3; docs/design/content-expansion.md §5; round R2): the world acting on the player. At the start of
// the months rules.events.months lists — after a season's opening card, before the offers and the draw — someone
// texts or a letter arrives, and the player answers. Which event comes is the game's to say, with the game's seeded
// RNG, never the prose's shuffle bags: events change play. Read-only queries here; the reducer applies them.
//
//   1. A follow-up of an open chain whose condition holds and whose first month has come takes the month — the
//      earliest-opened chain first, one a month.
//   2. Otherwise a one-off marked when.first (round R9a, A1; Juno's year-end texts) that can come takes it — several
//      at once are drawn among themselves by weight, as the pool is; the memory never holds one back.
//   3. Otherwise one event is drawn among the eligible openers and one-offs, each by its weight (when.weight, round
//      R7) — an event of the established lane ×rules.events.laneWeight besides. An event comes at most once a run;
//      once rules.events.maxChains chains are open, openers are no longer drawn. The pool first leaves out the events
//      the last run met (its memory, round R7, E3), and falls back to the whole pool only when nothing else is
//      eligible; the memory never holds back a follow-up (step 1) or a first (step 2).
// An event may name the rival's years it comes in (when.rival, round R7): the run's arc is fixed by its seed.
//   4. Nothing eligible: no event that month.
//
// Options (round R11b; both absent in v1.0's content, which then plays as it always did):
//   rules.events.rideAlong — a follow-up (1) or a first-marked one-off (2) still takes the month, and once it is answered
//      the month draws a second event: mode 'second' below. The second is the first-marked one-off when a follow-up took
//      the month and one is due (so nothing due is dropped), else one drawn from the regular pool by step 3's rules.
//      At most two events a month; a month that opened on a regular draw has no second.
//   rules.events.memoryDepth — how many past years the memory holds back (core/memory.ts `past`); see freshPool.

import { evaluate, explainCondition, type ClauseReport, type ConditionSubject } from './conditions.ts';
import { getEvent, type ContentIndex, type Effect, type EventDef, type EventPressDef, type FlagTest } from './content.ts';
import type { RunMemory } from './memory.ts';
import { rivalArc, rivalTerms } from './rival.ts';
import type { EventRecord } from './state.ts';

/** What the event queries read: the condition subject, the run's seed (its rival's year), the established lane, the events met so far. */
export interface EventSubject extends ConditionSubject {
  readonly seed: number;
  /** The memory of the last run (round R7, Part E): the events it met are drawn only when nothing else is eligible. */
  readonly memory: RunMemory;
  readonly establishedLane: string | null;
  readonly eventLog: readonly EventRecord[];
}

export const isEventMonth = (c: ContentIndex, turn: number): boolean => c.rules.events?.months.includes(turn) ?? false;

/** The past years the memory holds back, the most recent first: `events` is the last year's; `past` the years before it. */
export function memoryYears(memory: RunMemory, depth: number): readonly (readonly string[])[] {
  return [memory.events, ...(memory.past ?? [])].slice(0, Math.max(1, depth));
}

/**
 * The pool without the events the memory holds back (round R2, E3; depth since round R11b): leave out those met in any of
 * the last `depth` years while anything else is eligible; when nothing is, relax the oldest year first, down to the last
 * year alone, and only then the whole pool. `relaxed`: how many years were given up (0: the memory held in full).
 * Depth 1 is the rule v1.0 had: the last year's events are left out, unless nothing else is eligible.
 */
export function freshPool<T extends { readonly event: EventDef }>(pool: readonly T[], memory: RunMemory, depth: number): { readonly pool: readonly T[]; readonly relaxed: number } {
  const years = memoryYears(memory, depth);
  for (let k = years.length; k >= 1; k--) {
    const held = new Set(years.slice(0, k).flat());
    const fresh = held.size === 0 ? pool : pool.filter((p) => !held.has(p.event.id));
    if (fresh.length > 0) return { pool: fresh, relaxed: years.length - k };
  }
  return { pool, relaxed: pool.length > 0 ? years.length : 0 };
}

/** What a month may draw: the month's own rules ('month'), the regular pool alone ('regular', read-only: what a new event would compete in), or the second event of a ride-along month ('second'). */
export type CandidateMode = 'month' | 'regular' | 'second';

const inMonths = (c: ContentIndex, ev: EventDef, turn: number): boolean =>
  turn >= ev.when.months.from && turn <= (ev.when.months.to ?? c.rules.acts * c.rules.turnsPerAct);

/** The chains a run has opened, in the order they opened, each still open until one of its follow-ups comes. */
export function runChains(s: Pick<EventSubject, 'content' | 'eventLog'>): { readonly chain: string; readonly turn: number; readonly open: boolean }[] {
  const out: { chain: string; turn: number; open: boolean }[] = [];
  for (const record of s.eventLog) {
    const chain = getEvent(s.content, record.eventId)?.chain;
    if (chain?.role === 'opener') out.push({ chain: chain.id, turn: record.turn, open: true });
    else if (chain?.role === 'followUp') {
      const opened = out.find((x) => x.chain === chain.id);
      if (opened) opened.open = false;
    }
  }
  return out;
}

/**
 * What may come at the start of this month: the follow-up that takes it, or the pool one is drawn from, each with
 * its weight — the one-offs marked first that can come (round R9a), else the eligible openers and one-offs. Both
 * empty outside an event month, or when nothing is eligible.
 */
export function eventCandidates(s: EventSubject, mode: CandidateMode = 'month'): {
  readonly followUp: EventDef | null;
  readonly pool: readonly { readonly event: EventDef; readonly weight: number }[];
  /** Years of the memory given up to fill the pool (0: held in full). */
  readonly relaxed: number;
} {
  const c = s.content;
  const rules = c.rules.events;
  if (!rules || !isEventMonth(c, s.turn)) return { followUp: null, pool: [], relaxed: 0 };
  const met = new Set(s.eventLog.map((r) => r.eventId));
  const arc = rivalArc(c, s.seed)?.id;
  const inYear = (ev: EventDef) => ev.when.rival === undefined || (arc !== undefined && ev.when.rival.includes(arc));
  const eligible = (ev: EventDef) => !met.has(ev.id) && inMonths(c, ev, s.turn) && inYear(ev) && evaluate(ev.when.condition, s);
  const chains = runChains(s);
  if (mode === 'month')
    for (const chain of chains) {
      if (!chain.open) continue;
      const followUp = c.events.find((ev) => ev.chain?.id === chain.chain && ev.chain.role === 'followUp' && eligible(ev));
      if (followUp) return { followUp, pool: [], relaxed: 0 };
    }
  const weighed = (event: EventDef) => ({ event, weight: (event.when.weight ?? 1) * (event.when.lane !== undefined && event.when.lane === s.establishedLane ? rules.laneWeight : 1) });
  // Before the draw (round R9a, A1): a one-off marked first that can come takes the month; the reducer draws among
  // several by weight, as it draws the pool. The memory never holds one back.
  const first = c.events.filter((ev) => ev.when.first === true && ev.chain === undefined && eligible(ev));
  // The second event of a ride-along month: a first-marked one-off still due is never dropped, unless the first event was one.
  const answeredFirst = s.eventLog.some((r) => r.turn === s.turn && getEvent(c, r.eventId)?.when.first === true);
  if (mode === 'month' || (mode === 'second' && !answeredFirst)) if (first.length > 0) return { followUp: null, pool: first.map(weighed), relaxed: 0 };
  const canOpen = chains.length < rules.maxChains;
  const pool = c.events.filter((ev) => ev.chain?.role !== 'followUp' && (ev.chain?.role !== 'opener' || canOpen) && eligible(ev)).map(weighed);
  const fresh = freshPool(pool, s.memory, rules.memoryDepth ?? 1);
  return { followUp: null, pool: fresh.pool, relaxed: fresh.relaxed };
}

/**
 * An event's messages as the run stands (round R9a, A4): a rival text's unmetMessageKeys while the run has answered no
 * rival event (rivalTerms: unmet), else its messageKeys. The event screen reads them in the state the event waits in, so
 * the thread does not change as the answer lands.
 */
export function eventMessageKeys(s: { readonly content: ContentIndex; readonly eventLog: readonly EventRecord[] }, ev: EventDef): readonly string[] {
  return ev.unmetMessageKeys && rivalTerms(s) === 'unmet' ? ev.unmetMessageKeys : ev.messageKeys;
}

/** Whether a choice can be made now — its requirement holds — and, when not, the clauses it still needs. */
export function eventChoiceCheck(s: ConditionSubject, eventId: string, choice: number): { readonly ok: boolean; readonly needs: readonly ClauseReport[] } {
  const def = getEvent(s.content, eventId)?.choices[choice];
  if (!def) return { ok: false, needs: [] };
  if (evaluate(def.requires, s)) return { ok: true, needs: [] };
  return { ok: false, needs: explainCondition(def.requires, s).filter((x) => !x.met) };
}

/** What a choice prints when it is chosen, if anything (round R2, Part D). */
export const eventPress = (c: ContentIndex, eventId: string, choice: number): EventPressDef | null => getEvent(c, eventId)?.choices[choice]?.press ?? null;

/** Flags some event's condition reads: a choice that sets one is remembered — it may come back later. */
export function rememberedFlags(c: ContentIndex): ReadonlySet<string> {
  const flags = new Set<string>();
  const read = (test: FlagTest | undefined) => {
    for (const f of [...(test?.all ?? []), ...(test?.any ?? []), ...(test?.not ?? [])]) flags.add(f);
  };
  for (const ev of c.events) read(ev.when.condition?.flags);
  return flags;
}

/** A choice is "↺ remembered" when it sets a flag some event's condition reads (A4): derived from content. */
export function choiceRemembered(c: ContentIndex, eventId: string, choice: number): boolean {
  const def = getEvent(c, eventId)?.choices[choice];
  if (!def) return false;
  const flags = rememberedFlags(c);
  const sets = (effects: readonly Effect[]): boolean =>
    effects.some((e) => (e.op === 'setFlag' ? flags.has(e.flag) : e.op === 'conditional' ? sets(e.then) || sets(e.else ?? []) : false));
  return sets(def.effects);
}
