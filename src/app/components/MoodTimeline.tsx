"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import clsx from "clsx";
import { calendarDayHref } from "../lib/calendarDay";
import { localDateKey, prevDayKey } from "../lib/date";
import { useLogicalToday } from "../hooks/usePreferences";
import { resolveMoodVisual } from "../lib/moodColors";
import { TextArea } from "./forms";

interface MoodEntry {
  id: number;
  moodType?: string;
  note?: string;
  date: string;
  emoji?: string;
  color?: string;
  // Moods added retroactively through the calendar don't count toward streaks.
  backfilled?: boolean;
}

interface MoodTimelineProps {
  timeline?: MoodEntry[];
  /** YYYY-MM-DD to bring into view when opening a mood from the calendar. */
  focusDay?: string | null;
  /** Open the picker again so today's mood can be replaced. */
  onChangeToday?: () => void;
  /** Save a new note for today without changing the mood. */
  onSaveTodayNote?: (note: string) => Promise<void>;
}

export default function MoodTimeline({
  timeline = [],
  focusDay = null,
  onChangeToday,
  onSaveTodayNote,
}: MoodTimelineProps) {
  const today = useLogicalToday();
  // Count consecutive logical days that have at least one *organically logged*
  // mood entry, walking backwards from the current logical day.
  // Backfilled entries — moods added retroactively through the calendar — are
  // excluded so filling in the past can't manufacture a streak. Using a Set of
  // local-day keys keeps this robust to multiple entries on the same day. A
  // one-day grace applies: if today isn't logged yet, the streak earned through
  // yesterday still counts (it only breaks once a full day is missed).
  const loggedDays = new Set(
    timeline.filter((m) => !m.backfilled).map((m) => localDateKey(m.date))
  );
  let streak = 0;
  if (loggedDays.size > 0) {
    let cursor = today;
    if (!loggedDays.has(cursor)) {
      cursor = prevDayKey(cursor);
    }
    while (loggedDays.has(cursor)) {
      streak += 1;
      cursor = prevDayKey(cursor);
    }
  }

  useEffect(() => {
    if (!focusDay) return;
    const match = timeline.find((mood) => localDateKey(mood.date) === focusDay);
    if (!match) return;
    document.getElementById(`mood-${match.id}`)?.scrollIntoView({ block: "center" });
  }, [focusDay, timeline]);

  return (
    <div className="app-scroll relative flex h-full min-h-0 w-full min-w-0 flex-col items-center justify-start overflow-y-auto overflow-x-hidden pt-10 pb-24 sm:pt-32 sm:pb-20">
      {/* 🔥 Streak header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="flex flex-col items-center relative z-10 overflow-visible"
      >
        <motion.div
          className="relative text-6xl sm:text-8xl"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{
            repeat: Infinity,
            duration: 3.8,
            ease: "easeInOut",
          }}
        >
          <span className="relative z-10">🔥</span>
          <span className="absolute inset-[-70px] blur-[100px] opacity-70 bg-[radial-gradient(circle,rgba(255,150,0,0.55)_0%,rgba(0,0,0,0)_85%)]" />
        </motion.div>

        <p className="mt-6 max-w-full px-4 text-center text-2xl font-semibold tracking-wide text-slate-50 drop-shadow-[0_0_10px_rgba(255,180,80,0.35)] sm:text-3xl">
          {streak > 0 ? `${streak}-day streak` : "No current streak"}
        </p>
      </motion.div>

      {/* 🌙 Timeline entries */}
      <div className="relative mx-auto mb-8 mt-8 w-full min-w-0 max-w-3xl sm:mt-10">
        <div className="pointer-events-none absolute bottom-0 left-[calc(3.25rem+0.75rem+0.625rem)] top-0 w-[1.5px] -translate-x-1/2 rounded-full bg-gradient-to-b from-white/15 via-white/8 to-transparent sm:left-[5.25rem]" />

        <AnimatePresence>
          {timeline.map((mood, i) => {
            const meta = resolveMoodVisual(mood);
            const cc = meta.classes;

            let isBreak = false;
            if (i > 0) {
              const prev = new Date(timeline[i - 1].date);
              const current = new Date(mood.date);
              const diff =
                (prev.getTime() - current.getTime()) / (1000 * 60 * 60 * 24);
              if (diff > 1.5) isBreak = true;
            }

            const dayKey = localDateKey(mood.date);
            const focused = focusDay === dayKey;
            const isToday = dayKey === today;

            return (
              <motion.div
                key={mood.id}
                id={`mood-${mood.id}`}
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: i * 0.05 }}
                className="relative mb-8 grid w-full min-w-0 grid-cols-[3.25rem_1.25rem_minmax(0,1fr)] items-center gap-x-3 sm:mb-12 sm:grid-cols-[4rem_1.25rem_minmax(0,1fr)] sm:gap-x-6"
              >
                <Link
                  href={calendarDayHref(dayKey)}
                  title="Open this day on the calendar"
                  className="tap-target inline-flex w-full min-w-0 items-center justify-end text-right text-xs leading-tight text-slate-400 hover:text-cyan-300 hover:underline sm:text-sm"
                >
                  {format(new Date(mood.date), "MMM d")}
                </Link>

                <div className="relative flex h-full w-full shrink-0 items-center justify-center">
                  <motion.div
                    className={`absolute left-1/2 -translate-x-1/2 top-0 h-1/2 w-[2px] ${
                      isBreak ? "bg-slate-700/40" : cc.lineTop
                    }`}
                  />
                  <motion.div
                    className={`relative z-10 w-[14px] h-[14px] rounded-full border ${cc.dot} shadow-[0_0_12px_rgba(255,255,255,0.25)]`}
                    animate={{ scale: [1, 1.12, 1] }}
                    transition={{
                      repeat: Infinity,
                      duration: 3,
                      delay: i * 0.2,
                    }}
                  />
                  <motion.div
                    className={`absolute left-1/2 -translate-x-1/2 bottom-0 h-1/2 w-[2px] ${
                      isBreak ? "bg-slate-700/40" : cc.lineBottom
                    }`}
                  />
                </div>

                <motion.div
                  className={clsx(
                    "min-w-0 bg-white/[0.05] border border-white/10 rounded-2xl p-3 sm:p-6 backdrop-blur-md shadow-[0_6px_18px_rgba(0,0,0,0.45)] transition-all duration-300",
                    cc.cardHover,
                    focused && "ring-1 ring-cyan-300/50"
                  )}
                  whileHover={isToday ? undefined : { scale: 1.02, y: -2 }}
                >
                  <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 sm:flex-nowrap sm:justify-between">
                    <div className="flex min-w-0 max-w-full flex-[1_1_100%] flex-wrap items-center gap-x-2.5 gap-y-0.5 sm:flex-1 sm:flex-nowrap sm:gap-3">
                      <span className="shrink-0 text-2xl leading-none drop-shadow sm:text-3xl sm:leading-9">
                        {meta.emoji}
                      </span>
                      <span
                        className={clsx(
                          cc.label,
                          "min-w-0 flex-[1_1_7.5rem] break-words hyphens-auto text-lg font-semibold tracking-wide sm:text-xl"
                        )}
                      >
                        {meta.label}
                      </span>
                    </div>
                    {isToday && onChangeToday && (
                      <button
                        type="button"
                        onClick={onChangeToday}
                        className="tap-target inline-flex shrink-0 items-center text-sm text-cyan-300 hover:underline"
                      >
                        Change mood
                      </button>
                    )}
                  </div>
                  {isToday && onSaveTodayNote ? (
                    <TodayNote note={mood.note} onSave={onSaveTodayNote} />
                  ) : mood.note ? (
                    <p className="selectable-text min-w-0 break-words hyphens-auto text-sm leading-relaxed text-slate-200 sm:text-base">
                      {mood.note}
                    </p>
                  ) : (
                    <p className="text-slate-600 italic text-sm mt-1">
                      No reflection
                    </p>
                  )}
                </motion.div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

function TodayNote({
  note,
  onSave,
}: {
  note?: string;
  onSave: (note: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!editing) {
    return (
      <div className="flex w-full min-w-0 flex-col items-start gap-2">
        {note ? (
          <p className="selectable-text min-w-0 break-words hyphens-auto text-sm leading-relaxed text-slate-200 sm:text-base">
            {note}
          </p>
        ) : (
          <p className="text-slate-600 italic text-sm mt-1">No reflection</p>
        )}
        <button
          type="button"
          onClick={() => {
            setDraft(note ?? "");
            setError("");
            setEditing(true);
          }}
          className="tap-target inline-flex items-center text-sm text-slate-400 hover:text-slate-200"
        >
          Edit note
        </button>
      </div>
    );
  }

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await onSave(draft);
      setEditing(false);
    } catch {
      setError("Couldn't save that note. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex w-full min-w-0 flex-col items-start gap-2">
      <TextArea
        value={draft}
        maxLength={280}
        rows={3}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="A few words about today..."
        aria-label="Note for today"
        className="text-left"
      />
      {error && (
        <p role="alert" className="text-sm text-rose-400">
          {error}
        </p>
      )}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="tap-target inline-flex items-center text-sm text-cyan-300 hover:underline disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save note"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          disabled={saving}
          className="tap-target inline-flex items-center text-sm text-slate-400 hover:text-slate-200 disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
