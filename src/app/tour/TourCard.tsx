"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { btnPrimary, btnSecondary } from "../components/forms/styles";
import { placeTourCard, TOUR_CARD_WIDTH, type Box, type CardSpot, type SafeInsets } from "./tourPlace";
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
  viewHeight: number
): { spot: CardSpot; ring: TargetBox } | null {
  const grid = visibleQuery("[data-tour='mood-grid']");
  if (!grid) return null;
  const rect = grid.getBoundingClientRect();
  const rows = moodRows(grid);
  if (rows.length === 0) return null;
  const maxTop = viewHeight - bottomInset - cardHeight;
  let chosen = 0;
  for (let i = 0; i < rows.length; i += 1) {
    const nextTop = rows[i + 1]?.top ?? rows[i].bottom + RING_GAP;
    if (nextTop >= topInset && nextTop <= maxTop) chosen = i;
    else break;
  }
  const cardTop = rows[chosen + 1]?.top ?? rows[chosen].bottom + RING_GAP;
  return {
    spot: {
      top: cardTop,
      left: 16,
      width: Math.min(TOUR_CARD_WIDTH, window.innerWidth - 32),
    },
    ring: {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: Math.max(24, rows[chosen].bottom - rect.top),
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
  const panel = aside instanceof HTMLElement ? aside.getBoundingClientRect() : moodBox;
  const width = Math.min(Math.max(panel.width - 16, moodBox.width), viewport.width - panel.x - 16);
  let top = moodBox.bottom + 28;
  const maxTop = Math.min(viewport.height - bottomInset - cardHeight, quickTop - cardHeight - 12);
  if (maxTop < moodBox.bottom + 8) return null;
  top = Math.min(Math.max(top, moodBox.bottom + 12), maxTop);
  return { top, left: panel.x + 8, width };
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
  const [viewport, setViewport] = useState(() =>
    typeof window === "undefined"
      ? { width: 0, height: 0 }
      : { width: window.innerWidth, height: window.innerHeight }
  );
  const [cardHeight, setCardHeight] = useState(CARD_ESTIMATE);
  const [chrome, setChrome] = useState<Chrome>({ top: 72, bottom: 16, nav: null, flame: null });
  const measureKey = `${phase}:${index}:${pathname}`;
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

  const cardReady = target != null;
  useLayoutEffect(() => {
    const node = cardRef.current;
    if (!node) return;
    const read = () => {
      const next = Math.ceil(node.offsetHeight);
      setCardHeight((current) => (current === next ? current : next));
    };
    read();
    const observer = new ResizeObserver(read);
    observer.observe(node);
    return () => observer.disconnect();
  }, [stepKey, cardReady]);

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
    let stableCount = 0;
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
      if (pageBusy()) {
        previous = null;
        return;
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
        if (phoneNow && scroller instanceof HTMLElement && scroller.scrollTop > 1) {
          scroller.scrollTo({ top: 0, behavior: "auto" });
        }
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
      if (step.id === "calendar" && !motionSettled(measured)) {
        previous = null;
        stableCount = 0;
        return;
      }
      const box =
        step.id === "moods"
          ? clipMoodGrid(node, phone ? window.innerHeight - chrome.bottom - 260 - 16 : null)
          : measureTarget(measured);
      if (!previous || !sameTarget(previous, box)) {
        previous = box;
        stableCount = 1;
        if (!scrolled && step.id !== "moods") {
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
      if (step.id === "calendar") return;
      locked = true;
      window.clearInterval(timer);
    };

    const onResize = () => {
      previous = null;
      published = null;
      stableCount = 0;
      locked = false;
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
    };
  }, [phase, index, pathname, step, chrome.top, chrome.bottom]);

  useEffect(() => {
    const node = cardRef.current;
    if (!node) return;
    if (phase === "step" && !target) return;
    node.focus({ preventScroll: true });
  }, [stepKey, target, phase]);

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
  const cardSize = { width: TOUR_CARD_WIDTH, height: cardHeight || CARD_ESTIMATE };
  let spot: CardSpot | null = null;
  let phoneMoodRing: TargetBox | null = null;
  let moodNested = false;
  const loggedMood = step?.id === "moods" && target != null && !visibleQuery("[data-tour='mood-grid']");
  if (phase === "step" && step?.id === "moods" && phone && !loggedMood) {
    const laid = layoutPhoneMoods(cardSize.height, chrome.top, chrome.bottom, viewport.height);
    if (laid) {
      spot = laid.spot;
      phoneMoodRing = laid.ring;
    } else {
      const height = cardSize.height;
      spot = {
        top: Math.max(chrome.top, viewport.height - chrome.bottom - height),
        left: 16,
        width: Math.min(TOUR_CARD_WIDTH, viewport.width - 32),
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
  }
  if (!spot && holdFlame && chrome.flame) {
    const height = cardSize.height;
    const width = Math.min(TOUR_CARD_WIDTH, Math.max(200, viewport.width - 32));
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

  const title = phase === "welcome" ? TOUR_WELCOME.title : phase === "close" ? TOUR_CLOSE.title : step?.title ?? "";
  const body = phase === "welcome" ? TOUR_WELCOME.body : phase === "close" ? TOUR_CLOSE.body : step?.body ?? "";
  const progress = phase === "step" ? tourProgressLabel(index) : null;
  const titleId = "tour-card-title";
  const bodyId = "tour-card-body";
  const progressId = "tour-card-progress";

  const ringSource = phoneMoodRing ?? target;
  const ringPad =
    step?.id === "calendar" ? CALENDAR_RING_PAD : step?.id === "notes" ? NOTES_RING_PAD : RING_PAD;
  const ringBottomPad = phone && phoneMoodRing ? 0 : ringPad;
  const streakLimit = (() => {
    if (step?.id === "calendar" || step?.id === "notes") return 0;
    const flame = [...document.querySelectorAll("span")].find(
      (node) => node.textContent === "🔥" && /text-6xl|text-8xl/.test(node.parentElement?.className ?? "")
    );
    const header = flame?.parentElement?.parentElement;
    if (!(header instanceof HTMLElement)) return 0;
    return header.getBoundingClientRect().bottom + 8;
  })();
  const ringTop = ringSource ? Math.max(ringSource.y - ringPad, streakLimit) : 0;
  const ringBottom = ringSource ? ringSource.y + ringSource.height + ringBottomPad : 0;
  const nearFlame = streakLimit > 0 && ringSource != null && ringSource.y - streakLimit < 36;
  const tightRing = step?.id === "calendar" || step?.id === "notes";
  const ring = ringSource
    ? {
        left: ringSource.x - ringPad,
        top: ringTop,
        width: ringSource.width + ringPad * 2,
        height: Math.max(24, ringBottom - ringTop),
        radius: radiusWithPad(ringSource.radius, ringPad),
      }
    : null;

  const holes: Box[] = [];
  if (ringSource) {
    holes.push({
      x: ringSource.x - 6,
      y: ringSource.y - 6,
      width: ringSource.width + 12,
      height: ringSource.height + 12,
    });
  }
  if (chrome.nav) holes.push(chrome.nav);
  if (chrome.flame) holes.push(chrome.flame);

  const cardStyle: CSSProperties | undefined = spot
    ? {
        top: spot.top,
        left: spot.left,
        width: spot.width,
        maxHeight: Math.max(160, viewport.height - chrome.bottom - spot.top),
      }
    : undefined;

  const shieldBottom = chrome.nav ? chrome.nav.height : 0;

  return (
    <div className="fixed inset-0 z-[80] pointer-events-none">
      <div className="fixed left-0 right-0 top-0 z-[80]" style={{ bottom: shieldBottom, pointerEvents: "auto" }} />
      {phase === "step" && (ring || holdFlame) ? (
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
      ) : showWelcome || phase === "close" ? (
        <div className="fixed inset-0" style={{ background: "rgba(6,7,10,0.45)", bottom: shieldBottom }} />
      ) : null}
      {ring ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed"
          style={{
            left: ring.left,
            top: ring.top,
            width: ring.width,
            height: ring.height,
            borderRadius: ring.radius,
            boxShadow: tightRing
              ? "inset 0 0 0 2px rgba(103,232,249,0.95)"
              : nearFlame
                ? "0 0 0 2px rgba(103,232,249,0.95)"
                : "0 0 0 2px rgba(103,232,249,0.95), 0 0 18px 2px rgba(103,232,249,0.4)",
            opacity: reduceMotion ? 1 : undefined,
            animation: reduceMotion ? undefined : "prysmic-tour-in 150ms ease",
          }}
        />
      ) : null}
      {showCard && spot ? (
        <div
          ref={cardRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={progress ? `${progressId} ${titleId}` : titleId}
          aria-describedby={bodyId}
          tabIndex={-1}
          className={`pointer-events-auto fixed z-[81] overflow-y-auto rounded-2xl border border-white/10 bg-[#14161c] text-slate-100 shadow-[0_16px_40px_rgba(0,0,0,0.45)] outline-none ${
            moodNested ? "px-4 py-3" : viewport.width < 640 ? "p-3.5" : spot && spot.width < 380 ? "px-3.5 py-4" : "p-5"
          }`}
          style={{
            ...cardStyle,
            animation: reduceMotion ? undefined : "prysmic-tour-in 150ms ease",
          }}
          data-tour-card={phase === "step" ? (TOUR_STEPS[index]?.id ?? phase) : phase}
        >
          {progress ? (
            <p id={progressId} className="text-sm text-slate-400">
              {progress}
            </p>
          ) : null}
          <h2 id={titleId} className={`text-lg font-semibold tracking-wide text-slate-50 ${progress ? "mt-1" : ""}`}>
            {title}
          </h2>
          <p id={bodyId} className={`text-sm text-slate-300 ${moodNested ? "mt-1.5 leading-snug" : "mt-2 leading-relaxed"}`}>
            {body}
          </p>
          <div className={`flex flex-nowrap items-center gap-2 ${moodNested || viewport.width < 640 ? "mt-3" : "mt-5"}`}>
            {phase !== "close" ? (
              <button type="button" className={btnSecondary} onPointerDown={press(onSkip)}>
                {TOUR_CONTROLS.skip}
              </button>
            ) : null}
            <div className="ml-auto flex flex-nowrap items-center justify-end gap-2">
              {phase === "step" ? (
                <button type="button" className={btnSecondary} onPointerDown={press(onBack)}>
                  {TOUR_CONTROLS.back}
                </button>
              ) : null}
              {phase === "welcome" ? (
                <button type="button" className={btnPrimary} onPointerDown={press(onStart)}>
                  {TOUR_WELCOME.start}
                </button>
              ) : null}
              {phase === "step" ? (
                <button type="button" className={btnPrimary} onPointerDown={press(onNext)}>
                  {TOUR_CONTROLS.next}
                </button>
              ) : null}
              {phase === "close" ? (
                <button type="button" className={btnPrimary} onPointerDown={press(onDone)}>
                  {TOUR_CLOSE.done}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
      <style>{`@keyframes prysmic-tour-in { from { opacity: 0 } to { opacity: 1 } }
        html:has([data-tour-card="calendar"]) [data-tour-day],
        html:has([data-tour-card="calendar"]) [data-tour="calendar-today"] { box-shadow: none; }
        [data-tour-card]:focus,
        [data-tour-card]:focus-visible {
          outline: none;
          box-shadow: 0 16px 40px rgba(0,0,0,0.45);
        }
        html:has([data-tour-card="welcome"]) [data-tour-quiet],
        html:has([data-tour-card="close"]) [data-tour-quiet] { visibility: hidden; }`}</style>
    </div>
  );
}
