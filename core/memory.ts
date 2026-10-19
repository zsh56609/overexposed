// The next run remembers the last (round R7, Part E). Several runs in, the same events and the same lines came round
// again; a run now starts from a memory of the last: the events the latest earlier run met, and for each group shown
// once a run, the variant last shown. The memory is an input to the run, like its seed — passed to createInitialState
// and kept in GameState — so a replay with the same seed and memory plays the same; with none, a run plays exactly as
// it always has. Where it is kept is the UI's (ui/memory.ts): ids and keys only here.

import type { ContentIndex } from './content.ts';
import { onceIndex, onceItem } from './variants.ts';

export interface RunMemory {
  /** The events the latest earlier run that met any met. The draw leaves them out while anything else is eligible. */
  readonly events: readonly string[];
  /** For each group shown once a run, by its item (core/variants.ts onceItem), the key of the variant last shown. */
  readonly lines: Readonly<Record<string, string>>;
}

/** No memory: a run as runs have always played. */
export const NO_MEMORY: RunMemory = { events: [], lines: {} };

/** Every group shown once a run, by item, with its variants: the opening, the season openers, the doors, the minor endings. */
export function onceGroups(c: ContentIndex): { readonly item: string; readonly keys: readonly string[] }[] {
  const out: { item: string; keys: readonly string[] }[] = [];
  if (c.rules.openingKeys?.length) out.push({ item: onceItem.opening, keys: c.rules.openingKeys });
  (c.rules.actOpenerKeys ?? []).forEach((keys, i) => {
    if (keys.length) out.push({ item: onceItem.opener(i + 1), keys });
  });
  for (const gate of Object.values(c.gates)) if (gate.flavorKeys?.length) out.push({ item: onceItem.gate(gate.id), keys: gate.flavorKeys });
  for (const minor of c.minors) if (minor.textKeys?.length) out.push({ item: onceItem.ending(minor.id), keys: minor.textKeys });
  return out;
}

/** A memory as the content has it now: the events and the variants it no longer has are left out. */
export function memoryFor(c: ContentIndex, memory: RunMemory | undefined): RunMemory {
  if (!memory) return NO_MEMORY;
  const known = new Set(c.events.map((e) => e.id));
  const groups = new Map(onceGroups(c).map((g) => [g.item, g.keys]));
  const lines: Record<string, string> = {};
  for (const [item, key] of Object.entries(memory.lines ?? {})) if (groups.get(item)?.includes(key)) lines[item] = key;
  return { events: [...new Set((memory.events ?? []).filter((id) => known.has(id)))], lines };
}

/**
 * The run's once-a-run lines, settled as it starts (E4): for each group, the variant after the one it last showed, or
 * the seed's own choice if it was never shown — kept all run, so the screen, a preview and a replay read the same.
 */
export function settleLines(c: ContentIndex, seed: number, memory: RunMemory): Readonly<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const { item, keys } of onceGroups(c)) {
    const last = memory.lines[item];
    const shown = last === undefined ? -1 : keys.indexOf(last);
    out[item] = keys[shown >= 0 ? (shown + 1) % keys.length : onceIndex(seed, item, keys.length)] as string;
  }
  return out;
}
