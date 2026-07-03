"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

/**
 * Shared prism atmosphere for the public (pre-auth) routes: landing, login,
 * signup. An ancient prism suspended deep in the abyss — faded but present,
 * slowly breathing (opacity + saturation + hue shimmer + a gentle scale drift)
 * over a soft aura bloom, with motes of the Prysmic spectrum drifting and
 * swaying upward through the dark. Fixed full-bleed layer behind page content.
 */

// Deterministic pseudo-random so server and client render identical particles
// (no hydration mismatch). Same input -> same output.
const seededRandom = (n: number) => {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
};

const PARTICLE_COUNT = 42;

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

export default function PrismBackdrop() {
  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => {
        const rx = seededRandom(i + 1);
        const ry = seededRandom(i + 101);
        const rs = seededRandom(i + 201);
        const rd = seededRandom(i + 301);
        const rc = seededRandom(i + 401);
        const rp = seededRandom(i + 501);
        // Every 6th mote is a larger, brighter "close" particle; the rest are
        // small distant flecks — a cheap sense of depth.
        const bright = i % 6 === 0;
        const size = bright ? 2.6 + rs * 2.8 : 1 + rs * 1.8;
        return {
          left: `${(rx * 100).toFixed(2)}%`,
          top: `${(ry * 100).toFixed(2)}%`,
          size,
          duration: (bright ? 9 : 6) + rd * 10,
          delay: rx * 9,
          drift: (bright ? 26 : 14) + ry * 34,
          sway: (rp - 0.5) * (bright ? 26 : 14),
          peak: (bright ? 0.55 : 0.35) + rp * 0.3,
          color: PARTICLE_COLORS[Math.floor(rc * PARTICLE_COLORS.length)],
        };
      }),
    []
  );

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#06070a]"
    >
      {/* Aura bloom — a soft cyan light the prism seems to emit, breathing just
          behind it to give the structure presence and depth. */}
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 55% at 50% 44%, rgba(103,232,249,0.16), rgba(103,232,249,0.05) 45%, transparent 70%)",
        }}
        initial={{ opacity: 0.35, scale: 1 }}
        animate={{ opacity: [0.28, 0.85, 0.28], scale: [1, 1.09, 1] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* The prism — faded far back but present, breathing (fade + saturation +
          a subtle spectrum hue shimmer + slow scale). */}
      <motion.div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/prism-hero.png')" }}
        initial={{
          opacity: 0.28,
          scale: 1,
          filter: "saturate(0.65) brightness(0.8) hue-rotate(0deg)",
        }}
        animate={{
          opacity: [0.22, 0.42, 0.22],
          scale: [1, 1.06, 1],
          filter: [
            "saturate(0.6) brightness(0.75) hue-rotate(-10deg)",
            "saturate(1.45) brightness(1.12) hue-rotate(10deg)",
            "saturate(0.6) brightness(0.75) hue-rotate(-10deg)",
          ],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Vignette — sinks the edges into the abyss while leaving the center dim
          enough for the prism to read behind the glass card. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(6,7,10,0.34) 0%, rgba(6,7,10,0.72) 55%, rgba(6,7,10,0.95) 100%)",
        }}
      />

      {/* Drifting motes of light, tinted with the Prysmic spectrum, rising and
          gently swaying with a soft glow so the color reads. */}
      {particles.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full blur-[0.5px]"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 ${(p.size * 3).toFixed(1)}px ${p.color}`,
          }}
          initial={{ opacity: 0, x: 0, y: 0 }}
          animate={{ opacity: [0, p.peak, 0], x: [0, p.sway, 0], y: -p.drift }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
