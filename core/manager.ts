// The managers (design §3.2, round 2b): what the chosen manager says each month, and the line for their
// month-end perk. Derived from the run's history like the front pages — read-only queries, never state and
// never a GameEvent — so the same history always gives the same messages. Ids, keys and numbers only; /ui
// renders the words.
//
// A month's messages arrive as it opens: the manager reacts to what the month before brought — its scandals,
// its paper, the season's gate — and a new season opens with a check-in. The first month opens with the
// opening line. What the year's last month brings is never messaged: the ending speaks instead.

import { getManager, RESOURCE_KEYS, type MessageTrigger, type ResourceKey } from './content.ts';
import { endingIfYearEndedNow } from './endings.ts';
import { establishedLanes } from './lanes.ts';
import type { HistoryStep } from './lines.ts';
import { frontPages, pressLines } from './press.ts';
import type { GameEvent } from './state.ts';
import { statTiers } from './tiers.ts';
import { bagKey } from './variants.ts';

/** The line group of a manager's lines for a trigger line key ("checkin.breakthrough", "opening"). */
export const messageGroup = (managerId: string, lineKey: string): string => `manager:${managerId}:${lineKey}`;
/** The line group of a manager's month-end perk line. */
export const monthEndGroup = (managerId: string): string => `monthEnd:${managerId}`;

export interface ManagerMessage {
  readonly trigger: MessageTrigger;
  /** The trigger's line key: its suffix names the case ("first_scandal.high", "lane.music", "checkin.long_game"). */
  readonly lineKey: string;
  /** Its line group on the shuffle bag, how many times it was shown before, and the variant's key. */
  readonly group: string;
  readonly show: number;
  /** Null when the manager has no lines for it (a content gap validate reports). */
  readonly key: string | null;
}

export interface MonthMessages {
  /** The month they arrive in — as it opens. */
  readonly turn: number;
  readonly act: number;
  /** Where that month opens in history: the step, and its opening event (draftOffer or turnStart) in it. */
  readonly step: number;
  readonly event: number;
  readonly manager: string;
  /** At most messages.perMonth, the highest priority first. */
  readonly messages: readonly ManagerMessage[];
  /** Every trigger line key that fired for the month, before the cap, the highest priority first. */
  readonly fired: readonly string[];
}

/**
 * The month a step's event opens, if it opens one: a turn's first event is its draft offer, or its turnStart
 * when it has no draft. A reroll's new offer opens nothing (its month is already open).
 */
function opens(e: GameEvent, step: HistoryStep, opened: number): number | null {
  const month = e.type === 'turnStart' ? e.turn : e.type === 'draftOffer' ? step.after.turn : null;
  return month !== null && month > opened ? month : null;
}

/** A trigger at a place in history: step and event (the step's end for a trigger read from its state). */
interface Fired {
  readonly trigger: MessageTrigger;
  readonly lineKey: string;
  readonly step: number;
  readonly event: number;
}

/** The manager's messages for every month opened so far (design §3.2): a pure function of the run's history. */
export function managerMessages(history: readonly HistoryStep[]): MonthMessages[] {
  const first = history[0]?.after;
  const rules = first?.content.managers?.messages;
  if (!first || !rules) return [];
  const c = first.content;
  const seed = first.seed;
  const perAct = c.rules.turnsPerAct;
  const low = (tier: number) => (tier >= rules.highFrom ? 'high' : 'low');

  // Every trigger, where it fires.
  const fired: Fired[] = [];
  const at = (trigger: MessageTrigger, lineKey: string, step: number, event: number) => fired.push({ trigger, lineKey, step, event });
  const firstScandal = pressLines(history).find((l) => l.kind === 'scandal');
  if (firstScandal) at('first_scandal', `first_scandal.${low(firstScandal.fameTier)}`, firstScandal.step, firstScandal.event);
  for (const month of frontPages(history)) {
    const end = (history[month.step]?.events ?? []).findIndex((e) => e.type === 'turnEnd');
    if (month.frenzy) at('frenzy', `frenzy.${low(month.fameTier)}`, month.step, end);
    if (month.pages.some((fp) => fp.items.some((i) => i.kind === 'rival' && i.slot === 'lead'))) at('rival', 'rival', month.step, end);
  }
  const axis = c.axes.find((a) => a.id === rules.knownAxis);
  const knownOn = axis && (RESOURCE_KEYS as readonly string[]).includes(axis.key) ? (axis.key as ResourceKey) : null;
  let known = false;
  let hot = 0;
  let lane: string | null = null;
  const lanes = establishedLanes(history);
  history.forEach((step, i) => {
    step.events.forEach((e, j) => {
      if (e.type === 'resource' && !known && knownOn !== null && e.target === knownOn && axis && e.value >= axis.from) {
        known = true;
        at('known', 'known', i, j);
      } else if (e.type === 'flag' && e.flag === rules.signedFlag) at('signed', 'signed', i, j);
      else if (e.type === 'flag' && e.flag === rules.viralFlag) at('viral', 'viral', i, j);
      else if (e.type === 'gate') at(e.passed ? 'gate_passed' : 'gate_failed', e.passed ? 'gate_passed' : 'gate_failed', i, j);
      else if (e.type === 'turnEnd') {
        // Heat at the month's end, as its check left it: at a pressure tier over the line, months running.
        const heat = statTiers({ ...step.after, act: e.act, turn: e.turn, resources: e.resources }).heat;
        hot = heat !== null && heat.index >= rules.stuck.heatTierFrom ? hot + 1 : 0;
        if (hot === rules.stuck.months) at('stuck', 'stuck', i, j);
      }
    });
    // The established lane: the first it becomes, and each lane it changes to (a fall back to early and a
    // return to the same lane is no change).
    const now = lanes[i] ?? null;
    if (now !== null && now !== lane) {
      lane = now;
      at('lane', `lane.${now}`, i, step.events.length);
    }
  });

  // The months as they open: each gathers what fired since the last opened, plus its own opening triggers.
  const months: MonthMessages[] = [];
  const shown = new Map<string, number>();
  const priority = (t: MessageTrigger) => {
    const p = rules.priority.indexOf(t);
    return p === -1 ? rules.priority.length : p;
  };
  const byPlace = [...fired].sort((a, b) => a.step - b.step || a.event - b.event);
  let next = 0;
  let opened = 0;
  history.forEach((step, i) => {
    step.events.forEach((e, j) => {
      const month = opens(e, step, opened);
      if (month === null) return;
      opened = month;
      const manager = getManager(c, step.after.manager);
      const due = new Map<MessageTrigger, string>();
      while (next < byPlace.length && ((byPlace[next] as Fired).step < i || ((byPlace[next] as Fired).step === i && (byPlace[next] as Fired).event <= j))) {
        const f = byPlace[next++] as Fired;
        due.set(f.trigger, f.lineKey); // the latest of a kind stands (a lane changed twice in a month)
      }
      if (month === 1) due.set('opening', 'opening');
      if (month > 1 && (month - 1) % perAct === 0) {
        const major = endingIfYearEndedNow(step.after)?.majorId;
        if (major) due.set('checkin', `checkin.${major}`);
      }
      if (!manager) return;
      const ranked = [...due].sort(([a], [b]) => priority(a) - priority(b));
      const messages = ranked.slice(0, rules.perMonth).map(([trigger, lineKey]): ManagerMessage => {
        const group = messageGroup(manager.id, lineKey);
        const n = shown.get(group) ?? 0;
        shown.set(group, n + 1);
        return { trigger, lineKey, group, show: n, key: bagKey(manager.lines[lineKey], seed, group, n) };
      });
      months.push({
        turn: month,
        act: Math.ceil(month / perAct),
        step: i,
        event: j,
        manager: manager.id,
        messages,
        fired: ranked.map(([, lineKey]) => lineKey),
      });
    });
  });
  return months;
}

/**
 * A month end's manager effects, in a step's events: after its turnEnd, up to the next month's opening, the
 * season's gate, or the ending (the reducer's order: core/reducer.ts endTurn).
 */
export function monthEndEffects(events: readonly GameEvent[]): readonly GameEvent[] {
  const end = events.findIndex((e) => e.type === 'turnEnd');
  if (end === -1) return [];
  const rest = events.slice(end + 1);
  const stop = rest.findIndex((e) => e.type === 'turnStart' || e.type === 'draftOffer' || e.type === 'gateOffer' || e.type === 'ending');
  return stop === -1 ? rest : rest.slice(0, stop);
}

export interface MonthEndLine {
  /** Index in history of the step whose month end it follows. */
  readonly step: number;
  readonly manager: string;
  readonly group: string;
  readonly show: number;
  readonly key: string | null;
}

/**
 * The manager's month-end line, at every month end where the perk's effects changed something (Mags's
 * relief: never below zero, so not while heat is already 0) — a shuffle bag over the perk's lines.
 */
export function monthEndLines(history: readonly HistoryStep[]): MonthEndLine[] {
  const first = history[0]?.after;
  if (!first) return [];
  const out: MonthEndLine[] = [];
  const shown = new Map<string, number>();
  history.forEach((step, i) => {
    const manager = getManager(step.after.content, step.after.manager);
    if (!manager?.perk.monthEnd || !monthEndEffects(step.events).some((e) => e.type !== 'warning')) return;
    const group = monthEndGroup(manager.id);
    const n = shown.get(group) ?? 0;
    shown.set(group, n + 1);
    out.push({ step: i, manager: manager.id, group, show: n, key: bagKey(manager.perk.monthEndKeys, first.seed, group, n) });
  });
  return out;
}
