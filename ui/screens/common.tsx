// What the screens around the desk share (round R1; README §8–§9): the header pattern, the endings found as
// dots, the stamp a choice wears before it is made, and the fonts the title waits for.

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { motionMode } from '../motion.ts';
import { t } from '../i18n.ts';
import { isPlaceholder } from '../text.ts';
import './screens.css';

/** Prose the author hasn't written yet is shown as a placeholder, never hidden (decision 15). */
export const prose = (text: string, base = ''): string => `${base}${isPlaceholder(text) ? ' placeholder' : ''}`.trim();

/** README §9's header: an amber small-caps kicker, a Playfair title, an italic line. */
export function Header({ kicker, title, line, top }: { kicker: string; title: string; line?: string | null; top: number }) {
  return (
    <div className="ovh" style={{ top }}>
      <small>{kicker}</small>
      <b>{title}</b>
      {line ? <i className={prose(line)}>{line}</i> : null}
    </div>
  );
}

/** "Endings found N / 14" with a dot per minor ending, filled once found (the endings collection, ui/collection.ts). */
export function FoundDots({ minors, found }: { minors: readonly { readonly id: string }[]; found: ReadonlySet<string> }) {
  const n = minors.filter((m) => found.has(m.id)).length;
  return (
    <div className="found">
      <b>{t('ui.title.found', { n, total: minors.length })}</b>
      <span className="dots" aria-hidden="true">
        {minors.map((m) => (
          <i key={m.id} className={found.has(m.id) ? 'f' : undefined} />
        ))}
      </span>
    </div>
  );
}

/** The awards won as dots (round R4, A7), under the endings found, on the title and the awards night. */
export function AwardDots({ awards, won }: { awards: readonly { readonly id: string }[]; won: ReadonlySet<string> }) {
  const n = awards.filter((a) => won.has(a.id)).length;
  return (
    <div className="found awardsrow">
      <b>{t('ui.title.awards', { n, total: awards.length })}</b>
      <span className="dots" aria-hidden="true">
        {awards.map((a) => (
          <i key={a.id} className={won.has(a.id) ? 'f' : undefined} />
        ))}
      </span>
    </div>
  );
}

/**
 * A choice that wears its stamp (SIGNED, TAKEN, ACCEPTED) before it is made: the stamp lands, the others fade,
 * then the action goes. Reduced motion shortens the moment; with motion off the action goes at once. One choice
 * only: a second click while the stamp lands is ignored.
 */
export function useStampedChoice<T>(act: (choice: T) => void): readonly [T | null, (choice: T) => void] {
  const [chosen, setChosen] = useState<T | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const choose = useCallback(
    (choice: T) => {
      if (chosen !== null) return;
      const mode = motionMode();
      if (mode === 'off') {
        act(choice);
        return;
      }
      setChosen(choice);
      timer.current = window.setTimeout(() => act(choice), mode === 'reduced' ? 150 : 560);
    },
    [chosen, act],
  );
  return [chosen, choose];
}

/**
 * The offer you take flies to Deck & Discard (round R4, A3e) — the flight the month's pile takes since R3, D1 — instead
 * of vanishing with the screen: a copy of its face flies there and shrinks away, the face itself hidden as it goes.
 * Full motion only: reduced motion has no travel, and the face leaves with the screen.
 */
export function flyToDeck(lift: Element | null): void {
  const face = lift?.querySelector<HTMLElement>('.card');
  const stage = document.querySelector('.stage');
  const deck = document.querySelector('.desk .stats .deckbtn');
  if (!face || !stage || !deck || motionMode() !== 'full') return;
  const box = stage.getBoundingClientRect();
  const k = box.width / 1280;
  const a = face.getBoundingClientRect();
  const b = deck.getBoundingClientRect();
  const fly = document.createElement('div');
  fly.className = 'faces offer-flight';
  fly.style.cssText = `left:${(a.left - box.left) / k}px;top:${(a.top - box.top) / k}px;width:${a.width / k}px;height:${a.height / k}px`;
  const copy = face.cloneNode(true) as HTMLElement;
  copy.style.cssText = 'position:relative;left:0;top:0;transform:none;pointer-events:none';
  fly.appendChild(copy);
  stage.appendChild(fly);
  face.style.visibility = 'hidden';
  const dx = (b.left + b.width / 2 - (a.left + a.width / 2)) / k;
  const dy = (b.top + b.height / 2 - (a.top + a.height / 2)) / k;
  const flight = fly.animate(
    [
      { transform: 'none', opacity: 1 },
      { transform: `translate(${dx}px, ${dy}px) rotate(-8deg) scale(.16)`, opacity: 1, offset: 0.85 },
      { transform: `translate(${dx}px, ${dy}px) rotate(-8deg) scale(.12)`, opacity: 0 },
    ],
    { duration: 560, easing: 'cubic-bezier(.45, 0, .25, 1)', fill: 'forwards' },
  );
  flight.onfinish = flight.oncancel = () => fly.remove();
}

/** How long what leaves over the desk takes to go (round R4, A3b; ui/style.css): kept, inert, that long. */
export const EXIT_MS = 400;

/**
 * What opens over the desk (round R3, B4): the content rises and fades in (0.25 s) — ui/style.css — and is there to
 * be used at once: an entrance holds no input. The dim is not its own (round R4, A3c): one layer under every overlay,
 * which App keeps up while one overlay follows another. When it closes its content leaves as one piece, once (A3b):
 * the last content kept, inert, and taken down 40 px as it fades (`exit` 'up' for a letter), 0.4 s; with motion off
 * it goes at once. `enter` names another entrance (round R3, amended): the opening card developing out of BEGIN's
 * flash, the manager cards dealt as the desk comes up (ui/screens/title.css).
 */
export function Over({ show, full = false, enter, exit = 'down', children }: { show: boolean; full?: boolean; enter?: 'develop' | 'deal'; exit?: 'down' | 'up'; children?: ReactNode }) {
  const last = useRef<{ children: ReactNode; exit: 'down' | 'up' } | null>(null);
  const [gone, setGone] = useState(!show);
  if (show) last.current = { children, exit };
  useLayoutEffect(() => {
    if (show) {
      setGone(false);
      return;
    }
    if (motionMode() === 'off') {
      last.current = null;
      setGone(true);
      return;
    }
    const timer = window.setTimeout(() => {
      last.current = null;
      setGone(true);
    }, motionMode() === 'reduced' ? 200 : EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [show]);
  const cls = `screen-over${full ? ' full' : ''}${enter ? ` ${enter}` : ''}`;
  if (show) return <div className={cls}>{children}</div>;
  if (gone || last.current === null) return null;
  // The same element as when shown, so nothing in it remounts or loses its state as it leaves.
  return (
    <div className={`${cls} leaving${last.current.exit === 'up' ? ' up' : ''}`} aria-hidden="true">
      {last.current.children}
    </div>
  );
}

/** The game's three faces are loaded before the title shows (round R1); a font that never comes is waited for 3 s. */
export function useFontsReady(): boolean {
  const [ready, setReady] = useState(() => typeof document === 'undefined' || !('fonts' in document));
  useEffect(() => {
    if (ready) return;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setReady(true);
    };
    const faces = ['900 132px "Playfair Display"', 'italic 400 17px "Playfair Display"', '800 17px "Libre Franklin"'];
    Promise.all(faces.map((f) => document.fonts.load(f))).then(finish, finish);
    const timer = window.setTimeout(finish, 3000);
    return () => window.clearTimeout(timer);
  }, [ready]);
  return ready;
}
