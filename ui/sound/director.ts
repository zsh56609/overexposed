// The queue's beats, heard (round R4, B2 and B4). The director listens to the event queue beside React and plays each
// beat's sound as the beat is shown, so a D7 fast-forward plays none of the skipped beats' sounds: it never sees
// them. It moves the music at its beats too, and when a step's beats are skipped (or there are none, motion off) the
// step's last move happens as the step ends — the music follows the year, heard or not. The sounds the screens make
// themselves (a hover, a stamp, a panel, the phone, the plaques) are theirs; a play's paper, print and pencil are the
// desk's (ui/desk/Papers.tsx, ui/desk/Motion.tsx), as are the numbers' ticks.

import { getCard, getEvent, scandalCount, statTiers, type ContentIndex, type GameEvent, type GameState } from '../../core/index.ts';
import { motionMode } from '../motion.ts';
import type { EventQueue, PlayedStep, Snapshot } from '../queue.ts';
import type { Beat, BeatKind } from '../timeline.ts';
import { cue, music, warm, type Track } from './sound.ts';

const TRACKS: ReadonlySet<string> = new Set<Track>(['spring', 'summer', 'autumn', 'winter', 'scandal', 'awards']);

/** A season's track, by the season content names for the act (rules.seasons); null for a season without one. */
export function seasonTrack(c: ContentIndex, act: number): Track | null {
  const season = c.rules.seasons?.[act - 1];
  return season && TRACKS.has(season) ? (season as Track) : null;
}

/** The music's cross-fades (B4), in ms. */
const FADE = { scandal: 2500, back: 2500, season: 3000, lightsOut: 1200 } as const;

type Resource = Extract<GameEvent, { type: 'resource' }>;

/** The heat tier a state shows (/core's statTiers), with its heat replaced: a number's value as it rolls. */
function heatIndex(s: GameState, heat: number = s.resources.heat): number {
  return statTiers({ ...s, resources: { ...s.resources, heat } }).heat?.index ?? 0;
}

/** Breaking and Frenzy: the tiers whose countdown says a line is crossed (rules.tiers.heat.countdown). */
const pressure = (c: ContentIndex, index: number): boolean => c.rules.tiers?.heat?.countdown?.[index] === 'crossed';

/** Money, heat and the heat line, as a number changes on its beat (one cue each). */
function resourceCues(c: ContentIndex, events: readonly Resource[], before: () => number, after: () => number, beat: string): void {
  const sum = (target: Resource['target']) => events.filter((e) => e.target === target).reduce((n, e) => n + e.delta, 0);
  const money = sum('capital');
  if (money > 0) cue('cash', beat);
  if (money < 0) cue('spend', beat);
  if (sum('heat') > 0) {
    cue('heat', beat);
    const from = before();
    const to = after();
    if (to > from && pressure(c, to)) cue('line', beat);
  }
}

/**
 * A scandal the step prints with an impact (ui/timeline.ts): an event's answer adds it, up to the month going on; a
 * month end's check adds it, before the next month starts.
 */
function prints(step: PlayedStep): boolean {
  const c = step.after.content;
  const events = step.events;
  const scandal = (e: GameEvent) => e.type === 'addCard' && getCard(c, e.cardId)?.kind === 'scandal';
  const chosen = events.findIndex((e) => e.type === 'eventChosen');
  const opens = (from: number, types: readonly string[]) => {
    const i = events.findIndex((e, j) => j >= from && types.includes(e.type));
    return i < 0 ? events.length : i;
  };
  if (chosen >= 0) return events.slice(chosen + 1, opens(chosen + 1, ['draftOffer', 'turnStart'])).some(scandal);
  if (!events.some((e) => e.type === 'turnEnd')) return false;
  return events.slice(0, opens(0, ['turnStart'])).some(scandal);
}

/** Where the music is (B4): the scandal track on, and whether the last month end printed a scandal. */
interface MusicState {
  scandal: boolean;
  printed: boolean;
}

/** A change of track at a beat of its step (the first beat of that kind). */
interface Move {
  readonly at: BeatKind;
  readonly track: Track | null;
  readonly ms: number;
}

/**
 * A step's music (B4), in its order: the scandal track at the first impact; at a month end that printed none, the
 * season's track back at its date beat — not when the season changes there (months 3, 6 and 9 change nothing at
 * the date); a season card brings its season's track, unless the month end before it printed a scandal; the last
 * door fades the music out as the lights go. Advances `m` past the step.
 */
function moves(step: PlayedStep, m: MusicState): Move[] {
  const c = step.after.content;
  const out: Move[] = [];
  const printed = prints(step);
  const monthEnd = step.events.some((e) => e.type === 'turnEnd');
  const ended = step.after.phase === 'ended';
  const season = !!step.before && step.after.act !== step.before.act && !ended;
  if (printed && !m.scandal) {
    out.push({ at: 'impact', track: 'scandal', ms: FADE.scandal });
    m.scandal = true;
  }
  if (monthEnd) {
    if (!printed && m.scandal && !season && !ended && step.before && step.after.turn !== step.before.turn) {
      out.push({ at: 'date', track: seasonTrack(c, step.after.act), ms: FADE.back });
      m.scandal = false;
    }
    m.printed = printed;
  }
  if (season && !(m.scandal && m.printed)) {
    out.push({ at: 'season', track: seasonTrack(c, step.after.act), ms: FADE.season });
    m.scandal = false;
  }
  if (ended) out.push({ at: 'lightsOut', track: null, ms: FADE.lightsOut });
  return out;
}

/** The step being shown, and how much of it has been heard. */
interface Showing {
  readonly step: PlayedStep;
  readonly moves: Move[];
  /** The plan's beats heard so far (index), or the card's ('lift', 'land'). */
  heard: number;
  lift: boolean;
  land: boolean;
}

/** Listens to one run's queue; returns how to stop. */
export function direct(queue: EventQueue): () => void {
  const m: MusicState = { scandal: false, printed: false };
  const done = new Set<number>(queue.getSnapshot().steps.map((s) => s.id));
  let showing: Showing | null = null;
  let skips = queue.getSnapshot().skipped;

  /** A step's music without its beats: its last move, now (motion off, a skip). */
  const last = (list: readonly Move[]) => {
    const move = list.at(-1);
    if (move) music(move.track, move.ms);
  };

  const beatCues = (snap: Snapshot, show: Showing, beat: Beat, index: number) => {
    const { step } = show;
    const c = step.after.content;
    const tag = `${step.id}:${index}:${beat.kind}`;
    switch (beat.kind) {
      case 'endPress':
        cue('button', tag);
        break;
      case 'stamp':
        cue('stamp', tag);
        break;
      case 'resources': {
        const events = beat.resourceEvents ?? [];
        const heat = events.find((e) => e.target === 'heat');
        const base = step.before ?? step.after;
        resourceCues(c, events, () => heatIndex(base, (heat?.value ?? 0) - (heat?.delta ?? 0)), () => heatIndex(base, heat?.value ?? 0), tag);
        break;
      }
      case 'scandalLift':
        cue('paper', tag);
        break;
      case 'impact':
        cue('scandal', tag);
        break;
      case 'sweep': {
        // The month's pile flies to Deck & Discard: one deal for the lot, if anything lies there.
        const played = snap.steps.filter((s) => s.id !== step.id && s.before?.turn === step.before?.turn).reduce((n, s) => n + s.events.filter((e) => e.type === 'play').length, 0);
        const carried = snap.active?.plan?.beats.filter((b) => b.kind === 'scandalCarry').length ?? 0;
        if (played + carried > 0) cue('deal', tag);
        break;
      }
      case 'date':
        cue('month', tag);
        break;
      case 'season':
        cue('season', tag);
        break;
      case 'publish':
        // The papers drop: the new month's onto the old stack, or the first month's onto the desk as the manager signs.
        if (!step.before || step.after.phase === 'ended') break;
        if (step.action?.type === 'CHOOSE_MANAGER' || step.after.turn !== step.before.turn) cue('paper', tag);
        break;
      case 'deal': {
        // The first card dealt after the deck is shuffled riffles it first.
        let shuffled = -1;
        for (let i = 0; i < (beat.event ?? 0); i++) if (step.events[i]?.type === 'shuffle') shuffled = i;
        if (shuffled >= 0 && !step.events.slice(shuffled + 1, beat.event).some((e) => e.type === 'draw')) cue('shuffle', tag);
        cue('deal', tag);
        break;
      }
      case 'eventSend':
        // Your reply goes; a letter's tick makes no sound — its SENT stamp does.
        if (getEvent(c, step.before?.event ?? '')?.form !== 'letter') cue('send', tag);
        break;
      case 'eventReply':
        cue(getEvent(c, step.before?.event ?? '')?.form === 'letter' ? 'stamp' : 'bubble', tag);
        break;
      case 'signAway':
      case 'signedAway':
        cue('pick', tag);
        break;
      default:
        break;
    }
    for (const move of show.moves) {
      if (move.at !== beat.kind) continue;
      // Each move at the first beat of its kind; done once.
      show.moves.splice(show.moves.indexOf(move), 1);
      music(move.track, move.ms);
      break;
    }
  };

  /** A card's play (no plan): it leaves the hand, and lands — with what it did to the numbers and the hand. */
  const cardCues = (show: Showing, beat: BeatKind) => {
    const { step } = show;
    const c = step.after.content;
    if (beat === 'lift' && !show.lift) {
      show.lift = true;
      cue('pick', `${step.id}:lift`);
    }
    if (beat === 'land' && !show.land) {
      show.land = true;
      const tag = `${step.id}:land`;
      cue('land', tag);
      if (step.events.some((e) => e.type === 'exhaust' && getCard(c, e.cardId)?.kind === 'scandal')) cue('clear', tag);
      const before = step.before ?? step.after;
      resourceCues(c, step.events.filter((e): e is Resource => e.type === 'resource'), () => heatIndex(before), () => heatIndex(step.after), tag);
      if (step.events.some((e) => e.type === 'shuffle')) cue('shuffle', tag);
      if (step.events.some((e) => e.type === 'draw')) cue('deal', tag);
    }
  };

  /** The tracks soon needed (B4): the next season's in a season's last month, the scandal track once a scandal is
   * held, the awards track in winter. */
  const warmUp = (s: GameState) => {
    if (s.phase === 'manager' || s.phase === 'ended') return;
    const r = s.content.rules;
    const month = ((s.turn - 1) % r.turnsPerAct) + 1;
    if (month === r.turnsPerAct && s.act !== r.acts) {
      const next = seasonTrack(s.content, s.act + 1);
      if (next) warm(next);
    }
    if (scandalCount(s) !== 0) warm('scandal');
    if (s.act === r.acts) warm('awards');
  };

  const onEmit = () => {
    const snap = queue.getSnapshot();
    const active = snap.active;
    const skipped = snap.skipped !== skips;
    skips = snap.skipped;
    // The step shown has ended — settled, or skipped: whatever music its unheard beats held, now.
    if (showing && active?.step.id !== showing.step.id) {
      last(showing.moves);
      showing = null;
    }
    // Steps applied without beats: their music. A ticket bought (an extra pick, a new offer) has its money's sound as
    // its number rolls (ui/desk/Motion.tsx); one a skip applied, or any with motion off, has none.
    for (const step of snap.steps) {
      if (done.has(step.id) || step.id === active?.step.id) continue;
      done.add(step.id);
      last(moves(step, m));
      if (!skipped && step.action && motionMode() !== 'off') {
        const resources = step.events.filter((e): e is Resource => e.type === 'resource');
        if (resources.length) resourceCues(step.after.content, resources, () => heatIndex(step.before ?? step.after), () => heatIndex(step.after), `${step.id}:apply`);
      }
    }
    if (active) {
      if (!showing) {
        done.add(active.step.id);
        showing = { step: active.step, moves: moves(active.step, m), heard: -1, lift: false, land: false };
      }
      const show = showing;
      if (active.plan) {
        for (let index = show.heard + 1; index <= (active.index ?? -1); index++) {
          const beat = active.plan.beats[index];
          if (beat) beatCues(snap, show, beat, index);
        }
        show.heard = Math.max(show.heard, active.index ?? -1);
      } else cardCues(show, active.beat);
    }
    warmUp(snap.state);
  };
  return queue.subscribe(onEmit);
}
