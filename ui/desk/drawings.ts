// Small drawings for the desk's props (round V1a; README §4), ported from the mockup (v18): the two sheets of
// music and the crumpled paper balls. Each returns SVG markup; the words in it come escaped from the adapter.

import type { DeskLabels } from './model.ts';

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function staff(y0: number): string {
  let s = '';
  for (let i = 0; i < 5; i++) {
    const y = y0 + i * 4;
    s += `<line x1="8" y1="${y}" x2="162" y2="${y}"/>`;
  }
  s += `<line x1="8" y1="${y0}" x2="8" y2="${y0 + 16}"/><line x1="92" y1="${y0}" x2="92" y2="${y0 + 16}"/><line x1="161" y1="${y0}" x2="161" y2="${y0 + 16}"/><line x1="163" y1="${y0}" x2="163" y2="${y0 + 16}" stroke-width="1.4"/>`;
  return `<g stroke="#2a241c" stroke-width=".6">${s}</g>`;
}
const clef = (y0: number): string =>
  `<path transform="translate(10,${y0 - 9}) scale(.53)" d="M13 58 C10 60 7 58 8 55 C9 53 12 53 12.5 55.5 M12 55 L14.5 8 C15 4 19 3.5 19 8 C19 13 11 17 9 25 C7 33 10 40 15 40 C20 40 21 33 16.5 31 C12.5 29.5 10.5 34 13 36.5" fill="none" stroke="#15120E" stroke-width="2.3" stroke-linecap="round"/>`;
const nt = (x: number, y: number, h = false): string =>
  `<ellipse cx="${x}" cy="${y}" rx="2.7" ry="1.95" transform="rotate(-20 ${x} ${y})" fill="${h ? '#f6f1e4' : '#15120E'}" stroke="#15120E" stroke-width="${h ? 0.85 : 0}"/><line x1="${x + 2.45}" y1="${y - 0.4}" x2="${x + 2.45}" y2="${y - 12}" stroke="#15120E" stroke-width=".8"/>`;
const rest = (x: number, y: number): string =>
  `<path d="M${x} ${y - 7} l2.6 3 -2.2 2.6 2.8 3.4 c-1.6-.8-3 -.2-2.4 1.6" fill="none" stroke="#15120E" stroke-width="1.1" stroke-linejoin="round"/>`;
const time = (y: number, top: string, bottom: string): string =>
  `<text x="27" y="${y + 7.6}" font-family="Playfair Display,serif" font-weight="900" font-size="8.5">${top}</text><text x="27" y="${y + 15.6}" font-family="Playfair Display,serif" font-weight="900" font-size="8.5">${bottom}</text>`;

/** The first sheet: two staves in four-four. */
export function sheetA(): string {
  const a = 22;
  const b = 66;
  let s = '<svg viewBox="0 0 170 118" width="170" height="118"><rect width="170" height="118" fill="#f6f1e4"/>';
  s += staff(a) + clef(a) + time(a, '4', '4');
  for (const [x, y] of [
    [42, 34],
    [54, 30],
    [66, 28],
    [78, 32],
  ] as const)
    s += nt(x, y);
  s += nt(100, 30) + nt(110, 28) + '<line x1="102.4" y1="18" x2="112.4" y2="16" stroke="#15120E" stroke-width="1.7"/>' + nt(126, 26) + nt(146, 30, true);
  s += staff(b) + clef(b);
  for (const [x, y] of [
    [40, 76],
    [52, 72],
    [64, 74],
    [78, 70],
  ] as const)
    s += nt(x, y);
  s += nt(102, 74) + nt(118, 78, true) + nt(140, 72) + nt(152, 76);
  return s + '</svg>';
}

/** The second, a different page: the bridge in three-four, a dynamic and a pencilled note. */
export function sheetB(words: DeskLabels['sheet']): string {
  const a = 26;
  const b = 70;
  let s = '<svg viewBox="0 0 170 118" width="170" height="118"><rect width="170" height="118" fill="#f3ecd8"/>';
  s += `<text x="85" y="12" text-anchor="middle" font-family="Playfair Display,serif" font-style="italic" font-size="7.5" fill="#2a241c">${esc(words.bridge)}</text>`;
  s += staff(a) + clef(a) + time(a, '3', '4');
  s += nt(44, 38, true) + nt(60, 34) + nt(71, 32) + nt(82, 36) + '<path d="M58 42 Q70 48 84 42" fill="none" stroke="#15120E" stroke-width=".8"/>';
  s += rest(100, a + 10) + nt(112, 30) + nt(124, 28) + nt(138, 32) + nt(148, 30) + '<line x1="140.4" y1="20" x2="150.4" y2="18" stroke="#15120E" stroke-width="1.7"/>';
  s += staff(b) + clef(b) + nt(42, 78, true) + nt(58, 74) + nt(70, 76) + rest(84, b + 10) + nt(104, 80) + nt(116, 76, true) + nt(138, 72) + nt(152, 74);
  s += `<text x="38" y="${b + 27}" font-family="Playfair Display,serif" font-style="italic" font-weight="900" font-size="8" fill="#15120E">${esc(words.dynamic)}</text>`;
  s += `<ellipse cx="111" cy="${b + 8}" rx="17" ry="12.5" fill="none" stroke="#8b8476" stroke-width=".8" opacity=".8"/><text x="120" y="${b - 7}" transform="rotate(-6 120 ${b - 7})" font-family="Georgia,serif" font-style="italic" font-size="6.8" fill="#7d776a">${esc(words.breathe)}</text>`;
  return s + '</svg>';
}

// ---------------------------------------------------------------------------
// Crumpled paper (the mockup's crumple()): a faceted ball, lit from the top left, a different shape per seed.

function mulberry(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let q = Math.imul(a ^ (a >>> 15), 1 | a);
    q = (q + Math.imul(q ^ (q >>> 7), 61 | q)) ^ q;
    return ((q ^ (q >>> 14)) >>> 0) / 4294967296;
  };
}
interface P3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly a: number;
}
function ring(r: () => number, n: number, rad: number, zlo: number, zhi: number, jit: number, cx: number, cy: number, sq: number): P3[] {
  const pts: P3[] = [];
  const off = r() * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const a = off + (i / n) * Math.PI * 2 + (r() - 0.5) * jit;
    const rr = rad * (0.8 + r() * 0.34);
    pts.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr * sq, z: zlo + r() * (zhi - zlo), a: Math.atan2(Math.sin(a) * sq, Math.cos(a)) });
  }
  return pts.sort((p, q) => p.a - q.a);
}
function strip(A: P3[], B: P3[]): P3[][] {
  const T: P3[][] = [];
  let i = 0;
  let j = 0;
  const m = A.length;
  const n = B.length;
  while (i < m || j < n) {
    const a = A[i % m] as P3;
    const b = B[j % n] as P3;
    const na = A[(i + 1) % m] as P3;
    const nb = B[(j + 1) % n] as P3;
    const aA = i < m ? (A[(i + 1) % m] as P3).a + (i + 1 >= m ? 2 * Math.PI : 0) : Infinity;
    const aB = j < n ? (B[(j + 1) % n] as P3).a + (j + 1 >= n ? 2 * Math.PI : 0) : Infinity;
    if (aA <= aB && i < m) {
      T.push([a, na, b]);
      i++;
    } else {
      T.push([a, nb, b]);
      j++;
    }
  }
  return T;
}
function shade(t: P3[], R: number): string {
  const P = t.map((p) => [p.x, p.y, p.z * R] as const);
  const [p0, p1, p2] = P as [readonly [number, number, number], readonly [number, number, number], readonly [number, number, number]];
  const u = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]] as const;
  const v = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]] as const;
  let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  if ((n[2] as number) < 0) n = n.map((x) => -x);
  const L = Math.hypot(...n);
  n = n.map((x) => x / L);
  const l = [-0.45, -0.55, 0.7];
  const d = Math.max(0, ((n[0] as number) * (l[0] as number) + (n[1] as number) * (l[1] as number) + (n[2] as number) * (l[2] as number)) / Math.hypot(...l));
  const g = Math.round(150 + 105 * Math.pow(d, 0.8));
  return `rgb(${g},${g - 3},${g - 9})`;
}

export function crumple(seed: number, w: number, h: number): string {
  const r = mulberry(seed);
  const cx = w / 2;
  const cy = h / 2 - 2;
  const R = Math.min(w, h) / 2 - 3;
  const sq = 0.88;
  const O = ring(r, 15, R, 0, 0.2, 0.35, cx, cy, sq);
  const M = ring(r, 10, R * 0.6, 0.45, 0.85, 0.5, cx, cy, sq);
  const I = ring(r, 5, R * 0.26, 0.8, 1, 0.7, cx, cy, sq);
  const C: P3 = { x: cx + (r() - 0.5) * R * 0.2, y: cy + (r() - 0.5) * R * 0.2, z: 1, a: 0 };
  const tris = [...strip(O, M), ...strip(M, I)];
  for (let i = 0; i < I.length; i++) tris.push([I[i] as P3, I[(i + 1) % I.length] as P3, C]);
  let poly = '';
  let edges = '';
  for (const t of tris) {
    const f = shade(t, R);
    poly += `<polygon points="${t.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}" fill="${f}" stroke="${f}" stroke-width=".5" stroke-linejoin="round"/>`;
    if (r() < 0.18) edges += `<line x1="${(t[0] as P3).x.toFixed(1)}" y1="${(t[0] as P3).y.toFixed(1)}" x2="${(t[1] as P3).x.toFixed(1)}" y2="${(t[1] as P3).y.toFixed(1)}"/>`;
  }
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="overflow:visible"><ellipse cx="${cx + 1}" cy="${cy + R * 0.76}" rx="${R * 0.76}" ry="${R * 0.16}" fill="rgba(0,0,0,.64)" style="filter:blur(1.3px)"/>${poly}<g stroke="rgba(255,255,255,.55)" stroke-width=".6">${edges}</g></svg>`;
}
