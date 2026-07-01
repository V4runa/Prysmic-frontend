"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import { tactileSubtle } from "../lib/motion";

export const HABIT_COLOR_CHOICES = [
  "cyan",
  "violet",
  "rose",
  "amber",
  "emerald",
  "blue",
] as const;

export type HabitColor = (typeof HABIT_COLOR_CHOICES)[number];

// Always show the real colour so the choices read at a glance; the selected
// swatch gets a ring instead of being the only one that reveals its colour.
const swatchFill: Record<HabitColor, string> = {
  cyan: "bg-cyan-400",
  violet: "bg-violet-400",
  rose: "bg-rose-400",
  amber: "bg-amber-400",
  emerald: "bg-emerald-400",
  blue: "bg-blue-400",
};

interface HabitColorPickerProps {
  value?: string;
  onChange: (color: HabitColor) => void;
}

export default function HabitColorPicker({ value, onChange }: HabitColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {HABIT_COLOR_CHOICES.map((c) => {
        const selected = value === c;
        return (
          <motion.button
            key={c}
            type="button"
            {...tactileSubtle}
            aria-label={`${c} colour`}
            aria-pressed={selected}
            onClick={() => onChange(c)}
            className={clsx(
              "tap-target h-9 w-9 rounded-full transition",
              swatchFill[c],
              selected
                ? "ring-2 ring-white/80 ring-offset-2 ring-offset-zinc-900"
                : "opacity-70 hover:opacity-100"
            )}
          />
        );
      })}
    </div>
  );
}
