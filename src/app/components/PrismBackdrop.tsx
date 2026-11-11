"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";

/**
 * App-wide prism atmosphere. An ancient prism suspended deep in the abyss —
 * faded but present, slowly breathing (opacity + saturation + hue shimmer + a
 * gentle scale drift) over a soft aura bloom, with motes of the Prysmic
 * spectrum drifting through the dark.
 *
 * Depth is built from two mote layers: a dense field BEHIND the UI (-z-10) and
 * a sparse, blurrier field IN FRONT of the UI (z-20, pointer-events-none, below
 * nav/modals) so particles occasionally cross ahead of content — a 3D space
 * with the glass panels floating in between. Rendered once at the root so the
 * whole thing is continuous across every navigation.
 */

// Deterministic pseudo-random so server and client render identical particles
// (no hydration mismatch). Same input -> same output.
const seededRandom = (n: number) => {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
};

// The Prysmic spectrum — the same hues that surface across the app. Weighted
// cool so cyan/ice lead and violet/rose/amber/mint are accents.
const PARTICLE_COLORS = [
  "#67e8f9", // cyan
  "#a5f3fc", // ice
  "#67e8f9", // cyan (keep cool dominant)
  "#a78bfa", // violet
  "#f9a8d4", // rose
  "#fcd34d", // amber
  "#6ee7b7", // mint
];

type Mote = {
  left: string;
  top: string;
  size: number;
  duration: number;
  delay: number;
  drift: number;
  sway: number;
  peak: number;
  color: string;
};

/** Build a deterministic set of motes. `front` motes are larger, slower, rarer
 *  and more translucent so they read as close, out-of-focus foreground dust. */
function makeMotes(count: number, seed: number, front: boolean): Mote[] {
  return Array.from({ length: count }, (_, i) => {
    const n = seed + i;
    const rx = seededRandom(n + 1);
    const ry = seededRandom(n + 101);
    const rs = seededRandom(n + 201);
    const rd = seededRandom(n + 301);
    const rc = seededRandom(n + 401);
    const rp = seededRandom(n + 501);
    // In the background field every 6th mote is a brighter "close" fleck.
    const bright = !front && i % 6 === 0;
    const size = front
      ? 3.5 + rs * 4
      : bright
        ? 2.6 + rs * 2.8
        : 1 + rs * 1.8;
    return {
      left: `${(rx * 100).toFixed(2)}%`,
      top: `${(ry * 100).toFixed(2)}%`,
      size,
      duration: (front ? 14 : bright ? 9 : 6) + rd * (front ? 12 : 10),
      delay: rx * (front ? 14 : 9),
      drift: (front ? 40 : bright ? 26 : 14) + ry * (front ? 50 : 34),
      sway: (rp - 0.5) * (front ? 40 : bright ? 26 : 14),
      // Foreground stays faint so it never obscures content.
      peak: front ? 0.14 + rp * 0.18 : (bright ? 0.55 : 0.35) + rp * 0.3,
      color: PARTICLE_COLORS[Math.floor(rc * PARTICLE_COLORS.length)],
    };
  });
}

function MoteField({
  motes,
  front,
  reduce,
}: {
  motes: Mote[];
  front: boolean;
  reduce: boolean | null;
}) {
  return (
    <>
      {motes.map((p, i) => (
        <motion.span
          key={i}
          className={`absolute rounded-full ${front ? "blur-[1.5px]" : "blur-[0.5px]"}`}
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 ${(p.size * (front ? 4 : 3)).toFixed(1)}px ${p.color}`,
          }}
          initial={{ opacity: reduce ? p.peak * 0.5 : 0, x: 0, y: 0 }}
          animate={
            reduce
              ? { opacity: p.peak * 0.5 }
              : { opacity: [0, p.peak, 0], x: [0, p.sway, 0], y: -p.drift }
          }
          transition={
            reduce
              ? undefined
              : {
                  duration: p.duration,
                  delay: p.delay,
                  repeat: Infinity,
                  ease: "easeInOut",
                }
          }
        />
      ))}
    </>
  );
}

export default function PrismBackdrop() {
  const reduce = useReducedMotion();
  const backMotes = useMemo(() => makeMotes(42, 0, false), []);
  const frontMotes = useMemo(() => makeMotes(9, 900, true), []);

  return (
    <>
      {/* BACK layer — the prism, aura, vignette and the dense mote field, all
          behind the UI. */}
      <div
        aria-hidden
        className="no-print pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#06070a]"
      >
        {/* Aura bloom — a soft cyan light the prism seems to emit, breathing
            just behind it to give the structure presence and depth. */}
        <motion.div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 55% at 50% 44%, rgba(103,232,249,0.16), rgba(103,232,249,0.05) 45%, transparent 70%)",
          }}
          initial={{ opacity: 0.4, scale: 1 }}
          animate={
            reduce
              ? { opacity: 0.45 }
              : { opacity: [0.28, 0.85, 0.28], scale: [1, 1.09, 1] }
          }
          transition={
            reduce
              ? undefined
              : { duration: 15, repeat: Infinity, ease: "easeInOut" }
          }
        />

        {/* The prism — faded far back but present, breathing (fade + saturation
            + a subtle spectrum hue shimmer + slow scale). */}
        <motion.div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/prism-hero.png')" }}
          initial={{
            opacity: 0.3,
            scale: 1,
            filter: "saturate(0.9) brightness(0.85) hue-rotate(0deg)",
          }}
          animate={
            reduce
              ? { opacity: 0.3 }
              : {
                  opacity: [0.22, 0.42, 0.22],
                  scale: [1, 1.06, 1],
                  filter: [
                    "saturate(0.6) brightness(0.75) hue-rotate(-10deg)",
                    "saturate(1.45) brightness(1.12) hue-rotate(10deg)",
                    "saturate(0.6) brightness(0.75) hue-rotate(-10deg)",
                  ],
                }
          }
          transition={
            reduce
              ? undefined
              : { duration: 15, repeat: Infinity, ease: "easeInOut" }
          }
        />

        {/* Vignette — sinks the edges into the abyss while leaving the center
            dim enough for the prism to read behind the glass card. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(6,7,10,0.34) 0%, rgba(6,7,10,0.72) 55%, rgba(6,7,10,0.95) 100%)",
          }}
        />

        <MoteField motes={backMotes} front={false} reduce={reduce} />
      </div>

      {/* FRONT layer — a sparse, blurry mote field that drifts ahead of the UI
          for depth. Above content but below nav (z-50) and modals; never
          interactive. */}
      <div
        aria-hidden
        className="no-print pointer-events-none fixed inset-0 z-20 overflow-hidden"
      >
        <MoteField motes={frontMotes} front reduce={reduce} />
      </div>
    </>
  );
}
