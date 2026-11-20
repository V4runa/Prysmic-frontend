import type { Rect } from "./tourLayout";

export function toRect(dom: DOMRect): Rect {
  return { x: dom.x, y: dom.y, width: dom.width, height: dom.height };
}

/** True while a page is still fetching. The tour stays dark until this is false. */
export function pageIsBusy(): boolean {
  if (typeof document === "undefined") return false;
  const root = document.querySelector("main") ?? document.body;
  if (root.querySelector("[data-tour-loading], .animate-pulse")) return true;
  const nodes = root.querySelectorAll("div, p");
  for (const node of nodes) {
    if (node.childElementCount === 0 && node.textContent?.trim() === "Loading...") return true;
  }
  return false;
}

/** The first element that is actually on screen. Hidden desktop/phone twins are skipped. */
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

export function visibleRects(selectors: readonly string[]): { element: HTMLElement | null; rects: Rect[] } {
  let element: HTMLElement | null = null;
  const rects: Rect[] = [];
  for (const selector of selectors) {
    const node = visibleQuery(selector);
    if (!node) continue;
    if (!element) element = node;
    rects.push(toRect(node.getBoundingClientRect()));
  }
  return { element, rects };
}

/** Scroll inside the nearest notes/calendar panel, not the locked page body. */
export function scrollIntoPanel(element: HTMLElement, reduced: boolean): void {
  const scroller = element.closest(".app-scroll");
  if (!(scroller instanceof HTMLElement)) {
    element.scrollIntoView({ block: "center", inline: "nearest", behavior: reduced ? "auto" : "smooth" });
    return;
  }
  const frame = scroller.getBoundingClientRect();
  const rect = element.getBoundingClientRect();
  const above = rect.top < frame.top + 12;
  const below = rect.bottom > frame.bottom - 12;
  if (!above && !below) return;
  const delta = rect.top - frame.top - frame.height / 2 + rect.height / 2;
  scroller.scrollBy({ top: delta, behavior: reduced ? "auto" : "smooth" });
}

export function focusables(root: ParentNode | null): HTMLElement[] {
  if (!root) return [];
  const nodes = root.querySelectorAll<HTMLElement>(
    "a[href], button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex='-1'])"
  );
  return [...nodes].filter((node) => {
    const style = getComputedStyle(node);
    return style.display !== "none" && style.visibility !== "hidden";
  });
}
