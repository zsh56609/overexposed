import { CoreError, getCard, type Condition, type ContentIndex, type FlagTest, type Range, type Resources } from './content.ts';
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
