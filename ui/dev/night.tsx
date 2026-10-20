// The awards night's chosen contents, for check:overflow (round R8c): a year's awards and words are what its run wins
// and says, and few runs show the longest of them, so the check shows chosen ones here — in the night's own place,
// through the night's own components. A dev module: the game never imports it.
// - showPlaques (B3): the plaques and boxes of a chosen list of awards;
// - showWords (D5): the manager's last word and Juno's, chosen.

import type { ReactElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import type { ContentIndex } from '../../core/index.ts';
import { NightPlaques, NightWords, type NightWordsProps } from '../screens/Awards.tsx';

/** Renders `render`'s element in a host that `place` puts in the page, hiding `own` meanwhile; returns the undo. */
function swap(own: readonly HTMLElement[], place: (host: HTMLElement) => void, render: () => ReactElement): () => void {
  const host = document.createElement('div');
  place(host);
  for (const el of own) el.style.display = 'none';
  const root = createRoot(host);
  flushSync(() => root.render(render()));
  return () => {
    root.unmount();
    host.remove();
    for (const el of own) el.style.display = '';
  };
}

/** Shows the plaques of `awards` (the `fresh` ones won for the first time) instead of the night's own; returns the undo. */
export function showPlaques(c: ContentIndex, awards: readonly string[], fresh: readonly string[]): () => void {
  const own = document.querySelector<HTMLElement>('.awards-night .plaques');
  if (!own) throw new Error('no awards night on the page');
  return swap([own], (host) => own.after(host), () => <NightPlaques c={c} awards={awards} fresh={new Set(fresh)} />);
}

/** Shows the manager's last word `last` and Juno's `rival` instead of the night's own; returns the undo. */
export function showWords(c: ContentIndex, last: NightWordsProps['last'], rival: string | null): () => void {
  const night = document.querySelector<HTMLElement>('.awards-night');
  if (!night) throw new Error('no awards night on the page');
  const own = [...night.querySelectorAll<HTMLElement>(':scope > .lastword')];
  return swap(own, (host) => night.appendChild(host), () => <NightWords c={c} last={last} rival={rival} />);
}
