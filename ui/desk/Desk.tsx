// The desk (round V1a; docs/design/visual/README.md "The scene", §1–§7): a dressing-room vanity seen from the
// chair, on the one 1280×720 stage. This component stacks the layers; each part of the desk renders from the
// adapter's model (./model.ts) and computes nothing. Whatever is passed as children is drawn over the scene
// (the plain screens until round V2).

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Bubbles, DeskPlane, Uprights } from './DeskItems.tsx';
import { Motion } from './Motion.tsx';
import type { Snapshot } from '../queue.ts';
import { Hand, type HandFocus } from './Hand.tsx';
import { IconDefs } from './Icons.tsx';
import { Mirror } from './Mirror.tsx';
import { Papers } from './Papers.tsx';
import type { DeskModel } from './model.ts';
import { StatBar } from './StatBar.tsx';
import './tokens.css';
import './fonts.css';
import './css/scene.css';
import './css/stats.css';
import './css/mirror.css';
import './css/papers.css';
import './css/desk-items.css';
import './css/hand.css';
import './css/motion.css';

/** "Mark my stories" (README §2): a House rules setting, on by default; round V2 gives it its switch. */
const MARK_MY_STORIES = true;

/** What the player can do on the desk: each is a dispatch or a UI toggle in App, never a rule. */
export interface DeskActions {
  /** Open the deck (its plain screen until round V2). */
  readonly deck: () => void;
  readonly play: (uid: number) => void;
  readonly end: () => void;
  /** What the hover previews describe: a card, the month end, or nothing. */
  readonly focus: (f: HandFocus) => void;
}

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

export function Desk({ model, on, children, snap, hold }: { model: DeskModel; on: DeskActions; children?: ReactNode; snap: Snapshot; hold: (ms: number) => void }) {
  const [toast, showToast] = useToast();
  return (
    <div className={`desk ${model.season} lane-${model.lane}${model.crisis ? ' crisis' : ''}${MARK_MY_STORIES ? ' marks' : ''}`} data-busy={snap.busy ? "1" : "0"} data-step={snap.steps.length} data-season={model.season} data-lane={model.lane} data-crisis={model.crisis ? '1' : '0'}>
      <IconDefs />
      <div className="wallpaper" />
      <div className="lightpool" />
      <Papers papers={model.papers} />
      <Mirror mirror={model.mirror} crisis={model.crisis} />
      <div className="floor" />
      <div className="deskscene">
        <div className="desktop">
          <DeskPlane lane={model.lane} crisis={model.crisis} notebook={model.notebook} script={model.script} phone={model.phone} labels={model.labels} />
        </div>
      </div>
      <div className="deskfront" />
      <Uprights lane={model.lane} crisis={model.crisis} labels={model.labels} balls={model.balls} />
      {/* This month's pile: the cards played this month lie here, flat in the desk's plane (V1b). */}
      <Motion snap={snap} hold={hold} />
      <Bubbles messages={model.messages} />
      <div className="dim" />
      {model.playing && <Hand cards={model.hand} words={model.handWords} endTurn={model.endTurn} season={model.season} play={on.play} end={on.end} focus={on.focus} toast={showToast} />}
      <div className={`toast${toast.on ? ' on' : ''}`} role="status" data-hook="toast">
        {toast.text}
      </div>
      <StatBar stats={model.stats} season={model.season} onDeck={on.deck} />
      {children}
    </div>
  );
}
