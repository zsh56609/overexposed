// Layer 2 part 1 (docs/ui-plan.md §13): the meaning layer, unstyled. Every screen answers one of the
// playtest's three questions — what am I doing (the opening, the feed's headlines, scandal lines, gate
// flavour), what am I aiming for (the goals board, the ending, the final gate), what can I do (the deck
// viewer). The human is still a persona: the screen comes from state.phase, what is clickable from
// legalActions, every preview from the reducer run on a hypothetical, every number from /core.

import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import {
  cardFace,
  createInitialState,
  establishedLanes,
  freeRerollAvailable,
  getCard,
  getGate,
  getManager,
  lastWord,
  majorOf,
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
} from '../core/index.ts';
import { content, STRICT } from './content.ts';
import { motionMode, subscribeMotion } from './motion.ts';
import { Desk } from './desk/Desk.tsx';
import { deskModel } from './desk/model.ts';
import licenceUrl from './fonts/OFL.txt?url';
import { t, tp } from './i18n.ts';
import { legalOf, previewDraftCard, previewGate, previewPlay, type EndTurnPreview, type GatePreview, type Legal, type Outcome, type PlayPreview } from './preview.ts';
import { EventQueue, type PlayedStep } from './queue.ts';
import {
  awardCitation,
  awardName,
  blockerText,
  cardName,
  cardFlavor,
  offerLabels,
  cardRuleLines,
  cardText,
  costLabel,
  clauseLine,
  effectsText,
  endingPair,
  majorName,
  minorName,
  minorText,
  flagName,
  gateFlavor,
  gateName,
  heatText,
  isPlaceholder,
  lineText,
  managerName,
  mastheadName,
  money,
  openingText,
  resourceName,
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
      setRun((prev) => ({ id: (prev?.id ?? 0) + 1, seed, queue: new EventQueue({ action: null, state, events: state.events }, motionMode) }));
    } catch (err) {
      setError(t('ui.error.detail', { message: err instanceof Error ? err.message : String(err), seed, action: 'start' }));
    }
  }, []);
  if (!run) return <Title onStart={start} error={error} />;
  return <Run key={run.id} run={run} onRestart={() => start(seedFromUrl() === null ? freshSeed() : ((seedFromUrl()! + run.id) >>> 0))} />;
}

function Title({ onStart, error }: { onStart: (seed: number) => void; error: string | null }) {
  const urlSeed = seedFromUrl();
  // The run to come is chosen now, so the opening premise is that run's variant (decision 15, revised).
  const [seed] = useState(() => urlSeed ?? freshSeed());
  const [credits, setCredits] = useState(false);
  const opening = openingText(content, seed);
  if (credits) return <Credits onClose={() => setCredits(false)} />;
  return (
    <div className="plain full title">
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
      <button className="credits-open" onClick={() => setCredits(true)}>
        {t('ui.title.credits')}
      </button>
    </div>
  );
}

/**
 * The credits (round V1a): every third-party asset the game ships, as the jam requires — the two font
 * families, their copyright notices and their licence (ui/fonts/OFL.txt, shipped beside the fonts).
 */
function Credits({ onClose }: { onClose: () => void }) {
  return (
    <div className="plain full credits">
      <h1>{t('ui.credits.title')}</h1>
      <h2>{t('ui.credits.fonts')}</h2>
      <p>{t('credits.font.playfair')}</p>
      <p>{t('credits.font.franklin')}</p>
      <p>
        {t('ui.credits.licence')}{' '}
        <a href={licenceUrl} target="_blank" rel="noreferrer">
          {t('ui.credits.read')}
        </a>
      </p>
      <button onClick={onClose}>{t('ui.credits.close')}</button>
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
  useLayoutEffect(() => { if (snap.busy) setFocus(null); }, [snap.busy]);
  useEffect(()=>{let previous=motionMode();return subscribeMotion(()=>{const next=motionMode();if(next!==previous&&queue.busy)queue.skip();previous=next;});},[queue]);
  useEffect(() => {
    const skip = (event: MouseEvent | KeyboardEvent) => {
      if (!queue.busy || (event instanceof KeyboardEvent && event.key !== 'Enter' && event.key !== ' ')) return;
      event.preventDefault(); event.stopImmediatePropagation(); queue.skip(); setFocus(null);
    };
    document.addEventListener('click', skip, true); document.addEventListener('keydown', skip, true);
    return () => { document.removeEventListener('click', skip, true); document.removeEventListener('keydown', skip, true); queue.dispose(); };
  }, [queue]);
  const s = snap.state;
  const c = s.content;
  const legal = useMemo(() => legalOf(s), [s]);
  // Every line printed so far, the counter the next ones follow from (decision 15, revised), and the
  // established lane, which has hysteresis and so is read from history.
  const lines = useMemo(() => ({ ...readLines(snap.steps), lane: establishedLanes(snap.steps).slice(-1)[0] ?? null }), [snap.steps]);
  // The desk: every word and number it shows, from /core (round V1a; ui/desk/model.ts).
  const model = useMemo(() => deskModel({ state: s, steps: snap.steps, lines }), [s, snap.steps, lines]);
  const act = useCallback(
    (action: Action) => {
      if (queue.busy) { queue.skip(); return; } // D7: skip consumes this action.
      try {
        const next = reduce(queue.latest, action);
        queue.enqueue({ action, state: next, events: next.events });
        setError(null);
      } catch (err) {
        setError(t('ui.error.detail', { message: err instanceof Error ? err.message : String(err), seed: run.seed, action: JSON.stringify(action) }));
      }
    },
    [queue, run.seed],
  );
  // What the desk can ask for: stable, so a part that did not change does not render again.
  const on = useMemo(
    () => ({
      deck: () => setDeckOpen(true),
      play: (uid: number) => act({ type: 'PLAY_CARD', uid }),
      end: () => act({ type: 'END_TURN' }),
      focus: (next: Focus) => setFocus(queue.busy ? null : next),
    }),
    [act, queue],
  );

  if (s.phase === 'ended') return <div className="plain full"><Ending s={s} steps={snap.steps} onRestart={onRestart} /></div>;
  if (s.phase === 'manager') return <div className="plain full"><ManagerChoice s={s} legal={legal} act={act} error={error} /></div>;

  const endPreview = model.endPreview;
  const card = !snap.busy && focus?.kind === 'card' && s.hand.some((h) => h.uid === focus.uid) ? previewPlay(s, focus.uid, lines) : null;

  return (
    <>
      <Desk model={model} on={on} snap={snap} hold={queue.hold}>
        {/* The hover previews (decisions 2, 21), dressed for the desk: a card's, or the month end's. */}
        {s.phase === 'play' && card && focus?.kind === 'card' && (
          <Floating anchor={focus.anchor}>
            <PlayPreviewView c={c} p={card} />
          </Floating>
        )}
        {!snap.busy && s.phase === 'play' && focus?.kind === 'end' && endPreview && (
          <Floating anchor={focus.anchor}>
            <EndTurnPreviewView c={c} p={endPreview} />
          </Floating>
        )}
      </Desk>
      {/* The screens around the desk (round V2) in their plain versions, over the dimmed scene — beside the
          desk, never inside it, so none of the desk's styles reach them. */}
      {error && (
        <p className="plain error-layer">
          {t('ui.error.title')}: {error}
        </p>
      )}
      {(s.phase === 'draft' || s.phase === 'gate') && !snap.active?.plan && (
        <div className="screen-over">
          <div className="screen-scrim" />
          <div className="plain panel">
            {s.phase === 'draft' && <DraftPanel s={s} legal={legal} act={act} />}
            {s.phase === 'gate' && <GatePanel s={s} legal={legal} act={act} />}
          </div>
        </div>
      )}
      {deckOpen && (
        <div className="plain deck-layer">
          <DeckViewer s={s} onClose={() => setDeckOpen(false)} />
        </div>
      )}
    </>
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
  const extraLabels = offerLabels(s);
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
      <div className="cards" style={{ '--n': s.draft.offer.length } as CSSProperties}>
        {s.draft.offer.map((id) => {
          const clauses = previewDraftCard(s, id);
          return (
            <div key={id} className={`card offer face-${cardFace(c, id) ?? 'none'}${extraLabels.has(id) ? ' extra' : ''}`}>
              {extraLabels.has(id) && <span className="extra-label">{extraLabels.get(id)}</span>}
              <span className="card-head">
                <strong>{cardName(c, id)}</strong>
                {costLabel(c, id) && <span className="muted">{costLabel(c, id)}</span>}
              </span>
              <span>{cardText(c, id)}</span>
              {cardFlavor(c, id) && <span className={prose(cardFlavor(c, id) ?? '', 'flavor')}>{cardFlavor(c, id)}</span>}
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
  const last = lastWord(s);
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
          {/* The manager's last word (round 2c, C3): two bubbles for the year's major, under their name. */}
          {last && (
            <div className="last-word">
              <span className="speaker-label">{managerName(c, last.manager)}</span>
              {last.bubbles.map((key) => (
                <span key={key} className={prose(t(key), 'bubble')}>
                  {t(key)}
                </span>
              ))}
            </div>
          )}
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
