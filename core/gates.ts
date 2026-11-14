// Doors (round R11b, Part C): which stat a door tests first. Derived from its requirement, never from its id: the stat
// among Craft and Hype with the higher minimum leads. A door that asks for neither, or for both the same, leads on none.
// Read-only; ids and numbers only. Used by the option rules.gateSelection = 'craftHype' (core/reducer.ts offerGates).

import type { GateDef } from './content.ts';

export type DoorLead = 'craft' | 'hype';

export function gateLead(gate: Pick<GateDef, 'requires'>): DoorLead | null {
  const craft = gate.requires.craft?.min ?? 0;
  const hype = gate.requires.hype?.min ?? 0;
  if (craft === hype) return null;
  return craft > hype ? 'craft' : 'hype';
}
