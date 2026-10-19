// Events (phase 3; docs/design/content-expansion.md §5; round R2): the world acting on the player. At the start of
// the months rules.events.months lists — after a season's opening card, before the offers and the draw — someone
// texts or a letter arrives, and the player answers. Which event comes is the game's to say, with the game's seeded
// RNG, never the prose's shuffle bags: events change play. Read-only queries here; the reducer applies them.
//
//   1. A follow-up of an open chain whose condition holds and whose first month has come takes the month — the
//      earliest-opened chain first, one a month.
//   2. Otherwise one event is drawn among the eligible openers and one-offs, each by its weight (when.weight, round
//      R7) — an event of the established lane ×rules.events.laneWeight besides. An event comes at most once a run;
//      once rules.events.maxChains chains are open, openers are no longer drawn. The pool first leaves out the events
//      the last run met (its memory, round R7, E3), and falls back to the whole pool only when nothing else is
//      eligible; the memory never holds back a follow-up (step 1).
// An event may name the rival's years it comes in (when.rival, round R7): the run's arc is fixed by its seed.
//   3. Nothing eligible: no event that month.

import { evaluate, explainCondition, type ClauseReport, type ConditionSubject } from './conditions.ts';
import { getEvent, type ContentIndex, type Effect, type EventDef, type EventPressDef, type FlagTest } from './content.ts';
import type { RunMemory } from './memory.ts';
import { rivalArc } from './rival.ts';
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
 * its weight. Both empty outside an event month, or when nothing is eligible.
 */
export function eventCandidates(s: EventSubject): { readonly followUp: EventDef | null; readonly pool: readonly { readonly event: EventDef; readonly weight: number }[] } {
  const c = s.content;
  const rules = c.rules.events;
  if (!rules || !isEventMonth(c, s.turn)) return { followUp: null, pool: [] };
  const met = new Set(s.eventLog.map((r) => r.eventId));
  const arc = rivalArc(c, s.seed)?.id;
  const inYear = (ev: EventDef) => ev.when.rival === undefined || (arc !== undefined && ev.when.rival.includes(arc));
  const eligible = (ev: EventDef) => !met.has(ev.id) && inMonths(c, ev, s.turn) && inYear(ev) && evaluate(ev.when.condition, s);
  const chains = runChains(s);
  for (const chain of chains) {
    if (!chain.open) continue;
    const followUp = c.events.find((ev) => ev.chain?.id === chain.chain && ev.chain.role === 'followUp' && eligible(ev));
    if (followUp) return { followUp, pool: [] };
  }
  const canOpen = chains.length < rules.maxChains;
  const pool = c.events
    .filter((ev) => ev.chain?.role !== 'followUp' && (ev.chain?.role !== 'opener' || canOpen) && eligible(ev))
    .map((event) => ({ event, weight: (event.when.weight ?? 1) * (event.when.lane !== undefined && event.when.lane === s.establishedLane ? rules.laneWeight : 1) }));
  const fresh = s.memory.events.length === 0 ? pool : pool.filter((p) => !s.memory.events.includes(p.event.id));
  return { followUp: null, pool: fresh.length > 0 ? fresh : pool };
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
