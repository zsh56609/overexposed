// An award's trophy (round R8c, B1): its drawing as an image, alt="" (the award's name stands beside it), in a box of its
// own size — empty until the trophies' chunk is here, the drawing appearing in it then, so nothing moves.

import type { ReactNode } from 'react';
import type { AwardDef, TrophyId } from '../core/index.ts';
import { useTrophy } from './trophyLoad.ts';

/** An award's trophy, from content (validate holds every award to one of TROPHY_IDS). */
export const trophyOf = (c: { readonly awards?: readonly AwardDef[] }, id: string): TrophyId => c.awards?.find((a) => a.id === id)?.trophy ?? 'laurel';

/** The trophy in a `w`×`h` box; `children` stand over it (a box's fresh dot). */
export function Trophy({ id, w, h, children }: { id: TrophyId; w: number; h: number; children?: ReactNode }) {
  const src = useTrophy(id);
  return (
    <span className="tr" data-trophy={id} style={{ width: w, height: h }}>
      {src && <img src={src} alt="" width={w} height={h} />}
      {children}
    </span>
  );
}
