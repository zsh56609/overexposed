// The night's plaques for check:overflow (round R8c, B3): a year's awards are what its run wins, and few runs win five or
// more, so the check shows chosen lists here — the awards with the longest names and short lines — in the night's own
// place, through the night's own component. A dev module: the game never imports it.

import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import type { ContentIndex } from '../../core/index.ts';
import { NightPlaques } from '../screens/Awards.tsx';

/** Shows the plaques of `awards` (the `fresh` ones won for the first time) instead of the night's own; returns the undo. */
export function showPlaques(c: ContentIndex, awards: readonly string[], fresh: readonly string[]): () => void {
  const own = document.querySelector<HTMLElement>('.awards-night .plaques');
  if (!own) throw new Error('no awards night on the page');
  const host = document.createElement('div');
  own.after(host);
  own.style.display = 'none';
  const root = createRoot(host);
  flushSync(() => root.render(<NightPlaques c={c} awards={awards} fresh={new Set(fresh)} />));
  return () => {
    root.unmount();
    host.remove();
    own.style.display = '';
  };
}
