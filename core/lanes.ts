// Career lanes (docs/design/content-expansion.md §2): music, screen, celebrity. The player never picks one;
// it is read from the cards they played — the résumé is what you did, not what you held. Neutral cards
// (utility: draws, heat relief, scandal removal) never count, and neither, by default, does the starting
// deck every run shares (rules.laneStartingDeck): the lane is the career built from it. Read-only; ids
// and numbers only.

import { getCard, type ContentIndex } from './content.ts';

interface LaneSubject {
  readonly content: ContentIndex;
  readonly careerPlays: Readonly<Record<string, number>>;
}

/** Plays per lane, in rules.lanes order. Neutral cards and scandals are not counted. */
export function lanePlays(s: LaneSubject): Readonly<Record<string, number>> {
  const lanes = s.content.rules.lanes ?? [];
  const plays: Record<string, number> = Object.fromEntries(lanes.map((lane) => [lane, 0]));
  for (const [cardId, n] of Object.entries(s.careerPlays)) {
    const lane = getCard(s.content, cardId)?.lane;
    if (lane !== undefined && Object.hasOwn(plays, lane)) plays[lane] = (plays[lane] ?? 0) + n;
  }
  return plays;
}

/** Each lane's share of the career plays, 0..1, summing to 1 — all 0 before any career card is played. */
export function laneShares(s: LaneSubject): Readonly<Record<string, number>> {
  const plays = lanePlays(s);
  const total = Object.values(plays).reduce((a, b) => a + b, 0);
  return Object.fromEntries(Object.entries(plays).map(([lane, n]) => [lane, total === 0 ? 0 : n / total]));
}

/**
 * Whether a lane establishes itself: it is the current lane, with rules.laneEstablished's minimum plays and
 * its margin over the next lane. A single play never establishes a lane.
 */
function establishes(s: LaneSubject): string | null {
  const rule = s.content.rules.laneEstablished;
  const lane = currentLane(s);
  if (lane === null || !rule) return lane;
  const plays = lanePlays(s);
  const top = plays[lane] ?? 0;
  const next = Math.max(0, ...Object.entries(plays).filter(([l]) => l !== lane).map(([, n]) => n));
  return top >= rule.minPlays && top - next >= rule.lead ? lane : null;
}

/**
 * The established lane after a play, given the one before it (hysteresis, round 2b): a lane once
 * established stays established while it still leads, by any margin; it changes only when another lane
 * takes the lead and itself meets the establishing threshold; a lane that stops leading without another
 * establishing itself falls back to early (null). For display only — the press subject, the managers, the
 * vanity's props; endings keep reading currentLane.
 */
export function nextEstablishedLane(s: LaneSubject, previous: string | null): string | null {
  if (previous !== null) {
    const plays = lanePlays(s);
    const mine = plays[previous] ?? 0;
    const others = Math.max(0, ...Object.entries(plays).filter(([l]) => l !== previous).map(([, n]) => n));
    if (mine > others) return previous;
  }
  return establishes(s);
}

/**
 * The established lane through a run, step by step (hysteresis needs the path, so it is read from history):
 * the lane after each step. Only a play moves career plays, so only a play can move it.
 */
export function establishedLanes(history: readonly { readonly after: LaneSubject }[]): (string | null)[] {
  let lane: string | null = null;
  return history.map((step) => (lane = nextEstablishedLane(step.after, lane)));
}

/** The lane with the most plays. A tie resolves to the earlier lane in rules.lanes: music, the base. */
export function currentLane(s: LaneSubject): string | null {
  const plays = lanePlays(s);
  let best: string | null = null;
  for (const lane of s.content.rules.lanes ?? []) {
    if (best === null || (plays[lane] ?? 0) > (plays[best] ?? 0)) best = lane;
  }
  return best;
}
