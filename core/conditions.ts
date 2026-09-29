import {
  CoreError,
  getCard,
  heatThreshold,
  thresholdFloor,
  type Condition,
  type ContentIndex,
  type FlagTest,
  type Range,
  type Resources,
} from './content.ts';
import type { CardInstance } from './state.ts';

/** The read-only slice of state a condition can see. GameState and the reducer's Draft both satisfy it. */
export interface ConditionSubject {
  readonly strict: boolean;
  readonly content: ContentIndex;
  readonly act: number;
  readonly turn: number;
  readonly resources: Resources;
  readonly flags: Readonly<Record<string, true>>;
  readonly deck: readonly CardInstance[];
  readonly hand: readonly CardInstance[];
  readonly discard: readonly CardInstance[];
}

/** Scandal cards currently owned: deck + hand + discard. Exhausted scandals are gone. */
export function scandalCount(s: ConditionSubject): number {
  let n = 0;
  for (const zone of [s.deck, s.hand, s.discard]) {
    for (const card of zone) if (getCard(s.content, card.cardId)?.kind === 'scandal') n++;
  }
  return n;
}

/**
 * The heat threshold in force right now: the act's base minus degradePerScandal for every scandal
 * held, never below the act's thresholdFloor. Removing a scandal buys the threshold back. The floor
 * tightens act by act, so the late acts are where a pile of scandals bites hardest.
 */
export function effectiveHeatThreshold(s: ConditionSubject): number {
  const rules = s.content.rules;
  return Math.max(thresholdFloor(rules, s.act), heatThreshold(rules, s.act) - scandalCount(s) * rules.degradePerScandal);
}

/**
 * What the heat meter shows (CLAUDE.md §2, frozen): whole points of heat still to go before the
 * end-of-turn check makes one more scandal, and how many it would make if the turn ended now. The
 * effective threshold itself can be fractional (4.5) and is never shown to the player. Computed from
 * the state as it stands: onEndOfTurn effects still to fire this turn can move it.
 */
export function heatOutlook(s: ConditionSubject): { readonly scandalsIfTurnEndedNow: number; readonly heatToNextScandal: number } {
  const threshold = effectiveHeatThreshold(s);
  const heat = s.resources.heat;
  const scandalsIfTurnEndedNow = Math.floor(heat / threshold);
  // The next line sits at threshold × (n + 1); heat is whole, so the first heat that crosses it is its ceiling.
  const nextLine = threshold * (scandalsIfTurnEndedNow + 1);
  return { scandalsIfTurnEndedNow, heatToNextScandal: Math.max(1, Math.ceil(nextLine - 1e-9) - heat) };
}

function inRange(value: number, range: Range): boolean {
  return (range.min === undefined || value >= range.min) && (range.max === undefined || value <= range.max);
}

function flagsHold(flags: Readonly<Record<string, true>>, test: FlagTest): boolean {
  const has = (f: string) => Object.hasOwn(flags, f);
  if (test.all && !test.all.every(has)) return false;
  if (test.any && !test.any.some(has)) return false;
  if (test.not && test.not.some(has)) return false;
  return true;
}

/** An absent condition always holds. Every key present must hold. */
export function evaluate(condition: Condition | undefined, s: ConditionSubject): boolean {
  if (!condition) return true;
  for (const key of Object.keys(condition)) {
    let ok: boolean;
    switch (key) {
      case 'hype':
      case 'craft':
      case 'capital':
      case 'heat':
        ok = inRange(s.resources[key], condition[key] ?? {});
        break;
      case 'scandalCount':
        ok = inRange(scandalCount(s), condition.scandalCount ?? {});
        break;
      case 'act':
        ok = inRange(s.act, condition.act ?? {});
        break;
      case 'turn':
        ok = inRange(s.turn, condition.turn ?? {});
        break;
      case 'flags':
        ok = flagsHold(s.flags, condition.flags ?? {});
        break;
      default:
        // An unknown key never silently passes: a typo like "crat" must not unlock an ending.
        if (s.strict) throw new CoreError('unknownConditionKey', key);
        ok = false;
    }
    if (!ok) return false;
  }
  return true;
}
