"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../hooks/useApi";
import GlassPanel from "../components/GlassPanel";
import PageTransition from "../components/PageTransition";
import { AnimatePresence, motion } from "framer-motion";
import MoodPicker from "../components/MoodPicker";
import MoodReflection from "../components/MoodReflection";
import MoodTimeline from "../components/MoodTimeline";

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

const normalizeMoods = (moods: any[]): MoodEntry[] =>
  moods
    .map((m) => ({
      ...m,
      date: m.createdAt || m.date || new Date().toISOString(),
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

export default function MoodPage() {
  const [phase, setPhase] = useState<MoodPhase>(MoodPhase.PICK);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const todayKey = new Date().toLocaleDateString("en-CA");

  useEffect(() => {
    (async () => {
      try {
        const moods = await apiFetch<MoodEntry[]>("/moods");
        const normalized = normalizeMoods(moods);
        setTimeline(normalized);

        if (normalized.length === 0) {
          setPhase(MoodPhase.PICK);
          return;
        }

        const todayMood = normalized.find((m) =>
          m.date.startsWith(todayKey)
        );
        if (todayMood) {
          setPhase(MoodPhase.TIMELINE);
          localStorage.setItem("lastMoodDate", todayKey);
        } else {
          const lastSaved = localStorage.getItem("lastMoodDate");
          if (lastSaved !== todayKey) setPhase(MoodPhase.PICK);
        }
      } catch {
        setError("Failed to load moods.");
      } finally {
        setLoading(false);
      }
    })();
  }, [todayKey]);

  const handleMoodSelect = (mood: string) => {
    setSelectedMood(mood);
    setPhase(MoodPhase.REFLECT);
  };

  const handleReflectionSubmit = async (note?: string) => {
    try {
      const emoji = selectedMood ? moodToEmoji[selectedMood] : undefined;
      if (!selectedMood || !emoji) throw new Error("Invalid mood selection");

      await apiFetch("/moods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moodType: selectedMood,
          emoji,
          note,
        }),
      });

      localStorage.setItem("lastMoodDate", todayKey);

      const updated = await apiFetch<MoodEntry[]>("/moods");
      const normalized = normalizeMoods(updated);
      setTimeline(normalized);
      setPhase(MoodPhase.TIMELINE);
    } catch {
      setError("Failed to save mood.");
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="flex h-[calc(100vh-3rem)] items-center justify-center text-slate-400">
          Loading...
        </div>
      </PageTransition>
    );
  }

  const outerClass =
    "w-full min-h-[calc(100vh-1rem)] flex items-start justify-center px-6 pt-4 pb-10";
  const panelClass =
    "w-full max-w-[1200px] min-h-[700px] flex flex-col items-stretch justify-start relative overflow-hidden pb-6 mb-4";

  return (
    <PageTransition>
      <div className={outerClass}>
        <GlassPanel className={panelClass}>
          <AnimatePresence mode="wait">
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
