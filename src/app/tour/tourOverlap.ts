export type OverlapBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * A cover cuts an item when it crosses the item without swallowing it.
 * Fully clear and fully covered are both fine.
 */
export function partialOverlap(cover: OverlapBox, item: OverlapBox, slack = 2): boolean {
  const coverRight = cover.x + cover.width;
  const coverBottom = cover.y + cover.height;
  const itemRight = item.x + item.width;
  const itemBottom = item.y + item.height;
  const misses =
    coverRight <= item.x + slack ||
    itemRight <= cover.x + slack ||
    coverBottom <= item.y + slack ||
    itemBottom <= cover.y + slack;
  if (misses) return false;
  const contains =
    cover.x <= item.x + slack &&
    cover.y <= item.y + slack &&
    coverRight >= itemRight - slack &&
    coverBottom >= itemBottom - slack;
  return !contains;
}
