// Layer 2 part 1 (docs/ui-plan.md §13): the meaning layer, unstyled. Every screen answers one of the
// playtest's three questions — what am I doing (the opening, the feed's headlines, scandal lines, gate
// flavour), what am I aiming for (the goals board, the ending, the final gate), what can I do (the deck
// viewer). The human is still a persona: the screen comes from state.phase, what is clickable from
// legalActions, every preview from the reducer run on a hypothetical, every number from /core.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import {
  createInitialState,
  endingIfYearEndedNow,
  explainCondition,
  getCard,
  getGate,
  heatLine,
  reduce,
  RESOURCE_KEYS,
  scandalCount,
  yearAwards,
  type Action,
  type CardInstance,
  type ContentIndex,
  type GameState,
} from '../core/index.ts';
import { content, STRICT } from './content.ts';
import { feedLines, type FeedLine } from './feed.ts';
import { t } from './i18n.ts';
import { legalOf, previewDraftCard, previewEndTurn, previewGate, previewPlay, type EndTurnPreview, type GatePreview, type Legal, type Outcome, type PlayPreview } from './preview.ts';
import { EventQueue, type PlayedStep } from './queue.ts';
import {
  awardCitation,
  awardName,
  blockerText,
  cardName,
  cardRuleLines,
  cardText,
  clauseLine,
  effectsText,
  endingGoal,
  endingName,
  endingText,
  flagName,
  gateFlavor,
  gateName,
  heatText,
  isPlaceholder,
  resourceName,
  scandalHeadline,
  seasonName,
  signed,
  zoneName,
} from './text.ts';

/** The opening premise (decision 15): prose without a content home, shown on the title screen. */
const OPENING_KEY = 'story.opening';

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
  const opening = t(OPENING_KEY);
  return (
    <div className="title">
      <h1>{t('ui.title.name')}</h1>
      <div className={prose(opening, 'opening')}>
        {opening.split('\n\n').map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
      <button className="big" onClick={() => onStart(urlSeed ?? freshSeed())}>
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

  const endPreview = s.phase === 'play' ? previewEndTurn(s) : null;
  const card = focus?.kind === 'card' && s.hand.some((h) => h.uid === focus.uid) ? previewPlay(s, focus.uid) : null;

  return (
    <div className="app">
      <Masthead s={s} onDeck={() => setDeckOpen(true)} />
      <StatStrip s={s} />
      {error && (
        <p className="error overlay">
          {t('ui.error.title')}: {error}
        </p>
      )}
      {/* The goals stay in view through every decision (decision 6): the preview floats in the play area. */}
      <div className="body">
        <div className="main">
          <div className={s.phase === 'gate' ? 'middle wide' : 'middle'}>
            <Feed steps={snap.steps} />
            {s.phase !== 'gate' && (
              <aside className="side">
                <Side s={s} />
              </aside>
            )}
          </div>
          <section className="bottom">
            {s.phase === 'play' && <Hand s={s} legal={legal} act={act} setFocus={setFocus} endPreview={endPreview} />}
            {s.phase === 'draft' && <DraftPanel s={s} legal={legal} act={act} />}
            {s.phase === 'gate' && <GatePanel s={s} steps={snap.steps} legal={legal} act={act} />}
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
  const r = s.content.rules;
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
      <span className="when">{t('ui.masthead.when', { season: seasonName(s.content, s.act), turn: s.turn, total: r.acts * r.turnsPerAct })}</span>
    </header>
  );
}

function StatStrip({ s }: { s: GameState }) {
  // The heat display (decision 1): where heat sits against the line, from /core. It counts no scandals.
  return (
    <div className="stats">
      {RESOURCE_KEYS.map((k) => (
        <span key={k} className={`stat stat-${k}`}>
          {t('ui.stat.value', { name: resourceName(k), value: s.resources[k] })}
        </span>
      ))}
      <span className="stat togo">{heatText(heatLine(s))}</span>
      {s.phase === 'play' && <span className="stat">{t('ui.stat.slots', { n: s.slots })}</span>}
    </div>
  );
}

function Feed({ steps }: { steps: readonly PlayedStep[] }) {
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
          <FeedRow key={line.id} line={line} />
        ))}
      </ol>
    </div>
  );
}

function FeedRow({ line }: { line: FeedLine }) {
  const reg = line.register ? ` reg-${line.register}` : '';
  return <li className={prose(line.text, `feed-${line.kind}${reg}`)}>{line.text}</li>;
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
// Goals (decision 10): every ending, its name, its goal line and its requirements, live from the first turn.
// In narrative order, aspirations first (decision 22) — content order is resolution priority, never shown —
// with a marker on the ending the year would resolve to today, from /core.

function GoalsBoard({ s }: { s: GameState }) {
  const c = s.content;
  const today = endingIfYearEndedNow(s);
  const board = [...c.endings].sort((a, b) => (a.boardOrder ?? Infinity) - (b.boardOrder ?? Infinity));
  return (
    <div className="goals">
      <h2>{t('ui.goals.title')}</h2>
      {board.map((e) => {
        const clauses = explainCondition(e.conditions, s);
        const name = endingName(c, e.id);
        const goal = endingGoal(c, e.id);
        return (
          <div key={e.id} className={e.id === today ? 'goal today' : 'goal'}>
            {e.id === today && <div className="today-mark">{t('ui.goals.today')}</div>}
            <strong className={prose(name)}>{name}</strong> <em className={prose(goal)}>{goal}</em>
            <div className="clauses">
              {clauses.length === 0 ? (
                <span className="muted">{t('ui.goals.fallback')}</span>
              ) : (
                clauses.map((clause, i) => (
                  <span key={i} className={clause.met ? 'met' : 'unmet'}>
                    {clauseLine(clause)}
                  </span>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Previews

function OutcomeLines({ c, o, skipScandals = false }: { c: ContentIndex; o: Outcome; skipScandals?: boolean }) {
  const lines: string[] = [];
  for (const k of RESOURCE_KEYS) if (o.deltas[k] !== 0) lines.push(t('ui.effect.resource', { delta: signed(o.deltas[k]), resource: resourceName(k) }));
  if (o.drawn) lines.push(t('ui.preview.drawn', { n: o.drawn }));
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
  const text = p.headlineKey === null ? t('ui.feed.noHeadline', { card: cardName(c, p.cardId) }) : t(p.headlineKey);
  return <p className={prose(text, `preview-headline${p.register ? ` reg-${p.register}` : ''}`)}>{text}</p>;
}

function PlayPreviewView({ c, p }: { c: ContentIndex; p: PlayPreview }) {
  if (!p.ok || !p.outcome || !p.lineAfter) {
    const scandal = getCard(c, p.cardId)?.kind === 'scandal';
    const text = cardText(c, p.cardId);
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
              const headline = scandalHeadline(c, sc.cardId);
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
                  <span className={prose(headline, 'lead')}>{headline}</span>
                  <span className="muted cause">{line}</span>
                </li>
              );
            })}
          </ul>
        </>
      )}
      <OutcomeLines c={c} o={p.outcome} skipScandals />
      {p.carries && <p className="muted">{t('ui.preview.endCarry', { n: p.heatAfter })}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Play: the hand

function Hand({
  s,
  legal,
  act,
  setFocus,
  endPreview,
}: {
  s: GameState;
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
          const text = cardText(c, card.cardId);
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

function DraftPanel({ s, legal, act }: { s: GameState; legal: Legal; act: (a: Action) => void }) {
  const c = s.content;
  const cfg = c.rules.draft;
  if (!s.draft) return null;
  return (
    <div className="draft">
      <div className="row">
        <h2 className="grow">{t('ui.draft.title', { n: s.draft.picksLeft })}</h2>
        <button disabled={!legal.extraPick} onClick={() => act({ type: 'DRAFT_EXTRA_PICK' })}>
          {t('ui.draft.extraPick', { cost: cfg.extraPickCost })}
        </button>
        <button disabled={!legal.reroll} onClick={() => act({ type: 'DRAFT_REROLL' })}>
          {t('ui.draft.reroll', { cost: cfg.rerollCost })}
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

/** How a year-ending choice ends the year: the ending, then the awards it brings (decision 23). */
function yearEndText(c: ContentIndex, p: GatePreview): string | null {
  if (p.endingId === null) return null;
  const ending = endingName(c, p.endingId);
  const awards = (p.awardIds ?? []).map((id) => awardName(c, id)).join(' · ');
  return awards ? t('ui.gate.withAwards', { ending, awards }) : ending;
}

function GatePanel({ s, steps, legal, act }: { s: GameState; steps: readonly PlayedStep[]; legal: Legal; act: (a: Action) => void }) {
  const c = s.content;
  const history = useMemo(() => steps.flatMap((step) => step.events), [steps]);
  const previews = s.gateOffer.map((id) => previewGate(s, id, history));
  // The run's last choice is an informed one (decision 11): which ending, and which awards (decision 23).
  // Two identical predictions are said once, plainly.
  const [first] = previews;
  const eitherWay =
    first !== undefined &&
    first.endingId !== null &&
    previews.length > 1 &&
    previews.every((p) => p.endingId === first.endingId && (p.awardIds ?? []).join() === (first.awardIds ?? []).join());
  return (
    <div className="gates">
      <h2>{t('ui.gate.title', { season: seasonName(c, s.act) })}</h2>
      {eitherWay && <p className="leads">{t('ui.gate.eitherWay', { ending: yearEndText(c, first) ?? '' })}</p>}
      <div className="gate-row">
        {previews.map((p) => {
          const id = p.gateId;
          const gate = getGate(c, id);
          const yearEnd = eitherWay ? null : yearEndText(c, p);
          const flavor = gateFlavor(c, id);
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
              {yearEnd !== null && <p className="leads">{t('ui.gate.leadsTo', { ending: yearEnd })}</p>}
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

function Ending({ s, steps, onRestart }: { s: GameState; steps: readonly PlayedStep[]; onRestart: () => void }) {
  const c = s.content;
  const id = s.endingId ?? '';
  const others = c.endings.filter((e) => e.id !== id);
  const events = steps.flatMap((step) => step.events);
  const peakHype = Math.max(s.resources.hype, ...events.flatMap((e) => (e.type === 'turnEnd' ? [e.resources.hype] : [])));
  const played = events.filter((e) => e.type === 'play').length;
  const passed = s.gateHistory.filter((g) => g.passed).length;
  const flags = Object.keys(s.flags);
  const name = endingName(c, id);
  const text = endingText(c, id);
  // Every award the year won, from /core (decision 16): a plain list, no reveal, no ceremony.
  const awards = yearAwards(s, events);
  return (
    <div className="ending">
      <button className="play-again" onClick={onRestart}>
        {t('ui.ending.playAgain')}
      </button>
      <div className="ending-body">
        <div className="ending-story">
          <p className="muted">{t('ui.ending.title')}</p>
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
        </div>
        <div className="ending-facts">
          <h2>{t('ui.ending.summary')}</h2>
          <ul>
            <li>{t('ui.ending.peakHype', { n: peakHype })}</li>
            <li>{t('ui.ending.final', { ...s.resources })}</li>
            <li>{t('ui.ending.scandals', { n: scandalCount(s) })}</li>
            <li>{flags.length ? t('ui.ending.flags', { flags: flags.map(flagName).join(', ') }) : t('ui.ending.noFlags')}</li>
            <li>{t('ui.ending.gates', { passed, total: s.gateHistory.length })}</li>
            <li>{t('ui.ending.played', { n: played })}</li>
          </ul>
          <h2>{t('ui.ending.others', { n: others.length })}</h2>
          <ul>
            {others.map((e) => (
              <li key={e.id}>{t('ui.ending.other', { name: endingName(c, e.id), goal: endingGoal(c, e.id) })}</li>
            ))}
          </ul>
          <p className="muted">{t('ui.ending.seed', { seed: s.seed })}</p>
        </div>
      </div>
    </div>
  );
}
