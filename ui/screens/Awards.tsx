// The awards night (round R1, Parts E and F; README §8, mockups/screens.html "Awards night", shot 14): the year's
// ending under a spotlight between the curtains — the major as the category, the minor as the title, its prose;
// the year's awards as winner cards; the year told back in four front pages, one a season (/core's seasonPages);
// Juno Vale's closing line; the manager's last word; the endings found and PLAY AGAIN. The run's numbers stay,
// folded away. Everything comes from content and /core; no rule is computed here.

import { useEffect, useMemo, useRef, useState } from 'react';
import { getMajor, lastWord, majorOf, rivalArc, seasonPages, yearAwards, type ContentIndex, type GameState } from '../../core/index.ts';
import { photoUrl } from '../desk/halftone.ts';
import { recordAwards, recordEnding } from '../collection.ts';
import { t } from '../i18n.ts';
import { motionMode } from '../motion.ts';
import type { PlayedStep } from '../queue.ts';
import { awardCitation, awardName, majorName, managerName, mastheadName, minorName, minorText, pageItemText, seasonName } from '../text.ts';
import { cue, music } from '../sound/sound.ts';
import { AwardDots, FoundDots, prose } from './common.tsx';

/** How long the night's reveal runs (the mockup's sequence); a click during it shows everything at once. */
const REVEAL_MS = 5200;

/** When the night names the major, and when the first plaque comes (the reveal's delays below), in ms; then 0.3 s apart. */
const NAMED_AT = 600;
const PLAQUES_AT = 2450;
const PLAQUE_GAP = 300;

/** The Breakthrough and Overexposed: the majors on the upper side of the fame axis (the one on hype), cheered. */
function cheered(c: ContentIndex, majorId: string): boolean {
  const fame = c.axes.find((a) => a.key === 'hype');
  return !!fame && getMajor(c, majorId)?.on[fame.id] === fame.sides[1];
}

/**
 * The night's sounds (round R4, B2 and B4): its track, fading in over 1.5 s; an ovation as it names The Breakthrough
 * or Overexposed; applause for each award plaque, 0.3 s apart even when the night is shown at once.
 */
function useNightSounds(ovation: boolean, plaques: number, revealed: boolean): void {
  useEffect(() => music('awards', 1500), []);
  const heard = useRef({ named: false, plaques: 0 });
  useEffect(() => {
    if (motionMode() === 'off') return;
    const timers: number[] = [];
    const name = () => {
      if (heard.current.named) return;
      heard.current.named = true;
      if (ovation) cue('ovation');
    };
    const applause = (from: number) => {
      const first = heard.current.plaques;
      for (let i = first; i < plaques; i++)
        timers.push(
          window.setTimeout(() => {
            heard.current.plaques++;
            cue('applause');
          }, from + (i - first) * PLAQUE_GAP),
        );
    };
    if (revealed) {
      name();
      applause(0);
    } else {
      timers.push(window.setTimeout(name, NAMED_AT));
      applause(PLAQUES_AT);
    }
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [ovation, plaques, revealed]);
}

interface AwardsProps {
  readonly s: GameState;
  readonly steps: readonly PlayedStep[];
  readonly onRestart: () => void;
  readonly openScrapbook: (() => void) | null;
  /** The year's numbers, in their own panel (round R3, D2). */
  readonly openNumbers: () => void;
  /** The queue's state, for the checks: the ending is a presentation like the desk. */
  readonly busy: boolean;
  readonly beat: string;
}

export function AwardsNight({ s, steps, onRestart, openScrapbook, openNumbers, busy, beat }: AwardsProps) {
  const c = s.content;
  const id = s.endingId ?? '';
  const majorId = majorOf(c, id) ?? '';
  const [found] = useState(() => recordEnding(id));
  // The awards, collected (round R4, A7): every one won is kept, and one won for the first time says so.
  const [won] = useState(() => recordAwards(yearAwards(s)));
  const [revealed, setRevealed] = useState(() => motionMode() !== 'full');
  useEffect(() => {
    if (revealed) return;
    const timer = window.setTimeout(() => setRevealed(true), REVEAL_MS);
    return () => window.clearTimeout(timer);
  }, [revealed]);
  const pages = useMemo(() => seasonPages(steps), [steps]);
  const text = minorText(s, id);
  const awards = yearAwards(s);
  useNightSounds(cheered(c, majorId), awards.length, revealed);
  // The rival's year, closed under the awards (E7): fixed by the seed, never chosen to contrast the player's.
  const rival = rivalArc(c, s.seed);
  const last = lastWord(s);
  const delay = (sec: number) => ({ animationDelay: `${sec}s` });
  return (
    <div
      className={`scr awards-night ending ${revealed ? 'shown' : 'play'}`}
      data-screen="ending"
      data-presentation="ending"
      data-busy={busy ? '1' : '0'}
      data-beat={beat}
      data-step={steps.length}
      onClickCapture={(e) => {
        // During the reveal a click only shows the night at once (decision 7); it never plays again.
        if (revealed) return;
        e.preventDefault();
        e.stopPropagation();
        setRevealed(true);
      }}
    >
      <div className="spot" data-deco="1" />
      <div className="floorA" data-deco="1" />
      <div className="curtL" data-deco="1" />
      <div className="curtR" data-deco="1" />
      <div className="valance" data-deco="1" />
      <div className="a-top">
        <div className="a-later rv" style={delay(0.1)}>
          {t('ui.ending.title')}
        </div>
        <div className="a-cat rv" style={delay(0.6)}>
          <i />
          {majorName(c, majorId)}
          <i />
        </div>
        <h1 className={prose(minorName(c, id), 'a-min rv')} style={delay(1.1)}>
          {minorName(c, id)}
        </h1>
        <p className={prose(text, 'a-txt rv')} style={delay(1.7)} data-fit="1">
          {text}
        </p>
        {rival && (
          <p className={prose(t(rival.endingKey), 'a-rival rv')} style={delay(1.9)}>
            {t(rival.endingKey)}
          </p>
        )}
      </div>
      <div className="a-label rv" style={delay(2.2)}>
        {t('ui.ending.awards')}
      </div>
      <div className="plaques" style={{ ['--n' as string]: awards.length }}>
        {awards.map((award, i) => (
          <div key={award} className="pl rv" style={delay(2.45 + i * 0.3)} data-fit="1">
            <div className="t">{t('ui.awards.winner')}</div>
            {won.fresh.has(award) && <span className="new">{t('ui.awards.new')}</span>}
            <div className={prose(awardName(c, award), 'n')}>{awardName(c, award)}</div>
            <div className={prose(awardCitation(c, award), 'c')}>{awardCitation(c, award)}</div>
          </div>
        ))}
      </div>
      <div className="a-rev rv" style={delay(3.8)}>
        {t('ui.awards.frontPages')}
      </div>
      <div className="review">
        {pages.map((page, i) => {
          const season = c.rules.seasons?.[page.act - 1] ?? 'summer';
          const red = page.item.kind === 'player' && page.item.line?.kind === 'scandal';
          const headline = pageItemText(c, page.item);
          return (
            <div key={page.act} className={`fp rv paper-${page.paper}${red ? ' red' : ''}`} style={delay(3.95 + i * 0.15)} data-fit="1">
              <div className="m">
                <b>{mastheadName(c, page.paper)}</b>
                <span>{seasonName(c, page.act)}</span>
              </div>
              <div className={prose(headline, 'h')}>{headline}</div>
              {page.item.scene && <img className="mini" src={photoUrl(page.item.scene, season, page.item.photo ?? 0)} alt="" />}
            </div>
          );
        })}
      </div>
      {last && (
        <div className="lastword rv" style={delay(4.6)}>
          <small>{t('ui.phone.from', { name: managerName(c, last.manager).split(/\s+/)[0] ?? '' })}</small>
          {last.bubbles.map((key) => (
            <div key={key} className={prose(t(key), 'bub')}>
              {t(key)}
            </div>
          ))}
        </div>
      )}
      <div className="a-bottom rv" style={delay(4.9)}>
        <button className="again play-again" onClick={onRestart}>
          {t('ui.ending.playAgain')}
        </button>
        <FoundDots minors={c.minors} found={found} />
        <AwardDots awards={c.awards} won={won.won} />
        <nav className="links">
          {openScrapbook && (
            <button className="link scrapbook-open" onClick={openScrapbook}>
              {t('ui.title.scrapbook')}
            </button>
          )}
          <button className="link numbers-toggle" onClick={openNumbers}>
            {t('ui.awards.numbers')}
          </button>
        </nav>
      </div>
      <div className="flashbulb" data-deco="1" />
    </div>
  );
}
