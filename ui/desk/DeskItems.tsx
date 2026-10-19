// The desk, the phone and the manager (round V1a; README §4, §5), as the mockup (v18) sets them. Flat on the
// desk, in its own perspective: the lane's props — two sheets of music; a script and a clapperboard; a
// magazine; nothing yet but the mug — the notebook and pencil, a frenzy's red clippings, and the phone. Standing
// on it: the metronome, the brush cup or the mug, and a frenzy's crumpled paper. Above the phone: the manager's
// messages. Words and numbers are the adapter's (./model.ts); the motion here is the desk's own — the
// metronome, the phone's buzz — and V1b adds the rest.

import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Face } from '../Face.tsx';
import { isPlaceholder } from '../text.ts';
import { composeTransforms, motionMode, useMotionMode } from '../motion.ts';
import { cue } from '../sound/sound.ts';
import { crumple, sheetA, sheetB } from './drawings.ts';
import { LOCK_BARS, type DeskLabels, type LaneClass, type MessagesModel, type PhoneModel, type ScriptModel } from './model.ts';

const reduceMotion = (): boolean => motionMode()!=='full';
const ph = (text: string, base?: string): string | undefined => (isPlaceholder(text) ? `${base ?? ''} placeholder`.trim() : base);

// ---------------------------------------------------------------------------
// Flat on the desk

function Script({ script }: { script: ScriptModel }) {
  return (
    <div className="script" data-hook="script" style={{ left: 158, top: 40, transform: 'rotate(3deg)' }}>
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
 * The phone, flat on the desk (README §5): no number badge — its lock screen shows the notifications as bars, the
 * manager's blue and, in a frenzy, the press's red; the player's own time, refreshed every few seconds. In a frenzy the
 * screen glows red and it buzzes every few seconds. Round R8a: the texts' phone, scaled (C1); a manager bar for each
 * bubble on screen, arriving with it, the newest on top (C2: `bubbles`, from the desk's Bubbles), the press's below.
 */
const Phone = memo(function Phone({ phone, bubbles, crisis }: { phone: PhoneModel; bubbles: number; crisis: boolean }) {
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
  // A manager bar for each bubble on screen, the newest on top (its key the bubble's place): seven at most.
  const mgr = Math.min(bubbles, LOCK_BARS);
  return (
    <div className={`onDesk phone${buzzing ? ' buzz wake' : ''}`} data-hook="phone" key={buzz}>
      <div className="phone-screen">
        <div className="lock">
          <b className="clk">{clock}</b>
          {Array.from({ length: mgr }, (_, i) => (
            <i key={`m${mgr - i}`} className="nt mgr">
              <u />
              <em />
            </i>
          ))}
          {Array.from({ length: phone.press }, (_, i) => (
            <i key={`p${i}`} className="nt press">
              <u />
              <em />
            </i>
          ))}
        </div>
      </div>
    </div>
  );
});

export const DeskPlane = memo(function DeskPlane({ lane, crisis, notebook, script, phone, bubbles, labels }: { lane: LaneClass; crisis: boolean; notebook: string | null; script: ScriptModel | null; phone: PhoneModel; bubbles: number; labels: DeskLabels }) {
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
          <div className="mag" style={{ left: 210, top: 30, transform: 'rotate(4deg)' }}>
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
      <Phone phone={phone} bubbles={bubbles} crisis={crisis} />
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
    <svg className="up metro" data-hook="metronome" style={{ left: 724, top: 392, overflow: 'visible' }} width="58" height="74" viewBox="0 0 60 80" onClick={toggle} role="button" aria-label={title}>
      <title>{title}</title>
      {/* Its contact shadow (round R8a, C3; docs/design/visual/ref/r8a-metronome.svg): a small dark ellipse under its base. */}
      <defs>
        <radialGradient id="metro-cs" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#000" stopOpacity=".64" />
          <stop offset=".6" stopColor="#000" stopOpacity=".44" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="35" cy="79.8" rx="38" ry="4.8" fill="url(#metro-cs)" />
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

/**
 * The brush cup on a celebrity desk (round R8a, C3; docs/design/visual/ref/r8a-brushcup.svg): a rose-glazed cup with a
 * gold rim and five brushes, its base where the old cup's was. Its contact shadow is its own: a small dark ellipse
 * tight under its base, reaching a little to the right, as the pencil's shadow falls. Its ids carry a prefix.
 */
function BrushCup() {
  return (
    <svg className="up" style={{ left: 718, top: 363 }} width="72" height="112" viewBox="0 0 72 112" aria-hidden="true">
      <defs>
      <radialGradient id="bc-cs" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#000" stopOpacity=".64"/><stop offset=".6" stopColor="#000" stopOpacity=".42"/><stop offset="1" stopColor="#000" stopOpacity="0"/></radialGradient>
      <linearGradient id="bc-metal-rose" x1="0" x2="1"><stop offset="0" stopColor="#b9806c"/><stop offset=".35" stopColor="#f3cdb8"/><stop offset=".6" stopColor="#d39c86"/><stop offset="1" stopColor="#9b6553"/></linearGradient>
      <linearGradient id="bc-metal-silver" x1="0" x2="1"><stop offset="0" stopColor="#8f9399"/><stop offset=".35" stopColor="#eef0f3"/><stop offset=".6" stopColor="#c3c7cd"/><stop offset="1" stopColor="#7d8188"/></linearGradient>
      <clipPath id="bc-body"><path d="M19.0 62.0 L19.0 101.0 A17.0 7.14 0 0 0 53.0 101.0 L53.0 62.0 Z"/></clipPath>
      </defs>
      <ellipse cx="41" cy="102.4" rx="24.6" ry="9.5" fill="url(#bc-cs)"/>
      <ellipse cx="36.0" cy="62.0" rx="17.0" ry="7.14" fill="#c98f86"/>
      <ellipse cx="36.0" cy="62.5" rx="15.3" ry="6.24" fill="#3a2422"/>
      <g transform="translate(31.0 74) rotate(-6)"><path d="M-1.29 0 L-1.87 -33 L1.87 -33 L1.29 0 Z" fill="#1d1c20"/><path d="M-0.61 -5.0 L-0.95 -32.0" stroke="#fff" strokeWidth=".7" opacity=".25"/><path d="M-1.87 -33 L-6.56 -41 L6.56 -41 L1.87 -33 Z" fill="url(#bc-metal-rose)"/><path d="M-5.90 -36.6 L5.90 -36.6" stroke="#000" strokeWidth=".5" opacity=".22"/><g transform="translate(0 -41)"><path d="M-8.0 0 C-9.6 -6 -5.6 -14.4 0 -15.4 C5.6 -14.4 9.6 -6 8.0 0 Z" fill="#5a4334"/><path d="M-9.0 -6.4 C-8.8 -11 -4.8 -14.4 0 -15.4 C4.8 -14.4 8.8 -11 9.0 -6.4 C3.2 -8.6 -3.2 -8.6 -9.0 -6.4 Z" fill="#ecd8c2"/></g></g><g transform="translate(43.4 74) rotate(22)"><path d="M-0.99 0 L-1.43 -30 L1.43 -30 L0.99 0 Z" fill="#b9814b"/><path d="M-0.47 -4.5 L-0.73 -29.0" stroke="#fff" strokeWidth=".7" opacity=".25"/><path d="M-1.43 -30 L-3.00 -36 L3.00 -36 L1.43 -30 Z" fill="url(#bc-metal-silver)"/><path d="M-2.70 -32.7 L2.70 -32.7" stroke="#000" strokeWidth=".5" opacity=".22"/><g transform="translate(0 -36)"><path d="M-1.4 0 L-9.4 -9.6 A12.6 12.6 0 0 1 9.4 -9.6 L1.4 0 Z" fill="#e6e0d6"/><path d="M-8.2 -8.4 L-9.4 -9.6 A12.6 12.6 0 0 1 9.4 -9.6 L8.2 -8.4 A11 11 0 0 0 -8.2 -8.4 Z" fill="#fbf9f5"/></g></g><g transform="translate(24.6 74) rotate(-25)"><path d="M-1.14 0 L-1.65 -27 L1.65 -27 L1.14 0 Z" fill="#1d1c20"/><path d="M-0.54 -4.0 L-0.84 -26.0" stroke="#fff" strokeWidth=".7" opacity=".25"/><path d="M-1.65 -27 L-4.10 -34 L4.10 -34 L1.65 -27 Z" fill="url(#bc-metal-rose)"/><path d="M-3.69 -30.1 L3.69 -30.1" stroke="#000" strokeWidth=".5" opacity=".22"/><g transform="translate(0 -34)"><path d="M-4.5 0 L-5.0 -8.4 Q-1.0 -9.6 5.0 -13 L4.5 0 Z" fill="#3a2a22"/><path d="M-5.0 -6.6 L-5.0 -8.4 Q-1.0 -9.6 5.0 -13 L5.0 -10.4 Q-1.0 -7.6 -5.0 -6.6 Z" fill="#94735c"/></g></g><g transform="translate(39.4 74) rotate(4)"><path d="M-1.29 0 L-1.87 -22 L1.87 -22 L1.29 0 Z" fill="#ece6dd"/><path d="M-0.61 -3.3 L-0.95 -21.0" stroke="#fff" strokeWidth=".7" opacity=".25"/><path d="M-1.87 -22 L-5.25 -29 L5.25 -29 L1.87 -22 Z" fill="url(#bc-metal-rose)"/><path d="M-4.72 -25.1 L4.72 -25.1" stroke="#000" strokeWidth=".5" opacity=".22"/><g transform="translate(0 -29)"><path d="M-5.76 0 L-6.4 -8.6 C-6.4 -10.6 6.4 -10.6 6.4 -8.6 L5.76 0 Z" fill="#4e3a30"/><path d="M-6.4 -7 L-6.4 -8.6 C-6.4 -10.6 6.4 -10.6 6.4 -8.6 L6.4 -7 C2.56 -8 -2.56 -8 -6.4 -7 Z" fill="#b8957d"/></g></g><g transform="translate(48.0 74) rotate(38)"><path d="M-0.76 0 L-1.10 -24 L1.10 -24 L0.76 0 Z" fill="#1d1c20"/><path d="M-0.36 -3.6 L-0.56 -23.0" stroke="#fff" strokeWidth=".7" opacity=".25"/><path d="M-1.10 -24 L-2.40 -28 L2.40 -28 L1.10 -24 Z" fill="url(#bc-metal-silver)"/><path d="M-2.16 -25.8 L2.16 -25.8" stroke="#000" strokeWidth=".5" opacity=".22"/><g transform="translate(0 -28)"><path d="M-1.26 0 L0 -7.6 L1.26 0 Z" fill="#1a1416"/><path d="M-0.7 -4 L0 -7.6 L0.7 -4 Z" fill="#3a2e30"/></g></g>
      <path d="M19.0 62.0 L19.0 101.0 A17.0 7.14 0 0 0 53.0 101.0 L53.0 62.0 Z" fill="#dba69c"/>
      <g clipPath="url(#bc-body)">
      <path d="M42.0 62.0 C45.0 76 45.0 90 42.0 109.0 L55.0 109.0 L55.0 62.0 Z" fill="#5a2a22" opacity=".2"/>
      <path d="M21.6 67.0 L21.6 100.0 L24.6 101.0 L24.6 67.0 Z" fill="#fff" opacity=".32"/>
      <path d="M17.0 97.4 A19.0 7.74 0 0 0 55.0 97.4 L55.0 110.0 L17.0 110.0 Z" fill="#5a2a22" opacity=".14"/>
      </g>
      <path d="M19.0 62.0 A17.0 7.14 0 0 0 53.0 62.0" fill="none" stroke="#e2c27a" strokeWidth="1.7"/>
      <path d="M19.0 62.0 A17.0 7.14 0 0 1 53.0 62.0" fill="none" stroke="#b8975a" strokeWidth="1"/>
    </svg>
  );
}

/**
 * The mug on the neutral desk (round R8a, C3; docs/design/visual/ref/r8a-mug.svg): a diner mug in three flat tones and
 * two red stripes, in the old mug's box. Its contact shadow is its own, a small dark ellipse tight under its base,
 * reaching a little to the right; the steam keeps its classes and its animation. Its ids carry the mug- prefix: no
 * other drawing in the page shares them.
 */
function Mug() {
  return (
    <svg className="up mug" style={{ left: 715, top: 399 }} width="74" height="74" viewBox="0 0 140 140" aria-hidden="true">
      <defs>
      <radialGradient id="mug-cs" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#000" stopOpacity=".64"/><stop offset=".6" stopColor="#000" stopOpacity=".44"/><stop offset="1" stopColor="#000" stopOpacity="0"/></radialGradient>
      <clipPath id="mug-mouth"><ellipse cx="62.0" cy="42.8" rx="25.6" ry="10.6"/></clipPath>
      <clipPath id="mug-body"><path d="M32.0 42.0 C29.4 52 28.6 66 29.4 78 C30.2 90 33.0 99 37.0 104.0 A25.0 10.5 0 0 0 87.0 104.0 C91.0 99 93.8 90 94.6 78 C95.4 66 94.6 52 92.0 42.0 Z"/></clipPath>
      </defs>
      <ellipse cx="71" cy="105.6" rx="37" ry="13.6" fill="url(#mug-cs)"/>
      <path d="M91.6 51.6 C101 47.4 116.4 49 119.4 60.4 C122.2 71.4 113.4 83.6 100.6 87.6 C97.6 88.6 94.6 89.6 92 90.4 L93.4 81.4 C96.6 80.6 99.4 79.6 101.8 78.4 C108.8 75 112.4 68.6 110.8 63.4 C109.2 58.2 101.6 57.4 93.8 60.6 Z" fill="#e9e1d1"/>
      <path d="M110.6 54.4 C117.4 57 120.6 64.6 118 72.6 C115.4 80.6 108 85.6 100.6 87.6 C97.6 88.6 94.6 89.6 92 90.4 L92.6 86.6 C99.6 84.4 109.6 80 112.6 71.6 C114.6 66 113.6 59.4 110.6 54.4 Z" fill="#2b1d10" opacity=".16"/>
      <path d="M93.8 60.6 C101.6 57.4 109.2 58.2 110.8 63.4 C111.4 65.4 111.2 67.6 110.2 69.8" fill="none" stroke="#b9ac94" strokeWidth="2.2" strokeLinecap="round"/>
      <path d="M32.0 42.0 C29.4 52 28.6 66 29.4 78 C30.2 90 33.0 99 37.0 104.0 A25.0 10.5 0 0 0 87.0 104.0 C91.0 99 93.8 90 94.6 78 C95.4 66 94.6 52 92.0 42.0 Z" fill="#efe8da"/>
      <g clipPath="url(#mug-body)">
      <path d="M30.9 53.6 A31.1 13.1 0 0 0 93.1 53.6 L93.1 57.0 A31.1 13.1 0 0 1 30.9 57.0 Z" fill="#c8281c"/>
      <path d="M30.4 59.8 A31.6 13.3 0 0 0 93.6 59.8 L93.6 61.7 A31.6 13.3 0 0 1 30.4 61.7 Z" fill="#c8281c"/>
      <path d="M76.0 54.4 C83.0 62 84.0 82 78.0 113.6 C82.0 111.0 87.0 107.0 87.0 104.0 C91.0 99 93.8 90 94.6 78 C95.4 66 94.6 52 92.0 42.0 C90.0 48.0 84.0 52.6 76.0 54.4 Z" fill="#2b1d10" opacity=".2"/>
      <path d="M33.6 50 C32.0 62 32.0 80 35.0 94 L39.4 94 C37.0 80 37.0 62 38.4 50 Z" fill="#fffdf8" opacity=".75"/>
      <path d="M33.0 100 A29.0 12.1 0 0 0 91.0 100 L91.0 112 L33.0 112 Z" fill="#2b1d10" opacity=".13"/>
      </g>
      <ellipse cx="62.0" cy="42.0" rx="30.0" ry="12.6" fill="#f6f1e6"/>
      <ellipse cx="62.0" cy="42.8" rx="25.6" ry="10.6" fill="#bdb19c"/>
      <g clipPath="url(#mug-mouth)">
      <ellipse cx="62.0" cy="46.2" rx="25.4" ry="10.2" fill="#2d1a0e"/>
      <ellipse cx="62.0" cy="46.2" rx="24.8" ry="9.7" fill="none" stroke="#6d4429" strokeWidth="1.4"/>
      <ellipse cx="55.0" cy="44.8" rx="7.4" ry="1.8" fill="#fff" opacity=".16"/>
      </g>
      <path d="M33.4 44.6 A28.6 11.6 0 0 0 56.0 54.0" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity=".8"/>
      <g fill="none" stroke="#fff" strokeLinecap="round" opacity=".26">
      <path className="steam" d="M55 31 C50 25 58 20 53.6 13 C51 9 54 5 56 3" strokeWidth="2"/>
      <path className="steam late" d="M68 29 C72 23 64 18 68.6 11 C70.6 8 69 4 67.4 2" strokeWidth="1.6"/>
      </g>
    </svg>
  );
}

export const Uprights = memo(function Uprights({ lane, crisis, labels, balls }: { lane: LaneClass; crisis: boolean; labels: DeskLabels; balls: readonly [number, number] }) {
  const [a, b] = balls;
  const drawn = useMemo(() => [crumple(a, 68, 62), crumple(b, 46, 42)], [a, b]);
  return (
    <>
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

/** How the month's bubbles come (round R3, C1): once its hand is dealt and the desk is still, one by one. */
const REVEAL = { first: 250, next: 380 } as const;

/** The phone's screen lights once — v18's own glow, never a whole-phone filter (V1b; on its own at signing, R4 A2). */
export function glowPhone(desk: Element | null): Animation[] {
  const screen = desk?.querySelector('.phone .phone-screen');
  if (!desk || !screen) return [];
  const shadow = getComputedStyle(screen).boxShadow;
  return [screen.animate([{ boxShadow: shadow }, { boxShadow: desk.classList.contains('crisis') ? 'inset 0 0 24px rgba(255,120,100,.5)' : 'inset 0 0 22px rgba(170,205,255,.35)', offset: 0.2 }, { boxShadow: shadow }], 450)];
}

/**
 * A message comes in (V1b): the phone shakes and its screen lights. Its animations, for the next action to finish
 * with the rest of the messages (round R3, C1).
 */
function buzz(desk: Element | null): Animation[] {
  const phone = desk?.querySelector('.phone');
  if (!desk || !phone) return [];
  const own = getComputedStyle(phone).transform;
  const shake = phone.animate([{ transform: own }, { transform: composeTransforms(own, 'translateX(3px)'), offset: 0.2 }, { transform: composeTransforms(own, 'translateX(-2px)'), offset: 0.4 }, { transform: own }], 450);
  return [shake, ...glowPhone(desk)];
}

/**
 * The messages above the phone (README §5): each two bubbles, labelled with the manager's name. Clicking a
 * bubble opens a row of three reactions below it; choosing one leaves it as a badge on the bubble's corner,
 * choosing it again removes it, another replaces it. A reaction belongs to one bubble of one message — its
 * month and its place — never to its words. UI state only: no rule reads it.
 *
 * Round R3: the month's messages wait for a clear desk (C1) — none before its hand is dealt, then one by one once
 * the desk is still. And a bubble once shown stays until its month ends (C2): the count shown only grows within a
 * month, and a bubble shown stays even if the month's list were derived without it.
 *
 * Round R7 (A4): once a month's first bubble has come, the rest keep their pace whatever the player does — an action,
 * a card's flight and the month's end never bring them at once. They hold no input, so nothing waits on them; if the
 * month ends before they have all come, the rest are not shown. Reduced motion shows them all at once, with one buzz.
 */
export const Bubbles = memo(function Bubbles({ messages, visibleBubbles, busy = false, ending = false, onShown }: { messages: MessagesModel | null; visibleBubbles?: number; busy?: boolean; ending?: boolean; onShown?: (n: number) => void }) {
  const [rx, setRx] = useState<ReadonlyMap<string, string>>(new Map());
  const [open, setOpen] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  /** When the last bubble came (performance.now()): the next keeps its pace from it, whatever re-renders between. */
  const last = useRef(0);
  useEffect(() => {
    if (open === null) return;
    const close = () => setOpen(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);
  const all = useMemo(() => (messages?.messages ?? []).flatMap((m) => m.bubbles.map((text, i) => ({ k: `${m.id}.${i}`, text }))), [messages]);
  const month = messages?.month ?? -1;
  const allowed = visibleBubbles === undefined ? all.length : Math.min(all.length, visibleBubbles);
  const [shown, setShown] = useState(() => ({ month, n: motionMode() === 'full' ? 0 : allowed }));
  const n = shown.month === month ? shown.n : 0;
  useEffect(() => {
    if (shown.month !== month) {
      setShown({ month, n: motionMode() === 'full' ? 0 : allowed });
      if (motionMode() === 'reduced' && allowed > 0) cue('buzz'); // all at once: the buzz alone (round R4, B2)
      return;
    }
    if (n >= allowed) return;
    if (motionMode() !== 'full') {
      setShown({ month, n: allowed });
      return;
    }
    // The month is ending (END TURN): the rest of its messages are not shown (A4).
    if (ending) return;
    // The deal first: the first comes once the desk is still; the rest keep their pace from it, a play or not (A4).
    if (n === 0 && busy) return;
    const id = window.setTimeout(
      () => {
        last.current = performance.now();
        setShown({ month, n: n + 1 });
        // A month's messages begin with a buzz, and each bubble pops (round R4, B2).
        if (n === 0) cue('buzz');
        cue('bubble');
        if (n % 2 === 0) buzz(box.current?.closest('.desk') ?? null);
      },
      n === 0 ? REVEAL.first : Math.max(0, last.current + REVEAL.next - performance.now()),
    );
    return () => window.clearTimeout(id);
  }, [month, n, allowed, busy, ending, shown.month]);
  // Every bubble this month has shown, so none can go before the month does.
  const seen = useRef<{ month: number; list: { k: string; text: string }[] }>({ month, list: [] });
  if (seen.current.month !== month) seen.current = { month, list: [] };
  const list = all.slice(0, n);
  for (const x of list) if (!seen.current.list.some((y) => y.k === x.k)) seen.current.list.push(x);
  for (const x of seen.current.list) if (!list.some((y) => y.k === x.k)) list.push(x);
  // Revealing from the moment the month's messages are due until the last is shown, the wait before the first included;
  // a month that is ending shows no more (A4).
  const revealing = messages && n < allowed && !ending ? '1' : undefined;
  // How many bubbles are on screen, for the phone's bars (round R8a, C2): told before the frame paints, so a bar
  // arrives with its bubble; a bubble the month's end drops never comes, and so never gets one.
  const count = messages ? list.length : 0;
  useLayoutEffect(() => onShown?.(count), [count, onShown]);
  if (!messages || list.length === 0) return <div className="bubbles" data-hook="bubbles" data-revealing={revealing} ref={box} />;
  return (
    <div className="bubbles" data-hook="bubbles" data-revealing={revealing} ref={box}>
      <div className="bub who">
        {messages.avatar && <Face id={messages.avatar} size={22} />}
        <span>{messages.from}</span>
      </div>
      {list.map(({ k, text }) => {
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
        })}
    </div>
  );
});
