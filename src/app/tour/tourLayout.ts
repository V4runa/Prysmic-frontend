/**
 * Where the words sit. Phone copy docks clear of the tab bar and the keyboard.
 * Desktop copy sits beside the lit control. No measured DOM in here.
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
  bottom?: number;
  left: number;
  width: number;
};

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

export function placeRibbon(input: {
  stop: TourStopId | "closing";
  phone: boolean;
  keyboard: boolean;
  target: Rect | null;
  anchor: Rect | null;
  viewport: { width: number; height: number };
  header: number;
  tabbar: number;
}): RibbonPlace {
  const { viewport, phone, header, tabbar } = input;
  const gutter = 16;
  const width = Math.min(phone ? viewport.width - gutter * 2 : 420, viewport.width - gutter * 2);

  if (!phone && input.stop === "notes" && input.target) {
    const gap = 168;
    const copyWidth = Math.min(340, Math.max(220, input.target.x - gutter - gap));
    return {
      top: Math.max(header + 8, input.target.y - 4),
      left: Math.max(gutter, input.target.x - copyWidth - gap),
      width: copyWidth,
    };
  }

  if (!phone && (input.stop === "tags" || input.stop === "tasks") && input.target) {
    return {
      bottom: 36,
      left: Math.max(gutter, input.target.x),
      width: Math.min(480, Math.max(240, input.target.width)),
    };
  }

  if (!phone && input.stop === "calendar" && input.target) {
    return {
      bottom: 24,
      left: Math.max(gutter, input.target.x + 12),
      width: Math.min(480, Math.max(240, input.target.width - 24)),
    };
  }

  if (!phone && input.stop === "moods" && (input.target || input.anchor)) {
    const box = input.target ?? input.anchor;
    if (box) {
      return {
        top: Math.min(box.y + box.height + 18, viewport.height - 150),
        left: Math.max(gutter, box.x),
        width: Math.min(440, box.width),
      };
    }
  }

  if (input.stop === "closing" || (phone && !input.keyboard)) {
    return {
      bottom: tabbar + 12,
      left: phone ? gutter : Math.max(gutter, (viewport.width - Math.min(560, width)) / 2),
      width: phone ? width : Math.min(560, viewport.width - gutter * 2),
    };
  }

  if (phone) {
    return { top: header + 12, left: gutter, width };
  }

  const target = input.anchor ?? input.target;
  if (!target) {
    return {
      top: Math.max(header + 24, viewport.height * 0.28),
      left: Math.max(gutter, (viewport.width - width) / 2),
      width,
    };
  }

  const besideRight = target.x + target.width + 28;
  const besideLeft = target.x - width - 28;
  const below = target.y + target.height + 18;

  if (input.stop === "notes" && besideLeft >= gutter) {
    return { top: target.y, left: besideLeft, width };
  }

  if ((input.stop === "contracts" || input.stop === "moods") && besideRight + width <= viewport.width - gutter) {
    return { top: Math.max(header + 12, target.y), left: besideRight, width: Math.min(width, 360) };
  }

  return {
    top: Math.min(below, viewport.height - 160),
    left: Math.max(gutter, Math.min(target.x, viewport.width - width - gutter)),
    width,
  };
}
