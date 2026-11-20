/**
 * The tour as a pure reducer. Navigation, timers, and the DOM live outside it.
 *
 * idle → arrival → travel → settle → present
 *   present → ack → travel          (optional tag or task)
 *   present → reflect → light → closing → done   (a mood)
 *   present → closing → done        (Not today, Leave, or Esc)
 */

import { TOUR_STOPS, type TourStopId } from "./tourStops";

export type TourPhase =
  | "idle"
  | "arrival"
  | "travel"
  | "settle"
  | "present"
  | "ack"
  | "reflect"
  | "light"
  | "closing"
  | "done";

export type ClosingKind = "home" | "lit" | "left" | "not-today" | "declined";

export type TourState = {
  phase: TourPhase;
  /** -1 before the walk starts. Otherwise an index into TOUR_STOPS. */
  index: number;
  ackLine: string | null;
  closing: ClosingKind | null;
  /** Mood color token chosen in the finale, when there is one. */
  moodColor: string | null;
  /** True once this run should be stored as seen. */
  persistSeen: boolean;
  /** Today's mood was already logged, so the finale does not ask again. */
  alreadyLit: boolean;
  /**
   * Set when Not today is chosen. The walk stays on Moods until Done,
   * so the ending matches a logged mood instead of lifting itself.
   */
  finale: "skip" | null;
};

export const initialTourState: TourState = {
  phase: "idle",
  index: -1,
  ackLine: null,
  closing: null,
  moodColor: null,
  persistSeen: false,
  alreadyLit: false,
  finale: null,
};

export type TourEvent =
  | { type: "open" }
  | { type: "begin" }
  | { type: "decline" }
  | { type: "arrived" }
  | { type: "target-ready"; todayMood?: string | null }
  | { type: "mood-already"; color: string }
  | { type: "next" }
  | { type: "back" }
  | { type: "align"; index: number }
  | { type: "action"; line: string }
  | { type: "ack-done" }
  | { type: "mood-picked" }
  | { type: "mood-kept"; color: string | null }
  | { type: "not-today" }
  | { type: "finale-back" }
  | { type: "finale-done" }
  | { type: "leave" }
  | { type: "light-done" }
  | { type: "closing-done" };

const LAST = TOUR_STOPS.length - 1;

function travelTo(state: TourState, index: number): TourState {
  return { ...state, phase: "travel", index, ackLine: null };
}

function close(state: TourState, closing: ClosingKind): TourState {
  return { ...state, phase: "closing", closing, ackLine: null, persistSeen: true };
}

export function tourReducer(state: TourState, event: TourEvent): TourState {
  switch (event.type) {
    case "open":
      if (state.phase !== "idle" && state.phase !== "done") return state;
      return { ...initialTourState, phase: "arrival" };

    case "begin":
      if (state.phase !== "arrival") return state;
      return travelTo(state, 0);

    case "decline":
      if (state.phase !== "arrival") return state;
      return close(state, "declined");

    case "arrived":
      if (state.phase !== "travel") return state;
      return { ...state, phase: "settle" };

    case "target-ready": {
      if (state.phase !== "settle") return state;
      const stop = TOUR_STOPS[state.index];
      if (stop?.id === "moods" && event.todayMood) {
        return { ...state, phase: "light", moodColor: event.todayMood, alreadyLit: true, ackLine: null };
      }
      return { ...state, phase: "present" };
    }

    case "mood-already":
      if ((state.phase !== "present" && state.phase !== "settle") || !event.color) return state;
      if (TOUR_STOPS[state.index]?.id !== "moods") return state;
      return { ...state, phase: "light", moodColor: event.color, alreadyLit: true, ackLine: null };

    case "next": {
      if (state.phase !== "present" && state.phase !== "ack") return state;
      if (state.index < 0 || state.index >= LAST) return state;
      return travelTo(state, state.index + 1);
    }

    case "back": {
      if (state.phase !== "present" && state.phase !== "ack") return state;
      if (state.index <= 0) return { ...initialTourState, phase: "arrival" };
      return travelTo(state, state.index - 1);
    }

    case "align": {
      if (event.index < 0 || event.index > LAST) return state;
      if (
        state.phase !== "travel" &&
        state.phase !== "settle" &&
        state.phase !== "present" &&
        state.phase !== "ack"
      ) {
        return state;
      }
      if (state.phase === "settle" && state.index === event.index) return state;
      return { ...state, phase: "settle", index: event.index, ackLine: null };
    }

    case "action": {
      if (state.phase !== "present") return state;
      const stop = TOUR_STOPS[state.index];
      if (!stop?.ack || event.line !== stop.ack) return state;
      return { ...state, phase: "ack", ackLine: event.line };
    }

    case "ack-done":
      if (state.phase !== "ack") return state;
      if (state.index >= LAST) return { ...state, phase: "present" };
      return travelTo(state, state.index + 1);

    case "mood-picked":
      if (state.phase !== "present" || state.finale === "skip") return state;
      if (TOUR_STOPS[state.index]?.id !== "moods") return state;
      return { ...state, phase: "reflect", ackLine: null };

    case "mood-kept":
      if (state.phase !== "reflect") return state;
      return { ...state, phase: "light", moodColor: event.color };

    case "not-today":
      if (state.phase !== "present" || state.finale === "skip") return state;
      if (TOUR_STOPS[state.index]?.id !== "moods") return state;
      return { ...state, finale: "skip", ackLine: null };

    case "finale-back":
      if (state.phase !== "present" || state.finale !== "skip") return state;
      return { ...state, finale: null };

    case "finale-done":
      if (state.phase !== "present" || state.finale !== "skip") return state;
      return close(state, "not-today");

    case "leave":
      if (state.phase === "idle" || state.phase === "done") return state;
      if (state.phase === "closing") return { ...state, phase: "done" };
      return close(state, "left");

    case "light-done":
      if (state.phase !== "light") return state;
      return close(state, state.alreadyLit ? "lit" : "home");

    case "closing-done":
      if (state.phase !== "closing") return state;
      return { ...state, phase: "done" };

    default:
      return state;
  }
}

export function tourStopId(state: TourState): TourStopId | null {
  return TOUR_STOPS[state.index]?.id ?? null;
}

/** The dimming layer and the guide are on screen. Closing copy can outlive them. */
export function tourOverlayActive(state: TourState): boolean {
  return state.phase !== "idle" && state.phase !== "done";
}

/**
 * The flame stays unmounted while the tour is still asking.
 * The finale lets it mount, untouched, before the last line.
 */
export function tourHoldsMoodTimeline(state: TourState): boolean {
  if (state.phase === "idle" || state.phase === "done") return false;
  if (state.phase === "light") return false;
  if (state.phase === "closing" && (state.closing === "home" || state.closing === "lit")) return false;
  return true;
}

/** Motes gathered from stops already presented, in walk order. */
export function gatheredMotes(state: TourState): string[] {
  if (state.index < 0) return [];
  const through =
    state.phase === "travel" || state.phase === "settle" ? state.index : state.index + 1;
  return TOUR_STOPS.slice(0, through)
    .map((stop) => stop.mote)
    .filter((color): color is string => Boolean(color));
}
