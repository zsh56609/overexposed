// Round R11b, Part D: the configurations the survey compares. Each is the content with a few rules switched on — the
// options of round R11b (rules.events.rideAlong / months / memoryDepth, rules.gateSelection) and, for the doors, the
// sim-only placeholder doors (sim/options/doors.ts). With no configuration the content is v1.0's, untouched.

import type { Content } from '../../core/index.ts';
import { withPlaceholderDoors } from './doors.ts';

const EVEN = [2, 4, 6, 8, 10, 12];
const SIX_MORE = [2, 4, 5, 6, 8, 9, 10, 11, 12];
const ALL = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export interface EventConfig { readonly rideAlong: boolean; readonly months: readonly number[]; readonly depth: number }
export const EVENT_CONFIGS: Readonly<Record<string, EventConfig>> = {
  E0: { rideAlong: false, months: EVEN, depth: 1 },
  E1: { rideAlong: true, months: EVEN, depth: 1 },
  E2: { rideAlong: true, months: EVEN, depth: 2 },
  E3: { rideAlong: true, months: SIX_MORE, depth: 1 },
  E4: { rideAlong: true, months: SIX_MORE, depth: 2 },
  E5: { rideAlong: true, months: ALL, depth: 2 },
};

export interface DoorConfig { readonly placeholders: boolean; readonly selection: 'any' | 'craftHype' }
export const DOOR_CONFIGS: Readonly<Record<string, DoorConfig>> = {
  D0: { placeholders: false, selection: 'any' },
  D1: { placeholders: true, selection: 'any' },
  D2: { placeholders: true, selection: 'craftHype' },
};

/** The content under an event configuration and a door configuration. E0 and D0 return v1.0's content as it is. */
export function configure(content: Content, eventConfig: string, doorConfig: string): Content {
  const e = EVENT_CONFIGS[eventConfig];
  const d = DOOR_CONFIGS[doorConfig];
  if (!e || !d) throw new Error(`unknown configuration ${eventConfig}/${doorConfig}`);
  let out = content;
  if (e.rideAlong || e.depth !== 1 || e.months.join() !== EVEN.join()) {
    const events = { ...content.rules.events!, months: e.months, ...(e.rideAlong ? { rideAlong: true } : {}), ...(e.depth !== 1 ? { memoryDepth: e.depth } : {}) };
    out = { ...out, rules: { ...out.rules, events } };
  }
  if (d.placeholders) out = withPlaceholderDoors(out);
  if (d.selection !== 'any') out = { ...out, rules: { ...out.rules, gateSelection: d.selection } };
  return out;
}
