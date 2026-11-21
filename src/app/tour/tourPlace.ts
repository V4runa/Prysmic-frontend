/**
 * Where the card sits. One measurement, then this function.
 * Phone steps dock full-width at the bottom. Everything else is clamped
 * inside the viewport so the card cannot leave the screen.
 */

export const TOUR_CARD_WIDTH = 400;
export const TOUR_PHONE_MAX = 640;

export type Box = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CardSpot =
  | { mode: "bottom"; left: number; width: number }
  | { mode: "fixed"; top: number; left: number; width: number };

const MARGIN = 16;
const GAP = 12;

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(max, Math.max(min, value));
}

function fits(
  spot: { top: number; left: number },
  width: number,
  height: number,
  viewport: { width: number; height: number }
): boolean {
  return (
    spot.left >= MARGIN &&
    spot.top >= MARGIN &&
    spot.left + width <= viewport.width - MARGIN &&
    spot.top + height <= viewport.height - MARGIN
  );
}

export function placeTourCard(input: {
  viewport: { width: number; height: number };
  card: { width: number; height: number };
  target: Box | null;
  presentation: "center" | "step";
  /**
   * Pin the card to the bottom even on a wide screen.
   * Used while the moods flame is on screen, so the card does not cover it.
   */
  dock?: boolean;
}): CardSpot {
  const viewport = input.viewport;
  const fullWidth = Math.max(160, viewport.width - MARGIN * 2);
  const height = Math.max(1, input.card.height);

  if (input.dock || (input.presentation === "step" && viewport.width < TOUR_PHONE_MAX)) {
    return { mode: "bottom", left: MARGIN, width: fullWidth };
  }

  const width = Math.min(input.card.width, fullWidth);
  const maxLeft = viewport.width - width - MARGIN;
  const maxTop = viewport.height - height - MARGIN;

  const centered: CardSpot = {
    mode: "fixed",
    top: clamp((viewport.height - height) / 2, MARGIN, maxTop),
    left: clamp((viewport.width - width) / 2, MARGIN, maxLeft),
    width,
  };

  if (input.presentation === "center" || !input.target) return centered;

  const target = input.target;
  const candidates = [
    { left: target.x + target.width + GAP, top: target.y },
    { left: target.x - width - GAP, top: target.y },
    { left: target.x, top: target.y + target.height + GAP },
    { left: target.x + target.width - width, top: target.y + target.height + GAP },
    { left: target.x, top: target.y - height - GAP },
  ];

  for (const candidate of candidates) {
    if (fits(candidate, width, height, viewport)) {
      return { mode: "fixed", top: candidate.top, left: candidate.left, width };
    }
  }

  return {
    mode: "fixed",
    top: clamp(target.y + target.height + GAP, MARGIN, maxTop),
    left: clamp(target.x, MARGIN, maxLeft),
    width,
  };
}

/** True when a fixed spot lies fully inside the viewport. */
export function cardSpotInside(
  spot: CardSpot,
  cardHeight: number,
  viewport: { width: number; height: number }
): boolean {
  if (spot.mode === "bottom") {
    return spot.left >= 0 && spot.left + spot.width <= viewport.width + 0.5;
  }
  return (
    spot.top >= -0.5 &&
    spot.left >= -0.5 &&
    spot.left + spot.width <= viewport.width + 0.5 &&
    spot.top + cardHeight <= viewport.height + 0.5
  );
}
