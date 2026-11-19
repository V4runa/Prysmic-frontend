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
  readLocalSeen,
  readSignupFresh,
  readTourSeenAt,
  rememberTourSeen,
  type TourSeenValue,
} from "./tourSeen";
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

const QueryContext = createContext<(requested: boolean) => void>(() => {});

function TourQueryBridge() {
  const search = useSearchParams();
  const setRequested = useContext(QueryContext);
  const requested = search.get("tour") === "1";
  useEffect(() => {
    setRequested(requested);
  }, [requested, setRequested]);
  return null;
}

function TourProviderInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const identity = useSessionIdentity();
  const [state, dispatch] = useReducer(tourReducer, initialTourState);
  const [requested, setRequested] = useState(false);
  const [seenAt, setSeenAt] = useState<TourSeenValue>(undefined);
  const [userLoaded, setUserLoaded] = useState(false);
  const navigatingTo = useRef<string | null>(null);
  const saved = useRef(false);
  const autoOpened = useRef(false);

  const setQueryRequested = useCallback((next: boolean) => setRequested(next), []);

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

    if (state.phase !== "idle" && state.phase !== "done") return;

    const decision = decideTourStart({
      requested,
      userLoaded: userId == null ? false : userLoaded,
      seenAt: userLoaded ? seenAt : undefined,
      signupFresh: storage && userId != null ? readSignupFresh(storage, userId) : false,
      localSeen: storage && userId != null ? readLocalSeen(storage, userId) : false,
    });

    if (!decision.start) return;
    if (!requested && autoOpened.current) return;
    if (state.phase === "done" && !requested) return;

    if (!requested) autoOpened.current = true;
    dispatch({ type: "open" });

    if (requested) {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tour") === "1") {
        params.delete("tour");
        const next = params.toString();
        router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
      }
    }
  }, [identity.userId, userLoaded, seenAt, requested, state.phase, pathname, router]);

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
    if (routeMatches(pathname, stop.route)) {
      navigatingTo.current = null;
      const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 40 : 320;
      const timer = window.setTimeout(() => dispatch({ type: "arrived" }), delay);
      return () => window.clearTimeout(timer);
    }
    navigatingTo.current = stop.route;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => {
      if (navigatingTo.current !== stop.route) return;
      router.push(stop.route);
    }, reduced ? 150 : 420);
    return () => window.clearTimeout(timer);
  }, [state.phase, state.index, pathname, router]);

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
    const delay = state.closing === "declined" ? 450 : state.closing === "home" ? 7000 : 5000;
    const timer = window.setTimeout(() => dispatch({ type: "closing-done" }), delay);
    return () => window.clearTimeout(timer);
  }, [state.phase, state.closing]);

  useEffect(() => {
    if (state.phase !== "light") return;
    const timer = window.setTimeout(() => dispatch({ type: "light-done" }), 8000);
    return () => window.clearTimeout(timer);
  }, [state.phase]);

  useEffect(() => {
    if (state.phase !== "done") return;
    const heading = document.querySelector("main h1, main h2");
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

  const api = useMemo<TourApi>(
    () => ({
      overlay: tourOverlayActive(state),
      holdsMoodTimeline: tourHoldsMoodTimeline(state),
      litHref: state.phase === "travel" ? (TOUR_STOPS[state.index]?.navHref ?? null) : null,
      stopId: tourStopId(state),
      notifyTagCreated: () => dispatch({ type: "action", line: TOUR_COPY.tagAck }),
      notifyTaskCreated: () => dispatch({ type: "action", line: TOUR_COPY.taskAck }),
      notifyMoodPicked: () => dispatch({ type: "mood-picked" }),
      notifyMoodKept: (color) => dispatch({ type: "mood-kept", color }),
    }),
    [state]
  );

  const room = useMoodRoom();
  const moodTint = room.accent ? { r: room.accent.r, g: room.accent.g, b: room.accent.b } : null;

  return (
    <QueryContext.Provider value={setQueryRequested}>
      <TourContext.Provider value={api}>
        {children}
        {tourOverlayActive(state) ? (
          <TourStage
            state={state}
            name={identity.username}
            emailNote={readSignupEmailNote()}
            moodTint={moodTint}
            onBegin={() => dispatch({ type: "begin" })}
            onDecline={() => dispatch({ type: "decline" })}
            onLeave={() => dispatch({ type: "leave" })}
            onNext={() => dispatch({ type: "next" })}
            onBack={onBack}
            onNotToday={() => dispatch({ type: "not-today" })}
            onTargetReady={() => dispatch({ type: "target-ready" })}
            onLightDone={() => dispatch({ type: "light-done" })}
            onClosingDone={() => dispatch({ type: "closing-done" })}
          />
        ) : null}
      </TourContext.Provider>
    </QueryContext.Provider>
  );
}
