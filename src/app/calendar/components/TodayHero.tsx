"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import {
  CalendarClock,
  CheckSquare,
  StickyNote,
  Sparkles,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { DayStats } from "../lib/calendarLib";
import HabitProgressRing from "./HabitProgressRing";
import { tactile } from "../../lib/motion";

interface TodayHeroProps {
  dateLabel: string;
  stats: DayStats;
  moodEmoji?: string | null;
  onOpen: () => void;
}

function Stat({
  icon: Icon,
  children,
  color,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
  color: string;
}) {
  return (
    <span className="flex items-center gap-1 text-xs text-slate-300 tabular-nums">
      <Icon className={clsx("h-3.5 w-3.5", color)} />
      {children}
    </span>
  );
}

/**
 * A compact "today at a glance" hook above the grid: mood, counts, and a habit
 * progress ring that turns gold on a perfect day. Tapping jumps to today.
 */
export default function TodayHero({
  dateLabel,
  stats,
  moodEmoji,
  onOpen,
}: TodayHeroProps) {
  const quiet =
    stats.events === 0 &&
    stats.tasks === 0 &&
    stats.notes === 0 &&
    stats.moods === 0 &&
    stats.habitExpected === 0;

  return (
    <motion.button
      {...tactile}
      onClick={onOpen}
      className={clsx(
        "group shrink-0 w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
        stats.isPerfect
          ? "border-amber-300/40 bg-gradient-to-r from-amber-400/10 to-transparent"
          : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
      )}
    >
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-widest text-cyan-300/80">
          Today
        </span>
        <span className="text-sm font-semibold text-slate-100 whitespace-nowrap">
          {dateLabel}
        </span>
      </div>

      <div className="h-8 w-px bg-white/10 shrink-0" />

      <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
        {moodEmoji && <span className="text-lg leading-none">{moodEmoji}</span>}
        {stats.events > 0 && (
          <Stat icon={CalendarClock} color="text-cyan-300">
            {stats.events} {stats.events === 1 ? "event" : "events"}
          </Stat>
        )}
        {stats.tasks > 0 && (
          <Stat icon={CheckSquare} color="text-sky-300">
            {stats.tasksDone}/{stats.tasks} tasks
          </Stat>
        )}
        {stats.notes > 0 && (
          <Stat icon={StickyNote} color="text-violet-300">
            {stats.notes} {stats.notes === 1 ? "note" : "notes"}
          </Stat>
        )}
        {quiet && (
          <span className="text-xs text-slate-500">
            A blank page — make today count.
          </span>
        )}
      </div>

      {stats.isPerfect && (
        <span className="hidden sm:flex items-center gap-1 text-xs font-medium text-amber-200">
          <Sparkles className="h-3.5 w-3.5" />
          Perfect day
        </span>
      )}

      {stats.habitExpected > 0 ? (
        <HabitProgressRing
          done={stats.habitDone}
          total={stats.habitExpected}
          size={40}
          strokeWidth={3.5}
          showLabel
          className="shrink-0"
        />
      ) : (
        <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-slate-300 shrink-0" />
      )}
    </motion.button>
  );
}
