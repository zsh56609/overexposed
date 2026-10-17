// The panels over a screen (round R1, Part G; README §9, mockups/vanity.html › the deck, the endings scrapbook and
// settings; shots 20–22): the deck, the endings scrapbook, House rules and the credits, each over the dimmed scene.
// Every label is the mockup's, approved; every card, ending and goal line comes from content. Over the desk a panel
// starts below the stat bar, which stays in view; Escape or a click on the dimmed scene closes it.

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { establishedLanes, scandalCount, type CardInstance, type GameState, type SeasonId } from '../../core/index.ts';
import { content } from '../content.ts';
import { CardPicture, Value } from '../desk/Hand.tsx';
import { IconDefs } from '../desk/Icons.tsx';
import { offerCardModel, type HandWords } from '../desk/model.ts';
import licenceUrl from '../fonts/OFL.txt?url';
import { t } from '../i18n.ts';
import { motionMode } from '../motion.ts';
import { setSetting, useSettings, type Settings } from '../settings.ts';
import type { PlayedStep } from '../queue.ts';
import { awardCitation, awardHow, awardName, cardName, flagName, money } from '../text.ts';

export type PanelId = 'deck' | 'scrapbook' | 'settings' | 'credits' | 'numbers';

/**
 * A panel over the scene. It opens as everything over the desk opens and closes in 0.15 s (round R3, B4): its close
 * button, a click on the dim and Escape all fade it out first; with motion off it goes at once.
 */
function Overlay({ id, label, overDesk, onClose, children }: { id: PanelId; label: string; overDesk: boolean; onClose: () => void; children: ReactNode }) {
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const close = useCallback(() => {
    if (motionMode() === 'off') {
      onClose();
      return;
    }
    setLeaving(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(onClose, 150);
  }, [onClose]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);
  // The panel's own close button (in its header) closes through the fade too.
  const onClickCapture = (e: MouseEvent) => {
    if (!(e.target instanceof Element) || !e.target.closest('.closeb')) return;
    e.preventDefault();
    e.stopPropagation();
    close();
  };
  return (
    <div className={`scr ov p-${id}${id === 'deck' ? ' deck-viewer' : ''}${overDesk ? ' over-desk' : ''}${leaving ? ' leaving' : ''}`} data-panel={id} role="dialog" aria-label={label} onClickCapture={onClickCapture}>
      <div className="scrim" onClick={close} />
      {children}
    </div>
  );
}

function Head({ kicker, title, close, onClose, tabs }: { kicker: string; title: string; close: string; onClose: () => void; tabs?: ReactNode }) {
  return (
    <div className="pnh">
      <div>
        <small>{kicker}</small>
        <b>{title}</b>
      </div>
      {tabs}
      <button className="closeb" onClick={onClose}>
        {close}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------- The deck

/** The mockup's minis are the hand's faces at 0.42; a deck grown past the panel takes the next step down. */
const MINI_STEPS = [0.42, 0.36, 0.3, 0.25, 0.2] as const;
const GRID_WIDTH = 884;
const GRID_ROOM = 448;
const GAP = 8;

function miniScale(counts: readonly number[]): number {
  for (const k of MINI_STEPS) {
    const perRow = Math.max(1, Math.floor((GRID_WIDTH + GAP) / (186 * k + GAP)));
    const height = counts.reduce((sum, n) => {
      const rows = Math.ceil(n / perRow);
      return sum + (rows ? rows * 252 * k + (rows - 1) * GAP : 0);
    }, 0);
    if (height <= GRID_ROOM) return k;
  }
  return 0.2;
}

/** Sorted by name, never in the order they will be drawn (decision 12). */
const byName = (s: GameState, cards: readonly CardInstance[]): CardInstance[] =>
  [...cards].sort((a, b) => cardName(s.content, a.cardId).localeCompare(cardName(s.content, b.cardId)) || a.uid - b.uid);

export function DeckPanel({ s, lane, season, words, onClose }: { s: GameState; lane: string | null; season: SeasonId; words: HandWords; onClose: () => void }) {
  const toDraw = useMemo(() => byName(s, s.deck), [s]);
  const played = useMemo(() => byName(s, s.discard), [s]);
  const scale = miniScale([toDraw.length, played.length]);
  const grid = (cards: readonly CardInstance[]) => (
    <div className="mgrid faces">
      {cards.map((card) => (
        <div key={card.uid} className="mini">
          <div className="sc">
            <CardPicture card={offerCardModel(s, card.cardId, lane, card.uid)} words={words} season={season} />
          </div>
        </div>
      ))}
    </div>
  );
  return (
    <Overlay id="deck" label={t('ui.deck.yours')} overDesk onClose={onClose}>
      <div className="panel" style={{ ['--ms' as string]: scale }}>
        <Head kicker={t('ui.deck.kicker', { n: toDraw.length, m: played.length })} title={t('ui.deck.yours')} close={t('ui.deck.back')} onClose={onClose} />
        <div className="dsec">
          <h4>{t('ui.deck.toDraw', { n: toDraw.length })}</h4>
          {grid(toDraw)}
        </div>
        <div className="dsec">
          <h4>{t('ui.deck.played', { n: played.length })}</h4>
          {grid(played)}
        </div>
      </div>
    </Overlay>
  );
}

// ---------------------------------------------------------------------------------------------------- The scrapbook

/** The clippings' tilts, as the mockup pins them. */
const TILT = [-2, 1.5, -1, 2];

/**
 * The scrapbook: two pages, the endings found and the awards won (round R4, A7), switched by two tabs in its head; it
 * opens on the endings, and its title counts the open page. The awards page shows all seven as the awards night's
 * plaques, four and three: one won bright, Winner and its citation; one not yet won dimmed, its name and how it is won.
 */
export function ScrapbookPanel({ found, awards, overDesk, onClose }: { found: ReadonlySet<string>; awards: ReadonlySet<string>; overDesk: boolean; onClose: () => void }) {
  const { majors, minors } = content.endings;
  const [page, setPage] = useState<'endings' | 'awards'>('endings');
  const n = minors.filter((m) => found.has(m.id)).length;
  const list = content.awards ?? [];
  const won = list.filter((a) => awards.has(a.id)).length;
  const tabs = (
    <nav className="tabs" role="tablist">
      {(['endings', 'awards'] as const).map((id) => (
        <button key={id} className={`tab${page === id ? ' on' : ''}`} role="tab" aria-selected={page === id} data-tab={id} onClick={() => setPage(id)}>
          {t(id === 'endings' ? 'ui.scrapbook.tabEndings' : 'ui.scrapbook.tabAwards')}
        </button>
      ))}
    </nav>
  );
  const title = page === 'endings' ? t('ui.scrapbook.title', { n, total: minors.length }) : t('ui.scrapbook.awardsTitle', { n: won, total: list.length });
  return (
    <Overlay id="scrapbook" label={t('ui.scrapbook.kicker')} overDesk={overDesk} onClose={onClose}>
      <div className="book" data-page={page}>
        <Head kicker={t('ui.scrapbook.kicker')} title={title} close={t('ui.scrapbook.close')} onClose={onClose} tabs={tabs} />
        {page === 'awards' ? (
          <div className="awards-page">
            {[list.slice(0, 4), list.slice(4)].map((row, r) => (
              <div key={r} className="prow">
                {row.map((a) =>
                  awards.has(a.id) ? (
                    <div key={a.id} className="pl" data-award={a.id} data-fit="1">
                      <div className="t">{t('ui.awards.winner')}</div>
                      <div className="n">{awardName(content, a.id)}</div>
                      <div className="c">{awardCitation(content, a.id)}</div>
                    </div>
                  ) : (
                    <div key={a.id} className="pl dim" data-award={a.id} data-fit="1">
                      <div className="t">{t('ui.scrapbook.notWon')}</div>
                      <div className="n">{awardName(content, a.id)}</div>
                      <div className="c">{awardHow(content, a.id)}</div>
                    </div>
                  ),
                )}
              </div>
            ))}
          </div>
        ) : (
        <div className="cols">
          {majors.map((major) => (
            <div key={major.id} className="col" data-major={major.id}>
              <h3>{t(major.nameKey)}</h3>
              <div className="gl">{t(major.goalKey)}</div>
              {minors
                .filter((m) => m.major === major.id)
                .map((m, i) =>
                  found.has(m.id) ? (
                    <div key={m.id} className="clip" data-minor={m.id} style={{ ['--r' as string]: `${TILT[i % TILT.length]}deg` }}>
                      <small>{t(major.nameKey)}</small>
                      <b>{t(m.nameKey)}</b>
                      <i />
                      <i />
                    </div>
                  ) : (
                    <div key={m.id} className="clip miss" data-minor={m.id}>
                      <small>{t('ui.scrapbook.missing')}</small>
                      <b>{t('ui.scrapbook.mark')}</b>
                    </div>
                  ),
                )}
            </div>
          ))}
        </div>
        )}
      </div>
    </Overlay>
  );
}

// ---------------------------------------------------------------------------------------------------- House rules

/** A row is one switch, its words and its toggle: the whole row takes the click. */
function Switch({ id, label, line }: { id: keyof Settings; label: string; line: string }) {
  const on = useSettings()[id];
  return (
    <button className="srow" role="switch" aria-checked={on} data-setting={id} onClick={() => setSetting(id, !on)}>
      <span className="sw">
        <b>{label}</b>
        <span>{line}</span>
      </span>
      <span className={`tog${on ? ' on' : ''}`} aria-hidden="true" />
    </button>
  );
}

/** Sound stays hidden until the game has sound (round R1, G3). */
export function SettingsPanel({ overDesk, onClose }: { overDesk: boolean; onClose: () => void }) {
  return (
    <Overlay id="settings" label={t('ui.settings.title')} overDesk={overDesk} onClose={onClose}>
      <div className="set">
        <Head kicker={t('ui.settings.kicker')} title={t('ui.settings.title')} close={t('ui.settings.done')} onClose={onClose} />
        <Switch id="markStories" label={t('ui.settings.mark')} line={t('ui.settings.markLine')} />
        <Switch id="reduceMotion" label={t('ui.settings.motion')} line={t('ui.settings.motionLine')} />
      </div>
    </Overlay>
  );
}

// ---------------------------------------------------------------------------------------------------- Credits

/**
 * The credits, in House rules' style: every third-party asset the game ships, as the jam requires — the two font
 * families, their copyright notices and their licence (ui/fonts/OFL.txt, shipped beside the fonts).
 */
/**
 * The year's numbers (round R3, D2): over the awards night, centred, in the panels' style, closed by its button, Escape
 * or a click outside. Every number is a stat bar chip in its colour; the words are the ending's own keys.
 */
export function NumbersPanel({ s, steps, onClose }: { s: GameState; steps: readonly PlayedStep[]; onClose: () => void }) {
  const events = steps.flatMap((step) => step.events);
  const peak = Math.max(s.resources.hype, ...events.flatMap((e) => (e.type === 'turnEnd' ? [e.resources.hype] : [])));
  const lane = establishedLanes(steps).slice(-1)[0] ?? null;
  const flags = Object.keys(s.flags);
  const r = s.resources;
  return (
    <Overlay id="numbers" label={t('ui.awards.numbers')} overDesk={false} onClose={onClose}>
      <IconDefs />
      <div className="set numbers">
        <Head kicker={t('ui.title.name')} title={t('ui.awards.numbers')} close={t('ui.credits.close')} onClose={onClose} />
        <div className="nrow">
          <b>{t('ui.ending.peak')}</b>
          <span className="chips">
            <Value v={{ kind: 'hype', icon: 'star', text: String(peak) }} />
          </span>
        </div>
        <div className="nrow">
          <b>{t('ui.ending.yearEnd')}</b>
          <span className="chips">
            <Value v={{ kind: 'hype', icon: 'star', text: String(r.hype) }} />
            <Value v={{ kind: 'craft', icon: lane === 'screen' ? 'clap' : 'note', text: String(r.craft) }} />
            <Value v={{ kind: 'heat', icon: 'flame', text: String(r.heat) }} />
            <Value v={{ kind: 'gain', icon: null, text: money(r.capital) }} />
          </span>
        </div>
        <div className="nrow">
          <span className="chips">
            <Value v={{ kind: 'scandal', icon: 'paper', text: String(scandalCount(s)) }} />
          </span>
          <b>{t('ui.ending.scandals')}</b>
        </div>
        <div className="nrow">
          <b>{flags.length ? t('ui.ending.flags', { flags: flags.map(flagName).join(', ') }) : t('ui.ending.noFlags')}</b>
        </div>
        <div className="nrow">
          <b>{t('ui.ending.doors', { passed: s.gateHistory.filter((g) => g.passed).length, total: s.gateHistory.length })}</b>
        </div>
        <div className="nrow">
          <b>{t('ui.ending.played', { n: events.filter((e) => e.type === 'play').length })}</b>
        </div>
      </div>
    </Overlay>
  );
}

export function CreditsPanel({ overDesk, onClose }: { overDesk: boolean; onClose: () => void }) {
  return (
    <Overlay id="credits" label={t('ui.credits.title')} overDesk={overDesk} onClose={onClose}>
      <div className="set credits">
        <Head kicker={t('ui.title.name')} title={t('ui.credits.title')} close={t('ui.credits.close')} onClose={onClose} />
        <div className="crow">
          <b>{t('ui.credits.fonts')}</b>
          <span>{t('credits.font.playfair')}</span>
          <span>{t('credits.font.franklin')}</span>
          <span>
            {t('ui.credits.licence')}{' '}
            <a href={licenceUrl} target="_blank" rel="noreferrer">
              {t('ui.credits.read')}
            </a>
          </span>
        </div>
        {/* The build's version, small at the foot (round R3): major and minor, as the itch page names builds. */}
        <div className="ver">{t('ui.credits.version', { version: __APP_VERSION__.split('.').slice(0, 2).join('.') })}</div>
      </div>
    </Overlay>
  );
}
