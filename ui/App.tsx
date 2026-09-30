// Layer 2 part 1 (docs/ui-plan.md §13): the meaning layer, unstyled. Every screen answers one of the
// playtest's three questions — what am I doing (the opening, the feed's headlines, scandal lines, gate
// flavour), what am I aiming for (the goals board, the ending, the final gate), what can I do (the deck
// viewer). The human is still a persona: the screen comes from state.phase, what is clickable from
// legalActions, every preview from the reducer run on a hypothetical, every number from /core.

import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import {
  createInitialState,
  endingIfYearEndedNow,
  establishedLanes,
  explainCondition,
  freeRerollAvailable,
  getCard,
  getGate,
  getManager,
  majorOf,
  majorRequirements,
  readLines,
  reduce,
  rerollCost,
  rivalArc,
  RESOURCE_KEYS,
  scandalCount,
  yearAwards,
  type Action,
  type CardInstance,
  type ContentIndex,
  type GameState,
  type LineShow,
  type MonthPress,
} from '../core/index.ts';
import { content, STRICT } from './content.ts';
import { feedLines, type FeedLine } from './feed.ts';
import { t, tp } from './i18n.ts';
import { legalOf, previewDraftCard, previewEndTurn, previewGate, previewPlay, type EndTurnPreview, type GatePreview, type Legal, type Outcome, type PlayPreview } from './preview.ts';
import { EventQueue, type PlayedStep } from './queue.ts';
import { statCells } from './stats.ts';
import {
  awardCitation,
  awardName,
  blockerText,
  calendarLabel,
  cardName,
  cardRuleLines,
  cardText,
  clauseLine,
  dateLine,
  effectsText,
  endingPair,
  majorGoal,
  majorName,
  minorName,
  minorText,
  flagName,
  gateFlavor,
  gateName,
  heatText,
  isPlaceholder,
  lineText,
  majorClauseLine,
  mastheadName,
  money,
  openingText,
  pageItemText,
  resourceName,
  seasonLabel,
  seasonName,
  signedAmount,
  zoneName,
} from './text.ts';

/** Prose the author hasn't written yet is shown as a placeholder, never hidden (decision 15). */
const prose = (text: string, base = ''): string => `${base}${isPlaceholder(text) ? ' placeholder' : ''}`.trim();

// ---------------------------------------------------------------------------
// Seeds: every run replays from its seed; ?seed=123 in the URL replays one.

function freshSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? 1;
}

function seedFromUrl(): number | null {
  const s = new URLSearchParams(window.location.search).get('seed');
  return s !== null && /^\d{1,10}$/.test(s) ? Number(s) >>> 0 : null;
}

// ---------------------------------------------------------------------------

interface RunHandle {
  readonly id: number;
  readonly seed: number;
  readonly queue: EventQueue;
}

export function App() {
  const [run, setRun] = useState<RunHandle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const start = useCallback((seed: number) => {
    try {
      const state = createInitialState(seed, content, { strict: STRICT });
      setError(null);
      setRun((prev) => ({ id: (prev?.id ?? 0) + 1, seed, queue: new EventQueue({ action: null, state, events: state.events }) }));
    } catch (err) {
      setError(t('ui.error.detail', { message: err instanceof Error ? err.message : String(err), seed, action: 'start' }));
    }
  }, []);
  if (!run) return <Title onStart={start} error={error} />;
  return <Run key={run.id} run={run} onRestart={() => start(freshSeed())} />;
}

function Title({ onStart, error }: { onStart: (seed: number) => void; error: string | null }) {
  const urlSeed = seedFromUrl();
  // The run to come is chosen now, so the opening premise is that run's variant (decision 15, revised).
  const [seed] = useState(() => urlSeed ?? freshSeed());
  const opening = openingText(content, seed);
  return (
    <div className="title">
      <h1>{t('ui.title.name')}</h1>
      <div className={prose(opening, 'opening')}>
        {opening.split('\n\n').map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
      <button className="big" onClick={() => onStart(seed)}>
        {t('ui.title.newRun')}
      </button>
      {urlSeed !== null && <p className="muted">{t('ui.title.seed', { seed: urlSeed })}</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}

/**
 * Where a floating preview attaches (decision 6): the hovered element's box, in the play area's own layout
 * pixels — offsets, so the stage's scale never enters into it.
 */
interface Anchor {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  /** The play area the preview floats in. */
  readonly areaWidth: number;
  readonly areaHeight: number;
}

function anchorOf(el: HTMLElement): Anchor {
  const area = el.offsetParent as HTMLElement | null;
  return { left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, areaWidth: area?.offsetWidth ?? 0, areaHeight: area?.offsetHeight ?? 0 };
}

/** What floats beside the player's pointer: a card's preview, the end of the month's, or nothing. */
type Focus = { readonly kind: 'card'; readonly uid: number; readonly anchor: Anchor } | { readonly kind: 'end'; readonly anchor: Anchor } | null;

const FLOAT_WIDTH = 400;
const FLOAT_GAP = 8;

/**
 * A preview attached to the element it describes, inside the play area and so never over the goals rail.
 * It sits above the element when there is room; a preview taller than that room slides down until it
 * fits, over the element if it must — it never leaves the play area.
 */
function Floating({ anchor, children }: { anchor: Anchor; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const centre = anchor.left + anchor.width / 2;
  const left = Math.min(Math.max(FLOAT_GAP, centre - FLOAT_WIDTH / 2), anchor.areaWidth - FLOAT_WIDTH - FLOAT_GAP);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const h = el.offsetHeight;
    el.style.top = `${Math.max(FLOAT_GAP, Math.min(anchor.top - h - FLOAT_GAP, anchor.areaHeight - h - FLOAT_GAP))}px`;
  });
  return (
    <div className="floating" ref={box} style={{ left, width: FLOAT_WIDTH }}>
      {children}
    </div>
  );
}

function Run({ run, onRestart }: { run: RunHandle; onRestart: () => void }) {
  const { queue } = run;
  const snap = useSyncExternalStore(queue.subscribe, queue.getSnapshot);
  const [error, setError] = useState<string | null>(null);
  const [focus, setFocus] = useState<Focus>(null);
  const [deckOpen, setDeckOpen] = useState(false);
  const s = snap.state;
  const c = s.content;
  const legal = useMemo(() => legalOf(s), [s]);
  // Every line printed so far, the counter the next ones follow from (decision 15, revised), and the
  // established lane, which has hysteresis and so is read from history.
  const lines = useMemo(() => ({ ...readLines(snap.steps), lane: establishedLanes(snap.steps).at(-1) ?? null }), [snap.steps]);

  const act = (action: Action) => {
    if (queue.busy) queue.skip(); // a click fast-forwards whatever is still playing (layer 3)
    try {
      const next = reduce(queue.latest, action);
      queue.enqueue({ action, state: next, events: next.events });
      setError(null);
    } catch (err) {
      setError(t('ui.error.detail', { message: err instanceof Error ? err.message : String(err), seed: run.seed, action: JSON.stringify(action) }));
    }
  };

  if (s.phase === 'ended') return <Ending s={s} steps={snap.steps} onRestart={onRestart} />;
  if (s.phase === 'manager') return <ManagerChoice s={s} legal={legal} act={act} error={error} />;

  const endPreview = s.phase === 'play' ? previewEndTurn(s, lines.counter, lines.lane) : null;
  const card = focus?.kind === 'card' && s.hand.some((h) => h.uid === focus.uid) ? previewPlay(s, focus.uid, lines) : null;

  return (
    <div className="app">
      <Masthead s={s} onDeck={() => setDeckOpen(true)} />
      <StatStrip s={s} lane={lines.lane} />
      {error && (
        <p className="error overlay">
          {t('ui.error.title')}: {error}
        </p>
      )}
      {/* The goals stay in view through every decision (decision 6): the preview floats in the play area. */}
      <div className="body">
        <div className="main">
          <div className={s.phase === 'gate' ? 'middle wide' : 'middle'}>
            <Feed c={c} steps={snap.steps} />
            {s.phase !== 'gate' && (
              <aside className="side">
                <Side s={s} />
              </aside>
            )}
          </div>
          <section className="bottom">
            {s.phase === 'play' && <Hand s={s} inHand={lines.inHand} legal={legal} act={act} setFocus={setFocus} endPreview={endPreview} />}
            {s.phase === 'draft' && <DraftPanel s={s} legal={legal} act={act} />}
            {s.phase === 'gate' && <GatePanel s={s} legal={legal} act={act} />}
          </section>
          {card && focus?.kind === 'card' && (
            <Floating anchor={focus.anchor}>
              <PlayPreviewView c={c} p={card} />
            </Floating>
          )}
          {focus?.kind === 'end' && endPreview && (
            <Floating anchor={focus.anchor}>
              <EndTurnPreviewView c={c} p={endPreview} />
            </Floating>
          )}
        </div>
        <aside className="goals-rail">
          <GoalsBoard s={s} />
        </aside>
      </div>
      {deckOpen && <DeckViewer s={s} onClose={() => setDeckOpen(false)} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Frame: masthead, stat strip, feed, side panel

function Masthead({ s, onDeck }: { s: GameState; onDeck: () => void }) {
  const c = s.content;
  const date = calendarLabel(c, s.turn);
  return (
    <header className="masthead">
      <span className="name">{t('ui.masthead.name')}</span>
      <span className="seed muted">{t('ui.side.seed', { seed: s.seed })}</span>
      <span className="counts">
        {t('ui.side.deck', { n: s.deck.length })} · {t('ui.side.discard', { n: s.discard.length })} · {t('ui.side.scandals', { n: scandalCount(s) })}
      </span>
      <button className="deck-open" onClick={onDeck}>
        {t('ui.deck.open')}
      </button>
      {/* The date (round 2c, A3): the month and year, then the season and the month's place in it. */}
      <span className="when">
        <HoverTip header={date} line={dateLine(c, s.turn)} align="right" className="date">
          <strong>{date}</strong>
        </HoverTip>{' '}
        <span className="season muted">{seasonLabel(c, s.turn)}</span>
      </span>
    </header>
  );
}

/**
 * A tooltip (round 2c, A2): shown on hover, or on a long-press on touch until the next tap; a header, then
 * a line. It never takes a click: pointer events pass through it.
 */
function HoverTip({ header, line, className, align = 'left', children }: { header: string; line: string; className?: string; align?: 'left' | 'right'; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);
  return (
    <span
      className={`tipped${className ? ` ${className}` : ''}`}
      tabIndex={0}
      onPointerEnter={(e) => {
        if (e.pointerType === 'mouse') setOpen(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === 'mouse') setOpen(false);
      }}
      onPointerDown={(e) => {
        if (e.pointerType === 'mouse') return;
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setOpen(true), 450);
      }}
      onPointerUp={() => window.clearTimeout(timer.current)}
      onPointerCancel={() => window.clearTimeout(timer.current)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span className={`tip ${align}`} role="tooltip">
          <strong>{header}</strong>
          <span className={prose(line)}>{line}</span>
        </span>
      )}
    </span>
  );
}

/**
 * The stat bar (decision 25; round 2c, A1–A4): hype · craft · heat · next scandal · money · actions. Ambient
 * state is words, decisions are numbers: the tier /core picks, the number small beside it. The countdown
 * keeps its "N TO GO" (decision 1) in four levels. Every cell has a tooltip (ui/stats.ts); actions show in
 * the play phase.
 */
function StatStrip({ s, lane }: { s: GameState; lane: string | null }) {
  return (
    <div className="stats">
      {statCells(s, lane).map((cell) =>
        cell.id === 'actions' && s.phase !== 'play' ? null : (
          <HoverTip key={cell.id} header={cell.tipHeader} line={cell.tipLine} className={`stat stat-${cell.id}${cell.level ? ` level-${cell.level}` : ''}`}>
            {cell.id === 'next' ? (
              <strong className="togo">{cell.value}</strong>
            ) : (
              <>
                <span className="stat-name">{cell.label}</span>{' '}
                {cell.tier !== null ? (
                  <>
                    <strong className="tier">{cell.tier}</strong> <small className="num">{cell.value}</small>
                  </>
                ) : (
                  <span className={cell.id === 'actions' ? 'pips' : 'value'}>{cell.value}</span>
                )}
              </>
            )}
          </HoverTip>
        ),
      )}
    </div>
  );
}

function Feed({ c, steps }: { c: ContentIndex; steps: readonly PlayedStep[] }) {
  const box = useRef<HTMLDivElement>(null);
  const lines = useMemo(() => feedLines(steps), [steps]);
  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight });
  }, [lines.length]);
  return (
    <div className="feed" ref={box}>
      <h2>{t('ui.feed.title')}</h2>
      <ol>
        {lines.map((line) => (
          <FeedRow key={line.id} c={c} line={line} />
        ))}
      </ol>
    </div>
  );
}

function FeedRow({ c, line }: { c: ContentIndex; line: FeedLine }) {
  if (line.page) return <FrontPageView c={c} month={line.page} />;
  // The manager's messages (round 2b): their name, not a masthead; a message may be two bubbles.
  if (line.kind === 'message') {
    return (
      <li className={prose(line.text, 'feed-message')}>
        {line.speaker && <span className="speaker-label">{line.speaker}</span>}
        {line.text.split('\n').map((bubble, i) => (
          <span key={i} className="bubble">
            {bubble}
          </span>
        ))}
      </li>
    );
  }
  const reg = line.register ? ` reg-${line.register}` : '';
  // A line the press prints carries its paper's masthead (phase 2a); a quiet line is the player's notebook.
  return (
    <li className={prose(line.text, `feed-${line.kind}${reg}`)}>
      {line.masthead && <span className="paper-label">{line.masthead}</span>}
      {line.text}
    </li>
  );
}

/**
 * A month's front pages (Part E): the lead paper's, world stories marked as such, and a switch to the other
 * two — every paper is readable every month; each month opens on its own lead paper (E8, E9).
 */
function FrontPageView({ c, month }: { c: ContentIndex; month: MonthPress }) {
  const [shown, setShown] = useState(month.lead);
  const page = month.pages.find((p) => p.paper === shown) ?? month.pages[0];
  if (!page) return null;
  return (
    <li className="feed-page">
      <p className="dateline muted">{calendarLabel(c, month.turn)}</p>
      <div className="paper-switch">
        {month.pages.map((p) => (
          <button key={p.paper} className={p.paper === page.paper ? 'on' : undefined} aria-pressed={p.paper === page.paper} onClick={() => setShown(p.paper)}>
            {mastheadName(c, p.paper)}
          </button>
        ))}
      </div>
      <ol className="page">
        {page.items.map((item, i) => {
          const text = pageItemText(c, item);
          return (
            <li key={i} className={prose(text, `page-${item.slot} ${item.kind === 'world' || item.kind === 'rival' || item.kind === 'saga' ? 'world' : 'mine'}`)}>
              {text}
            </li>
          );
        })}
      </ol>
    </li>
  );
}

/** This season's gates, live. Not shown at a gate: the gate panel shows them in full there. */
function Side({ s }: { s: GameState }) {
  const c = s.content;
  return (
    <div className="side-box">
      <h2>{t('ui.side.thisSeason')}</h2>
      {(c.gatesByAct[String(s.act)] ?? []).map((g) => (
        <div key={g.id} className="mini-gate">
          <strong>{gateName(c, g.id)}</strong>
          <ul>
            {explainCondition(g.requires, s).map((clause, i) => (
              <li key={i} className={clause.met ? 'met' : 'unmet'}>
                {clauseLine(clause)}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Goals (decision 10): the four major endings in narrative order, aspirations first (decision 22) — each
// with its name, its goal line and its side of the 2×2 of fame and reputation, live. The marker names the
// ending the year would resolve to today, major and minor, from /core (docs/design/content-expansion.md §1).

function GoalsBoard({ s }: { s: GameState }) {
  const c = s.content;
  const today = endingIfYearEndedNow(s);
  return (
    <div className="goals">
      <h2>{t('ui.goals.title')}</h2>
      {c.majors.map((m) => {
        const name = majorName(c, m.id);
        const goal = majorGoal(c, m.id);
        const isToday = today !== null && today.majorId === m.id;
        return (
          <div key={m.id} className={isToday ? 'goal today' : 'goal'}>
            {isToday && (
              <div className="today-mark">
                {t('ui.goals.today')}: {endingPair(c, today.majorId, today.minorId)}
              </div>
            )}
            <strong className={prose(name)}>{name}</strong> <em className={prose(goal)}>{goal}</em>
            <div className="clauses">
              {majorRequirements(m, s).map((clause, i) => (
                <span key={i} className={clause.met ? 'met' : 'unmet'}>
                  {majorClauseLine(clause)}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Previews

/** An outcome's resource changes on one line: "Heat −1". */
const outcomeDeltas = (o: Outcome): string =>
  RESOURCE_KEYS.filter((k) => o.deltas[k] !== 0)
    .map((k) => t('ui.effect.resource', { delta: signedAmount(k, o.deltas[k]), resource: resourceName(k) }))
    .join(' · ');

function OutcomeLines({ c, o, skipScandals = false }: { c: ContentIndex; o: Outcome; skipScandals?: boolean }) {
  const lines: string[] = [];
  for (const k of RESOURCE_KEYS) if (o.deltas[k] !== 0) lines.push(t('ui.effect.resource', { delta: signedAmount(k, o.deltas[k]), resource: resourceName(k) }));
  if (o.drawn) lines.push(tp('ui.preview.drawn', o.drawn, { n: o.drawn }));
  for (const a of o.added) {
    if (skipScandals && getCard(c, a.cardId)?.kind === 'scandal') continue; // listed with their causes above
    lines.push(t('ui.preview.added', { card: cardName(c, a.cardId), zone: zoneName(a.to) }));
  }
  for (const id of o.exhausted) lines.push(t('ui.preview.exhausted', { card: cardName(c, id) }));
  for (const f of o.flags) lines.push(t('ui.preview.flag', { flag: flagName(f) }));
  if (!lines.length) lines.push(t('ui.preview.noChange'));
  return (
    <ul>
      {lines.map((line, i) => (
        <li key={i}>{line}</li>
      ))}
    </ul>
  );
}

/** The headline a card would print, in its register: the preview's first line (decision 21). */
function PreviewHeadline({ c, p }: { c: ContentIndex; p: PlayPreview }) {
  const text = lineText(c, p.headline, p.cardId, p.press?.subjectKey ?? null);
  return (
    <p className={prose(text, `preview-headline${p.register ? ` reg-${p.register}` : ''}`)}>
      {p.press?.paper && <span className="paper-label">{mastheadName(c, p.press.paper)}</span>}
      {text}
    </p>
  );
}

function PlayPreviewView({ c, p }: { c: ContentIndex; p: PlayPreview }) {
  if (!p.ok || !p.outcome || !p.lineAfter) {
    const scandal = getCard(c, p.cardId)?.kind === 'scandal';
    const text = scandal ? lineText(c, p.inHand, p.cardId) : cardText(c, p.cardId);
    return (
      <div className="preview blocked">
        {/* A scandal prints nothing when held: its in-hand line and rules. Any other card: the story it would print. */}
        {scandal ? <p className={prose(text, 'preview-headline in-hand')}>{text}</p> : <PreviewHeadline c={c} p={p} />}
        <p className="muted">{t('ui.preview.unplayable', { card: cardName(c, p.cardId) })}</p>
        <ul>
          {p.blockers.map((b, i) => (
            <li key={i}>{blockerText(b)}</li>
          ))}
        </ul>
        {cardRuleLines(c, p.cardId).map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
    );
  }
  // Story first, then the numbers, then any line crossing: a light warning only (decision 3).
  const crossing = Math.sign(p.linesCrossed);
  return (
    <div className="preview">
      <PreviewHeadline c={c} p={p} />
      <OutcomeLines c={c} o={p.outcome} />
      <p>{t('ui.preview.heat', { before: p.heatBefore, after: p.heatAfter ?? '', line: heatText(p.lineAfter) })}</p>
      {crossing !== 0 && <p className="warn">{t(crossing === 1 ? 'ui.preview.crosses' : 'ui.preview.cools')}</p>}
      <p className="muted">{t('ui.preview.slots', { n: p.slotsAfter ?? '' })}</p>
    </div>
  );
}

function EndTurnPreviewView({ c, p }: { c: ContentIndex; p: EndTurnPreview }) {
  // Every scandal card month end adds, from any cause, each with its cause (decision 2).
  return (
    <div className={`preview${p.scandalCards.length ? ' danger' : ''}`}>
      <h3>{t('ui.preview.endTitle')}</h3>
      {p.scandalCards.length === 0 ? (
        <p>{t('ui.preview.endNone')}</p>
      ) : (
        <>
          <p className="alarm">{t('ui.preview.endList')}</p>
          {/* Each scandal by the headline it would print (decision 21), then the card and its cause. */}
          <ul className="scandal-list">
            {p.scandalCards.map((sc, i) => {
              const card = cardName(c, sc.cardId);
              const headline = lineText(c, sc.line, sc.cardId, sc.press.subjectKey);
              const line =
                sc.cause.kind === 'crystallised'
                  ? sc.cause.cardId === null
                    ? t('ui.preview.endUnblamed', { card })
                    : t('ui.preview.endBlamed', { card, cause: cardName(c, sc.cause.cardId) })
                  : sc.cause.byCardId === null
                    ? t('ui.preview.endAddedUnknown', { card })
                    : sc.cause.byCardId === sc.cardId
                      ? t('ui.preview.endCopySelf', { card })
                      : t('ui.preview.endAdded', { card, source: cardName(c, sc.cause.byCardId) });
              return (
                <li key={i}>
                  <span className={prose(headline, 'lead')}>
                    {sc.press.paper && <span className="paper-label">{mastheadName(c, sc.press.paper)}</span>}
                    {headline}
                  </span>
                  <span className="muted cause">{line}</span>
                </li>
              );
            })}
          </ul>
        </>
      )}
      <OutcomeLines c={c} o={p.outcome} skipScandals />
      {/* The manager's month-end relief, after the check (round 2b): named by the perk. */}
      {p.perk && (
        <p className="muted perk">
          {t('ui.preview.endPerk', { perk: t(getManager(c, p.perk.manager)?.perk.nameKey ?? `manager.${p.perk.manager}.perk.name`), deltas: outcomeDeltas(p.perk.outcome) })}
        </p>
      )}
      {p.carries && <p className="muted">{t('ui.preview.endCarry', { n: p.heatAfter })}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Play: the hand

function Hand({
  s,
  inHand,
  legal,
  act,
  setFocus,
  endPreview,
}: {
  s: GameState;
  /** Each scandal's in-hand line, as the run's history picked it. */
  inHand: ReadonlyMap<number, LineShow>;
  legal: Legal;
  act: (a: Action) => void;
  setFocus: (f: Focus) => void;
  endPreview: EndTurnPreview | null;
}) {
  const c = s.content;
  const pressTimer = useRef<number | undefined>(undefined);
  const longPressed = useRef(false);
  const printing = endPreview?.scandalCards.length ?? 0;
  const endLabel = printing === 0 ? t('ui.hand.endTurnNone') : printing === 1 ? t('ui.hand.endTurnOne') : t('ui.hand.endTurnMany', { n: printing });
  return (
    <div className="hand">
      <div className="row">
        <h2>{t('ui.hand.title')}</h2>
        <span className="muted grow">{t('ui.hand.hint')}</span>
        <button
          className={`end${printing ? ' printing' : ''}`}
          disabled={!legal.endTurn}
          onPointerEnter={(e) => {
            if (e.pointerType === 'mouse') setFocus({ kind: 'end', anchor: anchorOf(e.currentTarget) });
          }}
          onPointerLeave={(e) => {
            if (e.pointerType === 'mouse') setFocus(null);
          }}
          onFocus={(e) => setFocus({ kind: 'end', anchor: anchorOf(e.currentTarget) })}
          onBlur={() => setFocus(null)}
          onClick={() => {
            setFocus(null);
            act({ type: 'END_TURN' });
          }}
        >
          {endLabel}
        </button>
      </div>
      {/* Draw effects can grow the hand past five; the row shrinks its type to keep one line of cards. */}
      <div className="cards" style={{ '--n': s.hand.length } as CSSProperties}>
        {s.hand.map((card) => {
          const def = getCard(c, card.cardId);
          const scandal = def?.kind === 'scandal';
          const playable = legal.play.has(card.uid);
          const text = scandal ? lineText(c, inHand.get(card.uid), card.cardId) : cardText(c, card.cardId);
          return (
            <button
              key={card.uid}
              className={`card${scandal ? ' scandal' : ''}${playable ? '' : ' off'}`}
              aria-disabled={!playable}
              onPointerEnter={(e) => {
                if (e.pointerType === 'mouse') setFocus({ kind: 'card', uid: card.uid, anchor: anchorOf(e.currentTarget) });
              }}
              onFocus={(e) => setFocus({ kind: 'card', uid: card.uid, anchor: anchorOf(e.currentTarget) })}
              onBlur={() => setFocus(null)}
              onPointerLeave={(e) => {
                if (e.pointerType === 'mouse') setFocus(null);
              }}
              onPointerDown={(e) => {
                if (e.pointerType === 'mouse') return;
                longPressed.current = false;
                const anchor = anchorOf(e.currentTarget);
                pressTimer.current = window.setTimeout(() => {
                  longPressed.current = true;
                  setFocus({ kind: 'card', uid: card.uid, anchor });
                }, 450);
              }}
              onPointerUp={() => window.clearTimeout(pressTimer.current)}
              onClick={(e) => {
                if (longPressed.current) {
                  longPressed.current = false; // a long-press previews; it never plays
                  return;
                }
                if (playable) {
                  setFocus(null);
                  act({ type: 'PLAY_CARD', uid: card.uid });
                } else setFocus({ kind: 'card', uid: card.uid, anchor: anchorOf(e.currentTarget) }); // tapping a card you can't play shows why
              }}
            >
              <span className="card-head">
                <strong>{cardName(c, card.cardId)}</strong>
                <span className="muted">{scandal ? t('ui.hand.dead') : t('ui.hand.cost', { n: def?.cost ?? 0 })}</span>
              </span>
              <span className={prose(text, scandal ? 'in-hand' : '')}>{text}</span>
              {scandal &&
                cardRuleLines(c, card.cardId).map((line, i) => (
                  <span key={i} className="muted rules">
                    {line}
                  </span>
                ))}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Draft

/** The reroll button's label: the manager's free label while their free reroll lasts (round 2b), else the price. */
function rerollLabel(s: GameState): string {
  const key = getManager(s.content, s.manager)?.perk.freeRerollKey;
  return freeRerollAvailable(s) && key ? t(key) : t('ui.draft.reroll', { cost: money(rerollCost(s)) });
}

function DraftPanel({ s, legal, act }: { s: GameState; legal: Legal; act: (a: Action) => void }) {
  const c = s.content;
  const cfg = c.rules.draft;
  if (!s.draft) return null;
  return (
    <div className="draft">
      <div className="row">
        <h2 className="grow">{tp('ui.draft.title', s.draft.picksLeft, { n: s.draft.picksLeft })}</h2>
        <button disabled={!legal.extraPick} onClick={() => act({ type: 'DRAFT_EXTRA_PICK' })}>
          {t('ui.draft.extraPick', { cost: money(cfg.extraPickCost) })}
        </button>
        <button className="reroll" disabled={!legal.reroll} onClick={() => act({ type: 'DRAFT_REROLL' })}>
          {rerollLabel(s)}
        </button>
      </div>
      <div className="cards">
        {s.draft.offer.map((id) => {
          const clauses = previewDraftCard(s, id);
          return (
            <div key={id} className="card offer">
              <span className="card-head">
                <strong>{cardName(c, id)}</strong>
                <span className="muted">{t('ui.hand.cost', { n: getCard(c, id)?.cost ?? 0 })}</span>
              </span>
              <span>{cardText(c, id)}</span>
              <div className="req">
                <span className="muted">{t('ui.draft.requires')}</span>
                {clauses.length ? (
                  <ul className="inline">
                    {clauses.map((clause, i) => (
                      <li key={i} className={clause.met ? 'met' : 'unmet'}>
                        {clauseLine(clause)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span>{t('ui.draft.free')}</span>
                )}
              </div>
              <button className="take" disabled={!legal.picks.has(id)} onClick={() => act({ type: 'DRAFT_PICK', cardId: id })}>
                {t('ui.draft.take')}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gate

const awardList = (c: ContentIndex, p: GatePreview): string => (p.awardIds ?? []).map((id) => awardName(c, id)).join(' · ');

function GatePanel({ s, legal, act }: { s: GameState; legal: Legal; act: (a: Action) => void }) {
  const c = s.content;
  const previews = s.gateOffer.map((id) => previewGate(s, id));
  const pair = (p: GatePreview) => (p.majorId !== null && p.endingId !== null ? endingPair(c, p.majorId, p.endingId) : '');
  // The run's last choice is an informed one (decision 11). The ending: one plain line when every option
  // gives the same one, otherwise on each option. Awards are the ending screen's to reveal — shown on each
  // option only when the options bring different ones, because then they bear on the choice (decision 23).
  const ending = previews[0]?.endingId ?? null;
  const sameEnding = ending !== null && previews.length > 1 && previews.every((p) => p.endingId === ending);
  const awardsDiffer = ending !== null && new Set(previews.map((p) => (p.awardIds ?? []).join())).size > 1;
  return (
    <div className="gates">
      <h2>{t('ui.gate.title', { season: seasonName(c, s.act) })}</h2>
      {sameEnding && previews[0] && <p className="leads">{t('ui.gate.eitherWay', { ending: pair(previews[0]) })}</p>}
      <div className="gate-row">
        {previews.map((p) => {
          const id = p.gateId;
          const gate = getGate(c, id);
          const flavor = gateFlavor(c, s.seed, id);
          return (
            <div key={id} className="gate">
              <div className="gate-head">
                <h3>{gateName(c, id)}</h3>
                <span className={p.passes ? 'pass' : 'alarm'}>{t(p.passes ? 'ui.gate.nowPass' : 'ui.gate.nowFail')}</span>
              </div>
              <p className={prose(flavor, 'flavor')}>{flavor}</p>
              <div className="req">
                <span className="muted">{t('ui.gate.requires')}</span>
                <ul className="inline">
                  {p.clauses.map((clause, i) => (
                    <li key={i} className={clause.met ? 'met' : 'unmet'}>
                      {clauseLine(clause)}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="branches">
                {t('ui.gate.onPass')}: {effectsText(c, gate?.onPass ?? [])} · {t('ui.gate.onFail')}: {effectsText(c, gate?.onFail ?? [])}
              </p>
              {!sameEnding && p.endingId !== null && <p className="leads">{t('ui.gate.leadsTo', { ending: pair(p) })}</p>}
              {awardsDiffer && <p className="leads">{t('ui.gate.awards', { awards: awardList(c, p) })}</p>}
              <button className="take" disabled={!legal.gates.has(id)} onClick={() => act({ type: 'CHOOSE_GATE', gateId: id })}>
                {t('ui.gate.choose', { gate: gateName(c, id) })}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Deck viewer (decision 12): read-only, sorted by name, never the draw order.

function grouped(c: ContentIndex, cards: readonly CardInstance[]) {
  const counts = new Map<string, number>();
  for (const card of cards) counts.set(card.cardId, (counts.get(card.cardId) ?? 0) + 1);
  return [...counts]
    .map(([id, n]) => ({ id, n, name: cardName(c, id), scandal: getCard(c, id)?.kind === 'scandal' }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function DeckViewer({ s, onClose }: { s: GameState; onClose: () => void }) {
  const c = s.content;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const lists = [
    { key: 'deck', title: t('ui.deck.deck', { n: s.deck.length }), cards: grouped(c, s.deck) },
    { key: 'discard', title: t('ui.deck.discard', { n: s.discard.length }), cards: grouped(c, s.discard) },
  ];
  return (
    <div className="deck-viewer" role="dialog" aria-label={t('ui.deck.title')}>
      <div className="row">
        <h2 className="grow">{t('ui.deck.title')}</h2>
        <span className="muted">{t('ui.deck.order')}</span>
        <button onClick={onClose}>{t('ui.deck.close')}</button>
      </div>
      <div className="deck-lists">
        {lists.map((list) => (
          <section key={list.key}>
            <h3>{list.title}</h3>
            {list.cards.length === 0 ? (
              <p className="muted">{t('ui.deck.empty')}</p>
            ) : (
              <ul>
                {list.cards.map((entry) => (
                  <li key={entry.id} className={entry.scandal ? 'lead' : undefined}>
                    {t('ui.deck.count', { n: entry.n, card: entry.name })}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ending

/** Where the endings collection is kept: found minor ids, this browser only (design §1.5). */
const COLLECTION_KEY = 'overexposed.endingsFound';

/**
 * Add this year's ending to the collection and return every minor found. A completion record only — it
 * changes nothing in play. Storage can be missing or refuse (private windows, blocked site data): the
 * collection then shows this run's ending alone, and never fails.
 */
function recordEnding(minorId: string): ReadonlySet<string> {
  let stored: string[] = [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(COLLECTION_KEY) ?? '[]');
    if (Array.isArray(parsed)) stored = parsed.filter((x): x is string => typeof x === 'string');
  } catch {
    // unreadable or unavailable: start from this run
  }
  const found = new Set([...stored, minorId]);
  try {
    localStorage.setItem(COLLECTION_KEY, JSON.stringify([...found]));
  } catch {
    // not saved; still shown
  }
  return found;
}

/** Endings found, grouped by major; the rest undiscovered. */
function EndingsCollection({ c, found }: { c: ContentIndex; found: ReadonlySet<string> }) {
  const known = c.minors.filter((m) => found.has(m.id)).length;
  return (
    <div className="collection">
      <h2>{t('ui.collection.title', { n: known, total: c.minors.length })}</h2>
      <ul>
        {c.majors.map((major) => (
          <li key={major.id}>
            <strong>{majorName(c, major.id)}</strong>
            <div className="minors">
              {(c.minorsByMajor[major.id] ?? []).map((m, i) => (
                <Fragment key={m.id}>
                  {i > 0 && ' · '}
                  <span className={found.has(m.id) ? 'found' : 'muted'}>{found.has(m.id) ? minorName(c, m.id) : t('ui.collection.undiscovered')}</span>
                </Fragment>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The manager (round 2b, C1): before month 1 the player chooses someone for their corner. Each card shows
// who they are, their one perk — its name and its rule, plain like a card's — and how they text.

function ManagerChoice({ s, legal, act, error }: { s: GameState; legal: Legal; act: (a: Action) => void; error: string | null }) {
  const m = s.content.managers;
  if (!m) return null;
  return (
    <div className="manager-choice">
      <p className="kicker muted">{t(m.choice.kickerKey)}</p>
      <h1>{t(m.choice.titleKey)}</h1>
      <p className="subtitle">{t(m.choice.subtitleKey)}</p>
      <div className="managers">
        {m.managers.map((mg) => (
          <button key={mg.id} className="manager choose" disabled={!legal.managers.has(mg.id)} onClick={() => act({ type: 'CHOOSE_MANAGER', managerId: mg.id })}>
            <strong className="manager-name">{t(mg.nameKey)}</strong>
            <span className="muted role">{t(mg.roleKey)}</span>
            <em className="quote">{t(mg.quoteKey)}</em>
            <span className="description">{t(mg.descriptionKey)}</span>
            <span className="tag muted">{t(mg.tagKey)}</span>
            <span className="perk">
              <strong>{t(mg.perk.nameKey)}</strong> <span>{t(mg.perk.effectKey)}</span>
            </span>
            <span className="sample">
              <span className="muted">{t(mg.sample.labelKey)}</span> <span className="bubble">{t(mg.sample.key)}</span>
            </span>
          </button>
        ))}
      </div>
      <p className="footer muted">{t(m.choice.footerKey)}</p>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

/**
 * The year's end: the major as the night's category, the minor as the ending with its text, then every
 * award won (decision 16: a plain list, no reveal, no ceremony), the run summary and the collection.
 */
function Ending({ s, steps, onRestart }: { s: GameState; steps: readonly PlayedStep[]; onRestart: () => void }) {
  const c = s.content;
  const id = s.endingId ?? '';
  const majorId = majorOf(c, id) ?? '';
  const [found] = useState(() => recordEnding(id));
  const events = steps.flatMap((step) => step.events);
  const peakHype = Math.max(s.resources.hype, ...events.flatMap((e) => (e.type === 'turnEnd' ? [e.resources.hype] : [])));
  const played = events.filter((e) => e.type === 'play').length;
  const passed = s.gateHistory.filter((g) => g.passed).length;
  const flags = Object.keys(s.flags);
  const category = majorName(c, majorId);
  const name = minorName(c, id);
  const text = minorText(c, s.seed, id);
  const awards = yearAwards(s);
  // The rival's year, closed under the awards (E7): fixed by the seed, never chosen to contrast the player's.
  const rival = rivalArc(c, s.seed);
  return (
    <div className="ending">
      <div className="ending-body">
        <div className="ending-story">
          <p className="muted">{t('ui.ending.title')}</p>
          <p className={prose(category, 'category')}>{category}</p>
          <h1 className={prose(name)}>{name}</h1>
          <p className={prose(text, 'ending-text')}>{text}</p>
          <h2>{t('ui.ending.awards')}</h2>
          <ul className="awards">
            {awards.map((award) => {
              const awardTitle = awardName(c, award);
              const citation = awardCitation(c, award);
              return (
                <li key={award}>
                  <strong className={prose(awardTitle)}>{awardTitle}</strong> <em className={prose(citation)}>{citation}</em>
                </li>
              );
            })}
          </ul>
          {rival && <p className={prose(t(rival.endingKey), 'rival-line')}>{t(rival.endingKey)}</p>}
          {/* Below the ending the player has just read (round 2b), and still the largest thing on the page. */}
          <button className="play-again" onClick={onRestart}>
            {t('ui.ending.playAgain')}
          </button>
        </div>
        <div className="ending-facts">
          <h2>{t('ui.ending.summary')}</h2>
          <ul>
            <li>{t('ui.ending.peakHype', { n: peakHype })}</li>
            <li>{t('ui.ending.final', { ...s.resources, capital: money(s.resources.capital) })}</li>
            <li>{t('ui.ending.scandals', { n: scandalCount(s) })}</li>
            <li>{flags.length ? t('ui.ending.flags', { flags: flags.map(flagName).join(', ') }) : t('ui.ending.noFlags')}</li>
            <li>{t('ui.ending.gates', { passed, total: s.gateHistory.length })}</li>
            <li>{t('ui.ending.played', { n: played })}</li>
          </ul>
          <EndingsCollection c={c} found={found} />
          <p className="muted">{t('ui.ending.seed', { seed: s.seed })}</p>
        </div>
      </div>
    </div>
  );
}
