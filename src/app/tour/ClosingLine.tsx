"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";
import { TOUR_COPY } from "./tourStops";
import type { ClosingKind } from "./tourMachine";

const WORD_SHADOW = "0 1px 18px rgba(6,7,10,0.95), 0 0 2px rgba(6,7,10,1)";

const LINE: Record<Exclude<ClosingKind, "declined">, string> = {
  home: TOUR_COPY.homeLine,
  left: TOUR_COPY.leftLine,
  "not-today": TOUR_COPY.notTodayLine,
};

/** One quiet line, low on the screen, clear of the flame. A tap anywhere lets it go. */
export default function ClosingLine({
  kind,
  onDone,
}: {
  kind: Exclude<ClosingKind, "declined">;
  onDone: () => void;
}) {
  const reduced = useReducedMotion();
  const delay = kind === "home" && !reduced ? 2 : 0;

  useEffect(() => {
    const onPointer = () => onDone();
    const timer = window.setTimeout(() => {
      window.addEventListener("pointerdown", onPointer);
    }, delay * 1000 + 400);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [delay, onDone]);

  return (
    <motion.p
      role="status"
      className="pointer-events-none fixed z-[80] left-4 right-4 text-center text-sm leading-relaxed text-slate-200 sm:left-1/2 sm:w-full sm:max-w-xl sm:-translate-x-1/2 sm:text-base"
      style={{
        bottom: "calc(var(--bottomnav-h, 0px) + 1.25rem)",
        textShadow: WORD_SHADOW,
      }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ delay, duration: reduced ? 0.15 : 0.6, ease: "easeOut" }}
    >
      {LINE[kind]}
    </motion.p>
  );
}
