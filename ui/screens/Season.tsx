// A season's card (round R3, A2–A3): the month and year, the season's name, its opener — or, before the year,
// spring's card with the opening's paragraphs. It waits for the player: it stays until "Continue" (round R4) is
// clicked. Its entrance is the month end's last beat (ui/timeline.ts), so a click during it only fast-forwards
// (D7); once the button shows, the button is the next decision.

import { useEffect, useState } from 'react';
import type { SeasonId } from '../../core/index.ts';
import { seasonHasPhoto, seasonPhotoDrawn, seasonPhotoNow } from '../desk/photo-preload.ts';
import { t } from '../i18n.ts';
import { cue } from '../sound/sound.ts';
import { prose } from './common.tsx';

export interface SeasonCardProps {
  /** The season's photograph (round R8a, D2): its scene light on ink, in an oval above the date. */
  readonly photo?: string | null;
  /**
   * The opening's (round R8d, A3): spring's oval, looked up and never drawn here — the warm-up draws it first. If the
   * card comes before it, the oval stands empty, its rings shown, and the picture fades in when it comes.
   */
  readonly awaits?: SeasonId | null;
  /** "March 2027". */
  readonly date: string;
  /** The season's name, "Spring". */
  readonly season: string;
  readonly paragraphs: readonly string[];
  readonly go: () => void;
}

/**
 * A season's oval as the warm-up delivers it (round R8d, A3): whether the season has one, its URL once drawn, and
 * whether it came after the card did — then it fades in over 300 ms (at once under reduced motion or motion off).
 */
function useDrawnPhoto(season: SeasonId | null): { readonly oval: boolean; readonly url: string | null; readonly late: boolean } {
  const [drawn, setDrawn] = useState(() => ({ url: season ? seasonPhotoNow(season) : null, late: false }));
  useEffect(() => {
    if (!season || drawn.url) return;
    let live = true;
    void seasonPhotoDrawn(season)?.then((url) => {
      if (live) setDrawn({ url, late: true });
    });
    return () => {
      live = false;
    };
  }, [season, drawn.url]);
  return { oval: season !== null && seasonHasPhoto(season), ...drawn };
}

export function SeasonCard({ photo = null, awaits = null, date, season, paragraphs, go }: SeasonCardProps) {
  const later = useDrawnPhoto(awaits);
  const url = photo ?? later.url;
  return (
    <div className="scr season-card" data-screen="season">
      {(photo || later.oval) && (
        <div className="sc-photo" aria-hidden="true">
          {url && <i className={later.late ? 'late' : undefined} style={{ backgroundImage: `url("${url}")` }} />}
        </div>
      )}
      <small>{date}</small>
      <h2 className={prose(season)}>{season}</h2>
      {paragraphs.map((p, i) => (
        <p key={i} className={prose(p)}>
          {p}
        </p>
      ))}
      <button
        className="go into"
        data-hook="into"
        onClick={() => {
          cue('button');
          go();
        }}
      >
        {t('ui.season.go')}
      </button>
    </div>
  );
}
