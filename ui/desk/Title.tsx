// The title (round R3, Part A; docs/design/visual/ref/r3-title.png): the desk the night before the year starts, as
// in March, with no stat bar and no bubbles. The title paper stands alone where the month's papers stand, larger
// than they are; the mirror is lit and holds the four majors and the scrapbook; a fan of five real faces lies at
// the front, drawn by the card component and not to be played; BEGIN stands where END TURN stands, with Settings
// and Credits under it. Every word is content's or an approved key; the photograph comes from the photo worker.

import { memo, useEffect, useState, type KeyboardEvent } from 'react';
import type { ContentIndex, SeasonId } from '../../core/index.ts';
import { calendarDate } from '../../core/index.ts';
import { t } from '../i18n.ts';
import { calendarLabel, majorGoal, majorName, seasonName } from '../text.ts';
import { CardInk, fan } from './Hand.tsx';
import { photoUrl } from './halftone.ts';
import type { HandCardModel, HandWords } from './model.ts';
import { warmPhotos } from './photo-preload.ts';

/** The fan on the title (the itch cover's): the scandal in the middle. */
export const TITLE_FAN = ['vocal_coaching', 'side_gig', 'tabloid_story', 'press_junket', 'open_mic'] as const;

/** The singer under the lights, from the photo worker once it is drawn (until then, the bare photograph box). */
function useTitlePhoto(season: SeasonId): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void warmPhotos(3).then(() => live && setUrl(photoUrl('singer', season, 0)));
    return () => {
      live = false;
    };
  }, [season]);
  return url;
}

/** The title paper; `off` while it slides off the desk to the left (round R3, B2). */
export const TitlePaper = memo(function TitlePaper({ c, season, off = false }: { c: ContentIndex; season: SeasonId; off?: boolean }) {
  const photo = useTitlePhoto(season);
  const date = calendarDate(c, 1);
  return (
    <>
      <div className={`baseShadow title-shadow${off ? ' off' : ''}`} />
      <div className={`titlepaper${off ? ' off' : ''}`} data-hook="titlepaper">
        <div className="mhrow">
          <span className="ear left">{t('ui.title.ear', { season: seasonName(c, 1), year: date.year })}</span>
          <div className="mh">
            <b>{t('ui.title.name')}</b>
          </div>
          <span className="ear">{t('paper.flash.ear.right')}</span>
        </div>
        <div className="dl">
          <span>{calendarLabel(c, 1)}</span>
          <span>{t('ui.title.tagline')}</span>
          <span>{t('paper.flash.issue', { n: 1 })}</span>
        </div>
        <div className={`tph${photo ? ' on' : ''}`} style={photo ? { backgroundImage: `url(${photo})` } : undefined} />
        <div className="cp">{t('paper.caption.world')}</div>
        <div className="tlines">
          <i>{t('ui.title.line1')}</i>
          <i>{t('ui.title.line2')}</i>
        </div>
      </div>
    </>
  );
});

/** Where the five notes are stuck on the glass: the scrapbook top left, the four majors around it. */
const SPOTS = [
  { left: 222, top: 38, r: 4 },
  { left: 44, top: 150, r: 2 },
  { left: 210, top: 158, r: -3 },
  { left: 104, top: 232, r: 3 },
] as const;
const COLOURS = ['yellow', 'green', 'blue', 'pink'] as const;

/** A note that opens the scrapbook: a click, Enter or Space. */
const opener = (open: () => void) => ({
  role: 'button',
  tabIndex: 0,
  onClick: open,
  onKeyDown: (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open();
    }
  },
});

/** The mirror's five notes on the title: the four majors, each with its name and goal line, and the scrapbook. */
export const TitleNotes = memo(function TitleNotes({ c, found, open }: { c: ContentIndex; found: ReadonlySet<string>; open: () => void }) {
  const n = c.minors.filter((m) => found.has(m.id)).length;
  return (
    <>
      <div className="today book scrapbook-open" data-hook="scrapbook-note" {...opener(open)}>
        <small>{t('ui.title.scrapbook')}</small>
        <b>{t('ui.title.endingsFound')}</b>
        <span>{t('ui.title.foundOf', { n, total: c.minors.length })}</span>
        <span className="dots" aria-hidden="true">
          {c.minors.map((m) => (
            <i key={m.id} className={found.has(m.id) ? 'f' : undefined} />
          ))}
        </span>
      </div>
      {c.majors.slice(0, 4).map((m, i) => {
        const spot = SPOTS[i] ?? SPOTS[0];
        return (
          <div key={m.id} className={`sticky ${m.note ?? COLOURS[i % COLOURS.length]} title-note`} data-major={m.id} style={{ left: spot.left, top: spot.top, ['--r' as string]: `${spot.r}deg` }} {...opener(open)}>
            <b>{majorName(c, m.id)}</b>
            <span className="goal">{majorGoal(c, m.id)}</span>
          </div>
        );
      })}
    </>
  );
});

/** Five faces fanned at the front, as a hand of five lies: drawn by the card component, never played; `leaving`
 * while they slide down off the desk (round R3, B1). */
export const TitleFan = memo(function TitleFan({ cards, words, leaving = false }: { cards: readonly HandCardModel[]; words: HandWords; leaving?: boolean }) {
  const places = fan(cards.length);
  return (
    <div className={`hand title-fan${leaving ? ' leaving' : ''}`} data-hook="title-fan" aria-hidden="true" style={{ ['--strip' as string]: '150px' }}>
      {cards.map((card, i) => {
        const at = places[i] ?? { left: 0, rot: 0, lift: 0 };
        return (
          <div key={card.cardId} className={`card ${FACE_CLASS[card.face]}`} data-card={card.cardId} style={{ left: at.left, zIndex: 10 + i, ['--rot' as string]: `${at.rot}deg`, ['--lift' as string]: `${at.lift}px`, ['--n' as string]: i }}>
            <CardInk card={card} words={words} />
          </div>
        );
      })}
    </div>
  );
});

const FACE_CLASS: Record<HandCardModel['face'], string> = {
  flyer: 'f-flyer',
  score: 'f-score',
  script: 'f-script',
  revision: 'f-script f-revision',
  callsheet: 'f-callsheet',
  headshot: 'f-headshot',
  gloss: 'f-gloss',
  gold: 'f-gold',
  pass: 'f-pass',
  notebook: 'f-notebook',
  scandal: 'f-scandal',
};

/** BEGIN where END TURN stands, in its style; Settings and Credits as small links beneath. */
export function TitleControls({ onBegin, onSettings, onCredits }: { onBegin: () => void; onSettings: () => void; onCredits: () => void }) {
  return (
    <>
      <button className="endbtn begin" data-hook="begin" onClick={onBegin}>
        <b>{t('ui.title.begin')}</b>
      </button>
      <nav className="title-links">
        <button className="link settings-open" onClick={onSettings}>
          {t('ui.title.settings')}
        </button>
        <button className="link credits-open" onClick={onCredits}>
          {t('ui.title.credits')}
        </button>
      </nav>
    </>
  );
}
