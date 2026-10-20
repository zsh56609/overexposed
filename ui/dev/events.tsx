// Every event of the content, for check:overflow (round R2, Part C): each at its longest, on the game's own stage —
// all its messages and every reply ('choices'), with money at nothing so a choice that needs it shows disabled
// ('broke'), and the thread or letter once answered with the longest reply and outcome ('answered'). After the
// content's events come two at the limits the schema allows, which no event reaches yet: a text of three messages
// and three replies, a letter of four paragraphs and three choices — built only from the content's own words, the
// longest of each, with the most effects and the longest requirement. Driven from the checks:
// window.__events.show(index, mode) renders one and reports how many there are; window.__events.acted lists the
// actions its replies sent (check:clicks). Dev-only: Vite serves it, the build never includes it.

import { useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { createInitialState, readLines, type Action, type EventChoiceDef, type EventDef, type EventForm, type GameState } from '../../core/index.ts';
import { content } from '../content.ts';
import { Desk } from '../desk/Desk.tsx';
import { IconDefs } from '../desk/Icons.tsx';
import { t } from '../i18n.ts';
import { legalOf } from '../preview.ts';
import { EventScreen } from '../screens/Events.tsx';
import { Stage } from '../Stage.tsx';
import { calendarLabel, mastheadName } from '../text.ts';
import { loadPhotos } from '../textPhotos.ts';
import '../style.css';
import '../screens/common.tsx';

type Mode = 'choices' | 'broke' | 'answered';
const own = content.events?.events ?? [];
const plain = createInitialState(7, content, { strict: true });
const months = content.rules.events?.months ?? [];
void Desk; // the desk's tokens and icons

/** The n longest of xs by len, longest first. */
function longest<T>(xs: readonly T[], len: (x: T) => number, n: number): T[] {
  return [...xs].sort((a, b) => len(b) - len(a)).slice(0, n);
}

/** An event at the limits of its form, from the longest words of the events of that form. */
function atLimit(form: EventForm): EventDef {
  const pool = own.filter((e) => e.form === form);
  const choices = pool.flatMap((e) => e.choices);
  const replies = longest(choices, (ch) => t(ch.replyKey).length, 3);
  const outcomes = longest(choices, (ch) => t(ch.outcomeKey).length, 3);
  const busiest = longest(choices, (ch) => ch.effects.length, 3);
  const needs = longest(choices, (ch) => JSON.stringify(ch.requires ?? '').length, 1)[0]?.requires;
  const speaker = longest(
    pool.map((e) => e.speaker),
    (sp) => (sp.paper ? mastheadName(plain.content, sp.paper) : '').length + t(sp.letterheadKey ?? '').length + t(sp.signoffKey ?? '').length + t(sp.nameKey ?? '').length + t(sp.labelKey ?? '').length,
    1,
  )[0];
  const title = longest(pool, (e) => t(e.titleKey ?? '').length, 1)[0]?.titleKey;
  const category = longest(pool, (e) => t(content.events?.categories[e.category].nameKey ?? '').length + t(content.events?.categories[e.category].lineKey ?? '').length, 1)[0]?.category ?? 'personal';
  return {
    id: `limit_${form}`,
    category,
    form,
    ...(title ? { titleKey: title } : {}),
    speaker: speaker ?? {},
    when: { months: { from: months[0] ?? 1 } },
    messageKeys: longest(
      pool.flatMap((e) => e.messageKeys),
      (k) => t(k).length,
      form === 'text' ? 3 : 4,
    ),
    choices: [0, 1, 2].map(
      (i): EventChoiceDef => ({
        replyKey: replies[i]?.replyKey ?? '',
        outcomeKey: outcomes[i]?.outcomeKey ?? '',
        effects: busiest[i]?.effects ?? [],
        ...(i < 2 && needs ? { requires: needs } : {}),
      }),
    ),
  };
}

const events = [...own, atLimit('text'), atLimit('letter')];
// The texts' photographs (round R8b): the eight show with theirs; the two at the limits keep none (with one, the limit
// text would overflow its thread). The checks wait for `photos` before they look.
const photos = loadPhotos();
const base = content.events ? createInitialState(7, { ...content, events: { ...content.events, events } }, { strict: true }) : plain;
/** The event month whose date line runs longest: the limits are shown in it. */
const longestMonth = longest(months, (m) => calendarLabel(base.content, m).length, 1)[0] ?? 1;
let shown: { index: number; mode: Mode } = { index: 0, mode: 'choices' };
const listeners = new Set<() => void>();
const acted: Action[] = [];

declare global {
  interface Window {
    __events: { show(index: number, mode: Mode): number; ids: readonly string[]; acted: Action[]; photos: Promise<unknown> };
  }
}
window.__events = {
  ids: events.map((e) => e.id),
  acted,
  photos,
  show(index, mode) {
    shown = { index, mode };
    for (const fn of listeners) fn();
    return events.length;
  },
};

/** The event waiting in its first event month, with money to spare and heat to cool — or no money at all, to show what a choice needs. */
function stateFor(index: number, mode: Mode): GameState {
  const ev = events[index];
  if (!ev) return base;
  const turn = ev.id.startsWith('limit_') ? longestMonth : (months.find((m) => m >= ev.when.months.from) ?? ev.when.months.from);
  const capital = mode === 'broke' ? 0 : 9;
  return { ...base, phase: 'event', event: ev.id, turn, act: Math.ceil(turn / base.content.rules.turnsPerAct), resources: { ...base.resources, capital, hype: 40, heat: 5 }, events: [] };
}

function Events() {
  const now = useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => shown,
  );
  const s = stateFor(now.index, now.mode);
  const ev = events[now.index];
  const lines = { ...readLines([{ before: null, after: s, events: [] }]), lane: null };
  // Answered: the reply and outcome that run longest.
  const answer = ev ? (longest(ev.choices.map((ch, i) => ({ i, n: t(ch.replyKey).length + t(ch.outcomeKey).length })), (x) => x.n, 1)[0]?.i ?? 0) : 0;
  return (
    <div className="screen-over" data-screen="events">
      <IconDefs />
      <div className="screen-scrim" />
      <EventScreen
        key={`${now.index}:${now.mode}`}
        s={s}
        chosen={now.mode === 'answered' ? answer : null}
        beats={now.mode === 'answered' ? ['eventSend', 'eventReply'] : []}
        legal={legalOf(s)}
        act={(a) => acted.push(a)}
        lines={lines}
        lane={null}
      />
    </div>
  );
}

const root = document.getElementById('root');
if (root)
  createRoot(root).render(
    <Stage>
      <div className="desk summer lane-early">
        <IconDefs />
      </div>
      <Events />
    </Stage>,
  );
