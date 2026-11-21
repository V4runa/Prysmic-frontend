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
