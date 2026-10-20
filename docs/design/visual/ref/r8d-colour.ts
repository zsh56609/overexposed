// Overexposed, round R8d: the halftones that are not newspapers, in muted colour (the author's choices, 2026-10-20).
// For ui/desk/halftone.ts. The papers' photographs, the night's front-page pictures and the headshot stay black and
// white: `halftone`, INK, RED and HEADSHOT do not change.
//
//   - Light on ink (the title's photograph, the season cards' ovals, the awards night's backdrop): each dot's size
//     follows the light, as now; its colour follows the look's ramp (dark and muted in the shadows, a warm cream in
//     the highlights), and the picture's own lights (a lamp, a beam, the flashes, a red carpet) tint the dots near them.
//   - Ink on paper (the doors' photographs): each dot's size follows the dark, as the papers' do; its colour follows
//     the door's ink ramp, a light tint in the small dots to the full ink in the large ones.
//
// What changes in halftone.ts:
//   1. The colour helpers below (Stop, Accent, Look, rgb, rampAt, tinted, dotColour, addDot, fillDots).
//   2. halftoneLight takes a Look in place of its dot and background colours: replace it with the one below.
//   3. halftoneInk is new, beside halftone (which the papers keep, unchanged).
//   4. The looks: TITLE_LOOK, SEASON_LOOKS, BACKDROP_LOOKS, DOOR_INKS; and PLAIN, today's cream on ink, for a scene
//      with no look of its own. TITLE loses its dot and bg.
//   5. renderTitleCanvas uses TITLE_LOOK. renderLightCanvas gains `use` (LightUse) after `cell`, so a LightJob that
//      carries it still spreads into it; `use` picks the look. renderPhotoCanvas's drawing moves into photoDrawing,
//      its pixels unchanged; renderDoorCanvas, doorUrl and cacheDoorBlob are new, the doors' own cache beside the
//      papers' (the same scene and drawing print black in a paper and in colour on a door).
// The dots are filled a colour at a time (fillDots), with no Path2D: a worker draws them as the page does.
// This file is a reference, not compiled: it uses halftone.ts's own G, SceneOptions, SCENES, FRAME, INK, soften,
// drawingCanvas, titleScene, mulberry, PhotoJob and photoKey, and t from ../i18n.ts.

type Stop = readonly [at: number, colour: string];
/** A light in the picture: a disc at (x, y), radius r, all fractions of the frame (r of its height); or, `band`, a
 *  floor from y to the frame's foot, fading in over r above y. `a` is its strength at its middle, 0–1. */
interface Accent {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly colour: string;
  readonly a: number;
  readonly band?: boolean;
}
/** A picture's colours: its ground, the ramp the dots take by their light (0 dark, 1 bright), and its lights. */
export interface Look {
  readonly bg: string;
  readonly ramp: readonly Stop[];
  readonly accents?: readonly Accent[];
}

const rgb = (s: string): [number, number, number] => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];

/** The ramp's colour at `l` (0–1), straight between its stops. */
function rampAt(stops: readonly Stop[], l: number): [number, number, number] {
  const first = stops[0] as Stop;
  if (l <= first[0]) return rgb(first[1]);
  for (let i = 1; i < stops.length; i++) {
    const [b, cb] = stops[i] as Stop;
    if (l <= b) {
      const [a, ca] = stops[i - 1] as Stop;
      const k = (l - a) / (b - a);
      const A = rgb(ca);
      const B = rgb(cb);
      return [A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, A[2] + (B[2] - A[2]) * k];
    }
  }
  return rgb((stops[stops.length - 1] as Stop)[1]);
}

/** A colour moved toward each light near (x, y) by the light's strength there, which falls off as a square. */
function tinted(c: [number, number, number], x: number, y: number, w: number, h: number, accents: readonly Accent[] | undefined): [number, number, number] {
  if (!accents) return c;
  let [r, g, b] = c;
  for (const a of accents) {
    const d = a.band ? (y < a.y * h ? (a.y * h - y) / (a.r * h) : 0) : Math.hypot(x - a.x * w, y - a.y * h) / (a.r * h);
    if (d >= 1) continue;
    const k = a.a * (1 - d) * (1 - d);
    const [ar, ag, ab] = rgb(a.colour);
    r += (ar - r) * k;
    g += (ag - g) * k;
    b += (ab - b) * k;
  }
  return [r, g, b];
}

/** A dot's colour as CSS, each channel rounded to a step of 6: the dots fall into a few hundred colours. */
const step6 = (v: number): number => Math.min(255, Math.round(v / 6) * 6);
const dotColour = ([r, g, b]: [number, number, number]): string => `rgb(${step6(r)},${step6(g)},${step6(b)})`;

/** The dots by colour, three numbers a dot (x, y, r), in the order each colour first came. */
type Dots = Map<string, number[]>;
const addDot = (dots: Dots, colour: string, x: number, y: number, r: number): void => {
  const d = dots.get(colour);
  if (d) d.push(x, y, r);
  else dots.set(colour, [x, y, r]);
};
/** Fills the dots a colour at a time, each colour one path. */
function fillDots(c: G, dots: Dots): void {
  for (const [colour, d] of dots) {
    c.fillStyle = colour;
    c.beginPath();
    for (let i = 0; i < d.length; i += 3) {
      const x = d[i] as number;
      const y = d[i + 1] as number;
      const r = d[i + 2] as number;
      c.moveTo(x + r, y);
      c.arc(x, y, r, 0, 6.2832);
    }
    c.fill();
  }
}

/**
 * Light on ink (round R3, amended; the reference's `halftoneLight`; in colour since round R8d): the drawing screened
 * the other way round, bright areas printing as large dots on the look's ground, so the picture reads as a positive
 * on a dark page; each dot coloured by the look's ramp at its light and tinted by the look's lights.
 */
function halftoneLight(draw: (g: G, w: number, h: number) => void, w: number, h: number, o: { cell: number; look: Look }, offscreen: boolean): HTMLCanvasElement | OffscreenCanvas {
  const src = drawingCanvas(w, h, offscreen);
  const g = src.getContext('2d') as G;
  g.fillStyle = '#000';
  g.fillRect(0, 0, w, h);
  draw(g, w, h);
  const lum = soften(g.getImageData(0, 0, w, h).data, w, h);
  const L = (x: number, y: number): number => lum[Math.max(0, Math.min(h - 1, y | 0)) * w + Math.max(0, Math.min(w - 1, x | 0))] as number;
  const out = drawingCanvas(w, h, offscreen);
  const c = out.getContext('2d') as G;
  c.fillStyle = o.look.bg;
  c.fillRect(0, 0, w, h);
  const dots: Dots = new Map();
  const an = Math.PI / 4;
  const ca = Math.cos(an);
  const sa = Math.sin(an);
  const D = Math.hypot(w, h);
  const least = (o.cell / 7) * 0.4;
  for (let v = -D; v < D; v += o.cell)
    for (let u = -D; u < D; u += o.cell) {
      const x = u * ca - v * sa + w / 2;
      const y = u * sa + v * ca + h / 2;
      if (x < -2 || y < -2 || x > w + 2 || y > h + 2) continue;
      const l = L(x, y);
      const r = Math.sqrt(Math.pow(l, 1.1)) * o.cell * 0.6;
      if (r > least) addDot(dots, dotColour(tinted(rampAt(o.look.ramp, l), x, y, w, h, o.look.accents)), x, y, r);
    }
  fillDots(c, dots);
  return out;
}

/**
 * Ink on paper, in colour (round R8d; the doors): screened as `halftone` screens the papers, each dot's area following
 * the dark; its colour the ink ramp at that dark — a light tint in the small dots, the full ink in the large.
 */
function halftoneInk(draw: (g: G, w: number, h: number) => void, w: number, h: number, o: { paper: string; ramp: readonly Stop[]; cell?: number }, offscreen: boolean): HTMLCanvasElement | OffscreenCanvas {
  const cell = o.cell ?? 5.4;
  const src = drawingCanvas(w, h, offscreen);
  const g = src.getContext('2d') as G;
  g.fillStyle = '#fff';
  g.fillRect(0, 0, w, h);
  draw(g, w, h);
  const lum = soften(g.getImageData(0, 0, w, h).data, w, h);
  const L = (x: number, y: number): number => lum[Math.max(0, Math.min(h - 1, y | 0)) * w + Math.max(0, Math.min(w - 1, x | 0))] as number;
  const out = drawingCanvas(w, h, offscreen);
  const c = out.getContext('2d') as G;
  c.fillStyle = o.paper;
  c.fillRect(0, 0, w, h);
  const dots: Dots = new Map();
  const an = Math.PI / 4;
  const ca = Math.cos(an);
  const sa = Math.sin(an);
  const D = Math.hypot(w, h);
  const q = cell * 0.3;
  for (let v = -D; v < D; v += cell)
    for (let u = -D; u < D; u += cell) {
      const x = u * ca - v * sa + w / 2;
      const y = u * sa + v * ca + h / 2;
      if (x < -2 || y < -2 || x > w + 2 || y > h + 2) continue;
      let l = (L(x, y) * 2 + L(x - q, y) + L(x + q, y) + L(x, y - q) + L(x, y + q)) / 6;
      l = Math.pow(l, 1.15);
      const r = Math.sqrt(1 - l) * cell * 0.64;
      if (r > 0.35) addDot(dots, dotColour(rampAt(o.ramp, 1 - l)), x, y, r);
    }
  fillDots(c, dots);
  return out;
}

// ---- The looks (the author's choices, 2026-10-20; docs/design/visual/ref/r8d-colour.png) ------------------------

/** Today's cream on ink: a scene with no look of its own prints as before. */
const PLAIN: Look = {
  bg: '#15120E',
  ramp: [
    [0, '#CFC6B2'],
    [1, '#CFC6B2'],
  ],
};

/** The title's photograph: oxblood and amber, the photographers' four flashes cool. */
export const TITLE_LOOK: Look = {
  bg: '#150e0d',
  ramp: [
    [0, '#3a1c1c'],
    [0.35, '#6b2d2a'],
    [0.7, '#b9773f'],
    [1, '#f2dcae'],
  ],
  accents: [
    { x: 0.07, y: 0.44, r: 0.3, colour: '#d8e2e6', a: 0.75 },
    { x: 0.93, y: 0.38, r: 0.28, colour: '#d8e2e6', a: 0.75 },
    { x: 0.81, y: 0.76, r: 0.18, colour: '#d8e2e6', a: 0.7 },
    { x: 0.19, y: 0.79, r: 0.18, colour: '#d8e2e6', a: 0.7 },
  ],
};

/** The season cards' ovals, by scene: a hue a season, kept dark — spring's slate and its lamp, summer's violet and
 *  rose under the beams, autumn's amber, winter's navy over the red carpet. */
export const SEASON_LOOKS: Partial<Record<SceneId, Look>> = {
  room: {
    bg: '#0e1216',
    ramp: [
      [0, '#19262e'],
      [0.35, '#2b3c46'],
      [0.7, '#6c8488'],
      [1, '#b5b9af'],
    ],
    accents: [{ x: 0.2, y: 0.44, r: 0.42, colour: '#e2ad6c', a: 0.85 }],
  },
  arena: {
    bg: '#120d17',
    ramp: [
      [0, '#241734'],
      [0.35, '#40274c'],
      [0.7, '#935469'],
      [1, '#c1aa8e'],
    ],
    accents: [{ x: 0.5, y: 0.38, r: 0.55, colour: '#f0c38a', a: 0.45 }],
  },
  street: {
    bg: '#130f0b',
    ramp: [
      [0, '#2e2117'],
      [0.35, '#5b3c24'],
      [0.7, '#a17846'],
      [1, '#c2b08e'],
    ],
  },
  carpet: {
    bg: '#0d0f18',
    ramp: [
      [0, '#181e31'],
      [0.35, '#2a344c'],
      [0.7, '#787f95'],
      [1, '#bebdbd'],
    ],
    accents: [{ x: 0.5, y: 0.82, r: 0.12, colour: '#a8443f', a: 0.95, band: true }],
  },
};

/** The awards night's backdrop, by scene: warm whatever the scene, as the night's curtains and trophies are. */
export const BACKDROP_LOOKS: Partial<Record<SceneId, Look>> = {
  arena: {
    bg: '#130d0e',
    ramp: [
      [0, '#3a1a20'],
      [0.35, '#6e2a33'],
      [0.7, '#c27a4a'],
      [1, '#f3ddb0'],
    ],
    accents: [{ x: 0.5, y: 0.38, r: 0.55, colour: '#f0c27a', a: 0.55 }],
  },
  studio: {
    bg: '#120e0c',
    ramp: [
      [0, '#30231a'],
      [0.35, '#57402b'],
      [0.7, '#a88a5e'],
      [1, '#ecdcb6'],
    ],
    accents: [{ x: 0.48, y: 0.32, r: 0.5, colour: '#d9c9a0', a: 0.5 }],
  },
  carpet: {
    bg: '#130d0d',
    ramp: [
      [0, '#33201c'],
      [0.35, '#5e3a2e'],
      [0.7, '#ad8c6c'],
      [1, '#efe2c8'],
    ],
    accents: [{ x: 0.5, y: 0.82, r: 0.12, colour: '#9b3a34', a: 0.9, band: true }],
  },
  street: {
    bg: '#120e0b',
    ramp: [
      [0, '#33251a'],
      [0.35, '#5c4027'],
      [0.7, '#b08752'],
      [1, '#eedcb2'],
    ],
  },
};

/** The doors' photographs, by scene: an ink a scene on the invitation's paper (INK.paper, the photograph's own box) —
 *  a light tint in the small dots, the ink in the large. Every door's scene is here; any other prints in the papers' ink. */
export const DOOR_INKS: Partial<Record<SceneId, readonly Stop[]>> = {
  singer: [
    [0, '#e9c9b8'],
    [0.45, '#a5584e'],
    [1, '#4a1c22'],
  ],
  crowd: [
    [0, '#cfd0e2'],
    [0.45, '#5f6390'],
    [1, '#232a50'],
  ],
  arena: [
    [0, '#e2c8d8'],
    [0.45, '#8a5585'],
    [1, '#3a1f45'],
  ],
  studio: [
    [0, '#c9ddd6'],
    [0.45, '#4f8a84'],
    [1, '#173d3e'],
  ],
  podium: [
    [0, '#cbd3e2'],
    [0.45, '#55698f'],
    [1, '#1d2a48'],
  ],
  trophy: [
    [0, '#e8d6ae'],
    [0.45, '#a7803c'],
    [1, '#4a3416'],
  ],
};
const PAPERS_INK: readonly Stop[] = [
  [0, INK.ink],
  [1, INK.ink],
];

// ---- The entry points --------------------------------------------------------------------------------------------

/** The title photograph's frame: the reference's, whose 7 px dot cell scales with the pixels it is drawn at. */
const TITLE = { w: 1280, h: 720, cell: 7 } as const;

export function renderTitleCanvas(w: number, h: number, offscreen: false): HTMLCanvasElement;
export function renderTitleCanvas(w: number, h: number, offscreen: true): OffscreenCanvas;
export function renderTitleCanvas(w: number, h: number, offscreen: boolean): HTMLCanvasElement | OffscreenCanvas {
  const k = w / TITLE.w;
  return halftoneLight(
    (g) => {
      g.scale(k, h / TITLE.h);
      titleScene(g, TITLE.w, TITLE.h);
    },
    w,
    h,
    { cell: TITLE.cell * k, look: TITLE_LOOK },
    offscreen,
  );
}

/** What a scene light on ink is for: a season card's oval or the awards night's backdrop. It picks the look. */
export type LightUse = 'season' | 'backdrop';

/**
 * A scene light on ink (round R8a; in colour since R8d): a season card's oval (`use` 'season') or the awards night's
 * backdrop ('backdrop'). The scene is drawn on its own 480×172 frame scaled to `w`×`h` pixels (keep that 2.8:1), then
 * printed light on ink in its look, with a dot cell of `cell` pixels.
 */
export function renderLightCanvas(scene: SceneId, season: SeasonId, w: number, h: number, cell: number, use: LightUse, directorLabel: string, offscreen: false): HTMLCanvasElement;
export function renderLightCanvas(scene: SceneId, season: SeasonId, w: number, h: number, cell: number, use: LightUse, directorLabel: string, offscreen: true): OffscreenCanvas;
export function renderLightCanvas(scene: SceneId, season: SeasonId, w: number, h: number, cell: number, use: LightUse, directorLabel: string, offscreen: boolean): HTMLCanvasElement | OffscreenCanvas {
  const opts: SceneOptions = { season, off: 0, flip: false, directorLabel };
  const look = (use === 'backdrop' ? BACKDROP_LOOKS : SEASON_LOOKS)[scene] ?? PLAIN;
  return halftoneLight(
    (g) => {
      g.scale(w / FRAME.w, h / FRAME.h);
      SCENES[scene](g, FRAME.w, FRAME.h, opts);
    },
    w,
    h,
    { cell, look },
    offscreen,
  );
}

/** A photograph's drawing (renderPhotoCanvas's, moved out to be shared): `variant` 0 the scene's own, then mirrored,
 *  then reframed closer about a point the seed picks, each with its patterns shifted. */
function photoDrawing(scene: SceneId | 'headshot', season: SeasonId, variant: number, directorLabel: string): (g: G, W: number, H: number) => void {
  const r = mulberry(variant * 7919 + scene.length * 131 + 17);
  const flip = variant % 3 === 1;
  const zoom = variant % 3 === 2 ? 1.14 + r() * 0.08 : 1;
  const opts: SceneOptions = { season, off: variant * 5, flip, directorLabel };
  return (g, W, H) => {
    if (flip) {
      g.translate(W, 0);
      g.scale(-1, 1);
    }
    if (zoom !== 1) {
      const fx = W * (0.4 + r() * 0.2);
      const fy = H * (0.35 + r() * 0.2);
      g.translate(fx, fy);
      g.scale(zoom, zoom);
      g.translate(-fx, -fy);
    }
    SCENES[scene](g, W, H, opts);
  };
}

// renderPhotoCanvas keeps its overloads and its pixels:
//   const w = scene === 'headshot' ? 372 : 480; const h = scene === 'headshot' ? 504 : 172;
//   return halftone(photoDrawing(scene, season, variant, directorLabel), w, h, scene === 'paparazzi' ? RED : …, offscreen);

/** A door's photograph (round R8d): the papers' drawing of the scene, in the door's ink on the paper of its box. */
export function renderDoorCanvas(scene: SceneId, season: SeasonId, variant: number, directorLabel: string, offscreen: false): HTMLCanvasElement;
export function renderDoorCanvas(scene: SceneId, season: SeasonId, variant: number, directorLabel: string, offscreen: true): OffscreenCanvas;
export function renderDoorCanvas(scene: SceneId, season: SeasonId, variant: number, directorLabel: string, offscreen: boolean): HTMLCanvasElement | OffscreenCanvas {
  return halftoneInk(photoDrawing(scene, season, variant, directorLabel), FRAME.w, FRAME.h, { paper: INK.paper, ramp: DOOR_INKS[scene] ?? PAPERS_INK }, offscreen);
}

/** The doors' photographs, kept for the page's life beside the papers' (keyed as theirs, by photoKey). */
const doors = new Map<string, string>();
/** The worker's drawing of a door, kept unless one is shown already. */
export function cacheDoorBlob(job: PhotoJob, blob: Blob): void {
  const key = photoKey(job);
  if (!doors.has(key)) doors.set(key, URL.createObjectURL(blob));
}
/** A door's photograph: drawn ahead by the warm-up; drawn here, at once, only if it has not delivered. */
export function doorUrl(scene: SceneId, season: SeasonId, variant: number): string {
  const key = photoKey([scene, season, variant]);
  const hit = doors.get(key);
  if (hit) return hit;
  const url = renderDoorCanvas(scene, season, variant, t('desk.photo.director'), false).toDataURL();
  doors.set(key, url);
  return url;
}
