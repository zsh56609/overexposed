// A sound as something comes on stage (round R4, B2): the doors laid out, the offers rising, a panel opening, a text
// coming up, a letter landing.

import { useEffect, useRef } from 'react';

/** Plays once as the component mounts — once even where React runs its effects twice (development's StrictMode). */
export function useArrivalSound(play: () => void): void {
  const played = useRef(false);
  useEffect(() => {
    if (played.current) return;
    played.current = true;
    play(); // mount only: what it plays is decided as it arrives
  }, []);
}
