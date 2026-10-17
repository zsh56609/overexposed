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
 * What opens over the desk (round R3, B4): the dim fades in (0.2 s) and the content rises and fades in (0.25 s) —
 * ui/style.css — and the content is there to be used at once: an entrance holds no input. When it closes it fades
 * out (0.15 s), its last content kept, inert, that long; with motion off it goes at once. `enter` names another
 * entrance (round R3, amended): the opening card developing out of BEGIN's flash, the manager cards dealt as the desk
 * comes up (ui/screens/title.css).
 */
export function Over({ show, full = false, enter, children }: { show: boolean; full?: boolean; enter?: 'develop' | 'deal'; children?: ReactNode }) {
  const last = useRef<ReactNode>(null);
  const [gone, setGone] = useState(!show);
  if (show) last.current = children;
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
    }, 150);
    return () => window.clearTimeout(timer);
  }, [show]);
  const cls = `screen-over${full ? ' full' : ''}${enter ? ` ${enter}` : ''}`;
  if (show)
    return (
      <div className={cls}>
        <div className="screen-scrim" />
        {children}
      </div>
    );
  if (gone || last.current === null) return null;
  return (
    <div className={`${cls} leaving`} aria-hidden="true">
      <div className="screen-scrim" />
      {last.current}
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
