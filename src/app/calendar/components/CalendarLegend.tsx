"use client";

import clsx from "clsx";
import {
  CalendarClock,
  CheckSquare,
  Flame,
  StickyNote,
  Smile,
} from "lucide-react";

// The single source of truth for "what does this icon mean?" — mirrors the
// icons/colours used by the grid (DaySummary, week rails, mobile dots).
const LEGEND = [
  { icon: CalendarClock, label: "Event", color: "text-cyan-300" },
  { icon: CheckSquare, label: "Task", color: "text-sky-300" },
  { icon: Flame, label: "Habit done", color: "text-amber-300" },
  { icon: StickyNote, label: "Note", color: "text-violet-300" },
  { icon: Smile, label: "Mood", color: "text-emerald-300" },
] as const;

export default function CalendarLegend() {
  return (
    <div className="hidden sm:flex items-center gap-x-3 gap-y-1 flex-wrap shrink-0 text-[10px] text-slate-500">
      {LEGEND.map(({ icon: Icon, label, color }) => (
        <span key={label} className="flex items-center gap-1">
          <Icon className={clsx("h-3 w-3", color)} />
          {label}
        </span>
      ))}
    </div>
  );
}
