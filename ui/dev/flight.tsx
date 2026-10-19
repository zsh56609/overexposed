// A played card's flight from every hand the game deals and to every slot of this month's pile, for check:motion
// (round R7, A1): a month of the game's own, its hand made `n` cards and its pile `s` — the pile's cards really played,
// with motion off — on the game's own desk, with its queue and its motion. The check then plays a card of the hand by a
// real click, with motion full, and measures the flight frame by frame. Driven from the check:
// window.__flight.setup(n, s) builds the month and resolves once it is on the stage. Dev-only: Vite serves it, the
// build never includes it.

import { useMemo, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { createInitialState, establishedLanes, legalActions, readLines, reduce, type Action, type GameState } from '../../core/index.ts';
import { content } from '../content.ts';
import { Desk } from '../desk/Desk.tsx';
import { deskModel } from '../desk/model.ts';
import { motionMode } from '../motion.ts';
import { EventQueue } from '../queue.ts';
import { Stage } from '../Stage.tsx';
import '../style.css';
import '../screens/common.tsx';

/** The card every hand holds: one action, a plain effect, no draw (the starting deck's vocal coaching). */
const CARD = 'vocal_coaching';

/** The first month's play, its draft taken: the state a hand is made in. */
function firstMonth(): GameState {
  let s = createInitialState(7, content, { strict: true });
  for (let guard = 0; s.phase !== 'play' && guard < 10; guard++) {
    const a: Action | undefined = legalActions(s).find((x) => x.type === 'CHOOSE_MANAGER' || x.type === 'DRAFT_PICK');
    if (!a) break;
    s = reduce(s, a);
  }
  return s;
}
const opening = firstMonth();

/** A month whose hand is `n + s` copies of CARD with an action each to spare; the first `s` are played, motion off. */
function month(n: number, s: number): EventQueue {
  const hand = Array.from({ length: n + s }, (_, i) => ({ uid: opening.nextUid + i, cardId: CARD }));
  const state: GameState = { ...opening, hand, slots: s + 2, nextUid: opening.nextUid + n + s, events: [] };
  const queue = new EventQueue({ action: null, state, events: [] }, motionMode);
  for (const card of hand.slice(0, s)) {
    const next = reduce(queue.latest, { type: 'PLAY_CARD', uid: card.uid });
    queue.enqueue({ action: { type: 'PLAY_CARD', uid: card.uid }, state: next, events: next.events });
  }
  return queue;
}

let current = { key: 0, queue: month(5, 0) };
const listeners = new Set<() => void>();

declare global {
  interface Window {
    __flight: { setup(n: number, s: number): Promise<number> };
  }
}
window.__flight = {
  async setup(n, s) {
    const motion = document.documentElement.dataset.motion;
    document.documentElement.dataset.motion = 'off';
    current = { key: current.key + 1, queue: month(n, s) };
    for (const fn of listeners) fn();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    if (motion === undefined) delete document.documentElement.dataset.motion;
    else document.documentElement.dataset.motion = motion;
    return document.querySelectorAll('.desk .hand .card').length;
  },
};

function Month({ queue }: { queue: EventQueue }) {
  const snap = useSyncExternalStore(queue.subscribe, queue.getSnapshot);
  const lines = useMemo(() => ({ ...readLines(snap.steps), lane: establishedLanes(snap.steps).slice(-1)[0] ?? null }), [snap.steps]);
  const model = useMemo(() => deskModel({ state: snap.state, steps: snap.steps, lines }), [snap.state, snap.steps, lines]);
  const on = useMemo(
    () => ({
      deck: () => {},
      settings: () => {},
      play: (uid: number) => {
        if (queue.busy) return;
        queue.settleTails();
        const next = reduce(queue.latest, { type: 'PLAY_CARD', uid });
        queue.enqueue({ action: { type: 'PLAY_CARD', uid }, state: next, events: next.events });
      },
      end: () => {},
      focus: () => {},
    }),
    [queue],
  );
  return <Desk model={model} on={on} snap={snap} onTails={queue.onTails} />;
}

function Flights() {
  const now = useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => current,
  );
  return <Month key={now.key} queue={now.queue} />;
}

const root = document.getElementById('root');
if (root)
  createRoot(root).render(
    <Stage>
      <Flights />
    </Stage>,
  );
