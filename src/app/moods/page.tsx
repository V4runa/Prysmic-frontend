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
import { localToday, localDateKey } from "../lib/date";

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
  createdAt?: string;
}

const moodToEmoji: Record<string, string> = {
  joyful: "☀️",
  calm: "🌊",
  focused: "🎯",
  tired: "🌙",
  anxious: "🌪️",
  inspired: "🔮",
  grateful: "🕊️",
  lonely: "🌫️",
  angry: "🔥",
  hopeful: "🌈",
};

const normalizeMoods = (moods: MoodEntry[]): MoodEntry[] =>
  moods
    .map((m) => ({
      ...m,
      date: m.createdAt || m.date || new Date().toISOString(),
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

export default function MoodPage() {
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<MoodPhase>(MoodPhase.PICK);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [saveError, setSaveError] = useState("");

  const todayKey = localToday();

  const {
    data: moodsRaw = [],
    isLoading: loading,
    isError,
  } = useQuery({
    queryKey: ["moods"],
    queryFn: () => apiFetch<MoodEntry[]>("/moods"),
  });

  const timeline = useMemo(() => normalizeMoods(moodsRaw), [moodsRaw]);
  const error = saveError || (isError ? "Failed to load moods." : "");

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
  const handleMoodSelect = (mood: string) => {
    setSelectedMood(mood);
    setPhase(MoodPhase.REFLECT);
  };

  // 🧘 Handle reflection + save mood
  const handleReflectionSubmit = async (note?: string) => {
    try {
      const emoji = selectedMood ? moodToEmoji[selectedMood] : undefined;
      if (!selectedMood || !emoji) throw new Error("Invalid mood selection");

      await apiFetch("/moods", {
        method: "POST",
        body: JSON.stringify({
          moodType: selectedMood,
          emoji,
          note,
          date: todayKey,
        }),
      });

      localStorage.setItem("lastMoodDate", todayKey);
      setPhase(MoodPhase.TIMELINE);
      await queryClient.invalidateQueries({ queryKey: ["moods"] });
    } catch {
      setSaveError("Failed to save mood.");
    }
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
                  moodType={selectedMood!}
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
            <p className="absolute bottom-4 text-sm text-red-400">{error}</p>
          )}
        </GlassPanel>
      </div>
    </PageTransition>
  );
}
