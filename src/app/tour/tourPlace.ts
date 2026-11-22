/**
 * Where the card sits. It stays inside the safe area (below the header,
 * above the phone tab bar) and does not cover its target.
 */

export const TOUR_CARD_WIDTH = 400;
/** Target edge to card. The ring sits 8px outside the target, so this leaves 12px of clear space. */
export const TOUR_GAP = 20;
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
    const score = targetHit * 5000 + obstacleHit * 80 + softHit * 0.02 + distance * 6;
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
  /** Moods on a wide screen sit under the grid. Phone calendar sits against today's week. */
  bias?: "auto" | "below" | "around-week";
  week?: Box | null;
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

  if (input.bias === "below") {
    const under = placeBelow(input.target, full, height, viewport, insets, input.obstacles ?? []);
    if (under) return under;
  }
  if (input.bias === "around-week" && input.week) {
    const beside = placeAroundWeek(input.week, full, height, viewport, insets, input.obstacles ?? []);
    if (beside) return beside;
  }

  const anchored = { ...input, target: input.target };
  const preferred = placeAtWidth(anchored, full);
  const spot = preferred.clear ?? preferred.fallback;
  if (!spot) return null;
  return nudgeOffTarget(spot, input.target, height, {
    minTop,
    maxTop: viewport.height - insets.bottom - height,
    minLeft: TOUR_MARGIN,
    maxLeft: viewport.width - TOUR_MARGIN - spot.width,
    obstacles: input.obstacles ?? [],
  });
}

function placeBelow(
  target: Box,
  width: number,
  height: number,
  viewport: { width: number; height: number },
  insets: SafeInsets,
  obstacles: readonly Box[]
): CardSpot | null {
  const minTop = Math.max(TOUR_MARGIN, insets.top);
  const maxBottom = viewport.height - insets.bottom;
  const top = target.y + target.height + GAP;
  if (top < minTop - 1 || top + height > maxBottom + 1) return null;
  const lefts = [target.x + target.width / 2 - width / 2, target.x];
  for (const raw of lefts) {
    const left = clamp(raw, TOUR_MARGIN, Math.max(TOUR_MARGIN, viewport.width - TOUR_MARGIN - width));
    const box = spotBox({ top, left, width }, height);
    if (overlapArea(box, target) > 0) continue;
    if (obstacles.some((obstacle) => overlapArea(box, obstacle) > 0)) continue;
    return { top, left, width };
  }
  return null;
}

/** Phone calendar: directly under today's week, or directly above it. */
function placeAroundWeek(
  week: Box,
  width: number,
  height: number,
  viewport: { width: number; height: number },
  insets: SafeInsets,
  obstacles: readonly Box[]
): CardSpot | null {
  const minTop = Math.max(TOUR_MARGIN, insets.top);
  const maxTop = viewport.height - insets.bottom - height;
  const left = TOUR_MARGIN;
  const clear = (top: number, allowObstacles: boolean) => {
    if (top < minTop - 1 || top > maxTop + 1) return false;
    const box = spotBox({ top, left, width }, height);
    if (overlapArea(box, week) > 0) return false;
    if (!allowObstacles && obstacles.some((obstacle) => overlapArea(box, obstacle) > 0)) return false;
    return true;
  };
  const below = week.y + week.height + GAP;
  const above = week.y - height - GAP;
  if (clear(below, false)) return { top: below, left, width };
  if (clear(above, false)) return { top: above, left, width };
  const forcedAbove = clamp(above, minTop, Math.max(minTop, maxTop));
  if (clear(forcedAbove, true)) return { top: forcedAbove, left, width };
  const forcedBelow = clamp(below, minTop, Math.max(minTop, maxTop));
  if (clear(forcedBelow, true)) return { top: forcedBelow, left, width };
  return null;
}

/** Slide a card that still clips its target out along the nearest open side. */
function nudgeOffTarget(
  spot: CardSpot,
  target: Box,
  height: number,
  bounds: { minTop: number; maxTop: number; minLeft: number; maxLeft: number; obstacles: readonly Box[] }
): CardSpot {
  const box = spotBox(spot, height);
  if (overlapArea(box, target) === 0) return spot;
  const shifts = [
    { left: spot.left, top: target.y + target.height + GAP },
    { left: spot.left, top: target.y - height - GAP },
    { left: target.x + target.width + GAP, top: spot.top },
    { left: target.x - spot.width - GAP, top: spot.top },
  ];
  for (const shift of shifts) {
    const top = clamp(shift.top, bounds.minTop, Math.max(bounds.minTop, bounds.maxTop));
    const left = clamp(shift.left, bounds.minLeft, Math.max(bounds.minLeft, bounds.maxLeft));
    const next = spotBox({ top, left, width: spot.width }, height);
    if (overlapArea(next, target) > 0) continue;
    const blocked = bounds.obstacles.some((obstacle) => overlapArea(next, obstacle) > 0);
    if (blocked) continue;
    return { top, left, width: spot.width };
  }
  return spot;
}

/**
 * Keep the card on screen. On a phone it uses the full content width.
 * A card that cannot fit below its target moves up over that target
 * rather than sliding under the tab bar.
 */
export function containTourCard(
  spot: CardSpot,
  cardHeight: number,
  viewport: { width: number; height: number },
  insets: SafeInsets,
  options?: { phone?: boolean }
): CardSpot {
  const phone = options?.phone ?? false;
  const width = phone
    ? Math.max(200, viewport.width - TOUR_MARGIN * 2)
    : Math.min(spot.width, Math.max(200, viewport.width - TOUR_MARGIN * 2));
  const left = phone
    ? TOUR_MARGIN
    : clamp(spot.left, TOUR_MARGIN, Math.max(TOUR_MARGIN, viewport.width - TOUR_MARGIN - width));
  const height = Math.max(1, cardHeight);
  const maxTop = viewport.height - insets.bottom - height;
  const top = maxTop >= insets.top ? clamp(spot.top, insets.top, maxTop) : insets.top;
  return { top, left, width };
}

export type MoodRow = { top: number; bottom: number };

/** Room between the sticky header and the phone Moods ring, including its glow. */
export const MOOD_RING_CLEAR = 12;

/**
 * Phone moods, without scrolling. Ring as many whole rows as fit above the
 * card, at least one, and sit the card directly under that ring. The card
 * stays at its content height when that already covers every row it meets.
 * If it would stop in the middle of a row, it grows only to that row's bottom.
 */
export function placeMoodCard(
  rows: MoodRow[],
  contentHeight: number,
  topInset: number,
  bottomLimit: number,
  gap = 12
): { top: number; minHeight: number; ringRows: number } | null {
  const height = Math.max(1, contentHeight);
  const visible = rows.filter((row) => row.top >= topInset - 1 && row.bottom - row.top > 8);
  const scored: { top: number; minHeight: number; ringRows: number; extra: number }[] = [];
  for (let count = 1; count <= visible.length; count += 1) {
    const top = visible[count - 1].bottom + gap;
    if (top < topInset) continue;
    let bottom = top + height;
    let ok = true;
    for (const row of rows) {
      if (row.bottom <= top + 2) continue;
      if (row.top >= bottom - 2) continue;
      if (row.top < top - 2) {
        ok = false;
        break;
      }
      bottom = Math.max(bottom, row.bottom + 2);
    }
    if (!ok || bottom > bottomLimit) continue;
    scored.push({ top, minHeight: bottom - top, ringRows: count, extra: bottom - (top + height) });
  }
  if (scored.length === 0) {
    const first = visible[0];
    if (!first) return null;
    return { top: first.bottom + gap, minHeight: height, ringRows: 1 };
  }
  scored.sort((a, b) => a.extra - b.extra || b.ringRows - a.ringRows);
  const best = scored[0];
  return { top: best.top, minHeight: best.minHeight, ringRows: best.ringRows };
}

/**
 * Phone moods. Keep the page top in view: scroll up until the heading sits
 * fully under the header, and never scroll down to chase the last row.
 * `delta` is added to scrollTop (negative scrolls back up). After that
 * scroll, `[from, to]` is the prefix of whole rows that fit between the
 * heading and the sheet, with `pad` inside the ring and `sheetGap` between
 * the ring and the sheet. `to` is -1 when no whole row fits.
 */
export function planPhoneMoodRows(input: {
  rows: MoodRow[];
  headerBottom: number;
  sheetTop: number;
  heading?: MoodRow | null;
  pad?: number;
  sheetGap?: number;
  /** Space kept above the ring so the ring and its glow stay below the header. */
  clear?: number;
}): { delta: number; from: number; to: number } | null {
  const pad = input.pad ?? 8;
  const sheetGap = input.sheetGap ?? 12;
  const clear = input.clear ?? MOOD_RING_CLEAR;
  const rows = input.rows;
  if (rows.length === 0) return null;
  const minTileTop = input.headerBottom + clear + pad;
  // The ring's own padding shrinks so the ring stays `sheetGap` above the
  // sheet. A whole row fits when its tiles end at that line.
  const maxTileBottom = input.sheetTop - sheetGap;
  if (!(maxTileBottom > minTileTop + 24)) return null;

  const heading = input.heading;
  const headingGap = 4;
  let delta = 0;
  if (heading && heading.bottom - heading.top > 8) {
    const targetTop = input.headerBottom + headingGap;
    if (heading.top < targetTop - 0.5) delta = heading.top - targetTop;
  } else if (rows[0].top < minTileTop - 0.5) {
    delta = rows[0].top - minTileTop;
  }

  let to = -1;
  for (let index = 0; index < rows.length; index += 1) {
    const top = rows[index].top - delta;
    const bottom = rows[index].bottom - delta;
    if (bottom - top <= 8) continue;
    if (top < minTileTop - 0.5 || bottom > maxTileBottom + 0.5) break;
    to = index;
  }
  return { delta, from: 0, to };
}

export type SidePad = { left: number; right: number; top: number; bottom: number };

/**
 * Keep a ring's stroke at least `clear` px from a neighboring control.
 * A control far enough away leaves the pad alone.
 */
export function ringSidePad(
  target: { left: number; top: number; right: number; bottom: number },
  neighbors: { left: number; top: number; right: number; bottom: number }[],
  pad: number,
  clear = 8,
  stroke = 2
): SidePad {
  const sides: SidePad = { left: pad, right: pad, top: pad, bottom: pad };
  for (const rect of neighbors) {
    const beside = rect.bottom > target.top + 4 && rect.top < target.bottom - 4;
    if (beside && rect.left >= target.right - 2) {
      const max = Math.floor(rect.left - target.right - clear - stroke);
      sides.right = Math.max(0, Math.min(sides.right, max));
    } else if (beside && rect.right <= target.left + 2) {
      const max = Math.floor(target.left - rect.right - clear - stroke);
      sides.left = Math.max(0, Math.min(sides.left, max));
    }
    const stacked = rect.right > target.left + 4 && rect.left < target.right - 4;
    if (stacked && rect.top >= target.bottom - 2) {
      const max = Math.floor(rect.top - target.bottom - clear - stroke);
      sides.bottom = Math.max(0, Math.min(sides.bottom, max));
    } else if (stacked && rect.bottom <= target.top + 2) {
      const max = Math.floor(target.top - rect.bottom - clear - stroke);
      sides.top = Math.max(0, Math.min(sides.top, max));
    }
  }
  return sides;
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
