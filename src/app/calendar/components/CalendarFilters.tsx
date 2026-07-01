"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import {
  CalendarClock,
  CheckSquare,
  Flame,
  StickyNote,
  Smile,
  type LucideIcon,
} from "lucide-react";
import { CalendarSource } from "../types";
import { SourceFilter } from "../lib/calendarLib";
import { tactileSubtle } from "../../lib/motion";

// Doubles as the legend: each chip both explains an icon/colour AND toggles that
// layer on the grid. Active = coloured; muted = hidden.
const SOURCES: {
  key: CalendarSource;
  label: string;
  icon: LucideIcon;
  on: string;
}[] = [
  { key: "event", label: "Events", icon: CalendarClock, on: "text-cyan-200 bg-cyan-400/15 border-cyan-300/40" },
  { key: "task", label: "Tasks", icon: CheckSquare, on: "text-sky-200 bg-sky-400/15 border-sky-300/40" },
  { key: "habit", label: "Habits", icon: Flame, on: "text-amber-100 bg-amber-400/15 border-amber-300/40" },
  { key: "note", label: "Notes", icon: StickyNote, on: "text-violet-200 bg-violet-400/15 border-violet-300/40" },
  { key: "mood", label: "Moods", icon: Smile, on: "text-emerald-200 bg-emerald-400/15 border-emerald-300/40" },
];

interface CalendarFiltersProps {
  value: SourceFilter;
  onChange: (next: SourceFilter) => void;
}

export default function CalendarFilters({ value, onChange }: CalendarFiltersProps) {
  return (
    <div className="hidden sm:flex items-center gap-1.5 flex-wrap shrink-0">
      {SOURCES.map(({ key, label, icon: Icon, on }) => {
        const active = value[key];
        return (
          <motion.button
            key={key}
            {...tactileSubtle}
            onClick={() => onChange({ ...value, [key]: !active })}
            aria-pressed={active}
            title={active ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
            className={clsx(
              "flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
              active
                ? on
                : "border-white/10 text-slate-500 hover:text-slate-300 hover:border-white/20"
            )}
          >
            <Icon className="h-3 w-3" />
            {label}
          </motion.button>
        );
      })}
    </div>
  );
}
