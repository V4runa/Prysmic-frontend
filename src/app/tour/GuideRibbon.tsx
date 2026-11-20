"use client";

import { motion, useReducedMotion } from "framer-motion";
import { TOUR_BEAT, TOUR_EASE } from "./tourBeats";
import type { RibbonPlace } from "./tourLayout";
import { TOUR_COPY, TOUR_STOPS, TOUR_WASH, type TourStop } from "./tourStops";

const WORD_SHADOW = "0 1px 18px rgba(6,7,10,0.95), 0 0 2px rgba(6,7,10,1)";

/**
 * A line or two unfolding out of the guide. No card, no arrow, no popover.
 */
export default function GuideRibbon({
  stop,
  index,
  body,
  place,
  ack,
  line,
  controls = true,
  advance = true,
  compact = false,
  done = false,
  solid = false,
  lifting = false,
  dimCopy = false,
  onBack,
  onNext,
  onNotToday,
  onLeave,
}: {
  stop: TourStop;
  index: number;
  /** Spoken line for this visit. Falls back to the stop's usual body. */
  body?: string;
  place: RibbonPlace;
  ack: string | null;
  /** One line in place of the stop's title and body. */
  line?: string | null;
  /** Back and Next. The dots stay either way. */
  controls?: boolean;
  /** Next and Back stay hidden until the stop has had its beat. */
  advance?: boolean;
  /** Shorter type and padding, so a phone calendar can keep its weeks clear. */
  compact?: boolean;
  /** The primary control says Done and ends the finale. */
  done?: boolean;
  /** Solid fill, so page text cannot show through the panel. */
  solid?: boolean;
  /** Fade the whole panel in place. */
  lifting?: boolean;
  /** Fade the current words out, leaving the panel. */
  dimCopy?: boolean;
  onBack: () => void;
  onNext: () => void;
  onNotToday: () => void;
  onLeave: () => void;
}) {
  const reduced = useReducedMotion();
  const spoken = body || stop.body;
  const lines = [spoken, ack].filter((sentence): sentence is string => Boolean(sentence));
  const moods = stop.id === "moods";

  return (
    <motion.div
      id="tour-ribbon"
      role="dialog"
      aria-modal="false"
      aria-labelledby="tour-heading"
      className="fixed z-[90] pointer-events-auto"
      style={{
        top: place.top,
        bottom: place.bottom,
        left: place.left,
        width: place.width,
        ...TOUR_WASH,
        ...(compact ? { padding: "10px 14px 8px" } : {}),
        // The finale sits on the timeline. A solid fill keeps that text out of
        // the panel; the gradient on the other stops stays as it is.
        ...(done || solid ? { background: "#06070a" } : {}),
      }}
      initial={done ? false : { opacity: 0 }}
      animate={{ opacity: lifting ? 0 : 1 }}
      exit={{ opacity: 0 }}
      transition={
        done || solid || lifting
          ? { duration: TOUR_BEAT.lift / 1000, ease: TOUR_EASE }
          : { duration: reduced ? 0.15 : TOUR_BEAT.wordsOut / 1000, ease: TOUR_EASE }
      }
    >
      <p className="sr-only" aria-live="polite">
        {line ? `Stop ${index + 1} of ${TOUR_STOPS.length}. ${line}` : `Stop ${index + 1} of ${TOUR_STOPS.length}, ${stop.label}. ${spoken}`}
      </p>
      <div className="flex items-start justify-between gap-3">
        <div
          className="min-w-0 flex-1"
          style={
            dimCopy
              ? {
                  opacity: 0,
                  transition: `opacity ${TOUR_BEAT.wordsOut}ms cubic-bezier(0.45, 0.05, 0.55, 0.95)`,
                }
              : undefined
          }
        >
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
                className={`font-semibold tracking-wide text-slate-100 outline-none ${compact ? "text-lg" : "text-xl sm:text-2xl"}`}
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
                  className={`mt-2 text-sm text-slate-300 sm:text-base ${compact ? "leading-snug" : "leading-relaxed"}`}
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
      <div className={`flex flex-nowrap items-center gap-3 ${controls ? (compact ? "mt-2 justify-between" : "mt-4 justify-between") : "mt-3"}`}>
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
            className="flex shrink-0 flex-nowrap items-center gap-2"
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
