// Layer 2 part 1 (docs/ui-plan.md §13): the meaning layer, unstyled. Every screen answers one of the
// playtest's three questions — what am I doing (the opening, the feed's headlines, scandal lines, gate
// flavour), what am I aiming for (the goals board, the ending, the final gate), what can I do (the deck
// viewer). The human is still a persona: the screen comes from state.phase, what is clickable from
// legalActions, every preview from the reducer run on a hypothetical, every number from /core.

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import {
  createInitialState,
  explainCondition,
  getCard,
  getGate,
  heatLine,
  reduce,
  RESOURCE_KEYS,
  scandalCount,
  type Action,
  type CardInstance,
  type ContentIndex,
  type GameState,
} from '../core/index.ts';
import { content, STRICT } from './content.ts';
import { feedLines, type FeedLine } from './feed.ts';
import { t } from './i18n.ts';
import { legalOf, previewDraftCard, previewEndTurn, previewGate, previewPlay, type EndTurnPreview, type Legal, type Outcome, type PlayPreview } from './preview.ts';
import { EventQueue, type PlayedStep } from './queue.ts';
import {
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

/** What the right-hand column previews: a card, the end of the month, or nothing (the goals board). */
type Focus = { readonly kind: 'card'; readonly uid: number } | { readonly kind: 'end' } | null;

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
      <Masthead s={s} />
      <StatStrip s={s} />
      {error && (
        <p className="error overlay">
          {t('ui.error.title')}: {error}
        </p>
      )}
      <div className="middle">
        <Feed steps={snap.steps} />
        <aside className="side">
          <Side s={s} onDeck={() => setDeckOpen(true)} />
        </aside>
        <aside className="preview-col">
          {card ? (
            <PlayPreviewView c={c} p={card} />
          ) : focus?.kind === 'end' && endPreview ? (
            <EndTurnPreviewView c={c} p={endPreview} />
          ) : (
            <GoalsBoard s={s} />
          )}
        </aside>
      </div>
      <section className="bottom">
        {s.phase === 'play' && <Hand s={s} legal={legal} act={act} setFocus={setFocus} endPreview={endPreview} />}
        {s.phase === 'draft' && <DraftPanel s={s} legal={legal} act={act} />}
        {s.phase === 'gate' && <GatePanel s={s} legal={legal} act={act} />}
      </section>
      {deckOpen && <DeckViewer s={s} onClose={() => setDeckOpen(false)} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Frame: masthead, stat strip, feed, side panel

function Masthead({ s }: { s: GameState }) {
  const r = s.content.rules;
  return (
    <header className="masthead">
      <span className="name">{t('ui.masthead.name')}</span>
      <span className="seed muted">{t('ui.side.seed', { seed: s.seed })}</span>
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

function Side({ s, onDeck }: { s: GameState; onDeck: () => void }) {
  const c = s.content;
  return (
    <div className="side-box">
      {/* At a gate the gate panel shows this season's gates in full; here they would only repeat it. */}
      {s.phase !== 'gate' && <h2>{t('ui.side.thisSeason')}</h2>}
      {s.phase !== 'gate' &&
        (c.gatesByAct[String(s.act)] ?? []).map((g) => (
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
      <p>
        {t('ui.side.deck', { n: s.deck.length })} · {t('ui.side.discard', { n: s.discard.length })} ·{' '}
        {t('ui.side.scandals', { n: scandalCount(s) })}
      </p>
      <button className="deck-open" onClick={onDeck}>
        {t('ui.deck.open')}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Goals (decision 10): every ending, its name, its goal line and its requirements, live from the first turn.

function GoalsBoard({ s }: { s: GameState }) {
  const c = s.content;
  return (
    <div className="goals">
      <h2>{t('ui.goals.title')}</h2>
      {c.endings.map((e) => {
        const clauses = explainCondition(e.conditions, s);
        const name = endingName(c, e.id);
        const goal = endingGoal(c, e.id);
        return (
          <div key={e.id} className="goal">
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

function PlayPreviewView({ c, p }: { c: ContentIndex; p: PlayPreview }) {
  if (!p.ok || !p.outcome || !p.lineAfter) {
    const text = cardText(c, p.cardId);
    return (
      <div className="preview blocked">
        <h3>{t('ui.preview.unplayable', { card: cardName(c, p.cardId) })}</h3>
        <ul>
          {p.blockers.map((b, i) => (
            <li key={i}>{blockerText(b)}</li>
          ))}
        </ul>
        <p className={prose(text, 'muted')}>{text}</p>
        {cardRuleLines(c, p.cardId).map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
    );
  }
  // A card that crosses a line gets a light warning only (decision 3): the count lives on END TURN.
  const crossing = Math.sign(p.linesCrossed);
  return (
    <div className="preview">
      <h3>{t('ui.preview.title', { card: cardName(c, p.cardId) })}</h3>
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
          <ul>
            {p.scandalCards.map((sc, i) => {
              const card = cardName(c, sc.cardId);
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
                <li key={i} className="lead">
                  {line}
                </li>
              );
            })}
          </ul>
        </>
      )}
      <OutcomeLines c={c} o={p.outcome} skipScandals />
      <p className="muted">{t('ui.preview.endCarry', { n: p.heatAfter })}</p>
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
            if (e.pointerType === 'mouse') setFocus({ kind: 'end' });
          }}
          onPointerLeave={(e) => {
            if (e.pointerType === 'mouse') setFocus(null);
          }}
          onFocus={() => setFocus({ kind: 'end' })}
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
                if (e.pointerType === 'mouse') setFocus({ kind: 'card', uid: card.uid });
              }}
              onPointerLeave={(e) => {
                if (e.pointerType === 'mouse') setFocus(null);
              }}
              onPointerDown={(e) => {
                if (e.pointerType === 'mouse') return;
                longPressed.current = false;
                pressTimer.current = window.setTimeout(() => {
                  longPressed.current = true;
                  setFocus({ kind: 'card', uid: card.uid });
                }, 450);
              }}
              onPointerUp={() => window.clearTimeout(pressTimer.current)}
              onClick={() => {
                if (longPressed.current) {
                  longPressed.current = false; // a long-press previews; it never plays
                  return;
                }
                if (playable) {
                  setFocus(null);
                  act({ type: 'PLAY_CARD', uid: card.uid });
                } else setFocus({ kind: 'card', uid: card.uid }); // tapping a card you can't play shows why
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

function GatePanel({ s, legal, act }: { s: GameState; legal: Legal; act: (a: Action) => void }) {
  const c = s.content;
  return (
    <div className="gates">
      <h2>{t('ui.gate.title', { season: seasonName(c, s.act) })}</h2>
      <div className="gate-row">
        {s.gateOffer.map((id) => {
          const gate = getGate(c, id);
          const p = previewGate(s, id);
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
              {/* The run's last choice is an informed one (decision 11): which ending it leads to. */}
              {p.endingId !== null && <p className="leads">{t('ui.gate.leadsTo', { ending: endingName(c, p.endingId) })}</p>}
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
