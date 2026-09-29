// Layer 1 (docs/ui-plan.md §10): every screen, functional and plain. The human is the seventh persona:
// the screen comes from state.phase, what is clickable from legalActions, every preview from the
// reducer run on a hypothetical, every number from /core. No rule is computed here.

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import {
  createInitialState,
  explainCondition,
  getCard,
  getGate,
  heatOutlook,
  reduce,
  RESOURCE_KEYS,
  scandalCount,
  type Action,
  type ContentIndex,
  type GameState,
} from '../core/index.ts';
import { content, STRICT } from './content.ts';
import { t } from './i18n.ts';
import { legalOf, previewDraftCard, previewEndTurn, previewGate, previewPlay, type EndTurnPreview, type Legal, type Outcome, type PlayPreview } from './preview.ts';
import { EventQueue, type FeedItem } from './queue.ts';
import { blockerText, cardName, cardText, clauseLine, effectsText, eventText, flagName, gateName, resourceName, seasonName, signed, zoneName } from './text.ts';

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
  return (
    <div className="title">
      <h1>{t('ui.title.name')}</h1>
      <p>{t('ui.title.tagline')}</p>
      <button className="big" onClick={() => onStart(urlSeed ?? freshSeed())}>
        {t('ui.title.newRun')}
      </button>
      {urlSeed !== null && <p className="muted">{t('ui.title.seed', { seed: urlSeed })}</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}

function Run({ run, onRestart }: { run: RunHandle; onRestart: () => void }) {
  const { queue } = run;
  const snap = useSyncExternalStore(queue.subscribe, queue.getSnapshot);
  const [error, setError] = useState<string | null>(null);
  const [focus, setFocus] = useState<number | null>(null);
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

  if (s.phase === 'ended') return <Ending s={s} feed={snap.feed} onRestart={onRestart} />;

  const focused = focus !== null && s.hand.some((card) => card.uid === focus) ? previewPlay(s, focus) : null;
  const endPreview = s.phase === 'play' ? previewEndTurn(s) : null;

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
        <Feed c={c} feed={snap.feed} />
        <aside className="side">
          <Side s={s} />
        </aside>
        <aside className="preview-col">
          {focused ? <PlayPreviewView c={c} p={focused} /> : endPreview && <EndTurnPreviewView c={c} p={endPreview} />}
        </aside>
      </div>
      <section className="bottom">
        {s.phase === 'play' && <Hand s={s} legal={legal} act={act} setFocus={setFocus} />}
        {s.phase === 'draft' && <DraftPanel s={s} legal={legal} act={act} />}
        {s.phase === 'gate' && <GatePanel s={s} legal={legal} act={act} />}
      </section>
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
  // The frozen heat display (CLAUDE.md §2): whole numbers from /core, never the threshold.
  const outlook = heatOutlook(s);
  return (
    <div className="stats">
      {RESOURCE_KEYS.map((k) => (
        <span key={k} className={`stat stat-${k}`}>
          {t('ui.stat.value', { name: resourceName(k), value: s.resources[k] })}
        </span>
      ))}
      <span className="stat togo">{t('ui.stat.toGo', { n: outlook.heatToNextScandal })}</span>
      <span className="stat">{t('ui.stat.ifEndedNow', { n: outlook.scandalsIfTurnEndedNow })}</span>
      {s.phase === 'play' && <span className="stat">{t('ui.stat.slots', { n: s.slots })}</span>}
      <span className="stat">{t('ui.stat.scandalsHeld', { n: scandalCount(s) })}</span>
    </div>
  );
}

function Feed({ c, feed }: { c: ContentIndex; feed: readonly FeedItem[] }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight });
  }, [feed.length]);
  const rows: ReactNode[] = [];
  let month = '';
  for (const item of feed) {
    const key = `${item.act}/${item.turn}`;
    if (key !== month) {
      month = key;
      rows.push(
        <li key={`m${item.id}`} className="month">
          {t('ui.feed.month', { season: seasonName(c, item.act), turn: item.turn })}
        </li>,
      );
    }
    rows.push(
      <li key={item.id} className={item.event.type === 'scandal' ? 'lead' : undefined}>
        {eventText(c, item.event)}
      </li>,
    );
  }
  return (
    <div className="feed" ref={box}>
      <h2>{t('ui.feed.title')}</h2>
      <ol>{rows}</ol>
    </div>
  );
}

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
      <p>
        {t('ui.side.deck', { n: s.deck.length })} · {t('ui.side.discard', { n: s.discard.length })} ·{' '}
        {t('ui.side.scandals', { n: scandalCount(s) })}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Previews

function OutcomeLines({ c, o }: { c: ContentIndex; o: Outcome }) {
  const lines: string[] = [];
  for (const k of RESOURCE_KEYS) if (o.deltas[k] !== 0) lines.push(t('ui.effect.resource', { delta: signed(o.deltas[k]), resource: resourceName(k) }));
  if (o.drawn) lines.push(t('ui.preview.drawn', { n: o.drawn }));
  for (const a of o.added) lines.push(t('ui.preview.added', { card: cardName(c, a.cardId), zone: zoneName(a.to) }));
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
  if (!p.ok || !p.outcome || !p.outlookAfter) {
    return (
      <div className="preview blocked">
        <h3>{t('ui.preview.unplayable', { card: cardName(c, p.cardId) })}</h3>
        <ul>
          {p.blockers.map((b, i) => (
            <li key={i}>{blockerText(b)}</li>
          ))}
        </ul>
        <p className="muted">{cardText(c, p.cardId)}</p>
      </div>
    );
  }
  const crossing = Math.sign(p.linesCrossed);
  return (
    <div className={`preview${crossing === 1 ? ' danger' : ''}`}>
      <h3>{t('ui.preview.title', { card: cardName(c, p.cardId) })}</h3>
      <OutcomeLines c={c} o={p.outcome} />
      <p>{t('ui.preview.heat', { before: p.heatBefore, after: p.heatAfter ?? '', toGo: p.outlookAfter.heatToNextScandal })}</p>
      <p className={crossing === 1 ? 'alarm' : undefined}>
        {crossing === 1
          ? t('ui.preview.crosses', { n: p.linesCrossed })
          : crossing === -1
            ? t('ui.preview.cools', { n: -p.linesCrossed })
            : t('ui.preview.safe')}
      </p>
      <p>{t('ui.preview.endAfter', { n: p.endTurnAfter?.crystallised ?? 0 })}</p>
      <p className="muted">{t('ui.preview.slots', { n: p.slotsAfter ?? '' })}</p>
    </div>
  );
}

function EndTurnPreviewView({ c, p }: { c: ContentIndex; p: EndTurnPreview }) {
  return (
    <div className={`preview${p.crystallised ? ' danger' : ''}`}>
      <h3>{t('ui.preview.endTitle')}</h3>
      <p className={p.crystallised ? 'alarm' : undefined}>{t('ui.preview.endScandals', { n: p.crystallised })}</p>
      <ul>
        {p.outcome.scandals.map((id, i) => (
          <li key={i} className="lead">
            {t('ui.preview.endScandal', { card: cardName(c, id) })}
          </li>
        ))}
      </ul>
      <OutcomeLines c={c} o={p.outcome} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Play: the hand

function Hand({ s, legal, act, setFocus }: { s: GameState; legal: Legal; act: (a: Action) => void; setFocus: (uid: number | null) => void }) {
  const c = s.content;
  const pressTimer = useRef<number | undefined>(undefined);
  const longPressed = useRef(false);
  return (
    <div className="hand">
      <div className="row">
        <h2>{t('ui.hand.title')}</h2>
        <span className="muted grow">{t('ui.hand.hint')}</span>
        <button className="end" disabled={!legal.endTurn} onClick={() => act({ type: 'END_TURN' })}>
          {t('ui.hand.endTurn')}
        </button>
      </div>
      {/* Draw effects can grow the hand past five; the row shrinks its type to keep one line of cards. */}
      <div className="cards" style={{ '--n': s.hand.length } as CSSProperties}>
        {s.hand.map((card) => {
          const def = getCard(c, card.cardId);
          const scandal = def?.kind === 'scandal';
          const playable = legal.play.has(card.uid);
          return (
            <button
              key={card.uid}
              className={`card${scandal ? ' scandal' : ''}${playable ? '' : ' off'}`}
              aria-disabled={!playable}
              onPointerEnter={(e) => {
                if (e.pointerType === 'mouse') setFocus(card.uid);
              }}
              onPointerLeave={(e) => {
                if (e.pointerType === 'mouse') setFocus(null);
              }}
              onPointerDown={(e) => {
                if (e.pointerType === 'mouse') return;
                longPressed.current = false;
                pressTimer.current = window.setTimeout(() => {
                  longPressed.current = true;
                  setFocus(card.uid);
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
                } else setFocus(card.uid); // tapping a card you can't play shows why
              }}
            >
              <span className="card-head">
                <strong>{cardName(c, card.cardId)}</strong>
                <span className="muted">{scandal ? t('ui.hand.dead') : t('ui.hand.cost', { n: def?.cost ?? 0 })}</span>
              </span>
              <span>{cardText(c, card.cardId)}</span>
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
                  <ul>
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
          return (
            <div key={id} className="gate">
              <h3>{gateName(c, id)}</h3>
              <div className="req">
                <span className="muted">{t('ui.gate.requires')}</span>
                <ul>
                  {p.clauses.map((clause, i) => (
                    <li key={i} className={clause.met ? 'met' : 'unmet'}>
                      {clauseLine(clause)}
                    </li>
                  ))}
                </ul>
              </div>
              <p className={p.passes ? 'pass' : 'alarm'}>{t(p.passes ? 'ui.gate.nowPass' : 'ui.gate.nowFail')}</p>
              <p>
                {t('ui.gate.onPass')}: {effectsText(c, gate?.onPass ?? [])}
              </p>
              <p>
                {t('ui.gate.onFail')}: {effectsText(c, gate?.onFail ?? [])}
              </p>
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
// Ending

function Ending({ s, feed, onRestart }: { s: GameState; feed: readonly FeedItem[]; onRestart: () => void }) {
  const c = s.content;
  const ending = c.endings.find((e) => e.id === s.endingId);
  const others = c.endings.filter((e) => e.id !== s.endingId);
  const peakHype = Math.max(s.resources.hype, ...feed.flatMap((i) => (i.event.type === 'turnEnd' ? [i.event.resources.hype] : [])));
  const played = feed.filter((i) => i.event.type === 'play').length;
  const passed = s.gateHistory.filter((g) => g.passed).length;
  const flags = Object.keys(s.flags);
  return (
    <div className="ending">
      <button className="play-again" onClick={onRestart}>
        {t('ui.ending.playAgain')}
      </button>
      <p className="muted">{t('ui.ending.title')}</p>
      <h1>{t(ending?.textKey ?? 'ui.ending.title')}</h1>
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
          <li key={e.id}>{t('ui.ending.locked')}</li>
        ))}
      </ul>
      <p className="muted">{t('ui.ending.seed', { seed: s.seed })}</p>
    </div>
  );
}
