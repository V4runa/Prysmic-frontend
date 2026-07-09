"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../hooks/useApi";
import GlassPanel from "../components/GlassPanel";
import PageTransition from "../components/PageTransition";
import { AnimatePresence, motion } from "framer-motion";
import MoodPicker from "../components/MoodPicker";
import MoodReflection from "../components/MoodReflection";
import MoodTimeline from "../components/MoodTimeline";
import { logicalToday, localDateKey } from "../lib/date";
import { calendarQueryKey } from "../hooks/useCalendar";
import { MoodOption, useMoodOptions } from "../hooks/useMoodOptions";

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
  const [phase, setPhase] = useState<MoodPhase>(MoodPhase.PICK);
  const [selectedMood, setSelectedMood] = useState<MoodOption | null>(null);

  const todayKey = logicalToday();

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
  const error = isError ? "Failed to load moods." : "";

  // 🧠 Detect today's entry and pick the starting phase once moods load.
  useEffect(() => {
    if (loading) return;

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
  }, [loading, timeline, todayKey]);

  // 🎭 When a mood is picked
  const handleMoodSelect = (mood: MoodOption) => {
    setSelectedMood(mood);
    setPhase(MoodPhase.REFLECT);
  };

  // 🧘 Handle reflection + save mood.
  // Throws on failure so the reflection screen can surface a retry instead of
  // getting stuck in a "Saving..." state. Retries once to ride out transient
  // failures (cold starts / flaky network) before giving up.
  const handleReflectionSubmit = async (note?: string) => {
    if (!selectedMood) throw new Error("Invalid mood selection");

    const body = JSON.stringify({
      moodType: selectedMood.label,
      emoji: selectedMood.emoji,
      color: selectedMood.color,
      note,
      date: todayKey,
      // Logged for the live logical day, so it counts toward the streak.
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
    "w-full max-w-[1200px] h-full min-h-0 flex flex-col items-stretch justify-start relative overflow-hidden pb-6";

  return (
    <PageTransition>
      <div className={outerClass}>
        <GlassPanel className={panelClass}>
          <AnimatePresence mode="wait">
            {/* 🌞 Pick Phase */}
            {phase === MoodPhase.PICK && (
              <motion.div
                key="picker"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                className="w-full h-full flex-1"
              >
                <MoodPicker onSelect={handleMoodSelect} />
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
                  onSubmit={handleReflectionSubmit}
                  onSkip={() => handleReflectionSubmit()}
                />
              </motion.div>
            )}

            {/* 📈 Timeline Phase */}
            {phase === MoodPhase.TIMELINE && (
              <motion.div
                key="timeline"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.0, ease: "easeOut" }}
                className="w-full h-full flex-1"
              >
                <MoodTimeline timeline={timeline} />
              </motion.div>
            )}
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
