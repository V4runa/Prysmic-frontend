"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { btnPrimary, btnSecondary } from "../components/forms/styles";
import { containTourCard, MOOD_RING_CLEAR, placeMoodCard, placeTourCard, planPhoneMoodRows, ringSidePad, TOUR_CARD_WIDTH, type Box, type CardSpot, type SafeInsets } from "./tourPlace";
import {
  TOUR_CLOSE,
  TOUR_CONTROLS,
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
const CALENDAR_RING_PAD = 4;
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

/** Empty cells to the right of the last mood row, when a 5-column grid is not full. */
function moodRowSlot(grid: HTMLElement, cardWidth: number, cardHeight: number, viewportHeight: number): CardSpot | null {
  const buttons = [...grid.querySelectorAll("button")].filter((button) => button.getBoundingClientRect().height > 48);
  const rows = moodRows(grid);
  const last = rows[rows.length - 1];
  if (!last || buttons.length === 0) return null;
  const lastTiles = buttons.filter((button) => Math.abs(button.getBoundingClientRect().top - last.top) < 18);
  if (lastTiles.length === 0) return null;
  const gridRect = grid.getBoundingClientRect();
  const right = Math.max(...lastTiles.map((button) => button.getBoundingClientRect().right));
  const columnGap = Number.parseFloat(getComputedStyle(grid).columnGap);
  const slotLeft = right + (Number.isFinite(columnGap) ? columnGap : 16);
  const available = gridRect.right - 12 - slotLeft;
  if (available < 280) return null;
  const width = Math.min(cardWidth, available);
  const rowHeight = last.bottom - last.top;
  let top = cardHeight < rowHeight ? last.top + (rowHeight - cardHeight) / 2 : last.top;
  const limit = viewportHeight - 16;
  if (top + cardHeight > limit) top = Math.max(last.top, limit - cardHeight);
  return { top, left: slotLeft, width };
}

function layoutWideMoods(
  cardHeight: number,
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
  const belowTop = rect.bottom + RING_PAD + RING_GAP;
  // A fixed height keeps this choice from flipping as the card measures itself.
  if (belowTop + 210 <= viewport.height - 16) {
    const left = Math.min(
      Math.max(16, rect.x + rect.width / 2 - width / 2),
      Math.max(16, viewport.width - 16 - width)
    );
    return { spot: { top: belowTop, left, width }, ring, nested: false };
  }
  const slot = moodRowSlot(grid, width, cardHeight, viewport.height);
  if (slot) {
    const covered = Math.max(rect.bottom, slot.top + cardHeight);
    return { spot: slot, ring: { ...ring, height: covered - rect.y }, nested: true };
  }
  const left = Math.min(
    Math.max(16, rect.x + rect.width / 2 - width / 2),
    Math.max(16, viewport.width - 16 - width)
  );
  return { spot: { top: belowTop, left, width }, ring, nested: false };
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
  const mood = document.querySelector("[data-tour-keep='mood']");
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

function radiusWithPad(radius: string, pad: number): string {
  const parts = radius.split(" ").map((part) => {
    const value = Number.parseFloat(part);
    if (!Number.isFinite(value)) return part;
    if (value > 400) return part;
    return `${Math.round(value + pad)}px`;
  });
  return parts.join(" ") || `${12 + pad}px`;
}

function press(action: () => void) {
  return (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    action();
  };
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
  } | null>(null);
  const reveal = useRef<{ key: string; spot: CardSpot } | null>(null);
  const revealKey = useRef("");
  const [viewport, setViewport] = useState(() =>
    typeof window === "undefined"
      ? { width: 0, height: 0 }
      : { width: window.innerWidth, height: window.innerHeight }
  );
  const [cardHeight, setCardHeight] = useState(CARD_ESTIMATE);
  const [notesCover, setNotesCover] = useState<number | undefined>(undefined);
  const [placeTick, setPlaceTick] = useState(0);
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
    const covered = rect.top >= cardRect.top - 1 && rect.bottom <= cardRect.bottom + 1;
    if (covered) return;
    const nav = document.querySelector(".app-bottom-nav");
    const sheet = nav instanceof HTMLElement && getComputedStyle(nav).display !== "none";
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
  }, [phase, step?.id, cardHeight, chrome.bottom, viewport.width, viewport.height, notesCover]);

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
    let stableCount = 0;
    let moodScrolls = 0;
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
      if (pageBusy()) {
        previous = null;
        stableCount = 0;
        return;
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
          if (plan && plan.delta > 2) {
            const room = scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop;
            if (room < plan.delta - 1) {
              const extra = Number.parseFloat(scroller.style.paddingBottom) || 0;
              scroller.style.paddingBottom = `${extra + (plan.delta - Math.max(0, room)) + 8}px`;
            }
            scroller.scrollBy({ top: plan.delta, behavior: "auto" });
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
      if (step.id === "moods" && !scrolled) {
        const scroller = node.closest(".app-scroll");
        const phoneNow = window.innerWidth < 700;
        if (!phoneNow && scroller instanceof HTMLElement) {
          if (scroller.scrollTop > 1) scroller.scrollTo({ top: 0, behavior: "auto" });
          const grid = node.getBoundingClientRect();
          const width = Math.min(TOUR_CARD_WIDTH, window.innerWidth - 32);
          const belowTop = grid.bottom + RING_PAD + RING_GAP;
          const fitsBelow = belowTop + 210 <= window.innerHeight - 16;
          const slot = moodRowSlot(node, width, 200, window.innerHeight);
          const head = node.closest(".wide-mood-head")?.querySelector("[data-tour-keep]");
          if (head instanceof HTMLElement) {
            head.style.marginBottom = !fitsBelow && slot && window.innerHeight < 800 ? "12px" : "";
          }
          if (!fitsBelow && !slot) {
            scroller.style.paddingBottom = "280px";
            const headTop = head instanceof HTMLElement ? head.getBoundingClientRect().top : grid.top;
            const clipTop = Math.max(chrome.top, scroller.getBoundingClientRect().top);
            const fresh = node.getBoundingClientRect();
            const need = fresh.bottom + RING_PAD + RING_GAP + 200 + 16 - window.innerHeight;
            const room = Math.max(0, headTop - clipTop);
            const delta = Math.min(Math.max(0, need), room);
            if (delta > 2) scroller.scrollBy({ top: delta, behavior: "auto" });
          } else {
            scroller.style.paddingBottom = "";
          }
        }
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
      previous = null;
      published = null;
      stableCount = 0;
      moodScrolls = 0;
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
      document.querySelectorAll<HTMLElement>(".app-scroll").forEach((node) => {
        if (node.style.paddingBottom) node.style.paddingBottom = "";
      });
      document.querySelectorAll<HTMLElement>(".wide-mood-head [data-tour-keep]").forEach((node) => {
        node.style.marginBottom = "";
      });
      document.documentElement.style.removeProperty("--tour-mood-clip");
      document.documentElement.style.removeProperty("--tour-mood-clip-top");
      document.documentElement.style.removeProperty("--tour-cal-clip");
      document.querySelectorAll<HTMLElement>("[data-tour='mood-grid'] button").forEach((button) => {
        button.style.visibility = "";
      });
    };
  }, [phase, index, pathname, step, chrome.top, chrome.bottom]);

  useLayoutEffect(() => {
    if (phase !== "close") {
      setCloseReady(false);
      return;
    }
    let frames = 0;
    let last = "";
    let raf = 0;
    const tick = () => {
      const ready =
        pathname === "/notes" &&
        (!document.fonts || document.fonts.status === "loaded") &&
        !pageBusy();
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

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (phase === "close") onDone();
        else onSkip();
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
  }, [phase, onSkip, onDone]);

  useEffect(() => {
    const block = (event: Event) => {
      const card = cardRef.current;
      if (card && event.target instanceof Node && card.contains(event.target)) return;
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
    }
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
  } else if (phase === "step" && step?.id === "notes" && phone) {
    spot = layoutPhoneNotes(cardSize.height, chrome.top, chrome.bottom, viewport.width > 0 ? viewport : { width: 390, height: 844 });
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
  } else if (!spot) {
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
    spot = containTourCard(spot, cardSize.height, viewport, { top: chrome.top, bottom: chrome.bottom }, { phone });
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
      const bandBottom = sheetTop - RING_GAP - RING_PAD;
      const occluded = grid ? moodOcclusionTop(grid, headerBottom) : headerBottom;
      moodBandTop = occluded;
      const minTileTop = occluded + MOOD_RING_CLEAR + RING_PAD;
      const rows = grid
        ? moodRows(grid).filter((row) => row.top >= minTileTop - 1 && row.bottom <= bandBottom + 2)
        : [];
      const first = rows[0];
      const last = rows[rows.length - 1];
      if (grid && first && last) {
        const rect = grid.getBoundingClientRect();
        document.documentElement.style.setProperty("--tour-mood-clip-top", "0px");
        document.documentElement.style.setProperty("--tour-mood-clip", "0px");
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
  const progressId = "tour-card-progress";

  // The copy wins over the ring. If the card cannot show its text where it
  // sits, drop the ring and move the card up into the open space.
  if (!sheet && spot && viewport.height > 0 && cardHeight > 40 && (phoneMoodRing || (phase === "step" && target))) {
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
  if (sheet && step?.id === "moods" && phoneMoodRing) {
    const grid = visibleQuery("[data-tour='mood-grid']");
    const next = grid
      ? moodRows(grid).find((row) => row.top > phoneMoodRing.y + phoneMoodRing.height - 1)
      : undefined;
    const header = grid?.parentElement?.querySelector("[data-tour-keep]");
    const headerBottomEdge = header instanceof HTMLElement ? header.getBoundingClientRect().bottom : 0;
    const stroke = 2;
    const roomTop = phoneMoodRing.y - headerBottomEdge - stroke;
    const limit = next ? next.top : spot ? spot.top : phoneMoodRing.y + phoneMoodRing.height;
    const roomBottom = limit - (phoneMoodRing.y + phoneMoodRing.height) - stroke;
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

  const stepReady = phase !== "step" || target != null || holdFlame;
  const routeReady = phase !== "step" || pathname === (step?.route ?? pathname);
  const showLive =
    showWelcome ||
    (phase === "close" && closeReady) ||
    holdFlame ||
    (phase === "step" && routeReady && stepReady);
  const holdPrevious = (phase === "step" || phase === "close") && !showLive && frozen.current != null;
  if (showLive && !sheet && spot && (phase !== "step" || target || holdFlame)) {
    const saved = reveal.current;
    const savedFits =
      saved != null &&
      saved.key === measureKey &&
      saved.spot.top >= 0 &&
      saved.spot.left >= -4 &&
      saved.spot.top + Math.min(Math.max(cardHeight, 160), Math.max(1, viewport.height - 16)) <= viewport.height - 8 &&
      saved.spot.left + saved.spot.width <= viewport.width + 8;
    const fixed = Math.min(TOUR_CARD_WIDTH, Math.max(240, viewport.width - 32));
    const nextSpot = savedFits && saved
      ? saved.spot
      : {
          top: spot.top,
          left: Math.max(8, Math.min(spot.left, viewport.width - 8 - Math.min(spot.width, fixed))),
          width: step?.id === "calendar" ? spot.width : fixed,
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
    const cardBox = cardMatches
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
    const clear = (a: typeof cardBox, b: typeof cardBox) =>
      a.right + 8 <= b.left || b.right + 8 <= a.left || a.bottom + 8 <= b.top || b.bottom + 8 <= a.top;
    const onScreen =
      anchorBox.top >= headerEdge - 1 &&
      anchorBox.bottom <= viewport.height + 1 &&
      anchorBox.left >= -1 &&
      anchorBox.right <= viewport.width + 1 &&
      ringBox.top >= Math.max(headerEdge, ringFloor) - 1 &&
      ringBox.bottom <= viewport.height + 1;
    const numeral =
      step?.id === "calendar" && targetNode ? targetNode.getBoundingClientRect() : null;
    const numeralFits =
      !numeral ||
      (numeral.height > 8 &&
        numeral.top >= anchorBox.top - 1 &&
        numeral.bottom <= anchorBox.bottom + 1 &&
        numeral.left >= anchorBox.left - 1 &&
        numeral.right <= anchorBox.right + 1);
    if (!onScreen || !numeralFits || !clear(anchorBox, cardBox) || !clear(ringBox, cardBox)) drawRing = null;
  }
  const sheetCap = sheet && viewport.height > 0 ? Math.max(1, viewport.height - chrome.bottom - 8) : undefined;
  const wideCap = !sheet && viewport.height > 0 && spot ? Math.max(1, viewport.height - spot.top - 8) : undefined;
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
  const shownTitle = holdPrevious && frozen.current ? frozen.current.title : title;
  const shownBody = holdPrevious && frozen.current ? frozen.current.body : body;
  const shownProgress = holdPrevious && frozen.current ? frozen.current.progress : progress;
  const shownKind = holdPrevious && frozen.current ? frozen.current.kind : phase === "welcome" ? "welcome" : phase === "close" ? "close" : "step";
  if (showLive && spot) {
    frozen.current = { spot: { ...spot }, title: shownTitle, body: shownBody, progress: shownProgress, kind: shownKind };
  }
  const showFrozenCard = (showLive || holdPrevious) && spot != null;

  const shieldBottom = chrome.nav ? chrome.nav.height : 0;

  return (
    <div className="fixed inset-0 z-[80] pointer-events-none">
      <div className="fixed left-0 right-0 top-0 z-[80]" style={{ bottom: shieldBottom, pointerEvents: "auto" }} />
      {phase === "step" && showLive && (drawRing || holdFlame) ? (
        <svg className="pointer-events-none fixed inset-0 h-full w-full" aria-hidden="true">
          <defs>
            <mask id="prysmic-tour-dim">
              <rect width="100%" height="100%" fill="white" />
              {holes.map((hole, i) => (
                <rect
                  key={i}
                  x={hole.x}
                  y={hole.y}
                  width={hole.width}
                  height={hole.height}
                  rx={18}
                  fill="black"
                />
              ))}
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(6,7,10,0.55)" mask="url(#prysmic-tour-dim)" />
        </svg>
      ) : showWelcome || phase === "close" || phase === "step" || showFrozenCard ? (
        <div className="fixed inset-0" style={{ background: "rgba(6,7,10,0.45)", bottom: shieldBottom }} />
      ) : null}
      {showLive && stepReady && drawRing ? (
        <div
          aria-hidden="true"
          data-tour-ring=""
          data-anchor-x={liveAnchor ? liveAnchor.x : undefined}
          data-anchor-y={liveAnchor ? liveAnchor.y : undefined}
          data-anchor-w={liveAnchor ? liveAnchor.width : undefined}
          data-anchor-h={liveAnchor ? liveAnchor.height : undefined}
          className="pointer-events-none fixed"
          style={{
            left: drawRing.left,
            top: drawRing.top,
            width: drawRing.width,
            height: drawRing.height,
            borderRadius: drawRing.radius,
            boxShadow: tightRing
              ? "inset 0 0 0 2px rgba(103,232,249,0.95)"
              : nearFlame
                ? "0 0 0 2px rgba(103,232,249,0.95)"
                : "0 0 0 2px rgba(103,232,249,0.95), 0 0 18px 2px rgba(103,232,249,0.4)",
            opacity: 1,
            animation: reduceMotion ? undefined : "prysmic-tour-in 150ms ease forwards",
          }}
        />
      ) : null}
      {showFrozenCard ? (
        <div
          key={holdPrevious ? "tour-held" : measureKey}
          ref={cardRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={progress ? `${progressId} ${titleId}` : titleId}
          aria-describedby={bodyId}
          tabIndex={-1}
          className={`pointer-events-auto fixed z-[81] flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#14161c] text-slate-100 shadow-[0_16px_40px_rgba(0,0,0,0.45)] outline-none ${
            moodNested ? "px-4 py-3" : viewport.width < 640 ? "p-3.5" : spot && spot.width < 380 ? "px-3.5 py-4" : "p-5"
          }`}
          style={{
            ...cardStyle,
            opacity: 1,
            animation: reduceMotion ? undefined : "prysmic-tour-in 150ms ease forwards",
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
          <p id={bodyId} className={`text-sm text-slate-300 ${moodNested ? "mt-1.5 leading-snug" : "mt-2 leading-relaxed"}`}>
            {shownBody}
          </p>
          </div>
          {copyCapped ? (
            <p data-tour-more="" className="shrink-0 pt-1 text-xs text-slate-400">
              Scroll for the rest
            </p>
          ) : null}
          <div data-tour-actions="" className={`flex shrink-0 flex-nowrap items-center gap-2 ${moodNested || viewport.width < 640 ? "mt-3" : "mt-5"}`}>
            {shownKind !== "close" ? (
              <button type="button" className={btnSecondary} disabled={holdPrevious} onPointerDown={press(onSkip)}>
                {TOUR_CONTROLS.skip}
              </button>
            ) : null}
            <div className="ml-auto flex flex-nowrap items-center justify-end gap-2">
              {shownKind === "step" ? (
                <button type="button" className={btnSecondary} disabled={holdPrevious} onPointerDown={press(onBack)}>
                  {TOUR_CONTROLS.back}
                </button>
              ) : null}
              {shownKind === "welcome" ? (
                <button type="button" className={btnPrimary} disabled={holdPrevious} onPointerDown={press(onStart)}>
                  {TOUR_WELCOME.start}
                </button>
              ) : null}
              {shownKind === "step" ? (
                <button type="button" className={btnPrimary} disabled={holdPrevious} onPointerDown={press(onNext)}>
                  {TOUR_CONTROLS.next}
                </button>
              ) : null}
              {shownKind === "close" ? (
                <button type="button" className={btnPrimary} disabled={holdPrevious} onPointerDown={press(onDone)}>
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
        html:has([data-tour-card="calendar"]) [data-tour="calendar-today"] { box-shadow: none; }
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
        html:has([data-tour-card="close"]) [data-tour-quiet],
        html:has([data-tour-card="contracts"]) [data-tour-quiet] { visibility: hidden; }
        html:has([data-tour-card="moods"]) .app-workspace-moods .app-scroll {
          scrollbar-width: none;
        }
        html:has([data-tour-card="moods"]) .app-workspace-moods .app-scroll::-webkit-scrollbar {
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
