// Layer 2 part 1 (docs/ui-plan.md §13): the meaning layer, unstyled. Every screen answers one of the
// playtest's three questions — what am I doing (the opening, the feed's headlines, scandal lines, gate
// flavour), what am I aiming for (the goals board, the ending, the final gate), what can I do (the deck
// viewer). The human is still a persona: the screen comes from state.phase, what is clickable from
// legalActions, every preview from the reducer run on a hypothetical, every number from /core.
//
// Round R3 (amended): the title is one photograph, the whole screen (ui/screens/Title.tsx); BEGIN's flash brings
// spring's card (the opening) over it, dimmed; its "Continue" takes it to dark and brings the desk up, the manager
// choice dealt onto it. Every season card waits for its button.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { createInitialState, establishedLanes, getEvent, readLines, reduce, type Action, type GameState } from '../core/index.ts';
import { content, STRICT } from './content.ts';
import { finishTransitions, motionMode, subscribeMotion } from './motion.ts';
import { Desk, type DeskMode } from './desk/Desk.tsx';
import { EndTurnPreviewView, PlayPreviewView } from './desk/Preview.tsx';
import { deskModel } from './desk/model.ts';
import { t } from './i18n.ts';
import { legalOf, previewPlay } from './preview.ts';
import { EventQueue } from './queue.ts';
import { readAwards, readFound } from './collection.ts';
import { Over, useFontsReady } from './screens/common.tsx';
import { ManagerScreen } from './screens/Opening.tsx';
import { CreditsPanel, DeckPanel, NumbersPanel, ScrapbookPanel, SettingsPanel, type PanelId } from './screens/Panels.tsx';
import { DoorsScreen, OffersScreen } from './screens/Choices.tsx';
import { AwardsNight } from './screens/Awards.tsx';
import { EventScreen } from './screens/Events.tsx';
import { SeasonCard } from './screens/Season.tsx';
import { TitleScreen } from './screens/Title.tsx';
import { calendarLabel, openingText, seasonName, seasonOpener } from './text.ts';

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

/** A run from its seed, or why it could not start. */
function makeRun(seed: number, id: number): RunHandle | string {
  try {
    const state = createInitialState(seed, content, { strict: STRICT });
    return { id, seed, queue: new EventQueue({ action: null, state, events: state.events }, motionMode) };
  } catch (err) {
    return t('ui.error.detail', { message: err instanceof Error ? err.message : String(err), seed, action: 'start' });
  }
}

export function App() {
  // The run to come is made now (decision 15, revised): the opening card is its own.
  const [made] = useState(() => makeRun(seedFromUrl() ?? freshSeed(), 1));
  const [run, setRun] = useState<RunHandle | null>(typeof made === 'string' ? null : made);
  const [error, setError] = useState<string | null>(typeof made === 'string' ? made : null);
  // PLAY AGAIN (round R3, B6): a fade through ink, then the next run's title arrives as on first load.
  const [ink, setInk] = useState<'in' | 'out' | null>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);
  const next = useCallback(() => {
    setRun((prev) => {
      const id = (prev?.id ?? 0) + 1;
      const urlSeed = seedFromUrl();
      const made = makeRun(urlSeed === null ? freshSeed() : (urlSeed + id - 1) >>> 0, id);
      if (typeof made === 'string') {
        setError(made);
        return prev;
      }
      setError(null);
      return made;
    });
  }, []);
  const restart = useCallback(() => {
    const mode = motionMode();
    if (mode === 'off') {
      next();
      return;
    }
    const step = mode === 'reduced' ? 100 : 350;
    setInk('in');
    timers.current.push(
      window.setTimeout(() => {
        next();
        setInk('out');
        timers.current.push(window.setTimeout(() => setInk(null), mode === 'reduced' ? 100 : 300));
      }, step),
    );
  }, [next]);
  // D7: a click during the fade completes it.
  useEffect(() => {
    if (ink === null) return;
    const done = (event: MouseEvent) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      timers.current.forEach((id) => window.clearTimeout(id));
      timers.current = [];
      if (ink === 'in') next();
      setInk(null);
      finishTransitions();
    };
    document.addEventListener('click', done, true);
    return () => document.removeEventListener('click', done, true);
  }, [ink, next]);
  if (!run) return <p className="plain error-layer">{error}</p>;
  return (
    <>
      <Run key={run.id} run={run} onRestart={restart} />
      {ink && <div className={`ink ${ink}`} aria-hidden="true" />}
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

/**
 * The season card a state shows, if its season's card has not been answered yet (round R3, A3). Seasons come in
 * order and each card is answered before the year goes on, so a season other than the last answered is a new one.
 */
function seasonOf(s: GameState, answered: number): { readonly act: number; readonly date: string; readonly season: string; readonly paragraphs: readonly string[] } | null {
  if (s.phase === 'ended' || s.act === answered) return null;
  const c = s.content;
  return { act: s.act, date: calendarLabel(c, s.turn), season: seasonName(c, s.act), paragraphs: [seasonOpener(c, s.seed, s.act)] };
}

/** The actions taken over the desk: their steps keep the dim up until the month opens onto it (round R4, A3c). */
const OVER_ACTIONS: ReadonlySet<string> = new Set(['CHOOSE_MANAGER', 'CHOOSE_GATE', 'CHOOSE_EVENT', 'DRAFT_PICK', 'DRAFT_EXTRA_PICK', 'DRAFT_REROLL']);

/**
 * A change of scene before the year (round R3, amended), and how long it runs, in ms: B1, BEGIN's flash and the
 * opening card developing out of it (ui/screens/title.css); B2, the photograph to dark, the desk coming up and the
 * manager cards dealt — clickable within the 1.5 s a season card's button allows (A3).
 */
type Scene = 'begin' | 'into';
const SCENE_MS: Record<Scene, number> = { begin: 750, into: 1200 };

function Run({ run, onRestart }: { run: RunHandle; onRestart: () => void }) {
  const { queue } = run;
  const snap = useSyncExternalStore(queue.subscribe, queue.getSnapshot);
  const [error, setError] = useState<string | null>(null);
  const [focus, setFocus] = useState<Focus>(null);
  // The deck, House rules, the credits or the scrapbook (round R1, Part G), over the desk or the awards night.
  const [panel, setPanel] = useState<PanelId | null>(null);
  const close = useCallback(() => setPanel(null), []);
  // Before the year (round R3): the title, then the opening card over it; then the manager choice, on the desk.
  const [intro, setIntro] = useState<'title' | 'opening' | null>('title');
  // The last season whose card was answered: spring's is the opening.
  const [answered, setAnswered] = useState(1);
  const [found] = useState(readFound);
  const [won] = useState(readAwards);
  const fonts = useFontsReady();
  // B1, title → opening card; B2, opening card → the manager choice. A click during one completes it (D7).
  const [scene, setScene] = useState<Scene | null>(null);
  const sceneTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(sceneTimer.current), []);
  const play = useCallback((next: Scene, then: () => void) => {
    then();
    const mode = motionMode();
    if (mode === 'off') return;
    setScene(next);
    window.clearTimeout(sceneTimer.current);
    sceneTimer.current = window.setTimeout(() => setScene(null), mode === 'reduced' ? 200 : SCENE_MS[next]);
  }, []);
  useEffect(() => {
    if (scene === null) return;
    const done = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      window.clearTimeout(sceneTimer.current);
      finishTransitions();
      setScene(null);
    };
    document.addEventListener('click', done, true);
    document.addEventListener('keydown', done, true);
    return () => {
      document.removeEventListener('click', done, true);
      document.removeEventListener('keydown', done, true);
    };
  }, [scene]);
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
  // The title's controls: BEGIN and its three links.
  const titleOn = useMemo(
    () => ({
      begin: () => play('begin', () => setIntro('opening')),
      scrapbook: () => setPanel('scrapbook'),
      settings: () => setPanel('settings'),
      credits: () => setPanel('credits'),
    }),
    [play],
  );

  if (s.phase === 'ended')
    return (
      <>
        <AwardsNight s={s} steps={snap.steps} onRestart={onRestart} openScrapbook={() => setPanel('scrapbook')} openNumbers={() => setPanel('numbers')} busy={snap.busy} beat={snap.active?.beat ?? 'idle'} />
        {panel === 'scrapbook' && <ScrapbookPanel found={readFound()} awards={readAwards()} overDesk={false} onClose={close} />}
        {panel === 'numbers' && <NumbersPanel s={s} steps={snap.steps} onClose={close} />}
      </>
    );
  // The title waits for the game's faces (round R1): a font that never comes is waited for 3 s.
  if (intro === 'title' && !fonts) return <div className="scr title-wait" />;

  const mode: DeskMode = s.phase === 'manager' ? 'manager' : 'game';
  // The desk from the opening card's "Continue" on (B2); the title until the desk has come up out of its dark.
  const desk = intro === null;
  const titled = intro !== null || scene === 'into';
  const game = desk && mode === 'game';
  const endPreview = model.endPreview;
  // The answer to an event, while its step plays and before it is published (round R2, Part C).
  // Round R4, A3b: the content leaves from the end of the reading hold (eventClose), and the month is published after it.
  const answering = snap.active?.step.action?.type === 'CHOOSE_EVENT' && !snap.active.published && !(snap.active.plan?.beats.slice(0, (snap.active.index ?? 0) + 1).some((b) => b.kind === 'eventClose') ?? false) ? snap.active : null;
  const card = !snap.busy && focus?.kind === 'card' && s.hand.some((h) => h.uid === focus.uid) ? previewPlay(s, focus.uid, lines) : null;
  // A season's card (round R3, A3): from the month end's 'season' beat, its entrance, until its button is clicked.
  const reached = snap.active?.plan ? snap.active.plan.beats.slice(0, (snap.active.index ?? 0) + 1).some((b) => b.kind === 'season') : false;
  const season = !game ? null : snap.active ? (reached ? seasonOf(snap.active.step.after, answered) : null) : seasonOf(s, answered);
  const clear = season === null;
  // Signing (round R3, B3): the step that takes the manager, and its beats so far.
  const signing = snap.active?.step.action?.type === 'CHOOSE_MANAGER' ? snap.active : null;
  const signBeats = signing?.plan ? signing.plan.beats.slice(0, (signing.index ?? 0) + 1).map((b) => b.kind) : [];
  const offers = clear && game && (s.phase === 'draft' || s.phase === 'gate') && !snap.active?.plan;
  const eventShown = clear && game && s.phase === 'event' && (!snap.active || answering !== null);
  const letter = s.phase === 'event' && getEvent(c, s.event ?? '')?.form === 'letter';
  // The dim (round R4, A3c): up with the first overlay and through the steps between overlays — a door, an offer, an
  // answer — until the month opens onto the desk, when its state is published in play. Signing lifts it on purpose at
  // its undim beat, and the offers bring it back (A2).
  const between = !!snap.active && OVER_ACTIONS.has(snap.active.step.action?.type ?? '') && s.phase !== 'play';
  const dimmed = desk && !(signing && signBeats.includes('undim')) && (mode === 'manager' || season !== null || offers || eventShown || between);

  return (
    <>
      {desk && (
        <Desk model={model} on={on} snap={snap} onTails={queue.onTails} mode={mode} busy={scene !== null} rising={scene === 'into'} arriving={signing !== null}>
          {/* The hover previews (decisions 2, 21), dressed for the desk: a card's, or the month end's. */}
          <Popover anchor={(s.phase === 'play' && card && focus?.kind === 'card') || (!snap.busy && s.phase === 'play' && focus?.kind === 'end' && endPreview) ? (focus?.anchor ?? null) : null}>
            {s.phase === 'play' && card && focus?.kind === 'card' ? <PlayPreviewView c={c} p={card} lane={lines.lane} slots={s.slots} /> : endPreview ? <EndTurnPreviewView c={c} p={endPreview} lane={lines.lane} /> : null}
          </Popover>
        </Desk>
      )}
      {/* The dim under every overlay (round R4, A3c): the whole stage before the stat bar comes, below it after. */}
      {desk && <div className={`dim-layer${mode === 'manager' || signing ? ' full' : ''}${dimmed ? ' on' : ''}`} data-hook="dim" aria-hidden="true" />}
      {/* The title (round R3, amended): over the desk while it goes to dark (B2); under the opening card, dimmed (B1). */}
      {titled && <TitleScreen c={c} found={found} won={won} dim={intro !== 'title'} out={scene === 'into'} busy={scene !== null} {...titleOn} />}
      {/* B1: BEGIN's one big flash, the screen gone white like an overexposed photograph. */}
      {scene === 'begin' && motionMode() === 'full' && <div className="whiteout" aria-hidden="true" />}
      {/* The screens around the desk (round R1), over the dimmed scene — beside the desk, never inside it, so none
          of the desk's styles reach them. */}
      {error && (
        <p className="plain error-layer">
          {t('ui.error.title')}: {error}
        </p>
      )}
      {/* Spring's card before the year (round R3, A2): the opening's paragraphs, under the season's name. */}
      <Over show={intro === 'opening'} full enter="develop">
        <SeasonCard date={calendarLabel(c, 1)} season={seasonName(c, 1)} paragraphs={openingText(c, s.seed).split('\n\n').slice(1)} go={() => play('into', () => setIntro(null))} />
      </Over>
      {/* The manager choice, dealt onto the desk as it comes up (round R3, B2); signing plays out on it (B3). */}
      <Over show={desk && mode === 'manager'} full enter="deal">
        <ManagerScreen s={s} legal={legal} act={act} beats={signBeats} chosen={signing?.step.action?.type === 'CHOOSE_MANAGER' ? signing.step.action.managerId : null} />
      </Over>
      <Over show={season !== null}>
        {season && <SeasonCard key={season.act} date={season.date} season={season.season} paragraphs={season.paragraphs} go={() => setAnswered(season.act)} />}
      </Over>
      <Over show={offers}>
        {offers && s.phase === 'draft' && s.draft && (
          <OffersScreen key={`${s.turn}:${s.draft.offer.join()}:${s.draft.picksLeft}`} s={s} legal={legal} act={act} lane={lines.lane} season={model.season} words={model.handWords} />
        )}
        {offers && s.phase === 'gate' && <DoorsScreen key={`${s.turn}:${s.gateOffer.join()}`} s={s} legal={legal} act={act} lane={lines.lane} />}
      </Over>
      {/* An event (round R2, Part C): once the month end has settled, and while its answer plays, until it is published. */}
      <Over show={eventShown} exit={letter ? 'up' : 'down'}>
        {eventShown && (
          <EventScreen
            key={`${s.turn}:${s.event}`}
            s={s}
            chosen={answering?.step.action?.type === 'CHOOSE_EVENT' ? answering.step.action.choice : null}
            beats={answering?.plan ? answering.plan.beats.slice(0, (answering.index ?? 0) + 1).map((b) => b.kind) : []}
            legal={legal}
            act={act}
            lines={lines}
            lane={lines.lane}
          />
        )}
      </Over>
      {panel === 'deck' && <DeckPanel s={s} lane={lines.lane} season={model.season} words={model.handWords} onClose={close} />}
      {panel === 'settings' && <SettingsPanel overDesk={game} onClose={close} />}
      {panel === 'credits' && <CreditsPanel overDesk={false} onClose={close} />}
      {panel === 'scrapbook' && <ScrapbookPanel found={found} awards={won} overDesk={false} onClose={close} />}
    </>
  );
}
