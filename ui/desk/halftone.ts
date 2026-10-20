// The newspaper photographs (round V1a; README §2 and "Porting"): no image files and no generated images — each
// scene is drawn in greyscale on a canvas, softened, sampled on a 45° grid and printed as dots whose area follows
// the darkness. The drawings are the mockup's (v18) `SCENES`, four added and the street redrawn in round R8a
// (docs/design/visual/ref/r8a-halftone.ts), the room added in round R8d (r8d-room.ts); a scene's variants come from
// the same drawing with a different seed — mirrored, reframed, and its crowds, rain and lights shifted. Each picture
// is drawn ahead of time in a worker when supported, with the original lazy canvas path as fallback. Since R8a any
// scene can also be printed light on ink, as the title's photograph is: the season cards' ovals (renderLightCanvas).
//
// In colour since round R8d (the author's choices, docs/design/visual/ref/r8d-colour.ts and r8d-colour.png): every
// halftone that is not a newspaper, muted and dark enough to suit the dots. Light on ink, each dot's size by its light
// and its colour the look's ramp at that light, tinted near the picture's own lights: the title's photograph
// (TITLE_LOOK), the season cards' ovals (SEASON_LOOKS) and the awards night's backdrop (BACKDROP_LOOKS). Ink on paper,
// each dot's size by the dark, in the door's ink: the doors' photographs (DOOR_INKS). The papers' photographs, the
// night's front-page pictures and the headshot stay black and white — `halftone`, INK, RED and HEADSHOT unchanged.

import type { SceneId, SeasonId } from '../../core/index.ts';
import { t } from '../i18n.ts';

type G = CanvasRenderingContext2D;
type Drawing = (g: G, w: number, h: number, o: SceneOptions) => void;
interface SceneOptions {
  readonly directorLabel: string;
  readonly season: SeasonId;
  /** Shifts the drawing's own patterns: which crowd heads, raindrops and lights fall where. */
  readonly off: number;
  /** Drawn mirrored: words in the picture are turned back to read. */
  readonly flip: boolean;
}

/** A seeded generator (mulberry32), as the mockup's. */
function mulberry(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let q = Math.imul(a ^ (a >>> 15), 1 | a);
    q = (q + Math.imul(q ^ (q >>> 7), 61 | q)) ^ q;
    return ((q ^ (q >>> 14)) >>> 0) / 4294967296;
  };
}

const lg = (g: G, x0: number, y0: number, x1: number, y1: number, s: [number, string][]) => {
  const r = g.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of s) r.addColorStop(o, c);
  return r;
};
const rg = (g: G, x: number, y: number, r0: number, r1: number, s: [number, string][]) => {
  const r = g.createRadialGradient(x, y, r0, x, y, r1);
  for (const [o, c] of s) r.addColorStop(o, c);
  return r;
};
function glow(g: G, x: number, y: number, r: number, a: number) {
  g.fillStyle = rg(g, x, y, 0, r, [
    [0, `rgba(255,255,255,${a})`],
    [1, 'rgba(255,255,255,0)'],
  ]);
  g.fillRect(x - r, y - r, 2 * r, 2 * r);
}

interface Figure {
  fill?: string;
  dress?: 'legs' | 'gown' | 'coat';
  pose?: 'stand' | 'mic' | 'guitar' | 'hip' | 'block' | 'reach' | 'shoulder' | 'raise' | 'lectern';
  hair?: 'long';
  hat?: boolean;
}
/** A human figure, a silhouette; feet at (x, y), height H. */
function fig(g: G, x: number, y: number, H: number, o: Figure = {}) {
  const f = o.fill ?? '#0c0c0c';
  const dress = o.dress ?? 'legs';
  const pose = o.pose ?? 'stand';
  const k = H / 100;
  const P = (dx: number, dy: number): [number, number] => [x + dx * k, y + dy * k];
  g.fillStyle = f;
  g.strokeStyle = f;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  g.ellipse(x, y - 88 * k, 5.6 * k, 6.8 * k, 0, 0, 6.2832);
  g.fill();
  if (o.hair === 'long') {
    g.beginPath();
    g.moveTo(...P(-5.8, -92));
    g.quadraticCurveTo(...P(-9, -78), ...P(-7.5, -66));
    g.lineTo(...P(7.5, -66));
    g.quadraticCurveTo(...P(9, -78), ...P(5.8, -92));
    g.closePath();
    g.fill();
  }
  if (o.hat) {
    g.beginPath();
    g.ellipse(x, y - 93.5 * k, 9 * k, 2.2 * k, 0, 0, 6.2832);
    g.fill();
    g.fillRect(x - 5 * k, y - 100 * k, 10 * k, 7 * k);
  }
  g.fillRect(x - 2.2 * k, y - 82 * k, 4.4 * k, 5 * k);
  g.beginPath();
  g.moveTo(...P(-11, -77));
  g.quadraticCurveTo(...P(0, -80), ...P(11, -77));
  if (dress === 'coat') {
    g.lineTo(...P(12, -20));
    g.lineTo(...P(-12, -20));
  } else {
    g.lineTo(...P(8, -48));
    g.lineTo(...P(-8, -48));
  }
  g.closePath();
  g.fill();
  if (dress === 'gown') {
    g.beginPath();
    g.moveTo(...P(-8, -50));
    g.lineTo(...P(8, -50));
    g.quadraticCurveTo(...P(12, -20), ...P(20, 0));
    g.lineTo(...P(-20, 0));
    g.quadraticCurveTo(...P(-12, -20), ...P(-8, -50));
    g.fill();
  } else {
    g.beginPath();
    g.moveTo(...P(-8.5, dress === 'coat' ? -22 : -49));
    g.lineTo(...P(-9, 0));
    g.lineTo(...P(-3, 0));
    g.lineTo(...P(-0.6, -40));
    g.lineTo(...P(0.6, -40));
    g.lineTo(...P(3, 0));
    g.lineTo(...P(9, 0));
    g.lineTo(...P(8.5, dress === 'coat' ? -22 : -49));
    g.closePath();
    g.fill();
  }
  g.lineWidth = 4.6 * k;
  const arm = (...pts: [number, number][]) => {
    g.beginPath();
    g.moveTo(...P(...(pts[0] as [number, number])));
    for (const p of pts.slice(1)) g.lineTo(...P(...p));
    g.stroke();
  };
  if (pose === 'mic') {
    arm([9, -74], [14, -62], [6, -83]);
    arm([-9, -74], [-17, -58], [-22, -50]);
  } else if (pose === 'guitar') {
    arm([9, -74], [10, -60], [2, -55]);
    arm([-9, -74], [-14, -62], [-24, -66]);
  } else if (pose === 'hip') {
    arm([9, -74], [18, -60], [9, -50]);
    arm([-9, -74], [-11, -58], [-10, -44]);
  } else if (pose === 'block') {
    arm([9, -74], [18, -72], [24, -86]);
  } else if (pose === 'reach') {
    // An arm held out in front at chest height: a reporter's microphone, a hand offered.
    arm([9, -74], [20, -69], [31, -71]);
    arm([-9, -74], [-11, -58], [-10, -44]);
  } else if (pose === 'shoulder') {
    // A camera on the shoulder: one hand up to it, the other steadying it in front.
    arm([9, -74], [15, -82], [10, -90]);
    arm([-9, -74], [-16, -70], [-24, -82]);
  } else if (pose === 'raise') {
    // One arm thrown up, the microphone held high; the other out to the side.
    arm([9, -74], [14, -92], [17, -110]);
    arm([-9, -74], [-20, -66], [-31, -60]);
  } else if (pose === 'lectern') {
    // Both forearms forward and down, resting on something in front.
    arm([9, -74], [13, -60], [21, -55]);
    arm([-9, -74], [-13, -60], [-21, -55]);
  } else {
    arm([9, -74], [11, -58], [10, -44]);
    arm([-9, -74], [-11, -58], [-10, -44]);
  }
}
/**
 * A seated figure, a silhouette: its seat at (x, y), facing `dir` (1 right, -1 left); H the height it would
 * stand. Upright torso, thighs forward, shins down to the floor, hands on the knee.
 */
function seat(g: G, x: number, y: number, H: number, o: { fill?: string; dir?: 1 | -1; hair?: 'long' } = {}) {
  const f = o.fill ?? '#0c0c0c';
  const d = o.dir ?? 1;
  const k = H / 100;
  const P = (dx: number, dy: number): [number, number] => [x + d * dx * k, y + dy * k];
  g.fillStyle = f;
  g.strokeStyle = f;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  g.ellipse(...P(1, -44), 5.6 * k, 6.8 * k, 0, 0, 6.2832);
  g.fill();
  if (o.hair === 'long') {
    g.beginPath();
    g.moveTo(...P(-4.8, -48));
    g.quadraticCurveTo(...P(-8, -34), ...P(-6.5, -22));
    g.lineTo(...P(3, -22));
    g.lineTo(...P(5, -40));
    g.closePath();
    g.fill();
  }
  g.fillRect(...P(-1, -38), 4.4 * k, 5 * k);
  g.beginPath();
  g.moveTo(...P(-10, -33));
  g.quadraticCurveTo(...P(1, -36), ...P(11, -33));
  g.lineTo(...P(9, 0));
  g.lineTo(...P(-9, 0));
  g.closePath();
  g.fill();
  g.lineWidth = 9 * k;
  g.beginPath();
  g.moveTo(...P(-4, -3));
  g.lineTo(...P(22, -4));
  g.stroke();
  g.lineWidth = 7 * k;
  g.beginPath();
  g.moveTo(...P(22, -4));
  g.lineTo(...P(24, 26));
  g.stroke();
  g.lineWidth = 5 * k;
  g.beginPath();
  g.moveTo(...P(24, 27));
  g.lineTo(...P(31, 27));
  g.stroke();
  g.lineWidth = 4.6 * k;
  g.beginPath();
  g.moveTo(...P(8, -30));
  g.lineTo(...P(13, -14));
  g.lineTo(...P(21, -9));
  g.stroke();
}


/** The mockup's eight scenes, R7b's four, R8d's room (spring's card, docs/design/visual/ref/r8d-room.ts), and the
 *  headshot, with `off` shifting their repeating patterns. */
const SCENES: Record<SceneId | 'headshot', Drawing> = {
  singer(g, w, h, o) {
    g.fillStyle = lg(g, 0, 0, 0, h, [
      [0, '#6a6a6a'],
      [1, '#3a3a3a'],
    ]);
    g.fillRect(0, 0, w, h);
    glow(g, w * 0.47, h * 0.4, h * 0.9, 1);
    glow(g, w * 0.47, h * 0.42, h * 0.45, 1);
    for (const x of [0.18, 0.38, 0.58, 0.78]) glow(g, w * x, 3, 18, 1);
    g.fillStyle = '#8a8a8a';
    g.fillRect(0, h * 0.76, w, h * 0.24);
    fig(g, w * 0.47, h * 0.82, h * 0.74, { pose: 'mic', fill: '#080808' });
    g.strokeStyle = '#080808';
    g.lineWidth = 2.6;
    g.beginPath();
    g.moveTo(w * 0.49, h * 0.82 - h * 0.74 * 0.84);
    g.lineTo(w * 0.515, h * 0.82);
    g.stroke();
    for (let i = 0; i < 22; i++) {
      const j = i + o.off;
      const x = w * (i / 21) + ((j * 37) % 11) - 5;
      const s = h * (0.17 + ((j * 13) % 7) * 0.013);
      const y = h + s * 0.4;
      g.fillStyle = '#050505';
      g.beginPath();
      g.ellipse(x, y - s * 0.55, s * 0.3, s * 0.36, 0, 0, 6.2832);
      g.fill();
      g.fillRect(x - s * 0.55, y - s * 0.28, s * 1.1, s);
    }
    for (const [x, y] of [
      [0.2, 0.73],
      [0.66, 0.71],
      [0.86, 0.75],
    ] as const) {
      g.fillStyle = '#050505';
      g.fillRect(w * x - 2, h * y, 4, h * 0.2);
      g.fillStyle = '#fafafa';
      g.fillRect(w * x - 6, h * y - 10, 12, 16);
    }
  },
  rival(g, w, h) {
    g.fillStyle = lg(g, 0, 0, 0, h, [
      [0, '#5e5e5e'],
      [1, '#383838'],
    ]);
    g.fillRect(0, 0, w, h);
    glow(g, w * 0.55, h * 0.42, h * 0.95, 1);
    glow(g, w * 0.55, h * 0.4, h * 0.4, 1);
    g.fillStyle = '#161616';
    for (const x of [0.04, 0.84]) {
      g.fillRect(w * x, h * 0.3, w * 0.12, h * 0.5);
      g.fillStyle = '#3a3a3a';
      for (let yy = h * 0.34; yy < h * 0.78; yy += 4) g.fillRect(w * x + 3, yy, w * 0.12 - 6, 2);
      g.fillStyle = '#161616';
    }
    g.fillStyle = '#8a8a8a';
    g.fillRect(0, h * 0.8, w, h * 0.2);
    const x = w * 0.55;
    const y = h * 0.86;
    const H = h * 0.78;
    fig(g, x, y, H, { pose: 'guitar', hair: 'long', fill: '#080808' });
    const k = H / 100;
    g.save();
    g.translate(x - 2 * k, y - 52 * k);
    g.rotate(-0.42);
    g.fillStyle = '#f4f4f4';
    g.beginPath();
    g.ellipse(6 * k, 0, 10 * k, 8 * k, 0, 0, 6.2832);
    g.ellipse(-4 * k, 0, 8 * k, 6.4 * k, 0, 0, 6.2832);
    g.fill();
    g.fillStyle = '#080808';
    g.beginPath();
    g.arc(3 * k, 0, 2.6 * k, 0, 6.2832);
    g.fill();
    g.fillStyle = '#d8d8d8';
    g.fillRect(-38 * k, -1.4 * k, 30 * k, 2.8 * k);
    g.fillStyle = '#080808';
    g.fillRect(-42 * k, -2.2 * k, 5 * k, 4.4 * k);
    g.restore();
  },
  crowd(g, w, h, o) {
    g.fillStyle = lg(g, 0, 0, 0, h, [
      [0, '#2a2a2a'],
      [0.55, '#555'],
      [1, '#141414'],
    ]);
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#f0f0f0';
    g.fillRect(w * 0.36, h * 0.3, w * 0.28, h * 0.13);
    g.fillStyle = '#0a0a0a';
    g.fillRect(w * 0.33, h * 0.12, w * 0.34, h * 0.035);
    g.fillRect(w * 0.33, h * 0.12, 4, h * 0.22);
    g.fillRect(w * 0.67 - 4, h * 0.12, 4, h * 0.22);
    for (let i = 0; i < 9; i++) glow(g, w * (0.35 + i * 0.0375), h * 0.14, 10, 1);
    for (const x of [0.3, 0.42, 0.58, 0.7]) {
      g.fillStyle = 'rgba(255,255,255,.28)';
      g.beginPath();
      g.moveTo(w * x, h * 0.15);
      g.lineTo(w * x + 4, h * 0.15);
      g.lineTo(w * (x + (x - 0.5) * 1.2) + 30, h * 0.9);
      g.lineTo(w * (x + (x - 0.5) * 1.2) - 30, h * 0.9);
      g.closePath();
      g.fill();
    }
    glow(g, w * 0.5, h * 0.36, w * 0.25, 0.5);
    g.fillStyle = '#0a0a0a';
    fig(g, w * 0.5, h * 0.43, h * 0.12, { pose: 'mic' });
    const shift = (o.off % 3) * 0.17;
    for (let row = 0; row < 5; row++) {
      const n = 14 + row * 3;
      const s = h * (0.07 + row * 0.045);
      const yy = h * (0.52 + row * 0.12);
      for (let i = 0; i < n; i++) {
        const x = w * ((i + 0.5 + (row % 2) * 0.5 + shift) / n);
        g.fillStyle = '#050505';
        g.beginPath();
        g.ellipse(x, yy, s * 0.42, s * 0.5, 0, 0, 6.2832);
        g.fill();
        g.fillRect(x - s * 0.8, yy + s * 0.3, s * 1.6, s * 1.5);
      }
    }
    g.strokeStyle = '#050505';
    g.lineCap = 'round';
    const arms: [number, number][] = [
      [0.14, 0.6],
      [0.33, 0.55],
      [0.52, 0.62],
      [0.71, 0.56],
      [0.88, 0.6],
    ];
    arms.forEach(([x0, y], i) => {
      const x = x0 + (((i + o.off) * 7) % 5) * 0.012 - 0.024;
      g.lineWidth = 6;
      g.beginPath();
      g.moveTo(w * x, h * 0.9);
      g.lineTo(w * x + 5, h * y);
      g.stroke();
      g.fillStyle = '#fafafa';
      g.fillRect(w * x - 1, h * y - 12, 11, 15);
    });
  },
  paparazzi(g, w, h, o) {
    g.fillStyle = '#121212';
    g.fillRect(0, 0, w, h);
    const flashes: [number, number, number][] = [
      [0.84, 0.2, 0.4],
      [0.93, 0.74, 0.3],
      [0.14, 0.16, 0.3],
    ];
    flashes.forEach(([x, y, r], i) => glow(g, w * (x - (((i + o.off) * 5) % 3) * 0.04), h * y, h * r, 1));
    const x = w * 0.46;
    const y = h * 1.14;
    const H = h * 1.08;
    const k = H / 100;
    fig(g, x, y, H, { pose: 'stand', dress: 'coat', hat: true, fill: '#9a9a9a' });
    g.fillStyle = '#bdbdbd';
    g.beginPath();
    g.moveTo(x - 12 * k, y - 77 * k);
    g.lineTo(x - 5.5 * k, y - 87 * k);
    g.lineTo(x - 3 * k, y - 74 * k);
    g.closePath();
    g.fill();
    g.beginPath();
    g.moveTo(x + 12 * k, y - 77 * k);
    g.lineTo(x + 5.5 * k, y - 87 * k);
    g.lineTo(x + 3 * k, y - 74 * k);
    g.closePath();
    g.fill();
    g.fillStyle = '#fbfbfb';
    g.beginPath();
    g.ellipse(x, y - 88 * k, 5.8 * k, 7 * k, 0, 0, 6.2832);
    g.fill();
    g.fillStyle = '#050505';
    g.beginPath();
    g.ellipse(x - 2.7 * k, y - 89 * k, 2.6 * k, 2 * k, 0, 0, 6.2832);
    g.ellipse(x + 2.7 * k, y - 89 * k, 2.6 * k, 2 * k, 0, 0, 6.2832);
    g.fill();
    g.fillRect(x - 1 * k, y - 89.4 * k, 2 * k, 0.9 * k);
    g.fillStyle = '#050505';
    g.beginPath();
    g.ellipse(x, y - 94.5 * k, 9.5 * k, 2.3 * k, 0, 0, 6.2832);
    g.fill();
    g.fillRect(x - 5.2 * k, y - 101 * k, 10.4 * k, 7 * k);
    g.strokeStyle = '#bdbdbd';
    g.lineWidth = 5 * k;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(x + 10 * k, y - 74 * k);
    g.lineTo(x + 20 * k, y - 76 * k);
    g.lineTo(x + 27 * k, y - 86 * k);
    g.stroke();
    g.fillStyle = '#ffffff';
    const hx = x + 29 * k;
    const hy = y - 93 * k;
    g.beginPath();
    g.ellipse(hx, hy, 8 * k, 9.5 * k, 0.2, 0, 6.2832);
    g.fill();
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.ellipse(hx - 5 * k + i * 3.2 * k, hy - 10.5 * k, 1.5 * k, 4.4 * k, 0.08, 0, 6.2832);
      g.fill();
    }
    g.beginPath();
    g.ellipse(hx + 8.5 * k, hy - 1 * k, 1.6 * k, 4.2 * k, 0.9, 0, 6.2832);
    g.fill();
    g.fillStyle = '#050505';
    for (const [cx, cy] of [
      [0.07, 0.9],
      [0.9, 0.95],
    ] as const) {
      g.fillRect(w * cx - h * 0.15, h * cy - h * 0.12, h * 0.3, h * 0.24);
      g.beginPath();
      g.arc(w * cx, h * cy, h * 0.095, 0, 6.2832);
      g.fill();
      g.fillStyle = '#fafafa';
      g.beginPath();
      g.arc(w * cx, h * cy, h * 0.032, 0, 6.2832);
      g.fill();
      g.fillStyle = '#050505';
    }
  },
  carpet(g, w, h, o) {
    g.fillStyle = '#e4e4e4';
    g.fillRect(0, 0, w, h * 0.72);
    g.fillStyle = '#8c8c8c';
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 16; c++) {
        const x = w * (c / 15) + (r % 2) * 14;
        const y = h * (r * 0.085) + 8;
        g.save();
        g.translate(x, y);
        g.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = i * 1.2566 - 1.5708;
          g.lineTo(Math.cos(a) * 5, Math.sin(a) * 5);
          g.lineTo(Math.cos(a + 0.628) * 2, Math.sin(a + 0.628) * 2);
        }
        g.fill();
        g.restore();
      }
    }
    for (let i = 0; i < 10; i++) glow(g, ((i + o.off) * 89) % w, h * (0.1 + ((i + o.off) % 3) * 0.2), 14, 1);
    g.fillStyle = '#5a5a5a';
    g.fillRect(0, h * 0.72, w, h * 0.28);
    g.fillStyle = '#9a9a9a';
    g.beginPath();
    g.moveTo(w * 0.3, h * 0.72);
    g.lineTo(w * 0.7, h * 0.72);
    g.lineTo(w * 0.95, h);
    g.lineTo(w * 0.05, h);
    g.closePath();
    g.fill();
    const x = w * 0.5;
    const y = h * 0.96;
    const H = h * 0.86;
    glow(g, x, y - H * 0.5, H * 0.7, 0.7);
    fig(g, x, y, H, { pose: 'hip', dress: 'gown', hair: 'long', fill: '#1a1a1a' });
    g.fillStyle = 'rgba(255,255,255,.55)';
    g.beginPath();
    g.moveTo(x - (6 * H) / 100, y - (48 * H) / 100);
    g.quadraticCurveTo(x - (9 * H) / 100, y - (20 * H) / 100, x - (15 * H) / 100, y);
    g.lineTo(x - (11 * H) / 100, y);
    g.quadraticCurveTo(x - (6 * H) / 100, y - (22 * H) / 100, x - (4 * H) / 100, y - (48 * H) / 100);
    g.fill();
  },
  filmset(g, w, h, o) {
    g.fillStyle = lg(g, 0, 0, 0, h, [
      [0, '#c4c4c4'],
      [1, '#8e8e8e'],
    ]);
    g.fillRect(0, 0, w, h);
    glow(g, w * 0.82, h * 0.3, h * 0.7, 1);
    g.fillStyle = '#ffffff';
    g.fillRect(w * 0.74, h * 0.1, w * 0.16, h * 0.36);
    g.strokeStyle = '#0a0a0a';
    g.lineWidth = 3;
    g.strokeRect(w * 0.74, h * 0.1, w * 0.16, h * 0.36);
    g.fillStyle = '#0a0a0a';
    g.fillRect(w * 0.815, h * 0.46, 4, h * 0.5);
    for (const sg of [-1, 1]) {
      g.beginPath();
      g.moveTo(w * 0.82, h * 0.8);
      g.lineTo(w * 0.82 + sg * 28, h * 0.97);
      g.stroke();
    }
    g.beginPath();
    g.moveTo(w * 0.2, 0);
    g.lineTo(w * 0.52, h * 0.2);
    g.stroke();
    g.beginPath();
    g.ellipse(w * 0.53, h * 0.23, 12, 6, 0.55, 0, 6.2832);
    g.fill();
    const cx = w * 0.5;
    g.fillRect(cx - 40, h * 0.36, 70, 34);
    g.fillRect(cx + 30, h * 0.4, 26, 18);
    g.fillRect(cx + 56, h * 0.36, 10, 26);
    g.beginPath();
    g.arc(cx - 26, h * 0.3, 15, 0, 6.2832);
    g.arc(cx + 4, h * 0.3, 15, 0, 6.2832);
    g.fill();
    for (const dx of [-34, 0, 30]) {
      g.beginPath();
      g.moveTo(cx - 5, h * 0.6);
      g.lineTo(cx + dx, h * 0.97);
      g.stroke();
    }
    const dx = w * 0.16;
    const dy = h * 0.97;
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(dx - 24, dy);
    g.lineTo(dx + 24, dy - 40);
    g.moveTo(dx + 24, dy);
    g.lineTo(dx - 24, dy - 40);
    g.stroke();
    g.fillStyle = '#0a0a0a';
    g.fillRect(dx - 30, dy - 46, 60, 9);
    g.fillRect(dx - 30, dy - 82, 4, 44);
    g.fillRect(dx + 26, dy - 82, 4, 44);
    g.fillStyle = '#e8e8e8';
    g.fillRect(dx - 26, dy - 80, 52, 20);
    // The chair's back: its label reads the right way round in a mirrored variant too.
    g.fillStyle = '#0a0a0a';
    g.font = 'bold 10px sans-serif';
    const label = o.directorLabel;
    const tw = Math.min(46, g.measureText(label).width);
    if (o.flip) {
      g.save();
      g.translate(dx - 23 + tw, dy - 66);
      g.scale(-1, 1);
      g.fillText(label, 0, 0, 46);
      g.restore();
    } else g.fillText(label, dx - 23, dy - 66, 46);
  },
  trophy(g, w, h, o) {
    for (let i = 0; i < 22; i++) {
      g.fillStyle = (i + o.off) % 2 ? '#262626' : '#3c3c3c';
      g.fillRect((i * w) / 22, 0, w / 22 + 1, h);
    }
    g.fillStyle = 'rgba(255,255,255,.5)';
    g.beginPath();
    g.moveTo(w * 0.46, 0);
    g.lineTo(w * 0.54, 0);
    g.lineTo(w * 0.66, h);
    g.lineTo(w * 0.34, h);
    g.closePath();
    g.fill();
    glow(g, w * 0.5, h * 0.34, h * 0.5, 0.7);
    const x = w * 0.5;
    g.fillStyle = '#101010';
    g.fillRect(x - 22, h * 0.8, 44, h * 0.2);
    g.fillRect(x - 16, h * 0.72, 32, h * 0.08);
    g.fillRect(x - 4, h * 0.4, 8, h * 0.32);
    g.fillStyle = '#161616';
    g.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = i * 1.2566 - 1.5708;
      g.lineTo(x + Math.cos(a) * 26, h * 0.27 + Math.sin(a) * 26);
      g.lineTo(x + Math.cos(a + 0.628) * 11, h * 0.27 + Math.sin(a + 0.628) * 11);
    }
    g.closePath();
    g.fill();
    g.fillStyle = 'rgba(255,255,255,.85)';
    g.beginPath();
    g.moveTo(x, h * 0.27 - 26);
    g.lineTo(x + 4, h * 0.27 - 8);
    g.lineTo(x, h * 0.27 - 4);
    g.closePath();
    g.fill();
    g.fillRect(x - 2, h * 0.42, 2, h * 0.28);
    for (const [sx, sy] of [
      [0.4, 0.2],
      [0.62, 0.14],
      [0.58, 0.46],
      [0.38, 0.5],
    ] as const) {
      glow(g, w * sx, h * sy, 8, 1);
    }
  },
  // ---- Round R7b: four new scenes, and the street redrawn without its bus. ----
  tvshow(g, w, h, o) {
    // A talk-show set: a night skyline behind the host's desk, the guest in an armchair, a studio camera in front.
    g.fillStyle = lg(g, 0, 0, 0, h, [
      [0, '#2c2c2c'],
      [1, '#141414'],
    ]);
    g.fillRect(0, 0, w, h);
    const bx0 = 0;
    const bx1 = w;
    const by0 = h * 0.09;
    const by1 = h * 0.66;
    g.fillStyle = lg(g, 0, by0, 0, by1, [
      [0, '#e8e8e8'],
      [1, '#fafafa'],
    ]);
    g.fillRect(bx0, by0, bx1 - bx0, by1 - by0);
    const towers: [number, number, number][] = [
      [0.0, 0.46, 0.07],
      [0.07, 0.3, 0.05],
      [0.12, 0.52, 0.08],
      [0.2, 0.36, 0.04],
      [0.24, 0.24, 0.05],
      [0.29, 0.44, 0.07],
      [0.36, 0.33, 0.05],
      [0.41, 0.5, 0.06],
      [0.47, 0.28, 0.05],
      [0.52, 0.42, 0.07],
      [0.59, 0.2, 0.04],
      [0.63, 0.38, 0.06],
      [0.69, 0.5, 0.07],
      [0.76, 0.34, 0.05],
      [0.81, 0.46, 0.07],
      [0.88, 0.3, 0.05],
      [0.93, 0.48, 0.07],
    ];
    g.fillStyle = '#a6a6a6';
    for (const [x, top, wd] of towers) g.fillRect(w * x, h * (top + 0.06), w * wd, by1 - h * (top + 0.06));
    for (const [x, top, wd] of [towers[4], towers[10]] as [number, number, number][]) g.fillRect(w * (x + wd / 2) - 1, h * (top + 0.06) - 12, 2, 12);
    g.fillStyle = '#e4e4e4';
    towers.forEach(([x, top, wd], i) => {
      for (let yy = h * (top + 0.06) + 5; yy < by1 - 5; yy += 7)
        for (let xx = w * x + 3; xx < w * (x + wd) - 3; xx += 6) if (Math.floor(xx * 7 + yy * 13 + (i + o.off) * 17) % 5 < 2) g.fillRect(xx, yy, 2, 3);
    });
    g.fillStyle = '#0a0a0a';
    g.fillRect(0, by0 - 3, w, 3);
    for (const x of [0.04, 0.3, 0.55, 0.82]) glow(g, w * x, h * 0.03, 14, 1);
    g.fillStyle = lg(g, 0, h * 0.66, 0, h, [
      [0, '#9a9a9a'],
      [1, '#5a5a5a'],
    ]);
    g.fillRect(0, h * 0.66, w, h * 0.34);
    // The host, behind the desk: only the body above it shows.
    fig(g, w * 0.27, h * 1.0, h * 0.74, { fill: '#0a0a0a', pose: 'lectern' });
    g.fillStyle = '#3c3c3c';
    g.beginPath();
    g.moveTo(w * 0.12, h * 0.6);
    g.lineTo(w * 0.42, h * 0.6);
    g.quadraticCurveTo(w * 0.445, h * 0.76, w * 0.41, h * 0.92);
    g.lineTo(w * 0.14, h * 0.92);
    g.quadraticCurveTo(w * 0.1, h * 0.76, w * 0.12, h * 0.6);
    g.fill();
    g.fillStyle = '#d6d6d6';
    g.fillRect(w * 0.12, h * 0.6, w * 0.3, 3);
    g.fillStyle = '#8a8a8a';
    g.fillRect(w * 0.13, h * 0.74, w * 0.28, 4);
    g.fillStyle = '#0a0a0a';
    g.fillRect(w * 0.37, h * 0.52, 7, 10);
    // The guest, in an armchair, turned to the host.
    g.fillStyle = '#6a6a6a';
    g.beginPath();
    g.moveTo(w * 0.585, h * 0.9);
    g.lineTo(w * 0.585, h * 0.46);
    g.quadraticCurveTo(w * 0.625, h * 0.4, w * 0.665, h * 0.46);
    g.lineTo(w * 0.665, h * 0.9);
    g.closePath();
    g.fill();
    seat(g, w * 0.61, h * 0.72, h * 0.72, { fill: '#0a0a0a', dir: -1, hair: o.off % 2 ? 'long' : undefined });
    g.fillStyle = '#7a7a7a';
    g.fillRect(w * 0.545, h * 0.68, w * 0.13, h * 0.08);
    g.fillRect(w * 0.55, h * 0.76, 6, h * 0.16);
    g.fillRect(w * 0.665, h * 0.76, 6, h * 0.16);
    // A studio camera in front, its red light on.
    const cx = w * 0.9;
    const cy = h * 0.38;
    g.fillStyle = '#050505';
    g.fillRect(cx - 30, cy - 17, 58, 34);
    g.fillRect(cx - 50, cy - 13, 22, 26);
    g.fillRect(cx - 6, cy - 31, 30, 15);
    g.fillRect(cx - 5, cy + 16, 10, h - cy - 16);
    g.beginPath();
    g.moveTo(cx - 34, h);
    g.lineTo(cx, h * 0.84);
    g.lineTo(cx + 34, h);
    g.closePath();
    g.fill();
    g.strokeStyle = '#050505';
    g.lineWidth = 3;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(cx + 26, cy + 6);
    g.lineTo(cx + 50, cy + 30);
    g.stroke();
    glow(g, cx + 18, cy - 35, 8, 1);
  },
  studio(g, w, h, o) {
    // A recording studio from the control room: the singer in the booth behind the glass, headphones on, at a
    // microphone with its pop filter; the desk's faders and the monitors in front.
    g.fillStyle = '#3a3a3a';
    g.fillRect(0, 0, w, h);
    const x0 = w * 0.17;
    const x1 = w * 0.83;
    const y0 = h * 0.05;
    const y1 = h * 0.64;
    g.fillStyle = lg(g, 0, y0, 0, y1, [
      [0, '#e2e2e2'],
      [1, '#cfcfcf'],
    ]);
    g.fillRect(x0, y0, x1 - x0, y1 - y0);
    g.fillStyle = '#bcbcbc';
    const n = 8;
    const pw = (x1 - x0 - 16) / n;
    for (let i = 0; i < n; i++) g.fillRect(x0 + 8 + i * pw + 3, y0 + 7, pw - 6, (y1 - y0) * 0.62);
    glow(g, w * (0.48 + ((o.off % 3) - 1) * 0.02), h * 0.32, h * 0.46, 0.95);
    const sx = w * 0.47;
    const sy = h * 1.02;
    const sH = h * 0.88;
    const k = sH / 100;
    fig(g, sx, sy, sH, { fill: '#0a0a0a', pose: 'stand', hair: o.off % 2 ? 'long' : undefined });
    g.strokeStyle = '#0a0a0a';
    g.lineWidth = 1.8;
    g.beginPath();
    g.arc(sx, sy - 89 * k, 7.4 * k, Math.PI * 1.1, Math.PI * 1.9);
    g.stroke();
    g.fillStyle = '#0a0a0a';
    g.beginPath();
    g.ellipse(sx - 6.6 * k, sy - 87 * k, 1.8 * k, 3 * k, 0, 0, 6.2832);
    g.ellipse(sx + 6.6 * k, sy - 87 * k, 1.8 * k, 3 * k, 0, 0, 6.2832);
    g.fill();
    const mx = sx + 22 * k;
    const my = sy - 84 * k;
    g.lineWidth = 2.6;
    g.beginPath();
    g.moveTo(mx + 9 * k, sy);
    g.lineTo(mx + 9 * k, my + 10 * k);
    g.lineTo(mx + 2 * k, my + 3 * k);
    g.stroke();
    g.fillRect(mx - 2 * k, my - 6 * k, 4.4 * k, 11 * k);
    g.fillStyle = 'rgba(30,30,30,.28)';
    g.beginPath();
    g.arc(mx - 10 * k, my - 1 * k, 8 * k, 0, 6.2832);
    g.fill();
    g.lineWidth = 3.2;
    g.stroke();
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(mx - 3 * k, my + 4 * k);
    g.lineTo(mx - 7 * k, my + 6 * k);
    g.stroke();
    g.fillStyle = '#080808';
    g.fillRect(x0 - 4, y0 - 4, x1 - x0 + 8, 4);
    g.fillRect(x0 - 4, y0, 4, y1 - y0);
    g.fillRect(x1, y0, 4, y1 - y0);
    g.fillStyle = 'rgba(255,255,255,.16)';
    g.beginPath();
    g.moveTo(x0 + (x1 - x0) * 0.62, y0);
    g.lineTo(x0 + (x1 - x0) * 0.74, y0);
    g.lineTo(x0 + (x1 - x0) * 0.56, y1);
    g.lineTo(x0 + (x1 - x0) * 0.44, y1);
    g.closePath();
    g.fill();
    // The desk, its faders and knobs, and the two monitors on it.
    g.fillStyle = '#6a6a6a';
    g.beginPath();
    g.moveTo(-10, h * 0.62);
    g.lineTo(w + 10, h * 0.62);
    g.lineTo(w + 10, h);
    g.lineTo(-10, h);
    g.closePath();
    g.fill();
    g.fillStyle = '#1a1a1a';
    g.fillRect(0, h * 0.62, w, 3);
    for (let i = 0; i < 34; i++) {
      const x = w * (0.04 + i * 0.027);
      const top = h * (0.72 + (((i + o.off) * 7) % 5) * 0.025);
      g.fillStyle = '#1a1a1a';
      g.fillRect(x, h * 0.7, 2, h * 0.24);
      g.fillStyle = '#fafafa';
      g.fillRect(x - 2.5, top, 7, 4);
      g.fillStyle = '#1a1a1a';
      g.beginPath();
      g.arc(x + 1, h * 0.665, 1.8, 0, 6.2832);
      g.fill();
    }
    for (const [x, on] of [
      [0.2, 1],
      [0.46, 0],
      [0.71, 1],
    ] as const)
      if (on) glow(g, w * x, h * 0.665, 5, 1);
    for (const mxw of [0.2, 0.8]) {
      const cx = w * mxw;
      g.fillStyle = '#0a0a0a';
      g.fillRect(cx - 17, h * 0.4, 34, h * 0.3);
      g.fillStyle = '#6a6a6a';
      g.beginPath();
      g.arc(cx, h * 0.6, 9, 0, 6.2832);
      g.fill();
      g.beginPath();
      g.arc(cx, h * 0.47, 4, 0, 6.2832);
      g.fill();
    }
    // The producer, from behind, at the desk.
    g.fillStyle = '#050505';
    g.beginPath();
    g.ellipse(w * 0.26, h * 0.78, h * 0.08, h * 0.1, 0, 0, 6.2832);
    g.fill();
    g.beginPath();
    g.moveTo(w * 0.15, h);
    g.quadraticCurveTo(w * 0.17, h * 0.86, w * 0.26, h * 0.86);
    g.quadraticCurveTo(w * 0.35, h * 0.86, w * 0.37, h);
    g.closePath();
    g.fill();
  },
  arena(g, w, h, o) {
    // An arena from the stage: the performer from behind, arm up, and the crowd's lights out into the haze.
    g.fillStyle = '#2a2a2a';
    g.fillRect(0, 0, w, h);
    g.fillStyle = lg(g, 0, h * 0.1, 0, h * 0.8, [
      [0, '#5a5a5a'],
      [0.4, '#d6d6d6'],
      [1, '#8a8a8a'],
    ]);
    g.fillRect(0, h * 0.1, w, h * 0.7);
    glow(g, w * 0.5, h * 0.4, h * 0.7, 0.8);
    for (const side of [0, 1]) {
      g.fillStyle = '#4a4a4a';
      g.beginPath();
      if (side === 0) {
        g.moveTo(0, h * 0.2);
        g.quadraticCurveTo(w * 0.12, h * 0.3, w * 0.18, h * 0.5);
        g.lineTo(0, h * 0.62);
      } else {
        g.moveTo(w, h * 0.2);
        g.quadraticCurveTo(w * 0.88, h * 0.3, w * 0.82, h * 0.5);
        g.lineTo(w, h * 0.62);
      }
      g.closePath();
      g.fill();
    }
    const beams: [number, number][] = [
      [0.08, 0.86],
      [0.24, 0.5],
      [0.4, 0.12],
      [0.58, 0.9],
      [0.74, 0.42],
      [0.92, 0.1],
    ];
    beams.forEach(([sx, ex], i) => {
      const e = ex + ((((i + o.off) * 3) % 5) - 2) * 0.03;
      g.fillStyle = 'rgba(255,255,255,.32)';
      g.beginPath();
      g.moveTo(w * sx - 2, h * 0.06);
      g.lineTo(w * sx + 2, h * 0.06);
      g.lineTo(w * e + 26, h * 0.74);
      g.lineTo(w * e - 26, h * 0.74);
      g.closePath();
      g.fill();
    });
    g.fillStyle = '#050505';
    g.fillRect(0, h * 0.02, w, 7);
    g.strokeStyle = '#050505';
    g.lineWidth = 1.5;
    g.beginPath();
    for (let x = 0; x < w; x += 12) {
      g.moveTo(x, h * 0.02 + 7);
      g.lineTo(x + 6, h * 0.02 + 14);
      g.lineTo(x + 12, h * 0.02 + 7);
    }
    g.stroke();
    for (const sx of beams.map(([x]) => x)) glow(g, w * sx, h * 0.07, 9, 1);
    // The crowd, rows of heads into the distance, and their phones lit.
    for (let row = 0; row < 7; row++) {
      const yy = h * (0.5 + row * 0.05);
      const s = 2.4 + row * 1.25;
      const step = s * 2.3;
      for (let x = -((row * 7 + o.off * 3) % step); x < w + step; x += step) {
        g.fillStyle = row < 2 ? '#4a4a4a' : row < 4 ? '#262626' : '#0c0c0c';
        g.beginPath();
        g.ellipse(x, yy, s * 0.55, s * 0.62, 0, 0, 6.2832);
        g.fill();
        g.fillRect(x - s * 0.9, yy + s * 0.4, s * 1.8, s * 1.4);
      }
    }
    for (let i = 0; i < 46; i++) {
      const x = ((i + o.off) * 97) % w;
      const y = h * (0.52 + (((i + o.off) * 31) % 100) / 100 * 0.26);
      g.fillStyle = '#fafafa';
      g.fillRect(x - 1, y - 1.5, 2.5, 3.5);
    }
    // The stage in front, its wedges, and the performer.
    g.fillStyle = '#080808';
    g.fillRect(0, h * 0.8, w, h * 0.2);
    g.fillStyle = '#3a3a3a';
    g.fillRect(0, h * 0.8, w, 2);
    g.fillStyle = '#121212';
    for (const x of [0.16, 0.72]) {
      g.beginPath();
      g.moveTo(w * x, h * 0.86);
      g.lineTo(w * x + 46, h * 0.86);
      g.lineTo(w * x + 54, h);
      g.lineTo(w * x - 8, h);
      g.closePath();
      g.fill();
    }
    fig(g, w * 0.43, h * 1.04, h * 0.94, { fill: '#040404', pose: 'raise' });
    const k = (h * 0.94) / 100;
    g.fillStyle = '#040404';
    g.fillRect(w * 0.43 + 15 * k, h * 1.04 - 116 * k, 4 * k, 9 * k);
  },
  podium(g, w, h, o) {
    // A press conference: the step-and-repeat behind, a lectern crowded with microphones, the flashes going off,
    // the press in front with their cameras up.
    g.fillStyle = '#d2d2d2';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#a2a2a2';
    for (let r = 0; r < 7; r++)
      for (let c = -1; c < 13; c++) {
        const x = c * 42 + (r % 2) * 21 + ((o.off * 7) % 42);
        const y = 8 + r * 24;
        g.beginPath();
        g.arc(x, y + 4, 4, 0, 6.2832);
        g.fill();
        g.fillRect(x + 7, y + 2, 16, 4);
      }
    const flashes: [number, number, number][] = [
      [0.16, 0.3, 0.32],
      [0.8, 0.22, 0.36],
      [0.66, 0.55, 0.22],
    ];
    flashes.forEach(([x, y, r], i) => glow(g, w * (x + ((((i + o.off) * 5) % 3) - 1) * 0.04), h * y, h * r, 1));
    const px = w * 0.5;
    fig(g, px, h * 1.02, h * 0.86, { fill: '#121212', pose: 'lectern' });
    g.fillStyle = '#2a2a2a';
    g.beginPath();
    g.moveTo(w * 0.385, h * 0.6);
    g.lineTo(w * 0.615, h * 0.6);
    g.lineTo(w * 0.6, h);
    g.lineTo(w * 0.4, h);
    g.closePath();
    g.fill();
    g.fillStyle = '#4a4a4a';
    g.fillRect(w * 0.385, h * 0.6, w * 0.23, 4);
    g.fillStyle = '#e8e8e8';
    g.beginPath();
    g.arc(px, h * 0.8, h * 0.085, 0, 6.2832);
    g.fill();
    g.fillStyle = '#2a2a2a';
    g.beginPath();
    g.arc(px, h * 0.8, h * 0.05, 0, 6.2832);
    g.fill();
    // The microphones: stalks from the lectern's top, heads gathered under the speaker's chin.
    const mics: [number, number, number, boolean][] = [
      [-0.07, -0.022, 0.43, true],
      [-0.045, -0.012, 0.39, false],
      [-0.02, -0.004, 0.42, true],
      [0.0, 0.004, 0.37, false],
      [0.025, 0.012, 0.41, true],
      [0.05, 0.02, 0.38, false],
      [0.075, 0.03, 0.44, false],
    ];
    g.strokeStyle = '#0a0a0a';
    g.lineWidth = 2;
    for (const [bx, tx, ty, flag] of mics) {
      g.beginPath();
      g.moveTo(px + w * bx, h * 0.6);
      g.lineTo(px + w * tx, h * ty);
      g.stroke();
      g.fillStyle = '#0a0a0a';
      g.beginPath();
      g.ellipse(px + w * tx, h * ty, 4, 5, 0, 0, 6.2832);
      g.fill();
      if (flag) {
        g.fillStyle = '#f4f4f4';
        const fx = px + w * (tx + (bx - tx) * 0.3);
        const fy = h * (ty + (0.6 - ty) * 0.3);
        g.fillRect(fx - 5, fy - 5, 10, 10);
        g.strokeRect(fx - 5, fy - 5, 10, 10);
      }
    }
    // The press, in front: heads and shoulders, two cameras held up.
    g.fillStyle = '#060606';
    const heads: [number, number][] = [
      [0.04, 0.9],
      [0.13, 0.94],
      [0.24, 0.92],
      [0.76, 0.93],
      [0.86, 0.9],
      [0.96, 0.94],
    ];
    for (const [hx, hy] of heads) {
      g.beginPath();
      g.ellipse(w * hx, h * hy, 11, 13, 0, 0, 6.2832);
      g.fill();
      g.fillRect(w * hx - 22, h * hy + 8, 44, 30);
    }
    for (const [cxw, cyh, dir] of [
      [0.2, 0.68, 1],
      [0.82, 0.66, -1],
    ] as const) {
      const cx = w * cxw;
      const cy = h * cyh;
      g.fillStyle = '#060606';
      g.fillRect(cx - 13, cy - 10, 26, 20);
      g.fillRect(dir > 0 ? cx + 13 : cx - 33, cy - 7, 20, 14);
      g.fillRect(cx - 5, cy - 21, 10, 11);
      g.strokeStyle = '#060606';
      g.lineWidth = 5;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(cx - dir * 6, cy + 9);
      g.lineTo(cx - dir * 12, h * 0.96);
      g.stroke();
      g.fillStyle = '#e4e4e4';
      g.fillRect(dir > 0 ? cx + 31 : cx - 34, cy - 5, 3, 10);
      glow(g, cx, cy - 16, 11, 0.95);
    }
  },
  room(g, w, h, o) {
    // A small room, the year's start: the singer from behind on the edge of the bed, playing, at the window with
    // the city outside; a lamp on the left, the coat on its hook on the right. Summer's arena is the same back at
    // the far end of the year.
    g.fillStyle = lg(g, 0, 0, 0, h, [
      [0, '#a6a6a6'],
      [1, '#8a8a8a'],
    ]);
    g.fillRect(0, 0, w, h);
    const x0 = w * 0.335;
    const x1 = w * 0.665;
    const y0 = h * 0.08;
    const y1 = h * 0.74;
    glow(g, w * 0.5, h * 0.42, h * 0.75, 0.55);
    // The window: the sky, and the city's roofs along its foot.
    g.fillStyle = lg(g, 0, y0, 0, y1, [
      [0, '#ededed'],
      [1, '#fafafa'],
    ]);
    g.fillRect(x0, y0, x1 - x0, y1 - y0);
    const rnd = mulberry(11 + o.off);
    let bx = x0 - 4;
    while (bx < x1 + 4) {
      const bw = 14 + rnd() * 22;
      const top = y1 - h * (0.1 + rnd() * 0.2);
      g.fillStyle = rnd() < 0.5 ? '#7a7a7a' : '#8c8c8c';
      g.fillRect(bx, top, bw, y1 - top);
      g.fillStyle = '#9c9c9c';
      for (let yy = top + 4; yy < y1 - 3; yy += 6) {
        for (let xx = bx + 3; xx < bx + bw - 3; xx += 6) g.fillRect(xx, yy, 2.4, 3);
      }
      bx += bw + 1;
    }
    // The frame and its cross, the sill.
    g.fillStyle = '#161616';
    g.fillRect(x0 - 5, y0 - 5, x1 - x0 + 10, 5);
    g.fillRect(x0 - 5, y0, 5, y1 - y0);
    g.fillRect(x1, y0, 5, y1 - y0);
    g.fillRect(w * 0.5 - 1.6, y0, 3.2, y1 - y0);
    g.fillRect(x0, h * 0.38, x1 - x0, 3.2);
    g.fillStyle = '#3a3a3a';
    g.fillRect(x0 - 10, y1, x1 - x0 + 20, 4);
    // The curtains, drawn back.
    for (const side of [-1, 1]) {
      const cx = side < 0 ? x0 - 3 : x1 + 3;
      g.fillStyle = '#4e4e4e';
      g.beginPath();
      g.moveTo(cx - side * 18, 0);
      g.lineTo(cx + side * 12, 0);
      g.quadraticCurveTo(cx + side * 1, h * 0.38, cx + side * 6, h * 0.8);
      g.lineTo(cx - side * 24, h * 0.8);
      g.closePath();
      g.fill();
      g.strokeStyle = '#3a3a3a';
      g.lineWidth = 2;
      for (const f of [0.25, 0.6]) {
        g.beginPath();
        g.moveTo(cx - side * 18 * f, 0);
        g.quadraticCurveTo(cx - side * 18 * f + side * 3, h * 0.42, cx - side * 22 * f, h * 0.8);
        g.stroke();
      }
    }
    // The lamp on its little table, on the left.
    glow(g, w * 0.2, h * 0.46, h * 0.3, 0.5);
    g.fillStyle = '#141414';
    g.fillRect(w * 0.13, h * 0.68, w * 0.12, 3);
    g.fillRect(w * 0.14, h * 0.68, 2.6, h * 0.2);
    g.fillRect(w * 0.235, h * 0.68, 2.6, h * 0.2);
    g.fillRect(w * 0.188, h * 0.5, 2.4, h * 0.18);
    g.fillRect(w * 0.17, h * 0.665, 22, 3);
    g.beginPath();
    g.moveTo(w * 0.165, h * 0.5);
    g.lineTo(w * 0.222, h * 0.5);
    g.lineTo(w * 0.21, h * 0.37);
    g.lineTo(w * 0.177, h * 0.37);
    g.closePath();
    g.fill();
    // The coat on its hook, on the right: sloping shoulders from the hook, the collar, the sleeves hanging at its
    // sides, a little apart from the body.
    const hx = w * 0.79;
    g.fillStyle = '#141414';
    g.fillRect(hx - 4, h * 0.2, 8, 2.4);
    g.fillRect(hx - 1, h * 0.2, 2, 6);
    g.beginPath();
    g.moveTo(hx, h * 0.235);
    g.lineTo(hx - 13, h * 0.31);
    g.lineTo(hx - 14, h * 0.74);
    g.lineTo(hx + 14, h * 0.74);
    g.lineTo(hx + 13, h * 0.31);
    g.closePath();
    g.fill();
    for (const side of [-1, 1]) {
      g.beginPath();
      g.moveTo(hx + side * 12, h * 0.3);
      g.quadraticCurveTo(hx + side * 19, h * 0.33, hx + side * 19.5, h * 0.42);
      g.lineTo(hx + side * 19, h * 0.66);
      g.lineTo(hx + side * 14.6, h * 0.67);
      g.lineTo(hx + side * 14.4, h * 0.36);
      g.closePath();
      g.fill();
    }
    g.strokeStyle = '#5a5a5a';
    g.lineWidth = 1.3;
    g.beginPath();
    g.moveTo(hx - 5, h * 0.25);
    g.lineTo(hx, h * 0.43);
    g.lineTo(hx + 5, h * 0.25);
    g.moveTo(hx, h * 0.43);
    g.lineTo(hx, h * 0.73);
    g.stroke();
    // The bed's edge, a fold in the blanket.
    g.fillStyle = '#5c5c5c';
    g.fillRect(0, h * 0.84, w, h * 0.16);
    g.fillStyle = '#4a4a4a';
    g.fillRect(0, h * 0.84, w, 2);
    // The singer from behind, the guitar on the lap: its neck out to the left past the shoulder, its body's edge at
    // the right hip.
    const cx = w * 0.5;
    const k = h / 100;
    g.fillStyle = '#060606';
    g.beginPath();
    g.moveTo(cx - 27 * k, h + 2);
    g.quadraticCurveTo(cx - 28 * k, h * 0.71, cx - 11 * k, h * 0.675);
    g.lineTo(cx + 11 * k, h * 0.675);
    g.quadraticCurveTo(cx + 28 * k, h * 0.71, cx + 27 * k, h + 2);
    g.closePath();
    g.fill();
    g.fillRect(cx - 4.4 * k, h * 0.61, 8.8 * k, 8 * k);
    g.beginPath();
    g.ellipse(cx, h * 0.555, 9.4 * k, 10.6 * k, 0.05, 0, 6.2832);
    g.fill();
    g.beginPath();
    g.ellipse(cx + 28 * k, h * 0.94, 9 * k, 11 * k, 0.35, 0, 6.2832);
    g.fill();
    g.save();
    g.translate(cx - 20 * k, h * 0.83);
    g.rotate(Math.PI + 0.42);
    g.fillRect(0, -1.9 * k, 40 * k, 3.8 * k);
    g.translate(40 * k, 0);
    g.rotate(-0.22);
    g.fillRect(0, -3.2 * k, 11 * k, 6.4 * k);
    for (const px of [2.5, 6, 9.5]) {
      g.fillRect(px * k, -5 * k, 1.6 * k, 2 * k);
      g.fillRect(px * k, 3 * k, 1.6 * k, 2 * k);
    }
    g.restore();
  },
  street(g, w, h, o) {
    // The street (redrawn in R7b; v1's had a bus at its centre that read as nothing in particular): a reporter's
    // vox pop outside a row of shops, a passer-by answering into the microphone, the camera on them. The season is
    // in the sky, the pavement and the weather.
    const season = o.season;
    const winter = season === 'winter';
    const wet = season === 'spring' || season === 'autumn';
    const sky: [number, string][] =
      season === 'summer'
        ? [
            [0, '#fff'],
            [1, '#e4e4e4'],
          ]
        : winter
          ? [
              [0, '#c4c4c4'],
              [1, '#dcdcdc'],
            ]
          : [
              [0, '#9a9a9a'],
              [1, '#bcbcbc'],
            ];
    g.fillStyle = lg(g, 0, 0, 0, h * 0.2, sky);
    g.fillRect(0, 0, w, h);
    if (season === 'summer') glow(g, w * 0.9, h * 0.04, h * 0.45, 1);
    const shops: [number, number][] = [
      [-0.02, 0.36],
      [0.34, 0.32],
      [0.66, 0.36],
    ];
    shops.forEach(([x, wd], i) => {
      const left = w * x;
      const right = w * (x + wd);
      const span = right - left;
      const top = h * (0.04 + (((i + o.off) * 3) % 3) * 0.025);
      g.fillStyle = i % 2 ? '#c2c2c2' : '#d6d6d6';
      g.fillRect(left, top, span, h * 0.72 - top);
      g.fillStyle = winter ? '#fafafa' : '#7a7a7a';
      g.fillRect(left, top, span, 3);
      g.fillStyle = '#4a4a4a';
      for (const fx of [0.14, 0.42, 0.7]) g.fillRect(left + span * fx, top + 7, span * 0.16, h * 0.13);
      g.fillStyle = '#f2f2f2';
      g.fillRect(left + 8, h * 0.27, span - 16, h * 0.07);
      g.fillStyle = '#9a9a9a';
      g.fillRect(left + span * 0.3, h * 0.295, span * 0.4, h * 0.02);
      const ay0 = h * 0.35;
      const ay1 = h * 0.44;
      const stripes = 9;
      for (let st = 0; st < stripes; st++) {
        g.fillStyle = st % 2 ? '#8a8a8a' : '#f4f4f4';
        const a = left + (span * st) / stripes;
        const b = left + (span * (st + 1)) / stripes;
        const mid = (left + right) / 2;
        g.beginPath();
        g.moveTo(a, ay0);
        g.lineTo(b, ay0);
        g.lineTo(b + (b - mid) * 0.06, ay1);
        g.lineTo(a + (a - mid) * 0.06, ay1);
        g.closePath();
        g.fill();
      }
      if (winter) {
        g.fillStyle = '#fafafa';
        g.fillRect(left, ay0 - 3, span, 4);
      }
      g.fillStyle = '#8e8e8e';
      g.fillRect(left + 8, h * 0.46, span * 0.6, h * 0.26);
      g.fillStyle = 'rgba(255,255,255,.55)';
      g.beginPath();
      g.moveTo(left + 8 + span * 0.18, h * 0.46);
      g.lineTo(left + 8 + span * 0.3, h * 0.46);
      g.lineTo(left + 8 + span * 0.16, h * 0.72);
      g.lineTo(left + 8 + span * 0.04, h * 0.72);
      g.closePath();
      g.fill();
      g.fillStyle = '#3a3a3a';
      g.fillRect(left + span * 0.74, h * 0.47, span * 0.16, h * 0.25);
    });
    g.fillStyle = winter ? '#f2f2f2' : season === 'summer' ? '#e2e2e2' : '#b4b4b4';
    g.fillRect(0, h * 0.72, w, h * 0.28);
    g.fillStyle = winter ? '#d4d4d4' : '#7a7a7a';
    g.fillRect(0, h * 0.72, w, 3);
    g.fillStyle = '#0a0a0a';
    g.fillRect(w * 0.05, h * 0.16, 3, h * 0.78);
    g.beginPath();
    g.ellipse(w * 0.05 + 1.5, h * 0.16, 8, 3.8, 0, 0, 6.2832);
    g.fill();
    if (winter) glow(g, w * 0.05, h * 0.18, 18, 0.9);
    const dress = winter ? 'coat' : 'legs';
    // A passer-by, further off, under an umbrella when it rains.
    const fx = w * (0.17 + ((o.off % 3) - 1) * 0.02);
    fig(g, fx, h * 0.92, h * 0.44, { fill: '#1a1a1a', dress, hat: winter });
    if (wet) {
      g.fillStyle = '#1a1a1a';
      g.beginPath();
      g.arc(fx, h * 0.92 - h * 0.44, h * 0.13, Math.PI, 0);
      g.fill();
      g.fillRect(fx - 1, h * 0.92 - h * 0.44, 2, h * 0.11);
    }
    // The vox pop.
    const rx = w * 0.4;
    const rH = h * 0.68;
    const rk = rH / 100;
    fig(g, rx, h * 1.0, rH, { fill: '#0a0a0a', pose: 'reach', dress });
    g.fillStyle = '#0a0a0a';
    g.beginPath();
    g.ellipse(rx + 34 * rk, h - 73 * rk, 3.4 * rk, 4.2 * rk, 0, 0, 6.2832);
    g.fill();
    g.fillStyle = '#fafafa';
    g.fillRect(rx + 30 * rk, h - 68 * rk, 8 * rk, 7 * rk);
    g.strokeStyle = '#0a0a0a';
    g.lineWidth = 1.2;
    g.strokeRect(rx + 30 * rk, h - 68 * rk, 8 * rk, 7 * rk);
    fig(g, w * 0.56, h * 1.0, h * 0.66, { fill: '#0a0a0a', dress, hat: winter, hair: o.off % 2 ? 'long' : undefined });
    const ox = w * 0.79;
    const oH = h * 0.7;
    const ok = oH / 100;
    fig(g, ox, h * 1.0, oH, { fill: '#0a0a0a', pose: 'shoulder', dress });
    g.fillStyle = '#0a0a0a';
    g.fillRect(ox - 30 * ok, h - 99 * ok, 36 * ok, 15 * ok);
    g.beginPath();
    g.moveTo(ox - 30 * ok, h - 97 * ok);
    g.lineTo(ox - 44 * ok, h - 100 * ok);
    g.lineTo(ox - 44 * ok, h - 83 * ok);
    g.lineTo(ox - 30 * ok, h - 86 * ok);
    g.closePath();
    g.fill();
    g.fillRect(ox - 8 * ok, h - 106 * ok, 10 * ok, 7 * ok);
    g.fillStyle = '#e8e8e8';
    g.fillRect(ox - 45 * ok, h - 95 * ok, 2.4 * ok, 7 * ok);
    if (season === 'spring') {
      g.strokeStyle = 'rgba(255,255,255,.55)';
      g.lineWidth = 1.2;
      for (let i = 0; i < 90; i++) {
        const x = ((i + o.off * 13) * 41) % w;
        const y = ((i + o.off * 7) * 29) % h;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x - 4, y + 11);
        g.stroke();
      }
    }
    if (season === 'autumn') {
      g.fillStyle = '#2a2a2a';
      for (let i = 0; i < 30; i++) {
        g.save();
        g.translate(((i + o.off * 11) * 67) % w, ((i + o.off * 5) * 37) % (h * 0.75));
        g.rotate(i);
        g.beginPath();
        g.ellipse(0, 0, 3.4, 1.6, 0, 0, 6.2832);
        g.fill();
        g.restore();
      }
    }
    if (winter) {
      g.fillStyle = '#fff';
      for (let i = 0; i < 120; i++) {
        g.beginPath();
        g.arc(((i + o.off * 17) * 43) % w, ((i + o.off * 9) * 31) % h, 1.8, 0, 6.2832);
        g.fill();
      }
    }
  },
  headshot(g, w, h) {
    g.fillStyle = lg(g, 0, 0, w, h, [
      [0, '#2a2a2a'],
      [1, '#0c0c0c'],
    ]);
    g.fillRect(0, 0, w, h);
    glow(g, w * 0.7, h * 0.36, h * 0.44, 0.32);
    const P = (x: number, y: number): [number, number] => [w * x, h * y];
    g.beginPath();
    g.moveTo(...P(1, 1));
    g.lineTo(...P(1, 0.8));
    g.quadraticCurveTo(...P(0.97, 0.72), ...P(0.87, 0.7));
    g.quadraticCurveTo(...P(0.8, 0.66), ...P(0.82, 0.56));
    g.quadraticCurveTo(...P(0.9, 0.4), ...P(0.84, 0.24));
    g.quadraticCurveTo(...P(0.76, 0.12), ...P(0.62, 0.13));
    g.quadraticCurveTo(...P(0.5, 0.14), ...P(0.47, 0.24));
    g.quadraticCurveTo(...P(0.46, 0.29), ...P(0.44, 0.31));
    g.lineTo(...P(0.405, 0.365));
    g.lineTo(...P(0.445, 0.385));
    g.quadraticCurveTo(...P(0.43, 0.4), ...P(0.44, 0.415));
    g.quadraticCurveTo(...P(0.43, 0.43), ...P(0.445, 0.44));
    g.quadraticCurveTo(...P(0.45, 0.48), ...P(0.5, 0.495));
    g.quadraticCurveTo(...P(0.55, 0.5), ...P(0.58, 0.55));
    g.lineTo(...P(0.58, 0.64));
    g.quadraticCurveTo(...P(0.46, 0.7), ...P(0.36, 0.76));
    g.quadraticCurveTo(...P(0.3, 0.82), ...P(0.28, 1));
    g.closePath();
    g.fillStyle = lg(g, w * 0.4, 0, w * 0.95, 0, [
      [0, '#f0f0f0'],
      [0.45, '#a4a4a4'],
      [1, '#3c3c3c'],
    ]);
    g.fill();
    g.beginPath();
    g.moveTo(...P(0.47, 0.22));
    g.quadraticCurveTo(...P(0.52, 0.09), ...P(0.67, 0.09));
    g.quadraticCurveTo(...P(0.88, 0.12), ...P(0.89, 0.34));
    g.quadraticCurveTo(...P(0.9, 0.52), ...P(0.82, 0.6));
    g.quadraticCurveTo(...P(0.79, 0.42), ...P(0.66, 0.27));
    g.quadraticCurveTo(...P(0.56, 0.2), ...P(0.47, 0.22));
    g.fillStyle = '#161616';
    g.fill();
  },
};

/** The screen: newsprint ink on newsprint; the paparazzi shot in the tabloid's red duotone. */
const INK = { ink: '#1a1714', paper: '#ece6d9' };
const RED = { ink: '#5e0c07', paper: '#f0c6be' };
const HEADSHOT = { ink: '#0e0e0e', paper: '#d9d6cf' };

/** A 3-tap blur, twice each way: the softening the mockup gets from the canvas filter, which WebKit lacks. */
function soften(d: Uint8ClampedArray, w: number, h: number): Float32Array {
  const a = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) a[i] = ((d[i * 4] as number) * 0.3 + (d[i * 4 + 1] as number) * 0.59 + (d[i * 4 + 2] as number) * 0.11) / 255;
  const b = new Float32Array(w * h);
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        b[i] = ((a[y * w + Math.max(0, x - 1)] as number) + 2 * (a[i] as number) + (a[y * w + Math.min(w - 1, x + 1)] as number)) / 4;
      }
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        a[i] = ((b[Math.max(0, y - 1) * w + x] as number) + 2 * (b[i] as number) + (b[Math.min(h - 1, y + 1) * w + x] as number)) / 4;
      }
  }
  return a;
}

/**
 * Screens a drawing into halftone dots (the mockup's `halftone`): luminance sampled on a 45° grid, area-sampled
 * over five points, each dot's area following the darkness.
 */
function drawingCanvas(w:number,h:number,offscreen:boolean):HTMLCanvasElement|OffscreenCanvas {
  const canvas=offscreen?new OffscreenCanvas(w,h):document.createElement('canvas');
  canvas.width=w;canvas.height=h;return canvas;
}
function halftone(draw: (g: G, w: number, h: number) => void, w: number, h: number, o: { ink: string; paper: string; cell?: number },offscreen:boolean):HTMLCanvasElement|OffscreenCanvas {
  const cell = o.cell ?? 5.4;
  const src = drawingCanvas(w,h,offscreen);
  const g = src.getContext('2d') as G;
  g.fillStyle = '#fff';
  g.fillRect(0, 0, w, h);
  draw(g, w, h);
  const lum = soften(g.getImageData(0, 0, w, h).data, w, h);
  const L = (x: number, y: number): number => lum[Math.max(0, Math.min(h - 1, y | 0)) * w + Math.max(0, Math.min(w - 1, x | 0))] as number;
  const out = drawingCanvas(w,h,offscreen);
  const c = out.getContext('2d') as G;
  c.fillStyle = o.paper;
  c.fillRect(0, 0, w, h);
  c.fillStyle = o.ink;
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
      if (r > 0.35) {
        c.beginPath();
        c.arc(x, y, r, 0, 6.2832);
        c.fill();
      }
    }
  return out;
}

// The colour (round R8d; docs/design/visual/ref/r8d-colour.ts): a look's ramp and its lights, and the dots gathered
// by colour, so each colour is filled once.

/** A ramp's stop: where it sits, 0–1, and its colour. */
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

/**
 * The title's stage (round R3, amended; docs/design/visual/ref/r3-title-v2.html `titleScene`): the singer at the mic
 * in a spotlight, the photographers' flashes around, their cameras and the crowd's heads dark in front. Drawn on the
 * reference's own 1280×720 frame.
 */
function titleScene(g: G, w: number, h: number) {
  g.fillStyle = '#000';
  g.fillRect(0, 0, w, h);
  // The spotlight's cone and its pool.
  g.fillStyle = 'rgba(255,255,255,.16)';
  g.beginPath();
  g.moveTo(w * 0.47, 0);
  g.lineTo(w * 0.53, 0);
  g.lineTo(w * 0.66, h * 0.88);
  g.lineTo(w * 0.34, h * 0.88);
  g.closePath();
  g.fill();
  glow(g, w * 0.5, h * 0.6, h * 0.42, 0.75);
  glow(g, w * 0.5, h * 0.66, h * 0.22, 0.6);
  g.fillStyle = '#262626';
  g.fillRect(0, h * 0.84, w, h * 0.16);
  g.fillStyle = 'rgba(255,255,255,.75)';
  g.beginPath();
  g.ellipse(w * 0.5, h * 0.865, w * 0.15, h * 0.035, 0, 0, 6.2832);
  g.fill();
  // The singer at the mic.
  fig(g, w * 0.5, h * 0.865, h * 0.5, { pose: 'mic', fill: '#000' });
  g.strokeStyle = '#000';
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(w * 0.508, h * 0.865 - h * 0.5 * 0.84);
  g.lineTo(w * 0.522, h * 0.865);
  g.stroke();
  // The photographers' flashes, and their cameras in the foreground.
  for (const [x, y, r] of [
    [0.07, 0.44, 0.22],
    [0.93, 0.38, 0.2],
    [0.81, 0.76, 0.12],
    [0.19, 0.79, 0.13],
  ] as const)
    glow(g, w * x, h * y, h * r, 1);
  // Their cameras have no lens glints (round R8d, C2): black on black they never showed, and the one in frame, at the
  // foot on the right, printed as two stray dots under BEGIN.
  g.fillStyle = '#000';
  for (const [cx, cy] of [
    [0.05, 0.97],
    [0.95, 0.98],
    [0.22, 1.03],
    [0.79, 1.04],
  ] as const) {
    g.fillRect(w * cx - h * 0.11, h * cy - h * 0.09, h * 0.22, h * 0.18);
    g.beginPath();
    g.arc(w * cx, h * cy, h * 0.07, 0, 6.2832);
    g.fill();
  }
  for (let i = 0; i < 26; i++) {
    const x = w * (i / 25) + ((i * 37) % 13) - 6;
    const s = h * (0.075 + ((i * 13) % 7) * 0.006);
    const y = h + s * 0.25;
    g.fillStyle = '#000';
    g.beginPath();
    g.ellipse(x, y - s * 0.55, s * 0.3, s * 0.36, 0, 0, 6.2832);
    g.fill();
    g.fillRect(x - s * 0.55, y - s * 0.28, s * 1.1, s);
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

// The looks (the author's choices, 2026-10-20; docs/design/visual/ref/r8d-colour.png).

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

/** The title photograph's frame: the reference's, whose 7 px dot cell scales with the pixels it is drawn at. */
const TITLE = { w: 1280, h: 720, cell: 7 } as const;

/** The title's photograph at `w`×`h` pixels (the screen's own size): the reference's frame, scaled to fill them, in
 *  TITLE_LOOK (round R8d). */
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

/** A scene's own frame: every scene is drawn for the papers' 480×172. */
const FRAME = { w: 480, h: 172 } as const;

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

const cache = new Map<string, string>();

export type PhotoJob=readonly [scene:SceneId|'headshot',season:SeasonId,variant:number];
/** A photograph's key in the papers' cache and the doors' (round R8d): the season counts only for the street. */
export const photoKey=([scene,season,variant]:PhotoJob)=>`${scene}:${scene==='street'?season:''}:${variant}`;
/** Never replace an already displayed URL. Blob URLs live with this finite page-lifetime cache. */
export function cachePhotoBlob(job:PhotoJob,blob:Blob):void {
  const key=photoKey(job);if(!cache.has(key))cache.set(key,URL.createObjectURL(blob));
}

/**
 * A lead story's photograph: `scene` in `season` (only the street shows it), drawing `variant` — 0 the
 * mockup's own, then mirrored, then reframed closer, each with its patterns shifted by the seed. Drawn the
 * first time it is asked for, then cached.
 */
export function photoUrl(scene: SceneId | 'headshot', season: SeasonId, variant: number): string {
  const key = photoKey([scene,season,variant]);
  const hit = cache.get(key);
  if (hit) return hit;
  const url=photoCanvas(scene,season,variant).toDataURL();
  cache.set(key,url);return url;
}

/** Same drawing and pixels on both paths; only the canvas owner and PNG encoder differ. */
export function photoCanvas(scene:SceneId|'headshot',season:SeasonId,variant:number):HTMLCanvasElement {
  return renderPhotoCanvas(scene,season,variant,t('desk.photo.director'),false);
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

// The worker receives this existing approved label; it does not need the whole prose catalog.
export function renderPhotoCanvas(scene:SceneId|'headshot',season:SeasonId,variant:number,directorLabel:string,offscreen:false):HTMLCanvasElement;
export function renderPhotoCanvas(scene:SceneId|'headshot',season:SeasonId,variant:number,directorLabel:string,offscreen:true):OffscreenCanvas;
export function renderPhotoCanvas(scene:SceneId|'headshot',season:SeasonId,variant:number,directorLabel:string,offscreen:boolean):HTMLCanvasElement|OffscreenCanvas {
  const w = scene === 'headshot' ? 372 : 480;
  const h = scene === 'headshot' ? 504 : 172;
  return halftone(photoDrawing(scene, season, variant, directorLabel), w, h, scene === 'paparazzi' ? RED : scene === 'headshot' ? { ...HEADSHOT, cell: 5.2 } : INK, offscreen);
}

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
