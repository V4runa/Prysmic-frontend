"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { moodShellAccent } from "../lib/moodRoom";
import ClosingLine from "./ClosingLine";
import GuideLantern, { type LanternPose } from "./GuideLantern";
import GuideRibbon from "./GuideRibbon";
import LightPool from "./LightPool";
import TourArrival from "./TourArrival";
import { focusables, toRect, visibleQuery } from "./tourDom";
import { clampRect, padRect, placeRibbon, type Rect } from "./tourLayout";
import { tourStopId, type TourState } from "./tourMachine";
import { PAGE_EASE, SCRIM_ARRIVAL, SCRIM_STOP, TOUR_COPY, TOUR_MOTE, TOUR_STOPS, tourStopByIndex } from "./tourStops";
import { useTourTarget } from "./useTourTarget";

type Tint = { r: number; g: number; b: number } | null;

type StageProps = {
  state: TourState;
  name: string | null;
  emailNote: boolean;
  moodTint: Tint;
  onBegin: () => void;
  onDecline: () => void;
  onLeave: () => void;
  onNext: () => void;
  onBack: () => void;
  onNotToday: () => void;
  onTargetReady: () => void;
  onLightDone: () => void;
  onClosingDone: () => void;
};

const WORD_SHADOW = "0 1px 18px rgba(6,7,10,0.95), 0 0 2px rgba(6,7,10,1)";

function useFrame() {
  const [frame, setFrame] = useState({
    width: 0,
    height: 0,
    phone: false,
    keyboard: false,
    header: 56,
    tabbar: 0,
  });

  useEffect(() => {
    const read = () => {
      const viewport = window.visualViewport;
      const width = window.innerWidth;
      const height = viewport?.height ?? window.innerHeight;
      const phone = width < 640;
      const headerEl = document.querySelector(".app-header");
      const tabEl = document.querySelector(".app-bottom-nav");
      const header = headerEl?.getBoundingClientRect().height || (phone ? 56 : 48);
      const tabShown = phone && tabEl instanceof HTMLElement && getComputedStyle(tabEl).display !== "none";
      const tabbar = tabShown ? tabEl.getBoundingClientRect().height : 0;
      const keyboard = phone && height < window.innerHeight * 0.75;
      setFrame({ width, height, phone, keyboard, header, tabbar });
    };
    read();
    window.addEventListener("resize", read);
    window.visualViewport?.addEventListener("resize", read);
    return () => {
      window.removeEventListener("resize", read);
      window.visualViewport?.removeEventListener("resize", read);
    };
  }, []);

  return frame;
}

function chipFor(color: string): string | null {
  if (color === TOUR_MOTE.notes) return "note";
  if (color === TOUR_MOTE.tasks) return "task";
  if (color === TOUR_MOTE.contracts) return "habit";
  return null;
}

function guideColor(token: string | null, tint: Tint, fallback: string): string {
  const accent = moodShellAccent(token);
  if (accent) return `rgb(${accent.r} ${accent.g} ${accent.b})`;
  if (tint && !token) return `rgb(${tint.r} ${tint.g} ${tint.b})`;
  return fallback;
}

export default function TourStage(props: StageProps) {
  const { state } = props;
  const reduced = useReducedMotion() ?? false;
  const frame = useFrame();
  const stop = tourStopByIndex(state.index);
  const stopId = tourStopId(state);
  const seeking = state.phase === "settle" || state.phase === "present" || state.phase === "ack";
  const selectors =
    stopId === "calendar"
      ? ["[data-tour='calendar-grid']", "[data-tour='calendar-chips']"]
      : stop
        ? [stop.target]
        : [];
  const target = useTourTarget(selectors, seeking, reduced);
  const [arrivalAnchor, setArrivalAnchor] = useState<Rect | null>(null);
  const [waypoint, setWaypoint] = useState<{ x: number; y: number } | null>(null);
  const [headerPoint, setHeaderPoint] = useState<{ x: number; y: number } | null>(null);
  const [lightStep, setLightStep] = useState<"color" | "rise" | "bloom">("color");
  const reported = useRef("");
  const actions = useRef(props);
  const shownLight = state.phase === "light" ? lightStep : "color";

  useEffect(() => {
    actions.current = props;
  });

  useEffect(() => {
    if (state.phase !== "arrival") return;
    const id = requestAnimationFrame(() => {
      const panel = visibleQuery("[data-tour='notes-panel']");
      setArrivalAnchor(panel ? toRect(panel.getBoundingClientRect()) : null);
    });
    return () => cancelAnimationFrame(id);
  }, [state.phase, frame.width]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      if (state.phase !== "travel" || !stop) {
        setWaypoint(null);
        return;
      }
      const node = visibleQuery(stop.waypoint);
      if (!node) {
        setWaypoint(null);
        return;
      }
      const rect = node.getBoundingClientRect();
      setWaypoint({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
    });
    return () => cancelAnimationFrame(id);
  }, [state.phase, state.index, stop]);

  useEffect(() => {
    if (state.phase !== "settle") {
      reported.current = "";
      return;
    }
    if (!target.ready) return;
    const key = String(state.index);
    if (reported.current === key) return;
    reported.current = key;
    actions.current.onTargetReady();
  }, [state.phase, state.index, target.ready]);

  useEffect(() => {
    const lock =
      state.phase === "arrival" ||
      state.phase === "travel" ||
      state.phase === "settle" ||
      state.phase === "present" ||
      state.phase === "ack";
    if (!lock) return;
    const nodes = document.querySelectorAll(".app-header, .app-bottom-nav");
    nodes.forEach((node) => node.setAttribute("inert", ""));
    return () => nodes.forEach((node) => node.removeAttribute("inert"));
  }, [state.phase]);

  useEffect(() => {
    const litLine = state.phase === "light" && state.alreadyLit;
    if (state.phase !== "present" && state.phase !== "arrival" && !litLine) return;
    const heading = document.getElementById("tour-heading");
    const timer = window.setTimeout(() => heading?.focus({ preventScroll: true }), reduced ? 40 : 80);
    return () => window.clearTimeout(timer);
  }, [state.phase, state.index, state.alreadyLit, reduced]);

  useEffect(() => {
    if (state.phase !== "light") return;
    const id = requestAnimationFrame(() => {
      setLightStep("color");
      const word = document.querySelector(".app-header h1");
      if (word) {
        const rect = word.getBoundingClientRect();
        setHeaderPoint({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
      } else {
        setHeaderPoint({ x: frame.width / 2, y: 28 });
      }
    });
    if (reduced) {
      const done = window.setTimeout(() => actions.current.onLightDone(), 420);
      return () => {
        cancelAnimationFrame(id);
        window.clearTimeout(done);
      };
    }
    const rise = window.setTimeout(() => setLightStep("rise"), 600);
    const bloom = window.setTimeout(() => setLightStep("bloom"), 1500);
    const done = window.setTimeout(() => actions.current.onLightDone(), 2200);
    return () => {
      cancelAnimationFrame(id);
      window.clearTimeout(rise);
      window.clearTimeout(bloom);
      window.clearTimeout(done);
    };
  }, [state.phase, reduced, frame.width]);

  useEffect(() => {
    if (!(state.phase === "closing" && state.closing === "lit")) return;
    const onPointer = () => actions.current.onClosingDone();
    const timer = window.setTimeout(() => {
      window.addEventListener("pointerdown", onPointer);
    }, 400);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [state.phase, state.closing]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        actions.current.onLeave();
        return;
      }
      const typing = isTyping(event.target);
      if (event.key === "Tab" && (state.phase === "arrival" || state.phase === "present" || state.phase === "ack")) {
        const ribbon = document.getElementById("tour-ribbon");
        const targetNode = stop ? visibleQuery(stop.target) : null;
        const items = uniqueFocusables([...focusables(ribbon), ...focusables(targetNode)]);
        if (items.length === 0) return;
        event.preventDefault();
        event.stopPropagation();
        const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const current = active ? items.findIndex((item) => item === active || item.contains(active)) : -1;
        const nextIndex = event.shiftKey
          ? (current <= 0 ? items.length : current) - 1
          : (current + 1) % items.length;
        items[nextIndex]?.focus();
        return;
      }
      if (state.phase === "arrival" && event.key === "Enter" && !typing) {
        event.preventDefault();
        actions.current.onBegin();
        return;
      }
      if (state.phase !== "present" && state.phase !== "ack") return;
      if ((event.key === "ArrowRight" || event.key === "Enter") && !typing) {
        event.preventDefault();
        if (stopId === "moods") actions.current.onNotToday();
        else actions.current.onNext();
        return;
      }
      if (event.key === "ArrowLeft" && !typing) {
        event.preventDefault();
        actions.current.onBack();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [state.phase, stop, stopId]);

  const scrimOn =
    state.phase === "arrival" ||
    state.phase === "travel" ||
    state.phase === "settle" ||
    state.phase === "present" ||
    state.phase === "ack";
  const strength = state.phase === "arrival" ? SCRIM_ARRIVAL : SCRIM_STOP;
  const hole = holeFor(stopId, target.rect, frame, state.phase);
  const showGuide = state.phase !== "closing" && state.phase !== "done" && state.phase !== "idle";
  const pose = buildPose({
    state,
    frame,
    target: target.rect,
    arrivalAnchor,
    waypoint,
    headerPoint,
    lightStep: shownLight,
    tint: props.moodTint,
    reduced,
  });
  const anchor = stopId === "moods" ? measure("[data-tour='mood-heading']") : null;
  const place =
    stop && (state.phase === "present" || state.phase === "ack")
      ? placeRibbon({
          stop: stop.id,
          phone: frame.phone,
          keyboard: frame.keyboard,
          target: hole,
          anchor,
          viewport: { width: frame.width, height: frame.height },
          header: frame.header,
          tabbar: frame.tabbar,
        })
      : null;
  const alreadyLitFinale =
    Boolean(stop) &&
    state.alreadyLit &&
    (state.phase === "light" || (state.phase === "closing" && state.closing === "lit"));
  const litPlace =
    alreadyLitFinale && frame.width > 0
      ? placeRibbon({
          stop: "closing",
          phone: frame.phone,
          keyboard: false,
          target: null,
          anchor: null,
          viewport: { width: frame.width, height: frame.height },
          header: frame.header,
          tabbar: frame.tabbar,
        })
      : null;
  const ribbonPlace = place ?? litPlace;
  const releaseMotes =
    state.phase === "present" && stopId === "calendar" ? gatheredColors(state.index) : null;

  return (
    <>
      <AnimatePresence>
        {scrimOn ? (
          <motion.div
            key="pool"
            className="pointer-events-none fixed inset-0 z-[70]"
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0.15 : 0.4, ease: "easeOut" }}
          >
            <LightPool
              strength={strength}
              hole={state.phase === "present" || state.phase === "ack" ? hole : null}
              tint={props.moodTint}
              showRing={state.phase === "present" || state.phase === "ack"}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
      {showGuide && frame.width > 0 ? <GuideLantern pose={pose} /> : null}
      {releaseMotes ? <MoteFlight colors={releaseMotes} from={pose} phone={frame.phone} reduced={reduced} /> : null}
      <AnimatePresence>
        {state.phase === "arrival" ? (
          <TourArrival
            key="arrival"
            name={props.name}
            emailNote={props.emailNote}
            phone={frame.phone}
            anchor={
              arrivalAnchor
                ? {
                    x: arrivalAnchor.x + arrivalAnchor.width / 2,
                    y: arrivalAnchor.y + arrivalAnchor.height * 0.3,
                    width: Math.max(280, arrivalAnchor.width - 48),
                  }
                : null
            }
            onBegin={props.onBegin}
            onDecline={props.onDecline}
          />
        ) : null}
        {stop && ribbonPlace ? (
          <GuideRibbon
            key={litPlace ? "already-lit" : stop.id}
            stop={stop}
            index={state.index}
            place={ribbonPlace}
            ack={state.phase === "ack" ? state.ackLine : null}
            line={litPlace ? TOUR_COPY.litLine : null}
            controls={!litPlace}
            onBack={props.onBack}
            onNext={props.onNext}
            onNotToday={props.onNotToday}
            onLeave={props.onLeave}
          />
        ) : null}
        {state.phase === "closing" && state.closing && state.closing !== "declined" && state.closing !== "lit" ? (
          <ClosingLine key={state.closing} kind={state.closing} onDone={props.onClosingDone} />
        ) : null}
      </AnimatePresence>
    </>
  );
}

function uniqueFocusables(nodes: HTMLElement[]): HTMLElement[] {
  const seen = new Set<HTMLElement>();
  return nodes.filter((node) => {
    if (seen.has(node) || node.getClientRects().length === 0) return false;
    seen.add(node);
    return true;
  });
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
}

function measure(selector: string): Rect | null {
  const node = visibleQuery(selector);
  return node ? toRect(node.getBoundingClientRect()) : null;
}

function guideBeside(rect: Rect, stopId: string | null): { x: number; y: number } {
  if (stopId === "tasks") return { x: rect.x - 16, y: rect.y + 26 };
  return { x: rect.x - 14, y: rect.y - 22 };
}

function holeFor(
  stopId: ReturnType<typeof tourStopId>,
  rect: Rect | null,
  frame: { width: number; height: number; phone: boolean },
  phase: TourState["phase"]
): Rect | null {
  if (!rect || (phase !== "present" && phase !== "ack" && phase !== "settle")) return null;
  const pad = stopId === "calendar" || stopId === "moods" ? 8 : 10;
  if (frame.width < 1) return rect;
  return clampRect(padRect(rect, pad), frame, 8);
}

function gatheredColors(index: number): string[] {
  return TOUR_STOPS.slice(0, index + 1)
    .map((item) => item.mote)
    .filter((color): color is string => Boolean(color));
}

function buildPose(input: {
  state: TourState;
  frame: { width: number; height: number; header: number };
  target: Rect | null;
  arrivalAnchor: Rect | null;
  waypoint: { x: number; y: number } | null;
  headerPoint: { x: number; y: number } | null;
  lightStep: "color" | "rise" | "bloom";
  tint: Tint;
  reduced: boolean;
}): LanternPose {
  const { state, frame, tint, reduced } = input;
  const base = guideColor(state.moodColor, state.phase === "light" ? null : tint, TOUR_MOTE.guide);
  const center = {
    x: input.arrivalAnchor
      ? input.arrivalAnchor.x + input.arrivalAnchor.width / 2
      : frame.width / 2,
    y: input.arrivalAnchor
      ? input.arrivalAnchor.y + input.arrivalAnchor.height * 0.22
      : frame.height * 0.34,
  };
  const hideMotes = state.phase === "present" && tourStopId(state) === "calendar";
  const motes = state.index < 0 || hideMotes ? [] : gatheredColors(state.index);
  const shared = {
    color: state.phase === "light" ? guideColor(state.moodColor, tint, TOUR_MOTE.moods) : base,
    motes: state.phase === "light" || state.phase === "reflect" ? [] : motes,
    breathe: state.phase === "arrival" || state.phase === "present" || state.phase === "ack",
  };

  if (state.phase === "arrival") {
    const phone = frame.width > 0 && frame.width < 640;
    return {
      ...shared,
      x: phone ? frame.width / 2 : center.x,
      y: phone ? frame.header + 36 : Math.max(frame.header + 48, center.y - 78),
      travel: reduced ? "fade" : "center",
      scale: 1,
      opacity: 1,
    };
  }
  if (state.phase === "travel") {
    const point = input.waypoint ?? center;
    return { ...shared, x: point.x, y: point.y, travel: reduced ? "fade" : "arc", scale: 1, opacity: 1 };
  }
  if (state.phase === "reflect") {
    return {
      ...shared,
      x: Math.max(24, frame.width - 32),
      y: frame.header + 28,
      travel: reduced ? "fade" : "settle",
      scale: 0.7,
      opacity: 0.9,
      breathe: false,
    };
  }
  if (state.phase === "light") {
    const home = input.headerPoint ?? { x: frame.width / 2, y: frame.header / 2 };
    const blooming = input.lightStep === "bloom";
    return {
      ...shared,
      x: input.lightStep === "color" ? (input.target ? guideBeside(input.target, tourStopId(input.state)).x : center.x) : home.x,
      y: input.lightStep === "color" ? (input.target ? guideBeside(input.target, tourStopId(input.state)).y : center.y) : home.y,
      travel: reduced ? "fade" : blooming ? "bloom" : input.lightStep === "rise" ? "rise" : "wait",
      scale: blooming ? 6 : 1,
      opacity: blooming ? 0 : 1,
      breathe: false,
      motes: [],
    };
  }
  const lit = input.target ? guideBeside(input.target, tourStopId(input.state)) : center;
  return {
    ...shared,
    x: lit.x,
    y: lit.y,
    travel: reduced ? "fade" : state.phase === "settle" ? "settle" : "wait",
    scale: 1,
    opacity: 1,
  };
}

function MoteFlight({
  colors,
  from,
  phone,
  reduced,
}: {
  colors: string[];
  from: LanternPose;
  phone: boolean;
  reduced: boolean;
}) {
  const [spots, setSpots] = useState<{ color: string; x: number; y: number }[]>([]);
  const [thread, setThread] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
    const today = visibleQuery("[data-tour='calendar-today']")?.getBoundingClientRect();
    setSpots(
      colors.map((color, index) => {
        const chip = chipFor(color);
        const node = !phone && chip ? visibleQuery(`[data-tour='calendar-chip-${chip}']`) : null;
        const rect = node?.getBoundingClientRect();
        if (rect) return { color, x: rect.x + rect.width / 2, y: rect.y - 8 };
        if (today) {
          return {
            color,
            x: today.x + today.width / 2 + (index - (colors.length - 1) / 2) * 8,
            y: today.y + today.height * 0.62,
          };
        }
        return { color, x: from.x, y: from.y };
      })
    );
    if (phone) {
      setThread(null);
      return;
    }
    const note = visibleQuery("[data-tour='calendar-chip-note']")?.getBoundingClientRect();
    const task = visibleQuery("[data-tour='calendar-chip-task']")?.getBoundingClientRect();
    if (!note || !task) {
      setThread(null);
      return;
    }
    setThread({
      x1: note.x + note.width / 2,
      y1: note.y + note.height / 2,
      x2: task.x + task.width / 2,
      y2: task.y + task.height / 2,
    });
    });
    return () => cancelAnimationFrame(id);
  }, [colors, from.x, from.y, phone]);

  return (
    <div aria-hidden="true">
      {thread ? (
        <svg className="pointer-events-none fixed inset-0 z-[73] h-full w-full">
          <motion.line
            x1={thread.x1}
            y1={thread.y1}
            x2={thread.x2}
            y2={thread.y2}
            stroke={TOUR_MOTE.tags}
            strokeWidth={1}
            initial={{ opacity: 0 }}
            animate={{ opacity: reduced ? 0.75 : [0, 0.9, 0] }}
            transition={{ duration: reduced ? 0.15 : 0.8, delay: reduced ? 0 : 0.35, ease: "easeOut" }}
          />
        </svg>
      ) : null}
      {spots.map((spot, index) => (
        <motion.span
          key={spot.color}
          className="pointer-events-none fixed z-[75] h-2 w-2 rounded-full"
          style={{ background: spot.color, boxShadow: `0 0 8px ${spot.color}`, textShadow: WORD_SHADOW }}
          initial={{ left: from.x, top: from.y, opacity: reduced ? 1 : 0 }}
          animate={{ left: spot.x - 4, top: spot.y - 4, opacity: 1 }}
          transition={
            reduced
              ? { duration: 0.15 }
              : { duration: 0.5, delay: 0.15 * index, ease: PAGE_EASE }
          }
        />
      ))}
    </div>
  );
}
