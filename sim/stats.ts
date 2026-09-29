// Small numeric helpers for the report. No dependencies.

export function sum(xs: readonly number[]): number {
  let s = 0;
  for (const x of xs) s += x;
  return s;
}

export function mean(xs: readonly number[]): number {
  return xs.length === 0 ? Number.NaN : sum(xs) / xs.length;
}

/** Linear-interpolated quantile, q in [0, 1]. */
export function quantile(xs: readonly number[], q: number): number {
  if (xs.length === 0) return Number.NaN;
  const s = [...xs].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const a = s[lo] as number;
  const b = s[hi] as number;
  return a + (b - a) * (pos - lo);
}

export const median = (xs: readonly number[]) => quantile(xs, 0.5);

/** Total variation distance between two count vectors over the same categories: 0 = identical, 1 = disjoint. */
export function totalVariation(a: readonly number[], b: readonly number[]): number {
  const na = sum(a);
  const nb = sum(b);
  let d = 0;
  for (let i = 0; i < a.length; i++) d += Math.abs((a[i] as number) / na - (b[i] ?? 0) / nb);
  return d / 2;
}

/** Pearson chi-square test of independence on a 2×k table of counts. */
export function chiSquare2xK(a: readonly number[], b: readonly number[]): { stat: number; df: number; p: number } {
  const na = sum(a);
  const nb = sum(b);
  const n = na + nb;
  let stat = 0;
  let cols = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i] as number;
    const bi = b[i] ?? 0;
    const col = ai + bi;
    if (col === 0) continue;
    cols++;
    const ea = (na * col) / n;
    const eb = (nb * col) / n;
    stat += (ai - ea) ** 2 / ea + (bi - eb) ** 2 / eb;
  }
  const df = cols - 1;
  return { stat, df, p: df > 0 ? gammaQ(df / 2, stat / 2) : 1 };
}

// Regularized upper incomplete gamma Q(a, x), for chi-square p-values (Numerical Recipes §6.2).

const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
  12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
];

function lnGamma(z: number): number {
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
  const x0 = z - 1;
  let x = LANCZOS[0] as number;
  for (let i = 1; i < LANCZOS.length; i++) x += (LANCZOS[i] as number) / (x0 + i);
  const t = x0 + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (x0 + 0.5) * Math.log(t) - t + Math.log(x);
}

function gammaQ(a: number, x: number): number {
  if (x <= 0) return 1;
  const front = Math.exp(-x + a * Math.log(x) - lnGamma(a));
  if (x < a + 1) {
    // Series for P(a, x); Q = 1 - P.
    let ap = a;
    let del = 1 / a;
    let total = del;
    for (let n = 0; n < 1000; n++) {
      ap += 1;
      del *= x / ap;
      total += del;
      if (Math.abs(del) < Math.abs(total) * 1e-15) break;
    }
    return 1 - total * front;
  }
  // Continued fraction for Q(a, x) (modified Lentz).
  const tiny = 1e-300;
  let b = x + 1 - a;
  let c = 1 / tiny;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 1000; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < tiny) d = tiny;
    c = b + an / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-15) break;
  }
  return front * h;
}
