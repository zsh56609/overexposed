// A played card's flight, as geometry (round R7, A1). Its face is lifted out of the fan, held, and carried to this
// month's pile in front of the hand (.motion-flight, z-index 85); from the first moment it overlaps none of the cards
// left in the hand — their transformed outlines where they are at that moment, re-fanning as it flies — it goes under
// the hand and the season's dim (z-index 31, above the bubbles' 30) and lands there, where the hand covers it as it
// will once it lies in the pile. A path that would still overlap the fan as it comes down to its slot is raised in
// that stretch, so the card clears the fan first and comes down behind it.
//
// Pure numbers: Motion.tsx animates what planFlight returns; check:motion measures the frames in the browser. The
// figures are the stage's own: the hand's fan (Hand.tsx, hand.css) and the desk's perspective (scene.css).

import { fan } from './fan.ts';

export type Point = readonly [number, number];
export type Quad = readonly [Point, Point, Point, Point];

/** A hand card's place in the fan: its left edge, tilt (deg) and lift (px), as Hand.tsx sets them. */
export interface Pose {
  readonly left: number;
  readonly rot: number;
  readonly lift: number;
}

/** The flight's timings (ms; ui/queue.ts CARD_TIMING): lifted by 200, held to 290, near the slot at 750, down by 930. */
export const FLIGHT = { lift: 200, hold: 290, approach: 750, settle: 930 } as const;

/** The card (hand.css): 186×252 at the fan's top edge, tilted about a point 120% down its height. */
const CARD_W = 186, CARD_H = 252, CARD_TOP = 490, ORIGIN_Y = CARD_H * 1.2;
/** The desk's perspective (scene.css): 1100px, vanishing point (640,140); the pile's plane tilts about y = 556. */
const PERSPECTIVE = 1100, VX = 640, VY = 140, HINGE = 556;
/** A hovered hand card (hand.css): 13px up, its tilt to 60%, scaled 1.012. */
const HOVER = { up: 13, tilt: 0.6, scale: 1.012 };
/** How far clear the face must be of every card to go under (px), and for how long after (ms): a frame or two. */
const CLEAR = { gap: 4, hold: 60 };
/** Where a raised stretch peaks (ms), and how high it may go (px, in the pile's plane). */
const RAISE = { peak: 520, step: 4, max: 400 };

// ------------------------------------------------------------------------------------------------- easing

/** CSS cubic-bezier(x1, y1, x2, y2) as a function of progress. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (x: number) => number {
  const at = (a: number, b: number, t: number) => 3 * a * (1 - t) ** 2 * t + 3 * b * (1 - t) * t * t + t ** 3;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0, hi = 1;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (at(x1, x2, mid) < x) lo = mid;
      else hi = mid;
    }
    return at(y1, y2, (lo + hi) / 2);
  };
}

export const EASE = {
  lift: [0.2, 0.7, 0.3, 1],
  carry: [0.5, 0.05, 0.25, 1],
  settle: [0.3, 0, 0.3, 1],
  rise: [0.3, 0.6, 0.4, 1],
  fall: [0.5, 0, 0.6, 1],
  linear: [0, 0, 1, 1],
} as const satisfies Record<string, readonly [number, number, number, number]>;
const EASE_FN = Object.fromEntries(Object.entries(EASE).map(([k, [x1, y1, x2, y2]]) => [k, cubicBezier(x1, y1, x2, y2)])) as Record<keyof typeof EASE, (x: number) => number>;
export const easing = (name: keyof typeof EASE): string => (name === 'linear' ? 'linear' : `cubic-bezier(${EASE[name].join(',')})`);
/** CSS ease-out (a hand card's left, closing the gap) and the fan's own transform curve (hand.css). */
const EASE_OUT = cubicBezier(0, 0, 0.58, 1);
const FAN_CURVE = cubicBezier(0.22, 0.61, 0.36, 1);

// ------------------------------------------------------------------------------------------------- the flight's keys

/** One key of a track: its moment (ms), its values, and the easing to the next key. */
export interface Key<T> {
  readonly at: number;
  readonly value: T;
  readonly ease?: keyof typeof EASE;
}
/** The face in the pile's plane: its centre, tilt (deg) and scale. */
export interface FaceValue {
  readonly x: number;
  readonly y: number;
  readonly rot: number;
  readonly scale: number;
}

/** A track's value at a moment, keys interpolated with each segment's easing. */
function sample<T>(keys: readonly Key<T>[], t: number, mix: (a: T, b: T, p: number) => T): T {
  if (t <= keys[0]!.at) return keys[0]!.value;
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1]!, b = keys[i]!;
    if (t <= b.at) return mix(a.value, b.value, EASE_FN[a.ease ?? 'linear']((t - a.at) / Math.max(1e-9, b.at - a.at)));
  }
  return keys[keys.length - 1]!.value;
}
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const mixFace = (a: FaceValue, b: FaceValue, p: number): FaceValue => ({ x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), rot: lerp(a.rot, b.rot, p), scale: lerp(a.scale, b.scale, p) });

/** The flight's three tracks: the face in its plane, the plane's tilt back onto the desk, and a raised stretch. */
export interface FlightPlan {
  readonly face: readonly Key<FaceValue>[];
  readonly tilt: readonly Key<number>[];
  /** Upward offset in the pile's plane (px; negative is up): zero unless the path had to clear the fan. */
  readonly raise: readonly Key<number>[];
  /** When the face goes under the hand and the dim (ms from the lift). */
  readonly under: number;
  /** How far the raised stretch peaks (px), 0 when the path clears the fan as it is. */
  readonly raised: number;
}

/** The plain flight (round R1): lift and straighten, hold, carry to the slot tilting back, settle. */
function baseTracks(from: { readonly x: number; readonly y: number; readonly rot: number }, slot: { readonly x: number; readonly y: number; readonly rot: number }): Pick<FlightPlan, 'face' | 'tilt'> {
  const held: FaceValue = { x: from.x, y: from.y - 50, rot: 0, scale: 1.04 };
  return {
    face: [
      { at: 0, value: { x: from.x, y: from.y, rot: from.rot, scale: 1 }, ease: 'lift' },
      { at: FLIGHT.lift, value: held },
      { at: FLIGHT.hold, value: held, ease: 'carry' },
      { at: FLIGHT.approach, value: { x: slot.x, y: slot.y - 4, rot: slot.rot, scale: 0.57 }, ease: 'settle' },
      { at: FLIGHT.settle, value: { x: slot.x, y: slot.y, rot: slot.rot, scale: 0.55 } },
    ],
    tilt: [
      { at: 0, value: 0 },
      { at: FLIGHT.hold, value: 0, ease: 'carry' },
      { at: FLIGHT.approach, value: 58, ease: 'settle' },
      { at: FLIGHT.settle, value: 64 },
    ],
  };
}

/** A raised stretch peaking at `height` px above the plain path, from the hold to the approach. */
const raiseTrack = (height: number): Key<number>[] =>
  height === 0
    ? [{ at: 0, value: 0 }, { at: FLIGHT.settle, value: 0 }]
    : [
        { at: 0, value: 0 },
        { at: FLIGHT.hold, value: 0, ease: 'rise' },
        { at: RAISE.peak, value: -height, ease: 'fall' },
        { at: FLIGHT.approach, value: 0 },
        { at: FLIGHT.settle, value: 0 },
      ];

// ------------------------------------------------------------------------------------------------- outlines

/** The face's outline on the stage at a moment: its plane tilted back about the desk's hinge, in perspective. */
export function faceQuad(plan: Pick<FlightPlan, 'face' | 'tilt' | 'raise'>, t: number): Quad {
  const f = sample(plan.face, t, mixFace);
  const tilt = (sample(plan.tilt, t, lerp) * Math.PI) / 180;
  const dy = sample(plan.raise, t, lerp);
  const a = (f.rot * Math.PI) / 180;
  const corner = (u: number, v: number): Point => {
    const px = f.x + f.scale * (u * Math.cos(a) - v * Math.sin(a));
    const py = f.y + dy + f.scale * (u * Math.sin(a) + v * Math.cos(a));
    const y = HINGE + (py - HINGE) * Math.cos(tilt);
    const z = (py - HINGE) * Math.sin(tilt);
    const k = PERSPECTIVE / (PERSPECTIVE - z);
    return [VX + (px - VX) * k, VY + (y - VY) * k];
  };
  const w = CARD_W / 2, h = CARD_H / 2;
  return [corner(-w, -h), corner(w, -h), corner(w, h), corner(-w, h)];
}

/** A hand card's outline (hand.css): its box at the fan's top edge, lifted and tilted about its origin. */
export function cardQuad(p: Pose, hover = false): Quad {
  const ox = p.left + CARD_W / 2, oy = CARD_TOP + ORIGIN_Y;
  const rot = ((hover ? p.rot * HOVER.tilt : p.rot) * Math.PI) / 180;
  const k = hover ? HOVER.scale : 1;
  const up = p.lift + (hover ? HOVER.up : 0);
  const corner = (x: number, y: number): Point => {
    const u = (x - ox) * k, v = (y - oy) * k;
    return [ox + u * Math.cos(rot) - v * Math.sin(rot), oy - up + u * Math.sin(rot) + v * Math.cos(rot)];
  };
  return [corner(p.left, CARD_TOP), corner(p.left + CARD_W, CARD_TOP), corner(p.left + CARD_W, CARD_TOP + CARD_H), corner(p.left, CARD_TOP + CARD_H)];
}

/** A card closing the gap (hand.css): its left over 0.3 s, ease-out; its lift and tilt over 0.42 s on the fan's curve. */
export function closing(from: Pose, to: Pose, t: number): Pose {
  const l = EASE_OUT(Math.min(1, t / 300)), k = FAN_CURVE(Math.min(1, t / 420));
  return { left: lerp(from.left, to.left, l), rot: lerp(from.rot, to.rot, k), lift: lerp(from.lift, to.lift, k) };
}

/** Whether two convex outlines stand apart by at least `gap` px along some axis (separating axes). */
export function apart(a: Quad, b: Quad, gap = 0): boolean {
  for (const poly of [a, b])
    for (let i = 0; i < 4; i++) {
      const [x1, y1] = poly[i]!, [x2, y2] = poly[(i + 1) % 4]!;
      const len = Math.hypot(x2 - x1, y2 - y1) || 1;
      const nx = (y2 - y1) / len, ny = (x1 - x2) / len;
      let amin = Infinity, amax = -Infinity, bmin = Infinity, bmax = -Infinity;
      for (const [x, y] of a) {
        const d = x * nx + y * ny;
        amin = Math.min(amin, d);
        amax = Math.max(amax, d);
      }
      for (const [x, y] of b) {
        const d = x * nx + y * ny;
        bmin = Math.min(bmin, d);
        bmax = Math.max(bmax, d);
      }
      if (amax + gap <= bmin || bmax + gap <= amin) return true;
    }
  return false;
}

// ------------------------------------------------------------------------------------------------- the plan

/**
 * The flight of a card from its place in a hand of `n` (its index `played`) to its slot in the pile. The cards left in
 * the hand close the gap as it flies, from their places in fan(n) to fan(n − 1); a hovered one stands a little higher.
 * The face goes under at the first moment after the hold it is clear of all of them, and stays clear a frame or two;
 * where the plain path never is, its middle stretch is raised, by as little as clears the fan.
 */
export function planFlight(n: number, played: number, slot: { readonly x: number; readonly y: number; readonly rot: number }): FlightPlan {
  const before = fan(n);
  const after = fan(n - 1);
  const own = before[played]!;
  const a = (own.rot * Math.PI) / 180;
  const from = { x: own.left + CARD_W / 2 + (ORIGIN_Y - CARD_H / 2) * Math.sin(a), y: CARD_TOP - own.lift + ORIGIN_Y - (ORIGIN_Y - CARD_H / 2) * Math.cos(a), rot: own.rot };
  const base = baseTracks(from, slot);
  // The cards left in the hand at each moment sampled: closing the gap, and each as it would stand hovered.
  const others = before.filter((_, i) => i !== played).map((p, i) => ({ from: p, to: after[i]! }));
  const hovered = others.map(({ to }) => cardQuad(to, true));
  const obstacles = new Map<number, Quad[]>();
  const around = (t: number): Quad[] => {
    let list = obstacles.get(t);
    if (!list) obstacles.set(t, (list = [...others.map(({ from: p, to: q }) => cardQuad(closing(p, q, t))), ...hovered]));
    return list;
  };
  const clearAt = (plan: Pick<FlightPlan, 'face' | 'tilt' | 'raise'>, t: number): boolean => {
    const face = faceQuad(plan, t);
    return around(t).every((q) => apart(face, q, CLEAR.gap));
  };
  /** The first moment after the hold the face is clear, and stays clear a frame or two; null if it never is. */
  const firstClear = (plan: Pick<FlightPlan, 'face' | 'tilt' | 'raise'>): number | null => {
    for (let t = FLIGHT.hold; t <= FLIGHT.settle - CLEAR.hold; t += 4) {
      let clear = clearAt(plan, t);
      for (let u = t + 10; u <= t + CLEAR.hold && clear; u += 10) clear = clearAt(plan, u);
      if (clear) return t;
    }
    return null;
  };
  const tried = (height: number) => {
    const plan = { ...base, raise: raiseTrack(height) };
    return { plan, under: firstClear(plan) };
  };
  const plain = tried(0);
  if (plain.under !== null) return { ...plain.plan, under: plain.under, raised: 0 };
  // The lowest raise that clears the fan, to RAISE.step: found by halving between one that fails and one that clears.
  let low = 0;
  let high = tried(RAISE.max);
  if (high.under === null) return { ...plain.plan, under: FLIGHT.settle, raised: 0 }; // never clear: under as it lands
  let highAt = RAISE.max;
  while (highAt - low > RAISE.step) {
    const mid = Math.round((low + highAt) / 2 / RAISE.step) * RAISE.step;
    if (mid <= low || mid >= highAt) break;
    const t = tried(mid);
    if (t.under !== null) [high, highAt] = [t, mid];
    else low = mid;
  }
  return { ...high.plan, under: high.under as number, raised: highAt };
}
