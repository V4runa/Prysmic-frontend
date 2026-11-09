"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { CalendarClock, CheckCircle2, Square, StickyNote } from "lucide-react";
import { DayBuckets, monthTaskMark } from "../lib/calendarLib";

interface DaySummaryProps {
  buckets: DayBuckets;
  /** Events present on the day but not drawn as spanning bars (overflow lanes). */
  eventOverflow?: number;
  className?: string;
}

// A single segmented pill, with a count. The task mark is that day's completion:
// an empty square until every task is done, then a check. The day panel holds
// each task.
const pill =
  "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium leading-none border tabular-nums";

export default function DaySummary({
  buckets,
  eventOverflow = 0,
  className,
}: DaySummaryProps) {
  const tasks = monthTaskMark(buckets.tasks);
  const noteCount = buckets.notes.length;

  const pills: ReactNode[] = [];

  if (eventOverflow > 0) {
    pills.push(
      <span key="event" className={clsx(pill, "bg-cyan-500/10 border-cyan-400/30 text-cyan-200")}>
        <CalendarClock className="h-3 w-3 shrink-0" />+{eventOverflow}
      </span>
    );
  }
  if (tasks.total > 0) {
    pills.push(
      <span
        key="task"
        role="img"
        title={tasks.label}
        aria-label={tasks.label}
        className={clsx(
          pill,
          tasks.checked
            ? "bg-green-500/10 border-green-400/30 text-green-300/80"
            : "bg-sky-500/10 border-sky-400/30 text-sky-200"
        )}
      >
        {tasks.checked ? (
          <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden="true" />
        ) : (
          <Square className="h-3 w-3 shrink-0" aria-hidden="true" />
        )}
        {tasks.text}
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
    <div className={clsx("flex flex-wrap items-center gap-1.5", className)}>{pills}</div>
  );
}
