"use client";

import clsx from "clsx";
import { moodColor } from "../../lib/moodColors";

interface DayAuraProps {
  /** Mood color token for the day, if a mood was logged. */
  moodColorToken?: string | null;
  /** Activity level used when there's no mood (0 renders nothing). */
  heat?: 0 | 1 | 2 | 3;
  className?: string;
}

/**
 * The soft ambient glow that makes a day cell feel lived-in. A logged mood wins
 * (its colour tints the day); otherwise a busy day gets a faint cyan warmth that
 * scales with how much happened. Purely decorative, never interactive.
 */
export default function DayAura({ moodColorToken, heat = 0, className }: DayAuraProps) {
  if (moodColorToken) {
    // A logged mood is one of the calendar's richest signals, so we make it
    // read clearly: the mood colour pools up from the bottom of the cell and
    // softly fades out, like the day is lit from below in that feeling.
    return (
      <div
        className={clsx("pointer-events-none absolute inset-0 overflow-hidden", className)}
      >
        <div
          className={clsx(
            "absolute inset-x-0 bottom-0 h-2/3 opacity-70",
            moodColor(moodColorToken).glow
          )}
          style={{
            maskImage: "linear-gradient(to top, black, transparent)",
            WebkitMaskImage: "linear-gradient(to top, black, transparent)",
          }}
        />
      </div>
    );
  }

  if (heat > 0) {
    const opacity = heat === 1 ? 0.05 : heat === 2 ? 0.09 : 0.14;
    return (
      <div
        className={clsx("pointer-events-none absolute inset-0", className)}
        style={{
          background:
            "radial-gradient(circle at 50% 0%, rgba(103,232,249,0.65), transparent 72%)",
          opacity,
        }}
      />
    );
  }

  return null;
}
