// The awards night (round R1, Parts E and F; README §8, mockups/screens.html "Awards night", shot 14): the year's
// ending under a spotlight between the curtains — the major as the category, the minor as the title, its prose;
// the year's awards as winner cards; the year told back in four front pages, one a season (/core's seasonPages);
// Juno Vale's closing line; the manager's last word; the endings found and PLAY AGAIN. The run's numbers stay,
// folded away. Everything comes from content and /core; no rule is computed here.

import { useEffect, useMemo, useState } from 'react';
import { lastWord, majorOf, rivalArc, scandalCount, seasonPages, yearAwards, type GameState } from '../../core/index.ts';
import { photoUrl } from '../desk/halftone.ts';
import { recordEnding } from '../collection.ts';
import { t } from '../i18n.ts';
import { motionMode } from '../motion.ts';
import type { PlayedStep } from '../queue.ts';
import { awardCitation, awardName, flagName, majorName, managerName, mastheadName, minorName, minorText, money, pageItemText, seasonName } from '../text.ts';
import { FoundDots, prose } from './common.tsx';

/** How long the night's reveal runs (the mockup's sequence); a click during it shows everything at once. */
const REVEAL_MS = 5200;

interface AwardsProps {
  readonly s: GameState;
  readonly steps: readonly PlayedStep[];
  readonly onRestart: () => void;
  readonly openScrapbook: (() => void) | null;
  /** The queue's state, for the checks: the ending is a presentation like the desk. */
  readonly busy: boolean;
  readonly beat: string;
}

export function AwardsNight({ s, steps, onRestart, openScrapbook, busy, beat }: AwardsProps) {
  const c = s.content;
  const id = s.endingId ?? '';
  const majorId = majorOf(c, id) ?? '';
  const [found] = useState(() => recordEnding(id));
  const [numbers, setNumbers] = useState(false);
  const [revealed, setRevealed] = useState(() => motionMode() !== 'full');
  useEffect(() => {
    if (revealed) return;
    const timer = window.setTimeout(() => setRevealed(true), REVEAL_MS);
    return () => window.clearTimeout(timer);
  }, [revealed]);
  const pages = useMemo(() => seasonPages(steps), [steps]);
  const text = minorText(c, s.seed, id);
  const awards = yearAwards(s);
  // The rival's year, closed under the awards (E7): fixed by the seed, never chosen to contrast the player's.
  const rival = rivalArc(c, s.seed);
  const last = lastWord(s);
  const events = steps.flatMap((step) => step.events);
  const peakHype = Math.max(s.resources.hype, ...events.flatMap((e) => (e.type === 'turnEnd' ? [e.resources.hype] : [])));
  const flags = Object.keys(s.flags);
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
        <nav className="links">
          {openScrapbook && (
            <button className="link scrapbook-open" onClick={openScrapbook}>
              {t('ui.title.scrapbook')}
            </button>
          )}
          <button className="link numbers-toggle" aria-expanded={numbers} onClick={() => setNumbers((open) => !open)}>
            {t('ui.awards.numbers')}
          </button>
        </nav>
      </div>
      {numbers && (
        <div className="numbers" role="region" aria-label={t('ui.awards.numbers')}>
          <ul>
            <li>{t('ui.ending.peakHype', { n: peakHype })}</li>
            <li>{t('ui.ending.final', { ...s.resources, capital: money(s.resources.capital) })}</li>
            <li>{t('ui.ending.scandals', { n: scandalCount(s) })}</li>
            <li>{flags.length ? t('ui.ending.flags', { flags: flags.map(flagName).join(', ') }) : t('ui.ending.noFlags')}</li>
            <li>{t('ui.ending.gates', { passed: s.gateHistory.filter((g) => g.passed).length, total: s.gateHistory.length })}</li>
            <li>{t('ui.ending.played', { n: events.filter((e) => e.type === 'play').length })}</li>
          </ul>
        </div>
      )}
      <div className="flashbulb" data-deco="1" />
    </div>
  );
}
