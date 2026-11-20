"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { TOUR_EASE } from "./tourBeats";

export type GlowFocus = {
  x: number;
  y: number;
  rx: number;
  ry: number;
};

/**
 * A soft dim, with a feathered radial warmth on the subject.
 * No cut-out, no ring, no blur filter. The page underneath stays clickable.
 */
export default function LightPool({
  solid,
  glow,
  focus,
  fadeMs,
}: {
  /** Near-dark veil, 0 to 1. Covers the room while a page settles. */
  solid: number;
  /** Feathered warmth, 0 to 1. */
  glow: number;
  focus: GlowFocus | null;
  fadeMs: number;
}) {
  const next = focus
    ? `radial-gradient(ellipse ${focus.rx}px ${focus.ry}px at ${focus.x}px ${focus.y}px, rgba(6,7,10,0) 0%, rgba(6,7,10,0.05) 46%, rgba(6,7,10,0.55) 72%, rgba(6,7,10,0.84) 100%)`
    : null;
  // Keep the last dim painted while its opacity eases out. Clearing the
  // gradient in the same frame makes the room snap bright even though the
  // opacity number is still falling.
  const [painted, setPainted] = useState(next ?? "rgba(6,7,10,0)");
  if (next && next !== painted) setPainted(next);
  const warm = next ?? painted;
  const ease = TOUR_EASE;

  return (
    <div className="pointer-events-none fixed inset-0 z-[70]" aria-hidden="true">
      <motion.div
        className="absolute inset-0"
        initial={false}
        animate={{ opacity: solid }}
        transition={{ duration: fadeMs / 1000, ease }}
        style={{ background: "rgba(6,7,10,0.94)" }}
      />
      <motion.div
        className="absolute inset-0"
        initial={false}
        animate={{ opacity: glow }}
        transition={{ duration: fadeMs / 1000, ease }}
        style={{ background: warm }}
      />
    </div>
  );
}
