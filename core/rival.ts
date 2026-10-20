// The rival's arc (phase 2a; content/press.json rival.arcs): one for the run, fixed by its seed at the start, never
// chosen to contrast the player's. Its own module (round R7, B1): the press reads it for the rival's beats, and the
// events for an event that comes only in some of the rival's years (core/events.ts).

import { yearAwards } from './awards.ts';
import { getEvent, type ContentIndex, type RivalArcDef, type RivalTerms } from './content.ts';
import { deriveSeed } from './rng.ts';
import type { EventRecord } from './state.ts';
import { hashId } from './variants.ts';
import type { YearSubject } from './year.ts';

/** The rival's arc for a run, fixed by the seed at the start — never chosen to contrast the player's. */
export function rivalArc(c: ContentIndex, seed: number): RivalArcDef | null {
  const arcs = c.press?.rival?.arcs ?? [];
  return arcs.length === 0 ? null : (arcs[deriveSeed(seed, hashId('rival')) % arcs.length] ?? null);
}

/**
 * How things stand between the player and Juno (round R8c, D2), from the events answered and their choices' stances:
 * unmet — no rival event answered; cold — any answer against her; warm — two or more with her; neutral — the rest.
 */
export function rivalTerms(s: { readonly content: ContentIndex; readonly eventLog: readonly EventRecord[] }): RivalTerms {
  let met = false;
  let withHer = 0;
  for (const record of s.eventLog) {
    const event = getEvent(s.content, record.eventId);
    if (event?.category !== 'rival') continue;
    met = true;
    const stance = event.choices[record.choice]?.stance;
    if (stance === 'against') return 'cold';
    if (stance === 'with') withHer++;
  }
  return !met ? 'unmet' : withHer >= 2 ? 'warm' : 'neutral';
}

/** A finished year, as her line and her last word read it. */
type NightSubject = YearSubject & { readonly endingId: string | null; readonly seed: number; readonly eventLog: readonly EventRecord[] };

/**
 * Her line on the awards night (round R8c, D4), an i18n key: rival.<arc>.end.<terms>, unmet read as neutral; when her
 * arc has an award, then .won if she took it, or .lost if the player did — her award among the year's. Null: no arc.
 */
export function rivalLine(s: NightSubject): string | null {
  const arc = rivalArc(s.content, s.seed);
  if (!arc) return null;
  const terms = rivalTerms(s);
  const line = `rival.${arc.id}.end.${terms === 'unmet' ? 'neutral' : terms}`;
  return arc.award === undefined ? line : `${line}.${yearAwards(s).includes(arc.award) ? 'lost' : 'won'}`;
}

/** Her last word on the night (round R8c, D5): rival.<arc>.last.<terms>, or null if the player never answered her. */
export function rivalLastWord(s: NightSubject): string | null {
  const arc = rivalArc(s.content, s.seed);
  const terms = rivalTerms(s);
  return arc && terms !== 'unmet' ? `rival.${arc.id}.last.${terms}` : null;
}
