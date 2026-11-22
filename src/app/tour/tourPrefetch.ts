import type { QueryClient } from "@tanstack/react-query";
import { monthGridRange } from "../calendar/lib/calendarLib";
import { apiFetch } from "../hooks/useApi";
import { localToday, logicalToday } from "../lib/date";
import { TOUR_STEPS } from "./tourStops";

/**
 * Routes a person can reach with one Next or Back from the current step,
 * plus the data those pages read on first paint.
 */
export function adjacentTourRoutes(phase: "welcome" | "step" | "close", index: number): string[] {
  if (phase === "welcome") return ["/notes"];
  if (phase === "close") return ["/moods"];
  const next = TOUR_STEPS[index + 1]?.route;
  const previous = index <= 0 ? "/notes" : TOUR_STEPS[index - 1]?.route;
  const routes = [previous, next].filter((route): route is string => Boolean(route) && route !== TOUR_STEPS[index]?.route);
  // Moods has nothing to point at until its data arrives. Start that fetch
  // one step early so the card is not waiting on it.
  if (TOUR_STEPS[index]?.id === "contracts" && !routes.includes("/moods")) routes.push("/moods");
  return routes;
}

const PREFETCH_KEYS = [["notes"], ["tags"], ["tasks"], ["habits"], ["calendar"], ["moods"], ["mood-options"]] as const;

/** Drop tour prefetches nothing on screen is using, so a save is not stuck behind them. */
export function cancelIdleTourPrefetch(queryClient: QueryClient): void {
  for (const queryKey of PREFETCH_KEYS) {
    for (const query of queryClient.getQueryCache().findAll({ queryKey })) {
      if (query.getObserversCount() > 0) continue;
      void queryClient.cancelQueries({ queryKey: query.queryKey });
    }
  }
}

export function prefetchTourRoute(queryClient: QueryClient, route: string, userId: number | null): void {
  const habitDay = logicalToday();
  const calendarDay = localToday();
  if (route === "/notes" && userId != null) {
    void queryClient.prefetchQuery({
      queryKey: ["notes", userId, "active"],
      queryFn: ({ signal }) => apiFetch(`/notes/user/${userId}`, { signal }),
    });
    void queryClient.prefetchQuery({
      queryKey: ["tags"],
      queryFn: ({ signal }) => apiFetch("/tags", { signal }),
    });
  } else if (route === "/tasks") {
    void queryClient.prefetchQuery({
      queryKey: ["tasks"],
      queryFn: ({ signal }) => apiFetch("/tasks", { signal }),
    });
  } else if (route === "/habits") {
    void queryClient.prefetchQuery({
      queryKey: ["habits"],
      queryFn: ({ signal }) => apiFetch(`/habits?today=${habitDay}`, { signal }),
    });
  } else if (route === "/calendar") {
    const range = monthGridRange(calendarDay);
    void queryClient.prefetchQuery({
      queryKey: ["calendar", range.from, range.to],
      queryFn: ({ signal }) => apiFetch(`/calendar?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`, { signal }),
    });
  } else if (route === "/moods") {
    void queryClient.prefetchQuery({
      queryKey: ["moods"],
      queryFn: ({ signal }) => apiFetch("/moods", { signal }),
    });
    void queryClient.prefetchQuery({
      queryKey: ["mood-options"],
      queryFn: ({ signal }) => apiFetch("/mood-options", { signal }),
    });
  }
}
