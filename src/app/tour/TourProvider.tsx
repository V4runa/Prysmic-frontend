"use client";

import { Suspense, createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "../hooks/useApi";
import { useSessionIdentity } from "../hooks/useAuth";
import { useMoodRoom } from "../hooks/useMoodRoom";
import { readSignupEmailNote } from "../lib/storedSession";
import { saveTourSeen } from "./tourClient";
import TourStage from "./TourStage";
import {
  initialTourState,
  tourHoldsMoodTimeline,
  tourOverlayActive,
  tourReducer,
  tourStopId,
} from "./tourMachine";
import {
  decideTourStart,
  forgetLocalSeen,
  nextChromeQuiet,
  QUIET_CHROME_MEMORY,
  readLocalSeen,
  readSignupFresh,
  readTourSeenAt,
  rememberTourSeen,
  takeTourRequest,
  tourQuietsChrome,
  type ChromeQuietMemory,
  type TourSeenValue,
} from "./tourSeen";
import { departDelay, TOUR_BEAT } from "./tourBeats";
import { TOUR_COPY, TOUR_STOPS, routeMatches, stopIndexForPath, type TourStopId } from "./tourStops";

export type TourApi = {
  /** The welcome, the walk, or a closing line is on screen. */
  overlay: boolean;
  /** Moods must not mount its timeline, so the flame stays out of the tour. */
  holdsMoodTimeline: boolean;
  /** Nav href to brighten while the guide is in flight. */
  litHref: string | null;
  /** The room currently being walked, when the tour is underway. */
  stopId: TourStopId | null;
  /**
   * Hide the email banner and Updates highlight cards: before a fresh tour
   * starts, during the walk, and on the landing screen until the route changes.
   */
  quietChrome: boolean;
  notifyTagCreated: () => void;
  notifyTaskCreated: () => void;
  notifyMoodPicked: () => void;
  notifyMoodKept: (color: string | null) => void;
};

const INACTIVE: TourApi = {
  overlay: false,
  holdsMoodTimeline: false,
  litHref: null,
  stopId: null,
  quietChrome: false,
  notifyTagCreated: () => {},
  notifyTaskCreated: () => {},
  notifyMoodPicked: () => {},
  notifyMoodKept: () => {},
};

const TourContext = createContext<TourApi>(INACTIVE);

export function useTour(): TourApi {
  return useContext(TourContext);
}

export default function TourProvider({ children }: { children: React.ReactNode }) {
  return (
    <TourProviderInner>
      <Suspense fallback={null}>
        <TourQueryBridge />
      </Suspense>
      {children}
    </TourProviderInner>
  );
}

const QueryContext = createContext<(event: { rising: boolean }) => void>(() => {});

function TourQueryBridge() {
  const search = useSearchParams();
  const report = useContext(QueryContext);
  const tourOn = search.get("tour") === "1";
  const previous = useRef(false);
  useEffect(() => {
    const rising = tourOn && !previous.current;
    previous.current = tourOn;
    if (rising) report({ rising: true });
  }, [tourOn, report]);
  return null;
}

function stripTourParam(router: { replace: (href: string, options?: { scroll?: boolean }) => void }, pathname: string) {
  const params = new URLSearchParams(window.location.search);
  if (params.get("tour") !== "1") return;
  params.delete("tour");
  const query = params.toString();
  const next = query ? `${pathname}?${query}` : pathname;
  window.history.replaceState(window.history.state, "", next);
  router.replace(next, { scroll: false });
}

function TourProviderInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const identity = useSessionIdentity();
  const [state, dispatch] = useReducer(tourReducer, initialTourState);
  const [requestSerial, setRequestSerial] = useState(0);
  const [seenAt, setSeenAt] = useState<TourSeenValue>(undefined);
  const [userLoaded, setUserLoaded] = useState(false);
  const navigatingTo = useRef<string | null>(null);
  const saved = useRef(false);
  const autoOpened = useRef(false);
  const handledRequest = useRef(0);
  const [landing, setLanding] = useState<ChromeQuietMemory>(QUIET_CHROME_MEMORY);

  const onTourQuery = useCallback((event: { rising: boolean }) => {
    if (event.rising) setRequestSerial((value) => value + 1);
  }, []);

  useEffect(() => {
    const userId = identity.userId;
    if (userId == null) return;
    let cancelled = false;
    apiFetch<unknown>("/users")
      .then((body) => {
        if (cancelled) return;
        setSeenAt(readTourSeenAt(body, userId));
        setUserLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setSeenAt(undefined);
        setUserLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [identity.userId]);

  useEffect(() => {
    const userId = identity.userId;
    let storage: Storage | null = null;
    try {
      storage = window.localStorage;
    } catch {
      storage = null;
    }

    if (userLoaded && storage && userId != null) {
      if (typeof seenAt === "string") rememberTourSeen(storage, userId, seenAt);
      else if (seenAt === null) forgetLocalSeen(storage, userId);
    }

    const phaseKind = state.phase === "idle" || state.phase === "done" ? state.phase : "active";
    const request = takeTourRequest({
      serial: requestSerial,
      handled: handledRequest.current,
      phase: phaseKind,
    });
    handledRequest.current = request.handled;
    if (request.start) {
      dispatch({ type: "open" });
      stripTourParam(router, pathname);
      return;
    }
    if (requestSerial > 0) stripTourParam(router, pathname);

    if (state.phase !== "idle" && state.phase !== "done") return;

    const decision = decideTourStart({
      requested: false,
      userLoaded: userId == null ? false : userLoaded,
      seenAt: userLoaded ? seenAt : undefined,
      signupFresh: storage && userId != null ? readSignupFresh(storage, userId) : false,
      localSeen: storage && userId != null ? readLocalSeen(storage, userId) : false,
    });

    if (!decision.start || autoOpened.current) return;
    if (state.phase === "done") return;
    autoOpened.current = true;
    dispatch({ type: "open" });
  }, [identity.userId, userLoaded, seenAt, requestSerial, state.phase, pathname, router]);

  useEffect(() => {
    if (state.phase !== "arrival") return;
    if (routeMatches(pathname, "/notes")) return;
    navigatingTo.current = "/notes";
    router.push("/notes");
  }, [state.phase, pathname, router]);

  useEffect(() => {
    if (state.phase !== "travel") return;
    const stop = TOUR_STOPS[state.index];
    if (!stop) return;
    let cancelled = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      if (routeMatches(window.location.pathname, stop.route)) {
        navigatingTo.current = null;
        dispatch({ type: "arrived" });
        return;
      }
      navigatingTo.current = stop.route;
      router.push(stop.route);
    }, departDelay(reduced));
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [state.phase, state.index, router]);

  useEffect(() => {
    if (state.phase !== "travel") return;
    if (!navigatingTo.current || !routeMatches(pathname, navigatingTo.current)) return;
    navigatingTo.current = null;
    dispatch({ type: "arrived" });
  }, [state.phase, pathname]);

  useEffect(() => {
    if (!tourOverlayActive(state)) return;
    const landed = stopIndexForPath(pathname);
    if (navigatingTo.current && routeMatches(pathname, navigatingTo.current)) return;

    if (state.phase === "arrival") return;

    if (state.phase === "travel") {
      if (landed === state.index) return;
      const origin = state.index > 0 ? TOUR_STOPS[state.index - 1]?.route : "/notes";
      if (origin && routeMatches(pathname, origin)) return;
      if (landed >= 0) dispatch({ type: "align", index: landed });
      else if (!navigatingTo.current) dispatch({ type: "leave" });
      return;
    }

    if (state.phase === "present" || state.phase === "ack" || state.phase === "settle") {
      if (landed === state.index) return;
      if (landed >= 0) dispatch({ type: "align", index: landed });
      else dispatch({ type: "leave" });
      return;
    }

    if (
      state.phase === "reflect" ||
      state.phase === "light" ||
      (state.phase === "closing" && state.closing === "home")
    ) {
      if (!routeMatches(pathname, "/moods")) dispatch({ type: "leave" });
    }
  }, [pathname, state]);

  useEffect(() => {
    if (!state.persistSeen) {
      saved.current = false;
      return;
    }
    if (saved.current) return;
    saved.current = true;
    void saveTourSeen(identity.userId);
  }, [state.persistSeen, identity.userId]);

  useEffect(() => {
    if (state.phase !== "ack") return;
    const timer = window.setTimeout(() => dispatch({ type: "ack-done" }), 1400);
    return () => window.clearTimeout(timer);
  }, [state.phase, state.index, state.ackLine]);

  useEffect(() => {
    if (state.phase !== "closing") return;
    const delay =
      state.closing === "home" || state.closing === "lit"
        ? TOUR_BEAT.lift + 700
        : state.closing === "left"
          ? TOUR_BEAT.wordsOut + TOUR_BEAT.wordsIn + TOUR_BEAT.lift
          : TOUR_BEAT.lift + 200;
    const timer = window.setTimeout(() => dispatch({ type: "closing-done" }), delay);
    return () => window.clearTimeout(timer);
  }, [state.phase, state.closing]);

  useEffect(() => {
    if (state.phase !== "done") return;
    const heading =
      document.querySelector("main [data-tour-heading]") ||
      document.querySelector("main h1, main h2") ||
      document.querySelector("main");
    if (!(heading instanceof HTMLElement)) return;
    if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }, [state.phase]);

  const onBack = useCallback(() => {
    if (state.phase !== "present" && state.phase !== "ack") return;
    if (state.index <= 0) {
      dispatch({ type: "back" });
      return;
    }
    const pathAtBack = pathname;
    router.back();
    window.setTimeout(() => {
      if (window.location.pathname === pathAtBack) dispatch({ type: "back" });
    }, 280);
  }, [pathname, router, state.index, state.phase]);

  const phaseKind = state.phase === "idle" || state.phase === "done" ? state.phase : "active";
  const nextLanding = nextChromeQuiet(landing, phaseKind, pathname);
  if (nextLanding.landingPath !== landing.landingPath || nextLanding.released !== landing.released) {
    setLanding(nextLanding);
  }
  const quietChrome = tourQuietsChrome({
    seenAt,
    userLoaded: identity.userId == null ? true : userLoaded,
    phase: phaseKind,
    pathname,
    landing: nextLanding,
  });

  const api = useMemo<TourApi>(
    () => ({
      overlay: tourOverlayActive(state),
      holdsMoodTimeline: tourHoldsMoodTimeline(state),
      litHref: state.phase === "travel" ? (TOUR_STOPS[state.index]?.navHref ?? null) : null,
      stopId: tourStopId(state),
      quietChrome,
      notifyTagCreated: () => dispatch({ type: "action", line: TOUR_COPY.tagAck }),
      notifyTaskCreated: () => dispatch({ type: "action", line: TOUR_COPY.taskAck }),
      notifyMoodPicked: () => dispatch({ type: "mood-picked" }),
      notifyMoodKept: (color) => dispatch({ type: "mood-kept", color }),
    }),
    [state, quietChrome]
  );

  const room = useMoodRoom();
  const moodTint = room.accent ? { r: room.accent.r, g: room.accent.g, b: room.accent.b } : null;

  useEffect(() => {
    if (!room.token) return;
    if (state.phase !== "present" && state.phase !== "settle") return;
    if (tourStopId(state) !== "moods") return;
    dispatch({ type: "mood-already", color: room.token });
  }, [room.token, state]);

  return (
    <QueryContext.Provider value={onTourQuery}>
      <TourContext.Provider value={api}>
        {children}
        {tourOverlayActive(state) ? (
          <TourStage
            state={state}
            name={identity.username}
            emailNote={readSignupEmailNote()}
            moodTint={moodTint}
            moodToken={room.token}
            onBegin={() => dispatch({ type: "begin" })}
            onDecline={() => dispatch({ type: "decline" })}
            onLeave={() => dispatch({ type: "leave" })}
            onNext={() => dispatch({ type: "next" })}
            onBack={onBack}
            onNotToday={() => dispatch({ type: "not-today" })}
            onTargetReady={() => dispatch({ type: "target-ready", todayMood: room.token })}
            onLightDone={() => dispatch({ type: "light-done" })}
            onClosingDone={() => dispatch({ type: "closing-done" })}
          />
        ) : null}
      </TourContext.Provider>
    </QueryContext.Provider>
  );
}
