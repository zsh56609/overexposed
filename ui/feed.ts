// The feed (docs/ui-plan.md §3; §13, decisions 5 and 18): the run's events, aggregated per action.
// One headline per card played, in its register, with its resource deltas beneath; draws merged into one
// line; scandals as the lead story; a season opener when a season starts; the manager's messages as each
// month opens, and their month-end perk (round 2b). An explanation attaches to the event that caused it:
// the month-end residue, a gate's heat, the line moving. Pure: steps in, lines out.
// How far the line moved is /core's number (lineMoved); nothing here compares states.

import {
  frontPages,
  getCard,
  lineMoved,
  managerMessages,
  monthEndEffects,
  monthEndLines,
  monthsLeft,
  pressLines,
  RESOURCE_KEYS,
  type GameEvent,
  type MonthPress,
  type PressLine,
  type Register,
  type ResourceKey,
} from '../core/index.ts';
import { t, tp } from './i18n.ts';
import { addedBy } from './preview.ts';
import type { PlayedStep } from './queue.ts';
import {
  cardName,
  flagName,
  gateName,
  isPlaceholder,
  lineText,
  managerName,
  mastheadName,
  messageText,
  monthEndText,
  resourceName,
  seasonName,
  money,
  seasonOpener,
  signed,
  signedAmount,
  zoneName,
} from './text.ts';

export type FeedLineKind = 'month' | 'opener' | 'headline' | 'lead' | 'detail' | 'note' | 'page' | 'message' | 'perk';

export interface FeedLine {
  readonly id: string;
  readonly kind: FeedLineKind;
  readonly text: string;
  /** A played card's voice (decision 15): how its headline is set. */
  readonly register: Register | null;
  /** The paper a line prints in and its masthead (phase 2a); null: the player's own notebook, or not a line. */
  readonly paper: string | null;
  readonly masthead: string | null;
  /** For a printed line: the variant and the press subject it printed with. */
  readonly key: string | null;
  readonly subjectKey: string | null;
  /** A month's front pages (Part E), printed at the month's end: kind 'page'. */
  readonly page: MonthPress | null;
  /** Who is speaking: the manager's name on their messages (round 2b), distinct from the press. */
  readonly speaker: string | null;
  /** Prose the author has not written yet: shown as a placeholder, never hidden. */
  readonly placeholder: boolean;
}

interface Block {
  readonly deltas: Record<ResourceKey, number>;
  readonly draws: string[];
  readonly details: string[];
}

const emptyBlock = (): Block => ({ deltas: { hype: 0, craft: 0, capital: 0, heat: 0 }, draws: [], details: [] });

const deltasText = (d: Readonly<Record<ResourceKey, number>>): string =>
  RESOURCE_KEYS.filter((k) => d[k] !== 0)
    .map((k) => t('ui.feed.delta', { resource: resourceName(k), delta: signedAmount(k, d[k]) }))
    .join(' · ');

export function feedLines(steps: readonly PlayedStep[]): FeedLine[] {
  const out: FeedLine[] = [];
  let lastAct = 0;
  let lastMonth = 0;
  if (steps.length === 0) return out;
  // Every printed line's variant, counted through the whole run (decision 15, revised), and its press; every
  // month's front pages, by the step that ended the month.
  const printed = pressLines(steps);
  const pages = new Map(frontPages(steps).map((m) => [m.step, m]));
  // The manager's messages, by the event that opens their month; their month-end line, by its step.
  const messages = new Map(managerMessages(steps).map((m) => [`${m.step}:${m.event}`, m]));
  const perkLines = new Map(monthEndLines(steps).map((l) => [l.step, l]));
  let next = 0;

  for (const [index, step] of steps.entries()) {
    const c = step.after.content;
    // This step's printed lines: a play by its card instance, a scandal by its card instance.
    const mine: PressLine[] = [];
    while (next < printed.length && printed[next]?.step === index) mine.push(printed[next++] as PressLine);
    const printedFor = (kind: PressLine['kind'], uid: number) => mine.find((l) => l.kind === kind && l.uid === uid);
    let n = 0;
    const push = (kind: FeedLineKind, text: string, register: Register | null = null, line: PressLine | null = null, page: MonthPress | null = null, speaker: string | null = null) =>
      out.push({
        page,
        speaker,
        id: `${step.id}.${n++}`,
        kind,
        text,
        register,
        placeholder: isPlaceholder(text),
        paper: line?.paper ?? null,
        masthead: line?.paper ? mastheadName(c, line.paper) : null,
        key: line?.key ?? null,
        subjectKey: line?.subjectKey ?? null,
      });
    const printedText = (line: PressLine | undefined, cardId: string) => lineText(c, line, cardId, line?.subjectKey ?? null);

    let block: Block | null = null;
    const open = (): Block => (block ??= emptyBlock());
    const flush = () => {
      const b: Block | null = block;
      block = null;
      if (!b) return;
      const d = deltasText(b.deltas);
      if (d) push('detail', d);
      if (b.draws.length) push('detail', t('ui.feed.draws', { n: b.draws.length, cards: b.draws.join(', ') }));
      for (const x of b.details) push('detail', x);
    };

    // How far the line moved over this step, told once, where the cause is printed (decision 18).
    let lineTold = false;
    const tellLine = () => {
      if (lineTold || !step.before) return;
      lineTold = true;
      const moved = lineMoved(step.before, step.after);
      if (moved < 0) push('detail', t('ui.feed.lineCloser', { n: -moved }));
      else if (moved > 0) push('detail', t('ui.feed.lineAway', { n: moved }));
    };

    const enterMonth = (act: number, turn: number) => {
      if (act !== lastAct) {
        flush();
        push('opener', seasonOpener(c, step.after.seed, act));
        lastAct = act;
        if (step.action?.type === 'CHOOSE_GATE') tellLine(); // the season transition says the line tightened
      }
      if (turn !== lastMonth) {
        flush();
        push('month', t('ui.feed.month', { season: seasonName(c, act), turn }));
        lastMonth = turn;
      }
    };

    // The month that opens at this event, if any: the manager's messages for it (round 2b), under its header.
    const tell = (event: number) => {
      const month = messages.get(`${index}:${event}`);
      if (!month) return;
      const speaker = managerName(c, month.manager);
      for (const m of month.messages) push('message', messageText(month.manager, m), null, null, null, speaker);
    };

    const crystallised = new Set(step.events.flatMap((e) => (e.type === 'scandal' ? [e.uid] : [])));
    const isScandal = (cardId: string) => getCard(c, cardId)?.kind === 'scandal';
    const leadFor = (e: GameEvent) => {
      if (e.type === 'scandal') {
        const line = printedFor('scandal', e.uid);
        push('lead', printedText(line, e.cardId), null, line ?? null);
        push('detail', e.cause === null ? t('ui.feed.unblamed', { card: cardName(c, e.cardId) }) : t('ui.feed.blamed', { card: cardName(c, e.cardId), cause: cardName(c, e.cause) }));
      } else if (e.type === 'addCard') {
        const by = step.action?.type === 'CHOOSE_GATE' || !step.before ? null : addedBy(step.before, e.cardId);
        const line = printedFor('scandal', e.uid);
        push('lead', printedText(line, e.cardId), null, line ?? null);
        push('detail', by === null ? t('ui.feed.addedScandal', { card: cardName(c, e.cardId) }) : by === e.cardId ? t('ui.feed.copiedSelf', { card: cardName(c, e.cardId) }) : t('ui.feed.copied', { card: cardName(c, e.cardId), source: cardName(c, by) }));
      }
    };

    let events = step.events;
    let offset = 0;
    if (step.action?.type === 'END_TURN') {
      // Month end, up to turnEnd, is one block: the scandals lead, then the month's deltas and the residue.
      const end = events.findIndex((e) => e.type === 'turnEnd');
      const head = end === -1 ? events : events.slice(0, end + 1);
      // Then the manager's month-end effects (round 2b), told on a line of their own.
      const perk = monthEndEffects(events);
      offset = end === -1 ? events.length : end + 1 + perk.length;
      events = events.slice(offset);
      const b = emptyBlock();
      for (const e of head) {
        if (e.type === 'resource') b.deltas[e.target] += e.delta;
        else if (e.type === 'scandal') leadFor(e);
        else if (e.type === 'addCard' && isScandal(e.cardId) && !crystallised.has(e.uid)) leadFor(e);
        else if (e.type === 'addCard' && !isScandal(e.cardId)) b.details.push(t('ui.feed.added', { card: cardName(c, e.cardId), zone: zoneName(e.to) }));
        else if (e.type === 'exhaust') b.details.push(t('ui.feed.exhaust', { card: cardName(c, e.cardId) }));
        else if (e.type === 'flag') b.details.push(t('ui.feed.flag', { flag: flagName(e.flag) }));
      }
      // One month-end line: its deltas and the heat that carries over (decision 18), not a line each.
      // The year's last month carries nothing: there is no next month.
      const d = deltasText(b.deltas);
      const turnEnd = head.find((e) => e.type === 'turnEnd');
      const perkDeltas = emptyBlock().deltas;
      for (const e of perk) if (e.type === 'resource') perkDeltas[e.target] += e.delta;
      // What carries into the next month: the heat after the check, and after the manager's relief.
      const carry = turnEnd?.type === 'turnEnd' && step.before && monthsLeft(step.before) !== 0 ? turnEnd.resources.heat + perkDeltas.heat : 0;
      const perkLine = perkLines.get(index);
      if (perkLine) {
        // The month's own line, then the manager's with its delta beneath, then what carries over.
        if (d) push('detail', t('ui.feed.monthEnd', { deltas: d }));
        push('perk', monthEndText(perkLine));
        const pd = deltasText(perkDeltas);
        if (pd) push('detail', pd);
        if (carry !== 0) push('detail', t('ui.feed.carry', { n: carry }));
      } else if (d && carry !== 0) push('detail', t('ui.feed.monthEndCarry', { deltas: d, n: carry }));
      else if (d) push('detail', t('ui.feed.monthEnd', { deltas: d }));
      else if (carry !== 0) push('detail', t('ui.feed.carry', { n: carry }));
      for (const x of b.details) push('detail', x);
      tellLine();
      // The month's papers come out: its front pages, the lead paper first (E8).
      const month = pages.get(index);
      if (month) push('page', '', null, null, month);
    }

    // A draft purchase's price is in its own line; its capital event would only repeat it.
    const priced = step.action?.type === 'DRAFT_EXTRA_PICK' || step.action?.type === 'DRAFT_REROLL';
    for (const [k, e] of events.entries()) {
      switch (e.type) {
        case 'turnStart':
          enterMonth(e.act, e.turn);
          flush();
          tell(offset + k);
          block = emptyBlock(); // the month's draw, merged into one line
          break;
        case 'draftOffer':
          enterMonth(e.act, step.after.turn);
          flush();
          tell(offset + k);
          push('note', t('ui.event.draftOffer', { cards: e.cardIds.map((id) => cardName(c, id)).join(' · ') }));
          break;
        case 'play': {
          flush();
          const line = printedFor('play', e.uid);
          push('headline', printedText(line, e.cardId), getCard(c, e.cardId)?.register ?? null, line ?? null);
          block = emptyBlock();
          break;
        }
        case 'resource':
          if (!priced) open().deltas[e.target] += e.delta;
          break;
        case 'draw':
          open().draws.push(cardName(c, e.cardId));
          break;
        case 'shuffle':
          open().details.push(tp('ui.event.shuffle', e.count, { count: e.count }));
          break;
        case 'slots':
          open().details.push(tp('ui.feed.slots', e.delta, { delta: signed(e.delta) }));
          break;
        case 'flag':
          open().details.push(t('ui.feed.flag', { flag: flagName(e.flag) }));
          break;
        case 'exhaust':
          open().details.push(t('ui.feed.exhaust', { card: cardName(c, e.cardId) }));
          break;
        case 'addCard':
          if (isScandal(e.cardId)) {
            if (!crystallised.has(e.uid)) {
              flush();
              leadFor(e);
            }
          } else if (step.action?.type !== 'DRAFT_PICK') {
            open().details.push(t('ui.feed.added', { card: cardName(c, e.cardId), zone: zoneName(e.to) }));
          }
          break;
        case 'scandal':
          flush();
          leadFor(e);
          break;
        case 'draftPick':
          flush();
          push('note', t('ui.event.draftPick', { card: cardName(c, e.cardId) }));
          break;
        case 'draftExtraPick':
          flush();
          push('note', t('ui.event.draftExtraPick', { cost: money(e.cost) }));
          break;
        case 'draftReroll':
          flush();
          push('note', e.cost === 0 ? t('ui.event.draftRerollFree') : t('ui.event.draftReroll', { cost: money(e.cost) }));
          break;
        case 'gateOffer':
          flush();
          push('note', t('ui.event.gateOffer', { season: seasonName(c, c.gates[e.gateIds[0] ?? '']?.act ?? 1) }));
          break;
        case 'gate':
          flush();
          push('note', t(e.passed ? 'ui.event.gatePass' : 'ui.event.gateFail', { gate: gateName(c, e.gateId) }));
          block = emptyBlock(); // the gate's branch: what it added or took, heat included
          break;
        case 'ending':
          flush();
          push('note', t('ui.event.ending'));
          break;
        case 'warning':
          flush();
          push('note', t('ui.event.warning', { code: e.code, ref: e.ref }));
          break;
        case 'turnEnd':
          break;
      }
    }
    flush();
    tellLine();
  }
  return out;
}
