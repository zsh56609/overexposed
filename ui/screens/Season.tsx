// A season's card (round R3, A2–A3): the month and year, the season's name, its opener — or, before the year,
// spring's card with the opening's paragraphs. It waits for the player: it stays until "Continue" (round R4) is
// clicked. Its entrance is the month end's last beat (ui/timeline.ts), so a click during it only fast-forwards
// (D7); once the button shows, the button is the next decision.

import { t } from '../i18n.ts';
import { prose } from './common.tsx';

export interface SeasonCardProps {
  /** "March 2027". */
  readonly date: string;
  /** The season's name, "Spring". */
  readonly season: string;
  readonly paragraphs: readonly string[];
  readonly go: () => void;
}

export function SeasonCard({ date, season, paragraphs, go }: SeasonCardProps) {
  return (
    <div className="scr season-card" data-screen="season">
      <small>{date}</small>
      <h2 className={prose(season)}>{season}</h2>
      {paragraphs.map((p, i) => (
        <p key={i} className={prose(p)}>
          {p}
        </p>
      ))}
      <button className="go into" data-hook="into" onClick={go}>
        {t('ui.season.go')}
      </button>
    </div>
  );
}
