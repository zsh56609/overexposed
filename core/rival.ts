// The rival's arc (phase 2a; content/press.json rival.arcs): one for the run, fixed by its seed at the start, never
// chosen to contrast the player's. Its own module (round R7, B1): the press reads it for the rival's beats, and the
// events for an event that comes only in some of the rival's years (core/events.ts).

import type { ContentIndex, RivalArcDef } from './content.ts';
import { deriveSeed } from './rng.ts';
import { hashId } from './variants.ts';

/** The rival's arc for a run, fixed by the seed at the start — never chosen to contrast the player's. */
export function rivalArc(c: ContentIndex, seed: number): RivalArcDef | null {
  const arcs = c.press?.rival?.arcs ?? [];
  return arcs.length === 0 ? null : (arcs[deriveSeed(seed, hashId('rival')) % arcs.length] ?? null);
}
