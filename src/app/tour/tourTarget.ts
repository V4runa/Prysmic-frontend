/**
 * Find the step's target and, on a phone, scroll it into view a single time.
 * Later resize and scroll events only remeasure.
 */

import { TOUR_PHONE_MAX, type Box } from "./tourPlace";

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
 * Phone only. Brings the target into the band above the bottom card once.
 * Does not change the page's layout.
 */
export function revealTargetOnce(node: HTMLElement): void {
  if (typeof window === "undefined") return;
  if (window.innerWidth >= TOUR_PHONE_MAX) return;

  const cardReserve = 240;
  const header = 72;
  const rect = node.getBoundingClientRect();
  const viewTop = header + 8;
  const viewBottom = window.innerHeight - cardReserve;
  if (rect.top >= viewTop && rect.bottom <= viewBottom) return;

  const scroller = node.closest(".app-scroll");
  if (scroller instanceof HTMLElement) {
    const frame = scroller.getBoundingClientRect();
    const visibleTop = Math.max(frame.top, viewTop);
    const visibleBottom = Math.min(frame.bottom, viewBottom);
    const visibleHeight = Math.max(1, visibleBottom - visibleTop);
    const delta =
      rect.height >= visibleHeight
        ? rect.top - visibleTop
        : rect.top - visibleTop - visibleHeight / 2 + rect.height / 2;
    scroller.scrollBy({ top: delta, behavior: "auto" });
    return;
  }

  node.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
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
