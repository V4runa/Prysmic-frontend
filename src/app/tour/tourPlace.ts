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

function gapTo(card: Box, target: Box): number {
  const dx = Math.max(card.x - (target.x + target.width), target.x - (card.x + card.width), 0);
  const dy = Math.max(card.y - (target.y + target.height), target.y - (card.y + card.height), 0);
  return Math.hypot(dx, dy);
}

function spotBox(spot: { top: number; left: number; width: number }, height: number): Box {
  return { x: spot.left, y: spot.top, width: spot.width, height };
}

export function placeTourCard(input: {
  viewport: { width: number; height: number };
  insets: SafeInsets;
  card: { width: number; height: number };
  target: Box | null;
  obstacles?: readonly Box[];
  presentation: "center" | "anchor";
}): CardSpot | null {
  const { viewport, insets } = input;
  const width = Math.min(input.card.width, Math.max(200, viewport.width - TOUR_MARGIN * 2));
  const height = Math.max(1, input.card.height);
  const minTop = Math.max(TOUR_MARGIN, insets.top);
  const maxTop = viewport.height - insets.bottom - height;
  const minLeft = TOUR_MARGIN;
  const maxLeft = viewport.width - TOUR_MARGIN - width;

  const center = (): CardSpot => ({
    top: clamp((viewport.height - height) / 2 - 36, minTop, Math.max(minTop, maxTop)),
    left: clamp((viewport.width - width) / 2, minLeft, Math.max(minLeft, maxLeft)),
    width,
  });

  if (input.presentation === "center" || !input.target) {
    if (input.presentation === "anchor") return null;
    return center();
  }

  const target = input.target;
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
    const targetHit = overlapArea(box, target);
    const obstacleHit = (input.obstacles ?? []).reduce((sum, obstacle) => {
      const area = overlapArea(box, obstacle);
      if (!area) return sum;
      const lower = box.y + box.height / 2 > obstacle.y + obstacle.height / 2 ? 4 : 1;
      return sum + area * lower;
    }, 0);
    const distance = gapTo(box, target);
    const score = targetHit * 1000 + obstacleHit * 8 + distance + (distance > 36 ? (distance - 36) * 2 : 0);
    if (targetHit === 0 && obstacleHit === 0 && (!best || score < best.score)) best = { spot, score };
    if (targetHit === 0 && (!fallback || score < fallback.score)) fallback = { spot, score };
  }

  return best?.spot ?? fallback?.spot ?? null;
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
