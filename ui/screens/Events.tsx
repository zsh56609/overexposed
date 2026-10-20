// Events (round R2, Part C; README §9 "Events (phase 3)"; mockups/vanity.html › Screen › "Event · text" and
// "Event · letter", shots 18 and 19). People who text come up on the phone: their messages arrive one at a time,
// each after a few typing dots, and the replies appear once the last is in, each carrying its effects as the card
// faces show them. The press and institutions write: a letter lands on the desk, slightly turned, its choices tick
// boxes. Choosing is the action; the exchange that follows — the player's bubble, the typing, their reply; or the
// tick, the SENT stamp, the outcome — plays as the answer's step (ui/timeline.ts), then the phone goes down or the
// letter leaves. Every word from content and the approved labels; every chip from the reducer (ui/preview.ts).

import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { getEvent, type Action, type EventDef, type GameState } from '../../core/index.ts';
import { Value } from '../desk/Hand.tsx';
import { clauseChip, eventEffectChips, outcomeChips, type ValueChip } from '../desk/model.ts';
import { t } from '../i18n.ts';
import { motionMode } from '../motion.ts';
import { previewEventChoice, type EventChoicePreview, type Legal, type LinesSoFar } from '../preview.ts';
import type { BeatKind } from '../timeline.ts';
import { Face } from '../Face.tsx';
import { calendarLabel, mastheadName } from '../text.ts';
import { loadPhotos, photosReady, usePhoto } from '../textPhotos.ts';
import { useArrivalSound } from '../sound/arrival.ts';
import { cue } from '../sound/sound.ts';
import { prose } from './common.tsx';

/** When each message arrives (the mockup's rhythm): typing dots, then the bubble; the replies after the last. */
const FIRST = 250;
const TYPING = 700;
const NEXT = 1100;
const REPLIES = 400;

export interface EventScreenProps {
  /** The state with the event waiting (phase 'event'). */
  readonly s: GameState;
  /** The answer being played, while its step runs; null before the choice. */
  readonly chosen: number | null;
  /** The beats of the answer's step so far. */
  readonly beats: readonly BeatKind[];
  readonly legal: Legal;
  readonly act: (action: Action) => void;
  readonly lines: LinesSoFar;
  readonly lane: string | null;
}

/** What an answer shows beside its words: its effects as chips, what it still needs, whether it is remembered. */
interface AnswerView {
  readonly index: number;
  readonly reply: string;
  readonly outcome: string;
  readonly ok: boolean;
  readonly chips: readonly ValueChip[];
  readonly words: readonly string[];
  readonly needs: readonly ValueChip[];
  readonly remembered: boolean;
}

function answers(s: GameState, ev: EventDef, lines: LinesSoFar, lane: string | null): AnswerView[] {
  const c = s.content;
  return ev.choices.map((def, index) => {
    const p: EventChoicePreview = previewEventChoice(s, index, lines);
    const shown = p.outcome ? outcomeChips(c, p.outcome, lane, { heat: true, slots: p.slots, flags: false }) : { chips: eventEffectChips(c, def.effects, lane), words: [] };
    const needs = p.needs.map((clause) => clauseChip(clause, lane));
    return {
      index,
      reply: t(def.replyKey),
      outcome: t(def.outcomeKey),
      ok: p.ok,
      chips: shown.chips,
      words: shown.words,
      needs: needs.filter((x): x is ValueChip => x !== null),
      remembered: p.remembered,
    };
  });
}

/** An answer's chips: its effects, what it needs when it can't be chosen, "↺ remembered", or "No cost". */
function Chips({ a }: { a: AnswerView }) {
  const none = a.chips.length === 0 && a.words.length === 0 && !a.remembered && a.ok;
  return (
    <span className="efx">
      {!a.ok && a.needs.length > 0 && (
        <span className="needs">
          {t('ui.face.needs')}
          {a.needs.map((v, i) => (
            <Value key={i} v={v} />
          ))}
        </span>
      )}
      {a.chips.map((v, i) => (
        <Value key={i} v={v} />
      ))}
      {a.words.map((w, i) => (
        <span key={`w${i}`} className="r-text">
          {w}
        </span>
      ))}
      {a.remembered && <span className="r-later">{t('ui.event.remembered')}</span>}
      {none && <span className="r-later">{t('ui.event.noCost')}</span>}
    </span>
  );
}

/**
 * The thread's arrival, one at a time; a click during it shows them all (D7). Motion off or reduced: all at once. A
 * photo (round R8b) is one more message on the rhythm the messages keep; if its chunk has not loaded by its turn, the
 * typing goes on until it has, and the rest follow on — the thread never breaks.
 */
function useArrival(count: number, settled: boolean, wait: { readonly at: number; readonly ready: () => boolean; readonly until: () => Promise<unknown> } | null): { readonly shown: number; readonly typing: boolean; readonly done: boolean; readonly finish: () => void } {
  const instant = settled || motionMode() !== 'full';
  const [shown, setShown] = useState(instant ? count : 0);
  const [typing, setTyping] = useState(false);
  const [ready, setReady] = useState(instant);
  const timers = useRef<number[]>([]);
  // Each arrival is one run; a click (finish), a change of motion or leaving ends it, and an ended run does no more.
  const runs = useRef(0);
  const clear = () => {
    runs.current++;
    for (const id of timers.current) window.clearTimeout(id);
    timers.current = [];
  };
  useEffect(() => {
    if (instant) return;
    const me = ++runs.current;
    const live = () => runs.current === me;
    const sleep = (ms: number) => new Promise<void>((resolve) => timers.current.push(window.setTimeout(resolve, ms)));
    void (async () => {
      await sleep(FIRST);
      for (let i = 0; i < count; i++) {
        if (!live()) return;
        setTyping(true);
        await sleep(TYPING);
        if (wait && i === wait.at && !wait.ready()) await wait.until().catch(() => {});
        if (!live()) return;
        setTyping(false);
        setShown(i + 1);
        cue('bubble'); // each message as it arrives (round R4, B2); none for those a click shows at once
        if (i < count - 1) await sleep(NEXT - TYPING);
      }
      await sleep(REPLIES);
      if (live()) setReady(true);
    })();
    return clear;
  }, [count, instant]);
  const finish = () => {
    clear();
    setTyping(false);
    setShown(count);
    setReady(true);
  };
  return { shown, typing, done: ready, finish };
}

/** A thread's items (round R8b): its messages, and a photo after its `after`-th one. */
type ThreadItem = { readonly kind: 'message'; readonly key: string; readonly text: string } | { readonly kind: 'photo'; readonly key: string };

export function EventScreen({ s, chosen, beats, legal, act, lines, lane }: EventScreenProps) {
  const ev = getEvent(s.content, s.event ?? '');
  const views = useMemo(() => (ev ? answers(s, ev, lines, lane) : []), [s, ev, lines, lane]);
  if (!ev) return null;
  const props = { s, ev, views, chosen, beats, legal, act };
  return ev.form === 'letter' ? <LetterEvent key={ev.id} {...props} /> : <PhoneEvent key={ev.id} {...props} />;
}

interface FormProps {
  readonly s: GameState;
  readonly ev: EventDef;
  readonly views: readonly AnswerView[];
  readonly chosen: number | null;
  readonly beats: readonly BeatKind[];
  readonly legal: Legal;
  readonly act: (action: Action) => void;
}

function PhoneEvent({ s, ev, views, chosen, beats, legal, act }: FormProps) {
  const c = s.content;
  // The thread (round R8b): the messages and, if the sender sends one, a photo after its message — one more message on
  // the phone, never a message's words.
  const items: ThreadItem[] = ev.messageKeys.flatMap((k, i): ThreadItem[] => [{ kind: 'message', key: `m${i}`, text: t(k) }, ...(ev.photo && ev.photo.after === i + 1 ? [{ kind: 'photo' as const, key: 'photo' }] : [])]);
  const photo = usePhoto(ev.photo?.id ?? null);
  const arrival = useArrival(items.length, chosen !== null, ev.photo ? { at: items.findIndex((x) => x.kind === 'photo'), ready: photosReady, until: loadPhotos } : null);
  const category = c.eventCategories?.[ev.category];
  const name = t(ev.speaker.nameKey ?? '');
  const label = ev.speaker.labelKey ? t(ev.speaker.labelKey) : null;
  const replied = beats.includes('eventReply');
  const answer = chosen === null ? null : (views[chosen] ?? null);
  // A text comes up (round R4, B2): the phone buzzes; your reply and their answer are the answer's beats (ui/sound/director.ts).
  useArrivalSound(() => cue('buzz'));
  const onClickCapture = (e: MouseEvent) => {
    if (arrival.done || chosen !== null) return;
    e.stopPropagation();
    e.preventDefault();
    arrival.finish();
  };
  return (
    <div className="scr event-screen ev-text" data-event={ev.id} data-form="text" data-arriving={arrival.done ? undefined : '1'} onClickCapture={onClickCapture}>
      <div className="evcap">
        <small>{t('ui.event.kicker', { date: calendarLabel(c, s.turn), category: category ? t(category.nameKey) : ev.category })}</small>
        <b className={prose(t(ev.titleKey ?? ''))}>{t(ev.titleKey ?? '')}</b>
        {category && <i>{t(category.lineKey)}</i>}
      </div>
      <div className="phone-big">
        <div className="ph-screen">
          <div className="ph-top">
            {/* Their face (round R8a); a sender without one keeps the initial. */}
            <div className={`ph-av${ev.speaker.avatar ? ' has-face' : ''}`}>{ev.speaker.avatar ? <Face id={ev.speaker.avatar} size={40} /> : (Array.from(name)[0] ?? '')}</div>
            <div>
              <b>{name}</b>
              {label && <small>{label}</small>}
            </div>
          </div>
          <div className="thread">
            {items.slice(0, arrival.shown).map((item) =>
              item.kind === 'photo' ? (
                <div key={item.key} className="m in pic">
                  {photo && <img src={photo} alt="" width={200} height={150} />}
                </div>
              ) : (
                <div key={item.key} className={prose(item.text, 'm in')}>
                  {item.text}
                </div>
              ),
            )}
            {arrival.typing && <TypingDots />}
            {answer && <div className={prose(answer.reply, 'm out')}>{answer.reply}</div>}
            {answer && !replied && <TypingDots late />}
            {answer && replied && <div className={prose(answer.outcome, 'm in reply')}>{answer.outcome}</div>}
          </div>
          {chosen === null && (
            <div className={`replies${arrival.done ? ' on' : ''}`}>
              <small>{t('ui.event.reply')}</small>
              {views.map((a) => (
                <button key={a.index} className={`rep choose${a.ok ? '' : ' off'}`} data-choice={a.index} disabled={!arrival.done || !legal.choices.has(a.index)} onClick={() => act({ type: 'CHOOSE_EVENT', choice: a.index })}>
                  <span className={prose(a.reply, 'rt')}>{a.reply}</span>
                  <Chips a={a} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TypingDots({ late = false }: { late?: boolean }) {
  return (
    <div className={`typing${late ? ' late' : ''}`} aria-hidden="true">
      <i />
      <i />
      <i />
    </div>
  );
}

function LetterEvent({ s, ev, views, chosen, beats, legal, act }: FormProps) {
  const c = s.content;
  const paper = ev.speaker.paper ?? null;
  const head = paper ? mastheadName(c, paper) : t(ev.speaker.letterheadKey ?? '');
  const desk = paper ? `${t(ev.speaker.letterheadKey ?? '')} · ${calendarLabel(c, s.turn)}` : calendarLabel(c, s.turn);
  const sent = beats.includes('eventReply');
  const answer = chosen === null ? null : (views[chosen] ?? null);
  // A letter lands (round R4, B2); its SENT stamp is the answer's beat (ui/sound/director.ts).
  useArrivalSound(() => cue('letter'));
  return (
    <div className="scr event-screen ev-letter" data-event={ev.id} data-form="letter">
      <div className={`letter${paper ? ` lh-${paper}` : ' lh-house'}${ev.messageKeys.length >= 4 ? ' long' : ''}${chosen !== null ? ' done' : ''}${sent ? ' sent-on' : ''}`}>
        <div className="lhd">
          <b>{head}</b>
          <span>{desk}</span>
        </div>
        <div className="lbody">
          {ev.messageKeys.map((k, i) => (
            <p key={i} className={prose(t(k))}>
              {t(k)}
            </p>
          ))}
          <p className="signoff">{t(ev.speaker.signoffKey ?? '')}</p>
        </div>
        <div className="lrep">
          <small>{t('ui.event.yourReply')}</small>
          {views.map((a) => (
            <div
              key={a.index}
              className={`opt choose${a.ok ? '' : ' off'}${chosen === a.index ? ' on' : ''}`}
              role="button"
              tabIndex={chosen === null && legal.choices.has(a.index) ? 0 : -1}
              aria-disabled={chosen !== null || !legal.choices.has(a.index)}
              data-choice={a.index}
              onClick={() => chosen === null && legal.choices.has(a.index) && act({ type: 'CHOOSE_EVENT', choice: a.index })}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && chosen === null && legal.choices.has(a.index)) {
                  e.preventDefault();
                  act({ type: 'CHOOSE_EVENT', choice: a.index });
                }
              }}
            >
              <span className="box" />
              <span className={prose(a.reply, 'ot')}>{a.reply}</span>
              <Chips a={a} />
            </div>
          ))}
        </div>
        <div className="lfoot">
          <div className={`lout${sent && answer ? ' on' : ''}`}>{sent && answer ? answer.outcome : ''}</div>
          <div className="sent">{t('ui.event.sent')}</div>
        </div>
      </div>
    </div>
  );
}

