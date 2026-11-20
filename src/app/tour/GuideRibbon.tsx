"use client";

import { motion, useReducedMotion } from "framer-motion";
import { TOUR_BEAT, TOUR_EASE } from "./tourBeats";
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
  line,
  controls = true,
  advance = true,
  done = false,
  lifting = false,
  onBack,
  onNext,
  onNotToday,
  onLeave,
}: {
  stop: TourStop;
  index: number;
  place: RibbonPlace;
  ack: string | null;
  /** One line in place of the stop's title and body. */
  line?: string | null;
  /** Back and Next. The dots stay either way. */
  controls?: boolean;
  /** Next and Back stay hidden until the stop has had its beat. */
  advance?: boolean;
  /** The primary control says Done and ends the finale. */
  done?: boolean;
  /** Fade the whole panel in place. Used for the finale lift. */
  lifting?: boolean;
  onBack: () => void;
  onNext: () => void;
  onNotToday: () => void;
  onLeave: () => void;
}) {
  const reduced = useReducedMotion();
  const lines = [stop.body, ack].filter((sentence): sentence is string => Boolean(sentence));
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
        // The finale sits on the timeline. A solid fill keeps that text out of
        // the panel; the gradient on the other stops stays as it is.
        ...(done ? { background: "#06070a" } : {}),
      }}
      initial={done ? false : { opacity: 0 }}
      animate={{ opacity: lifting ? 0 : 1 }}
      exit={{ opacity: 0 }}
      transition={
        done
          ? { duration: TOUR_BEAT.lift / 1000, ease: TOUR_EASE }
          : { duration: reduced ? 0.15 : TOUR_BEAT.wordsOut / 1000, ease: TOUR_EASE }
      }
    >
      <p className="sr-only" aria-live="polite">
        {line ? `Stop ${index + 1} of ${TOUR_STOPS.length}. ${line}` : stopAnnouncement(index)}
      </p>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {line ? (
            <motion.p
              id="tour-heading"
              tabIndex={-1}
              className="text-sm font-medium leading-relaxed text-slate-100 outline-none sm:text-base"
              style={{ textShadow: WORD_SHADOW }}
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduced ? { duration: 0.15 } : { duration: TOUR_BEAT.wordsIn / 1000, ease: TOUR_EASE }}
            >
              {line}
            </motion.p>
          ) : (
            <>
              <motion.h2
                id="tour-heading"
                tabIndex={-1}
                className="text-xl font-semibold tracking-wide text-slate-100 outline-none sm:text-2xl"
                style={{ textShadow: WORD_SHADOW }}
                initial={reduced ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduced ? { duration: 0.15 } : { duration: TOUR_BEAT.wordsIn / 1000, ease: TOUR_EASE }}
              >
                {stop.title}
              </motion.h2>
              {lines.map((sentence, lineIndex) => (
                <motion.p
                  key={sentence}
                  className="mt-2 text-sm leading-relaxed text-slate-300 sm:text-base"
                  style={{ textShadow: WORD_SHADOW }}
                  initial={reduced ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={
                    reduced
                      ? { duration: 0.15 }
                      : { duration: TOUR_BEAT.wordsIn / 1000, ease: TOUR_EASE, delay: 0.08 * (lineIndex + 1) }
                  }
                >
                  {sentence}
                </motion.p>
              ))}
            </>
          )}
        </div>
        <button
          type="button"
          onClick={onLeave}
          className="tap-target relative z-10 shrink-0 rounded-full px-3 py-1.5 text-xs uppercase tracking-wide text-slate-300 hover:text-slate-100"
          style={{
            background: "#06070a",
            boxShadow: "0 0 0 5px #06070a, 0 0 18px 6px rgba(6,7,10,0.95)",
          }}
        >
          {TOUR_COPY.leave}
        </button>
      </div>
      <div className={`flex items-center gap-3 ${controls ? "mt-4 justify-between" : "mt-3"}`}>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {TOUR_STOPS.map((item, dot) => (
            <span
              key={item.id}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                dot === index
                  ? "w-6 bg-cyan-300 shadow-[0_0_8px_rgba(103,232,249,0.7)]"
                  : dot < index && !controls
                    ? "w-1.5 bg-cyan-300/70"
                    : "w-1.5 bg-white/20"
              }`}
            />
          ))}
        </div>
        {controls ? (
          <motion.div
            className="flex items-center gap-2"
            initial={false}
            animate={{ opacity: advance ? 1 : 0 }}
            transition={{ duration: reduced ? 0.15 : 0.35, ease: TOUR_EASE }}
            style={{ pointerEvents: advance ? "auto" : "none" }}
          >
            <button
              type="button"
              onClick={onBack}
              className="tap-target px-2 text-sm text-slate-400 hover:text-slate-200"
            >
              {TOUR_COPY.back}
            </button>
            {done ? (
              <button
                type="button"
                onClick={onNext}
                className="tap-target rounded-md border border-cyan-300/20 bg-cyan-400/10 px-4 text-sm tracking-wide text-cyan-100 hover:bg-cyan-400/20"
              >
                {TOUR_COPY.done}
              </button>
            ) : moods ? (
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
          </motion.div>
        ) : null}
      </div>
    </motion.div>
  );
}
