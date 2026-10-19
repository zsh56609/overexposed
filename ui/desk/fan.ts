// The fan (the mockup's layoutHand; round V1a): where each card of a hand stands, kept clear of END TURN when draws
// swell the hand. Pure numbers, shared by the hand (Hand.tsx) and a played card's flight (flight.ts, round R7).

export const CARD_W = 186;
export const HAND_TOP = 490;
const CENTRE = 540;
const MAX_SPAN = 960;
export const MAX_LIFT = 18;
/** The spacing between cards: the strip of each card the next one leaves showing. */
export const fanSpacing = (n: number): number => Math.min(n > 5 ? 128 : 150, n > 1 ? (MAX_SPAN - CARD_W) / (n - 1) : 150);
export function fan(n: number): { left: number; rot: number; lift: number }[] {
  const sp = fanSpacing(n);
  const x0 = CENTRE - (CARD_W + (n - 1) * sp) / 2;
  return Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
    return { left: x0 + i * sp, rot: t * 8, lift: (1 - t * t) * MAX_LIFT };
  });
}
