// The feed (docs/ui-plan.md §3; §13, decisions 5 and 18): the run's events, aggregated per action.
// One headline per card played, in its register, with its resource deltas beneath; draws merged into one
// line; scandals as the lead story; a season opener when a season starts. An explanation attaches to the
// event that caused it: the month-end residue, a gate's heat, the line moving. Pure: steps in, lines out.
// How far the line moved is /core's number (lineMoved); nothing here compares states.

import { getCard, lineMoved, RESOURCE_KEYS, type GameEvent, type Register, type ResourceKey } from '../core/index.ts';
import { t } from './i18n.ts';
import { addedBy } from './preview.ts';
import type { PlayedStep } from './queue.ts';
import {
  cardName,
  flagName,
  gateName,
  isPlaceholder,
  playHeadline,
  resourceName,
  scandalHeadline,
  seasonName,
  seasonOpener,
  signed,
  zoneName,
} from './text.ts';

export type FeedLineKind = 'month' | 'opener' | 'headline' | 'lead' | 'detail' | 'note';

export interface FeedLine {
  readonly id: string;
  readonly kind: FeedLineKind;
  readonly text: string;
  /** A played card's voice (decision 15): how its headline is set. */
  readonly register: Register | null;
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
    .map((k) => t('ui.feed.delta', { resource: resourceName(k), delta: signed(d[k]) }))
    .join(' · ');

export function feedLines(steps: readonly PlayedStep[]): FeedLine[] {
  const out: FeedLine[] = [];
  let lastAct = 0;
  let lastMonth = 0;

  for (const step of steps) {
    const c = step.after.content;
    let n = 0;
    const push = (kind: FeedLineKind, text: string, register: Register | null = null) =>
      out.push({ id: `${step.id}.${n++}`, kind, text, register, placeholder: isPlaceholder(text) });

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
        push('opener', seasonOpener(c, act));
        lastAct = act;
        if (step.action?.type === 'CHOOSE_GATE') tellLine(); // the season transition says the line tightened
      }
      if (turn !== lastMonth) {
        flush();
        push('month', t('ui.feed.month', { season: seasonName(c, act), turn }));
        lastMonth = turn;
      }
    };

    const crystallised = new Set(step.events.flatMap((e) => (e.type === 'scandal' ? [e.uid] : [])));
    const isScandal = (cardId: string) => getCard(c, cardId)?.kind === 'scandal';
    const leadFor = (e: GameEvent) => {
      if (e.type === 'scandal') {
        push('lead', scandalHeadline(c, e.cardId));
        push('detail', e.cause === null ? t('ui.feed.unblamed', { card: cardName(c, e.cardId) }) : t('ui.feed.blamed', { card: cardName(c, e.cardId), cause: cardName(c, e.cause) }));
      } else if (e.type === 'addCard') {
        const by = step.action?.type === 'CHOOSE_GATE' || !step.before ? null : addedBy(step.before, e.cardId);
        push('lead', scandalHeadline(c, e.cardId));
        push('detail', by === null ? t('ui.feed.addedScandal', { card: cardName(c, e.cardId) }) : by === e.cardId ? t('ui.feed.copiedSelf', { card: cardName(c, e.cardId) }) : t('ui.feed.copied', { card: cardName(c, e.cardId), source: cardName(c, by) }));
      }
    };

    let events = step.events;
    if (step.action?.type === 'END_TURN') {
      // Month end, up to turnEnd, is one block: the scandals lead, then the month's deltas and the residue.
      const end = events.findIndex((e) => e.type === 'turnEnd');
      const head = end === -1 ? events : events.slice(0, end + 1);
      events = end === -1 ? [] : events.slice(end + 1);
      const b = emptyBlock();
      for (const e of head) {
        if (e.type === 'resource') b.deltas[e.target] += e.delta;
        else if (e.type === 'scandal') leadFor(e);
        else if (e.type === 'addCard' && isScandal(e.cardId) && !crystallised.has(e.uid)) leadFor(e);
        else if (e.type === 'addCard' && !isScandal(e.cardId)) b.details.push(t('ui.feed.added', { card: cardName(c, e.cardId), zone: zoneName(e.to) }));
        else if (e.type === 'exhaust') b.details.push(t('ui.feed.exhaust', { card: cardName(c, e.cardId) }));
        else if (e.type === 'flag') b.details.push(t('ui.feed.flag', { flag: flagName(e.flag) }));
      }
      const d = deltasText(b.deltas);
      if (d) push('detail', t('ui.feed.monthEnd', { deltas: d }));
      for (const x of b.details) push('detail', x);
      const turnEnd = head.find((e) => e.type === 'turnEnd');
      if (turnEnd?.type === 'turnEnd' && turnEnd.resources.heat !== 0) push('detail', t('ui.feed.carry', { n: turnEnd.resources.heat }));
      tellLine();
    }

    // A draft purchase's price is in its own line; its capital event would only repeat it.
    const priced = step.action?.type === 'DRAFT_EXTRA_PICK' || step.action?.type === 'DRAFT_REROLL';
    for (const e of events) {
      switch (e.type) {
        case 'turnStart':
          enterMonth(e.act, e.turn);
          flush();
          block = emptyBlock(); // the month's draw, merged into one line
          break;
        case 'draftOffer':
          enterMonth(e.act, step.after.turn);
          flush();
          push('note', t('ui.event.draftOffer', { cards: e.cardIds.map((id) => cardName(c, id)).join(' · ') }));
          break;
        case 'play': {
          flush();
          const h = playHeadline(c, step.after.seed, step.after.turn, e.uid, e.cardId);
          push('headline', h.text, h.register);
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
          open().details.push(t('ui.event.shuffle', { count: e.count }));
          break;
        case 'slots':
          open().details.push(t('ui.feed.slots', { delta: signed(e.delta) }));
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
          push('note', t('ui.event.draftExtraPick', { cost: e.cost }));
          break;
        case 'draftReroll':
          flush();
          push('note', t('ui.event.draftReroll', { cost: e.cost }));
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
