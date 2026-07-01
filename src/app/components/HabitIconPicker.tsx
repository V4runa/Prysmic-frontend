"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import { tactileSubtle } from "../lib/motion";
import {
  habitIconMap as iconMap,
  habitIconChoices as iconChoices,
  IconKey,
} from "./habitIcons";

interface HabitIconPickerProps {
  value?: string;
  onChange: (icon: IconKey) => void;
}

export default function HabitIconPicker({ value, onChange }: HabitIconPickerProps) {
  return (
    // More columns = a shorter grid = less scrolling to reach the actions.
    <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
      {iconChoices.map((icon) => {
        const Icon = iconMap[icon as IconKey];
        const selected = value === icon;
        return (
          <motion.button
            key={icon}
            type="button"
            {...tactileSubtle}
            aria-label={`${icon} icon`}
            aria-pressed={selected}
            onClick={() => onChange(icon as IconKey)}
            className={clsx(
              "tap-target flex items-center justify-center rounded-md border p-2 transition",
              selected
                ? "bg-cyan-400/10 border-cyan-400 shadow-[0_0_12px_rgba(103,232,249,0.25)]"
                : "border-white/10 hover:bg-white/10"
            )}
          >
            <Icon className="h-5 w-5 text-slate-100" />
          </motion.button>
        );
      })}
    </div>
  );
}
