// The mirror (round V1a; README §3), back right: a bulb frame round the glass; the black card taped to it — "If
// the year ended today", the major and the minor; three sticky notes for the other three majors, each its name and
// its requirements in the stat bar's words (no goal line since round R8a, E3). In a frenzy some bulbs flicker or go dark and a red
// clipping is stuck to the glass. Every word is the adapter's (./model.ts). Round R8b (B7): the goal lines come back as
// tooltips — hovering, a long-press or keyboard focus on the black card shows its major's, on a note its own. Round R9b
// (A3): the season's two doors on a white index card taped below the notes. Since round R9c (E2) it answers as the notes
// do — it grows on hover or keyboard focus — and each door's row is a tooltip target: the door's name, "If you pass · if
// you fail", and what each brings, as the doors screen shows them.

import { memo, useEffect, useLayoutEffect, useRef, useState, type FocusEvent, type PointerEvent, type ReactNode } from 'react';
import { isPlaceholder } from '../text.ts';
import { Value } from './Hand.tsx';
import { Icon, keyboardFocus } from './Icons.tsx';
import type { MirrorModel, ValueChip } from './model.ts';

const W = 420;
const H = 350;
/** The bulbs, as the mockup lays them: eight along the top, five down each side. */
const BULBS: readonly (readonly [number, number])[] = [
  ...Array.from({ length: 8 }, (_, i) => [14 + i * ((W - 46) / 7), 6] as const),
  ...Array.from({ length: 5 }, (_, k) => [
    [6, 6 + (k + 1) * ((H - 34) / 6)] as const,
    [W - 24, 6 + (k + 1) * ((H - 34) / 6)] as const,
  ]).flat(),
];
/** In a frenzy: these go dark, these flicker harshly, these burn harsh (the mockup's pattern). */
const bulbClass = (i: number, crisis: boolean): string => {
  if (!crisis) return 'bulb';
  if ([2, 6, 10, 14].includes(i)) return 'bulb off';
  if (i % 3 === 0) return 'bulb harsh flicker';
  if (i % 4 === 1) return 'bulb harsh';
  return 'bulb';
};
/** Where the three notes are stuck, and their tilt. */
const SPOTS = [
  { left: 206, top: 36, r: 4 },
  { left: 40, top: 150, r: 2 },
  { left: 176, top: 154, r: -3 },
] as const;

const ph = (text: string, base: string): string => (isPlaceholder(text) ? `${base} placeholder` : base);

/**
 * The mirror as it stands behind the manager's bubbles (round R9d, A2), for their frosted glass (DeskItems.tsx, Frost):
 * its frame, its glass with the glass's highlights, the bulbs as they are now, and the frenzy's red clipping as a box
 * its size (Frost gives it the mirror's own clipping's height) — the mirror's own classes, without its words, hooks or
 * anything to focus. Nothing else on the glass reaches the bubbles' column.
 */
export function MirrorBackdrop({ crisis, clipping }: { crisis: boolean; clipping: boolean }) {
  return (
    <div className="mirror">
      <div className="mframe" />
      <div className="glass" />
      <div className="bulbs">
        {BULBS.map(([x, y], i) => (
          <div key={i} className={bulbClass(i, crisis)} style={{ left: x, top: y, ['--i' as string]: i }} />
        ))}
      </div>
      {clipping && <div className="clipM" />}
    </div>
  );
}

/** A goal's tooltip (round R8b, B7): where it stands on the stage, and what it says. */
interface GoalTip {
  readonly header: string;
  readonly line: string;
  /** The box it stands under (or over): the hovered thing's, or a door's card's for a door's row. */
  readonly box: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  /** A door's outcomes (round R9c, E2): the pass chips, then the word "or" and the fail chips. */
  readonly chips?: DoorChips;
}

interface DoorChips {
  readonly pass: readonly ValueChip[];
  readonly or: string;
  readonly fail: readonly ValueChip[];
}

/** An element's box in the stage's own 1280×720 frame. */
function stageBox(el: Element): GoalTip['box'] {
  const stage = el.closest('.stage')?.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  const k = stage ? stage.width / 1280 || 1 : 1;
  return { x: (r.left - (stage?.left ?? 0)) / k, y: (r.top - (stage?.top ?? 0)) / k, w: r.width / k, h: r.height / k };
}

/**
 * The goals' tooltips, as the stat bar's are shown: hover (mouse), a long-press (touch, 450 ms) or keyboard focus; closed
 * by leaving, blur or any press elsewhere. Under the thing (above if there is no room), kept on the stage.
 */
function useGoalTip() {
  const [tip, setTip] = useState<GoalTip | null>(null);
  const [last, setLast] = useState<GoalTip | null>(null);
  const press = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!tip) return;
    const close = () => setTip(null);
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [tip]);
  useEffect(() => () => window.clearTimeout(press.current), []);
  // `under`: the element the tooltip stands under (a door's row: its card); `chips`: a door's outcomes.
  const show = (header: string, line: string, el: Element, chips?: DoorChips, under?: (el: Element) => Element) => {
    const at = { header, line, box: stageBox(under ? under(el) : el), ...(chips ? { chips } : {}) };
    setTip(at);
    setLast(at);
  };
  const bind = (header: string, line: string, chips?: DoorChips, under?: (el: Element) => Element) => ({
    tabIndex: 0,
    'data-goal': '',
    onPointerEnter: (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType === 'mouse') show(header, line, e.currentTarget, chips, under);
    },
    onPointerLeave: (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType === 'mouse') setTip(null);
    },
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType === 'mouse') return;
      const el = e.currentTarget;
      window.clearTimeout(press.current);
      press.current = window.setTimeout(() => show(header, line, el, chips, under), 450);
    },
    onPointerUp: () => window.clearTimeout(press.current),
    onPointerCancel: () => window.clearTimeout(press.current),
    onFocus: (e: FocusEvent<HTMLElement>) => {
      if (keyboardFocus(e.currentTarget)) show(header, line, e.currentTarget, chips, under);
    },
    onBlur: () => setTip(null),
  });
  return { tip, shown: tip ?? last, bind };
}

/** The goal's tooltip: the stat bar's look, under its thing — above if there is no room — kept on the stage. */
function GoalTipView({ tip, on }: { tip: GoalTip | null; on: boolean }) {
  const el = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState<{ left: number; top: number; above: boolean } | null>(null);
  useLayoutEffect(() => {
    if (!tip || !el.current) return;
    const h = el.current.offsetHeight;
    const w = el.current.offsetWidth;
    const under = tip.box.y + tip.box.h + 10;
    const above = under + h > 716;
    setAt({ left: Math.max(4, Math.min(1280 - w - 4, tip.box.x)), top: above ? Math.max(50, tip.box.y - 10 - h) : under, above });
  }, [tip]);
  return (
    <div ref={el} className={`tip goaltip${on && at ? ' on' : ''}${at?.above ? ' above' : ''}`} role="tooltip" aria-hidden={on ? undefined : true} style={{ left: at?.left ?? 0, top: at?.top ?? 0 }}>
      <b>{tip?.header}</b>
      <span className={tip && isPlaceholder(tip.line) ? 'placeholder' : undefined}>{tip?.line}</span>
      {/* A door's outcomes (round R9c, E2): what passing brings on one line, "or" and what failing does on the next. */}
      {tip?.chips && (
        <span className="outcomes">
          <span className="oc-row">
            {tip.chips.pass.map((chip, i) => (
              <Value key={i} v={chip} />
            ))}
          </span>
          <span className="oc-row">
            <em>{tip.chips.or}</em>
            {tip.chips.fail.map((chip, i) => (
              <Value key={i} v={chip} />
            ))}
          </span>
        </span>
      )}
    </div>
  );
}

/** The mirror; `mirror` null for the title's (round R3), whose notes are its children. */
export const Mirror = memo(function Mirror({ mirror, crisis, children }: { mirror: MirrorModel | null; crisis: boolean; children?: ReactNode }) {
  const goal = useGoalTip();
  return (
    <>
      <div className="mShadow" />
      <div className="mirror" data-hook="mirror">
        <div className="mframe" />
        <div className="glass" />
        <div className="bulbs">
          {BULBS.map(([x, y], i) => (
            <div key={i} className={bulbClass(i, crisis)} style={{ left: x, top: y, ['--i' as string]: i }} />
          ))}
        </div>
        {children}
        {mirror?.today && (
          <div className="today" data-hook="today" data-major={mirror.today.majorId} {...goal.bind(mirror.today.major, mirror.today.goal)}>
            <small>{mirror.kicker}</small>
            <b className={ph(mirror.today.major, '')}>{mirror.today.major}</b>
            <span className={ph(mirror.today.minor, '')}>{mirror.today.minor}</span>
          </div>
        )}
        {mirror?.notes.map((note, i) => {
          const spot = SPOTS[i] ?? SPOTS[0];
          return (
            <div key={note.majorId} className={`sticky ${note.colour}`} data-major={note.majorId} style={{ left: spot.left, top: spot.top, ['--r' as string]: `${spot.r}deg` }} {...goal.bind(note.name, note.goal)}>
              <b className={ph(note.name, '')}>{note.name}</b>
              {note.reqs.map((r, k) => (
                <div key={k} className={`req ${r.met ? 'ok' : 'no'}`}>
                  <i>{r.mark}</i>
                  {r.icon && <Icon id={r.icon} className={r.icon === 'star' ? 'rh' : 'rs'} />}
                  <span>{r.text}</span>
                  {r.have && <span className="have">{r.have}</span>}
                </div>
              ))}
            </div>
          );
        })}
        {mirror?.doors && (
          <div className="doorscard" data-hook="doors">
            <i className="tape" aria-hidden="true" />
            <small>{mirror.doors.kicker}</small>
            {mirror.doors.rows.map((row) => (
              <div key={row.gateId} className={`door ${row.met ? 'ok' : 'no'}`} data-gate={row.gateId} {...goal.bind(row.name, mirror.doors!.branches, { pass: row.pass, or: mirror.doors!.or, fail: row.fail }, (el) => el.closest('[data-hook="doors"]') ?? el)}>
                <i>{row.mark}</i>
                <b className={ph(row.name, '')}>{row.name}</b>
                <span className="chips">
                  {row.chips.map((chip, k) => (
                    <span key={k} className={chip.cls ?? 'words'}>
                      {chip.icon && <Icon id={chip.icon} />}
                      {chip.text}
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </div>
        )}
        {mirror && mirror.clipping !== null && (
          <div className="clipM" data-hook="clipping">
            {mirror.clipping}
          </div>
        )}
      </div>
      {mirror && <GoalTipView tip={goal.shown} on={goal.tip !== null} />}
    </>
  );
});
