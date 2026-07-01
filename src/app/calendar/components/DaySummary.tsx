"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { CalendarClock, CheckSquare, StickyNote } from "lucide-react";
import { DayBuckets } from "../lib/calendarLib";

interface DaySummaryProps {
  buckets: DayBuckets;
  /** Events present on the day but not drawn as spanning bars (overflow lanes). */
  eventOverflow?: number;
  className?: string;
}

// A single segmented pill: consistent icon + colour per source, with a count.
// Carrying the meaning in an icon (not a truncated title) keeps dense month
// cells legible — the day panel holds the full detail on tap.
const pill =
  "flex items-center gap-0.5 rounded px-1 py-[1px] text-[10px] leading-none border tabular-nums";

export default function DaySummary({
  buckets,
  eventOverflow = 0,
  className,
}: DaySummaryProps) {
  const taskCount = buckets.tasks.length;
  const noteCount = buckets.notes.length;

  const pills: ReactNode[] = [];

  if (eventOverflow > 0) {
    pills.push(
      <span key="event" className={clsx(pill, "bg-cyan-500/10 border-cyan-400/30 text-cyan-200")}>
        <CalendarClock className="h-3 w-3 shrink-0" />+{eventOverflow}
      </span>
    );
  }
  if (taskCount > 0) {
    pills.push(
      <span key="task" className={clsx(pill, "bg-sky-500/10 border-sky-400/30 text-sky-200")}>
        <CheckSquare className="h-3 w-3 shrink-0" />
        {taskCount}
      </span>
    );
  }
  if (noteCount > 0) {
    pills.push(
      <span key="note" className={clsx(pill, "bg-violet-500/10 border-violet-400/30 text-violet-200")}>
        <StickyNote className="h-3 w-3 shrink-0" />
        {noteCount}
      </span>
    );
  }

  if (!pills.length) return null;

  return (
    <div className={clsx("flex flex-wrap items-center gap-1", className)}>{pills}</div>
  );
}
