"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../hooks/useApi";
import GlassPanel from "../components/GlassPanel";
import PageTransition from "../components/PageTransition";
import { AnimatePresence, motion } from "framer-motion";
import MoodPicker from "../components/MoodPicker";
import MoodReflection from "../components/MoodReflection";
import MoodTimeline from "../components/MoodTimeline";
import { calendarDayFromSearch } from "../lib/calendarDay";
import { localDateKey } from "../lib/date";
import { resolveMoodVisual } from "../lib/moodColors";
import { useLogicalToday } from "../hooks/usePreferences";
import { calendarQueryKey } from "../hooks/useCalendar";
import { MoodOption, useMoodOptions } from "../hooks/useMoodOptions";
import { setMoodRoomPreview } from "../hooks/useMoodRoom";
import { useTour } from "../tour/TourProvider";

enum MoodPhase {
  PICK = "pick",
  REFLECT = "reflect",
  TIMELINE = "timeline",
}

export interface MoodEntry {
  id: number;
  moodType?: string;
  note?: string;
  date: string;
  emoji?: string;
  color?: string;
  createdAt?: string;
  // Set when the mood was added retroactively via the calendar; excluded from
  // streak counts on the timeline.
  backfilled?: boolean;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// Anchor each entry to its stored logical day (YYYY-MM-DD) rather than its
// createdAt timestamp, so a mood always sits on the day it represents — this is
// what lets retroactively-added (backfilled) moods land on their past date
// instead of the day they were entered. The date is expanded to a local-midnight
// string so downstream `new Date(date)` parses in local time (a bare
// "YYYY-MM-DD" would be read as UTC and drift a day in western timezones).
const normalizeMoods = (moods: MoodEntry[]): MoodEntry[] =>
  moods
    .map((m) => {
      const dayOnly = DATE_ONLY.test(m.date)
        ? m.date
        : localDateKey(m.date || m.createdAt || new Date().toISOString());
      return { ...m, date: `${dayOnly}T00:00:00` };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

export default function MoodPage() {
  const queryClient = useQueryClient();
  const tour = useTour();
  const searchParams = useSearchParams();
  const focusDay = calendarDayFromSearch(searchParams.toString());
  const [phase, setPhase] = useState<MoodPhase>(MoodPhase.PICK);
  const [selectedMood, setSelectedMood] = useState<MoodOption | null>(null);
  const [replacing, setReplacing] = useState(false);
  // Once someone starts changing today, a refetch must not send them back to the timeline.
  const phaseLocked = useRef(false);

  const todayKey = useLogicalToday();

  useEffect(() => () => setMoodRoomPreview(null), []);

  const {
    data: moodsRaw = [],
    isLoading: loading,
    isError,
  } = useQuery({
    queryKey: ["moods"],
    queryFn: () => apiFetch<MoodEntry[]>("/moods"),
  });

  // Warm the mood palette in parallel with /moods. MoodPicker reads the same
  // cache key, so by the time the picker mounts the options are already here
  // instead of kicking off a second, sequential request.
  useMoodOptions();

  const timeline = useMemo(() => normalizeMoods(moodsRaw), [moodsRaw]);
  const todayEntry = useMemo(
    () => timeline.find((mood) => localDateKey(mood.date) === todayKey) ?? null,
    [timeline, todayKey]
  );
  const error = isError ? "Failed to load moods." : "";

  // 🧠 Detect today's entry and pick the starting phase once moods load.
  useEffect(() => {
    if (loading || phaseLocked.current) return;

    if (focusDay && timeline.some((mood) => localDateKey(mood.date) === focusDay)) {
      setPhase(MoodPhase.TIMELINE);
      return;
    }

    if (timeline.length === 0) {
      setPhase(MoodPhase.PICK);
      return;
    }

    const todayMood = timeline.find((m) => localDateKey(m.date) === todayKey);
    if (todayMood) {
      setPhase(MoodPhase.TIMELINE);
      localStorage.setItem("lastMoodDate", todayKey);
    } else {
      const lastSaved = localStorage.getItem("lastMoodDate");
      if (lastSaved !== todayKey) setPhase(MoodPhase.PICK);
    }
  }, [loading, timeline, todayKey, focusDay]);

  // 🎭 When a mood is picked
  const handleMoodSelect = (mood: MoodOption) => {
    phaseLocked.current = true;
    setMoodRoomPreview(mood.color);
    setSelectedMood(mood);
    setPhase(MoodPhase.REFLECT);
  };

  // 🧘 Handle reflection + save mood.
  // Throws on failure so the reflection screen can surface a retry instead of
  // getting stuck in a "Saving..." state. Retries once to ride out transient
  // failures (cold starts / flaky network) before giving up.
  const beginChange = () => {
    phaseLocked.current = true;
    setMoodRoomPreview(null);
    setReplacing(true);
    setSelectedMood(null);
    setPhase(MoodPhase.PICK);
  };

  const cancelChange = () => {
    setMoodRoomPreview(null);
    setReplacing(false);
    setSelectedMood(null);
    setPhase(MoodPhase.TIMELINE);
  };

  // Same write the calendar day uses: POST /moods upserts the logical day,
  // and an edit keeps the day's original backfilled flag on the server.
  const saveTodayNote = async (note: string) => {
    if (!todayEntry) throw new Error("No mood for today");
    const visual = resolveMoodVisual(todayEntry);
    await apiFetch("/moods", {
      method: "POST",
      body: JSON.stringify({
        moodType: visual.label,
        emoji: visual.emoji,
        color: visual.color,
        note: note.trim(),
        date: todayKey,
        backfilled: false,
      }),
    });
    await queryClient.invalidateQueries({ queryKey: ["moods"] });
    queryClient.invalidateQueries({ queryKey: calendarQueryKey });
  };

  const handleReflectionSubmit = async (note?: string) => {
    if (!selectedMood) throw new Error("Invalid mood selection");

    const trimmed = note?.trim() ?? "";
    // A first log omits an empty note. Changing today sends it, including ""
    // when the note was cleared, so the stored day matches what was written.
    const body = JSON.stringify({
      moodType: selectedMood.label,
      emoji: selectedMood.emoji,
      color: selectedMood.color,
      ...(trimmed || replacing ? { note: trimmed } : {}),
      date: todayKey,
      // Logged for the live logical day, so it counts toward the streak.
      // Edits keep the day's original classification on the server.
      backfilled: false,
    });

    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await apiFetch("/moods", { method: "POST", body });
        lastError = undefined;
        break;
      } catch (err) {
        lastError = err;
        if (attempt === 0) await new Promise((r) => setTimeout(r, 600));
      }
    }
    if (lastError) throw lastError;

    localStorage.setItem("lastMoodDate", todayKey);
    setReplacing(false);
    setPhase(MoodPhase.TIMELINE);
    await queryClient.invalidateQueries({ queryKey: ["moods"] });
    // The calendar shows moods from its own cached feed; refresh it too.
    queryClient.invalidateQueries({ queryKey: calendarQueryKey });
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="flex app-page-h items-center justify-center text-slate-400">
          Loading...
        </div>
      </PageTransition>
    );
  }

  const outerClass =
    "w-full app-page-h flex flex-col items-center px-3 sm:px-6 pt-3 sm:pt-4 pb-4 sm:pb-10";
  const panelClass =
    "app-workspace-moods h-full min-h-0 flex flex-col items-stretch justify-start relative overflow-hidden pb-6";

  return (
    <PageTransition>
      <div data-app-route="/moods" className={outerClass}>
        <GlassPanel className={panelClass}>
          <AnimatePresence mode="wait">
            {/* 🌞 Pick Phase */}
            {phase === MoodPhase.PICK && todayEntry && !replacing ? (
              <div key="mood-quiet" className="h-full w-full flex-1" />
            ) : null}
            {phase === MoodPhase.PICK && (!todayEntry || replacing) && (
              <motion.div
                key="picker"
                initial={tour.overlay ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={tour.overlay ? { opacity: 1 } : { opacity: 0, y: -10 }}
                transition={tour.overlay ? { duration: 0 } : { duration: 0.8, ease: "easeInOut" }}
                className="w-full h-full flex-1"
              >
                <MoodPicker
                  onSelect={handleMoodSelect}
                  onCancel={replacing ? cancelChange : undefined}
                />
              </motion.div>
            )}

            {/* ✍️ Reflection Phase */}
            {phase === MoodPhase.REFLECT && (
              <motion.div
                key="reflect"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                className="w-full h-full flex-1"
              >
                <MoodReflection
                  color={selectedMood?.color}
                  initialNote={replacing ? todayEntry?.note ?? "" : ""}
                  maxLength={replacing ? 280 : 180}
                  skipLabel={replacing ? "Keep note" : "Skip"}
                  onSubmit={handleReflectionSubmit}
                  onSkip={() =>
                    handleReflectionSubmit(replacing ? todayEntry?.note : undefined)
                  }
                />
              </motion.div>
            )}

            {/* 📈 Timeline Phase */}
            {phase === MoodPhase.TIMELINE ? (
              <motion.div
                key="timeline"
                initial={tour.overlay ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={tour.overlay ? { opacity: 1 } : { opacity: 0 }}
                transition={tour.overlay ? { duration: 0 } : { duration: 1.0, ease: "easeOut" }}
                className="h-full min-h-0 w-full min-w-0 flex-1"
              >
                <MoodTimeline
                  timeline={timeline}
                  focusDay={focusDay}
                  onChangeToday={todayEntry ? beginChange : undefined}
                  onSaveTodayNote={todayEntry ? saveTodayNote : undefined}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>

          {error && (
            <p className="absolute left-1/2 -translate-x-1/2 bottom-4 text-sm text-red-400">
              {error}
            </p>
          )}
        </GlassPanel>
      </div>
    </PageTransition>
  );
}
