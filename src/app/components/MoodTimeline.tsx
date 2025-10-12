"use client";

import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

interface MoodEntry {
  id: number;
  moodType?: string;
  note?: string;
  date: string;
  emoji?: string;
}

interface MoodTimelineProps {
  timeline?: MoodEntry[];
}

export default function MoodTimeline({ timeline = [] }: MoodTimelineProps) {
  const moodMeta: Record<
    string,
    { color: string; emoji: string; label: string }
  > = {
    joyful: { color: "amber", emoji: "☀️", label: "Joyful" },
    calm: { color: "cyan", emoji: "🌊", label: "Calm" },
    focused: { color: "blue", emoji: "🎯", label: "Focused" },
    tired: { color: "violet", emoji: "🌙", label: "Tired" },
    anxious: { color: "rose", emoji: "🌪️", label: "Anxious" },
    inspired: { color: "emerald", emoji: "🔮", label: "Inspired" },
    grateful: { color: "yellow", emoji: "🕊️", label: "Grateful" },
    lonely: { color: "slate", emoji: "🌫️", label: "Lonely" },
    angry: { color: "red", emoji: "🔥", label: "Angry" },
    hopeful: { color: "fuchsia", emoji: "🌈", label: "Hopeful" },
  };

  // 🔥 streak logic
  let streak = 0;
  if (timeline.length > 0) {
    for (let i = 0; i < timeline.length; i++) {
      const day = new Date(timeline[i].date);
      const expected = new Date();
      expected.setDate(expected.getDate() - i);
      if (day.toDateString() === expected.toDateString()) streak++;
      else break;
    }
  }

  return (
    <div className="relative w-full flex-1 flex flex-col items-center justify-start overflow-y-auto overflow-x-hidden pt-32 pb-20">
      {/* 🔥 Streak header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="flex flex-col items-center relative z-10 overflow-visible"
      >
        <motion.div
          className="relative text-8xl"
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

        <p className="text-slate-50 mt-6 text-2xl sm:text-3xl font-semibold tracking-wide drop-shadow-[0_0_10px_rgba(255,180,80,0.35)]">
          {streak > 0 ? `${streak}-day streak` : "No current streak"}
        </p>
      </motion.div>

      {/* 🌙 Timeline entries */}
      <div className="relative mx-auto w-full max-w-3xl mt-10 mb-8">
        <div className="absolute left-[5.25rem] top-0 bottom-0 w-[1.5px] bg-gradient-to-b from-white/15 via-white/8 to-transparent rounded-full" />

        <AnimatePresence>
          {timeline.map((mood, i) => {
            const meta = moodMeta[mood.moodType ?? "calm"];
            const color = meta.color;

            let isBreak = false;
            if (i > 0) {
              const prev = new Date(timeline[i - 1].date);
              const current = new Date(mood.date);
              const diff =
                (prev.getTime() - current.getTime()) / (1000 * 60 * 60 * 24);
              if (diff > 1.5) isBreak = true;
            }

            return (
              <motion.div
                key={mood.id}
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: i * 0.05 }}
                className="relative flex items-center gap-6 mb-10 sm:mb-12"
              >
                <div className="text-right text-slate-400 text-xs sm:text-sm w-16 shrink-0">
                  {format(new Date(mood.date), "MMM d")}
                </div>

                <div className="relative w-5 h-full flex items-center justify-center">
                  <motion.div
                    className={`absolute left-1/2 -translate-x-1/2 top-0 h-1/2 w-[2px] ${
                      isBreak
                        ? "bg-slate-700/40"
                        : `bg-gradient-to-b from-${color}-400/50 to-transparent`
                    }`}
                  />
                  <motion.div
                    className={`relative z-10 w-[14px] h-[14px] rounded-full border border-${color}-300/40 bg-${color}-400/70 shadow-[0_0_12px_rgba(255,255,255,0.25)]`}
                    animate={{ scale: [1, 1.12, 1] }}
                    transition={{
                      repeat: Infinity,
                      duration: 3,
                      delay: i * 0.2,
                    }}
                  />
                  <motion.div
                    className={`absolute left-1/2 -translate-x-1/2 bottom-0 h-1/2 w-[2px] ${
                      isBreak
                        ? "bg-slate-700/40"
                        : `bg-gradient-to-t from-${color}-400/40 to-transparent`
                    }`}
                  />
                </div>

                <motion.div
                  className={`flex-1 bg-white/[0.05] border border-white/10 rounded-2xl p-5 sm:p-6 backdrop-blur-md shadow-[0_6px_18px_rgba(0,0,0,0.45)] hover:shadow-${color}-500/30 transition-all duration-300`}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl sm:text-3xl drop-shadow">
                      {meta.emoji}
                    </span>
                    <span
                      className={`text-${color}-300 text-lg sm:text-xl font-semibold tracking-wide`}
                    >
                      {meta.label}
                    </span>
                  </div>
                  {mood.note ? (
                    <p className="text-slate-200 text-sm sm:text-base leading-relaxed">
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
