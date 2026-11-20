"use client";

import { motion, useReducedMotion } from "framer-motion";
import { SIGNUP_EMAIL_NOTE } from "../lib/authMessages";
import { springSoft } from "../lib/motion";
import { TOUR_COPY, TOUR_WASH, welcomeHeading } from "./tourStops";

const WORD_SHADOW = "0 1px 18px rgba(6,7,10,0.95), 0 0 2px rgba(6,7,10,1)";

/**
 * The welcome, spoken in the room. No card. The guide has already come to rest above these words.
 */
export default function TourArrival({
  name,
  emailNote,
  phone,
  anchor,
  onBegin,
  onDecline,
}: {
  name: string | null;
  emailNote: boolean;
  phone: boolean;
  anchor: { x: number; y: number; width: number } | null;
  onBegin: () => void;
  onDecline: () => void;
}) {
  const reduced = useReducedMotion();
  const delay = (seconds: number) => (reduced ? 0 : seconds);
  const rise = reduced ? { duration: 0.15 } : { ...springSoft };

  const panelStyle = phone
    ? { top: "calc(var(--header-h) + 4.5rem)", left: 16, right: 16 }
    : anchor
      ? {
          top: anchor.y,
          left: Math.max(16, anchor.x - Math.min(560, anchor.width) / 2),
          width: Math.min(560, anchor.width),
        }
      : {
          top: "32%",
          left: "50%",
          width: "min(560px, calc(100vw - 48px))",
          transform: "translateX(-50%)",
        };

  return (
    <div
      id="tour-ribbon"
      role="dialog"
      aria-modal="false"
      aria-labelledby="tour-heading"
      className="pointer-events-none fixed inset-0 z-[80]"
    >
      <div className="pointer-events-auto fixed" style={{ ...panelStyle, ...TOUR_WASH }}>
      <p className="sr-only" aria-live="polite">
        {welcomeHeading(name)} {TOUR_COPY.welcomeLead}
      </p>
      <motion.h2
        id="tour-heading"
        tabIndex={-1}
        className="text-2xl font-semibold tracking-wide text-slate-100 outline-none sm:text-3xl"
        style={{ textShadow: WORD_SHADOW }}
        initial={reduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...rise, delay: delay(0.35) }}
      >
        {welcomeHeading(name)}
      </motion.h2>
      <motion.p
        className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base"
        style={{ textShadow: WORD_SHADOW }}
        initial={reduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...rise, delay: delay(0.55) }}
      >
        {TOUR_COPY.welcomeLead}
      </motion.p>
      <motion.p
        className="mt-2 text-sm leading-relaxed text-slate-400 sm:text-base"
        style={{ textShadow: WORD_SHADOW }}
        initial={reduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...rise, delay: delay(0.75) }}
      >
        {TOUR_COPY.welcomeAsk}
      </motion.p>
      {emailNote ? (
        <motion.p
          className="mt-3 text-sm leading-relaxed text-cyan-100/90"
          style={{ textShadow: WORD_SHADOW }}
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...rise, delay: delay(0.9) }}
        >
          {SIGNUP_EMAIL_NOTE}
        </motion.p>
      ) : null}
      {phone ? null : (
        <motion.div
          className="mt-6 flex flex-row items-center gap-3"
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...rise, delay: delay(1.05) }}
        >
          <Choice onBegin={onBegin} onDecline={onDecline} stacked={false} />
        </motion.div>
      )}
      </div>
      {phone ? (
        <motion.div
          className="pointer-events-auto fixed left-4 right-4 flex flex-col gap-2"
          style={{ bottom: "calc(var(--bottomnav-h, 0px) + 12px)" }}
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...rise, delay: delay(1.05) }}
        >
          <Choice onBegin={onBegin} onDecline={onDecline} stacked />
        </motion.div>
      ) : null}
    </div>
  );
}

function Choice({
  onBegin,
  onDecline,
  stacked,
}: {
  onBegin: () => void;
  onDecline: () => void;
  stacked: boolean;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onBegin}
        className={`tap-target rounded-md border border-cyan-300/20 bg-cyan-400/10 px-5 py-2.5 text-sm tracking-wide text-cyan-100 hover:bg-cyan-400/20 ${
          stacked ? "w-full" : ""
        }`}
      >
        {TOUR_COPY.showMe}
      </button>
      <button
        type="button"
        onClick={onDecline}
        className={`tap-target px-3 py-2.5 text-sm text-slate-400 hover:text-slate-200 ${
          stacked ? "w-full" : ""
        }`}
      >
        {TOUR_COPY.lookAlone}
      </button>
    </>
  );
}
