// The awards night (round R1, Parts E and F; README §8, mockups/screens.html "Awards night", shot 14): the year's
// ending under a spotlight between the curtains — the major as the category, the minor as the title, its prose;
// the year's awards as winner plaques, each with its trophy (round R8c: one to four plaques; five or six, three and a
// box for the rest; seven or eight, two and a wide box); the year told back in four front pages, one a season (/core's seasonPages);
// Juno Vale's closing line (round R8c: what she won or lost, and how things stand between you); the manager's last
// word under the first front page, and Juno's under the second; the endings found and PLAY AGAIN. The run's numbers stay,
// folded away. Everything comes from content and /core; no rule is computed here.

import { useEffect, useMemo, useRef, useState } from 'react';
import { getMajor, getManager, lastWord, majorOf, rivalLastWord, rivalLine, seasonPages, yearAwards, type ContentIndex, type GameState, type SceneId } from '../../core/index.ts';
import { photoUrl } from '../desk/halftone.ts';
import { backdropJob, backdropNow, drawBackdrop } from '../desk/photo-preload.ts';
import { recordAwards, recordEnding } from '../collection.ts';
import { Face } from '../Face.tsx';
import { t } from '../i18n.ts';
import { motionMode } from '../motion.ts';
import type { PlayedStep } from '../queue.ts';
import { awardCitation, awardName, awardShort, majorName, managerName, mastheadName, minorName, minorText, pageItemText, seasonName } from '../text.ts';
import { Trophy, trophyOf } from '../Trophy.tsx';
import { isPerson, Named, PersonName } from '../Named.tsx';
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
 * The year's awards on the night (round R8c, B3), in content order: up to four as plaques; five or six, three plaques
 * and the fourth box listing the rest; seven or eight (the most a year wins), two plaques and a wide box over the third
 * and fourth columns, the rest in two columns.
 */
export function nightLayout(awards: readonly string[]): { readonly plaques: readonly string[]; readonly rest: readonly string[]; readonly box: 'list' | 'wide' | null } {
  if (awards.length <= 4) return { plaques: awards, rest: [], box: null };
  const shown = awards.length <= 6 ? 3 : 2;
  return { plaques: awards.slice(0, shown), rest: awards.slice(shown), box: shown === 3 ? 'list' : 'wide' };
}

/**
 * The night's sounds (round R4, B2 and B4): its track, fading in over 1.5 s; an ovation as it names The Breakthrough
 * or Overexposed; applause for each box — a plaque, or the box of the rest (round R8c) — 0.3 s apart even when the night
 * is shown at once.
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

/**
 * The night's backdrop (round R8c, C1–C3): the major's scene light on ink behind the night's top. Drawn off the main
 * thread from the night's mount; it never holds the reveal. Without a worker it is drawn on the page when the page is
 * idle after the reveal — at once when the night is shown at once.
 */
function useBackdrop(scene: SceneId | null, revealed: boolean): string | null {
  const job = useMemo(() => (scene ? backdropJob(scene) : null), [scene]);
  const [url, setUrl] = useState<string | null>(() => (job ? backdropNow(job) : null));
  const shown = useRef(revealed);
  shown.current = revealed;
  const waiting = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!job || url) return;
    let live = true;
    void drawBackdrop(job, (draw) => {
      const go = () => {
        const later = (fn: () => void) => (typeof requestIdleCallback === 'function' ? requestIdleCallback(fn, { timeout: 2000 }) : window.setTimeout(fn, 40));
        later(() => {
          if (live) draw();
        });
      };
      if (shown.current) go();
      else waiting.current = go;
    }).then((u) => {
      if (live) setUrl(u);
    });
    return () => {
      live = false;
    };
  }, [job]);
  useEffect(() => {
    if (!revealed || !waiting.current) return;
    const go = waiting.current;
    waiting.current = null;
    go();
  }, [revealed]);
  return url;
}

/** The night's two last words (round R8c, D5): the manager's, and Juno's when she was answered. */
export interface NightWordsProps {
  readonly c: ContentIndex;
  /** The manager's last word: their id and the bubbles' keys (core/manager.ts lastWord). */
  readonly last: { readonly manager: string; readonly bubbles: readonly string[] } | null;
  /** Juno's last word, a key (core/rival.ts rivalLastWord). */
  readonly rival: string | null;
}

/**
 * The night's last words (round R8c, D5): the manager's under the first front page (4.6 s), Juno's under the second
 * (4.75 s) — a face, a name, the bubbles, each block one front page wide. Her name and face are the rival's events'
 * speaker's, from content.
 */
export function NightWords({ c, last, rival }: NightWordsProps) {
  // The manager's face begins the last word's name row (round R8a), 22 px, as on the desk.
  const lastFace = last ? getManager(c, last.manager)?.avatar : undefined;
  const her = c.events.find((e) => e.category === 'rival')?.speaker;
  return (
    <>
      {last && (
        <div className="lastword rv" style={{ animationDelay: '4.6s' }} data-hook="last-word">
          <small>
            {lastFace && <Face id={lastFace} size={22} />}
            <Named text={t('ui.phone.from', { name: managerName(c, last.manager).split(/\s+/)[0] ?? '' })} />
          </small>
          {last.bubbles.map((key) => (
            <div key={key} className={prose(t(key), 'bub')}>
              <Named text={t(key)} />
            </div>
          ))}
        </div>
      )}
      {rival && (
        <div className="lastword rivalword rv" style={{ animationDelay: '4.75s' }} data-hook="rival-word">
          <small>
            {her?.avatar && <Face id={her.avatar} size={22} />}
            {her?.nameKey && isPerson(her.avatar) ? <PersonName person={her.avatar}>{t(her.nameKey)}</PersonName> : her?.nameKey ? t(her.nameKey) : ''}
          </small>
          <div className={prose(t(rival), 'bub')}>
            <Named text={t(rival)} />
          </div>
        </div>
      )}
    </>
  );
}

/** When a box of the night's awards comes (s): a plaque as before, 0.3 s apart from 2.45 s; a box's entries 0.12 s apart after it. */
const boxDelay = (i: number) => ({ animationDelay: `${2.45 + i * 0.3}s` });
const entryDelay = (i: number, k: number) => ({ animationDelay: `${2.45 + i * 0.3 + 0.12 * (k + 1)}s` });

/**
 * The year's awards on the night (round R8c, B3): a plaque each with its trophy, up to four; beyond four, the box of
 * the rest after three (five or six) or two (seven or eight). A fresh award has the New chip on a plaque, a dot in a box.
 */
export function NightPlaques({ c, awards, fresh }: { c: ContentIndex; awards: readonly string[]; fresh: ReadonlySet<string> }) {
  const layout = nightLayout(awards);
  return (
    <div className="plaques" style={{ ['--n' as string]: layout.plaques.length + (layout.box ? 1 : 0) }} data-awards={awards.length}>
      {layout.plaques.map((award, i) => (
        <div key={award} className="pl tro rv" style={boxDelay(i)} data-fit="1" data-award={award}>
          <Trophy id={trophyOf(c, award)} w={56} h={70} />
          <div className="tx">
            <div className="t">{t('ui.awards.winner')}</div>
            {fresh.has(award) && <span className="new">{t('ui.awards.new')}</span>}
            <div className={prose(awardName(c, award), 'n')}>{awardName(c, award)}</div>
            <div className={prose(awardCitation(c, award), 'c')}>{awardCitation(c, award)}</div>
          </div>
        </div>
      ))}
      {/* The rest (round R8c, B3): a box as a plaque comes, its entries 0.12 s apart after it; a fresh one, a dot. */}
      {layout.box && (
        <div className={`pl rest ${layout.box} rv`} style={boxDelay(layout.plaques.length)} data-rest={layout.rest.length}>
          <div className="t">{t('ui.awards.more', { n: layout.rest.length })}</div>
          <div className="rows">
            {layout.rest.map((award, k) => (
              <div key={award} className="ri rv" style={entryDelay(layout.plaques.length, k)} data-award={award}>
                <Trophy id={trophyOf(c, award)} w={layout.box === 'wide' ? 22 : 24} h={layout.box === 'wide' ? 27 : 30}>
                  {fresh.has(award) && <i title={t('ui.awards.new')} />}
                </Trophy>
                <div>
                  <div className={prose(awardName(c, award), 'rn')}>{awardName(c, award)}</div>
                  <div className={prose(awardShort(c, award), 'rc')}>{awardShort(c, award)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
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
  const layout = nightLayout(awards);
  useNightSounds(cheered(c, majorId), layout.plaques.length + (layout.box ? 1 : 0), revealed);
  const backdrop = useBackdrop(getMajor(c, majorId)?.scene ?? null, revealed);
  // The rival's year, closed under the awards (E7): fixed by the seed, never chosen to contrast the player's. Her line
  // (round R8c, D4) says what she won or lost and how things stand between you, both read by /core.
  const rival = rivalLine(s);
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
      {/* The backdrop (round R8c, C2): the night's first child, over its ground, under the spotlight and the curtains. */}
      {backdrop && <img className="backdrop" src={backdrop} alt="" data-deco="1" data-hook="backdrop" data-scene={getMajor(c, majorId)?.scene} />}
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
          <p className={prose(t(rival), 'a-rival rv')} style={delay(1.9)} data-hook="rival-line">
            <Named text={t(rival)} />
          </p>
        )}
      </div>
      <div className="a-label rv" style={delay(2.2)}>
        {t('ui.ending.awards')}
      </div>
      <NightPlaques c={c} awards={awards} fresh={won.fresh} />
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
      <NightWords c={c} last={lastWord(s)} rival={rivalLastWord(s)} />
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
