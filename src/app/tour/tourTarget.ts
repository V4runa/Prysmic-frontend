/**
 * Find the step's target and, on a phone, scroll it into view a single time.
 * Later resize and scroll events only remeasure.
 */

import type { Box } from "./tourPlace";

export type TargetBox = Box & { radius: string };

export function visibleQuery(selector: string): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const nodes = document.querySelectorAll<HTMLElement>(selector);
  for (const node of nodes) {
    const style = getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden") continue;
    const rect = node.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) continue;
    return node;
  }
  return null;
}

export function measureTarget(node: HTMLElement): TargetBox {
  const rect = node.getBoundingClientRect();
  const radius = getComputedStyle(node).borderRadius || "12px";
  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    radius,
  };
}

function unionBox(tiles: HTMLElement[]): TargetBox | null {
  if (tiles.length === 0) return null;
  let x = Infinity;
  let y = Infinity;
  let right = 0;
  let bottom = 0;
  for (const tile of tiles) {
    const rect = tile.getBoundingClientRect();
    x = Math.min(x, rect.x);
    y = Math.min(y, rect.y);
    right = Math.max(right, rect.right);
    bottom = Math.max(bottom, rect.bottom);
  }
  return {
    x,
    y,
    width: right - x,
    height: bottom - y,
    radius: getComputedStyle(tiles[0]).borderRadius || "16px",
  };
}

/**
 * Highlight the whole grid when the card can sit clear of it.
 * Otherwise highlight the last row of moods, including the row above
 * when "Your own" sits on a row by itself.
 */
export function measureMoodRow(
  node: HTMLElement,
  space: { top: number; bottom: number; card: number }
): TargetBox | null {
  if (node.getAttribute("data-tour") !== "mood-grid") return null;
  const grid = node.getBoundingClientRect();
  const cardTop = window.innerHeight - space.bottom - space.card - 18;
  const fits = grid.top >= space.top - 4 && grid.bottom <= cardTop;
  const tiles = [...node.querySelectorAll("button")].filter((button) => {
    const rect = button.getBoundingClientRect();
    return rect.width > 48 && rect.height > 48;
  });
  if (fits || tiles.length === 0) return null;
  const lastTop = tiles[tiles.length - 1].getBoundingClientRect().top;
  let row = tiles.filter((button) => Math.abs(button.getBoundingClientRect().top - lastTop) < 16);
  if (row.length < 3) {
    const earlier = tiles.filter((button) => button.getBoundingClientRect().top < lastTop - 16);
    const prev = earlier[earlier.length - 1];
    if (prev) {
      const prevTop = prev.getBoundingClientRect().top;
      row = [
        ...earlier.filter((button) => Math.abs(button.getBoundingClientRect().top - prevTop) < 16),
        ...row,
      ];
    }
  }
  return unionBox(row);
}

export function sameTarget(current: TargetBox | null, next: TargetBox): boolean {
  if (!current) return false;
  return (
    Math.round(current.x) === Math.round(next.x) &&
    Math.round(current.y) === Math.round(next.y) &&
    Math.round(current.width) === Math.round(next.width) &&
    Math.round(current.height) === Math.round(next.height) &&
    current.radius === next.radius
  );
}
