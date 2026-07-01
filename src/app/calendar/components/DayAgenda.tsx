"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import clsx from "clsx";
import {
  CalendarClock,
  CheckSquare,
  Square,
  StickyNote,
  Plus,
  MapPin,
  Link2,
  CalendarPlus,
  Sparkles,
} from "lucide-react";
import { DayBuckets, dayLabel, dayStats, formatClock } from "../lib/calendarLib";
import { CalendarHabitItem } from "../types";
import { getEventColor, SOURCE_ACCENT } from "../../lib/calendarColors";
import { resolveMoodVisual } from "../../lib/moodColors";
import { habitIconMap, IconKey } from "../../components/habitIcons";
import { calendarQueryKey, quickAddTask, toggleHabitCheck } from "../../hooks/useCalendar";
import { tactileRow, tactileSubtle } from "../../lib/motion";
import { TextField } from "../../components/forms";
import HabitProgressRing from "./HabitProgressRing";

interface DayAgendaProps {
  day: string;
  buckets: DayBuckets;
  onOpenEvent: (eventId: number) => void;
  onCreateEvent: (date: string) => void;
}

const sectionTitle = "text-[11px] uppercase tracking-widest text-slate-500 font-semibold";

export default function DayAgenda({
  day,
  buckets,
  onOpenEvent,
  onCreateEvent,
}: DayAgendaProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [taskTitle, setTaskTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [pendingHabit, setPendingHabit] = useState<number | null>(null);

  const { events, tasks, habits, moods, notes } = buckets;
  const stats = dayStats(buckets);
  const isEmpty =
    !events.length && !tasks.length && !habits.length && !moods.length && !notes.length;

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: calendarQueryKey }),
      queryClient.invalidateQueries({ queryKey: ["habits"] }),
      queryClient.invalidateQueries({ queryKey: ["tasks"] }),
    ]);

  const handleAddTask = async () => {
    const title = taskTitle.trim();
    if (!title) return;
    setAdding(true);
    try {
      await quickAddTask(title, day);
      setTaskTitle("");
      await invalidate();
    } finally {
      setAdding(false);
    }
  };

  const handleToggleHabit = async (habit: CalendarHabitItem) => {
    setPendingHabit(habit.id);
    try {
      await toggleHabitCheck(habit.id, day);
      await invalidate();
    } finally {
      setPendingHabit(null);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h3 className="text-slate-100 font-semibold leading-tight">{dayLabel(day)}</h3>
          {stats.isPerfect && (
            <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-200">
              <Sparkles className="h-3.5 w-3.5" />
              Perfect day — every habit honoured
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {stats.habitExpected > 0 && (
            <HabitProgressRing
              done={stats.habitDone}
              total={stats.habitExpected}
              size={34}
              strokeWidth={3}
              showLabel
            />
          )}
          <motion.button
            {...tactileSubtle}
            onClick={() => onCreateEvent(day)}
            aria-label="New event on this day"
            className="tap-target flex items-center justify-center p-1.5 rounded-md border border-cyan-300/20 text-cyan-300 hover:bg-cyan-400/10"
          >
            <CalendarPlus className="h-4 w-4" />
          </motion.button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto app-scroll min-h-0 -mr-1 pr-1 flex flex-col gap-4">
        {isEmpty && (
          <p className="text-slate-500 text-sm py-6 text-center">
            Nothing here yet. Add an event or task to begin.
          </p>
        )}

        {/* Events */}
        {events.length > 0 && (
          <section className="flex flex-col gap-1.5">
            <span className={sectionTitle}>Events</span>
            {events.map((ev) => {
              const c = getEventColor(ev.color);
              return (
                <motion.button
                  key={ev.key}
                  {...tactileRow}
                  onClick={() => onOpenEvent(ev.id)}
                  className={clsx(
                    "text-left flex items-start gap-2.5 rounded-lg border px-3 py-2 transition hover:brightness-110 hover:shadow-lg hover:shadow-black/25",
                    c.chip
                  )}
                >
                  <CalendarClock className={clsx("h-4 w-4 mt-0.5 shrink-0", c.text)} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-100 truncate">
                      {ev.title}
                    </span>
                    <span className="block text-xs text-slate-400">
                      {ev.allDay
                        ? "All day"
                        : `${formatClock(ev.startTime)}${
                            ev.endTime ? ` – ${formatClock(ev.endTime)}` : ""
                          }`}
                      {ev.recurrence !== "none" && " · repeats"}
                    </span>
                    {ev.location && (
                      <span className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                        <MapPin className="h-3 w-3" /> {ev.location}
                      </span>
                    )}
                    {ev.linked && (
                      <span className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                        <Link2 className="h-3 w-3" /> {ev.linked.title}
                      </span>
                    )}
                  </span>
                </motion.button>
              );
            })}
          </section>
        )}

        {/* Tasks */}
        {tasks.length > 0 && (
          <section className="flex flex-col gap-1.5">
            <span className={sectionTitle}>Tasks due</span>
            {tasks.map((t) => (
              <motion.button
                key={`task-${t.id}`}
                {...tactileRow}
                onClick={() => router.push("/tasks")}
                className={clsx(
                  "text-left flex items-center gap-2.5 rounded-lg border px-3 py-2 transition hover:brightness-110 hover:shadow-lg hover:shadow-black/25",
                  SOURCE_ACCENT.task.chip,
                  t.isComplete && "opacity-50"
                )}
              >
                {t.isComplete ? (
                  <CheckSquare className="h-4 w-4 shrink-0 text-sky-300" />
                ) : (
                  <Square className="h-4 w-4 shrink-0 text-sky-300" />
                )}
                <span
                  className={clsx(
                    "text-sm text-slate-100 truncate",
                    t.isComplete && "line-through"
                  )}
                >
                  {t.title}
                </span>
              </motion.button>
            ))}
          </section>
        )}

        {/* Habits */}
        {habits.length > 0 && (
          <section className="flex flex-col gap-1.5">
            <span className={sectionTitle}>Habits</span>
            {habits.map((h) => {
              const Icon = habitIconMap[(h.icon as IconKey) ?? "flame"] ?? habitIconMap.flame;
              return (
                <motion.button
                  key={h.key}
                  {...tactileRow}
                  onClick={() => handleToggleHabit(h)}
                  disabled={pendingHabit === h.id}
                  className={clsx(
                    "text-left flex items-center gap-2.5 rounded-lg border px-3 py-2 transition disabled:opacity-60 hover:shadow-lg hover:shadow-black/25",
                    h.checked
                      ? "bg-amber-500/15 border-amber-400/40"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  )}
                >
                  <span
                    className={clsx(
                      "flex items-center justify-center h-6 w-6 rounded-full border shrink-0 transition",
                      h.checked
                        ? "bg-amber-400/30 border-amber-300/60"
                        : "border-amber-300/30"
                    )}
                  >
                    <Icon
                      className={clsx(
                        "h-3.5 w-3.5",
                        h.checked ? "text-amber-200" : "text-amber-300/70"
                      )}
                    />
                  </span>
                  <span
                    className={clsx(
                      "text-sm truncate flex-1",
                      h.checked ? "text-amber-100" : "text-slate-200"
                    )}
                  >
                    {h.title}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {h.checked ? "Done" : "Tap to check"}
                  </span>
                </motion.button>
              );
            })}
          </section>
        )}

        {/* Mood */}
        {moods.length > 0 && (
          <section className="flex flex-col gap-1.5">
            <span className={sectionTitle}>Mood</span>
            {moods.map((m) => {
              const v = resolveMoodVisual({
                moodType: m.moodType,
                emoji: m.emoji,
                color: m.color ?? undefined,
              });
              return (
                <motion.button
                  key={`mood-${m.id}`}
                  {...tactileRow}
                  onClick={() => router.push("/moods")}
                  className="text-left flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10 transition hover:shadow-lg hover:shadow-black/25"
                >
                  <span className="text-lg leading-none">{v.emoji}</span>
                  <span className={clsx("text-sm", v.classes.label)}>{v.label}</span>
                </motion.button>
              );
            })}
          </section>
        )}

        {/* Notes */}
        {notes.length > 0 && (
          <section className="flex flex-col gap-1.5">
            <span className={sectionTitle}>Notes</span>
            {notes.map((n) => (
              <motion.button
                key={`note-${n.id}`}
                {...tactileRow}
                onClick={() => router.push(`/notes/${n.id}`)}
                className="text-left flex items-center gap-2.5 rounded-lg border border-violet-400/20 bg-violet-500/5 px-3 py-2 hover:bg-violet-500/10 transition hover:shadow-lg hover:shadow-black/25"
              >
                <StickyNote className="h-4 w-4 shrink-0 text-violet-300" />
                <span className="text-sm text-slate-200 truncate">{n.title}</span>
              </motion.button>
            ))}
          </section>
        )}
      </div>

      {/* Quick-add task */}
      <div className="pt-3 mt-3 border-t border-white/10 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <TextField
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddTask();
            }}
            placeholder="Quick-add a task for this day…"
          />
        </div>
        <motion.button
          {...tactileSubtle}
          onClick={handleAddTask}
          disabled={adding || !taskTitle.trim()}
          aria-label="Add task"
          className="tap-target flex items-center justify-center p-2 rounded-md bg-sky-500/15 border border-sky-400/30 text-sky-200 hover:bg-sky-500/25 disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
        </motion.button>
      </div>
    </div>
  );
}
