// Presentation only. Event ids select objects, resource events supply every delta and roll endpoint.
import { useLayoutEffect, useRef } from 'react';
import { pressLines } from '../../core/index.ts';
import { signedAmount } from '../text.ts';
import type { Snapshot } from '../queue.ts';
import { motionMode } from '../motion.ts';
import { cue, tick } from '../sound/sound.ts';
import { fan } from './fan.ts';
import { easing, FLIGHT, planFlight, type FlightPlan, type Key } from './flight.ts';

const SLOTS = [[896, 458, -8], [918, 450, 5], [938, 442, -3], [956, 436, 7], [972, 430, -5]] as const;
const planeAt = (x: number, y: number, rot: number, scale: number) => `translate(${x - 93}px,${y - 126}px) rotateZ(${rot}deg) scale(${scale})`;
/** The flight's layers (motion.css): in front of the hand, then under it and the season's dim (round R7, A1). */
const LAYER = { front: 85, under: 31 } as const;
/** A track of the flight plan as Web Animations keyframes, each key at its moment of the flight, eased to the next. */
const frames = <T,>(keys: readonly Key<T>[], css: (v: T) => Keyframe): Keyframe[] =>
  keys.map((k) => ({ ...css(k.value), offset: k.at / FLIGHT.settle, ...(k.ease ? { easing: easing(k.ease) } : {}) }));
/** The plans already made, by hand size, place and slot: a hand plays the same flights again. */
const plans = new Map<string, FlightPlan>();

export function Motion({ snap, onTails }: { snap: Snapshot; onTails: (settle: () => void) => () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const flight = useRef<{ id: number; plane: HTMLElement; face: HTMLElement; original: HTMLElement; x: number; y: number; rot: number; animations: Animation[] } | null>(null);
  const tails = useRef<((restore?: boolean) => void)[]>([]);
  const skipped = useRef(snap.skipped);
  const lastStep = useRef(0);
  const turn = useRef(snap.state.turn);
  const lastLand = useRef(0);
  const previousNote = useRef('');
  const previousCountdown = useRef('');
  const finish = () => {
    const f = flight.current;
    if (!f || !host.current) return;
    for (const a of f.animations) a.cancel();
    f.original.style.visibility = '';
    f.plane.style.transform = 'rotateX(64deg)';
    f.face.style.transform = planeAt(f.x, f.y, f.rot, .55);
    f.plane.remove(); // the settled face is reconstructed from history by Pile
    flight.current = null;
  };
  useLayoutEffect(() => () => { finish(); for (const fn of tails.current.splice(0)) fn(); }, []);
  // The tails hold no input (round R1, Part A): the next action completes them, in their final state, first.
  useLayoutEffect(() => onTails(() => { finish(); for (const fn of tails.current.splice(0)) fn(); }), [onTails]);
  useLayoutEffect(() => {
    const root = host.current?.closest('.desk');
    if (!root || !host.current) return;
    if (turn.current !== snap.state.turn) {
      finish(); turn.current = snap.state.turn;
    }
    const active = snap.active;
    if (skipped.current !== snap.skipped) {
      skipped.current = snap.skipped; finish();
      for (const fn of tails.current.splice(0)) fn();
      lastLand.current = snap.steps.slice(-1)[0]?.id ?? 0; return;
    }
    if (!active) finish();
    if(active?.plan) { finish();for(const fn of tails.current.splice(0))fn();lastLand.current=active.step.id;return; }
    const step = active?.step ?? snap.steps.slice(-1)[0];
    const beat = active?.beat ?? 'land';
    const mode = active?.mode ?? motionMode();
    if (!step || mode === 'off') return;
    if (lastStep.current !== step.id) {
      for (const fn of tails.current.splice(0)) fn(false);
      lastStep.current = step.id;
    }
    const played = step.events.find(e => e.type === 'play');
    if (played && beat === 'lift' && flight.current?.id !== step.id && mode === 'full') {
      finish(); for (const fn of tails.current.splice(0)) fn();
      const original = root.querySelector<HTMLElement>(`.hand .card[data-uid="${played.uid}"]`);
      if (!original) return;
      previousNote.current = root.querySelector('.nb-txt')?.textContent ?? '';
      previousCountdown.current = root.querySelector('[data-hook="countdown"]')?.textContent ?? '';
      const face = original.cloneNode(true) as HTMLElement;
      face.removeAttribute('role'); face.removeAttribute('tabindex'); face.removeAttribute('data-uid');
      face.setAttribute('aria-hidden', 'true');
      const backgroundImage = face.style.backgroundImage;
      face.style.cssText = 'left:0;top:0;transform-origin:50% 50%;pointer-events:none;transition:none;--strip:150px';
      face.style.backgroundImage = backgroundImage;
      const plane = document.createElement('div'); plane.className = 'plane motion-face';
      const raise = document.createElement('div'); raise.className = 'motion-raise';
      plane.appendChild(raise); raise.appendChild(face);
      const layer = host.current.querySelector<HTMLElement>('.motion-flight')!;
      layer.appendChild(plane);
      const pileCount = root.querySelectorAll('.motion-pile .plane').length;
      const slot = Math.min(pileCount, SLOTS.length - 1);
      const [x, y, rz] = SLOTS[slot]!;
      original.style.visibility = 'hidden';
      const cards = [...root.querySelectorAll<HTMLElement>('.hand .card')];
      const remaining = cards.filter(c => c !== original);
      const positions = fan(remaining.length);
      remaining.forEach((card, i) => {
        const pos = positions[i]!;
        card.style.left = `${pos.left}px`; card.style.setProperty('--rot', `${pos.rot}deg`); card.style.setProperty('--lift', `${pos.lift}px`);
      });
      // The flight (round R7, A1; ./flight.ts): lifted and held in front of the hand, carried — raised where it must
      // clear the fan — and from the first moment it overlaps no card left in the hand, under the hand and the season's
      // dim, landing there. The face rides a raise inside the tilting plane; the layer changes once, on that moment.
      const key = `${cards.length}:${cards.indexOf(original)}:${slot}`;
      const plan = plans.get(key) ?? planFlight(cards.length, cards.indexOf(original), { x, y, rot: rz });
      plans.set(key, plan);
      const timing = { duration: FLIGHT.settle, fill: 'forwards' } as const;
      const planeMotion = plane.animate(frames(plan.tilt, (v) => ({ transform: `rotateX(${v}deg)` })), timing);
      const raiseMotion = raise.animate(frames(plan.raise, (v) => ({ transform: `translateY(${v}px)` })), timing);
      const faceMotion = face.animate(frames(plan.face, (v) => ({ transform: planeAt(v.x, v.y, v.rot, v.scale) })), timing);
      const under = plan.under / FLIGHT.settle;
      const layerMotion = layer.animate([{ zIndex: LAYER.front }, { zIndex: LAYER.front, offset: under }, { zIndex: LAYER.under, offset: under }, { zIndex: LAYER.under }], timing);
      flight.current = { id: step.id, plane, face, original, x, y, rot: rz, animations: [planeMotion, raiseMotion, faceMotion, layerMotion] };
    }
    if (beat !== 'land' || lastLand.current === step.id) return;
    lastLand.current = step.id;
    const animate = (el: Element, frames: Keyframe[], ms: number) => {
      const a = el.animate(mode==='reduced'?[{opacity:.4},{opacity:1}]:frames, { duration: mode === 'reduced' ? Math.min(ms, 150) : ms }); tails.current.push(() => a.cancel());
    };
    // History gives the composed story's exact identity; never replace an arbitrary row.
    const line = pressLines(snap.steps).find(l => l.step === snap.steps.length - 1 && l.kind === 'play');
    // Its sounds on the land beat (round R4, B2): the press for a headline, the pencil for a note.
    if (line) cue(line.paper ? 'print' : 'pencil', `${step.id}:land`);
    if (line?.paper) {
      const story = root.querySelector<HTMLElement>(`[data-paper="${line.paper}"] [data-story="${line.step}:${line.event}"]`);
      if (story) animate(story, [{ clipPath: 'inset(0 100% 0 0)', backgroundColor: '#fff0be' }, { clipPath: 'inset(0)', backgroundColor: 'transparent' }], 650);
      // The paper has come forward while the card was carried (Papers, round R1 H3), so the story prints in front.
      const paper = root.querySelector<HTMLElement>(`[data-paper="${line.paper}"]`);
      if (paper) for (const other of paper.querySelectorAll('[data-story]')) if (other !== story) animate(other, [{ opacity: .4 }, { opacity: 1 }], 220);
    } else if (line) {
      const note = root.querySelector<HTMLElement>('.nb-txt');
      if (note) {
        // Overlay holds the new handwriting; leave React's text node intact and restore it on skip/unmount.
        const overlay = document.createElement('span'); overlay.className = 'nb-txt motion-writing'; overlay.style.left = `${note.offsetLeft}px`; overlay.style.top = `${note.offsetTop}px`; overlay.style.width = `${note.offsetWidth}px`;
        const words = note.textContent?.split(/\s+/) ?? [];
        if (mode === 'full' && previousNote.current) {
          const old = document.createElement('span'); old.className = 'motion-old-line'; old.textContent = previousNote.current; overlay.appendChild(old);
          const fade = old.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' });
          tails.current.push(() => fade.cancel());
        }
        let delay = 220;
        for (const word of words) {
          const span = document.createElement('span'); span.textContent = word + ' '; overlay.appendChild(span);
          const duration = Math.max(90, word.length * 40);
          const a = span.animate(mode==='full'?[{ opacity: 0, clipPath: 'inset(0 100% 0 0)' }, { opacity: 1, clipPath: 'inset(0)' }]:[{opacity:0},{opacity:1}], { delay: mode === 'full' ? delay : 0, duration: mode === 'full' ? duration : 150, fill: 'backwards' });
          tails.current.push(() => a.cancel()); delay += duration + 40;
        }
        note.style.visibility = 'hidden'; note.parentElement?.appendChild(overlay);
        const done = () => { overlay.remove(); note.style.visibility = ''; };
        const timer = window.setTimeout(done, mode === 'full' ? delay : 150);
        tails.current.push(() => { clearTimeout(timer); done(); });
      }
    }
    // Aggregate same-resource events without inferring anything from before/after states.
    const resources = new Map<string, { target: 'hype' | 'craft' | 'heat' | 'capital'; delta: number; value: number }>();
    for (const e of step.events) if (e.type === 'resource') resources.set(e.target, { target: e.target, delta: (resources.get(e.target)?.delta ?? 0) + e.delta, value: e.value });
    for (const e of resources.values()) {
      if (!e.delta) continue;
      const id = e.target === 'capital' ? 'money' : e.target;
      const value = root.querySelector<HTMLElement>(`[data-hook="${id === 'money' ? 'value' : 'number'}-${id}"]`);
      if (!value) continue;
      const final = value.textContent;
      const start = performance.now(); let frame = 0; let ticked = e.value - e.delta;
      const roll = () => {
        const t = Math.min(1, (performance.now() - start) / (mode === 'full' ? 560 : 150));
        const n = Math.round(e.value - e.delta * (1 - t) ** 3);
        if (n !== ticked) { ticked = n; tick(); }
        value.textContent = id === 'money' ? `£${(n * 1000).toLocaleString('en-GB')}` : String(n);
        if (t < 1) frame = requestAnimationFrame(roll); else value.textContent = value.dataset.final??final;
      };
      if(mode==='full')frame = requestAnimationFrame(roll);
      tails.current.push((restore = true) => { cancelAnimationFrame(frame); if (restore) value.textContent = value.dataset.final??final; });
      const delta = document.createElement('span'); delta.className = `motion-delta delta-${id}`; delta.textContent = signedAmount(e.target, e.delta);
      const valueBox = value.getBoundingClientRect(), deskBox = root.getBoundingClientRect();
      delta.style.left = `${(valueBox.left + valueBox.width / 2 - deskBox.left) * 1280 / deskBox.width}px`;
      host.current.appendChild(delta);
      animate(delta, [{ opacity: 0 }, { opacity: 1, offset: .12 }, { opacity: 0 }], 1350);
      const timer = window.setTimeout(() => delta.remove(), mode === 'full' ? 1350 : 150);
      tails.current.push(() => { clearTimeout(timer); delta.remove(); });
      animate(value, [{ color: 'var(--motion-tint)' }, { color: 'inherit' }], 820);
    }
    if (step.events.some(e => e.type === 'resource' && e.target === 'heat')) {
      const pill = root.querySelector('[data-hook="countdown"]');
      if (pill && pill.textContent !== previousCountdown.current) animate(pill, mode === 'full' ? [{ transform: 'scale(1)' }, { transform: 'scale(1.1)', offset: .4 }, { transform: 'scale(1)' }] : [{ opacity: .4 }, { opacity: 1 }], 320);
    }
  }, [snap]);
  return <div ref={host} className="motion-host" aria-hidden="true"><div className="scene3d motion-flight" /></div>;
}
