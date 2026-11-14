// Round R11b, Part C3: placeholder doors for the simulation only. The game build never imports /sim, and the placeholders
// have no prose of their own: each takes its sibling's name key and flavour keys, so nothing here is player-facing text.
// They exist to exercise a season that holds more doors than it offers, and the repeat rates that follows — not to be
// balanced. Each is a variation on the sibling it follows: the same effects, a requirement on the sibling's main stat
// within about 20% of the sibling's, and a different second condition.

import type { Condition, Content, GateDef } from '../../core/index.ts';
import { gateLead } from '../../core/index.ts';

/** Per sibling door: the placeholder's requirement. Sibling's main stat → placeholder's, and the second condition it gets instead. */
export const PLACEHOLDER_DOORS: Readonly<Record<string, Condition>> = {
  // season 1
  gate_audition: { craft: { min: 15 }, scandalCount: { max: 2 } }, // craft 18 → 15 (-17%)
  gate_showcase: { hype: { min: 20 }, capital: { min: 2 } }, // hype 17 → 20 (+18%)
  // season 2
  gate_festival: { hype: { min: 30 }, craft: { min: 10 } }, // hype 35 → 30 (-14%)
  gate_session_work: { craft: { min: 38 }, scandalCount: { max: 3 } }, // craft 33 → 38 (+15%)
  // season 3
  gate_label_deal: { hype: { min: 45 }, craft: { min: 15 } }, // hype 50 → 45 (-10%); capital 4 → craft 15; still signs the label
  gate_residency: { craft: { min: 34 }, capital: { min: 3 } }, // craft 30 → 34 (+13%); hype 15 & scandals ≤ 4 → capital 3
  // season 4
  gate_arena_tour: { hype: { min: 58 }, scandalCount: { max: 5 } }, // hype 64 → 58 (-9%); needs no label
  gate_award_show: { craft: { min: 42 }, capital: { min: 3 } }, // craft 47 → 42 (-11%); hype 30 & scandals ≤ 6 → capital 3
};

/** The content with two placeholder doors a season (one Craft-led, one Hype-led): each season then holds 4 doors. */
export function withPlaceholderDoors(content: Content): Content {
  const extra: GateDef[] = [];
  for (const sibling of content.gates) {
    const requires = PLACEHOLDER_DOORS[sibling.id];
    if (!requires) continue;
    const lead = gateLead({ requires });
    if (lead === null || lead !== gateLead(sibling)) throw new Error(`placeholder for ${sibling.id} must lead on ${gateLead(sibling)}, leads on ${lead}`);
    extra.push({ ...sibling, id: `${sibling.id}_alt`, requires });
  }
  return { ...content, gates: [...content.gates, ...extra] };
}
