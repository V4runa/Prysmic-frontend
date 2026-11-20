/**
 * Where the words and the light sit. Phone copy docks above the tab bar.
 * Desktop copy sits near the lit control. No measured DOM in here.
 */

import type { TourStopId } from "./tourStops";

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type RibbonPlace = {
  top?: number;
  /** Pixels, or a CSS length such as a safe-area calc. */
  bottom?: number | string;
  left: number;
  width: number;
};

/** Soft halo derived from a target's box. The rect is the fully lit core. */
export type GlowFocus = {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Blur radius, in px. The falloff lives outside the core. */
  feather: number;
  radius: number;
};

/** Rough height of a stop panel, used only to keep it inside the viewport. */
export const RIBBON_ESTIMATE = 168;

/**
 * Phone panels sit this far above the tab bar. The CSS variable already
 * includes the safe-area inset, so a short or notched phone cannot tuck
 * Back / Not today under the bar.
 */
export const PHONE_RIBBON_BOTTOM = "calc(var(--bottomnav-h) + 1.75rem)";

export function unionRect(rects: readonly Rect[]): Rect | null {
  if (rects.length === 0) return null;
  const x = Math.min(...rects.map((rect) => rect.x));
  const y = Math.min(...rects.map((rect) => rect.y));
  const right = Math.max(...rects.map((rect) => rect.x + rect.width));
  const bottom = Math.max(...rects.map((rect) => rect.y + rect.height));
  return { x, y, width: right - x, height: bottom - y };
}

export function padRect(rect: Rect, pad: number, extraBottom = 0): Rect {
  return {
    x: rect.x - pad,
    y: rect.y - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2 + extraBottom,
  };
}

export function clampRect(rect: Rect, viewport: { width: number; height: number }, margin = 8): Rect {
  const width = Math.max(32, Math.min(rect.width, viewport.width - margin * 2));
  const height = Math.max(32, Math.min(rect.height, viewport.height - margin * 2));
  const x = Math.min(Math.max(rect.x, margin), viewport.width - width - margin);
  const y = Math.min(Math.max(rect.y, margin), viewport.height - height - margin);
  return { x, y, width, height };
}

/**
 * A feathered halo that follows the target's box.
 * The returned rect is expanded so a blur of `feather` still leaves the
 * real control fully bright, with the falloff outside it.
 */
export function glowFor(rect: Rect | null): GlowFocus | null {
  if (!rect || rect.width < 1 || rect.height < 1) return null;
  const feather = Math.round(Math.max(28, Math.min(56, Math.max(rect.width, rect.height) * 0.06 + 26)));
  const expand = Math.round(feather * 0.85);
  const width = rect.width + expand * 2;
  const height = rect.height + expand * 2;
  return {
    x: rect.x - expand,
    y: rect.y - expand,
    width,
    height,
    feather,
    radius: Math.min(32, height / 2, width / 2),
  };
}

/**
 * Where the guide rests once a stop is lit.
 * Calendar stays inside today's cell. Other stops keep a corner perch.
 */
export function lanternAnchor(rect: Rect, stopId: string | null): { x: number; y: number } {
  if (stopId === "calendar") {
    // Phone cells are narrow and center the numeral. Sit in the top corner
    // so the date stays readable, still inside today's cell.
    if (rect.width < 78) {
      return {
        x: rect.x + rect.width - 2,
        y: rect.y + 6,
      };
    }
    return {
      x: rect.x + rect.width / 2,
      y: rect.y + Math.min(20, Math.max(14, rect.height * 0.22)),
    };
  }
  if (stopId === "tasks") return { x: rect.x - 16, y: rect.y + 26 };
  return { x: rect.x - 14, y: rect.y - 22 };
}

export function placeRibbon(input: {
  stop: TourStopId | "closing";
  phone: boolean;
  keyboard: boolean;
  target: Rect | null;
  anchor: Rect | null;
  viewport: { width: number; height: number };
  header: number;
  tabbar: number;
  panelHeight?: number;
}): RibbonPlace {
  const { viewport, phone, header, keyboard } = input;
  const gutter = 16;
  const width = Math.min(phone ? viewport.width - gutter * 2 : 440, Math.max(160, viewport.width - gutter * 2));
  const panel = input.panelHeight ?? RIBBON_ESTIMATE;

  if (phone && keyboard) {
    return { top: header + 12, left: gutter, width };
  }

  if (phone) {
    return {
      bottom: PHONE_RIBBON_BOTTOM,
      left: gutter,
      width,
    };
  }

  const target = input.target ?? input.anchor;
  const maxLeft = Math.max(gutter, viewport.width - width - gutter);
  const floor = header + 16;
  const ceil = Math.max(floor, viewport.height - panel - 20);

  if (!target) {
    return {
      top: Math.min(Math.max(floor, viewport.height * 0.58), ceil),
      left: Math.max(gutter, Math.min((viewport.width - width) / 2, maxLeft)),
      width,
    };
  }

  const gap = 36;
  const below = target.y + target.height + gap;
  const above = target.y - gap - panel;
  const tight = target.y + target.height + 18;
  if (below <= ceil || tight <= ceil || above >= floor) {
    const top = below <= ceil ? below : tight <= ceil ? tight : above;
    const idealLeft = target.x + target.width / 2 - width / 2;
    return {
      top,
      left: Math.min(Math.max(idealLeft, gutter), maxLeft),
      width,
    };
  }

  // The subject fills the screen. Sit beside it when the margins allow,
  // otherwise along the bottom edge, clear of the top of the subject.
  const beside = Math.min(width, 360);
  const right = target.x + target.width + gap;
  const left = target.x - gap - beside;
  const besideTop = Math.min(Math.max(target.y, floor), Math.max(floor, viewport.height - panel - 20));
  if (right + beside <= viewport.width - gutter) {
    return { top: besideTop, left: right, width: beside };
  }
  if (left >= gutter) {
    return { top: besideTop, left, width: beside };
  }
  return {
    top: ceil,
    left: Math.min(Math.max(target.x + target.width / 2 - width / 2, gutter), maxLeft),
    width,
  };
}

/** True when a placed panel's box cuts through the lit subject. */
export function ribbonHitsTarget(
  place: RibbonPlace,
  target: Rect,
  panelHeight: number,
  viewportHeight: number
): boolean {
  const top = place.top ?? Math.max(0, viewportHeight - (typeof place.bottom === "number" ? place.bottom : 0) - panelHeight);
  const bottom = top + panelHeight;
  const left = place.left;
  const right = place.left + place.width;
  const separated =
    bottom <= target.y ||
    top >= target.y + target.height ||
    right <= target.x ||
    left >= target.x + target.width;
  return !separated;
}
