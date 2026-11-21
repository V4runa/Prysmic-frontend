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

/**
 * The whole mood grid. On a phone, stop the ring at the last full row
 * that sits above the card so a tile is never sliced in half.
 * Width stays the grid's width, so the ring reads as the grid, not a few moods.
 */
export function clipMoodGrid(node: HTMLElement, limitBottom: number | null): TargetBox {
  const grid = node.getBoundingClientRect();
  const radius = getComputedStyle(node).borderRadius || "24px";
  const full: TargetBox = {
    x: grid.x,
    y: grid.y,
    width: grid.width,
    height: grid.height,
    radius,
  };
  if (limitBottom == null || grid.bottom <= limitBottom + 1) return full;
  const tiles = [...node.querySelectorAll("button")].filter((button) => {
    const rect = button.getBoundingClientRect();
    return rect.width > 48 && rect.height > 48;
  });
  const rows: { top: number; bottom: number }[] = [];
  for (const tile of tiles) {
    const rect = tile.getBoundingClientRect();
    const row = rows.find((item) => Math.abs(item.top - rect.top) < 18);
    if (row) row.bottom = Math.max(row.bottom, rect.bottom);
    else rows.push({ top: rect.top, bottom: rect.bottom });
  }
  rows.sort((a, b) => a.top - b.top);
  let bottom = grid.top;
  for (const row of rows) {
    if (row.bottom <= limitBottom) bottom = Math.max(bottom, row.bottom);
    else break;
  }
  const height = bottom - grid.top;
  if (height < 24) return full;
  return { ...full, height };
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
