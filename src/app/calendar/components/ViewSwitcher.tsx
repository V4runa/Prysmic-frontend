"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import { CalendarDays, Columns3, CalendarClock, type LucideIcon } from "lucide-react";
import { CalendarView } from "../types";

const VIEW_META: Record<CalendarView, { label: string; icon: LucideIcon }> = {
  month: { label: "Month", icon: CalendarDays },
  week: { label: "Week", icon: Columns3 },
  day: { label: "Day", icon: CalendarClock },
};

interface ViewSwitcherProps {
  views: CalendarView[];
  value: CalendarView;
  onChange: (view: CalendarView) => void;
}

export default function ViewSwitcher({ views, value, onChange }: ViewSwitcherProps) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
      {views.map((view) => {
        const meta = VIEW_META[view];
        const Icon = meta.icon;
        const active = value === view;
        return (
          <button
            key={view}
            onClick={() => onChange(view)}
            aria-pressed={active}
            className={clsx(
              "relative tap-target flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              active ? "text-cyan-200" : "text-slate-400 hover:text-slate-200"
            )}
          >
            {active && (
              <motion.span
                layoutId="calViewActive"
                className="absolute inset-0 rounded-md bg-cyan-400/15 border border-cyan-300/30"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <Icon className="relative h-4 w-4" />
            <span className="relative hidden sm:inline">{meta.label}</span>
          </button>
        );
      })}
    </div>
  );
}
