"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { btnPrimary, btnSecondary } from "../components/forms/styles";
import { placeTourCard, TOUR_CARD_WIDTH, type CardSpot } from "./tourPlace";
import {
  TOUR_CLOSE,
  TOUR_CONTROLS,
  TOUR_STEPS,
  TOUR_WELCOME,
  tourProgressLabel,
  tourStepByIndex,
} from "./tourStops";
import { measureTarget, revealTargetOnce, sameTarget, visibleQuery, type TargetBox } from "./tourTarget";
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

const CARD_ESTIMATE = 220;

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
  const measureKey = `${phase}:${index}:${pathname}`;
  const [measured, setMeasured] = useState<{ key: string; box: TargetBox | null }>({
    key: measureKey,
    box: null,
  });
  if (measured.key !== measureKey) {
    setMeasured({ key: measureKey, box: null });
  }
  const target = measured.key === measureKey ? measured.box : null;
  const [reduceMotion, setReduceMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  const stepKey = phase === "step" ? `step-${index}` : phase;

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
    };
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);

  const anchorKey = `${stepKey}:${target ? "anchored" : "open"}:${viewport.width}`;
  useLayoutEffect(() => {
    const node = cardRef.current;
    if (!node) return;
    const read = () => {
      const next = Math.ceil(node.scrollHeight);
      setCardHeight((current) => (current === next ? current : next));
    };
    read();
    const observer = new ResizeObserver(read);
    observer.observe(node);
    return () => observer.disconnect();
  }, [anchorKey]);

  useLayoutEffect(() => {
    const step = phase === "step" ? tourStepByIndex(index) : null;
    if (phase !== "step" || !step) return;

    let scrolled = false;
    let locked = false;
    const publish = (box: TargetBox) => {
      setMeasured((current) => {
        const key = `${phase}:${index}:${pathname}`;
        if (current.key === key && current.box && sameTarget(current.box, box)) return current;
        return { key, box };
      });
    };
    const read = (allowScroll: boolean): boolean => {
      const node = visibleQuery(step.target);
      if (!node) return false;
      if (allowScroll && !scrolled) {
        scrolled = true;
        revealTargetOnce(node);
      }
      publish(measureTarget(node));
      return true;
    };

    let observer: MutationObserver | null = null;
    let timer = 0;
    let giveUp = 0;
    const finish = () => {
      locked = true;
      window.clearInterval(timer);
      window.clearTimeout(giveUp);
      observer?.disconnect();
    };

    timer = window.setInterval(() => {
      if (locked) return;
      if (read(!scrolled)) finish();
    }, 100);
    giveUp = window.setTimeout(finish, 8000);

    if (read(true)) finish();
    else {
      observer = new MutationObserver(() => {
        if (locked) return;
        if (read(true)) finish();
      });
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-tour"] });
    }

    const onReflow = () => {
      if (!locked) return;
      read(false);
    };
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);

    return () => {
      finish();
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [phase, index, pathname]);

  useEffect(() => {
    cardRef.current?.focus({ preventScroll: true });
  }, [stepKey]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (phase === "welcome" || phase === "step") {
          event.preventDefault();
          event.stopPropagation();
          onSkip();
        }
        return;
      }
      if (event.key !== "Tab") return;
      const nodes = focusables(cardRef.current);
      if (nodes.length === 0) {
        event.preventDefault();
        cardRef.current?.focus({ preventScroll: true });
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
  }, [phase, onSkip]);

  useEffect(() => {
    const block = (event: Event) => {
      const card = cardRef.current;
      if (card && event.target instanceof Node && card.contains(event.target)) return;
      event.preventDefault();
    };
    document.addEventListener("wheel", block, { capture: true, passive: false });
    document.addEventListener("touchmove", block, { capture: true, passive: false });
    return () => {
      document.removeEventListener("wheel", block, true);
      document.removeEventListener("touchmove", block, true);
    };
  }, []);

  const step = phase === "step" ? tourStepByIndex(index) : null;
  const title = phase === "welcome" ? TOUR_WELCOME.title : phase === "close" ? TOUR_CLOSE.title : step?.title ?? "";
  const body = phase === "welcome" ? TOUR_WELCOME.body : phase === "close" ? TOUR_CLOSE.body : step?.body ?? "";
  const progress = phase === "step" ? tourProgressLabel(index) : null;
  // Welcome and close leave Moods immediately. Until that navigation lands,
  // and while the mood picker is missing, keep the card low and skip the scrim
  // so the flame stays undimmed and uncovered.
  const leavingMoods = pathname === "/moods" && phase !== "step";
  const spareFlame = leavingMoods || (step?.id === "moods" && !target);

  const spot: CardSpot = placeTourCard({
    viewport: viewport.width > 0 ? viewport : { width: TOUR_CARD_WIDTH + 32, height: 640 },
    card: { width: TOUR_CARD_WIDTH, height: cardHeight },
    target: phase === "step" ? target : null,
    presentation: phase === "step" ? "step" : "center",
    dock: spareFlame,
  });

  const scrim = phase !== "step" && !leavingMoods;
  const titleId = "tour-card-title";
  const bodyId = "tour-card-body";
  const progressId = "tour-card-progress";

  const cardStyle: CSSProperties =
    spot.mode === "bottom"
      ? {
          left: spot.left,
          width: spot.width,
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
          maxHeight: "calc(100dvh - env(safe-area-inset-bottom, 0px) - 24px)",
        }
      : {
          top: spot.top,
          left: spot.left,
          width: spot.width,
          maxHeight: Math.max(160, (viewport.height || 640) - spot.top - 16),
          transition: reduceMotion ? "none" : "top 150ms ease, left 150ms ease",
        };

  return (
    <div className="fixed inset-0 z-[80]">
      <div
        className="absolute inset-0"
        style={{ background: scrim ? "rgba(6, 7, 10, 0.45)" : "transparent" }}
      />
      {phase === "step" && target ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed"
          style={{
            left: target.x,
            top: target.y,
            width: target.width,
            height: target.height,
            borderRadius: target.radius,
            boxShadow: "0 0 0 2px rgba(226, 232, 240, 0.92), 0 0 0 6px rgba(226, 232, 240, 0.16)",
          }}
        />
      ) : null}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={progress ? `${progressId} ${titleId}` : titleId}
        aria-describedby={bodyId}
        tabIndex={-1}
        className="fixed z-[81] overflow-y-auto rounded-2xl border border-white/10 bg-[#14161c] p-5 text-slate-100 shadow-[0_16px_40px_rgba(0,0,0,0.45)] outline-none"
        style={cardStyle}
        data-tour-card={phase === "step" ? TOUR_STEPS[index]?.id : phase}
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
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {phase !== "close" ? (
            <button type="button" className={btnSecondary} onClick={onSkip}>
              {TOUR_CONTROLS.skip}
            </button>
          ) : null}
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            {phase === "step" ? (
              <button type="button" className={btnSecondary} onClick={onBack}>
                {TOUR_CONTROLS.back}
              </button>
            ) : null}
            {phase === "welcome" ? (
              <button type="button" className={btnPrimary} onClick={onStart}>
                {TOUR_WELCOME.start}
              </button>
            ) : null}
            {phase === "step" ? (
              <button type="button" className={btnPrimary} onClick={onNext}>
                {TOUR_CONTROLS.next}
              </button>
            ) : null}
            {phase === "close" ? (
              <button type="button" className={btnPrimary} onClick={onDone}>
                {TOUR_CLOSE.done}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
