"use client";

import { motion, useReducedMotion } from "framer-motion";
import { springSoft } from "../lib/motion";
import type { RibbonPlace } from "./tourLayout";
import { TOUR_COPY, TOUR_STOPS, TOUR_WASH, stopAnnouncement, type TourStop } from "./tourStops";

const WORD_SHADOW = "0 1px 18px rgba(6,7,10,0.95), 0 0 2px rgba(6,7,10,1)";

/**
 * A line or two unfolding out of the guide. No card, no arrow, no popover.
 */
export default function GuideRibbon({
  stop,
  index,
  place,
  ack,
  onBack,
  onNext,
  onNotToday,
  onLeave,
}: {
  stop: TourStop;
  index: number;
  place: RibbonPlace;
  ack: string | null;
  onBack: () => void;
  onNext: () => void;
  onNotToday: () => void;
  onLeave: () => void;
}) {
  const reduced = useReducedMotion();
  const lines = [stop.body, ack].filter((line): line is string => Boolean(line));
  const moods = stop.id === "moods";

  return (
    <motion.div
      id="tour-ribbon"
      role="dialog"
      aria-modal="false"
      aria-labelledby="tour-heading"
      className="fixed z-[80] pointer-events-auto"
      style={{
        top: place.top,
        bottom: place.bottom,
        left: place.left,
        width: place.width,
        ...TOUR_WASH,
      }}
      initial={reduced ? { opacity: 0 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0.15 : 0.2 }}
    >
      <p className="sr-only" aria-live="polite">
        {stopAnnouncement(index)}
      </p>
      <button
        type="button"
        onClick={onLeave}
        className="tap-target absolute right-0 top-0 text-xs uppercase tracking-wide text-slate-500 hover:text-slate-300"
      >
        {TOUR_COPY.leave}
      </button>
      <motion.h2
        id="tour-heading"
        tabIndex={-1}
        className="pr-24 text-xl font-semibold tracking-wide text-slate-100 outline-none sm:text-2xl"
        style={{ textShadow: WORD_SHADOW }}
        initial={reduced ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduced ? { duration: 0.15 } : springSoft}
      >
        {stop.title}
      </motion.h2>
      {lines.map((line, lineIndex) => (
        <motion.p
          key={line}
          className="mt-2 text-sm leading-relaxed text-slate-300 sm:text-base"
          style={{ textShadow: WORD_SHADOW }}
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            reduced
              ? { duration: 0.15 }
              : { ...springSoft, delay: 0.12 * (lineIndex + 1) }
          }
        >
          {line}
        </motion.p>
      ))}
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {TOUR_STOPS.map((item, dot) => (
            <span
              key={item.id}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                dot === index ? "w-6 bg-cyan-300 shadow-[0_0_8px_rgba(103,232,249,0.7)]" : "w-1.5 bg-white/20"
              }`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="tap-target px-2 text-sm text-slate-400 hover:text-slate-200"
          >
            {TOUR_COPY.back}
          </button>
          {moods ? (
            <button
              type="button"
              onClick={onNotToday}
              className="tap-target px-2 text-sm text-slate-300 hover:text-slate-100"
            >
              {TOUR_COPY.notToday}
            </button>
          ) : (
            <button
              type="button"
              onClick={onNext}
              className="tap-target rounded-md border border-cyan-300/20 bg-cyan-400/10 px-4 text-sm tracking-wide text-cyan-100 hover:bg-cyan-400/20"
            >
              {TOUR_COPY.next}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
