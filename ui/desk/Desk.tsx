// The desk (round V1a; docs/design/visual/README.md "The scene", §1–§7): a dressing-room vanity seen from the
// chair, on the one 1280×720 stage. This component stacks the layers; each part of the desk renders from the
// adapter's model (./model.ts) and computes nothing. Whatever is passed as children is drawn over the scene
// (the plain screens until round V2).

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Bubbles, DeskPlane, Uprights } from './DeskItems.tsx';
import { Motion } from './Motion.tsx';
import { Pile } from './Pile.tsx';
import { MonthMotion } from './MonthMotion.tsx';
import { presentation } from './presentation.ts';
import type { Snapshot } from '../queue.ts';
import { Hand, type HandFocus } from './Hand.tsx';
import { IconDefs } from './Icons.tsx';
import { Mirror } from './Mirror.tsx';
import { Papers, type IncomingPaper } from './Papers.tsx';
import { eventPress } from '../../core/index.ts';
import { paperForPlay, type DeskModel } from './model.ts';
import { StatBar } from './StatBar.tsx';
import { TitleControls, TitleFan, TitleNotes, TitlePaper } from './Title.tsx';
import type { HandCardModel } from './model.ts';
import type { ContentIndex } from '../../core/index.ts';
import { useSettings } from '../settings.ts';
import './tokens.css';
import './fonts.css';
import './css/scene.css';
import './css/stats.css';
import './css/mirror.css';
import './css/papers.css';
import './css/desk-items.css';
import './css/hand.css';
import './css/motion.css';
import './css/title.css';

/** "Mark my stories" (README §2): a House rules setting, on by default; round V2 gives it its switch. */
/** What the player can do on the desk: each is a dispatch or a UI toggle in App, never a rule. */
export interface DeskActions {
  /** Open the deck's panel (round R1, G1). */
  readonly deck: () => void;
  /** Open House rules (round R1, G3). */
  readonly settings: () => void;
  readonly play: (uid: number) => void;
  readonly end: () => void;
  /** What the hover previews describe: a card, the month end, or nothing. */
  readonly focus: (f: HandFocus) => void;
}

/**
 * Which desk this is (round R3, Part A): the title, the night before the year (its paper, the mirror's five notes,
 * the fan and BEGIN); the opening card over it; the manager choice on it; or the year being played.
 */
export type DeskMode = 'title' | 'opening' | 'manager' | 'game';

/** What the title needs that the year's model does not: the endings found, the fan's faces, its three controls. */
export interface DeskIntro {
  readonly c: ContentIndex;
  readonly found: ReadonlySet<string>;
  readonly fan: readonly HandCardModel[];
  readonly begin: () => void;
  readonly settings: () => void;
  readonly credits: () => void;
  readonly scrapbook: () => void;
}

/** The phone on the night before the year: its lock screen and the time, nothing yet. */
const QUIET_PHONE = { notes: [] } as const;

/** A short note in the middle of the desk (README §9): a scandal can't be played; no actions left. */
function useToast(): [{ readonly text: string; readonly on: boolean }, (text: string) => void] {
  const [toast, setToast] = useState({ text: '', on: false });
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const show = useCallback((text: string) => {
    window.clearTimeout(timer.current);
    setToast({ text, on: true });
    timer.current = window.setTimeout(() => setToast((t) => ({ ...t, on: false })), 2400);
  }, []);
  return [toast, show];
}

/**
 * The desk. Round R3: `mode` (which desk), `scene` (a change of scene before the year: the fan leaving, the title
 * paper sliding off), `arriving` (signing: the month's papers, the stat bar and the mirror's notes coming in), `fresh`
 * (the title after PLAY AGAIN: the mirror's bulbs coming on).
 */
export function Desk({ model, on, children, snap, onTails, mode = 'game', intro = null, busy = false, scene = null, arriving = false, fresh = false }: { model: DeskModel; on: DeskActions; children?: ReactNode; snap: Snapshot; onTails: (settle: () => void) => () => void; mode?: DeskMode; intro?: DeskIntro | null; busy?: boolean; scene?: 'begin' | 'into' | null; arriving?: boolean; fresh?: boolean }) {
  const [toast, showToast] = useToast();
  const view=presentation(snap,model);
  // Mark my stories (House rules, round R1 G3): the red margin rule on the player's stories.
  const marks = useSettings().markStories;
  // The paper a play in flight brings forward (round R1, H3): read once, as the card lifts.
  const playing = snap.active && !snap.active.plan && snap.active.step.events.some((e) => e.type === 'play') ? snap.active.step : null;
  // An event's answer that prints (round R2, Part D): the paper that printed it is in front when the desk returns.
  const answering = snap.active?.step.action?.type === 'CHOOSE_EVENT' ? snap.active.step : null;
  const incoming = useMemo<IncomingPaper | null>(
    () =>
      playing
        ? { id: playing.id, paper: paperForPlay(snap.steps.filter((x) => x.id !== playing.id), playing) }
        : answering?.action?.type === 'CHOOSE_EVENT'
          ? { id: answering.id, paper: eventPress(answering.after.content, answering.before?.event ?? '', answering.action.choice)?.paper ?? null }
          : null,
    [playing?.id, answering?.id],
  );
  const game = mode === 'game';
  return (
    <div className={`desk ${model.season} lane-${model.lane} mode-${mode}${model.crisis ? ' crisis' : ''}${marks ? ' marks' : ''}${arriving ? ' arriving' : ''}${fresh && mode === 'title' ? ' lights-on' : ''}`} data-mode={mode} data-beat={snap.active?.beat??'idle'} data-busy={snap.busy || busy ? "1" : "0"} data-step={snap.steps.length} data-season={model.season} data-lane={model.lane} data-crisis={model.crisis ? '1' : '0'}>
      <IconDefs />
      <div className="wallpaper" />
      <div className="lightpool" />
      {/* The night before the year (round R3): the title paper where the month's papers stand, until the manager is chosen. */}
      {game ? <Papers papers={model.papers} incoming={incoming} /> : intro && (mode !== 'manager' || scene === 'into') && <TitlePaper c={intro.c} season={model.season} off={mode === 'manager'} />}
      {game || !intro ? (
        <Mirror mirror={model.mirror} crisis={model.crisis} />
      ) : (
        <Mirror mirror={null} crisis={false}>
          <TitleNotes c={intro.c} found={intro.found} open={intro.scrapbook} />
        </Mirror>
      )}
      <div className="floor" />
      <div className="deskscene">
        <div className="desktop">
          <DeskPlane lane={model.lane} crisis={model.crisis} notebook={game ? model.notebook : null} script={model.script} phone={game ? view.phone : QUIET_PHONE} labels={model.labels} />
        </div>
      </div>
      <div className="deskfront" />
      <Uprights lane={model.lane} crisis={model.crisis} labels={model.labels} balls={model.balls} />
      {/* This month's pile: the cards played this month lie here, flat in the desk's plane (V1b). */}
      <Pile snap={snap} model={model}/>
      <Motion snap={snap} onTails={onTails} />
      {snap.active?.plan&&<MonthMotion key={snap.active.step.id} snap={snap} model={model}/>}
      {game && <Bubbles messages={model.messages} visibleBubbles={view.visibleBubbles} />}
      <div className="dim" />
      {game && model.playing && <Hand cards={model.hand} words={model.handWords} endTurn={model.endTurn} season={model.season} play={on.play} end={on.end} focus={on.focus} toast={showToast} busy={snap.busy} hiddenCards={view.hiddenCards} />}
      {intro && (mode === 'title' || (mode === 'opening' && scene === 'begin')) && <TitleFan cards={intro.fan} words={model.handWords} leaving={mode === 'opening'} />}
      {mode === 'title' && intro && <TitleControls onBegin={intro.begin} onSettings={intro.settings} onCredits={intro.credits} />}
      <div className={`toast${toast.on ? ' on' : ''}`} role="status" data-hook="toast">
        {toast.text}
      </div>
      {game && <StatBar stats={view.stats} season={model.season} onDeck={on.deck} onSettings={on.settings} />}
      {/* The last door (round R3, B5): the room goes dark before the awards night. */}
      <div className="night" aria-hidden="true" />
      {children}
    </div>
  );
}
