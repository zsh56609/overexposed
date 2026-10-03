// The desk, the phone and the manager (round V1a; README §4, §5), as the mockup (v18) sets them. Flat on the
// desk, in its own perspective: the lane's props — two sheets of music; a script and a clapperboard; a
// magazine; nothing yet but the mug — the notebook and pencil, a frenzy's red clippings, and the phone. Standing
// on it: the metronome, the brush cup or the mug, and a frenzy's crumpled paper. Above the phone: the manager's
// messages. Words and numbers are the adapter's (./model.ts); the motion here is the desk's own — the
// metronome, the phone's buzz — and V1b adds the rest.

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { isPlaceholder } from '../text.ts';
import { motionMode, useMotionMode } from '../motion.ts';
import { crumple, sheetA, sheetB } from './drawings.ts';
import type { DeskLabels, LaneClass, MessagesModel, PhoneModel, ScriptModel } from './model.ts';

const reduceMotion = (): boolean => motionMode()!=='full';
const ph = (text: string, base?: string): string | undefined => (isPlaceholder(text) ? `${base ?? ''} placeholder`.trim() : base);

// ---------------------------------------------------------------------------
// Flat on the desk

function Script({ script }: { script: ScriptModel }) {
  return (
    <div className="script" data-hook="script" style={{ left: 118, top: 40, transform: 'rotate(-6deg)' }}>
      <b>{script.heading}</b>
      {script.lines.map((l, i) =>
        l.kind === 'action' ? (
          <span key={i} className={ph(l.text, 'act')}>
            {l.text}
          </span>
        ) : (
          <p key={i}>
            {l.cue && <span className="cue">{l.cue}:</span>} {l.kind === 'you' ? <i className={ph(l.text)}>{l.text}</i> : <span className={ph(l.text)}>{l.text}</span>}
          </p>
        ),
      )}
    </div>
  );
}

function Clapperboard({ words }: { words: DeskLabels['clapper'] }) {
  return (
    <svg className="flatclap" style={{ position: 'absolute', left: 650, top: 12, transform: 'rotate(-5deg)', filter: 'drop-shadow(0 12px 10px rgba(0,0,0,.5))' }} width="126" height="120" viewBox="0 -15 68 65" aria-hidden="true">
      <defs>
        <pattern id="stripeF" width="12" height="8" patternUnits="userSpaceOnUse" patternTransform="skewX(-38)">
          <rect width="6" height="8" fill="#181818" />
        </pattern>
      </defs>
      <rect x="2" y="12" width="64" height="37" rx="1.5" fill="#1b1b1b" />
      <g stroke="#e9e5db" strokeWidth=".55" opacity=".7">
        <line x1="2" y1="23" x2="66" y2="23" />
        <line x1="2" y1="35" x2="66" y2="35" />
        <line x1="34" y1="23" x2="34" y2="49" />
      </g>
      <g fontFamily="Courier New,monospace" fill="#ece8de">
        <text x="5" y="20" fontSize="5.2">
          {words.prod}
        </text>
        <text x="5" y="31.5" fontSize="4.8">
          {words.scene}
        </text>
        <text x="37" y="31.5" fontSize="4.8">
          {words.take}
        </text>
        <text x="5" y="43.5" fontSize="4.8">
          {words.roll}
        </text>
        <text x="37" y="43.5" fontSize="4.8">
          {words.int}
        </text>
      </g>
      <rect x="2" y="5" width="64" height="7" fill="#f1efe8" />
      <rect x="2" y="5" width="64" height="7" fill="url(#stripeF)" />
      {/* The arm, open — drawn inside the viewBox (it was clipped once). */}
      <g transform="rotate(-11 3 5)">
        <rect x="2" y="-2" width="64" height="7" rx=".6" fill="#f1efe8" />
        <rect x="2" y="-2" width="64" height="7" rx=".6" fill="url(#stripeF)" />
        <rect x="2" y="-2" width="64" height="7" rx=".6" fill="none" stroke="#181818" strokeWidth=".5" />
      </g>
      <circle cx="3.5" cy="5" r="1.4" fill="#9a958a" />
    </svg>
  );
}

/** The phone's clock: the player's own local time, as their phone would show it — 15:52 or 3:52, no AM/PM. */
function localClock(): string {
  const parts = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).formatToParts(new Date());
  return parts
    .filter((x) => x.type === 'hour' || x.type === 'minute' || x.type === 'literal')
    .map((x) => x.value)
    .join('')
    .trim();
}

/**
 * The phone, flat on the desk (README §5): no number badge — its lock screen shows the notifications, one bar
 * each, the manager's blue and, in a frenzy, the press's red; the player's own time, refreshed every few
 * seconds. In a frenzy the screen glows red and it buzzes every few seconds.
 */
const Phone = memo(function Phone({ phone, crisis }: { phone: PhoneModel; crisis: boolean }) {
  const motion=useMotionMode();
  const [clock, setClock] = useState(localClock);
  const [buzz, setBuzz] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setClock(localClock()), 15000);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    if (!crisis || motion!=='full') return;
    const id = window.setInterval(() => setBuzz((n) => n + 1), 5200);
    return () => window.clearInterval(id);
  }, [crisis,motion]);
  // Each buzz restarts the animation: a new key remounts the phone.
  const [buzzing, setBuzzing] = useState(false);
  useEffect(() => {
    if (buzz === 0) return;
    setBuzzing(true);
    const id = window.setTimeout(() => setBuzzing(false), 1400);
    return () => window.clearTimeout(id);
  }, [buzz]);
  return (
    <div className={`onDesk phone${buzzing ? ' buzz wake' : ''}`} data-hook="phone" key={buzz}>
      <div className="scr">
        <div className="lock">
          <b className="clk">{clock}</b>
          {phone.notes.map((k, i) => (
            <i key={i} className={`nt ${k}`}>
              <u />
              <em />
            </i>
          ))}
        </div>
      </div>
    </div>
  );
});

export const DeskPlane = memo(function DeskPlane({ lane, crisis, notebook, script, phone, labels }: { lane: LaneClass; crisis: boolean; notebook: string | null; script: ScriptModel | null; phone: PhoneModel; labels: DeskLabels }) {
  const sheets = useMemo(() => [sheetA(), sheetB(labels.sheet)], [labels.sheet]);
  return (
    <>
      {lane === 'music' && (
        <div className="onDesk prop">
          <div className="sheetm" style={{ left: 120, top: 34, transform: 'rotate(-8deg)' }} dangerouslySetInnerHTML={{ __html: sheets[0] as string }} />
          <div className="sheetm" style={{ left: 250, top: 56, transform: 'rotate(5deg)' }} dangerouslySetInnerHTML={{ __html: sheets[1] as string }} />
        </div>
      )}
      {lane === 'screen' && (
        <div className="onDesk prop">
          {script && <Script script={script} />}
          <Clapperboard words={labels.clapper} />
        </div>
      )}
      {lane === 'celebrity' && (
        <div className="onDesk prop">
          <div className="mag" style={{ left: 170, top: 30, transform: 'rotate(-7deg)' }}>
            {labels.gloss}
          </div>
        </div>
      )}
      <div className="onDesk notebook" data-hook="notebook" style={{ left: 470, top: 30, transform: 'rotate(4deg)' }}>
        <div className="nb-coil" />
        <div className={ph(notebook ?? '', 'nb-txt')}>{notebook}</div>
      </div>
      <div className="onDesk pencil" style={{ left: 572, top: 78, transform: 'rotate(-78deg)' }} />
      {/* A frenzy's red clippings: always here, shown by the desk's crisis look so they fade in. */}
      <div className="onDesk clipD" style={{ left: 520, top: 46, width: 120, height: 84, transform: 'rotate(-12deg)' }} />
      <div className="onDesk clipD" style={{ left: 640, top: 98, width: 104, height: 72, transform: 'rotate(9deg)' }} />
      <div className="onDesk clipD" style={{ left: 430, top: 128, width: 90, height: 64, transform: 'rotate(15deg)' }} />
      <Phone phone={phone} crisis={crisis} />
    </>
  );
});

// ---------------------------------------------------------------------------
// Standing on the desk

/**
 * The metronome (README §4; the mockup's metroFrame): it swings — a full period of 2.4 s, 1.3 s in a frenzy.
 * A click stops it: it finishes the stroke, then eases to the centre. Another starts it from the centre with a
 * growing swing. It starts stopped when the system asks for reduced motion.
 */
function Metronome({ crisis, title }: { crisis: boolean; title: string }) {
  const motion=useMotionMode();
  const userStopped=useRef(false);
  const arm = useRef<SVGGElement>(null);
  const engine = useRef({ mode: reduceMotion() ? 'stopped' : 'run', ph: 0, amp: 1, last: null as number | null, to: 0, from: 0, t: 0, dur: 0, period: 2.4 });
  engine.current.period = crisis ? 1.3 : 2.4;
  useEffect(() => {
    if(motion!=='full'){engine.current.last=null;if(arm.current)arm.current.style.transform='rotate(0deg)';return;}
    if(engine.current.last===null)engine.current.mode=userStopped.current?'stopped':'run';
    let raf = 0;
    const frame = (ts: number) => {
      const M = engine.current;
      const dt = M.last === null ? 0 : Math.min(0.05, (ts - M.last) / 1000);
      M.last = ts;
      const T = M.period;
      const w = (2 * Math.PI) / T;
      let a = 0;
      if (M.mode === 'run') {
        M.ph += w * dt;
        M.amp = Math.min(1, M.amp + dt / T);
        a = 17 * M.amp * Math.sin(M.ph);
      } else if (M.mode === 'finish') {
        M.ph += w * dt;
        if (M.ph >= M.to) {
          M.mode = 'settle';
          M.from = 17 * M.amp * Math.sin(M.to);
          M.t = 0;
          M.dur = T * 0.42;
          a = M.from;
        } else a = 17 * M.amp * Math.sin(M.ph);
      } else if (M.mode === 'settle') {
        M.t += dt;
        const k = Math.min(1, M.t / M.dur);
        const e = 0.5 - 0.5 * Math.cos(Math.PI * k);
        a = M.from * (1 - e);
        if (k >= 1) M.mode = 'stopped';
      }
      if (arm.current) arm.current.style.transform = `rotate(${a.toFixed(2)}deg)`;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [motion]);
  const toggle = () => {
    if(motion!=='full')return;
    const M = engine.current;
    if (M.mode === 'run') {
      userStopped.current=true;
      const hp = Math.PI / 2;
      M.to = Math.ceil((M.ph - hp) / Math.PI) * Math.PI + hp;
      if (M.to < M.ph) M.to += Math.PI;
      M.mode = 'finish';
    } else if (M.mode === 'stopped') {
      userStopped.current=false;
      M.mode = 'run';
      M.ph = 0;
      M.amp = 0;
    }
  };
  return (
    <svg className="up metro" data-hook="metronome" style={{ left: 724, top: 392 }} width="58" height="74" viewBox="0 0 60 80" onClick={toggle} role="button" aria-label={title}>
      <title>{title}</title>
      <polygon points="19,4 41,4 57,76 3,76" fill="#8e5d35" />
      <polygon points="19,4 41,4 43,12 17,12" fill="#a8723f" />
      <polygon points="23,14 37,14 47,68 13,68" fill="#241810" />
      <g className="metro-arm" ref={arm}>
        <line x1="30" y1="64" x2="30" y2="16" stroke="#dcd6c8" strokeWidth="2" />
        <rect x="25.5" y="27" width="9" height="7" rx="1" fill="#c9c2b2" />
      </g>
      <rect x="1" y="75" width="58" height="5" rx="1" fill="#5c3c22" />
    </svg>
  );
}

function BrushCup() {
  return (
    <svg className="up" style={{ left: 728, top: 374 }} width="52" height="92" viewBox="0 0 52 92" aria-hidden="true">
      <g strokeLinecap="round">
        <line x1="17" y1="54" x2="10" y2="14" stroke="#2a2a2a" strokeWidth="3" />
        <ellipse cx="9" cy="10" rx="5" ry="8" fill="#e8c7a8" transform="rotate(-12 9 10)" />
        <line x1="24" y1="54" x2="22" y2="8" stroke="#c9a15b" strokeWidth="3" />
        <ellipse cx="22" cy="5" rx="4.5" ry="7" fill="#f3d9c2" />
        <line x1="31" y1="54" x2="36" y2="12" stroke="#2a2a2a" strokeWidth="3" />
        <ellipse cx="37" cy="8" rx="5.5" ry="8" fill="#d99aa8" transform="rotate(12 37 8)" />
        <line x1="37" y1="54" x2="44" y2="22" stroke="#c9a15b" strokeWidth="2.5" />
        <ellipse cx="45" cy="19" rx="3.5" ry="6" fill="#b88a6a" transform="rotate(18 45 19)" />
      </g>
      <rect x="9" y="50" width="34" height="40" rx="4" fill="#d9a07f" />
      <rect x="9" y="50" width="34" height="6" rx="3" fill="#e8b996" />
      <rect x="11" y="56" width="4" height="30" rx="2" fill="rgba(255,255,255,.28)" />
    </svg>
  );
}

function Mug() {
  return (
    <svg className="up" style={{ left: 722, top: 408 }} width="62" height="58" viewBox="0 0 62 58" aria-hidden="true">
      <path className="steam" d="M20 14 C18 9 23 7 21 2" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="1.5" strokeLinecap="round" />
      <path className="steam late" d="M30 14 C28 9 33 7 31 2" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="9" y="18" width="34" height="36" rx="4" fill="#ece6d8" />
      <rect x="11" y="22" width="4" height="28" rx="2" fill="rgba(255,255,255,.5)" />
      <path d="M43 25 C56 25 56 45 43 45" fill="none" stroke="#ece6d8" strokeWidth="4.5" />
      <ellipse cx="26" cy="18" rx="17" ry="3.4" fill="#3b2415" />
    </svg>
  );
}

export const Uprights = memo(function Uprights({ lane, crisis, labels, balls }: { lane: LaneClass; crisis: boolean; labels: DeskLabels; balls: readonly [number, number] }) {
  const [a, b] = balls;
  const drawn = useMemo(() => [crumple(a, 68, 62), crumple(b, 46, 42)], [a, b]);
  return (
    <>
      {lane !== 'screen' && <div className="cshadow" style={{ left: 712, top: 456, width: 80, height: 14 }} />}
      {lane === 'music' && <Metronome crisis={crisis} title={labels.metronome} />}
      {lane === 'celebrity' && <BrushCup />}
      {lane === 'early' && <Mug />}
      {/* A frenzy's crumpled paper: always here, thrown onto the desk by the crisis look. */}
      <div className="ball" style={{ left: 402, top: 404 }} dangerouslySetInnerHTML={{ __html: drawn[0] as string }} />
      <div className="ball" style={{ left: 474, top: 424 }} dangerouslySetInnerHTML={{ __html: drawn[1] as string }} />
    </>
  );
});

// ---------------------------------------------------------------------------
// The manager's messages

/**
 * The messages above the phone (README §5): each two bubbles, labelled with the manager's name. Clicking a
 * bubble opens a row of three reactions below it; choosing one leaves it as a badge on the bubble's corner,
 * choosing it again removes it, another replaces it. A reaction belongs to one bubble of one message — its
 * month and its place — never to its words. UI state only: no rule reads it.
 */
export const Bubbles = memo(function Bubbles({ messages, visibleBubbles }: { messages: MessagesModel | null; visibleBubbles?:number }) {
  const [rx, setRx] = useState<ReadonlyMap<string, string>>(new Map());
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    if (open === null) return;
    const close = () => setOpen(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);
  if (!messages || messages.messages.length === 0) return <div className="bubbles" data-hook="bubbles" />;
  return (
    <div className="bubbles" data-hook="bubbles">
      <div className="bub who">{messages.from}</div>
      {messages.messages.flatMap((m) =>
        m.bubbles.map((text, i) => {
          const k = `${m.id}.${i}`;
          const mine = rx.get(k);
          return (
            <div
              key={k}
              className={`bub${mine ? ' has-rx' : ''}${open === k ? ' open' : ''}`}
              data-k={k}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(open === k ? null : k);
              }}
            >
              <span className={ph(text)}>{text}</span>
              {mine && <span className="rx">{mine}</span>}
              {open === k && (
                <div className="rx-bar">
                  {messages.reactions.map((emoji) => (
                    <button
                      key={emoji}
                      className={mine === emoji ? 'on' : undefined}
                      onClick={(e) => {
                        e.stopPropagation();
                        setRx((was) => {
                          const next = new Map(was);
                          if (was.get(k) === emoji) next.delete(k);
                          else next.set(k, emoji);
                          return next;
                        });
                        setOpen(null);
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        }),
      ).slice(0,visibleBubbles)}
    </div>
  );
});
