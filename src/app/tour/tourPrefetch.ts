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
  return [previous, next].filter((route): route is string => Boolean(route) && route !== TOUR_STEPS[index]?.route);
}

export function prefetchTourRoute(queryClient: QueryClient, route: string, userId: number | null): void {
  const habitDay = logicalToday();
  const calendarDay = localToday();
  if (route === "/notes" && userId != null) {
    void queryClient.prefetchQuery({
      queryKey: ["notes", userId, "active"],
      queryFn: () => apiFetch(`/notes/user/${userId}`),
    });
    void queryClient.prefetchQuery({
      queryKey: ["tags"],
      queryFn: () => apiFetch("/tags"),
    });
  } else if (route === "/tasks") {
    void queryClient.prefetchQuery({
      queryKey: ["tasks"],
      queryFn: () => apiFetch("/tasks"),
    });
  } else if (route === "/habits") {
    void queryClient.prefetchQuery({
      queryKey: ["habits"],
      queryFn: () => apiFetch(`/habits?today=${habitDay}`),
    });
  } else if (route === "/calendar") {
    const range = monthGridRange(calendarDay);
    void queryClient.prefetchQuery({
      queryKey: ["calendar", range.from, range.to],
      queryFn: () => apiFetch(`/calendar?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`),
    });
  } else if (route === "/moods") {
    void queryClient.prefetchQuery({
      queryKey: ["moods"],
      queryFn: () => apiFetch("/moods"),
    });
    void queryClient.prefetchQuery({
      queryKey: ["mood-options"],
      queryFn: () => apiFetch("/mood-options"),
    });
  }
}
