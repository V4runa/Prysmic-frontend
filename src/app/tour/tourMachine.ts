/**
 * Welcome, five steps, then a close card.
 * Skip and Escape land on the close card. Done is what marks the tour seen.
 * No timed advances and no branches for creating or logging.
 */

import { TOUR_STEPS } from "./tourStops";

export type TourPhase = "idle" | "welcome" | "step" | "close" | "done";

export type TourState = {
  phase: TourPhase;
  /** Index into TOUR_STEPS while phase is "step". Otherwise -1. */
  index: number;
  /** True once Done should be stored as tourSeenAt. */
  persistSeen: boolean;
};

export const initialTourState: TourState = {
  phase: "idle",
  index: -1,
  persistSeen: false,
};

export type TourEvent =
  | { type: "open" }
  | { type: "start" }
  | { type: "next" }
  | { type: "back" }
  | { type: "skip" }
  | { type: "done" };

const LAST = TOUR_STEPS.length - 1;

export function tourReducer(state: TourState, event: TourEvent): TourState {
  switch (event.type) {
    case "open":
      if (state.phase !== "idle" && state.phase !== "done") return state;
      return { phase: "welcome", index: -1, persistSeen: false };

    case "start":
      if (state.phase !== "welcome") return state;
      return { phase: "step", index: 0, persistSeen: false };

    case "next": {
      if (state.phase !== "step") return state;
      if (state.index >= LAST) return { phase: "close", index: -1, persistSeen: false };
      return { phase: "step", index: state.index + 1, persistSeen: false };
    }

    case "back": {
      if (state.phase !== "step") return state;
      if (state.index <= 0) return { phase: "welcome", index: -1, persistSeen: false };
      return { phase: "step", index: state.index - 1, persistSeen: false };
    }

    case "skip":
      if (state.phase !== "welcome" && state.phase !== "step") return state;
      return { phase: "close", index: -1, persistSeen: false };

    case "done":
      if (state.phase !== "close") return state;
      return { phase: "done", index: -1, persistSeen: true };

    default:
      return state;
  }
}

/** Welcome, a step, or the close card is on screen. */
export function tourIsOpen(state: TourState): boolean {
  return state.phase !== "idle" && state.phase !== "done";
}
