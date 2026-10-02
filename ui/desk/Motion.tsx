// Presentation only. Event ids select objects, resource events supply every delta and roll endpoint.
import { useLayoutEffect, useRef } from 'react';
import { pressLines } from '../../core/index.ts';
import { signedAmount } from '../text.ts';
import type { Snapshot } from '../queue.ts';
import { motionMode } from '../motion.ts';
import { fan } from './Hand.tsx';

const SLOTS = [[896, 458, -8], [918, 450, 5], [938, 442, -3], [956, 436, 7], [972, 430, -5]] as const;
const planeAt = (x: number, y: number, rot: number, scale: number) => `translate(${x - 93}px,${y - 126}px) rotateZ(${rot}deg) scale(${scale})`;

export function Motion({ snap }: { snap: Snapshot }) {
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
    host.current.querySelector('.motion-pile')?.appendChild(f.plane);
    flight.current = null;
  };
  useLayoutEffect(() => () => { finish(); for (const fn of tails.current.splice(0)) fn(); }, []);
  useLayoutEffect(() => {
    const root = host.current?.closest('.desk');
    if (!root || !host.current) return;
    if (turn.current !== snap.state.turn) {
      finish(); host.current.querySelector('.motion-pile')?.replaceChildren(); turn.current = snap.state.turn;
    }
    const active = snap.active;
    if (skipped.current !== snap.skipped) {
      skipped.current = snap.skipped; finish();
      for (const fn of tails.current.splice(0)) fn();
      lastLand.current = snap.steps.slice(-1)[0]?.id ?? 0; return;
    }
    if (!active) finish();
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
      const plane = document.createElement('div'); plane.className = 'plane motion-face'; plane.appendChild(face);
      host.current.querySelector('.motion-flight')?.appendChild(plane);
      const rot = parseFloat(original.style.getPropertyValue('--rot')) || 0;
      const lift = parseFloat(original.style.getPropertyValue('--lift')) || 0;
      const angle = rot * Math.PI / 180;
      const cx = parseFloat(original.style.left) + 93 + 176 * Math.sin(angle);
      const cy = 490 - lift + 302 - 176 * Math.cos(angle);
      const pileCount = host.current.querySelectorAll('.motion-pile .plane').length;
      const [x, y, rz] = SLOTS[Math.min(pileCount, SLOTS.length - 1)]!;
      original.style.visibility = 'hidden';
      const remaining = [...root.querySelectorAll<HTMLElement>('.hand .card')].filter(c => c !== original);
      const positions = fan(remaining.length);
      remaining.forEach((card, i) => {
        const pos = positions[i]!;
        card.style.left = `${pos.left}px`; card.style.setProperty('--rot', `${pos.rot}deg`); card.style.setProperty('--lift', `${pos.lift}px`);
      });
      const planeMotion = plane.animate([
        { transform: 'rotateX(0deg)', offset: 0 }, { transform: 'rotateX(0deg)', offset: 290 / 930, easing: 'cubic-bezier(.5,.05,.25,1)' },
        { transform: 'rotateX(58deg)', offset: 750 / 930, easing: 'cubic-bezier(.3,0,.3,1)' }, { transform: 'rotateX(64deg)' },
      ], { duration: 930, fill: 'forwards' });
      const faceMotion = face.animate([
        { transform: planeAt(cx, cy, rot, 1), offset: 0, easing: 'cubic-bezier(.2,.7,.3,1)' },
        { transform: planeAt(cx, cy - 50, 0, 1.04), offset: 200 / 930 },
        { transform: planeAt(cx, cy - 50, 0, 1.04), offset: 290 / 930, easing: 'cubic-bezier(.5,.05,.25,1)' },
        { transform: planeAt(x, y - 4, rz, .57), offset: 750 / 930, easing: 'cubic-bezier(.3,0,.3,1)' },
        { transform: planeAt(x, y, rz, .55) },
      ], { duration: 930, fill: 'forwards' });
      flight.current = { id: step.id, plane, face, original, x, y, rot: rz, animations: [planeMotion, faceMotion] };
    }
    if (beat !== 'land' || lastLand.current === step.id) return;
    lastLand.current = step.id;
    const animate = (el: Element, frames: Keyframe[], ms: number) => {
      const a = el.animate(frames, { duration: mode === 'reduced' ? Math.min(ms, 150) : ms }); tails.current.push(() => a.cancel());
    };
    // History gives the composed story's exact identity; never replace an arbitrary row.
    const line = pressLines(snap.steps).find(l => l.step === snap.steps.length - 1 && l.kind === 'play');
    if (line?.paper) {
      const story = root.querySelector<HTMLElement>(`[data-paper="${line.paper}"] [data-story="${line.step}:${line.event}"]`);
      if (story) animate(story, [{ clipPath: 'inset(0 100% 0 0)', backgroundColor: '#fff0be' }, { clipPath: 'inset(0)', backgroundColor: 'transparent' }], 650);
      const paper = root.querySelector<HTMLElement>(`[data-paper="${line.paper}"]`);
      if (paper) {
        if (!paper.classList.contains('pos0') && mode === 'full') {
          const own = getComputedStyle(paper).transform;
          animate(paper, [{ transform: own }, { transform: `${own} translateY(-9px)`, offset: .45 }, { transform: own }], 600);
        }
        for (const other of paper.querySelectorAll('[data-story]')) if (other !== story) animate(other, [{ opacity: .4 }, { opacity: 1 }], 220);
      }
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
          const a = span.animate([{ opacity: 0, clipPath: 'inset(0 100% 0 0)' }, { opacity: 1, clipPath: 'inset(0)' }], { delay: mode === 'full' ? delay : 0, duration: mode === 'full' ? duration : 150, fill: 'both' });
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
      const start = performance.now(); let frame = 0;
      const roll = () => {
        const t = Math.min(1, (performance.now() - start) / (mode === 'full' ? 560 : 150));
        const n = Math.round(e.value - e.delta * (1 - t) ** 3);
        value.textContent = id === 'money' ? `£${(n * 1000).toLocaleString('en-GB')}` : String(n);
        if (t < 1) frame = requestAnimationFrame(roll); else value.textContent = final;
      };
      frame = requestAnimationFrame(roll);
      tails.current.push((restore = true) => { cancelAnimationFrame(frame); if (restore) value.textContent = final; });
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
  return <div ref={host} className="motion-host" aria-hidden="true"><div className="scene3d motion-pile" /><div className="scene3d motion-flight" /></div>;
}
