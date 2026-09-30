// The newspaper photographs (round V1a; README §2 and "Porting"): no image files and no generated images — each
// scene is drawn in greyscale on a canvas, softened, sampled on a 45° grid and printed as dots whose area follows
// the darkness. The drawings are the mockup's (v18) `SCENES`; a scene's variants come from the same drawing
// with a different seed — mirrored, reframed, and its crowds, rain and lights shifted. Each picture is drawn
// the first time a paper needs it and cached as a data URL for the rest of the run.

import type { SceneId, SeasonId } from '../../core/index.ts';
import { t } from '../i18n.ts';

type G = CanvasRenderingContext2D;
type Drawing = (g: G, w: number, h: number, o: SceneOptions) => void;
interface SceneOptions {
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
  pose?: 'stand' | 'mic' | 'guitar' | 'hip' | 'block';
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
  } else {
    arm([9, -74], [11, -58], [10, -44]);
    arm([-9, -74], [-11, -58], [-10, -44]);
  }
}

/** The mockup's eight scenes and the headshot, with `off` shifting their repeating patterns. */
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
    const label = t('desk.photo.director');
    const tw = Math.min(46, g.measureText(label).width);
    if (o.flip) {
      g.save();
      g.translate(dx - 23 + tw, dy - 66);
      g.scale(-1, 1);
      g.fillText(label, 0, 0, 46);
      g.restore();
    } else g.fillText(label, dx - 23, dy - 66, 46);
  },
  street(g, w, h, o) {
    const season = o.season;
    const sky: [number, string][] =
      season === 'summer'
        ? [
            [0, '#fff'],
            [1, '#dcdcdc'],
          ]
        : season === 'winter'
          ? [
              [0, '#bdbdbd'],
              [1, '#d8d8d8'],
            ]
          : [
              [0, '#8a8a8a'],
              [1, '#b0b0b0'],
            ];
    g.fillStyle = lg(g, 0, 0, 0, h * 0.6, sky);
    g.fillRect(0, 0, w, h);
    if (season === 'summer') glow(g, w * 0.86, h * 0.16, h * 0.55, 1);
    const B: [number, number, number][] = [
      [0, 0.18, 0.2],
      [0.2, 0.1, 0.17],
      [0.37, 0.22, 0.15],
      [0.52, 0.08, 0.2],
      [0.72, 0.16, 0.28],
    ];
    B.forEach(([x, t0, wd], i) => {
      const top = t0 + ((((i + o.off) * 3) % 5) - 2) * 0.02;
      g.fillStyle = '#3a3a3a';
      g.fillRect(w * x, h * top, w * wd, h * (0.7 - top));
      g.fillStyle = season === 'winter' ? '#f4f4f4' : '#5a5a5a';
      g.fillRect(w * x, h * top, w * wd, 4);
      g.fillStyle = '#cfcfcf';
      for (let yy = h * top + 10; yy < h * 0.5; yy += 14) for (let xx = w * x + 6; xx < w * (x + wd) - 8; xx += 13) g.fillRect(xx, yy, 6, 8);
      g.fillStyle = '#1e1e1e';
      g.fillRect(w * x + 4, h * 0.52, w * wd - 8, h * 0.18);
      g.fillStyle = '#8a8a8a';
      g.beginPath();
      g.moveTo(w * x + 2, h * 0.52);
      g.lineTo(w * (x + wd) - 2, h * 0.52);
      g.lineTo(w * (x + wd) + 4, h * 0.58);
      g.lineTo(w * x - 4, h * 0.58);
      g.closePath();
      g.fill();
    });
    g.fillStyle = season === 'winter' ? '#f0f0f0' : season === 'summer' ? '#d8d8d8' : '#a8a8a8';
    g.fillRect(0, h * 0.7, w, h * 0.3);
    const bx = w * 0.44;
    const by = h * 0.9;
    g.fillStyle = '#5c5c5c';
    g.fillRect(bx, by - h * 0.4, w * 0.34, h * 0.36);
    g.fillStyle = '#e6e6e6';
    for (let i = 0; i < 7; i++) {
      g.fillRect(bx + 8 + i * 19, by - h * 0.36, 14, 11);
      g.fillRect(bx + 8 + i * 19, by - h * 0.21, 14, 11);
    }
    g.fillStyle = '#0a0a0a';
    g.beginPath();
    g.arc(bx + 26, by - 2, 9, 0, 6.2832);
    g.arc(bx + w * 0.34 - 26, by - 2, 9, 0, 6.2832);
    g.fill();
    g.fillStyle = season === 'winter' ? '#fafafa' : '#444';
    g.fillRect(bx, by - h * 0.41, w * 0.34, 3);
    g.fillStyle = '#0a0a0a';
    g.fillRect(w * 0.36, h * 0.3, 3, h * 0.62);
    g.beginPath();
    g.ellipse(w * 0.36 + 1, h * 0.3, 8, 4, 0, 0, 6.2832);
    g.fill();
    if (season === 'winter') glow(g, w * 0.36, h * 0.32, 20, 0.9);
    const walkers: [number, number][] = [
      [0.1, 0.99],
      [0.2, 0.97],
      [0.86, 0.99],
      [0.95, 0.97],
    ];
    walkers.forEach(([px0, py], i) => {
      const px = px0 + ((((i + o.off) * 5) % 3) - 1) * 0.02;
      fig(g, w * px, h * py, h * 0.46, { fill: '#0c0c0c', dress: season === 'winter' ? 'coat' : 'legs', hat: season === 'winter' });
      if (season === 'spring' || season === 'autumn') {
        g.fillStyle = '#0c0c0c';
        g.beginPath();
        g.arc(w * px, h * py - h * 0.46, h * 0.15, Math.PI, 0);
        g.fill();
        g.fillRect(w * px - 1, h * py - h * 0.46, 2, h * 0.12);
      }
    });
    if (season === 'spring') {
      g.strokeStyle = 'rgba(255,255,255,.6)';
      g.lineWidth = 1.2;
      for (let i = 0; i < 110; i++) {
        const x = ((i + o.off * 13) * 41) % w;
        const y = ((i + o.off * 7) * 29) % h;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x - 4, y + 11);
        g.stroke();
      }
    }
    if (season === 'autumn') {
      g.fillStyle = '#1a1a1a';
      for (let i = 0; i < 34; i++) {
        g.save();
        g.translate(((i + o.off * 11) * 67) % w, ((i + o.off * 5) * 37) % (h * 0.75));
        g.rotate(i);
        g.beginPath();
        g.ellipse(0, 0, 3.4, 1.6, 0, 0, 6.2832);
        g.fill();
        g.restore();
      }
    }
    if (season === 'winter') {
      g.fillStyle = '#fff';
      for (let i = 0; i < 130; i++) {
        g.beginPath();
        g.arc(((i + o.off * 17) * 43) % w, ((i + o.off * 9) * 31) % h, 1.8, 0, 6.2832);
        g.fill();
      }
    }
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
function halftone(draw: (g: G, w: number, h: number) => void, w: number, h: number, o: { ink: string; paper: string; cell?: number }): string {
  const cell = o.cell ?? 5.4;
  const src = document.createElement('canvas');
  src.width = w;
  src.height = h;
  const g = src.getContext('2d') as G;
  g.fillStyle = '#fff';
  g.fillRect(0, 0, w, h);
  draw(g, w, h);
  const lum = soften(g.getImageData(0, 0, w, h).data, w, h);
  const L = (x: number, y: number): number => lum[Math.max(0, Math.min(h - 1, y | 0)) * w + Math.max(0, Math.min(w - 1, x | 0))] as number;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
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
  return out.toDataURL();
}

const cache = new Map<string, string>();

/**
 * A lead story's photograph: `scene` in `season` (only the street shows it), drawing `variant` — 0 the
 * mockup's own, then mirrored, then reframed closer, each with its patterns shifted by the seed. Drawn the
 * first time it is asked for, then cached.
 */
export function photoUrl(scene: SceneId | 'headshot', season: SeasonId, variant: number): string {
  const key = `${scene}:${scene === 'street' ? season : ''}:${variant}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const r = mulberry(variant * 7919 + scene.length * 131 + 17);
  const flip = variant % 3 === 1;
  const zoom = variant % 3 === 2 ? 1.14 + r() * 0.08 : 1;
  const opts: SceneOptions = { season, off: variant * 5, flip };
  const w = scene === 'headshot' ? 372 : 480;
  const h = scene === 'headshot' ? 504 : 172;
  const url = halftone(
    (g, W, H) => {
      if (flip) {
        g.translate(W, 0);
        g.scale(-1, 1);
      }
      if (zoom !== 1) {
        // Closer in, about a point the seed picks near the middle.
        const fx = W * (0.4 + r() * 0.2);
        const fy = H * (0.35 + r() * 0.2);
        g.translate(fx, fy);
        g.scale(zoom, zoom);
        g.translate(-fx, -fy);
      }
      SCENES[scene](g, W, H, opts);
    },
    w,
    h,
    scene === 'paparazzi' ? RED : scene === 'headshot' ? { ...HEADSHOT, cell: 5.2 } : INK,
  );
  cache.set(key, url);
  return url;
}
