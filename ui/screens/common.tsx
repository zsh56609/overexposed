// What the screens around the desk share (round R1; README §8–§9): the header pattern, the endings found as
// dots, the stamp a choice wears before it is made, and the fonts the title waits for.

import { useCallback, useEffect, useRef, useState } from 'react';
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
