"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { format } from "date-fns";
import { CalendarClock, StickyNote, Flame, CheckSquare } from "lucide-react";
import {
  bucketsForDay,
  CalendarIndex,
  dayStats,
  filterBuckets,
  formatClock,
  parseDayKey,
  SourceFilter,
  weekDays,
} from "../lib/calendarLib";
import { getEventColor, SOURCE_ACCENT } from "../../lib/calendarColors";
import { resolveMoodVisual } from "../../lib/moodColors";
import { localToday } from "../../lib/date";
import DayAura from "./DayAura";
import HabitProgressRing from "./HabitProgressRing";

const perfectGlow =
  "radial-gradient(circle at 50% 0%, rgba(251,191,36,0.16), transparent 65%)";

interface WeekViewProps {
  anchor: string;
  index: CalendarIndex;
  sources: SourceFilter;
  selectedDay: string;
  onSelectDay: (day: string) => void;
  onCreateEvent: (date: string) => void;
  onOpenEvent: (eventId: number) => void;
}

export default function WeekView({
  anchor,
  index,
  sources,
  selectedDay,
  onSelectDay,
  onCreateEvent,
  onOpenEvent,
}: WeekViewProps) {
  const days = useMemo(() => weekDays(anchor), [anchor]);
  const today = localToday();

  return (
    <motion.div
      key={anchor}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="flex-1 grid grid-cols-7 gap-1 min-h-0"
    >
      {days.map((cell) => {
        const b = filterBuckets(bucketsForDay(index, cell.key), sources);
        const stats = dayStats(b);
        const mood = b.moods[0];
        const moodViz = mood
          ? resolveMoodVisual({
              moodType: mood.moodType,
              emoji: mood.emoji,
              color: mood.color ?? undefined,
            })
          : null;
        const isToday = cell.key === today;
        const isSelected = cell.key === selectedDay;
        return (
          <div
            key={cell.key}
            className={clsx(
              "relative flex flex-col min-h-0 rounded-lg border overflow-hidden transition-colors",
              stats.isPerfect
                ? "border-amber-300/40"
                : isSelected
                ? "border-cyan-300/40 bg-cyan-400/5"
                : "border-white/10 bg-white/[0.03]"
            )}
          >
            <DayAura moodColorToken={moodViz?.color} heat={moodViz ? 0 : stats.heat} />
            {stats.isPerfect && (
              <div
                className="pointer-events-none absolute inset-0"
                style={{ background: perfectGlow }}
              />
            )}

            <button
              onClick={() => onSelectDay(cell.key)}
              className="relative shrink-0 flex items-center justify-between gap-1 px-2 py-2 border-b border-white/10"
            >
              <span className="flex flex-col items-start">
                <span className="text-[10px] uppercase tracking-wider text-slate-500">
                  {format(parseDayKey(cell.key), "EEE")}
                </span>
                <span
                  className={clsx(
                    "mt-0.5 text-sm font-semibold h-7 w-7 flex items-center justify-center rounded-full",
                    isToday ? "bg-cyan-400/20 text-cyan-200 ring-1 ring-cyan-300/60" : "text-slate-200"
                  )}
                >
                  {cell.date.getDate()}
                </span>
              </span>
              <span className="flex items-center gap-1">
                {moodViz && <span className="text-base leading-none">{moodViz.emoji}</span>}
                {stats.habitExpected > 0 && (
                  <HabitProgressRing
                    done={stats.habitDone}
                    total={stats.habitExpected}
                    size={18}
                    strokeWidth={2.5}
                  />
                )}
              </span>
            </button>

            <div
              className="relative flex-1 overflow-y-auto app-scroll min-h-0 p-1 flex flex-col gap-1"
              onClick={() => onSelectDay(cell.key)}
              onDoubleClick={() => onCreateEvent(cell.key)}
            >
              {b.events.map((ev) => {
                const c = getEventColor(ev.color);
                return (
                  <motion.button
                    key={ev.key}
                    whileTap={{ scale: 0.97 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenEvent(ev.id);
                    }}
                    className={clsx("text-left rounded border px-1.5 py-1 text-[11px] leading-tight", c.bar, c.barHover)}
                  >
                    <span className="flex items-center gap-1">
                      <CalendarClock className="h-3 w-3 shrink-0" />
                      <span className="truncate font-medium">{ev.title}</span>
                    </span>
                    <span className="block text-[10px] opacity-80">
                      {ev.allDay ? "All day" : formatClock(ev.startTime)}
                    </span>
                  </motion.button>
                );
              })}

              {b.tasks.map((t) => (
                <div
                  key={`task-${t.id}`}
                  className={clsx(
                    "flex items-center gap-1 rounded border px-1.5 py-1 text-[11px] truncate",
                    SOURCE_ACCENT.task.chip,
                    t.isComplete && "opacity-50 line-through"
                  )}
                >
                  <CheckSquare className="h-3 w-3 shrink-0 text-sky-300" />
                  <span className="truncate">{t.title}</span>
                </div>
              ))}

              {/* Habits only appear once completed for the day. */}
              {b.habits
                .filter((h) => h.checked)
                .map((h) => (
                  <div
                    key={h.key}
                    className="flex items-center gap-1 rounded border border-amber-400/40 bg-amber-500/20 px-1.5 py-1 text-[11px] text-amber-100 truncate"
                  >
                    <Flame className="h-3 w-3 shrink-0 text-amber-300" />
                    <span className="truncate">{h.title}</span>
                  </div>
                ))}

              {b.moods.map((m) => {
                const v = resolveMoodVisual({
                  moodType: m.moodType,
                  emoji: m.emoji,
                  color: m.color ?? undefined,
                });
                return (
                  <div
                    key={`mood-${m.id}`}
                    className="flex items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 py-1 text-[11px]"
                  >
                    <span className="leading-none">{v.emoji}</span>
                    <span className={clsx("truncate", v.classes.label)}>{v.label}</span>
                  </div>
                );
              })}

              {b.notes.map((n) => (
                <div
                  key={`note-${n.id}`}
                  className="flex items-center gap-1 rounded border border-violet-400/20 bg-violet-500/5 px-1.5 py-1 text-[11px] text-violet-200 truncate"
                >
                  <StickyNote className="h-3 w-3 shrink-0 text-violet-300" />
                  <span className="truncate">{n.title}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </motion.div>
  );
}
