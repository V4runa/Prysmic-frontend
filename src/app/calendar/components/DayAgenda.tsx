"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import clsx from "clsx";
import {
  CalendarClock,
  CheckCircle2,
  Square,
  StickyNote,
  Plus,
  MapPin,
  Link2,
  CalendarPlus,
  Sparkles,
} from "lucide-react";
import {
  DayBuckets,
  dayLabel,
  dayStats,
  filterBuckets,
  formatClock,
  SourceFilter,
  taskChipKey,
  taskDoneToggleLabel,
  taskSectionTitle,
} from "../lib/calendarLib";
import { CalendarHabitItem } from "../types";
import { getEventColor, SOURCE_ACCENT } from "../../lib/calendarColors";
import { habitIconMap, IconKey } from "../../components/habitIcons";
import { calendarQueryKey, quickAddTask, toggleHabitCheck } from "../../hooks/useCalendar";
import { useToggleCalendarTask } from "../../hooks/taskCompletionSync";
import { tactileRow, tactileSubtle } from "../../lib/motion";
import { TextField } from "../../components/forms";
import HabitProgressRing from "./HabitProgressRing";
import DayMoodEditor from "./DayMoodEditor";
import { usePreferences } from "../../hooks/usePreferences";

interface DayAgendaProps {
  day: string;
  buckets: DayBuckets;
  /** Same source lens as the month and week grids. */
  sources: SourceFilter;
  onOpenEvent: (eventId: number) => void;
  onCreateEvent: (date: string) => void;
}

const sectionTitle = "text-[11px] uppercase tracking-widest text-slate-500 font-semibold";

export default function DayAgenda({
  day,
  buckets,
  sources,
  onOpenEvent,
  onCreateEvent,
}: DayAgendaProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { clockFormat } = usePreferences();
  const [taskTitle, setTaskTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [pendingHabit, setPendingHabit] = useState<number | null>(null);
  const { pendingId: pendingTask, toggleTask } = useToggleCalendarTask();

  const visible = filterBuckets(buckets, sources);
  const { events, tasks, habits, moods, notes } = visible;
  const stats = dayStats(visible);
  const isEmpty =
    !events.length && !tasks.length && !habits.length && !moods.length && !notes.length;
  const dayIsEmpty =
    !buckets.events.length &&
    !buckets.tasks.length &&
    !buckets.habits.length &&
    !buckets.moods.length &&
    !buckets.notes.length;

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
            {dayIsEmpty
              ? "Nothing here yet. Add an event or task to begin."
              : "Nothing in this day matches the filters."}
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
                        : `${formatClock(ev.startTime, clockFormat)}${
                            ev.endTime ? ` – ${formatClock(ev.endTime, clockFormat)}` : ""
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
            <span className={sectionTitle}>{taskSectionTitle(tasks)}</span>
            {tasks.map((t) => (
              <motion.div
                key={taskChipKey(t, day)}
                {...tactileRow}
                className={clsx(
                  "flex items-center gap-2.5 rounded-lg border px-3 py-2 transition hover:brightness-110 hover:shadow-lg hover:shadow-black/25",
                  t.isComplete
                    ? "bg-green-500/10 border-green-400/30"
                    : SOURCE_ACCENT.task.chip
                )}
              >
                <button
                  type="button"
                  onClick={() => void toggleTask(t)}
                  disabled={pendingTask === t.id}
                  aria-pressed={t.isComplete}
                  aria-label={taskDoneToggleLabel(t.title, t.isComplete)}
                  className="tap-target flex shrink-0 items-center justify-center rounded-sm disabled:opacity-50"
                >
                  {t.isComplete ? (
                    <CheckCircle2 className="h-4 w-4 text-green-400" aria-hidden="true" />
                  ) : (
                    <Square className="h-4 w-4 text-sky-300" aria-hidden="true" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/tasks")}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span
                      className={clsx(
                        "relative inline-block max-w-full truncate text-sm",
                        t.isComplete ? "text-green-300/70" : "text-slate-100"
                      )}
                    >
                      {t.title}
                      {t.isComplete && (
                        <span
                          className="pointer-events-none absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-green-400"
                          aria-hidden="true"
                        />
                      )}
                    </span>
                  </span>
                  {t.isComplete && (
                    <span className="ml-auto shrink-0 text-[11px] font-medium text-green-300/80">
                      Completed
                    </span>
                  )}
                </button>
              </motion.div>
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

        {/* Mood — inline editor so moods can be logged/updated retroactively.
            Hidden with the rest of the mood layer when that filter is off. */}
        {sources.mood && <DayMoodEditor day={day} mood={moods[0]} />}

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
