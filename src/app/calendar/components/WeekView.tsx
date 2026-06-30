"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { format } from "date-fns";
import { CalendarClock, StickyNote, Flame, CheckSquare } from "lucide-react";
import {
  bucketsForDay,
  CalendarIndex,
  formatClock,
  parseDayKey,
  weekDays,
} from "../lib/calendarLib";
import { getEventColor, SOURCE_ACCENT } from "../../lib/calendarColors";
import { resolveMoodVisual } from "../../lib/moodColors";
import { localToday } from "../../lib/date";

interface WeekViewProps {
  anchor: string;
  index: CalendarIndex;
  selectedDay: string;
  onSelectDay: (day: string) => void;
  onCreateEvent: (date: string) => void;
  onOpenEvent: (eventId: number) => void;
}

export default function WeekView({
  anchor,
  index,
  selectedDay,
  onSelectDay,
  onCreateEvent,
  onOpenEvent,
}: WeekViewProps) {
  const days = useMemo(() => weekDays(anchor), [anchor]);
  const today = localToday();

  return (
    <div className="flex-1 grid grid-cols-7 gap-1 min-h-0">
      {days.map((cell) => {
        const b = bucketsForDay(index, cell.key);
        const isToday = cell.key === today;
        const isSelected = cell.key === selectedDay;
        return (
          <div
            key={cell.key}
            className={clsx(
              "flex flex-col min-h-0 rounded-lg border transition-colors",
              isSelected ? "border-cyan-300/40 bg-cyan-400/5" : "border-white/10 bg-white/[0.03]"
            )}
          >
            <button
              onClick={() => onSelectDay(cell.key)}
              className="shrink-0 flex flex-col items-center py-2 border-b border-white/10"
            >
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
            </button>

            <div
              className="flex-1 overflow-y-auto app-scroll min-h-0 p-1 flex flex-col gap-1"
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
    </div>
  );
}
