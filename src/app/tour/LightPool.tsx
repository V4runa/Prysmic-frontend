"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { TOUR_EASE } from "./tourBeats";
import { TOUR_REST_DIM } from "./tourStops";
import type { GlowFocus } from "./tourLayout";

export type { GlowFocus };

/**
 * A soft dim, with a feathered warmth shaped like the subject.
 * No cut-out, no ring, no blur filter on the page. The page underneath stays clickable.
 * The route-change veil is the solid layer and stays fully dark on its own.
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
  // Keep the last halo painted while its opacity eases out. Clearing the
  // shape in the same frame makes the room snap bright.
  const [painted, setPainted] = useState<GlowFocus | null>(focus);
  if (focus && focus !== painted) setPainted(focus);
  const shown = focus ?? painted;
  const ease = TOUR_EASE;
  const veil = `rgba(6,7,10,${TOUR_REST_DIM})`;

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
      >
        {shown ? <ShapeGlow focus={shown} veil={veil} /> : <div className="absolute inset-0" style={{ background: veil }} />}
      </motion.div>
    </div>
  );
}

function ShapeGlow({ focus, veil }: { focus: GlowFocus; veil: string }) {
  const blur = Math.max(8, focus.feather / 2);
  return (
    <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <filter id="tour-light-feather" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation={blur} />
        </filter>
        <mask id="tour-light-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
          <rect x="0" y="0" width="100%" height="100%" fill="white" />
          <rect
            x={focus.x}
            y={focus.y}
            width={focus.width}
            height={focus.height}
            rx={focus.radius}
            ry={focus.radius}
            fill="black"
            filter="url(#tour-light-feather)"
          />
        </mask>
      </defs>
      <rect x="0" y="0" width="100%" height="100%" fill={veil} mask="url(#tour-light-mask)" />
    </svg>
  );
}
