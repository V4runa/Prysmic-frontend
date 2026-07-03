"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

/**
 * Shared prism atmosphere for the public (pre-auth) routes: landing, login,
 * signup. The prism sits deep in the dark like an ancient structure hidden in
 * the abyss — heavily faded, slowly breathing (opacity + saturation + a gentle
 * scale drift) with faint motes of light drifting upward over it. Rendered as a
 * fixed full-bleed layer behind page content via a negative z-index.
 */

// Deterministic pseudo-random so server and client render identical particle
// positions (no hydration mismatch). Same input -> same output.
const seededRandom = (n: number) => {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
};

const PARTICLE_COUNT = 34;

// The Prysmic spectrum — the same hues that surface across the app (cyan, ice,
// violet, rose, amber, mint). Weighted cool so warm colors are just accents.
const PARTICLE_COLORS = [
  "#67e8f9", // cyan
  "#a5f3fc", // ice
  "#67e8f9", // cyan (again — keep cool dominant)
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
        const size = 1.2 + rs * 2.6;
        return {
          left: `${(rx * 100).toFixed(2)}%`,
          top: `${(ry * 100).toFixed(2)}%`,
          size,
          duration: 7 + rd * 11,
          delay: rx * 8,
          drift: 16 + ry * 30,
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
      {/* The prism — faded far back, breathing slowly (fade + saturation +
          scale) so it reads as ambient depth rather than a picture. */}
      <motion.div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/prism-hero.png')" }}
        initial={{
          opacity: 0.2,
          scale: 1,
          filter: "saturate(0.6) brightness(0.75)",
        }}
        animate={{
          opacity: [0.16, 0.32, 0.16],
          scale: [1, 1.05, 1],
          filter: [
            "saturate(0.55) brightness(0.72)",
            "saturate(1.35) brightness(1.05)",
            "saturate(0.55) brightness(0.72)",
          ],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Deep vignette — swallows the prism into the abyss, darkest at the
          edges and dim through the center where the glass card floats. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(6,7,10,0.42) 0%, rgba(6,7,10,0.74) 55%, rgba(6,7,10,0.95) 100%)",
        }}
      />

      {/* Drifting motes of light rising through the dark, tinted with the
          Prysmic spectrum and given a soft glow so the color reads. */}
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
            boxShadow: `0 0 ${(p.size * 2.5).toFixed(1)}px ${p.color}`,
          }}
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: [0, 0.7, 0], y: -p.drift }}
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
