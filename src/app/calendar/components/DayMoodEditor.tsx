"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { Trash2, X, Pencil, Plus } from "lucide-react";
import { apiFetch } from "../../hooks/useApi";
import { useMoodOptions } from "../../hooks/useMoodOptions";
import { calendarQueryKey } from "../../hooks/useCalendar";
import { resolveMoodVisual, moodColor } from "../../lib/moodColors";
import { localToday, logicalToday } from "../../lib/date";
import { tactileSubtle } from "../../lib/motion";
import { CalendarMoodItem } from "../types";
import { TextField } from "../../components/forms";

const sectionTitle =
  "text-[11px] uppercase tracking-widest text-slate-500 font-semibold";

interface DayMoodEditorProps {
  day: string; // YYYY-MM-DD
  mood?: CalendarMoodItem;
}

/**
 * Inline mood logging/editing for a single calendar day. Supports adding a mood
 * to an empty past/today cell and overwriting an existing one. Future days are
 * blocked. Moods set for any day other than the current *logical* day are
 * flagged `backfilled` so they don't inflate the mood streak.
 */
export default function DayMoodEditor({ day, mood }: DayMoodEditorProps) {
  const queryClient = useQueryClient();
  const { data: options = [] } = useMoodOptions();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(mood?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Keep the note field in sync when the selected day (and thus its mood) changes.
  useEffect(() => {
    setNote(mood?.note ?? "");
    setOpen(false);
    setError("");
  }, [day, mood?.id, mood?.note]);

  const isFuture = day > localToday();

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: calendarQueryKey }),
      queryClient.invalidateQueries({ queryKey: ["moods"] }),
    ]);

  const save = async (label: string, emoji: string, color: string) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await apiFetch("/moods", {
        method: "POST",
        body: JSON.stringify({
          moodType: label,
          emoji,
          color,
          note: note.trim() || undefined,
          date: day,
          // Anything not logged on the live logical day is retroactive and must
          // not count toward the streak. Edits to an existing entry keep their
          // original classification server-side regardless of this value.
          backfilled: day !== logicalToday(),
        }),
      });
      await refresh();
      setOpen(false);
    } catch {
      setError("Couldn't save that mood. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!mood || busy) return;
    if (!window.confirm("Remove this day's mood?")) return;
    setBusy(true);
    setError("");
    try {
      await apiFetch(`/moods/${mood.id}`, { method: "DELETE" });
      await refresh();
    } catch {
      setError("Couldn't remove that mood. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const current = mood
    ? resolveMoodVisual({
        moodType: mood.moodType,
        emoji: mood.emoji,
        color: mood.color ?? undefined,
      })
    : null;

  return (
    <section className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className={sectionTitle}>Mood</span>
        {mood?.backfilled && (
          <span className="text-[10px] text-slate-500 italic">added later</span>
        )}
      </div>

      {/* Current mood (if any) */}
      {current && (
        <div
          className={clsx(
            "flex items-center gap-2.5 rounded-lg border px-3 py-2",
            "border-white/10 bg-white/5"
          )}
        >
          <span className="text-lg leading-none">{current.emoji}</span>
          <span className={clsx("text-sm flex-1 truncate", current.classes.label)}>
            {current.label}
          </span>
          <motion.button
            {...tactileSubtle}
            onClick={() => setOpen((o) => !o)}
            aria-label="Change mood"
            className="tap-target flex items-center justify-center p-1.5 rounded-md text-slate-400 hover:text-cyan-300 hover:bg-white/10"
          >
            <Pencil className="h-3.5 w-3.5" />
          </motion.button>
          <motion.button
            {...tactileSubtle}
            onClick={remove}
            disabled={busy}
            aria-label="Remove mood"
            className="tap-target flex items-center justify-center p-1.5 rounded-md text-slate-400 hover:text-rose-300 hover:bg-white/10 disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </motion.button>
        </div>
      )}

      {/* Empty state — offer to log a mood, unless the day is in the future */}
      {!current &&
        (isFuture ? (
          <p className="text-slate-500 text-xs px-1 py-1">
            You can&apos;t log a mood for a future day yet.
          </p>
        ) : (
          <motion.button
            {...tactileSubtle}
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg border border-dashed border-white/15 px-3 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Log a mood for this day
          </motion.button>
        ))}

      {/* Palette + note */}
      <AnimatePresence>
        {open && !isFuture && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-2.5 mt-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  {mood ? "Change mood" : "Pick a mood"}
                </span>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Cancel"
                  className="tap-target p-1 rounded text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                {options.map((o) => {
                  const def = moodColor(o.color);
                  return (
                    <motion.button
                      key={o.id}
                      {...tactileSubtle}
                      disabled={busy}
                      onClick={() => save(o.label, o.emoji, o.color)}
                      title={o.label}
                      className={clsx(
                        "flex flex-col items-center justify-center gap-0.5 rounded-lg p-1.5 border border-white/10 bg-gradient-to-br text-white/90 disabled:opacity-50",
                        def.gradient
                      )}
                    >
                      <span className="text-xl leading-none">{o.emoji}</span>
                      <span className="text-[9px] font-medium truncate max-w-full px-0.5">
                        {o.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              <TextField
                value={note}
                maxLength={280}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note (optional)…"
                className="text-sm"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && <p className="text-rose-400 text-xs px-1">{error}</p>}
    </section>
  );
}
