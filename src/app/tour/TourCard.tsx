"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { btnPrimary, btnSecondary } from "../components/forms/styles";
import { containTourCard, MOOD_RING_CLEAR, placeMoodCard, placeTourCard, planPhoneMoodRows, ringSidePad, TOUR_CARD_WIDTH, type Box, type CardSpot, type SafeInsets } from "./tourPlace";
import {
  TOUR_CLOSE,
  TOUR_CONTROLS,
  TOUR_FADE_MS,
  TOUR_STEPS,
  TOUR_WELCOME,
  tourProgressLabel,
  tourStepByIndex,
} from "./tourStops";
import { clipMoodGrid, measureTarget, sameTarget, visibleQuery, type TargetBox } from "./tourTarget";
import type { TourPhase } from "./tourMachine";

type OpenPhase = Exclude<TourPhase, "idle" | "done">;

type TourCardProps = {
  phase: OpenPhase;
  index: number;
  pathname: string;
  onStart: () => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  onDone: () => void;
};

type Chrome = SafeInsets & { nav: Box | null; flame: Box | null };

const CARD_ESTIMATE = 220;
const RING_PAD = 8;
/** Clear space from the ring's edge to the card. */
const RING_GAP = 12;
const CALENDAR_RING_PAD = 0;
const NOTES_RING_PAD = 2;
const CONTRACTS_RING_PAD = 0;

function focusables(root: ParentNode | null): HTMLElement[] {
  if (!root) return [];
  const nodes = root.querySelectorAll<HTMLElement>(
    "button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex='-1'])"
  );
  return [...nodes].filter((node) => {
    const style = getComputedStyle(node);
    return style.display !== "none" && style.visibility !== "hidden";
  });
}

function toBox(rect: DOMRect, pad = 0): Box {
  return {
    x: rect.x - pad,
    y: rect.y - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  };
}

function readChrome(): Chrome {
  const header = document.querySelector(".app-header");
  const nav = document.querySelector(".app-bottom-nav");
  const headerH = header instanceof HTMLElement ? header.getBoundingClientRect().height : 56;
  let navBox: Box | null = null;
  if (nav instanceof HTMLElement && getComputedStyle(nav).display !== "none") {
    const rect = nav.getBoundingClientRect();
    if (rect.height > 1 && rect.top < window.innerHeight - 1) {
      navBox = { x: rect.x, y: rect.top, width: rect.width, height: rect.height };
    }
  }
  const flameNode = [...document.querySelectorAll("span")].find((node) => {
    if (node.textContent !== "🔥") return false;
    return /text-6xl|text-8xl/.test(node.parentElement?.className ?? "");
  });
  const flame = flameNode instanceof HTMLElement ? toBox(flameNode.getBoundingClientRect(), 96) : null;
  return {
    top: headerH + 12,
    bottom: Math.min(navBox?.height ?? 0, 96) + 12,
    nav: navBox,
    flame,
  };
}

function keepBoxes(target: HTMLElement | null): Box[] {
  const boxes: Box[] = [];
  for (const node of document.querySelectorAll<HTMLElement>("[data-tour-keep]")) {
    if (target && (node === target || target.contains(node))) continue;
    const style = getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden") continue;
    const rect = node.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) continue;
    const wideLine = node.tagName === "P" && rect.width > 480 && rect.height < 140;
    boxes.push(
      wideLine
        ? {
            x: rect.x + (rect.width - 280) / 2,
            y: rect.y - 8,
            width: 280,
            height: rect.height + 16,
          }
        : toBox(rect, 12)
    );
  }
  return boxes;
}

/** The lowest edge that covers the grid: the sticky header, or a clipping scroller. */
function moodOcclusionTop(grid: HTMLElement, headerBottom: number): number {
  let edge = headerBottom;
  let node: HTMLElement | null = grid.parentElement;
  while (node && node !== document.body) {
    const style = getComputedStyle(node);
    const clipsY = style.overflowY === "auto" || style.overflowY === "scroll" || style.overflowY === "hidden";
    if (clipsY) {
      const top = node.getBoundingClientRect().top;
      if (top > edge) edge = top;
    }
    node = node.parentElement;
  }
  return edge;
}

/** Room for the ring's padding and the soft glow, so neither sits in the header. */
const MOOD_GLOW = 18;

type MoodFit = "a" | "b" | "c" | "d";

const NEST_CLEAR = 12;
const NEST_MIN_WIDTH = 280;
/** The cyan line is a 2px stroke drawn outside the ring element. */
const RING_STROKE = 2;

type MoodRect = { left: number; top: number; right: number; bottom: number };

function rectGap(a: MoodRect, b: MoodRect): number {
  const gapX = Math.max(a.left - b.right, b.left - a.right);
  const gapY = Math.max(a.top - b.bottom, b.top - a.bottom);
  if (gapX < 0 && gapY < 0) return 0;
  if (gapX < 0) return gapY;
  if (gapY < 0) return gapX;
  return Math.hypot(gapX, gapY);
}

/**
 * Lowest ring-element edge whose stroke stays inside the moods panel and
 * at least 12px above the viewport.
 */
function moodRingLimit(grid: HTMLElement, viewportHeight: number): number {
  const panel = grid.closest(".app-workspace-moods");
  const panelBottom = panel instanceof HTMLElement ? panel.getBoundingClientRect().bottom : viewportHeight;
  return Math.min(viewportHeight - 12, panelBottom) - RING_STROKE;
}

/**
 * Card in the empty end of the last row, after `shiftY` of upward scroll.
 * The ring grows to keep the card 12px inside its line. Null when that
 * covers a tile or clips one. The caller checks the viewport and the panel.
 */
function nestedMoodLayout(
  grid: HTMLElement,
  cardHeight: number,
  _viewportHeight: number,
  shiftY: number
): { spot: CardSpot; ring: TargetBox; ringBottom: number } | null {
  const buttons = [...grid.querySelectorAll("button")].filter((button) => button.getBoundingClientRect().height > 48);
  const own = buttons.find((button) => /your own/i.test(button.textContent ?? ""));
  if (!own) return null;
  const moved = (node: HTMLElement): MoodRect => {
    const rect = node.getBoundingClientRect();
    return { left: rect.left, top: rect.top - shiftY, right: rect.right, bottom: rect.bottom - shiftY };
  };
  const ownBox = moved(own);
  const tiles = buttons.map((button) => moved(button));
  const gridBox = moved(grid);
  const header = document.querySelector(".app-header");
  const headerBottom = header instanceof HTMLElement ? header.getBoundingClientRect().bottom : 0;
  const clipTop = moodOcclusionTop(grid, headerBottom);
  const minTop = Math.round(Math.max(clipTop, headerBottom + 12 + RING_PAD));
  const firstTop = Math.min(...tiles.map((tile) => tile.top));
  const lastBottom = Math.max(...tiles.map((tile) => tile.bottom));
  if (firstTop < minTop - 1) return null;
  const above = tiles.filter((tile) => tile.bottom <= ownBox.top + 8 && tile.right > ownBox.right - 8);
  const ceiling = above.length > 0 ? Math.max(...above.map((tile) => tile.bottom)) : ownBox.top;
  const top = Math.max(ownBox.top, ceiling + NEST_CLEAR);
  const ringRight = gridBox.right + RING_PAD;
  const left = ownBox.right + NEST_CLEAR;
  const available = ringRight - NEST_CLEAR - left;
  if (available < NEST_MIN_WIDTH - 0.5) return null;
  const width = Math.min(TOUR_CARD_WIDTH, Math.floor(available));
  const card: MoodRect = { left, top, right: left + width, bottom: top + cardHeight };
  if (tiles.some((tile) => rectGap(card, tile) < NEST_CLEAR - 0.5)) return null;
  const ringLeft = Math.min(gridBox.left - RING_PAD, card.left - NEST_CLEAR);
  const ringTop = Math.min(firstTop - RING_PAD, card.top - NEST_CLEAR);
  const ringBottom = Math.max(lastBottom + RING_PAD, card.bottom + NEST_CLEAR);
  const ringFar = Math.max(ringRight, card.right + NEST_CLEAR);
  return {
    spot: { top: Math.round(top), left: Math.round(left), width: Math.round(width) },
    ring: {
      x: ringLeft,
      y: ringTop,
      width: ringFar - ringLeft,
      height: Math.max(24, ringBottom - ringTop),
      radius: getComputedStyle(grid).borderRadius || "24px",
    },
    ringBottom,
  };
}

/** Nested placement whose stroke stays inside the panel and 12px above the viewport. */
function nestedMoodSpot(
  grid: HTMLElement,
  cardHeight: number,
  viewportHeight: number,
  shiftY: number
): { spot: CardSpot; ring: TargetBox } | null {
  const laid = nestedMoodLayout(grid, cardHeight, viewportHeight, shiftY);
  if (!laid || laid.ringBottom > moodRingLimit(grid, viewportHeight) + 0.5) return null;
  return { spot: laid.spot, ring: laid.ring };
}

/**
 * Scroll that keeps the nested ring legal. Extra lift is only enough to
 * clear the panel and the viewport. With `keepHeading`, that lift may not
 * put the heading under the header.
 */
function nestedMoodDelta(
  grid: HTMLElement,
  cardHeight: number,
  viewportHeight: number,
  shiftY: number,
  keepHeading: boolean,
  headerBottom: number
): number | null {
  const laid = nestedMoodLayout(grid, cardHeight, viewportHeight, shiftY);
  if (!laid) return null;
  const limit = moodRingLimit(grid, viewportHeight);
  let delta = shiftY;
  if (laid.ringBottom > limit + 0.5) {
    const extra = Math.ceil(laid.ringBottom - limit);
    const lifted = nestedMoodLayout(grid, cardHeight, viewportHeight, shiftY + extra);
    if (!lifted || lifted.ringBottom > limit + 0.5) return null;
    delta = shiftY + extra;
  }
  if (keepHeading) {
    const head = grid.closest(".wide-mood-head")?.querySelector("h2");
    const headTop = head instanceof HTMLElement ? head.getBoundingClientRect().top : headerBottom;
    if (headTop - delta < headerBottom - 1) return null;
  }
  return Math.round(delta);
}

/**
 * Desktop Moods. The first row stays fully on screen and inside the ring.
 * Prefer the whole grid with the card in the corner. If that cannot fit,
 * keep a prefix of rows that starts at the first row and leave later rows
 * out. `delta` is how far the panel still needs to scroll.
 */
function planWideMoods(
  grid: HTMLElement,
  cardHeight: number,
  viewportHeight: number
): { rows: { top: number; bottom: number }[]; delta: number; gap: number; clipTop: number; fit: MoodFit } | null {
  const rows = moodRows(grid);
  if (rows.length === 0) return null;
  const header = document.querySelector(".app-header");
  const headerBottom = header instanceof HTMLElement ? header.getBoundingClientRect().bottom : 0;
  const clipTop = moodOcclusionTop(grid, headerBottom);
  // The card sits `gap` under the last tile when it is outside the ring.
  const gap = RING_PAD + 12;
  const minTop = Math.round(Math.max(clipTop, headerBottom + 12 + RING_PAD));
  // The ring element sits RING_PAD outside the tiles, and its stroke must stay
  // inside the panel and 12px above the viewport. The card sits `gap` under
  // the last tile when it is not nested in the corner.
  const ringLimit = moodRingLimit(grid, viewportHeight);
  const maxBottom = Math.min(viewportHeight - 4 - cardHeight - gap, ringLimit - RING_PAD);
  const head = grid.closest(".wide-mood-head")?.querySelector("h2");
  const headTop = head instanceof HTMLElement ? head.getBoundingClientRect().top : clipTop;
  const first = rows[0];
  const last = rows[rows.length - 1];
  const scroller = grid.closest(".app-scroll");
  const origin = scroller instanceof HTMLElement ? scroller.scrollTop : 0;
  const headTop0 = headTop + origin;
  const first0 = first.top + origin;
  const last0 = last.bottom + origin;
  const headBottom0 = (head instanceof HTMLElement ? head.getBoundingClientRect().bottom : headTop) + origin;
  const scrollerBottom = scroller instanceof HTMLElement ? scroller.getBoundingClientRect().bottom : viewportHeight;
  const clipBottom = Math.min(ringLimit - RING_PAD, scrollerBottom - 2);
  const headingOnScreen = headTop0 >= headerBottom - 1 && headBottom0 <= clipBottom;
  const gridOnScreen = first0 >= minTop - 1 && last0 <= clipBottom;
  const nest = (shiftY: number, keepHeading: boolean) =>
    nestedMoodDelta(grid, cardHeight, viewportHeight, shiftY, keepHeading, headerBottom);
  const atRest = nest(-origin, true);
  if (headingOnScreen && gridOnScreen && atRest != null) {
    return { rows, delta: atRest, gap, clipTop: minTop, fit: "c" };
  }
  const pastClip = Math.max(0, Math.round(last0 - clipBottom));
  const pastDelta = pastClip > 0 ? nest(pastClip - origin, true) : null;
  if (pastDelta != null) {
    return { rows, delta: pastDelta, gap, clipTop: minTop, fit: "c" };
  }
  const targetScroll = Math.round(first0 - minTop);
  const shiftNow = targetScroll - origin;
  const rowDelta = targetScroll >= 0 ? nest(shiftNow, true) : null;
  if (rowDelta != null) {
    return { rows, delta: rowDelta, gap, clipTop: minTop, fit: "c" };
  }
  // A little more scroll may put the heading under the header. Tiles stay whole.
  const lifted = nest(-origin, false);
  if (lifted != null) {
    return { rows, delta: lifted, gap, clipTop: minTop, fit: "c" };
  }
  const lift = Math.max(0, last0 - maxBottom);
  const headingLimit = Math.max(clipTop, headerBottom);
  const headingStays = headTop0 - lift >= headingLimit - 1;
  const wholeStays = first0 - lift >= minTop - 1;
  if (wholeStays && headingStays) return { rows, delta: Math.round(lift - origin), gap, clipTop: minTop, fit: "a" };
  const nestShift = Math.round(first.top - minTop);
  const nestDelta = nest(nestShift, false);
  if (nestDelta != null) {
    return { rows, delta: nestDelta, gap, clipTop: minTop, fit: "c" };
  }
  const belowMax = Math.min(viewportHeight - 24 - cardHeight - gap, ringLimit - RING_PAD);
  const belowLift = Math.max(0, last.bottom - belowMax);
  if (first.top - belowLift >= minTop - 1) {
    return { rows, delta: Math.round(belowLift), gap, clipTop: minTop, fit: "b" };
  }
  // Later rows drop off. The first row never does.
  let count = 1;
  const room = first.top - minTop;
  for (let i = 0; i < rows.length; i += 1) {
    const span = rows[i].bottom - first.top;
    if (span > maxBottom - minTop + 0.5) break;
    const need = Math.max(0, rows[i].bottom - maxBottom);
    if (room >= 0 && need > room + 0.5) break;
    count = i + 1;
  }
  const shownLast = rows[count - 1];
  const need = Math.max(0, shownLast.bottom - maxBottom);
  // A negative room means the first row is already above the header. Scroll back.
  const delta = room < 0 ? room : Math.min(room, need);
  return { rows: rows.slice(0, count), delta: Math.round(delta), gap, clipTop: minTop, fit: "d" };
}

function moodLiftWrap(grid: HTMLElement): HTMLElement | null {
  const wrap = grid.closest(".wide-mood-head")?.parentElement;
  return wrap instanceof HTMLElement ? wrap : null;
}

function moodRows(grid: HTMLElement): { top: number; bottom: number }[] {
  const tiles = [...grid.querySelectorAll("button")].filter((button) => button.getBoundingClientRect().height > 48);
  const rows: { top: number; bottom: number }[] = [];
  for (const tile of tiles) {
    const box = tile.getBoundingClientRect();
    const row = rows.find((item) => Math.abs(item.top - box.top) < 18);
    if (row) row.bottom = Math.max(row.bottom, box.bottom);
    else rows.push({ top: box.top, bottom: box.bottom });
  }
  rows.sort((a, b) => a.top - b.top);
  return rows;
}

function layoutPhoneMoods(
  cardHeight: number,
  topInset: number,
  bottomInset: number,
  viewport: { width: number; height: number }
): { spot: CardSpot; ring: TargetBox } | null {
  const grid = visibleQuery("[data-tour='mood-grid']");
  if (!grid) return null;
  const rect = grid.getBoundingClientRect();
  const rows = moodRows(grid);
  if (rows.length === 0) return null;
  const placed = placeMoodCard(rows, cardHeight, topInset, viewport.height - bottomInset, RING_GAP);
  if (!placed) return null;
  const width = Math.max(200, viewport.width - 32);
  const included = rows.filter((row) => row.top >= topInset - 1 && row.bottom <= placed.top + 1);
  const first = included[0];
  const last = included[included.length - 1];
  const ringTop = first ? Math.max(first.top, topInset - 12) : rect.y;
  const ringBottom = last ? last.bottom : Math.min(rect.bottom, placed.top);
  return {
    spot: { top: placed.top, left: 16, width },
    ring: {
      x: rect.x,
      y: ringTop,
      width: rect.width,
      height: Math.max(24, ringBottom - ringTop),
      radius: getComputedStyle(grid).borderRadius || "24px",
    },
  };
}

function layoutWideMoods(
  _cardHeight: number,
  _topInset: number,
  _bottomInset: number,
  viewport: { width: number; height: number }
): { spot: CardSpot; ring: TargetBox; nested: boolean } | null {
  const grid = visibleQuery("[data-tour='mood-grid']");
  if (!grid) return null;
  const rect = grid.getBoundingClientRect();
  const width = Math.min(TOUR_CARD_WIDTH, viewport.width - 32);
  const ring: TargetBox = {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    radius: getComputedStyle(grid).borderRadius || "24px",
  };
  const left = Math.min(
    Math.max(16, rect.x + rect.width / 2 - width / 2),
    Math.max(16, viewport.width - 16 - width)
  );
  const liveMood = document.querySelector("[data-tour-card='moods']");
  const liveMoodBox = liveMood instanceof HTMLElement ? liveMood.getBoundingClientRect() : null;
  const liveMoodH =
    liveMood instanceof HTMLElement &&
    /Moods/.test(liveMood.textContent ?? "") &&
    liveMoodBox &&
    liveMoodBox.height > 40
      ? Math.ceil(liveMoodBox.height)
      : _cardHeight;
  // The corner card uses tighter padding. Plan with that, or the tall card
  // makes the ring look like it will not fit and the ring is dropped.
  const cardH = document.documentElement.dataset.moodNest === "1" ? liveMoodH : Math.max(160, liveMoodH - 26);
  const plan = planWideMoods(grid, cardH, viewport.height);
  if (plan?.fit === "c") {
    const nest = nestedMoodSpot(grid, cardH, viewport.height, 0);
    if (nest) {
      document.documentElement.dataset.moodFit = "c";
      return { spot: nest.spot, ring: nest.ring, nested: true };
    }
  }
  if (plan && plan.rows.length > 0) {
    document.documentElement.dataset.moodFit = plan.fit;
    const visible = plan.rows.filter((row) => row.top >= plan.clipTop - 1);
    const shown = visible.length > 0 ? visible : plan.rows;
    const topRow = shown[0];
    const bottomRow = shown[shown.length - 1];
    return {
      spot: { top: bottomRow.bottom + plan.gap, left, width },
      ring: {
        x: rect.x,
        y: topRow.top,
        width: rect.width,
        height: Math.max(24, bottomRow.bottom - topRow.top),
        radius: ring.radius,
      },
      nested: false,
    };
  }
  return { spot: { top: rect.bottom + RING_PAD + RING_GAP, left, width }, ring, nested: false };
}

function layoutLoggedMood(
  entry: TargetBox,
  cardHeight: number,
  topInset: number,
  bottomInset: number,
  viewport: { width: number; height: number }
): CardSpot {
  const width = Math.min(TOUR_CARD_WIDTH, viewport.width - 32);
  const gap = RING_PAD + RING_GAP;
  let top = entry.y + entry.height + gap;
  const maxTop = viewport.height - bottomInset - cardHeight;
  if (top > maxTop && maxTop >= entry.y + entry.height + RING_GAP) top = maxTop;
  const left = Math.min(
    Math.max(16, entry.x + entry.width / 2 - width / 2),
    Math.max(16, viewport.width - 16 - width)
  );
  return { top: Math.max(topInset, top), left, width };
}

function layoutDayPanelCard(
  cardHeight: number,
  bottomInset: number,
  viewport: { width: number; height: number }
): CardSpot | null {
  const mood = [...document.querySelectorAll("[data-tour-keep='mood']")].find((node) => {
    if (!(node instanceof HTMLElement)) return false;
    const style = getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden") return false;
    const rect = node.getBoundingClientRect();
    return rect.width > 2 && rect.height > 2 && rect.bottom > 0 && rect.top < viewport.height;
  });
  if (!(mood instanceof HTMLElement)) return null;
  const moodBox = mood.getBoundingClientRect();
  if (moodBox.width < 2) return null;
  const quick = document.querySelector("[data-tour-keep='quick']");
  const quickTop = quick instanceof HTMLElement ? quick.getBoundingClientRect().top : viewport.height - bottomInset;
  const aside = mood.closest("aside");
  const glass = aside?.querySelector(":scope > .glass-card");
  const shell = glass instanceof HTMLElement ? glass : aside instanceof HTMLElement ? aside : mood;
  const panel = shell.getBoundingClientRect();
  const style = getComputedStyle(shell);
  const padL = Number.parseFloat(style.paddingLeft) || 16;
  const padR = Number.parseFloat(style.paddingRight) || 16;
  const left = panel.x + padL;
  const width = Math.max(200, panel.width - padL - padR);
  let top = moodBox.bottom + 28;
  const maxTop = Math.min(viewport.height - bottomInset - cardHeight, quickTop - cardHeight - 12);
  if (maxTop < moodBox.bottom + 8) return null;
  top = Math.min(Math.max(top, moodBox.bottom + 12), maxTop);
  return { top, left, width };
}

/** Contracts: under the New Contract button, right edge aligned with it. */
function layoutContracts(
  cardHeight: number,
  viewport: { width: number; height: number }
): CardSpot | null {
  const button = visibleQuery("[data-tour='contracts-create']");
  if (!button) return null;
  const box = button.getBoundingClientRect();
  if (box.width < 2 || box.height < 2) return null;
  const quiet = document.querySelector("[data-tour-quiet]");
  const quietBox = quiet instanceof HTMLElement ? quiet.getBoundingClientRect() : null;
  const belowCopy = quietBox && quietBox.height > 8 && quietBox.bottom > box.top ? quietBox.bottom + 12 : 0;
  const width = Math.min(TOUR_CARD_WIDTH, viewport.width - 32);
  const top = Math.round(Math.max(box.bottom + 16, belowCopy));
  const left = Math.round(Math.max(16, Math.min(box.right - width, viewport.width - 16 - width)));
  if (top + Math.min(cardHeight, 160) > viewport.height - 8) return null;
  return { top, left, width };
}

/** Drop the card below any heading or sentence it would cover. */
function clearOfCopy(spot: CardSpot, cardHeight: number, viewportHeight: number): CardSpot {
  let top = spot.top;
  for (const node of document.querySelectorAll("main h1, main h2, main h3, main p")) {
    if (!(node instanceof HTMLElement) || node.closest("[data-tour-card]")) continue;
    const style = getComputedStyle(node);
    if (style.visibility === "hidden" || style.display === "none" || Number(style.opacity) === 0) continue;
    const text = (node.textContent ?? "").replace(/\s+/g, " ").trim();
    if (text.length < 12) continue;
    const rect = node.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) continue;
    const overlapW = Math.min(spot.left + spot.width, rect.right) - Math.max(spot.left, rect.left);
    const overlapH = Math.min(top + cardHeight, rect.bottom) - Math.max(top, rect.top);
    if (overlapW > 2 && overlapH > 2) top = Math.max(top, Math.round(rect.bottom + 12));
  }
  if (top !== spot.top && top + Math.min(cardHeight, 180) > viewportHeight - 8) return spot;
  return { ...spot, top: Math.round(top) };
}

/** Welcome and the closing card: the same centre, whichever way you arrive. */
function layoutCentered(
  cardHeight: number,
  viewport: { width: number; height: number },
  topInset: number
): CardSpot {
  const width = Math.min(TOUR_CARD_WIDTH, Math.max(240, viewport.width - 32));
  const left = Math.round(Math.max(16, (viewport.width - width) / 2));
  const top = Math.round(Math.max(topInset + 24, (viewport.height - 260) / 2));
  return { top, left, width };
}

/** Desktop notes: centred under the toolbar, not pinned to the New Note button. */
function layoutDesktopNotes(
  cardHeight: number,
  viewport: { width: number; height: number }
): CardSpot | null {
  const button = visibleQuery("[data-tour='notes-create']");
  if (!button) return null;
  const box = button.getBoundingClientRect();
  const tabs = document.querySelector("[role='tablist'][aria-label='Notes']");
  const tabsBottom = tabs instanceof HTMLElement ? tabs.getBoundingClientRect().bottom : box.bottom;
  const width = Math.min(TOUR_CARD_WIDTH, viewport.width - 32);
  const top = Math.max(box.bottom, tabsBottom) + 24;
  if (top + cardHeight > viewport.height - 8) return null;
  const left = Math.max(16, Math.min((viewport.width - width) / 2, viewport.width - 16 - width));
  return { top, left, width };
}

/** Phone notes: under the Notes/Archived tabs, centred in the page panel. */
function layoutPhoneNotes(
  cardHeight: number,
  topInset: number,
  bottomInset: number,
  viewport: { width: number; height: number }
): CardSpot | null {
  const tabs = document.querySelector("[role='tablist'][aria-label='Notes']");
  const panel = document.querySelector("main .glass-card");
  if (!(tabs instanceof HTMLElement) || !(panel instanceof HTMLElement)) return null;
  const tabsBox = tabs.getBoundingClientRect();
  const panelBox = panel.getBoundingClientRect();
  if (tabsBox.width < 2 || panelBox.width < 2) return null;
  const width = Math.max(200, viewport.width - 32);
  const top = Math.max(topInset, tabsBox.bottom + RING_GAP);
  if (viewport.height - bottomInset - top < Math.min(cardHeight, 120)) return null;
  return { top, left: 16, width };
}

function ringCoversText(target: HTMLElement, scope: HTMLElement, pad: number): boolean {
  const box = target.getBoundingClientRect();
  const ring = { left: box.left - pad, top: box.top - pad, right: box.right + pad, bottom: box.bottom + pad };
  for (const node of scope.querySelectorAll("p")) {
    if (!(node instanceof HTMLElement)) continue;
    if (node === target || target.contains(node) || node.contains(target)) continue;
    const text = (node.textContent ?? "").trim();
    if (!text) continue;
    const rect = node.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) continue;
    const clear = rect.right <= ring.left + 1 || ring.right <= rect.left + 1 || rect.bottom <= ring.top + 1 || ring.bottom <= rect.top + 1;
    if (!clear) return true;
  }
  return false;
}

/** Sit a phone calendar card on week boundaries so a day is covered or clear. */
function snapPhoneCalendar(
  height: number,
  topInset: number,
  bottomLimit: number
): { top: number; minHeight: number } | null {
  const days = [...document.querySelectorAll("[data-tour-day]")]
    .map((node) => node.getBoundingClientRect())
    .filter((rect) => rect.width > 2 && rect.height > 2);
  const rows: { top: number; bottom: number }[] = [];
  for (const rect of days) {
    const row = rows.find((item) => Math.abs(item.top - rect.top) < 12);
    if (row) {
      row.top = Math.min(row.top, rect.top);
      row.bottom = Math.max(row.bottom, rect.bottom);
    } else rows.push({ top: rect.top, bottom: rect.bottom });
  }
  rows.sort((a, b) => a.top - b.top);
  if (rows.length === 0) return null;
  const today = document.querySelector("[data-tour='calendar-today']")?.getBoundingClientRect();
  const starts = [topInset, ...rows.flatMap((row) => [row.top, row.bottom + 16])];
  let fallback: { top: number; minHeight: number } | null = null;
  for (const start of starts) {
    if (start < topInset || start + height > bottomLimit) continue;
    let bottom = start + height;
    let ok = true;
    for (const row of rows) {
      const overlaps = row.bottom > start + 2 && row.top < bottom - 2;
      if (!overlaps) continue;
      if (row.top < start - 2) {
        ok = false;
        break;
      }
      bottom = Math.max(bottom, row.bottom + 4);
    }
    if (!ok || bottom > bottomLimit) continue;
    const spot = { top: start, minHeight: bottom - start };
    const coversToday = !!today && start <= today.top + 2 && bottom >= today.bottom - 2;
    if (!coversToday) return spot;
    fallback = spot;
  }
  return fallback;
}

/** Grow or shift a phone card so a control is fully under it or fully clear of it. */
function sealPhoneCard(
  spot: CardSpot,
  height: number,
  topInset: number,
  bottomLimit: number
): { top: number; minHeight: number } {
  let top = spot.top;
  let bottom = top + height;
  const nodes = [...document.querySelectorAll("button, a, [role='tab']")];
  for (let pass = 0; pass < 6; pass += 1) {
    let changed = false;
    for (const node of nodes) {
      if (!(node instanceof HTMLElement) || node.closest("[data-tour-card]")) continue;
      const style = getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden") continue;
      const rect = node.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) continue;
      const overlaps = rect.bottom > top + 2 && rect.top < bottom - 2;
      const contains = top <= rect.top + 2 && bottom >= rect.bottom - 2;
      if (!overlaps || contains) continue;
      const day = node.hasAttribute("data-tour-day");
      const tab = node.getAttribute("role") === "tab";
      if (rect.top < top - 2) {
        const drop = rect.bottom + 12;
        const span = bottom - top;
        if ((tab || !day) && drop + span <= bottomLimit) {
          top = drop;
          bottom = drop + span;
          changed = true;
          continue;
        }
        const raised = Math.max(topInset, rect.top - 4);
        bottom += top - raised;
        top = raised;
        changed = true;
        continue;
      }
      if (rect.bottom + 6 <= bottomLimit) {
        bottom = Math.max(bottom, rect.bottom + 6);
        changed = true;
        continue;
      }
      const span = bottom - top;
      const clearBottom = rect.top - 12;
      if (clearBottom - span >= topInset) {
        bottom = clearBottom;
        top = clearBottom - span;
        changed = true;
      }
    }
    if (!changed) break;
  }
  if (bottom > bottomLimit) {
    const span = bottom - top;
    bottom = bottomLimit;
    top = Math.max(topInset, bottom - span);
  }
  return { top, minHeight: Math.max(height, bottom - top) };
}

function todayWeek(): Box | null {
  const numeral = visibleQuery("[data-tour='calendar-today']");
  const cell = numeral?.closest("[data-tour-day]");
  const row = cell?.parentElement;
  if (!(row instanceof HTMLElement)) return null;
  const rect = row.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return null;
  return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
}

/** Framer slides the calendar in. A ring taken during that move stays low after it ends. */
function motionSettled(node: HTMLElement): boolean {
  let current: HTMLElement | null = node;
  while (current && current !== document.body) {
    const value = getComputedStyle(current).transform;
    if (value && value !== "none") {
      const match = value.match(/matrix(?:3d)?\(([^)]+)\)/);
      if (!match) return false;
      const parts = match[1].split(",").map((part) => Number.parseFloat(part));
      const ty = parts.length === 6 ? parts[5] : parts.length === 16 ? parts[13] : 1;
      const tx = parts.length === 6 ? parts[4] : parts.length === 16 ? parts[12] : 1;
      if (Math.abs(tx) > 0.5 || Math.abs(ty) > 0.5) return false;
    }
    current = current.parentElement;
  }
  return true;
}

function pageBusy(): boolean {
  const main = document.querySelector("main");
  if (!main) return true;
  const text = main.textContent ?? "";
  if (/Gathering your|Loading your moods|Loading\.\.\./.test(text)) return true;
  if (main.querySelector(".animate-pulse")) return true;
  return false;
}

function scrollTargetClear(
  node: HTMLElement,
  insets: SafeInsets,
  cardHeight: number,
  reserve: "below" | "visible"
): void {
  const rect = node.getBoundingClientRect();
  const viewTop = insets.top + 8;
  const viewBottom =
    reserve === "below"
      ? window.innerHeight - insets.bottom - cardHeight - 18
      : window.innerHeight - insets.bottom - 8;
  let delta = 0;
  if (rect.bottom > viewBottom) delta = rect.bottom - viewBottom;
  else if (rect.top < viewTop) delta = rect.top - viewTop;
  if (Math.abs(delta) < 2) return;
  const scroller = node.closest(".app-scroll");
  if (scroller instanceof HTMLElement) scroller.scrollBy({ top: delta, behavior: "auto" });
  else window.scrollBy({ top: delta, behavior: "auto" });
}

function spotlightDimPath(width: number, height: number, holes: Box[]): string {
  const outer = `M0,0 H${width} V${height} H0 Z`;
  const holesPath = holes
    .filter((hole) => hole.width > 1 && hole.height > 1)
    .map((hole) => {
      const r = Math.max(0, Math.min(18, hole.width / 2, hole.height / 2));
      const right = hole.x + hole.width;
      const bottom = hole.y + hole.height;
      return `M${hole.x + r},${hole.y} H${right - r} A${r},${r} 0 0 1 ${right},${hole.y + r} V${bottom - r} A${r},${r} 0 0 1 ${right - r},${bottom} H${hole.x + r} A${r},${r} 0 0 1 ${hole.x},${bottom - r} V${hole.y + r} A${r},${r} 0 0 1 ${hole.x + r},${hole.y} Z`;
    })
    .join(" ");
  return `${outer} ${holesPath}`;
}

function radiusWithPad(radius: string, pad: number): string {
  const parts = radius.split(" ").map((part) => {
    const value = Number.parseFloat(part);
    if (!Number.isFinite(value)) return part;
    if (value > 400) return part;
    return `${Math.round(value + pad)}px`;
  });
  return parts.join(" ") || `${12 + pad}px`;
}

export default function TourCard({
  phase,
  index,
  pathname,
  onStart,
  onNext,
  onBack,
  onSkip,
  onDone,
}: TourCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const heldSpot = useRef<CardSpot | null>(null);
  const frozen = useRef<{
    spot: CardSpot;
    title: string;
    body: string;
    progress: string | null;
    kind: "welcome" | "close" | "step";
    nested: boolean;
  } | null>(null);
  const reveal = useRef<{ key: string; spot: CardSpot } | null>(null);
  const moodsSettled = useRef("");
  const moodCompactRef = useRef(false);
  const revealKey = useRef("");
  const [viewport, setViewport] = useState(() =>
    typeof window === "undefined"
      ? { width: 0, height: 0 }
      : { width: window.innerWidth, height: window.innerHeight }
  );
  const [cardHeight, setCardHeight] = useState(CARD_ESTIMATE);
  const [notesCover, setNotesCover] = useState<number | undefined>(undefined);
  const [placeTick, setPlaceTick] = useState(0);
  const [stepWaited, setStepWaited] = useState(false);
  const [chrome, setChrome] = useState<Chrome>({ top: 72, bottom: 16, nav: null, flame: null });
  const measureKey = `${phase}:${index}:${pathname}`;
  if (revealKey.current !== measureKey) {
    revealKey.current = measureKey;
    reveal.current = null;
  }
  const [measured, setMeasured] = useState<{ key: string; box: TargetBox | null }>({
    key: measureKey,
    box: null,
  });
  if (measured.key !== measureKey) setMeasured({ key: measureKey, box: null });
  const target = measured.key === measureKey ? measured.box : null;
  const [reduceMotion, setReduceMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const [welcomeReady, setWelcomeReady] = useState(phase !== "welcome");
  const [closeReady, setCloseReady] = useState(false);
  const [holdFlame, setHoldFlame] = useState(false);
  const [moodCompact, setMoodCompact] = useState(false);
  const [stage, setStage] = useState<"out" | "measure" | "show">("measure");
  const stageKey = useRef("");
  const stageIdentity = useRef("");
  const moodsScrollHold = useRef<number | null>(null);
  const shownSig = useRef("");
  const navLock = useRef(false);
  const dimHeld = useRef(false);
  const ringSnap = useRef<{
    left: number;
    top: number;
    width: number;
    height: number;
    radius: string;
    shadow: string;
  } | null>(null);
  const holeSnap = useRef<Box[]>([]);
  const liveSpot = useRef<CardSpot | null>(null);
  const liveReady = useRef(false);

  const stepKey = phase === "step" ? `step-${index}` : phase;
  const step = phase === "step" ? tourStepByIndex(index) : null;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduceMotion(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useLayoutEffect(() => {
    const read = () => {
      const next = { width: window.innerWidth, height: window.innerHeight };
      setViewport((current) =>
        current.width === next.width && current.height === next.height ? current : next
      );
      setChrome(readChrome());
    };
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setPlaceTick((tick) => tick + 1), 450);
    return () => window.clearTimeout(timer);
  }, [phase, index, pathname]);

  useEffect(() => {
    setStepWaited(false);
    const timer = window.setTimeout(() => setStepWaited(true), 3000);
    return () => window.clearTimeout(timer);
  }, [measureKey]);

  const cardReady = target != null;
  useLayoutEffect(() => {
    const node = cardRef.current;
    if (!node) return;
    const read = () => {
      const measured = node.querySelector("[data-tour-measure]");
      const style = getComputedStyle(node);
      const pad =
        Number.parseFloat(style.paddingTop) +
        Number.parseFloat(style.paddingBottom) +
        Number.parseFloat(style.borderTopWidth) +
        Number.parseFloat(style.borderBottomWidth);
      const head = node.querySelector("[data-tour-head]");
      const body = node.querySelector("[data-tour-body]");
      const actions = node.querySelector("[data-tour-actions]");
      const more = node.querySelector("[data-tour-more]");
      const actionsMargin =
        actions instanceof HTMLElement ? Number.parseFloat(getComputedStyle(actions).marginTop) : 0;
      const content =
        body instanceof HTMLElement && actions instanceof HTMLElement
          ? (head instanceof HTMLElement ? head.offsetHeight : 0) +
            body.scrollHeight +
            (more instanceof HTMLElement ? more.offsetHeight : 0) +
            actions.offsetHeight +
            (Number.isFinite(actionsMargin) ? actionsMargin : 0)
          : measured instanceof HTMLElement
            ? measured.scrollHeight
            : node.getBoundingClientRect().height;
      const next = Math.ceil(content + (Number.isFinite(pad) ? pad : 0));
      setCardHeight((current) => (current === next ? current : next));
    };
    read();
    const observer = new ResizeObserver(read);
    observer.observe(node);
    return () => observer.disconnect();
  }, [stepKey, cardReady, welcomeReady]);

  useLayoutEffect(() => {
    const line = document.querySelector("main [data-tour-quiet]");
    const card = cardRef.current;
    if (line instanceof HTMLElement) line.style.transform = "";
    for (const shifted of document.querySelectorAll("main p[data-tour-shift]")) {
      if (shifted instanceof HTMLElement) {
        shifted.style.transform = "";
        shifted.removeAttribute("data-tour-shift");
      }
    }
    const navNow = document.querySelector(".app-bottom-nav");
    const sheetNow = navNow instanceof HTMLElement && getComputedStyle(navNow).display !== "none";
    if (sheetNow && card instanceof HTMLElement && phase === "step") {
      const cardRect = card.getBoundingClientRect();
      if (cardRect.top > 0 && cardRect.height > 40) {
        for (const node of document.querySelectorAll("main p")) {
          if (!(node instanceof HTMLElement) || node.closest("[data-tour-card]")) continue;
          const text = (node.textContent ?? "").replace(/\s+/g, " ").trim();
          if (text.length < 12) continue;
          node.style.transform = "";
          const rect = node.getBoundingClientRect();
          const overlaps = rect.bottom > cardRect.top + 2 && rect.top < cardRect.bottom - 2 && rect.height > 8;
          if (!overlaps) continue;
          const above = cardRect.top - 12 - rect.height;
          if (above >= chrome.top + 8) {
            node.style.transform = `translateY(${Math.round(above - rect.top)}px)`;
            node.setAttribute("data-tour-shift", "1");
          }
        }
      }
    }
    if (!(line instanceof HTMLElement) || !(card instanceof HTMLElement) || phase !== "step" || step?.id !== "notes") {
      setNotesCover((current) => (current === undefined ? current : undefined));
      return;
    }
    const rect = line.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    if (rect.height < 2 || cardRect.height < 2) return;
    const overlaps = rect.bottom > cardRect.top + 2 && rect.top < cardRect.bottom - 2;
    if (!overlaps) {
      setNotesCover((current) => (current === undefined ? current : undefined));
      return;
    }
    const nav = document.querySelector(".app-bottom-nav");
    const sheet = nav instanceof HTMLElement && getComputedStyle(nav).display !== "none";
    const covered = rect.top >= cardRect.top - 1 && rect.bottom <= cardRect.bottom + 1;
    if (covered && !sheet) return;
    if (sheet) {
      const above = cardRect.top - 12 - rect.height;
      const tabs = document.querySelector("[role='tablist'][aria-label='Notes']");
      const floor = tabs instanceof HTMLElement ? tabs.getBoundingClientRect().bottom + 8 : chrome.top;
      if (above >= floor) {
        line.style.transform = `translateY(${above - rect.top}px)`;
        setNotesCover((current) => (current === undefined ? current : undefined));
        return () => {
          line.style.transform = "";
        };
      }
      line.style.visibility = "hidden";
      return () => {
        line.style.visibility = "";
      };
    }
    const shift = cardRect.bottom + 16 - rect.top;
    const limit = window.innerHeight - chrome.bottom;
    if (rect.top + shift + rect.height <= limit - 4) {
      line.style.transform = `translateY(${shift}px)`;
      setNotesCover((current) => (current === undefined ? current : undefined));
      return () => {
        line.style.transform = "";
      };
    }
    const need = Math.ceil(rect.bottom + 12 - cardRect.top);
    if (cardRect.top + need <= limit) setNotesCover((current) => (current === need ? current : need));
    return () => {
      line.style.transform = "";
    };
  }, [phase, step?.id, cardHeight, chrome.bottom, chrome.top, viewport.width, viewport.height, notesCover, stage]);

  useEffect(() => {
    if (phase !== "welcome") return;
    let timer = 0;
    let cancelled = false;
    let calm = 0;
    const check = () => {
      if (cancelled) return;
      const main = document.querySelector("main");
      const text = main?.textContent ?? "";
      const busy = !main || pageBusy() || !/Your Notes|Nothing written yet/.test(text);
      if (busy) {
        calm = 0;
        setWelcomeReady(false);
        timer = window.setTimeout(check, 40);
        return;
      }
      calm += 1;
      if (calm < 4) {
        timer = window.setTimeout(check, 40);
        return;
      }
      setWelcomeReady(true);
    };
    timer = window.setTimeout(check, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [phase, pathname]);

  useLayoutEffect(() => {
    if (phase !== "step" || !step) return;
    let scrolled = false;
    let locked = false;
    let previous: TargetBox | null = null;
    let published: TargetBox | null = null;
    let lastSig = "";
    let copySig = "";
    let stableCount = 0;
    let moodScrolls = 0;
    let moodLift = -1;
    let moodWaits = 0;
    let moodCardWaits = 0;
    let moodPlannedH = 0;
    let timer = 0;

    const publish = (box: TargetBox) => {
      setHoldFlame(false);
      setMeasured((current) => {
        const key = `${phase}:${index}:${pathname}`;
        if (current.key === key && current.box && sameTarget(current.box, box)) return current;
        return { key, box };
      });
      setChrome(readChrome());
    };

    const tick = () => {
      if (locked) return;
      if (document.fonts && document.fonts.status !== "loaded") {
        previous = null;
        stableCount = 0;
        return;
      }
      if (pageBusy() && !visibleQuery(step.target)) {
        previous = null;
        stableCount = 0;
        return;
      }
      const copyNow = [...document.querySelectorAll("main h1, main h2, main p")]
        .map((node) => {
          if (!(node instanceof HTMLElement) || node.closest("[data-tour-card]")) return "";
          const rect = node.getBoundingClientRect();
          if (rect.height < 8) return "";
          return `${Math.round(rect.top)}:${Math.round(rect.bottom)}:${Math.round(rect.left)}`;
        })
        .join("|");
      if (copyNow !== copySig) {
        copySig = copyNow;
        setPlaceTick((tick) => tick + 1);
      }
      const navNow = document.querySelector(".app-bottom-nav");
      const sheetNow =
        navNow instanceof HTMLElement &&
        getComputedStyle(navNow).display !== "none" &&
        navNow.getBoundingClientRect().height > 1;
      if (step.id === "moods" && sheetNow && moodScrolls < 8) {
        const grid = visibleQuery("[data-tour='mood-grid']");
        const scroller = grid?.closest(".app-scroll");
        if (grid && scroller instanceof HTMLElement) {
          const bar = readChrome();
          const header = document.querySelector(".app-header");
          const headerBottom = moodOcclusionTop(
            grid,
            header instanceof HTMLElement ? header.getBoundingClientRect().bottom : Math.max(0, bar.top - 12)
          );
          const live = cardRef.current;
          const liveBox = live?.getBoundingClientRect();
          const sheetTop =
            live?.getAttribute("data-tour-card") === "moods" && liveBox && liveBox.height > 40
              ? liveBox.top
              : window.innerHeight - bar.bottom - CARD_ESTIMATE;
          const head = grid.parentElement?.querySelector("[data-tour-keep]");
          const headBox = head instanceof HTMLElement ? head.getBoundingClientRect() : null;
          const plan = planPhoneMoodRows({
            rows: moodRows(grid),
            headerBottom,
            sheetTop,
            heading: headBox && headBox.height > 8 ? { top: headBox.top, bottom: headBox.bottom } : null,
            pad: RING_PAD,
            sheetGap: RING_GAP,
            clear: MOOD_RING_CLEAR,
          });
          const extra = Number.parseFloat(scroller.style.paddingBottom) || 0;
          if (extra > 0 || scroller.scrollTop > 1) {
            scroller.style.paddingBottom = "";
            scroller.scrollTop = 0;
            previous = null;
            stableCount = 0;
            moodScrolls += 1;
            lastSig = "";
            return;
          }
          if (plan && plan.delta < -2) {
            scroller.scrollBy({ top: plan.delta, behavior: "auto" });
            previous = null;
            stableCount = 0;
            moodScrolls += 1;
            lastSig = "";
            return;
          }
          const fitted = plan && plan.to >= plan.from ? plan.to - plan.from + 1 : 0;
          const cardReady = live?.getAttribute("data-tour-card") === "moods" && liveBox != null && liveBox.height > 40;
          if (cardReady && fitted < 2 && !moodCompactRef.current) {
            moodCompactRef.current = true;
            setMoodCompact(true);
            previous = null;
            stableCount = 0;
            moodScrolls += 1;
            lastSig = "";
            return;
          }
        }
      }
      const node = visibleQuery(step.target);
      if (step.id === "moods" && !node) {
        const today = visibleQuery("[data-tour='mood-today']");
        if (today) {
          if (!scrolled) {
            const box = today.getBoundingClientRect();
            const need = box.bottom + RING_PAD + RING_GAP + CARD_ESTIMATE + chrome.bottom - window.innerHeight;
            const scroller = today.closest(".app-scroll");
            const flameTop = readChrome().flame?.y ?? chrome.top;
            const room = Math.max(0, flameTop - chrome.top);
            const delta = Math.min(Math.max(0, need), room);
            if (delta > 2 && scroller instanceof HTMLElement) scroller.scrollBy({ top: delta, behavior: "auto" });
            scrolled = true;
            previous = null;
            return;
          }
          const box = measureTarget(today);
          if (!previous || !sameTarget(previous, box)) {
            previous = box;
            return;
          }
          locked = true;
          window.clearInterval(timer);
          publish(box);
          return;
        }
        if (readChrome().flame) {
          locked = true;
          window.clearInterval(timer);
          setHoldFlame(true);
          setChrome(readChrome());
        }
        previous = null;
        return;
      }
      if (!node) {
        previous = null;
        return;
      }
      if (step.id === "moods" && !node.querySelector("button")) {
        previous = null;
        return;
      }
      if (step.id === "moods" && scrolled && window.innerWidth >= 700) {
        const liveMood = cardRef.current;
        const liveMoodBox = liveMood?.getBoundingClientRect();
        const measuredMood =
          liveMood?.getAttribute("data-tour-card") === "moods" &&
          /Moods/.test(liveMood.textContent ?? "") &&
          liveMoodBox &&
          liveMoodBox.height > 40
            ? Math.ceil(liveMoodBox.height)
            : 0;
        if (stageRef.current !== "show" && measuredMood > moodPlannedH + 8 && moodPlannedH > 0) {
          moodsSettled.current = "";
          moodLift = -1;
          moodWaits = 0;
          moodScrolls = 1;
          scrolled = false;
        }
      }
      if (step.id === "moods" && !scrolled) {
        const scroller = node.closest(".app-scroll");
        const phoneNow = window.innerWidth < 700;
        const liveMood = cardRef.current;
        const liveMoodBox = liveMood?.getBoundingClientRect();
        const measuredMood =
          !phoneNow &&
          liveMood?.getAttribute("data-tour-card") === "moods" &&
          /Moods/.test(liveMood.textContent ?? "") &&
          liveMoodBox &&
          liveMoodBox.height > 40
            ? Math.ceil(liveMoodBox.height)
            : 0;
        if (!phoneNow && scroller instanceof HTMLElement && moodsSettled.current !== String(index) && moodScrolls < 20) {
          const panel = node.closest(".app-workspace-moods");
          const wrap = moodLiftWrap(node);
          if (moodScrolls === 0) {
            if (panel instanceof HTMLElement) {
              panel.style.paddingTop = "0px";
              panel.style.marginTop = "-8px";
            }
            if (wrap) wrap.style.paddingTop = "";
            const child = scroller.firstElementChild;
            if (child instanceof HTMLElement) child.style.minHeight = "";
            scroller.style.paddingBottom = "";
            if (moodsScrollHold.current != null) {
              scroller.scrollTop = moodsScrollHold.current;
              moodScrolls = 20;
            } else {
              scroller.scrollTop = 0;
              moodScrolls = 1;
            }
            previous = null;
            return;
          }
          const cardH = measuredMood
            ? document.documentElement.dataset.moodNest === "1"
              ? measuredMood
              : Math.max(160, measuredMood - 26)
            : 196;
          moodPlannedH = measuredMood || cardH;
          const plan = planWideMoods(node, cardH, window.innerHeight);
          if (plan) document.documentElement.dataset.moodFit = plan.fit;
          const firstRow = moodRows(node)[0];
          const scrollerTop = scroller.getBoundingClientRect().top;
          const headerEl = document.querySelector(".app-header");
          const headerEdge = headerEl instanceof HTMLElement ? headerEl.getBoundingClientRect().bottom : 0;
          const rowLimit = Math.max(scrollerTop, headerEdge);
          const already =
            plan?.fit === "c" &&
            Math.abs(plan.delta) <= 8 &&
            firstRow != null &&
            firstRow.top >= rowLimit - 1;
          if (already) {
            moodScrolls = 20;
          } else if (firstRow && firstRow.top < rowLimit - 1 && moodScrolls < 16) {
            scroller.scrollTop = Math.max(0, Math.round(scroller.scrollTop - (rowLimit - firstRow.top + 2)));
            moodLift = -1;
            moodScrolls += 1;
            previous = null;
            return;
          }
          // Wait until the same lift comes back twice, so a tile that is still
          // animating in cannot spend the heading's padding.
          if (!already && plan && moodWaits < 2 && (moodLift < 0 || Math.abs(plan.delta - moodLift) > 1)) {
            moodLift = plan.delta;
            moodWaits += 1;
            previous = null;
            return;
          }
          moodWaits = 0;
          if (plan && Math.abs(plan.delta) > 0.5 && moodScrolls < 20) {
            const child = scroller.firstElementChild;
            if (plan.delta > 0 && child instanceof HTMLElement && child.style.minHeight !== "0px") {
              child.style.minHeight = "0px";
              moodLift = -1;
              moodScrolls += 1;
              previous = null;
              return;
            }
            if (plan.delta > 0) {
              const childH = child instanceof HTMLElement ? child.getBoundingClientRect().height : 0;
              const unused = Math.max(0, scroller.clientHeight - childH);
              const overflow = Math.max(0, scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop);
              const needed = Math.ceil(plan.delta + unused + 2);
              if (overflow + 0.5 < plan.delta && (Number.parseFloat(scroller.style.paddingBottom) || 0) < needed) {
                scroller.style.paddingBottom = `${needed}px`;
                void scroller.offsetHeight;
              }
            }
            scroller.scrollTop = Math.max(0, Math.round(scroller.scrollTop + plan.delta));
            moodLift = -1;
            moodScrolls += 1;
            previous = null;
            return;
          }
          if (moodScrolls < 14) {
            let overflow = 0;
            for (const button of node.querySelectorAll("button")) {
              if (!(button instanceof HTMLElement)) continue;
              const rect = button.getBoundingClientRect();
              if (rect.height < 40) continue;
              if (rect.bottom > window.innerHeight - 4) overflow = Math.max(overflow, rect.bottom - (window.innerHeight - 8));
              const corners = [
                [rect.left + 2, rect.bottom - 2],
                [rect.right - 2, rect.bottom - 2],
              ];
              for (const [x, y] of corners) {
                const overlay = document.querySelector("[data-tour-card]")?.parentElement;
                const hit = document.elementsFromPoint(x, y).find((node) => {
                  if (!(node instanceof Element)) return false;
                  if (overlay && overlay.contains(node)) return false;
                  return true;
                });
                const grid = button.closest("[data-tour='mood-grid']");
                const seen =
                  hit === button ||
                  (hit instanceof Element && (button.contains(hit) || (grid instanceof Element && grid.contains(hit))));
                if (!seen) overflow = Math.max(overflow, 14);
              }
              let parent = button.parentElement;
              while (parent && parent !== document.body) {
                const style = getComputedStyle(parent);
                const clips = [style.overflow, style.overflowX, style.overflowY].some((value) => value === "hidden" || value === "auto" || value === "scroll");
                if (clips) {
                  const bounds = parent.getBoundingClientRect();
                  if (rect.bottom > bounds.bottom - 4) overflow = Math.max(overflow, rect.bottom - (bounds.bottom - 8));
                }
                parent = parent.parentElement;
              }
            }
            const head = node.closest(".wide-mood-head")?.querySelector("h2");
            const header = document.querySelector(".app-header");
            const headerBottom = header instanceof HTMLElement ? header.getBoundingClientRect().bottom : 0;
            const headTop = head instanceof HTMLElement ? head.getBoundingClientRect().top : headerBottom + 40;
            if (plan?.fit !== "c" && overflow > 1 && headTop - overflow >= headerBottom + 8) {
              scroller.scrollTop = Math.max(0, Math.round(scroller.scrollTop + overflow));
              moodLift = -1;
              moodScrolls += 1;
              previous = null;
              return;
            }
          }
          moodScrolls = 20;
          moodsScrollHold.current = scroller.scrollTop;
          previous = null;
          return;
        }
        if (!phoneNow) moodsSettled.current = String(index);
        scrolled = true;
        previous = null;
        return;
      }
      const phone = window.innerWidth < 700;
      const cell = step.id === "calendar" ? node.closest("[data-tour-day]") : null;
      const measured = cell instanceof HTMLElement ? cell : node;
      if (sheetNow && step.id !== "moods") {
        const bar = readChrome();
        const cardNode = cardRef.current?.querySelector("[data-tour-measure]");
        const cardBox = cardNode instanceof HTMLElement ? cardNode.getBoundingClientRect().height : 0;
        const cardPad = cardRef.current
          ? Number.parseFloat(getComputedStyle(cardRef.current).paddingTop) +
            Number.parseFloat(getComputedStyle(cardRef.current).paddingBottom)
          : 28;
        const cardH = cardBox > 40 ? Math.ceil(cardBox + (Number.isFinite(cardPad) ? cardPad : 28)) : CARD_ESTIMATE;
        const liveCard = cardRef.current?.getBoundingClientRect();
        const liveMatches = cardRef.current?.getAttribute("data-tour-card") === step.id && liveCard != null && liveCard.height > 40;
        const sheetTop = liveMatches && liveCard ? liveCard.top : window.innerHeight - bar.bottom - cardH;
        const rect = measured.getBoundingClientRect();
        const pad =
          step.id === "calendar" ? 0 : step.id === "notes" ? NOTES_RING_PAD : step.id === "contracts" ? CONTRACTS_RING_PAD : RING_PAD;
        const headerBottom = Math.max(0, bar.top - 12);
        const limitBottom = sheetTop - 8 - pad;
        const limitTop = headerBottom + pad;
        const fitsWhole = rect.height <= limitBottom - limitTop;
        let delta = 0;
        if (fitsWhole && rect.bottom > limitBottom) delta = rect.bottom - limitBottom;
        else if (fitsWhole && rect.top < limitTop) delta = rect.top - limitTop;
        const scroller = measured.closest(".app-scroll");
        if (Math.abs(delta) > 0.5 && scroller instanceof HTMLElement && stableCount < 8) {
          const room = scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop;
          if (delta > 0 && room < delta) {
            const extra = Number.parseFloat(scroller.style.paddingBottom) || 0;
            scroller.style.paddingBottom = `${extra + (delta - room) + 8}px`;
          }
          scroller.scrollBy({ top: delta, behavior: "auto" });
          previous = null;
          stableCount += 1;
          return;
        }
      }
      if (step.id === "calendar" && !motionSettled(measured)) {
        previous = null;
        stableCount = 0;
        return;
      }
      const box =
        step.id === "moods"
          ? clipMoodGrid(node, phone ? window.innerHeight - chrome.bottom - 260 - 16 : null)
          : measureTarget(measured);
      const mainH = Math.round(document.querySelector("main")?.getBoundingClientRect().height ?? 0);
      const panelW = Math.round(document.querySelector("aside")?.getBoundingClientRect().width ?? 0);
      const sig = `${Math.round(box.x)}:${Math.round(box.y)}:${Math.round(box.width)}:${Math.round(box.height)}:${mainH}:${panelW}`;
      if (!previous || !sameTarget(previous, box) || sig !== lastSig) {
        previous = box;
        lastSig = sig;
        stableCount = 1;
        if (!scrolled && step.id !== "moods" && !sheetNow) {
          scrolled = true;
          scrollTargetClear(
            node,
            { top: chrome.top, bottom: chrome.bottom },
            step.id === "calendar" ? 0 : CARD_ESTIMATE,
            step.id === "calendar" ? "visible" : "below"
          );
        }
        return;
      }
      stableCount += 1;
      const needed = step.id === "calendar" ? 6 : 2;
      if (stableCount < needed) return;
      if (!published || !sameTarget(published, box)) {
        published = box;
        publish(box);
      }
    };

    const onResize = () => {
      reveal.current = null;
      previous = null;
      published = null;
      stableCount = 0;
      moodScrolls = 0;
      moodLift = -1;
      moodWaits = 0;
      moodCardWaits = 0;
      moodPlannedH = 0;
      scrolled = false;
      moodsSettled.current = "";
      locked = false;
      window.clearInterval(timer);
      timer = window.setInterval(tick, 40);
      tick();
    };
    timer = window.setInterval(tick, 40);
    window.addEventListener("resize", onResize);
    tick();
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("resize", onResize);
      moodsSettled.current = "";
      if (step?.id === "moods") {
        moodCompactRef.current = false;
        setMoodCompact(false);
      }
      document.documentElement.style.removeProperty("--tour-mood-clip");
      document.documentElement.style.removeProperty("--tour-mood-clip-top");
      document.documentElement.style.removeProperty("--tour-cal-clip");
      document.querySelectorAll<HTMLElement>("[data-tour='mood-grid'] button").forEach((button) => {
        button.style.visibility = "";
      });
    };
  }, [phase, index, pathname, step, chrome.top, chrome.bottom]);

  useLayoutEffect(() => {
    const panel = document.querySelector<HTMLElement>(".app-workspace-moods");
    const onTourMoods =
      pathname === "/moods" && (phase === "close" || (phase === "step" && step?.id === "moods"));
    if (!onTourMoods) {
      if (pathname !== "/moods" && panel) {
        panel.style.paddingTop = "";
        panel.style.marginTop = "";
        moodsScrollHold.current = null;
      }
      return;
    }
    if (!panel) return;
    panel.style.paddingTop = "0px";
    panel.style.marginTop = "-8px";
    const scroller = panel.querySelector<HTMLElement>(".app-scroll");
    if (scroller && moodsScrollHold.current != null) scroller.scrollTop = moodsScrollHold.current;
  }, [pathname, phase, step?.id]);

  useLayoutEffect(() => {
    if (phase !== "close") {
      setCloseReady(false);
      return;
    }
    let frames = 0;
    let last = "";
    let raf = 0;
    const tick = () => {
      const ready = !document.fonts || document.fonts.status === "loaded";
      const main = document.querySelector("main")?.getBoundingClientRect();
      const sig = ready
        ? `${Math.round(main?.width ?? 0)}:${Math.round(main?.height ?? 0)}:${window.innerWidth}:${window.innerHeight}`
        : "";
      if (!ready || sig !== last) {
        last = sig;
        frames = ready ? 1 : 0;
        raf = requestAnimationFrame(tick);
        return;
      }
      frames += 1;
      if (frames < 3) {
        raf = requestAnimationFrame(tick);
        return;
      }
      setCloseReady(true);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, pathname]);

  useEffect(() => {
    const node = cardRef.current;
    if (!node) return;
    node.focus({ preventScroll: true });
    if (phase === "step" && step?.id === "tasks") {
      const field = document.querySelector("[data-tour='tasks-field']");
      if (field instanceof HTMLElement && document.activeElement === field) field.blur();
    }
  }, [stepKey, target, phase, step?.id]);

  useEffect(() => {
    if (phase !== "step" || step?.id !== "tasks") return;
    const blur = () => {
      const field = document.querySelector("[data-tour='tasks-field']");
      if (!(field instanceof HTMLElement) || document.activeElement !== field) return;
      field.blur();
      cardRef.current?.focus({ preventScroll: true });
    };
    blur();
    document.addEventListener("focusin", blur);
    return () => document.removeEventListener("focusin", blur);
  }, [phase, step?.id, pathname]);

  const measureKeyRef = useRef(measureKey);
  measureKeyRef.current = measureKey;
  const stageRef = useRef(stage);
  stageRef.current = stage;
  useEffect(() => {
    if (stage !== "out") return;
    // The key changes while this fade is running. Restarting the timer
    // would hold the old card until 180ms after the new page, which is the
    // long gap between steps.
    const timer = window.setTimeout(() => {
      stageKey.current = measureKeyRef.current;
      shownSig.current = "";
      setStage("measure");
    }, reduceMotion ? 0 : TOUR_FADE_MS);
    return () => window.clearTimeout(timer);
  }, [stage, reduceMotion]);

  useEffect(() => {
    if (stage !== "measure") return;
    let last = "";
    let since = 0;
    const timer = window.setInterval(() => {
      const current = liveSpot.current;
      const sig = current ? `${Math.round(current.top)}:${Math.round(current.left)}:${Math.round(current.width)}` : "";
      const now = performance.now();
      if (!liveReady.current || !sig || sig !== last) {
        last = sig;
        since = liveReady.current && sig ? now : 0;
        return;
      }
      if (since === 0) since = now;
      if (now - since >= 80) {
        window.clearInterval(timer);
        setStage("show");
      }
    }, 30);
    return () => window.clearInterval(timer);
  }, [stage, measureKey]);

  useEffect(() => {
    if (stage === "show") {
      navLock.current = false;
    }
  }, [stage, measureKey]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (navLock.current || stage !== "show") return;
        navLock.current = true;
        if (phase === "close") onDone();
        else onSkip();
        window.requestAnimationFrame(() => setStage("out"));
        return;
      }
      if (event.key !== "Tab") return;
      const nodes = focusables(cardRef.current);
      if (nodes.length === 0) {
        event.preventDefault();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      const inside = active instanceof Node && cardRef.current?.contains(active);
      if (event.shiftKey && (!inside || active === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!inside || active === last)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [phase, stage, onSkip, onDone]);

  useEffect(() => {
    const block = (event: Event) => {
      const card = cardRef.current;
      if (!card || Number(getComputedStyle(card).opacity) < 0.5) return;
      if (event.target instanceof Node && card.contains(event.target)) return;
      const nav = document.querySelector(".app-bottom-nav");
      if (nav && event.target instanceof Node && nav.contains(event.target)) return;
      event.preventDefault();
    };
    document.addEventListener("wheel", block, { capture: true, passive: false });
    document.addEventListener("touchmove", block, { capture: true, passive: false });
    return () => {
      document.removeEventListener("wheel", block, true);
      document.removeEventListener("touchmove", block, true);
    };
  }, []);

  const stepIdentity = `${phase}:${index}`;
  if (stageIdentity.current === "") stageIdentity.current = stepIdentity;
  // The address catches up a moment after the step changes. That is the same
  // card, not a new step, so it must not fade out and come back.
  if (stage === "show" && stageIdentity.current !== stepIdentity && frozen.current) {
    setStage("out");
  } else if (stage !== "out") {
    stageIdentity.current = stepIdentity;
  }

  const showWelcome = phase === "welcome" && welcomeReady;
  const showStep = phase === "step" && (target != null || holdFlame);
  const showCard = showWelcome || phase === "close" || showStep;
  const phone = viewport.width > 0 && viewport.width < 700;
  const softObstacles: Box[] = [];
  if (step?.id === "calendar" && !phone) {
    for (const node of document.querySelectorAll<HTMLElement>("[data-tour-day]")) {
      const rect = node.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) continue;
      softObstacles.push(toBox(rect, 4));
    }
  }
  const obstacles = [
    ...keepBoxes(step ? visibleQuery(step.target) : null),
    ...(chrome.flame ? [chrome.flame] : []),
    ...(chrome.nav ? [chrome.nav] : []),
  ];
  const phoneWidth = Math.max(200, (viewport.width > 0 ? viewport.width : 390) - 32);
  const cardSize = { width: phone ? phoneWidth : TOUR_CARD_WIDTH, height: cardHeight || CARD_ESTIMATE };
  let spot: CardSpot | null = null;
  let phoneMoodRing: TargetBox | null = null;
  let moodNested = false;
  let waitForMoods = false;
  const loggedMood = step?.id === "moods" && target != null && !visibleQuery("[data-tour='mood-grid']");
  if (phase === "step" && step?.id === "moods" && phone && !loggedMood) {
    const laid = layoutPhoneMoods(
      cardSize.height,
      chrome.top,
      chrome.bottom,
      viewport.width > 0 ? viewport : { width: 390, height: 844 }
    );
    if (laid) {
      spot = laid.spot;
      phoneMoodRing = laid.ring;
    } else {
      const height = cardSize.height;
      spot = {
        top: Math.max(chrome.top, viewport.height - chrome.bottom - height),
        left: 16,
        width: phoneWidth,
      };
    }
  } else if (phase === "step" && step?.id === "moods" && !phone && !loggedMood) {
    const laid = layoutWideMoods(cardSize.height, chrome.top, chrome.bottom, viewport.width > 0 ? viewport : { width: 1440, height: 900 });
    if (laid) {
      spot = laid.spot;
      phoneMoodRing = laid.ring;
      moodNested = laid.nested;
    } else waitForMoods = true;
  } else if (loggedMood && target) {
    spot = layoutLoggedMood(
      target,
      cardSize.height,
      chrome.top,
      chrome.bottom,
      viewport.width > 0 ? viewport : { width: 1440, height: 900 }
    );
  } else if (phase === "step" && step?.id === "calendar" && !phone) {
    spot = layoutDayPanelCard(cardSize.height, chrome.bottom, viewport) ?? null;
  } else if (phase === "step" && step?.id === "contracts") {
    spot = layoutContracts(cardSize.height, viewport.width > 0 ? viewport : { width: 1440, height: 900 });
  } else if (phase === "welcome" || phase === "close") {
    spot = layoutCentered(
      cardSize.height,
      viewport.width > 0 ? viewport : { width: 1440, height: 900 },
      chrome.top
    );
  } else if (phase === "step" && step?.id === "notes" && phone) {
    spot = layoutPhoneNotes(cardSize.height, chrome.top, chrome.bottom, viewport.width > 0 ? viewport : { width: 390, height: 844 });
  } else if (phase === "step" && step?.id === "notes" && !phone) {
    spot = layoutDesktopNotes(cardSize.height, viewport.width > 0 ? viewport : { width: 1440, height: 900 });
  }
  if (!spot && holdFlame && chrome.flame) {
    const height = cardSize.height;
    const width = phone ? phoneWidth : Math.min(TOUR_CARD_WIDTH, Math.max(200, viewport.width - 32));
    spot = {
      top: Math.min(
        chrome.flame.y + chrome.flame.height + 16,
        Math.max(chrome.top, viewport.height - chrome.bottom - height)
      ),
      left: Math.max(16, (viewport.width - width) / 2),
      width,
    };
  } else if (!spot && !waitForMoods) {
    spot = placeTourCard({
      viewport: viewport.width > 0 ? viewport : { width: 390, height: 844 },
      insets: { top: chrome.top, bottom: chrome.bottom },
      card: cardSize,
      target: showStep && target
        ? step?.id === "moods"
          ? { x: target.x, y: target.y, width: target.width, height: target.height }
          : { x: target.x - 18, y: target.y - 18, width: target.width + 36, height: target.height + 36 }
        : null,
      obstacles,
      softObstacles,
      presentation: phase === "step" ? "anchor" : "center",
      shieldBelow: step?.id === "calendar" && !phone,
      bias: step?.id === "moods" ? "below" : step?.id === "calendar" && phone ? "around-week" : "auto",
      week: step?.id === "calendar" && phone ? todayWeek() : null,
    });
  }
  let moodGrow: number | undefined;
  if (spot && viewport.width > 0) {
    const placedTop = spot.top;
    const placedLeft = spot.left;
    const placedWidth = spot.width;
    spot = containTourCard(spot, cardSize.height, viewport, { top: chrome.top, bottom: chrome.bottom }, { phone });
    // Desktop has no tab bar. The 12px chrome inset would pull the Moods card
    // up into the ring when the card already fits on the viewport.
    if (!phone && step?.id === "moods" && moodNested) {
      spot = { top: placedTop, left: placedLeft, width: placedWidth };
    } else if (!phone && step?.id === "contracts") {
      spot = { top: placedTop, left: placedLeft, width: placedWidth };
    } else if (!phone && step?.id === "moods" && placedTop + cardSize.height <= viewport.height + 0.5) {
      spot = { ...spot, top: placedTop };
    }
    if (phone && step?.id === "moods" && !loggedMood) {
      const grid = visibleQuery("[data-tour='mood-grid']");
      const rows = grid ? moodRows(grid) : [];
      const placed = placeMoodCard(rows, cardSize.height, chrome.top, viewport.height - chrome.bottom, RING_GAP);
      if (placed && spot) {
        spot = { ...spot, top: placed.top };
        if (placed.minHeight > cardSize.height + 1) moodGrow = placed.minHeight;
        if (grid) {
          const rect = grid.getBoundingClientRect();
          const included = rows.filter((row) => row.top >= chrome.top - 1 && row.bottom <= placed.top + 1);
          const first = included[0];
          const last = included[included.length - 1];
          const ringTop = first ? Math.max(first.top, chrome.top - 12) : rect.y;
          const ringBottom = last ? last.bottom : Math.min(rect.bottom, placed.top);
          const height = ringBottom - ringTop;
          if (height >= 24) {
            phoneMoodRing = {
              x: rect.x,
              y: ringTop,
              width: rect.width,
              height,
              radius: getComputedStyle(grid).borderRadius || "24px",
            };
          }
        }
      }
    }
  }
  let phoneSeal: { top: number; minHeight: number } | null = null;
  if (spot && phone && viewport.width > 0 && phase !== "welcome" && step?.id !== "moods" && !chrome.nav) {
    phoneSeal = sealPhoneCard(spot, cardSize.height, chrome.top, viewport.height - chrome.bottom);
    spot = { ...spot, top: phoneSeal.top };
    if (step?.id === "calendar") {
      const snapped = snapPhoneCalendar(cardSize.height, chrome.top, viewport.height - chrome.bottom);
      if (snapped) {
        phoneSeal = snapped;
        spot = { ...spot, top: snapped.top };
      }
    }
  }
  const sheet = Boolean(chrome.nav);
  let sheetHidesRing = false;
  let moodBandTop = 0;
  if (sheet && viewport.width > 0) {
    const live = cardRef.current;
    const liveName = live?.getAttribute("data-tour-card");
    const liveBox = live?.getBoundingClientRect();
    const liveMatches =
      liveBox != null &&
      liveBox.height > 40 &&
      (liveName === "welcome"
        ? phase === "welcome"
        : liveName === "close"
          ? phase === "close"
          : liveName === step?.id);
    const height = liveMatches && liveBox ? liveBox.height : Math.max(1, cardSize.height);
    const top = Math.max(chrome.top, viewport.height - chrome.bottom - height);
    spot = { top, left: 16, width: Math.max(200, viewport.width - 32) };
    moodGrow = undefined;
    phoneSeal = null;
    const headerEl = document.querySelector(".app-header");
    const headerBottom =
      headerEl instanceof HTMLElement ? headerEl.getBoundingClientRect().bottom : Math.max(0, chrome.top - 12);
    if (step?.id === "moods" && !loggedMood) {
      const grid = visibleQuery("[data-tour='mood-grid']");
      const sheetTop = liveMatches && liveBox ? liveBox.top : top;
      const occluded = grid ? moodOcclusionTop(grid, headerBottom) : headerBottom;
      moodBandTop = occluded;
      const head = grid?.parentElement?.querySelector("[data-tour-keep]");
      const headBox = head instanceof HTMLElement ? head.getBoundingClientRect() : null;
      const allRows = grid ? moodRows(grid) : [];
      const phonePlan = grid
        ? planPhoneMoodRows({
            rows: allRows,
            headerBottom: occluded,
            sheetTop,
            heading: headBox && headBox.height > 8 ? { top: headBox.top, bottom: headBox.bottom } : null,
            pad: RING_PAD,
            sheetGap: RING_GAP,
            clear: MOOD_RING_CLEAR,
          })
        : null;
      const rows = phonePlan && phonePlan.to >= phonePlan.from ? allRows.slice(phonePlan.from, phonePlan.to + 1) : [];
      const first = rows[0];
      const last = rows[rows.length - 1];
      if (grid && first && last) {
        const rect = grid.getBoundingClientRect();
        const clipTop = Math.max(0, Math.round(first.top - rect.top));
        const clipBottom = Math.max(0, Math.round(rect.bottom - last.bottom));
        document.documentElement.style.setProperty("--tour-mood-clip-top", `${clipTop}px`);
        document.documentElement.style.setProperty("--tour-mood-clip", `${clipBottom}px`);
        const tile = [...grid.querySelectorAll("button")].find((button) => {
          const box = button.getBoundingClientRect();
          return box.height > 48 && Math.abs(box.top - first.top) < 18;
        });
        const tileRadius = tile ? getComputedStyle(tile).borderRadius : "";
        phoneMoodRing = {
          x: rect.x,
          y: first.top,
          width: rect.width,
          height: Math.max(24, last.bottom - first.top),
          radius: tileRadius && tileRadius !== "0px" ? tileRadius : "16px",
        };
      } else {
        phoneMoodRing = null;
        sheetHidesRing = true;
        document.documentElement.style.setProperty("--tour-mood-clip-top", "0px");
        document.documentElement.style.setProperty("--tour-mood-clip", "0px");
      }
    } else if (target) {
      phoneMoodRing = null;
      const pad =
        step?.id === "calendar"
          ? 0
          : step?.id === "notes"
            ? NOTES_RING_PAD
            : step?.id === "contracts"
              ? CONTRACTS_RING_PAD
              : RING_PAD;
      const sheetEdge = liveMatches && liveBox ? liveBox.top : top;
      const above = target.y - pad >= headerBottom - 1 && target.y + target.height + pad + 8 <= sheetEdge + 0.5;
      if (!above) sheetHidesRing = true;
    } else {
      phoneMoodRing = null;
    }
    if (step?.id === "calendar") {
      const cell = document.querySelector("[data-tour='calendar-today']")?.closest("[data-tour-day]");
      const row = cell?.parentElement;
      const scroller = cell?.closest(".app-scroll");
      const clip =
        row instanceof HTMLElement && scroller instanceof HTMLElement
          ? Math.max(0, scroller.getBoundingClientRect().bottom - row.getBoundingClientRect().bottom)
          : 0;
      document.documentElement.style.setProperty("--tour-cal-clip", `${Math.ceil(clip)}px`);
    } else {
      document.documentElement.style.setProperty("--tour-cal-clip", "0px");
    }
  }
  if (!(sheet && step?.id === "moods" && !loggedMood)) {
    document.documentElement.style.setProperty("--tour-mood-clip", "0px");
    document.documentElement.style.setProperty("--tour-mood-clip-top", "0px");
  }
  if (
    spot &&
    !sheet &&
    viewport.height > 0 &&
    (step?.id === "notes" || step?.id === "tasks" || step?.id === "contracts")
  ) {
    spot = clearOfCopy(spot, cardSize.height, viewport.height);
  }
  if (spot && (phase !== "step" || target || holdFlame)) heldSpot.current = spot;
  if (!spot && phase === "step" && heldSpot.current && viewport.width > 0) {
    spot = containTourCard(
      heldSpot.current,
      cardSize.height,
      viewport,
      { top: chrome.top, bottom: chrome.bottom },
      { phone }
    );
  }

  void placeTick;
  const title = phase === "welcome" ? TOUR_WELCOME.title : phase === "close" ? TOUR_CLOSE.title : step?.title ?? "";
  const body = phase === "welcome" ? TOUR_WELCOME.body : phase === "close" ? TOUR_CLOSE.body : step?.body ?? "";
  const progress = phase === "step" ? tourProgressLabel(index) : null;
  const titleId = "tour-card-title";
  const bodyId = "tour-card-body";
  const hintId = "tour-card-hint";
  const progressId = "tour-card-progress";

  // The copy wins over the ring on a phone or a short window. A laptop or
  // desktop keeps the ring and the card where the step placed them.
  const wideScreen = viewport.width >= 1024;
  if (!sheet && !wideScreen && spot && viewport.height > 0 && cardHeight > 40 && (phoneMoodRing || (phase === "step" && target))) {
    const roomAtSpot = viewport.height - spot.top - 8;
    if (roomAtSpot < cardHeight - 4) {
      const floor = Math.max(8, chrome.top);
      const room = viewport.height - floor - 8;
      phoneMoodRing = null;
      sheetHidesRing = true;
      spot = { ...spot, top: room >= cardHeight ? Math.max(floor, viewport.height - 8 - cardHeight) : floor };
    }
  }
  const ringSource = sheetHidesRing ? null : phoneMoodRing ?? target;
  const targetNode = step ? visibleQuery(step.target) : null;
  let ringPad =
    step?.id === "calendar"
      ? CALENDAR_RING_PAD
      : step?.id === "notes"
        ? NOTES_RING_PAD
        : step?.id === "contracts"
          ? CONTRACTS_RING_PAD
          : RING_PAD;
  if (targetNode && step?.id !== "calendar" && step?.id !== "moods") {
    const scope = targetNode.parentElement;
    while (ringPad > 0 && scope && ringCoversText(targetNode, scope, ringPad)) ringPad -= 2;
  }
  const ringBottomPad = phone && phoneMoodRing ? 0 : ringPad;
  let ringSides = { left: ringPad, right: ringPad, top: phone && step?.id === "moods" ? 0 : ringPad, bottom: ringBottomPad };
  if (targetNode && step?.id === "tasks") {
    const box = targetNode.getBoundingClientRect();
    const neighbors = [...document.querySelectorAll("button, a")]
      .filter((el): el is HTMLElement => {
        if (!(el instanceof HTMLElement)) return false;
        if (el.closest("[data-tour-card]")) return false;
        if (targetNode.contains(el) || el.contains(targetNode)) return false;
        const style = getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 2 && rect.height > 2;
      })
      .map((el) => {
        const rect = el.getBoundingClientRect();
        return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
      });
    const fitted = ringSidePad(
      { left: box.left, top: box.top, right: box.right, bottom: box.bottom },
      neighbors,
      ringPad
    );
    const side = Math.min(fitted.left, fitted.right);
    const vert = Math.min(fitted.top, Math.min(ringBottomPad, fitted.bottom));
    ringSides = { left: side, right: side, top: vert, bottom: vert };
  }
  if (sheet && step?.id === "calendar") {
    ringSides = { left: 0, right: 0, top: 0, bottom: 0 };
  }
  if (!sheet && step?.id === "moods" && moodNested) {
    ringSides = { left: 0, right: 0, top: 0, bottom: 0 };
  }
  if (sheet && step?.id === "moods" && phoneMoodRing) {
    const grid = visibleQuery("[data-tour='mood-grid']");
    const header = grid?.parentElement?.querySelector("[data-tour-keep]");
    const headerBottomEdge = header instanceof HTMLElement ? header.getBoundingClientRect().bottom : 0;
    const stroke = 2;
    const roomTop = phoneMoodRing.y - headerBottomEdge - stroke;
    const sheetEdge = spot ? spot.top : phoneMoodRing.y + phoneMoodRing.height + RING_GAP;
    const roomBottom = sheetEdge - RING_GAP - (phoneMoodRing.y + phoneMoodRing.height) - stroke;
    const moodPad = Math.max(0, Math.min(RING_PAD, roomTop, roomBottom));
    ringSides = { left: moodPad, right: moodPad, top: moodPad, bottom: moodPad };
  } else if (sheet && step?.id === "moods") {
    ringSides = { left: 0, right: 0, top: 0, bottom: 0 };
  }
  const streakLimit = (() => {
    if (step?.id === "calendar" || step?.id === "notes") return 0;
    const flame = [...document.querySelectorAll("span")].find(
      (node) => node.textContent === "🔥" && /text-6xl|text-8xl/.test(node.parentElement?.className ?? "")
    );
    const header = flame?.parentElement?.parentElement;
    if (!(header instanceof HTMLElement)) return 0;
    return header.getBoundingClientRect().bottom + 8;
  })();
  const headerBottom = Math.max(0, chrome.top - 12);
  const ringFloor = phone && step?.id === "moods" ? (moodBandTop > 0 ? moodBandTop + MOOD_RING_CLEAR : headerBottom) : 0;
  const liveAnchor = (() => {
    if (!ringSource || phoneMoodRing || !targetNode) return ringSource;
    const node = step?.id === "calendar" ? targetNode.closest("[data-tour-day]") ?? targetNode : targetNode;
    const rect = node.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return ringSource;
    return { ...ringSource, x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  })();
  const ringTop = liveAnchor ? liveAnchor.y - ringSides.top : 0;
  const ringBottom = liveAnchor ? liveAnchor.y + liveAnchor.height + ringSides.bottom : 0;
  const nearFlame = streakLimit > 0 && ringSource != null && ringSource.y - streakLimit < 36;
  const tasksTight = step?.id === "tasks" && (ringSides.left < ringPad || ringSides.right < ringPad);
  const tightRing = step?.id === "calendar" || step?.id === "notes" || step?.id === "contracts" || tasksTight;
  const ring = liveAnchor
    ? {
        left: liveAnchor.x - ringSides.left,
        top: ringTop,
        width: liveAnchor.width + ringSides.left + ringSides.right,
        height: Math.max(0, ringBottom - ringTop),
        radius: radiusWithPad(liveAnchor.radius, Math.max(ringSides.top, ringSides.left)),
      }
    : null;

  const holes: Box[] = [];
  if (liveAnchor) {
    holes.push({
      x: liveAnchor.x - 6,
      y: liveAnchor.y - 6,
      width: liveAnchor.width + 12,
      height: liveAnchor.height + 12,
    });
  }
  if (chrome.nav) holes.push(chrome.nav);
  if (chrome.flame) holes.push(chrome.flame);

  const stepReady = phase !== "step" || target != null || holdFlame || stepWaited;
  const routeReady = phase !== "step" || pathname === (step?.route ?? pathname);
  const showLive =
    showWelcome ||
    (phase === "close" && (closeReady || stepWaited)) ||
    holdFlame ||
    (phase === "step" && routeReady && stepReady);
  const holdPrevious = (phase === "step" || phase === "close") && !showLive && frozen.current != null;
  if (showLive && !sheet && spot && (phase !== "step" || target || holdFlame || stepWaited)) {
    const saved = reveal.current;
    const savedFits =
      saved != null &&
      saved.key === measureKey &&
      saved.spot.top >= 0 &&
      saved.spot.left >= -4 &&
      saved.spot.top + Math.min(Math.max(cardHeight, 160), Math.max(1, viewport.height - 16)) <= viewport.height - 8 &&
      saved.spot.left + saved.spot.width <= viewport.width + 8;
    const fixed = Math.min(TOUR_CARD_WIDTH, Math.max(240, viewport.width - 32));
    const calendarIntoPanel = step?.id === "calendar" && saved != null && spot.left > saved.spot.left + 48;
    const nextSpot = savedFits && saved && step?.id !== "moods" && step?.id !== "contracts" && !calendarIntoPanel
      ? saved.spot
      : {
          top: spot.top,
          left: Math.max(8, Math.min(spot.left, viewport.width - 8 - Math.min(spot.width, fixed))),
          width: step?.id === "calendar" || moodNested ? spot.width : fixed,
        };
    reveal.current = { key: measureKey, spot: nextSpot };
    spot = nextSpot;
  }
  if (holdPrevious && frozen.current) spot = frozen.current.spot;
  let drawRing = ring;
  if (drawRing && spot && viewport.height > 0 && liveAnchor) {
    const cap = sheet
      ? Math.max(1, viewport.height - chrome.bottom - 8)
      : Math.max(1, viewport.height - spot.top - 8);
    const height = Math.min(Math.max(cardHeight, 80), cap);
    const liveCard = cardRef.current;
    const liveCardBox = liveCard?.getBoundingClientRect();
    const liveName = liveCard?.getAttribute("data-tour-card");
    const cardMatches = liveName === (step?.id ?? phase) && liveCardBox != null && liveCardBox.height > 40;
    const intendedTop = sheet ? viewport.height - chrome.bottom - height : spot.top;
    // A step change rewrites the card's name before the browser moves it.
    // The box from that moment is the previous step, so ignore it.
    const liveAgrees =
      cardMatches &&
      liveCardBox != null &&
      Math.abs(liveCardBox.left - spot.left) < 16 &&
      Math.abs(liveCardBox.top - intendedTop) < 16;
    const cardBox = liveAgrees && liveCardBox
      ? { left: liveCardBox.left, top: liveCardBox.top, right: liveCardBox.right, bottom: liveCardBox.bottom }
      : sheet
        ? {
            left: spot.left,
            top: viewport.height - chrome.bottom - height,
            right: spot.left + spot.width,
            bottom: viewport.height - chrome.bottom,
          }
        : {
            left: spot.left,
            top: spot.top,
            right: spot.left + spot.width,
            bottom: Math.min(spot.top + height, viewport.height - 8),
          };
    const ringBox = {
      left: drawRing.left,
      top: drawRing.top,
      right: drawRing.left + drawRing.width,
      bottom: drawRing.top + drawRing.height,
    };
    const anchorBox = {
      left: liveAnchor.x,
      top: liveAnchor.y,
      right: liveAnchor.x + liveAnchor.width,
      bottom: liveAnchor.y + liveAnchor.height,
    };
    const headerEl = document.querySelector(".app-header");
    const headerEdge = headerEl instanceof HTMLElement ? headerEl.getBoundingClientRect().bottom : headerBottom;
    const moodGrid = step?.id === "moods" && !sheet ? visibleQuery("[data-tour='mood-grid']") : null;
    const moodLimit = moodGrid ? moodRingLimit(moodGrid, viewport.height) : viewport.height + 1;
    const clear = (a: typeof cardBox, b: typeof cardBox) =>
      a.right + 8 <= b.left + 0.5 || b.right + 8 <= a.left + 0.5 || a.bottom + 8 <= b.top + 0.5 || b.bottom + 8 <= a.top + 0.5;
    const onScreen =
      anchorBox.top >= headerEdge - 1 &&
      anchorBox.bottom <= viewport.height + 1 &&
      anchorBox.left >= -1 &&
      anchorBox.right <= viewport.width + 1 &&
      ringBox.top >= Math.max(headerEdge, ringFloor) - 1 &&
      ringBox.bottom <= (moodGrid ? moodLimit + 0.5 : viewport.height + 1);
    const numeral =
      step?.id === "calendar" && targetNode ? targetNode.getBoundingClientRect() : null;
    const numeralFits =
      !numeral ||
      (numeral.height > 8 &&
        numeral.top >= anchorBox.top - 1 &&
        numeral.bottom <= anchorBox.bottom + 1 &&
        numeral.left >= anchorBox.left - 1 &&
        numeral.right <= anchorBox.right + 1);
    if (
      moodNested &&
      moodGrid &&
      liveAgrees &&
      liveCardBox &&
      liveCardBox.bottom + NEST_CLEAR <= moodRingLimit(moodGrid, viewport.height) + 0.5 &&
      liveCardBox.right + NEST_CLEAR <= viewport.width
    ) {
      const bottom = liveCardBox.bottom + NEST_CLEAR;
      const right = liveCardBox.right + NEST_CLEAR;
      drawRing = {
        ...drawRing,
        width: Math.max(drawRing.width, right - drawRing.left),
        height: Math.max(drawRing.height, bottom - drawRing.top),
      };
      ringBox.right = drawRing.left + drawRing.width;
      ringBox.bottom = drawRing.top + drawRing.height;
    }
    const nestInside =
      moodNested &&
      cardBox.left >= ringBox.left + NEST_CLEAR - 0.5 &&
      cardBox.top >= ringBox.top + NEST_CLEAR - 0.5 &&
      cardBox.right <= ringBox.right - NEST_CLEAR + 0.5 &&
      cardBox.bottom <= ringBox.bottom - NEST_CLEAR + 0.5 &&
      cardBox.bottom <= viewport.height + 0.5;
    if (moodNested) {
      if (!onScreen || !nestInside) drawRing = null;
    } else if (!onScreen || !numeralFits || !clear(anchorBox, cardBox) || !clear(ringBox, cardBox)) drawRing = null;
  }
  const sheetCap = sheet && viewport.height > 0 ? Math.max(1, viewport.height - chrome.bottom - 8) : undefined;
  const wideCap = !sheet && viewport.height > 0 && spot
    ? Math.max(1, viewport.height - spot.top - (step?.id === "moods" ? 0 : 8))
    : undefined;
  const wideMin = Math.max(notesCover ?? 0, phoneSeal?.minHeight ?? 0, moodGrow ?? 0);
  const cardCap = sheet ? sheetCap : wideCap;
  const copyCapped = cardCap != null && cardHeight > cardCap + 16;
  const cardStyle: CSSProperties | undefined = spot
    ? sheet
      ? {
          bottom: chrome.bottom,
          left: spot.left,
          width: spot.width,
          maxHeight: sheetCap,
          backgroundColor: "#14161c",
        }
      : {
          top: spot.top,
          left: spot.left,
          width: spot.width,
          maxHeight: wideCap,
          minHeight: wideMin > 0 ? Math.min(wideMin, wideCap ?? wideMin) : undefined,
          backgroundColor: "#14161c",
        }
    : undefined;
  const showFrozenLook = stage === "out" && frozen.current != null;
  if (showFrozenLook && frozen.current) spot = frozen.current.spot;
  liveSpot.current = spot;
  liveReady.current = stage === "measure" && showLive && spot != null;
  if (moodNested) document.documentElement.dataset.moodNest = "1";
  else delete document.documentElement.dataset.moodNest;
  const shownTitle = showFrozenLook && frozen.current ? frozen.current.title : title;
  const shownBody = showFrozenLook && frozen.current ? frozen.current.body : body;
  const shownProgress = showFrozenLook && frozen.current ? frozen.current.progress : progress;
  const shownKind = showFrozenLook && frozen.current
    ? frozen.current.kind
    : phase === "welcome"
      ? "welcome"
      : phase === "close"
        ? "close"
        : "step";
  if (stage === "show" && showLive && spot) {
    const sig = `${stepIdentity}|${Math.round(spot.top)}|${Math.round(spot.left)}|${Math.round(spot.width)}`;
    if (!shownSig.current.startsWith(`${stepIdentity}|`)) {
      shownSig.current = sig;
      frozen.current = {
        spot: { ...spot },
        title: shownTitle,
        body: shownBody,
        progress: shownProgress,
        kind: shownKind,
        nested: moodNested,
      };
    } else if (frozen.current) {
      frozen.current = {
        ...frozen.current,
        title: shownTitle,
        body: shownBody,
        progress: shownProgress,
        kind: shownKind,
      };
    }
  }
  const lookNested = (stage === "show" || showFrozenLook) && frozen.current ? frozen.current.nested : moodNested;
  const placedSpot = (stage === "show" || showFrozenLook) && frozen.current ? frozen.current.spot : spot;
  const showFrozenCard = stage === "out" || stage === "measure" || (stage === "show" && showLive && spot != null);
  const tourOpen = stage === "show";
  const guarded = (action: () => void, settleBanner = false) => (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    if (navLock.current || stage !== "show") return;
    navLock.current = true;
    action();
    if (settleBanner) window.requestAnimationFrame(() => setStage("out"));
    else setStage("out");
  };
  const dimAlready = dimHeld.current;
  if (stage === "show") dimHeld.current = true;
  // The first card fades in with the dim. After that the dim stays put
  // between steps; only the card and the ring fade.
  const dimOpacity = dimAlready || stage === "show" ? 1 : 0;
  const fade = reduceMotion ? "none" : `opacity ${TOUR_FADE_MS}ms ease`;
  const dimTransition = dimAlready || reduceMotion ? "none" : fade;
  const ringShadow = tightRing
    ? "inset 0 0 0 2px rgba(103,232,249,0.95)"
    : nearFlame
      ? "0 0 0 2px rgba(103,232,249,0.95)"
      : "0 0 0 2px rgba(103,232,249,0.95), 0 0 18px 2px rgba(103,232,249,0.4)";
  if (stage === "show") {
    ringSnap.current = drawRing
      ? {
          left: drawRing.left,
          top: drawRing.top,
          width: drawRing.width,
          height: drawRing.height,
          radius: drawRing.radius,
          shadow: ringShadow,
        }
      : null;
    holeSnap.current = drawRing ? holes.map((hole) => ({ ...hole })) : [];
  }
  const ringOpacity = stage === "show" && drawRing ? 1 : 0;
  const shownRing = stage === "out" ? ringSnap.current : drawRing;
  // Evenodd cutout. The shape never covers the hole. A separate veil of the
  // same dim colour fades over the hole, so the target goes from dimmed to
  // fully lit without a black plate.
  const cutHoles = stage === "out" ? holeSnap.current : drawRing ? holes : [];
  const holeFill = stage === "show" && drawRing ? 0 : 1;
  const shieldBottom = chrome.nav ? chrome.nav.height : 0;
  const dimWidth = viewport.width;
  const dimHeight = Math.max(0, viewport.height - shieldBottom);

  return (
    <div className="fixed inset-0 z-[80] pointer-events-none">
      <div className="fixed left-0 right-0 top-0 z-[80]" style={{ bottom: shieldBottom, pointerEvents: tourOpen ? "auto" : "none" }} />
      {(showFrozenCard || dimAlready) && dimWidth > 0 && dimHeight > 0 ? (
        <svg
          data-tour-dim=""
          className="pointer-events-none fixed left-0 right-0 top-0 h-auto w-full"
          aria-hidden="true"
          viewBox={`0 0 ${dimWidth} ${dimHeight}`}
          preserveAspectRatio="none"
          style={{ bottom: shieldBottom, opacity: dimOpacity, transition: dimTransition }}
        >
          <path fill="rgba(6,7,10,0.55)" fillRule="evenodd" d={spotlightDimPath(dimWidth, dimHeight, cutHoles)} />
          {cutHoles.map((hole, i) => (
            <rect
              key={`${Math.round(hole.x)}:${Math.round(hole.y)}:${i}`}
              x={hole.x}
              y={hole.y}
              width={hole.width}
              height={hole.height}
              rx={18}
              fill="rgba(6,7,10,0.55)"
              style={{ opacity: holeFill, transition: fade }}
            />
          ))}
        </svg>
      ) : null}
      {shownRing ? (
        <div
          aria-hidden="true"
          data-tour-ring=""
          data-anchor-x={liveAnchor && stage === "show" ? liveAnchor.x : undefined}
          data-anchor-y={liveAnchor && stage === "show" ? liveAnchor.y : undefined}
          data-anchor-w={liveAnchor && stage === "show" ? liveAnchor.width : undefined}
          data-anchor-h={liveAnchor && stage === "show" ? liveAnchor.height : undefined}
          className="pointer-events-none fixed"
          style={{
            left: shownRing.left,
            top: shownRing.top,
            width: shownRing.width,
            height: shownRing.height,
            borderRadius: shownRing.radius,
            boxShadow: stage === "out" && ringSnap.current ? ringSnap.current.shadow : ringShadow,
            opacity: ringOpacity,
            transition: fade,
          }}
        />
      ) : null}
      {showFrozenCard ? (
        <div
          key="tour-card"
          ref={cardRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={progress ? `${progressId} ${titleId}` : titleId}
          aria-describedby={shownKind === "close" ? `${bodyId} ${hintId}` : bodyId}
          tabIndex={-1}
          className={`fixed z-[81] flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#14161c] text-slate-100 shadow-[0_16px_40px_rgba(0,0,0,0.45)] outline-none ${
            lookNested ? "px-4 py-3" : viewport.width < 640 ? (moodCompact ? "px-3.5 py-2" : "p-3.5") : placedSpot && placedSpot.width < 380 ? "px-3.5 py-4" : "p-5"
          }`}
          style={{
            ...cardStyle,
            top: stage === "measure" ? -4000 : placedSpot ? placedSpot.top : cardStyle?.top,
            left: stage === "measure" ? 0 : placedSpot ? placedSpot.left : cardStyle?.left,
            width: placedSpot ? placedSpot.width : cardStyle?.width,
            opacity: stage === "show" ? 1 : 0,
            visibility: stage === "measure" ? "hidden" : "visible",
            pointerEvents: stage === "show" ? "auto" : "none",
            transition: fade,
          }}
          data-tour-card={phase === "step" ? (TOUR_STEPS[index]?.id ?? phase) : phase}
        >
          <div data-tour-measure="" className="flex min-h-0 flex-col overflow-hidden">
          <div data-tour-head="" className="shrink-0">
            {shownProgress ? (
            <p id={progressId} className="text-sm text-slate-400">
              {shownProgress}
            </p>
          ) : null}
          <h2 id={titleId} className={`text-lg font-semibold tracking-wide text-slate-50 ${shownProgress ? "mt-1" : ""}`}>
            {shownTitle}
          </h2>
          </div>
          <div
            data-tour-body=""
            className="min-h-0 overflow-y-auto"
            style={copyCapped ? { minHeight: "4.5rem" } : undefined}
          >
          <p id={bodyId} className={`text-sm text-slate-300 ${moodNested ? "mt-1.5 leading-snug" : moodCompact && viewport.width < 640 ? "mt-1 leading-snug" : "mt-2 leading-relaxed"}`}>
            {shownBody}
          </p>
          {shownKind === "close" ? (
            <p id={hintId} className="mt-2 text-xs leading-relaxed text-slate-400">
              {TOUR_CLOSE.hint}
            </p>
          ) : null}
          </div>
          {copyCapped ? (
            <p data-tour-more="" className="shrink-0 pt-1 text-xs text-slate-400">
              Scroll for the rest
            </p>
          ) : null}
          <div data-tour-actions="" className={`flex shrink-0 flex-nowrap items-center gap-2 ${moodCompact && viewport.width < 640 && !moodNested ? "mt-2" : moodNested || viewport.width < 640 ? "mt-3" : "mt-5"}`}>
            {shownKind !== "close" ? (
              <button type="button" className={`${btnSecondary} transition-none`} style={{ opacity: 1 }} disabled={!tourOpen} onPointerDown={guarded(onSkip, true)}>
                {TOUR_CONTROLS.skip}
              </button>
            ) : null}
            <div className="ml-auto flex flex-nowrap items-center justify-end gap-2">
              {shownKind === "step" || shownKind === "close" ? (
                <button type="button" className={`${btnSecondary} transition-none`} style={{ opacity: 1 }} disabled={!tourOpen} onPointerDown={guarded(onBack)}>
                  {TOUR_CONTROLS.back}
                </button>
              ) : null}
              {shownKind === "welcome" ? (
                <button type="button" className={`${btnPrimary} transition-none`} style={{ opacity: 1 }} disabled={!tourOpen} onPointerDown={guarded(onStart)}>
                  {TOUR_WELCOME.start}
                </button>
              ) : null}
              {shownKind === "step" ? (
                <button type="button" className={`${btnPrimary} transition-none`} style={{ opacity: 1 }} disabled={!tourOpen} onPointerDown={guarded(onNext)}>
                  {TOUR_CONTROLS.next}
                </button>
              ) : null}
              {shownKind === "close" ? (
                <button type="button" className={`${btnPrimary} transition-none`} style={{ opacity: 1 }} disabled={!tourOpen} onPointerDown={guarded(onDone, true)}>
                  {TOUR_CLOSE.done}
                </button>
              ) : null}
            </div>
          </div>
          </div>
        </div>
      ) : null}
      <style>{`@keyframes prysmic-tour-in { from { opacity: 0 } to { opacity: 1 } }
        html:has([data-tour-card="calendar"]) [data-tour-day],
        html:has([data-tour-card="calendar"]) [data-tour="calendar-today"] {
          box-shadow: none;
          border-color: transparent;
        }
        [data-tour-card] {
          background-color: #14161c !important;
          background-image: none !important;
          -webkit-backdrop-filter: none !important;
          backdrop-filter: none !important;
        }
        [data-tour-card]:focus,
        [data-tour-card]:focus-visible {
          outline: none;
          box-shadow: 0 16px 40px rgba(0,0,0,0.45);
        }
        html:has([data-tour-card="welcome"]) [data-tour-quiet],
        html:has([data-tour-card="close"]) [data-tour-quiet] { visibility: hidden; }
        html:has([data-tour-card="moods"]) [data-tour="mood-grid"] {
          clip-path: inset(var(--tour-mood-clip-top, 0px) 0 var(--tour-mood-clip, 0px) 0);
        }
        html:has([data-tour-card="moods"]) .app-workspace-moods .app-scroll,
        html:has([data-tour-card="close"]) .app-workspace-moods .app-scroll {
          scrollbar-width: none;
        }
        html:has([data-tour-card="moods"]) .app-workspace-moods .app-scroll::-webkit-scrollbar,
        html:has([data-tour-card="close"]) .app-workspace-moods .app-scroll::-webkit-scrollbar {
          width: 0;
          height: 0;
          display: none;
        }
        html:has([data-tour-card="tasks"]) [data-tour="tasks-field"]:focus,
        html:has([data-tour-card="tasks"]) [data-tour="tasks-field"]:focus-visible {
          outline: none !important;
          border-color: rgba(255, 255, 255, 0.1) !important;
          box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.1) !important;
        }
        html:has([data-tour-card="calendar"]) .app-scroll {
          clip-path: inset(0 0 var(--tour-cal-clip, 0px) 0) !important;
        }`}</style>
    </div>
  );
}
