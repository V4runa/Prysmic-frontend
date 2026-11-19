"use client";

import { animate, motion, useMotionValue, useReducedMotion } from "framer-motion";
import { useEffect } from "react";
import { TOUR_EASE } from "./tourBeats";
import { TOUR_MOTE } from "./tourStops";

export type LanternTravel = "center" | "arc" | "settle" | "fade" | "rise" | "bloom" | "wait";

export type LanternPose = {
  x: number;
  y: number;
  travel: LanternTravel;
  color: string;
  scale: number;
  opacity: number;
  breathe: boolean;
  motes: readonly string[];
};

const SIZE = 18;

/**
 * One backdrop mote, brightened into a guide. It breathes on a 4.2s cycle,
 * clear of the flame's 3.8s and the prism's 15s.
 */
export default function GuideLantern({ pose }: { pose: LanternPose }) {
  const reduced = useReducedMotion();
  const x = useMotionValue(48);
  const y = useMotionValue(72);
  const fade = useMotionValue(1);

  useEffect(() => {
    const nextX = pose.x - SIZE / 2;
    const nextY = pose.y - SIZE / 2;
    if (pose.travel === "wait") return;
    if (reduced || pose.travel === "fade") {
      let cancelled = false;
      const out = animate(fade, 0, { duration: 0.15 });
      void out.then(() => {
        if (cancelled) return;
        x.set(nextX);
        y.set(nextY);
        animate(fade, pose.opacity, { duration: 0.15 });
      });
      return () => {
        cancelled = true;
        out.stop();
      };
    }
    if (pose.travel === "arc") {
      const fromX = x.get();
      const fromY = y.get();
      const midY = Math.min(fromY, nextY) - 28;
      const midX = fromX + (nextX - fromX) * 0.5;
      const xAnim = animate(x, [fromX, midX, nextX], {
        duration: 0.7,
        times: [0, 0.5, 1],
        ease: TOUR_EASE,
      });
      const yAnim = animate(y, [fromY, midY, nextY], {
        duration: 0.7,
        times: [0, 0.5, 1],
        ease: TOUR_EASE,
      });
      return () => {
        xAnim.stop();
        yAnim.stop();
      };
    }
    if (pose.travel === "center") {
      const xAnim = animate(x, nextX, { duration: 1.2, ease: TOUR_EASE });
      const yAnim = animate(y, nextY, { duration: 1.2, ease: TOUR_EASE });
      return () => {
        xAnim.stop();
        yAnim.stop();
      };
    }
    if (pose.travel === "rise") {
      const xAnim = animate(x, nextX, { duration: 0.9, ease: TOUR_EASE });
      const yAnim = animate(y, nextY, { duration: 0.9, ease: TOUR_EASE });
      return () => {
        xAnim.stop();
        yAnim.stop();
      };
    }
    if (pose.travel === "bloom") {
      const xAnim = animate(x, nextX, { duration: 0.7, ease: TOUR_EASE });
      const yAnim = animate(y, nextY, { duration: 0.7, ease: TOUR_EASE });
      return () => {
        xAnim.stop();
        yAnim.stop();
      };
    }
    const glide = { duration: 0.6, ease: TOUR_EASE };
    const xAnim = animate(x, nextX, glide);
    const yAnim = animate(y, nextY, glide);
    return () => {
      xAnim.stop();
      yAnim.stop();
    };
  }, [pose.travel, pose.x, pose.y, pose.opacity, reduced, x, y, fade]);

  const glow = pose.color || TOUR_MOTE.guide;

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[74]"
      style={{ x, y, width: SIZE, height: SIZE, opacity: reduced ? fade : undefined }}
      initial={false}
      animate={{ scale: reduced ? 1 : pose.scale, opacity: reduced ? undefined : pose.opacity }}
      transition={
        { duration: reduced || pose.travel === "fade" ? 0.15 : 0.6, ease: TOUR_EASE }
      }
    >
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle at 35% 32%, #ffffff 0%, ${TOUR_MOTE.core} 26%, ${glow} 58%, transparent 76%)`,
          boxShadow: `0 0 14px 4px ${glow}99, 0 0 36px 12px ${glow}44`,
          transition: reduced ? undefined : "background 600ms ease, box-shadow 600ms ease",
        }}
        animate={
          pose.breathe && !reduced
            ? { scale: [1, 1.08, 1], opacity: [0.9, 1, 0.9] }
            : { scale: 1, opacity: 1 }
        }
        transition={
          pose.breathe && !reduced
            ? { duration: 4.2, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.15 }
        }
      />
      {pose.motes.map((color, index) => {
        const angle = (Math.PI * 2 * index) / Math.max(pose.motes.length, 1) - Math.PI / 2;
        return (
          <motion.span
            key={`${color}-${index}`}
            className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full"
            style={{
              background: color,
              boxShadow: `0 0 8px ${color}`,
              marginLeft: -3,
              marginTop: -3,
            }}
            initial={reduced ? false : { opacity: 0, scale: 0.6 }}
            animate={{
              opacity: 1,
              scale: 1,
              x: Math.cos(angle) * 22,
              y: Math.sin(angle) * 22,
            }}
            transition={reduced ? { duration: 0.15 } : { duration: 0.6, ease: TOUR_EASE }}
          />
        );
      })}
    </motion.div>
  );
}
