"use client";

import { motion } from "framer-motion";

interface SparklesProps {
  /** CSS color for the particles (e.g. "rgb(34,197,94)" or "#67e8f9"). */
  color?: string;
  /** Number of particles in the burst. */
  count?: number;
  /** How far the particles travel outward, in px. */
  distance?: number;
}

/**
 * A radial particle burst used to celebrate a completion / check-in.
 * Mount it (conditionally) for the duration of the celebration; it animates
 * once and is purely decorative (pointer-events: none).
 */
export default function Sparkles({
  color = "rgb(103, 232, 249)",
  count = 10,
  distance = 52,
}: SparklesProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const spread = distance * (0.7 + Math.random() * 0.6);
        const x = Math.cos(angle) * spread;
        const y = Math.sin(angle) * spread;
        return (
          <motion.span
            key={i}
            className="absolute h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
            initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            animate={{ opacity: 0, scale: 0.3, x, y }}
            transition={{
              duration: 0.7,
              delay: i * 0.012,
              ease: [0.16, 1, 0.3, 1],
            }}
          />
        );
      })}
    </div>
  );
}
