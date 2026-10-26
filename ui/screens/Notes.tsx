// The manager's notes (round R8b, Part B; README §9): seven short notes in the manager's hand, each at the moment it
// matters in a new player's first year — the stat bar on the first hand, then the bulbs (round R9b, A2: a new player's
// first month has no offers), the countdown after heat rises, the season's doors after a play (R9b, A4), END TURN once
// the bulbs are spent, the mirror at the next month's hand, a scandal in the hand.
// One at a time, never in the way: the layer takes no click but the note's, a preview over a note fades it, a panel
// hides it. The first time each shows, the eye is drawn to it: a veil with two holes and the target's glow. Every
// moment is read from the steps' GameEvents and the desk's model, never by comparing state here. App renders this
// layer in its runs only (unseeded, or with ?notes=1); the dev pages that render the desk never show it.

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { getCard, type GameState } from '../../core/index.ts';
import { CARD_W, fan } from '../desk/fan.ts';
import { Icon } from '../desk/Icons.tsx';
import type { IconId } from '../desk/model.ts';
import { t } from '../i18n.ts';
import { seasonName } from '../text.ts';
import { motionMode } from '../motion.ts';
import { markLit, markSeen, NOTE_IDS, NOTE_MARKS, notesTurnedOn, TOUCH_NOTES, useNotesStore, type NoteId, type NoteMark } from '../notes.ts';
import type { PlayedStep } from '../queue.ts';
import { setSetting, useSettings } from '../settings.ts';
import { Named } from '../Named.tsx';
import './notes.css';

export interface NotesProps {
  /** The switch is on, and the run is unseeded or asked for them (?notes=1). */
  readonly enabled: boolean;
  readonly s: GameState;
  /** The run's steps, the one being played included as soon as it starts. */
  readonly steps: readonly PlayedStep[];
  /** The desk idle: its data-busy is "0" and no change of scene runs. */
  readonly idle: boolean;
  /** Whether a screen is up over the desk. */
  readonly screen: 'none' | 'other';
  /** A panel is open: the note hides, and none comes. */
  readonly panel: boolean;
  /** A card's or END TURN's preview is up: a note it overlaps fades out. */
  readonly preview: boolean;
  /** The stat bar's model: the actions left this month. */
  readonly actionsLeft: number;
  /** Craft's icon as the stat bar shows it: the lane's. */
  readonly craftIcon: IconId;
  /** The season's doors card is on the mirror (round R9b, A3). */
  readonly doors: boolean;
}

interface Up {
  readonly id: NoteId;
  /** How many steps the run had when it came: what comes after are its "next play", "END TURN". */
  readonly cameAt: number;
  /** The scandal's card. */
  readonly uid: number | null;
}

/** Where a note stands on the 1280×720 stage, its width and its turn; END TURN's is set by its bottom (B2). */
interface Place {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly deg: number;
}

const FIXED: Readonly<Record<'stats' | 'actions' | 'heat' | 'doors' | 'mirror', Place>> = {
  stats: { left: 44, top: 66, width: 286, deg: -1.2 },
  actions: { left: 318, top: 66, width: 280, deg: 0.9 },
  heat: { left: 300, top: 70, width: 284, deg: -0.8 },
  doors: { left: 404, top: 214, width: 276, deg: -0.8 },
  mirror: { left: 398, top: 84, width: 268, deg: -1 },
};
const END = { left: 994, bottom: 626, width: 262, deg: 1.1 } as const;
const SCANDAL = { top: 204, width: 284, deg: 0.8 } as const;

/** Where each arrow leaves its note (a point of its box, 0–1 across and down, before its turn), and how it bows. */
const ARROW: Readonly<Record<NoteId, { readonly from: readonly [number, number]; readonly bend: number }>> = {
  stats: { from: [0.68, 0], bend: 0.22 },
  actions: { from: [0.86, 0], bend: -0.24 },
  heat: { from: [0.64, 0], bend: 0.24 },
  doors: { from: [1, 0.62], bend: -0.2 },
  end: { from: [0.16, 1], bend: 0.38 },
  mirror: { from: [1, 0.34], bend: -0.22 },
  scandal: { from: [0.5, 1], bend: 0.18 },
};

const isScandal = (s: GameState, cardId: string): boolean => getCard(s.content, cardId)?.kind === 'scandal';
const has = (step: PlayedStep, type: PlayedStep['events'][number]['type']): boolean => step.events.some((e) => e.type === type);

/** This month's steps: those since the last month end (the run's start, in the first month). */
function thisMonth(steps: readonly PlayedStep[]): readonly PlayedStep[] {
  let i = steps.length;
  while (i > 0 && !has(steps[i - 1] as PlayedStep, 'turnEnd')) i--;
  return steps.slice(i);
}

/** Whether a note's moment holds now (B2), and for the scandal its card. */
function moment(id: NoteId, p: NotesProps, since: number): { readonly uid: number | null } | null {
  const { s, steps } = p;
  const play = s.phase === 'play' && p.idle && p.screen === 'none';
  const dealtUnplayed = play && !thisMonth(steps).some((st) => has(st, 'play'));
  switch (id) {
    // The stat bar's and the bulbs' on the first desk, one after the other (round R9b, A2).
    case 'stats':
    case 'actions':
      return dealtUnplayed ? { uid: null } : null;
    case 'heat': {
      const last = steps.at(-1);
      const rose = !!last && has(last, 'play') && last.events.some((e) => e.type === 'resource' && e.target === 'heat' && e.delta > 0);
      return play && rose ? { uid: null } : null;
    }
    // The season's doors (round R9b, A4): after a play, with actions left, while their card is on the mirror.
    case 'doors':
      return play && steps.some((st) => has(st, 'play')) && p.actionsLeft > 0 && p.doors ? { uid: null } : null;
    case 'end':
      return play && p.actionsLeft === 0 ? { uid: null } : null;
    case 'mirror':
      return dealtUnplayed && steps.slice(since).some((st) => has(st, 'turnEnd')) ? { uid: null } : null;
    case 'scandal': {
      const card = play ? s.hand.find((h) => isScandal(s, h.cardId)) : undefined;
      return card ? { uid: card.uid } : null;
    }
  }
}

/** Whether a note that is up has gone (B2): its screen closed, the month's first or next play, END TURN, its card. */
function gone(up: Up, p: NotesProps): boolean {
  const after = p.steps.slice(up.cameAt);
  const any = (type: PlayedStep['events'][number]['type']) => after.some((st) => has(st, type));
  switch (up.id) {
    case 'stats':
    case 'actions':
    case 'heat':
    case 'doors':
    case 'mirror':
      return any('play') || any('turnEnd');
    case 'end':
      return any('turnEnd');
    case 'scandal':
      return any('turnEnd') || !p.s.hand.some((h) => h.uid === up.uid);
  }
}

/** The stage's own rectangle on the page, to read the desk's elements in its 1280×720 frame. */
function stageFrame(): { readonly x: number; readonly y: number; readonly k: number } {
  const r = document.querySelector('.stage')?.getBoundingClientRect();
  return r ? { x: r.left, y: r.top, k: r.width / 1280 || 1 } : { x: 0, y: 0, k: 1 };
}

interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** An element's box in the stage's frame (its bounding box: a tilted card's is its hull). */
function boxOf(el: Element | null): Box | null {
  if (!el) return null;
  const f = stageFrame();
  const r = el.getBoundingClientRect();
  return { x: (r.left - f.x) / f.k, y: (r.top - f.y) / f.k, w: r.width / f.k, h: r.height / f.k };
}

const union = (boxes: readonly (Box | null)[]): Box | null => {
  const b = boxes.filter((x): x is Box => x !== null);
  if (b.length === 0) return null;
  const x = Math.min(...b.map((r) => r.x)),
    y = Math.min(...b.map((r) => r.y));
  return { x, y, w: Math.max(...b.map((r) => r.x + r.w)) - x, h: Math.max(...b.map((r) => r.y + r.h)) - y };
};

/** What each note points at, and the box its first time lights (B2, B5). */
function target(id: NoteId, uid: number | null): { readonly at: readonly [number, number]; readonly box: Box | null; readonly card: Element | null } | null {
  const q = (sel: string) => document.querySelector(sel);
  switch (id) {
    case 'stats': {
      const craft = boxOf(q('.desk .stats .cell.craft'));
      const box = union([boxOf(q('.desk .stats .cell.hype')), craft, boxOf(q('.desk .stats .cell.heat'))]);
      return craft ? { at: [craft.x + craft.w / 2, craft.y + craft.h + 3], box, card: null } : null;
    }
    case 'actions': {
      const box = boxOf(q('.desk .stats .slotbulbs'));
      return box ? { at: [box.x + box.w / 2, box.y + box.h + 4], box, card: null } : null;
    }
    case 'heat': {
      const box = boxOf(q('.desk .stats [data-hook="countdown"]'));
      return box ? { at: [box.x + box.w / 2, box.y + box.h + 3], box, card: null } : null;
    }
    case 'doors': {
      const box = boxOf(q('.desk [data-hook="doors"]'));
      return box ? { at: [box.x - 4, box.y + box.h / 2], box, card: null } : null;
    }
    case 'end': {
      const box = boxOf(q('.desk .endbtn'));
      return box ? { at: [box.x - 4, box.y + box.h / 2], box, card: null } : null;
    }
    case 'mirror': {
      const box = boxOf(q('.desk .mirror .today'));
      return box ? { at: [box.x - 4, box.y + box.h / 2], box, card: null } : null;
    }
    case 'scandal': {
      const card = q(`.desk .hand .card[data-uid="${uid}"]`);
      const box = boxOf(card);
      return box ? { at: [box.x + box.w / 2, box.y - 4], box, card } : null;
    }
  }
}

/** A note's box turned about its centre: a point of it (0–1 across and down) on the stage. */
function pointOf(place: Place, h: number, [u, v]: readonly [number, number]): [number, number] {
  const cx = place.left + place.width / 2,
    cy = place.top + h / 2;
  const a = (place.deg * Math.PI) / 180;
  const dx = (u - 0.5) * place.width,
    dy = (v - 0.5) * h;
  return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)];
}

/** The arrow (B4): a hand-drawn curve from the note's edge to its point, and a two-stroke head. */
function arrowPath(from: readonly [number, number], to: readonly [number, number], bend: number): string {
  const [x0, y0] = from,
    [x1, y1] = to;
  const dx = x1 - x0,
    dy = y1 - y0,
    len = Math.hypot(dx, dy) || 1;
  const qx = (x0 + x1) / 2 - dy * bend,
    qy = (y0 + y1) / 2 + dx * bend;
  const tx = x1 - qx,
    ty = y1 - qy,
    tl = Math.hypot(tx, ty) || 1;
  const ux = tx / tl,
    uy = ty / tl;
  const head = Math.min(11, len / 3);
  const side = (sign: number): [number, number] => {
    const a = (sign * 28 * Math.PI) / 180;
    const rx = ux * Math.cos(a) - uy * Math.sin(a),
      ry = ux * Math.sin(a) + uy * Math.cos(a);
    return [x1 - rx * head, y1 - ry * head];
  };
  const [ax, ay] = side(1),
    [bx, by] = side(-1);
  const f = (n: number) => n.toFixed(1);
  return `M${f(x0)} ${f(y0)} Q${f(qx)} ${f(qy)} ${f(x1)} ${f(y1)} M${f(ax)} ${f(ay)} L${f(x1)} ${f(y1)} L${f(bx)} ${f(by)}`;
}

/** A note's line: its words, each mark ([hype], [craft], [heat]) the stat bar's own icon in its place. */
const MARK = new RegExp(`(\\[(?:${NOTE_MARKS.join('|')})\\])`);
function words(line: string, craft: IconId): ReactNode[] {
  const icon: Record<NoteMark, IconId> = { hype: 'star', craft, heat: 'flame' };
  return line.split(MARK).map((part, i) => {
    const mark = NOTE_MARKS.find((m) => part === `[${m}]`);
    return mark ? <Icon key={i} id={icon[mark]} /> : part;
  });
}
const plain = (line: string): string => line.replace(new RegExp(`${MARK.source}\\s*`, 'g'), '');

/** The highlight's timing (B5): the veil in, two flashes, the veil out; reduced, a still glow held 600 ms. */
const FLASH = { full: 1400, reduced: 1100 } as const;

export function Notes(p: NotesProps) {
  const store = useNotesStore();
  const settings = useSettings();
  const [up, setUp] = useState<Up | null>(null);
  // The steps since the switch last came on (B2, the mirror's note): a fresh store counts as on from the start.
  const since = useRef({ token: notesTurnedOn(), step: 0 });
  if (notesTurnedOn() !== since.current.token) since.current = { token: notesTurnedOn(), step: p.steps.length };
  // Fewer steps than then: a new run, begun after the switch came on — all of it counts.
  else if (p.steps.length < since.current.step) since.current = { ...since.current, step: 0 };
  // The last pointer the player put down (B6): touch or pen read the notes' .touch lines.
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    const down = (e: PointerEvent) => setTouch(e.pointerType === 'touch' || e.pointerType === 'pen');
    document.addEventListener('pointerdown', down, true);
    return () => document.removeEventListener('pointerdown', down, true);
  }, []);

  const due = useMemo(() => {
    if (!p.enabled || p.panel) return null;
    for (const id of NOTE_IDS) {
      if (store.seen.includes(id)) continue;
      const m = moment(id, p, since.current.step);
      if (m) return { id, uid: m.uid };
    }
    return null;
  }, [p, store.seen]);

  // One at a time (B3): the one up stays until it goes or is clicked; then the next whose moment holds comes.
  const [flash, setFlash] = useState<{ readonly id: NoteId; readonly key: number } | null>(null);
  useEffect(() => {
    if (!p.enabled) {
      if (up) setUp(null);
      return;
    }
    if (up) {
      if (gone(up, p)) setUp(null);
      return;
    }
    if (!due) return;
    setUp({ id: due.id, cameAt: p.steps.length, uid: due.uid });
    markSeen(due.id);
    // The first time a note ever shows, the eye is drawn to it (B5); never again, even after the switch comes back on.
    if (!store.lit.includes(due.id)) {
      markLit(due.id);
      setFlash({ id: due.id, key: Date.now() });
    }
  }, [p, up, due]);
  // All seven seen and none up: the switch turns itself off (B1).
  useEffect(() => {
    if (!up && settings.notes && NOTE_IDS.every((id) => store.seen.includes(id))) setSetting('notes', false);
  }, [up, settings.notes, store.seen]);

  // The note that shows (hidden while a panel is up, B3), its words, and where it stands.
  const shown = up && !p.panel ? up : null;
  const manager = p.s.manager ?? 'veteran';
  const touchy = !!shown && TOUCH_NOTES.includes(shown.id) && touch;
  // The doors' note names the season whose doors the card shows (round R9c, A): House rules' switch can bring it back in
  // any season. A leaving note keeps the words it was shown with.
  const line = shown ? t(`notes.${shown.id}.${manager}${touchy ? '.touch' : ''}`, shown.id === 'doors' ? { season: seasonName(p.s.content, p.s.act) } : {}) : '';
  const sign = t(`notes.sign.${manager}`);
  const note = useRef<HTMLButtonElement>(null);
  const [geo, setGeo] = useState<Geo | null>(null);
  // Where it stands, and its arrow: measured once it has its height, and again as the hand re-fans (B2).
  const handKey = p.s.hand.map((h) => h.uid).join(',');
  useLayoutEffect(() => {
    if (!shown || !note.current) {
      setGeo(null);
      return;
    }
    const h = note.current.offsetHeight;
    const place = placeOf(shown, p.s, h);
    const aim = target(shown.id, shown.uid);
    setGeo({ id: shown.id, place, h, line, arrow: aim ? arrowPath(pointOf(place, h, ARROW[shown.id].from), aim.at, ARROW[shown.id].bend) : null, box: aim?.box ?? null });
  }, [shown?.id, shown?.uid, handKey, line]);
  const placed = shown && geo?.id === shown.id ? geo : null;

  // A note that goes fades out over 200 ms (B4; motion off: at once).
  const [leaving, setLeaving] = useState<Geo | null>(null);
  const last = useRef<Geo | null>(null);
  useEffect(() => {
    if (placed) {
      last.current = placed;
      setLeaving(null);
      return;
    }
    const was = last.current;
    last.current = null;
    if (!was || motionMode() === 'off') return;
    setLeaving(was);
    const id = window.setTimeout(() => setLeaving(null), 200);
    return () => window.clearTimeout(id);
  }, [placed]);

  // A card's or END TURN's preview over the note fades it and lets clicks through (B3).
  const [faded, setFaded] = useState(false);
  useEffect(() => {
    if (!p.preview || !placed) {
      setFaded(false);
      return;
    }
    let frame = 0;
    const look = () => {
      const floating = boxOf(document.querySelector('.desk .floating'));
      const n = boxOf(note.current);
      setFaded(!!floating && !!n && floating.x < n.x + n.w && n.x < floating.x + floating.w && floating.y < n.y + n.h && n.y < floating.y + floating.h);
      frame = requestAnimationFrame(look);
    };
    look();
    return () => cancelAnimationFrame(frame);
  }, [p.preview, placed]);

  // The highlight ends on its own, or at any click (it takes none itself).
  useEffect(() => {
    if (!flash) return;
    const end = () => setFlash(null);
    const id = window.setTimeout(end, motionMode() === 'full' ? FLASH.full : FLASH.reduced);
    document.addEventListener('pointerdown', end, true);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('pointerdown', end, true);
    };
  }, [flash]);
  const lighting = flash && placed && flash.id === placed.id ? flash : null;
  // A card's glow is the card's own outline, so it tilts with it: a box-shadow animated on the card itself.
  useEffect(() => {
    if (!lighting || lighting.id !== 'scandal' || !shown || motionMode() === 'off') return;
    const card = target('scandal', shown.uid)?.card as HTMLElement | null | undefined;
    if (!card) return;
    const own = getComputedStyle(card).boxShadow;
    const base = own === 'none' ? '' : `, ${own}`;
    const glow = `0 0 0 2.5px #ffcf85, 0 0 22px 6px rgba(255, 207, 133, .55)${base}`;
    const off = `0 0 0 0 rgba(255, 207, 133, 0), 0 0 0 0 rgba(255, 207, 133, 0)${base}`;
    const anim =
      motionMode() === 'full'
        ? card.animate([{ boxShadow: off }, { boxShadow: off, offset: 0.114 }, { boxShadow: glow, offset: 0.13 }, { boxShadow: glow, offset: 0.27 }, { boxShadow: off, offset: 0.29 }, { boxShadow: off, offset: 0.43 }, { boxShadow: glow, offset: 0.45 }, { boxShadow: glow, offset: 0.59 }, { boxShadow: off, offset: 0.61 }, { boxShadow: off }], FLASH.full)
        : card.animate([{ boxShadow: off }, { boxShadow: glow, offset: 0.15 }, { boxShadow: glow, offset: 0.69 }, { boxShadow: off }], FLASH.reduced);
    return () => anim.cancel();
  }, [lighting?.key]);

  // A click, or Enter or Space on it, puts it away (B3): it stays in seen.
  const dismiss = () => {
    setFlash(null);
    setUp(null);
  };
  const reduced = motionMode() !== 'full';
  const base = shown ? placeOf(shown, p.s, placed?.h ?? 0) : null;
  return (
    <div className="oxn-layer" aria-live="polite" data-hook="notes" data-note={placed?.id}>
      {lighting && placed && <Veil key={lighting.key} geo={placed} reduced={reduced} card={placed.id === 'scandal'} />}
      {placed?.arrow && (
        <svg className={`oxn-arrow${faded ? ' faded' : ''}`} viewBox="0 0 1280 720" aria-hidden="true">
          <path d={placed.arrow} />
        </svg>
      )}
      {shown && base && (
        <button
          key={shown.id}
          ref={note}
          type="button"
          className={`oxn ink${faded ? ' faded' : ''}`}
          data-note={shown.id}
          aria-label={plain(line)}
          style={{ left: base.left, top: placed ? placed.place.top : -999, width: base.width, visibility: placed ? undefined : 'hidden', ['--r' as string]: `${base.deg}deg` }}
          onClick={dismiss}
        >
          <NoteInk line={line} sign={sign} craft={p.craftIcon} />
        </button>
      )}
      {!shown && leaving && (
        <>
          {leaving.arrow && (
            <svg className="oxn-arrow out" viewBox="0 0 1280 720" aria-hidden="true">
              <path d={leaving.arrow} />
            </svg>
          )}
          <div className="oxn ink out" aria-hidden="true" style={{ left: leaving.place.left, top: leaving.place.top, width: leaving.place.width, ['--r' as string]: `${leaving.place.deg}deg` }}>
            <NoteInk line={leaving.line} sign={sign} craft={p.craftIcon} />
          </div>
        </>
      )}
    </div>
  );
}

/** A note's paper: its tape, the drawn ✕, its words with their icons, the manager's signature. */
function NoteInk({ line, sign, craft }: { line: string; sign: string; craft: IconId }) {
  return (
    <>
      <i className="tape" aria-hidden="true" />
      <b className="x" aria-hidden="true">
        ✕
      </b>
      <p>{words(line, craft)}</p>
      <span className="sig">
        <Named text={sign} />
      </span>
    </>
  );
}

interface Geo {
  readonly id: NoteId;
  readonly place: Place;
  readonly h: number;
  /** Its words as they were shown (a leaving note keeps them). */
  readonly line: string;
  readonly arrow: string | null;
  /** The target's box, for the highlight's hole and glow. */
  readonly box: Box | null;
}

/** A note's place (B2): the five fixed ones; END TURN's set by its bottom and clear of a wide hand; the scandal's by its card. */
function placeOf(up: Up, s: GameState, h: number): Place {
  if (up.id === 'end') {
    let top = END.bottom - h;
    // A wide hand that would meet it: up until it clears (the cards' hulls on the stage).
    for (const card of document.querySelectorAll('.desk .hand .card')) {
      const b = boxOf(card);
      if (b && b.x < END.left + END.width && END.left < b.x + b.w && b.y < top + h && top < b.y + b.h) top = Math.min(top, b.y - 8 - h);
    }
    return { left: END.left, top, width: END.width, deg: END.deg };
  }
  if (up.id === 'scandal') {
    const i = Math.max(0, s.hand.findIndex((c) => c.uid === up.uid));
    const at = fan(s.hand.length)[i] ?? { left: 540 - CARD_W / 2, rot: 0, lift: 0 };
    const centre = at.left + CARD_W / 2;
    const left = centre > 640 ? at.left - 330 : centre - 30;
    return { left: Math.max(8, Math.min(1280 - 8 - SCANDAL.width, left)), top: SCANDAL.top, width: SCANDAL.width, deg: SCANDAL.deg };
  }
  return FIXED[up.id];
}

/** The first time's veil (B5): the stage dimmed but for two holes — the target's, 6 px round it, and the note's — and the target's glow. */
function Veil({ geo, reduced, card }: { geo: Geo; reduced: boolean; card: boolean }) {
  const { place, h, box } = geo;
  const hole = box ? { x: box.x - 6, y: box.y - 6, w: box.w + 12, h: box.h + 12 } : null;
  const cx = place.left + place.width / 2,
    cy = place.top + h / 2;
  return (
    <>
      <svg className={`oxn-veil${reduced ? ' reduced' : ''}`} viewBox="0 0 1280 720" aria-hidden="true">
        <defs>
          <mask id="oxn-veil-mask">
            <rect width="1280" height="720" fill="white" />
            {hole && <rect x={hole.x} y={hole.y} width={hole.w} height={hole.h} rx="10" fill="black" />}
            <rect x={place.left} y={place.top} width={place.width} height={h} transform={`rotate(${place.deg} ${cx} ${cy})`} fill="black" />
          </mask>
        </defs>
        <rect width="1280" height="720" fill="rgba(6, 4, 2, .46)" mask="url(#oxn-veil-mask)" />
      </svg>
      {/* The target's glow: a box round it (the stat cells, the bulbs, the countdown, the doors card, the black card, END TURN); a card's is its own outline. */}
      {box && !card && <i className={`oxn-glow${reduced ? ' reduced' : ''}`} aria-hidden="true" style={{ left: box.x, top: box.y, width: box.w, height: box.h }} />}
    </>
  );
}
