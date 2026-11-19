/**
 * One beat at a time. Soft ease-in-out, no overshoot.
 * A stop change, apart from waiting on the page, lands near 2.4s:
 * words out 280, dim 420, reveal 500, drift 700, then the line 200 later.
 */

export const TOUR_EASE = [0.45, 0.05, 0.55, 0.95] as const;

export const TOUR_BEAT = {
  wordsOut: 280,
  dim: 420,
  reveal: 500,
  drift: 700,
  wordsDelay: 200,
  wordsIn: 300,
  dwell: 1300,
  lift: 1500,
} as const;

/** How long the room stays on the current page before the route changes. */
export function departDelay(reduced: boolean): number {
  if (reduced) return 180;
  return TOUR_BEAT.wordsOut + TOUR_BEAT.dim;
}
