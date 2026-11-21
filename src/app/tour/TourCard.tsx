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
import { measureMoodRow, measureTarget, sameTarget, visibleQuery, type TargetBox } from "./tourTarget";
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
const RING_PAD = 10;

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
  const flame = flameNode instanceof HTMLElement ? toBox(flameNode.getBoundingClientRect(), 56) : null;
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

  useLayoutEffect(() => {
    if (phase !== "step" || !step) return;
    let scrolled = false;
    let locked = false;
    let previous: TargetBox | null = null;
    let hits = 0;
    let timer = 0;

    const publish = (box: TargetBox) => {
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
        hits = 0;
        return;
      }
      const node = visibleQuery(step.target);
      if (!node) {
        previous = null;
        hits = 0;
        return;
      }
      if (step.id === "moods" && !node.querySelector("button")) {
        previous = null;
        hits = 0;
        return;
      }
      const moodRow =
        step.id === "moods"
          ? measureMoodRow(node, { top: chrome.top, bottom: chrome.bottom, card: CARD_ESTIMATE })
          : null;
      const box = moodRow ?? measureTarget(node);
      if (previous && sameTarget(previous, box)) hits += 1;
      else hits = 0;
      previous = box;
      if (hits >= 1 && !scrolled) {
        scrolled = true;
        const scrollNode =
          step.id === "moods"
            ? ([...node.querySelectorAll("button")].filter((button) => button.getBoundingClientRect().height > 48).at(-1) ??
              node)
            : node;
        scrollTargetClear(
          scrollNode,
          { top: chrome.top, bottom: chrome.bottom },
          CARD_ESTIMATE,
          step.id === "calendar" ? "visible" : "below"
        );
        hits = 0;
        previous = null;
        return;
      }
      if (hits >= 2) {
        locked = true;
        window.clearInterval(timer);
        publish(box);
      }
    };

    timer = window.setInterval(tick, 120);
    tick();
    return () => window.clearInterval(timer);
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

  const showStep = phase === "step" && target;
  const showCard = phase !== "step" || showStep;
  const softObstacles: Box[] = [];
  if (step?.id === "calendar") {
    for (const node of document.querySelectorAll<HTMLElement>("[data-tour-day]")) {
      const rect = node.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) continue;
      softObstacles.push(toBox(rect, 4));
    }
  }
  const obstacles = target
    ? [
        ...keepBoxes(visibleQuery(step?.target ?? "")),
        ...(chrome.flame ? [chrome.flame] : []),
        ...(chrome.nav ? [chrome.nav] : []),
      ]
    : [];
  const spot: CardSpot | null = placeTourCard({
    viewport: viewport.width > 0 ? viewport : { width: 390, height: 844 },
    insets: { top: chrome.top, bottom: chrome.bottom },
    card: { width: TOUR_CARD_WIDTH, height: cardHeight || CARD_ESTIMATE },
    target: showStep && target
      ? { x: target.x - 18, y: target.y - 18, width: target.width + 36, height: target.height + 36 }
      : null,
    obstacles,
    softObstacles,
    presentation: phase === "step" ? "anchor" : "center",
    shieldBelow: step?.id === "calendar",
  });

  const title = phase === "welcome" ? TOUR_WELCOME.title : phase === "close" ? TOUR_CLOSE.title : step?.title ?? "";
  const body = phase === "welcome" ? TOUR_WELCOME.body : phase === "close" ? TOUR_CLOSE.body : step?.body ?? "";
  const progress = phase === "step" ? tourProgressLabel(index) : null;
  const titleId = "tour-card-title";
  const bodyId = "tour-card-body";
  const progressId = "tour-card-progress";

  const ring = target
    ? {
        left: target.x - RING_PAD,
        top: target.y - RING_PAD,
        width: target.width + RING_PAD * 2,
        height: target.height + RING_PAD * 2,
        radius: radiusWithPad(target.radius, RING_PAD),
      }
    : null;

  const holes: Box[] = [];
  if (target) {
    holes.push({
      x: target.x - 6,
      y: target.y - 6,
      width: target.width + 12,
      height: target.height + 12,
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
      {phase === "step" && ring ? (
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
      ) : phase !== "step" ? (
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
            boxShadow:
              "0 0 0 2px rgba(103,232,249,0.95), 0 0 18px 2px rgba(103,232,249,0.4)",
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
            viewport.width < 640 ? "p-3.5" : "p-5"
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
          <p id={bodyId} className="mt-2 text-sm leading-relaxed text-slate-300">
            {body}
          </p>
          <div className={`flex flex-wrap items-center gap-2 ${viewport.width < 640 ? "mt-3" : "mt-5"}`}>
            {phase !== "close" ? (
              <button type="button" className={btnSecondary} onPointerDown={press(onSkip)}>
                {TOUR_CONTROLS.skip}
              </button>
            ) : null}
            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
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
        html:has([data-tour-card="calendar"]) [data-tour-day] { box-shadow: none; }`}</style>
    </div>
  );
}
