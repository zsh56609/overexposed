// The title (round R3, amended; docs/design/visual/ref/r3-title-v2.png, drawn by r3-title-v2.html): one photograph,
// the whole screen — the singer at the mic in a spotlight, the photographers' flashes around, their cameras and the
// crowd dark in front — drawn by the photo worker, light on ink. Over it the name, glowing as if overexposed, a red
// rule and the slogan; BEGIN bottom right, in END TURN's corner; the endings found and the links bottom left. No
// desk and no stat bar: the desk comes up with the manager choice (B2).

import { memo, useEffect, useState } from 'react';
import type { ContentIndex } from '../../core/index.ts';
import { t } from '../i18n.ts';
import { titlePhoto, titlePhotoNow } from '../desk/photo-preload.ts';
import { STAGE_HEIGHT, STAGE_WIDTH } from '../Stage.tsx';
import './title.css';

/**
 * The photographers' flashes (round R3, amended): where each pops, near the edges, and when in the 13.7 s cycle
 * (ui/screens/title.css) — a fixed, irregular pattern, never random. x and y in % of the stage, r the burst's radius.
 */
const FLASHES = [
  { x: 7, y: 44, r: 150, at: 2.1 },
  { x: 93, y: 38, r: 140, at: 4.6 },
  { x: 19, y: 79, r: 96, at: 6.2 },
  { x: 81, y: 76, r: 90, at: 9.1 },
  { x: 4, y: 14, r: 110, at: 10.5 },
  { x: 96, y: 66, r: 104, at: 12.8 },
] as const;

/** The widest photograph drawn: a 4K screen's. */
const WIDEST = 3840;

/** The photograph, drawn once for the page at the stage's pixel size (until then the ink shows through). */
function useTitlePhoto(): string | null {
  const [url, setUrl] = useState<string | null>(titlePhotoNow);
  useEffect(() => {
    if (url) return;
    let live = true;
    const box = document.querySelector('.stage')?.getBoundingClientRect();
    const w = Math.round(Math.min(WIDEST, Math.max(STAGE_WIDTH / 4, (box?.width || STAGE_WIDTH) * (window.devicePixelRatio || 1))));
    void titlePhoto(w, Math.round((w * STAGE_HEIGHT) / STAGE_WIDTH)).then((u) => {
      if (live) setUrl(u);
    });
    return () => {
      live = false;
    };
  }, [url]);
  return url;
}

export interface TitleProps {
  readonly c: ContentIndex;
  readonly found: ReadonlySet<string>;
  /** Under the opening card (B1): the photograph alone, dimmed, no flashes. */
  readonly dim?: boolean;
  /** Going to dark as the desk comes up (B2). */
  readonly out?: boolean;
  /** A change of scene runs (D7: a click completes it). */
  readonly busy?: boolean;
  readonly begin: () => void;
  readonly scrapbook: () => void;
  readonly settings: () => void;
  readonly credits: () => void;
}

export const TitleScreen = memo(function TitleScreen({ c, found, dim = false, out = false, busy = false, begin, scrapbook, settings, credits }: TitleProps) {
  const photo = useTitlePhoto();
  const n = c.minors.filter((m) => found.has(m.id)).length;
  return (
    <div className={`title-screen${photo ? ' lit' : ''}${dim ? ' dim' : ''}${out ? ' out' : ''}`} data-screen="title" data-presentation="title" data-busy={busy ? '1' : '0'}>
      <div className="tphoto" style={photo ? { backgroundImage: `url(${photo})` } : undefined} />
      <div className="flashes" aria-hidden="true">
        {FLASHES.map((f, i) => (
          <i key={i} style={{ left: `calc(${f.x}% - ${f.r}px)`, top: `calc(${f.y}% - ${f.r}px)`, width: 2 * f.r, height: 2 * f.r, animationDelay: `${f.at}s` }} />
        ))}
      </div>
      <div className="topfade" />
      <div className="vign" />
      <div className="botfade" />
      <div className="words">
        <h1 className="tname">{t('ui.title.name')}</h1>
        <div className="trule" />
        <p className="slogan">{t('ui.title.slogan')}</p>
        <div className="found">
          <span>{t('ui.title.found', { n, total: c.minors.length })}</span>
          <span className="dots" aria-hidden="true">
            {c.minors.map((m) => (
              <i key={m.id} className={found.has(m.id) ? 'f' : undefined} />
            ))}
          </span>
        </div>
        <nav className="tlinks">
          <button className="link scrapbook-open" onClick={scrapbook}>
            {t('ui.title.scrapbook')}
          </button>
          <button className="link settings-open" onClick={settings}>
            {t('ui.title.settings')}
          </button>
          <button className="link credits-open" onClick={credits}>
            {t('ui.title.credits')}
          </button>
        </nav>
        <button className="begin" data-hook="begin" onClick={begin}>
          {t('ui.title.begin')}
        </button>
      </div>
    </div>
  );
});
