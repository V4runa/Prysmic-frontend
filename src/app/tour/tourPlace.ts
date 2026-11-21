/**
 * Where the card sits. It stays inside the safe area (below the header,
 * above the phone tab bar) and does not cover its target.
 */

export const TOUR_CARD_WIDTH = 400;
export const TOUR_GAP = 14;
export const TOUR_MARGIN = 16;

export type Box = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CardSpot = {
  top: number;
  left: number;
  width: number;
};

export type SafeInsets = {
  top: number;
  bottom: number;
};

const GAP = TOUR_GAP;

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(max, Math.max(min, value));
}

export function intersects(a: Box, b: Box, pad = 0): boolean {
  return !(
    a.x + a.width + pad <= b.x ||
    b.x + b.width + pad <= a.x ||
    a.y + a.height + pad <= b.y ||
    b.y + b.height + pad <= a.y
  );
}

export function overlapArea(a: Box, b: Box): number {
  const left = Math.max(a.x, b.x);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const top = Math.max(a.y, b.y);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  if (right <= left || bottom <= top) return 0;
  return (right - left) * (bottom - top);
}

/** On a phone, covering the bottom of a tall target is worse than covering the top. */
function coverScore(card: Box, target: Box, phone: boolean): number {
  const area = overlapArea(card, target);
  if (!area || !phone) return area;
  const lower: Box = {
    x: target.x,
    y: target.y + target.height * 0.58,
    width: target.width,
    height: target.height * 0.42,
  };
  return area + overlapArea(card, lower) * 8;
}

function gapTo(card: Box, target: Box): number {
  const dx = Math.max(card.x - (target.x + target.width), target.x - (card.x + card.width), 0);
  const dy = Math.max(card.y - (target.y + target.height), target.y - (card.y + card.height), 0);
  return Math.hypot(dx, dy);
}

function spotBox(spot: { top: number; left: number; width: number }, height: number): Box {
  return { x: spot.left, y: spot.top, width: spot.width, height };
}

function placeAtWidth(
  input: {
    viewport: { width: number; height: number };
    insets: SafeInsets;
    card: { width: number; height: number };
    target: Box;
    obstacles?: readonly Box[];
    softObstacles?: readonly Box[];
    shieldBelow?: boolean;
  },
  width: number
): { clear: CardSpot | null; fallback: CardSpot | null } {
  const { viewport, insets, target } = input;
  const height = Math.max(1, input.card.height);
  const minTop = Math.max(TOUR_MARGIN, insets.top);
  const maxTop = viewport.height - insets.bottom - height;
  const minLeft = TOUR_MARGIN;
  const maxLeft = viewport.width - TOUR_MARGIN - width;

  const outside = (input.obstacles ?? []).flatMap((obstacle) => [
    { left: obstacle.x + obstacle.width + GAP, top: obstacle.y + 8 },
    { left: obstacle.x - width - GAP, top: obstacle.y + 8 },
    { left: obstacle.x + obstacle.width - width, top: obstacle.y - height - GAP },
    { left: obstacle.x, top: obstacle.y + obstacle.height + GAP },
  ]);
  const raw = [
    { left: target.x + target.width - width, top: target.y + target.height + GAP },
    { left: target.x, top: target.y + target.height + GAP },
    { left: target.x + target.width / 2 - width / 2, top: target.y + target.height + GAP },
    { left: target.x + target.width - width, top: target.y - height - GAP },
    { left: target.x, top: target.y - height - GAP },
    { left: target.x + target.width / 2 - width / 2, top: target.y - height - GAP },
    { left: target.x + target.width + GAP, top: target.y },
    { left: target.x + target.width + GAP, top: target.y + target.height / 2 - height / 2 },
    { left: target.x - width - GAP, top: target.y },
    { left: target.x - width - GAP, top: target.y + target.height / 2 - height / 2 },
    ...outside,
  ];

  let best: { spot: CardSpot; score: number } | null = null;
  let near: { spot: CardSpot; score: number } | null = null;
  let fallback: { spot: CardSpot; score: number } | null = null;
  for (const candidate of raw) {
    const spot: CardSpot = {
      top: clamp(candidate.top, minTop, Math.max(minTop, maxTop)),
      left: clamp(candidate.left, minLeft, Math.max(minLeft, maxLeft)),
      width,
    };
    const box = spotBox(spot, height);
    if (box.y + box.height > viewport.height - insets.bottom + 1) continue;
    if (box.y < minTop - 1) continue;
    const phone = viewport.width < TOUR_CARD_WIDTH;
    const targetHit = coverScore(box, target, phone);
    const obstacleHit = (input.obstacles ?? []).reduce((sum, obstacle) => sum + overlapArea(box, obstacle), 0);
    const softHit = (input.softObstacles ?? []).reduce((sum, obstacle) => {
      const area = overlapArea(box, obstacle);
      if (!area) return sum;
      const belowTarget = obstacle.y >= target.y + target.height * 0.5;
      return sum + area * (input.shieldBelow && belowTarget ? 8 : 1);
    }, 0);
    const distance = gapTo(box, target);
    const centered = Math.abs(box.x + box.width / 2 - (target.x + target.width / 2));
    const score =
      targetHit * 1000 + obstacleHit * 40 + softHit + distance + centered * 0.05 + (distance > 36 ? (distance - 36) * 2 : 0);
    if (targetHit === 0 && obstacleHit === 0 && softHit === 0 && (!best || score < best.score)) best = { spot, score };
    if (targetHit === 0 && obstacleHit === 0 && (!near || score < near.score)) near = { spot, score };
    if (!fallback || score < fallback.score) fallback = { spot, score };
  }

  const lastResort: CardSpot = {
    top: Math.max(minTop, Math.min(Number.isFinite(maxTop) ? maxTop : minTop, viewport.height - Math.min(insets.bottom, 120) - height)),
    left: minLeft,
    width,
  };
  return { clear: best?.spot ?? null, fallback: near?.spot ?? fallback?.spot ?? lastResort };
}

export function placeTourCard(input: {
  viewport: { width: number; height: number };
  insets: SafeInsets;
  card: { width: number; height: number };
  target: Box | null;
  obstacles?: readonly Box[];
  /** Day cells. A spot may cover these when that is the only way to stay off the header. */
  softObstacles?: readonly Box[];
  presentation: "center" | "anchor";
  /** Covering days below the target costs more than covering days above it. */
  shieldBelow?: boolean;
}): CardSpot | null {
  const { viewport, insets } = input;
  const height = Math.max(1, input.card.height);
  const minTop = Math.max(TOUR_MARGIN, insets.top);
  const maxTop = viewport.height - insets.bottom - height;
  const full = Math.min(input.card.width, Math.max(200, viewport.width - TOUR_MARGIN * 2));

  if (input.presentation === "center" || !input.target) {
    if (input.presentation === "anchor") return null;
    const left = clamp((viewport.width - full) / 2, TOUR_MARGIN, Math.max(TOUR_MARGIN, viewport.width - TOUR_MARGIN - full));
    return {
      top: clamp((viewport.height - height) / 2 - 36, minTop, Math.max(minTop, maxTop)),
      left,
      width: full,
    };
  }

  const anchored = { ...input, target: input.target };
  const preferred = placeAtWidth(anchored, full);
  if (preferred.clear) return preferred.clear;
  const narrow = Math.min(full, 300);
  if (narrow < full - 8) {
    const retry = placeAtWidth(anchored, narrow);
    if (retry.clear) return retry.clear;
  }
  return preferred.fallback;
}

export function cardSpotInside(
  spot: CardSpot,
  cardHeight: number,
  viewport: { width: number; height: number },
  insets: SafeInsets = { top: 0, bottom: 0 }
): boolean {
  return (
    spot.top >= insets.top - 0.5 &&
    spot.left >= TOUR_MARGIN - 0.5 &&
    spot.left + spot.width <= viewport.width - TOUR_MARGIN + 0.5 &&
    spot.top + cardHeight <= viewport.height - insets.bottom + 0.5
  );
}
