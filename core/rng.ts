// Seeded PRNG: xorshift128 (Marsaglia 2003), seeded through a murmur3-style mixer.
// The generator state is four plain uint32s that live in GameState, so a run replays
// exactly from its seed. This is the only source of randomness in the project.

export type RngState = readonly [number, number, number, number];

/** Mutable working copy of RngState. Only a reducer's private draft holds one. */
export type RngCursor = [number, number, number, number];

/** Avalanche one uint32 (murmur3 fmix32). */
function mix32(x: number): number {
  let z = x >>> 0;
  z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
  z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
  return (z ^ (z >>> 16)) >>> 0;
}

export function seedRng(seed: number): RngState {
  const base = seed >>> 0;
  const a = mix32(base + 0x9e3779b9);
  const b = mix32(base + 0x3c6ef372);
  const c = mix32(base + 0xdaa66d2b);
  const d = mix32(base + 0x78dde6e4);
  // xorshift128 must never have an all-zero state.
  return (a | b | c | d) === 0 ? [1, b, c, d] : [a, b, c, d];
}

/** Combine two numbers into a new uint32 seed (e.g. batch seed + run index). */
export function deriveSeed(seed: number, salt: number): number {
  return mix32((seed >>> 0) ^ mix32(Math.imul(salt >>> 0, 0x9e3779b9) + 0x632be5ab));
}

export function cursor(state: RngState): RngCursor {
  return [state[0], state[1], state[2], state[3]];
}

export function nextU32(c: RngCursor): number {
  let t = c[3];
  const s = c[0];
  c[3] = c[2];
  c[2] = c[1];
  c[1] = s;
  t ^= t << 11;
  t ^= t >>> 8;
  c[0] = (t ^ s ^ (s >>> 19)) >>> 0;
  return c[0];
}

/** Uniform integer in [0, n). */
export function nextInt(c: RngCursor, n: number): number {
  return Math.floor((nextU32(c) / 4294967296) * n);
}

/** Fisher–Yates, in place. */
export function shuffleInPlace<T>(c: RngCursor, items: T[]): void {
  for (let i = items.length - 1; i > 0; i--) {
    const j = nextInt(c, i + 1);
    const tmp = items[i] as T;
    items[i] = items[j] as T;
    items[j] = tmp;
  }
}
