// Which variant of a line the player reads (docs/ui-plan.md §13, decision 15, revised in phase 2a).
// Pure functions of the run seed, an id and a count — never the game RNG, so prose can't move a sim result
// or break a replay. Ids and numbers only.
//
// Within a run, a line group (a card's headlines, a scandal's crystallisation headlines, a scandal's in-hand
// lines) is a shuffle bag: every variant appears once before any repeats, a fresh order each cycle, and never
// the same line twice in a row, even across a reshuffle. Across runs, an item shown once per run (a season
// opener, an ending's text, a gate's flavour, the opening) picks by a hash of the seed and its id, so
// different runs read differently.

import { cursor, deriveSeed, seedRng, shuffleInPlace } from './rng.ts';

/** FNV-1a, 32-bit: a string id as a number to derive seeds from. */
export function hashId(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** The order of `size` variants in one cycle of a group's bag. */
function cycleOrder(seed: number, group: string, cycle: number, size: number): number[] {
  const order = Array.from({ length: size }, (_, i) => i);
  shuffleInPlace(cursor(seedRng(deriveSeed(deriveSeed(seed, hashId(group)), cycle))), order);
  return order;
}

/**
 * The variant index for the `n`-th showing (0-based) of a line group of `size` variants in a run: a seeded
 * permutation of the group, indexed by how many times it has been shown. When a cycle is used up the bag
 * reshuffles with the cycle number in the hash; a new cycle that would open with the variant that closed
 * the last swaps it with its next one.
 */
export function bagIndex(seed: number, group: string, n: number, size: number): number {
  if (size <= 1) return 0;
  const cycle = Math.floor(n / size);
  // Each cycle's swap depends on how the one before really ended, after its own swap: walk them in order.
  let order: number[] = [];
  let last = -1;
  for (let c = 0; c <= cycle; c++) {
    order = cycleOrder(seed, group, c, size);
    if (order[0] === last) [order[0], order[1]] = [order[1] as number, order[0] as number];
    last = order[size - 1] as number;
  }
  return order[n % size] ?? 0;
}

/** The key for the `n`-th showing of a group; null when the group has no variants at all. */
export function bagKey(keys: readonly string[] | undefined, seed: number, group: string, n: number): string | null {
  if (!keys || keys.length === 0) return null;
  return keys[bagIndex(seed, group, n, keys.length)] ?? null;
}

/** The ids of the items shown once per run: what their variant is hashed from, and how validate names them. */
export const onceItem = {
  opener: (act: number): string => `opener:${act}`,
  ending: (minorId: string): string => `ending:${minorId}`,
  gate: (gateId: string): string => `gate:${gateId}`,
  opening: 'opening',
} as const;

/** An item shown once per run: its variant by a hash of the run seed and the item id. */
export function onceIndex(seed: number, item: string, size: number): number {
  return size <= 1 ? 0 : deriveSeed(seed, hashId(item)) % size;
}

export function onceKey(keys: readonly string[] | undefined, seed: number, item: string): string | null {
  if (!keys || keys.length === 0) return null;
  return keys[onceIndex(seed, item, keys.length)] ?? null;
}
