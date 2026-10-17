// Layer 2 part 1 (docs/ui-plan.md §13): the meaning layer, unstyled. Every screen answers one of the
// playtest's three questions — what am I doing (the opening, the feed's headlines, scandal lines, gate
// flavour), what am I aiming for (the goals board, the ending, the final gate), what can I do (the deck
// viewer). The human is still a persona: the screen comes from state.phase, what is clickable from
// legalActions, every preview from the reducer run on a hypothetical, every number from /core.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import {
  createInitialState,
  establishedLanes,
  getCard,
  getManager,
  readLines,
  reduce,
  RESOURCE_KEYS,
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
import { legalOf, previewPlay, type EndTurnPreview, type Outcome, type PlayPreview } from './preview.ts';
import { EventQueue } from './queue.ts';
import { readFound } from './collection.ts';
import { useFontsReady } from './screens/common.tsx';
import { ManagerScreen, TitleScreen, type TitleLink } from './screens/Opening.tsx';
import { DoorsScreen, OffersScreen } from './screens/Choices.tsx';
import { AwardsNight } from './screens/Awards.tsx';
import {
  blockerText,
  cardName,
  cardRuleLines,
  cardText,
  flagName,
  heatText,
  isPlaceholder,
  lineText,
  mastheadName,
  resourceName,
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

/** The title (round R1, Part B): shown once the fonts are in; the run to come is chosen now, so the opening is its variant. */
function Title({ onStart, error }: { onStart: (seed: number) => void; error: string | null }) {
  const ready = useFontsReady();
  const urlSeed = seedFromUrl();
  // The run to come is chosen now, so the opening premise is that run's variant (decision 15, revised).
  const [seed] = useState(() => urlSeed ?? freshSeed());
  const [found] = useState(readFound);
  const [panel, setPanel] = useState<TitleLink | null>(null);
  if (!ready) return <div className="scr title-screen" />;
  if (panel === 'credits') return <Credits onClose={() => setPanel(null)} />;
  return (
    <>
      <TitleScreen seed={seed} found={found} onBegin={() => onStart(seed)} open={setPanel} links={['credits']} />
      {error && <p className="plain error-layer">{error}</p>}
    </>
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
 * One way for anything to appear on hover (round R1, H4): a preview rises and fades in after a brief delay — so
 * sweeping across the hand does not flicker — and fades out quickly when it closes, an input hold included. The
 * last preview is kept for the fade.
 */
function Popover({ anchor, children }: { anchor: Anchor | null; children: ReactNode }) {
  const last = useRef<{ anchor: Anchor; children: ReactNode } | null>(null);
  const [leaving, setLeaving] = useState(false);
  const open = anchor !== null;
  if (open) last.current = { anchor, children };
  useLayoutEffect(() => {
    if (open) {
      setLeaving(false);
      return;
    }
    // With motion off (the audits), a closed preview goes at once.
    if (!last.current || motionMode() === 'off') {
      last.current = null;
      setLeaving(false);
      return;
    }
    setLeaving(true);
    const timer = window.setTimeout(() => {
      last.current = null;
      setLeaving(false);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [open]);
  const shown = open ? last.current : leaving ? last.current : null;
  return shown ? (
    <Floating anchor={shown.anchor} leaving={!open}>
      {shown.children}
    </Floating>
  ) : null;
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
function Floating({ anchor, children, leaving = false }: { anchor: Anchor; children: ReactNode; leaving?: boolean }) {
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
    <div className={`floating ${leaving ? 'out' : 'in'}`} ref={box} style={{ left, width: FLOAT_WIDTH }}>
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
      if (queue.busy) { queue.skip(); return; } // D7: within the card's hold and the month end, skip consumes this action.
      queue.settleTails(); // a landed card's tails hold no input: completed at once, then the action proceeds (R1, Part A)
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

  if (s.phase === 'ended')
    return <AwardsNight s={s} steps={snap.steps} onRestart={onRestart} openScrapbook={null} busy={snap.busy} beat={snap.active?.beat ?? 'idle'} />;
  if (s.phase === 'manager')
    return (
      <>
        <ManagerScreen s={s} legal={legal} act={act} />
        {error && <p className="plain error-layer">{t('ui.error.title')}: {error}</p>}
      </>
    );

  const endPreview = model.endPreview;
  const card = !snap.busy && focus?.kind === 'card' && s.hand.some((h) => h.uid === focus.uid) ? previewPlay(s, focus.uid, lines) : null;

  return (
    <>
      <Desk model={model} on={on} snap={snap} onTails={queue.onTails}>
        {/* The hover previews (decisions 2, 21), dressed for the desk: a card's, or the month end's. */}
        <Popover anchor={(s.phase === 'play' && card && focus?.kind === 'card') || (!snap.busy && s.phase === 'play' && focus?.kind === 'end' && endPreview) ? (focus?.anchor ?? null) : null}>
          {s.phase === 'play' && card && focus?.kind === 'card' ? <PlayPreviewView c={c} p={card} /> : endPreview ? <EndTurnPreviewView c={c} p={endPreview} /> : null}
        </Popover>
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
          {s.phase === 'draft' && s.draft && (
            <OffersScreen key={`${s.turn}:${s.draft.offer.join()}:${s.draft.picksLeft}`} s={s} legal={legal} act={act} lane={lines.lane} season={model.season} words={model.handWords} />
          )}
          {s.phase === 'gate' && <DoorsScreen key={`${s.turn}:${s.gateOffer.join()}`} s={s} legal={legal} act={act} lane={lines.lane} />}
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
