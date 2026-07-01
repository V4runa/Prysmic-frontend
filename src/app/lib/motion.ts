import type { Transition } from "framer-motion";

/**
 * Shared motion language for Prysmic. Centralizing these keeps every
 * interaction feeling like it belongs to the same calm-but-alive system.
 */

// Quick, confident response for taps/hovers on controls.
export const springSnappy: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 26,
};

// Gentler settle for larger surfaces (cards, panels, layout shifts).
export const springSoft: Transition = {
  type: "spring",
  stiffness: 210,
  damping: 24,
};

// A touch of overshoot for celebratory moments (completions, check-ins).
export const springBouncy: Transition = {
  type: "spring",
  stiffness: 500,
  damping: 14,
};

/**
 * Spread onto a `motion` element to give it a consistent tactile feel:
 * lifts slightly on hover, presses in on tap. Kept gentle so hovers settle
 * rather than snap.
 */
export const tactile = {
  whileHover: { scale: 1.03 },
  whileTap: { scale: 0.97 },
  transition: springSoft,
} as const;

/** Subtler variant for small icon buttons where a big scale looks jumpy. */
export const tactileSubtle = {
  whileHover: { scale: 1.08 },
  whileTap: { scale: 0.92 },
  transition: springSoft,
} as const;

/**
 * For full-width rows/cards that live inside a clipping scroll container:
 * a hover scale would push past the container edge and shave the borders, so
 * these only press in on tap and rely on a background/colour change for hover.
 */
export const tactileRow = {
  whileTap: { scale: 0.995 },
  transition: springSoft,
} as const;
