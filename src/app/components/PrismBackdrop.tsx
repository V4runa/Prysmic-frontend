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

const PARTICLE_COUNT = 30;

export default function PrismBackdrop() {
  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => {
        const rx = seededRandom(i + 1);
        const ry = seededRandom(i + 101);
        const rs = seededRandom(i + 201);
        const rd = seededRandom(i + 301);
        return {
          left: `${(rx * 100).toFixed(2)}%`,
          top: `${(ry * 100).toFixed(2)}%`,
          size: 1 + rs * 2.4,
          duration: 7 + rd * 11,
          delay: rx * 8,
          drift: 16 + ry * 30,
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
          opacity: 0.12,
          scale: 1,
          filter: "saturate(0.5) brightness(0.65)",
        }}
        animate={{
          opacity: [0.09, 0.19, 0.09],
          scale: [1, 1.05, 1],
          filter: [
            "saturate(0.45) brightness(0.6)",
            "saturate(1.3) brightness(0.95)",
            "saturate(0.45) brightness(0.6)",
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
            "radial-gradient(ellipse at center, rgba(6,7,10,0.55) 0%, rgba(6,7,10,0.82) 55%, rgba(6,7,10,0.97) 100%)",
        }}
      />

      {/* Drifting motes of light rising through the dark. */}
      {particles.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-cyan-200/50 blur-[0.5px]"
          style={{ left: p.left, top: p.top, width: p.size, height: p.size }}
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: [0, 0.55, 0], y: -p.drift }}
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
