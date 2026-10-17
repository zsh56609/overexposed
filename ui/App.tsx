// Layer 2 part 1 (docs/ui-plan.md §13): the meaning layer, unstyled. Every screen answers one of the
// playtest's three questions — what am I doing (the opening, the feed's headlines, scandal lines, gate
// flavour), what am I aiming for (the goals board, the ending, the final gate), what can I do (the deck
// viewer). The human is still a persona: the screen comes from state.phase, what is clickable from
// legalActions, every preview from the reducer run on a hypothetical, every number from /core.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { createInitialState, establishedLanes, readLines, reduce, type Action } from '../core/index.ts';
import { content, STRICT } from './content.ts';
import { motionMode, subscribeMotion } from './motion.ts';
import { Desk } from './desk/Desk.tsx';
import { EndTurnPreviewView, PlayPreviewView } from './desk/Preview.tsx';
import { deskModel } from './desk/model.ts';
import { t } from './i18n.ts';
import { legalOf, previewPlay } from './preview.ts';
import { EventQueue } from './queue.ts';
import { readFound } from './collection.ts';
import { useFontsReady } from './screens/common.tsx';
import { ManagerScreen, TitleScreen } from './screens/Opening.tsx';
import { CreditsPanel, DeckPanel, ScrapbookPanel, SettingsPanel, type PanelId } from './screens/Panels.tsx';
import { DoorsScreen, OffersScreen } from './screens/Choices.tsx';
import { AwardsNight } from './screens/Awards.tsx';

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
  // The scrapbook, House rules or the credits, over the title (round R1, Part G).
  const [panel, setPanel] = useState<PanelId | null>(null);
  const close = useCallback(() => setPanel(null), []);
  if (!ready) return <div className="scr title-screen" />;
  return (
    <>
      <TitleScreen seed={seed} found={found} onBegin={() => onStart(seed)} open={setPanel} />
      {panel === 'scrapbook' && <ScrapbookPanel found={found} overDesk={false} onClose={close} />}
      {panel === 'settings' && <SettingsPanel overDesk={false} onClose={close} />}
      {panel === 'credits' && <CreditsPanel overDesk={false} onClose={close} />}
      {error && <p className="plain error-layer">{error}</p>}
    </>
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

const sameFocus = (a: Focus, b: Focus): boolean =>
  a === b ||
  (a !== null && b !== null && a.kind === b.kind && (a.kind === 'end' || (b.kind === 'card' && a.uid === b.uid)) && a.anchor.left === b.anchor.left && a.anchor.top === b.anchor.top);

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
  // The deck, House rules (over the desk) or the scrapbook (over the awards night): round R1, Part G.
  const [panel, setPanel] = useState<PanelId | null>(null);
  const close = useCallback(() => setPanel(null), []);
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
      deck: () => setPanel('deck'),
      settings: () => setPanel('settings'),
      play: (uid: number) => act({ type: 'PLAY_CARD', uid }),
      end: () => act({ type: 'END_TURN' }),
      // The same card at the same place is the same focus: a pointer moving within it renders nothing again.
      focus: (next: Focus) => setFocus((prev) => (queue.busy ? null : sameFocus(prev, next) ? prev : next)),
    }),
    [act, queue],
  );

  if (s.phase === 'ended')
    return (
      <>
        <AwardsNight s={s} steps={snap.steps} onRestart={onRestart} openScrapbook={() => setPanel('scrapbook')} busy={snap.busy} beat={snap.active?.beat ?? 'idle'} />
        {panel === 'scrapbook' && <ScrapbookPanel found={readFound()} overDesk={false} onClose={close} />}
      </>
    );
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
          {s.phase === 'play' && card && focus?.kind === 'card' ? <PlayPreviewView c={c} p={card} lane={lines.lane} slots={s.slots} /> : endPreview ? <EndTurnPreviewView c={c} p={endPreview} lane={lines.lane} /> : null}
        </Popover>
      </Desk>
      {/* The screens around the desk (round R1), over the dimmed scene — beside the desk, never inside it, so none
          of the desk's styles reach them. */}
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
      {panel === 'deck' && <DeckPanel s={s} lane={lines.lane} season={model.season} words={model.handWords} onClose={close} />}
      {panel === 'settings' && <SettingsPanel overDesk onClose={close} />}
    </>
  );
}
