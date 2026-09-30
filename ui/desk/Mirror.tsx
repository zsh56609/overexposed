// The mirror (round V1a; README §3), back right: a bulb frame round the glass; the black card taped to it — "If
// the year ended today", the major and the minor; three sticky notes for the other three majors, each with its
// goal line and its requirements in the stat bar's words. In a frenzy some bulbs flicker or go dark and a red
// clipping is stuck to the glass. Every word is the adapter's (./model.ts).

import { memo } from 'react';
import { isPlaceholder } from '../text.ts';
import { Icon } from './Icons.tsx';
import type { MirrorModel } from './model.ts';

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

export const Mirror = memo(function Mirror({ mirror, crisis }: { mirror: MirrorModel; crisis: boolean }) {
  return (
    <>
      <div className="mShadow" />
      <div className="mirror" data-hook="mirror">
        <div className="mframe" />
        <div className="glass" />
        <div className="bulbs">
          {BULBS.map(([x, y], i) => (
            <div key={i} className={bulbClass(i, crisis)} style={{ left: x, top: y }} />
          ))}
        </div>
        {mirror.today && (
          <div className="today" data-hook="today">
            <small>{mirror.kicker}</small>
            <b className={ph(mirror.today.major, '')}>{mirror.today.major}</b>
            <span className={ph(mirror.today.minor, '')}>{mirror.today.minor}</span>
          </div>
        )}
        {mirror.notes.map((note, i) => {
          const spot = SPOTS[i] ?? SPOTS[0];
          return (
            <div key={note.majorId} className={`sticky ${note.colour}`} data-major={note.majorId} style={{ left: spot.left, top: spot.top, ['--r' as string]: `${spot.r}deg` }}>
              <b className={ph(note.name, '')}>{note.name}</b>
              <span className={ph(note.goal, 'goal')}>{note.goal}</span>
              {note.reqs.map((r, k) => (
                <div key={k} className={`req ${r.met ? 'ok' : 'no'}`}>
                  <i>{r.mark}</i>
                  {r.icon && <Icon id={r.icon} className={r.icon === 'star' ? 'rh' : 'rs'} />}
                  <span>{r.text}</span>
                </div>
              ))}
            </div>
          );
        })}
        {mirror.clipping !== null && (
          <div className="clipM" data-hook="clipping">
            {mirror.clipping}
          </div>
        )}
      </div>
    </>
  );
});
