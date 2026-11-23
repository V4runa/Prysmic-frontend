"use client";

import { Suspense, createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../hooks/useApi";
import { readSessionClaims, useSessionIdentity } from "../hooks/useAuth";
import { saveTourSeen } from "./tourClient";
import TourCard from "./TourCard";
import { initialTourState, tourIsOpen, tourReducer } from "./tourMachine";
import { TOUR_ENABLED } from "./tourFlag";
import {
  decideTourStart,
  forgetLocalSeen,
  nextChromeQuiet,
  QUIET_CHROME_MEMORY,
  localSeenRecently,
  readLocalSeen,
  readLocalSeenAt,
  takeTourReplay,
  readSignupFresh,
  readTourSeenAt,
  rememberTourSeen,
  takeTourRequest,
  tourQuietsChrome,
  type ChromeQuietMemory,
  type TourSeenValue,
} from "./tourSeen";
import { adjacentTourRoutes, cancelIdleTourPrefetch, prefetchTourRoute } from "./tourPrefetch";
import { TOUR_FADE_MS, tourRouteFor } from "./tourStops";

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
  /** The email banner is already in the page, under the dim, as the tour ends. */
  revealBanner: boolean;
};

const INACTIVE: TourApi = {
  overlay: false,
  quietChrome: false,
  suppressUpdatesDot: false,
  revealBanner: false,
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
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const identity = useSessionIdentity();
  const [state, dispatch] = useReducer(tourReducer, initialTourState);
  const [requestSerial, setRequestSerial] = useState(0);
  const [seenAt, setSeenAt] = useState<TourSeenValue>(undefined);
  const [userLoaded, setUserLoaded] = useState(false);
  const saved = useRef(false);
  const autoOpened = useRef(false);
  const handledRequest = useRef(0);
  const ended = useRef(false);
  const appliedRoute = useRef("");
  const closePath = useRef("");
  const pendingPush = useRef(0);
  const notesHandoff = useRef(false);
  const [landing, setLanding] = useState<ChromeQuietMemory>(QUIET_CHROME_MEMORY);
  const [bannerLive, setBannerLive] = useState(false);
  const endHandoff = useRef(false);

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
        const server = readTourSeenAt(body, userId);
        setSeenAt((current) => {
          if (typeof server === "string") return server;
          if (typeof current === "string") return current;
          try {
            if (server === null && localSeenRecently(window.localStorage, userId)) {
              return readLocalSeenAt(window.localStorage, userId);
            }
          } catch {
            // Storage can be blocked. The server value still applies.
          }
          return server;
        });
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

    const recent =
      storage != null && userId != null ? localSeenRecently(storage, userId) : false;
    if (userLoaded && storage && userId != null) {
      if (typeof seenAt === "string") rememberTourSeen(storage, userId, seenAt);
      else if (seenAt === null && !recent && !saved.current) forgetLocalSeen(storage, userId);
    }

    const phaseKind = state.phase === "idle" || state.phase === "done" ? state.phase : "active";
    const request = takeTourRequest({
      serial: requestSerial,
      handled: handledRequest.current,
      phase: phaseKind,
    });
    handledRequest.current = request.handled;
    if (request.start) {
      const armed = takeTourReplay();
      if (ended.current && !armed) {
        stripTourParam(router, pathname);
        return;
      }
      ended.current = false;
      dispatch({ type: "open" });
      stripTourParam(router, pathname);
      return;
    }
    if (requestSerial > 0) stripTourParam(router, pathname);

    if (phaseKind !== "idle" || saved.current || recent) return;

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
    if (state.phase === "welcome") endHandoff.current = false;
    if (state.phase === "welcome" || state.phase === "step") setBannerLive(false);
  }, [state.phase]);

  useEffect(() => {
    if (state.phase === "idle") {
      notesHandoff.current = false;
      return;
    }
    if (state.phase === "done") {
      stripTourParam(router, pathname);
      // Done asks for Notes once. Later clicks, including Settings, must stay
      // on the page the person asked for.
      if (state.returnNotes && !notesHandoff.current) {
        notesHandoff.current = true;
        if (pathname !== "/notes") router.push("/notes");
      }
      return;
    }
    notesHandoff.current = false;
    const route = tourRouteFor(state.phase, state.index);
    const key = `${state.phase}:${state.index}:${route ?? "stay"}`;
    if (appliedRoute.current === key) {
      const leftStep = route != null && pathname !== route;
      const leftClose = route == null && closePath.current !== "" && pathname !== closePath.current;
      if ((leftStep || leftClose) && !endHandoff.current) {
        window.clearTimeout(pendingPush.current);
        ended.current = true;
        cancelIdleTourPrefetch(queryClient);
        dispatch({ type: "skip" });
      }
      return;
    }
    appliedRoute.current = key;
    if (route == null) closePath.current = pathname;
    if (route && pathname !== route) {
      // Let the old card start fading before the address changes, so the
      // previous step's text is not sitting at full opacity on the new page.
      window.clearTimeout(pendingPush.current);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      // The old card fades for TOUR_FADE_MS. Wait until that opacity is 0
      // before the address changes, so the previous title is never readable
      // on the next page.
      const wait = reduce ? 0 : TOUR_FADE_MS + 24;
      pendingPush.current = window.setTimeout(() => router.push(route), wait);
      return;
    }
    stripTourParam(router, pathname);
  }, [state.phase, state.index, state.returnNotes, pathname, router, queryClient]);

  const finishTour = useCallback(() => {
    ended.current = true;
    handledRequest.current = Math.max(handledRequest.current, requestSerial);
    stripTourParam(router, pathname);
    const userId = identity.userId ?? readSessionClaims()?.userId ?? null;
    if (!saved.current && userId != null) {
      saved.current = true;
      const at = saveTourSeen(userId);
      if (at) setSeenAt(at);
    }
  }, [identity.userId, pathname, router, requestSerial]);

  const markSeen = useCallback(() => {
    finishTour();
  }, [finishTour]);

  useEffect(() => {
    if (!state.persistSeen) {
      saved.current = false;
      return;
    }
    markSeen();
  }, [state.persistSeen, markSeen]);

  const phaseRef = useRef(state.phase);
  phaseRef.current = state.phase;
  useEffect(() => {
    if (state.phase !== "welcome" && state.phase !== "step" && state.phase !== "close") return;
    const userId = identity.userId ?? readSessionClaims()?.userId ?? null;
    for (const route of adjacentTourRoutes(state.phase, state.index)) {
      router.prefetch(route);
      prefetchTourRoute(queryClient, route, userId);
    }
    return () => {
      const next = phaseRef.current;
      if (next === "welcome" || next === "step" || next === "close") return;
      cancelIdleTourPrefetch(queryClient);
    };
  }, [state.phase, state.index, identity.userId, router, queryClient]);

  useEffect(() => {
    if (state.phase !== "done") return;
    const heading = document.querySelector("main h1, main h2");
    if (!(heading instanceof HTMLElement)) return;
    if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
    document.querySelectorAll<HTMLElement>("[data-tour-return]").forEach((node) => {
      if (node !== heading) node.removeAttribute("data-tour-return");
    });
    heading.setAttribute("data-tour-return", "");
    const focus = heading.focus.bind(heading) as (options?: FocusOptions & { focusVisible?: boolean }) => void;
    focus({ preventScroll: true, focusVisible: false });
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
  // The welcome card waits until Notes is the current page. Opening it from
  // Settings used to paint the card for a frame before the route changed.
  const welcomeParked = state.phase === "welcome" && pathname !== "/notes";

  const api = useMemo<TourApi>(
    () => ({
      overlay: open,
      quietChrome,
      suppressUpdatesDot: open,
      revealBanner: bannerLive,
    }),
    [open, quietChrome, bannerLive]
  );

  return (
    <QueryContext.Provider value={onTourQuery}>
      <TourContext.Provider value={api}>
        {children}
        {open && !welcomeParked ? (
          <TourCard
            phase={state.phase === "welcome" || state.phase === "step" || state.phase === "close" ? state.phase : "welcome"}
            index={state.index}
            pathname={pathname}
            onStart={() => dispatch({ type: "start" })}
            onNext={() => dispatch({ type: "next" })}
            onBack={() => dispatch({ type: "back" })}
            onSkip={() => {
              finishTour();
              setBannerLive(true);
              window.setTimeout(() => dispatch({ type: "skip" }), TOUR_FADE_MS + 80);
            }}
            onDone={() => {
              finishTour();
              endHandoff.current = true;
              setBannerLive(true);
              if (pathname !== "/notes") router.push("/notes");
              window.setTimeout(() => dispatch({ type: "done" }), TOUR_FADE_MS + 80);
            }}
          />
        ) : null}
      </TourContext.Provider>
    </QueryContext.Provider>
  );
}
