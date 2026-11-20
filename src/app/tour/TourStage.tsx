"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { moodShellAccent } from "../lib/moodRoom";
import ClosingLine from "./ClosingLine";
import GuideLantern, { type LanternPose } from "./GuideLantern";
import GuideRibbon from "./GuideRibbon";
import LightPool from "./LightPool";
import TourArrival from "./TourArrival";
import { TOUR_BEAT, TOUR_EASE } from "./tourBeats";
import { focusables, pageIsBusy, toRect, visibleQuery } from "./tourDom";
import { RIBBON_ESTIMATE, glowFor, lanternAnchor, placeRibbon, type Rect } from "./tourLayout";
import { tourStopId, type TourState } from "./tourMachine";
import { TOUR_COPY, TOUR_MOTE, TOUR_STOPS, tourStopByIndex } from "./tourStops";
import { useTourTarget } from "./useTourTarget";

type Tint = { r: number; g: number; b: number } | null;

type StageProps = {
  state: TourState;
  name: string | null;
  emailNote: boolean;
  moodTint: Tint;
  moodToken: string | null;
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
  const skipTarget = stopId === "moods" && Boolean(props.moodToken);
  const seeking =
    (state.phase === "settle" || state.phase === "present" || state.phase === "ack") && !skipTarget;
  const selectors = stop && !skipTarget ? [stop.target] : [];
  const target = useTourTarget(selectors, seeking, reduced);
  const [arrivalAnchor, setArrivalAnchor] = useState<Rect | null>(null);
  const [waypoint, setWaypoint] = useState<{ x: number; y: number } | null>(null);
  const [departedFor, setDepartedFor] = useState(-2);
  const [sceneBeat, setSceneBeat] = useState<{ index: number; beat: "drift" | "words" | "ready" } | null>(null);
  const [keptRect, setKeptRect] = useState<Rect | null>(null);
  const [keptKey, setKeptKey] = useState("");
  const [flameReady, setFlameReady] = useState(false);
  const [finaleAdvance, setFinaleAdvance] = useState(false);
  const [leaveStage, setLeaveStage] = useState<"line" | "lift" | null>(null);
  const reported = useRef("");
  const actions = useRef(props);

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
    if (skipTarget) {
      let cancelled = false;
      let frame = 0;
      const started = performance.now();
      const watch = () => {
        if (cancelled) return;
        const waited = performance.now() - started;
        if ((pageIsBusy() || waited < 40) && waited < 8000) {
          frame = requestAnimationFrame(watch);
          return;
        }
        const key = String(state.index);
        if (reported.current === key) return;
        reported.current = key;
        actions.current.onTargetReady();
      };
      const fonts = document.fonts?.ready ?? Promise.resolve();
      void fonts.then(() => {
        if (!cancelled) frame = requestAnimationFrame(watch);
      });
      return () => {
        cancelled = true;
        cancelAnimationFrame(frame);
      };
    }
    if (!target.ready) return;
    const key = String(state.index);
    if (reported.current === key) return;
    reported.current = key;
    actions.current.onTargetReady();
  }, [state.phase, state.index, target.ready, skipTarget]);

  useEffect(() => {
    const lock =
      state.phase === "arrival" ||
      state.phase === "travel" ||
      state.phase === "settle" ||
      state.phase === "present" ||
      state.phase === "ack" ||
      state.phase === "light" ||
      state.phase === "reflect";
    if (!lock) return;
    const nodes = document.querySelectorAll(".app-header, .app-bottom-nav");
    nodes.forEach((node) => node.setAttribute("inert", ""));
    return () => nodes.forEach((node) => node.removeAttribute("inert"));
  }, [state.phase]);

  const rectKey = target.rect
    ? `${target.rect.x.toFixed(0)}|${target.rect.y.toFixed(0)}|${target.rect.width.toFixed(0)}|${target.rect.height.toFixed(0)}`
    : "";
  if (
    rectKey &&
    rectKey !== keptKey &&
    target.rect &&
    state.phase !== "travel" &&
    state.phase !== "settle"
  ) {
    setKeptRect(target.rect);
    setKeptKey(rectKey);
  }
  const beat =
    state.phase === "ack"
      ? "ready"
      : state.phase !== "present"
        ? "dark"
        : reduced
          ? sceneBeat?.index === state.index && sceneBeat.beat === "ready"
            ? "ready"
            : "words"
          : sceneBeat?.index === state.index
            ? sceneBeat.beat
            : "reveal";
  const covered =
    state.phase === "settle" ||
    state.phase === "light" ||
    (state.phase === "travel" && (reduced || departedFor === state.index));

  const finaleShown =
    state.alreadyLit &&
    flameReady &&
    (state.phase === "light" || state.phase === "closing");
  const finaleLifting = finaleShown && state.phase === "closing";
  const leavingPanel =
    !finaleShown && state.phase === "closing" && state.closing === "left" && Boolean(stop);
  const leaveLifting = leavingPanel && leaveStage === "lift";

  useEffect(() => {
    const speaking = (state.phase === "present" || state.phase === "ack") && (beat === "words" || beat === "ready");
    const litLine = state.phase === "closing" && state.closing === "home";
    if (state.phase !== "arrival" && !speaking && !litLine && !finaleShown) return;
    const heading = document.getElementById("tour-heading");
    const timer = window.setTimeout(() => heading?.focus({ preventScroll: true }), reduced ? 40 : 80);
    return () => window.clearTimeout(timer);
  }, [state.phase, state.index, state.closing, beat, reduced, finaleShown]);

  useEffect(() => {
    if (state.phase !== "light") return;
    let cancelled = false;
    let frame = 0;
    const started = performance.now();
    const watch = () => {
      if (cancelled) return;
      const room = document.querySelector("[data-tour='mood-room']");
      const box = room?.getBoundingClientRect();
      const present = Boolean(box && box.height > 40 && !pageIsBusy());
      if (present || performance.now() - started > 8000) {
        if (state.alreadyLit) setFlameReady(true);
        else actions.current.onLightDone();
        return;
      }
      frame = requestAnimationFrame(watch);
    };
    frame = requestAnimationFrame(watch);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [state.phase, state.alreadyLit]);

  useEffect(() => {
    if (!(state.alreadyLit && state.phase === "light" && flameReady)) return;
    const timer = window.setTimeout(() => setFinaleAdvance(true), reduced ? 0 : TOUR_BEAT.dwell);
    return () => window.clearTimeout(timer);
  }, [state.alreadyLit, state.phase, flameReady, reduced]);

  useEffect(() => {
    const midTour =
      state.phase === "closing" &&
      state.closing === "left" &&
      state.index >= 0 &&
      !(state.alreadyLit && flameReady);
    if (!midTour) return;
    const lineAt = reduced ? 0 : TOUR_BEAT.wordsOut;
    const liftAt = lineAt + (reduced ? 0 : TOUR_BEAT.wordsIn);
    const line = window.setTimeout(() => setLeaveStage("line"), lineAt);
    const lift = window.setTimeout(() => setLeaveStage("lift"), liftAt);
    return () => {
      window.clearTimeout(line);
      window.clearTimeout(lift);
    };
  }, [state.phase, state.closing, state.index, state.alreadyLit, flameReady, reduced]);

  useEffect(() => {
    if (state.phase !== "travel" || reduced) return;
    const index = state.index;
    const timer = window.setTimeout(() => setDepartedFor(index), TOUR_BEAT.wordsOut);
    return () => window.clearTimeout(timer);
  }, [state.phase, state.index, reduced]);

  useEffect(() => {
    if (state.phase === "travel") return;
    const timer = window.setTimeout(() => setDepartedFor(-2), 0);
    return () => window.clearTimeout(timer);
  }, [state.phase]);

  useEffect(() => {
    if (state.phase !== "present") return;
    const index = state.index;
    if (reduced) {
      const ready = window.setTimeout(() => setSceneBeat({ index, beat: "ready" }), 420);
      return () => window.clearTimeout(ready);
    }
    const driftAt = TOUR_BEAT.reveal;
    const wordsAt = driftAt + TOUR_BEAT.drift + TOUR_BEAT.wordsDelay;
    const readyAt = wordsAt + TOUR_BEAT.wordsIn + TOUR_BEAT.dwell;
    const drift = window.setTimeout(() => setSceneBeat({ index, beat: "drift" }), driftAt);
    const words = window.setTimeout(() => setSceneBeat({ index, beat: "words" }), wordsAt);
    const ready = window.setTimeout(() => setSceneBeat({ index, beat: "ready" }), readyAt);
    return () => {
      window.clearTimeout(drift);
      window.clearTimeout(words);
      window.clearTimeout(ready);
    };
  }, [state.phase, state.index, reduced]);

  useEffect(() => {
    if (!(state.phase === "closing" && state.closing === "lit")) return;
    const onPointer = () => actions.current.onClosingDone();
    const timer = window.setTimeout(() => {
      window.addEventListener("pointerdown", onPointer);
    }, TOUR_BEAT.lift);
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
      if (beat !== "ready") return;
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
  }, [state.phase, stop, stopId, beat]);

  const veilOn = state.phase !== "idle" && state.phase !== "done";
  const speaking =
    (state.phase === "present" || state.phase === "ack") && (beat === "words" || beat === "ready");
  const holding = state.phase === "travel" && !covered;
  // The feather is what darkens the edges. Fading it out while the solid veil
  // is still arriving opens the room for a frame. Keep it up through the dim
  // and the route change; the reveal is what lets it show the subject again.
  const glowOn =
    (leavingPanel && !leaveLifting) ||
    (!finaleShown &&
      !leavingPanel &&
      (state.phase === "travel" ||
        state.phase === "settle" ||
        beat === "reveal" ||
        beat === "drift" ||
        speaking));
  const solid =
    finaleShown || state.phase === "closing"
      ? 0
      : state.phase === "arrival" || (holding && !keptRect)
        ? 0.9
        : (state.phase === "travel" && covered) || state.phase === "settle" || state.phase === "light"
          ? 1
          : 0;
  const fadeMs = reduced
    ? 180
    : leavingPanel || state.phase === "closing"
      ? TOUR_BEAT.lift
      : finaleShown
        ? TOUR_BEAT.reveal
        : covered
          ? TOUR_BEAT.dim
          : TOUR_BEAT.reveal;
  const focus = glowOn
    ? glowFor(state.phase === "present" || state.phase === "ack" ? (target.rect ?? keptRect) : keptRect)
    : null;
  const flame = useVisibleBox("[data-tour='mood-flame']", finaleShown);
  const desktopTarget = finaleShown ? flame : (target.rect ?? keptRect);
  const spoken =
    stop && stop.id === "contracts" && target.marker === "contracts-create" && stop.emptyBody
      ? stop.emptyBody
      : (stop?.body ?? "");
  const [panelHeight, setPanelHeight] = useState(RIBBON_ESTIMATE);
  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      const node = document.getElementById("tour-ribbon");
      if (!node || (!node.style.top && !node.style.bottom)) return;
      const next = Math.ceil(node.getBoundingClientRect().height);
      // Ignore a frame where the panel has not been placed yet and stretches
      // to the viewport. That number would pin every later stop in the wrong spot.
      if (next < 40 || next > window.innerHeight * 0.7) return;
      setPanelHeight((current) => (Math.abs(current - next) > 6 ? next : current));
    });
    return () => cancelAnimationFrame(frameId);
  }, [state.index, state.phase, spoken, frame.width, frame.height]);
  const showGuide = state.phase !== "closing" && state.phase !== "done" && state.phase !== "idle" && state.phase !== "light";
  const pose = buildPose({
    state,
    frame,
    target: target.rect,
    arrivalAnchor,
    waypoint,
    beat,
    tint: props.moodTint,
    reduced,
  });
  const ribbonPlace =
    (speaking || finaleShown || leavingPanel) && stop && frame.width > 0
      ? placeRibbon({
          stop: finaleShown ? "closing" : stop.id,
          phone: frame.phone,
          keyboard: frame.keyboard,
          target: frame.phone ? null : desktopTarget,
          anchor: null,
          viewport: { width: frame.width, height: frame.height },
          header: frame.header,
          tabbar: frame.tabbar,
          panelHeight,
        })
      : null;

  return (
    <>
      <AnimatePresence>
        {veilOn ? (
          <motion.div
            key="pool"
            className="pointer-events-none fixed inset-0 z-[70]"
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0.18 : TOUR_BEAT.lift / 1000, ease: TOUR_EASE }}
          >
            <LightPool solid={solid} glow={glowOn ? 1 : 0} focus={focus} fadeMs={fadeMs} />
          </motion.div>
        ) : null}
      </AnimatePresence>
      {showGuide && frame.width > 0 ? <GuideLantern pose={pose} /> : null}
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
            key={finaleShown ? "finale" : stop.id}
            stop={stop}
            index={state.index}
            body={spoken}
            place={ribbonPlace}
            ack={state.phase === "ack" ? state.ackLine : null}
            line={finaleShown ? TOUR_COPY.litLine : leavingPanel && leaveStage !== null ? TOUR_COPY.leftLine : null}
            done={finaleShown}
            solid={leavingPanel}
            lifting={finaleLifting || leaveLifting}
            dimCopy={leavingPanel && leaveStage === null}
            advance={finaleShown ? finaleAdvance || finaleLifting : leavingPanel ? false : beat === "ready"}
            onBack={() => {
              if (beat === "ready") props.onBack();
            }}
            onNext={() => {
              if (finaleShown) {
                props.onLightDone();
                return;
              }
              if (beat === "ready") props.onNext();
            }}
            onNotToday={() => {
              if (beat === "ready") props.onNotToday();
            }}
            onLeave={props.onLeave}
          />
        ) : null}
        {state.phase === "closing" && state.closing && state.closing !== "declined" && state.closing !== "lit" && !leavingPanel ? (
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

function gatheredColors(index: number): string[] {
  return TOUR_STOPS.slice(0, index + 1)
    .map((item) => item.mote)
    .filter((color): color is string => Boolean(color));
}

function useVisibleBox(selector: string, enabled: boolean): Rect | null {
  const [box, setBox] = useState<Rect | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    const read = () => {
      const node = visibleQuery(selector);
      setBox(node ? toRect(node.getBoundingClientRect()) : null);
    };
    frame = requestAnimationFrame(read);
    window.addEventListener("resize", read);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", read);
    };
  }, [selector, enabled]);
  return enabled ? box : null;
}

function buildPose(input: {
  state: TourState;
  frame: { width: number; height: number; header: number };
  target: Rect | null;
  arrivalAnchor: Rect | null;
  waypoint: { x: number; y: number } | null;
  beat: "dark" | "reveal" | "drift" | "words" | "ready";
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
  if (state.phase === "travel" || state.phase === "settle") {
    return {
      ...shared,
      x: center.x,
      y: center.y,
      travel: "wait",
      scale: 1,
      opacity: reduced ? 0 : 1,
    };
  }
  if (state.phase === "reflect") {
    // Stay put and fade. A move would park the orb in a corner of the reflection.
    return {
      ...shared,
      x: center.x,
      y: center.y,
      travel: "wait",
      scale: 1,
      opacity: 0,
      breathe: false,
      motes: [],
    };
  }
  if (state.phase === "light" || state.phase === "closing") {
    return { ...shared, x: center.x, y: center.y, travel: "fade", scale: 1, opacity: 0, breathe: false, motes: [] };
  }
  const lit = input.target ? lanternAnchor(input.target, tourStopId(input.state)) : center;
  const drifting = input.beat === "drift";
  return {
    ...shared,
    x: lit.x,
    y: lit.y,
    travel: reduced ? "fade" : drifting ? "arc" : "wait",
    scale: 1,
    opacity: 1,
  };
}
