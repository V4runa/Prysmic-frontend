"use client";

import { Suspense, createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "../hooks/useApi";
import { useSessionIdentity } from "../hooks/useAuth";
import { saveTourSeen } from "./tourClient";
import TourCard from "./TourCard";
import { initialTourState, tourIsOpen, tourReducer } from "./tourMachine";
import { TOUR_ENABLED } from "./tourFlag";
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
import { tourRouteFor } from "./tourStops";

export type TourApi = {
  /** Welcome, a step, or the close card is on screen. */
  overlay: boolean;
  /**
   * Hide the email banner and Updates highlight cards while the tour is up,
   * and on the Notes landing until the route changes.
   */
  quietChrome: boolean;
  /** The Updates dot stays hidden for the whole time the tour is open. */
  suppressUpdatesDot: boolean;
};

const INACTIVE: TourApi = {
  overlay: false,
  quietChrome: false,
  suppressUpdatesDot: false,
};

const TourContext = createContext<TourApi>(INACTIVE);

export function useTour(): TourApi {
  return useContext(TourContext);
}

export default function TourProvider({ children }: { children: React.ReactNode }) {
  if (!TOUR_ENABLED) return children;
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

    if (phaseKind !== "idle") return;

    const decision = decideTourStart({
      requested: false,
      userLoaded: userId == null ? false : userLoaded,
      seenAt: userLoaded ? seenAt : undefined,
      signupFresh: storage && userId != null ? readSignupFresh(storage, userId) : false,
      localSeen: storage && userId != null ? readLocalSeen(storage, userId) : false,
    });

    if (!decision.start || autoOpened.current) return;
    autoOpened.current = true;
    dispatch({ type: "open" });
  }, [identity.userId, userLoaded, seenAt, requestSerial, state.phase, pathname, router]);

  useEffect(() => {
    if (state.phase === "idle") return;
    const route =
      state.phase === "done" ? "/notes" : tourRouteFor(state.phase, state.index);
    if (pathname === route) return;
    router.push(route);
  }, [state.phase, state.index, pathname, router]);

  useEffect(() => {
    if (!state.persistSeen) {
      saved.current = false;
      return;
    }
    if (saved.current || identity.userId == null) return;
    saved.current = true;
    void saveTourSeen(identity.userId);
  }, [state.persistSeen, identity.userId]);

  useEffect(() => {
    if (state.phase !== "done") return;
    const heading = document.querySelector("main h1, main h2");
    if (!(heading instanceof HTMLElement)) return;
    if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }, [state.phase]);

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
  const open = tourIsOpen(state);

  const api = useMemo<TourApi>(
    () => ({
      overlay: open,
      quietChrome,
      suppressUpdatesDot: open,
    }),
    [open, quietChrome]
  );

  return (
    <QueryContext.Provider value={onTourQuery}>
      <TourContext.Provider value={api}>
        {children}
        {open ? (
          <TourCard
            phase={state.phase === "welcome" || state.phase === "step" || state.phase === "close" ? state.phase : "welcome"}
            index={state.index}
            pathname={pathname}
            onStart={() => dispatch({ type: "start" })}
            onNext={() => dispatch({ type: "next" })}
            onBack={() => dispatch({ type: "back" })}
            onSkip={() => dispatch({ type: "skip" })}
            onDone={() => dispatch({ type: "done" })}
          />
        ) : null}
      </TourContext.Provider>
    </QueryContext.Provider>
  );
}
