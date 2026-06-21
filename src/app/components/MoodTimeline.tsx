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

interface MoodColorClasses {
  lineTop: string;
  lineBottom: string;
  dot: string;
  label: string;
  cardHover: string;
}

// Fully-spelled per-color classes; Tailwind v4 can't compile `bg-${color}`.
const moodColorClasses: Record<string, MoodColorClasses> = {
  amber: { lineTop: "bg-gradient-to-b from-amber-400/50 to-transparent", lineBottom: "bg-gradient-to-t from-amber-400/40 to-transparent", dot: "border-amber-300/40 bg-amber-400/70", label: "text-amber-300", cardHover: "hover:shadow-amber-500/30" },
  cyan: { lineTop: "bg-gradient-to-b from-cyan-400/50 to-transparent", lineBottom: "bg-gradient-to-t from-cyan-400/40 to-transparent", dot: "border-cyan-300/40 bg-cyan-400/70", label: "text-cyan-300", cardHover: "hover:shadow-cyan-500/30" },
  blue: { lineTop: "bg-gradient-to-b from-blue-400/50 to-transparent", lineBottom: "bg-gradient-to-t from-blue-400/40 to-transparent", dot: "border-blue-300/40 bg-blue-400/70", label: "text-blue-300", cardHover: "hover:shadow-blue-500/30" },
  violet: { lineTop: "bg-gradient-to-b from-violet-400/50 to-transparent", lineBottom: "bg-gradient-to-t from-violet-400/40 to-transparent", dot: "border-violet-300/40 bg-violet-400/70", label: "text-violet-300", cardHover: "hover:shadow-violet-500/30" },
  rose: { lineTop: "bg-gradient-to-b from-rose-400/50 to-transparent", lineBottom: "bg-gradient-to-t from-rose-400/40 to-transparent", dot: "border-rose-300/40 bg-rose-400/70", label: "text-rose-300", cardHover: "hover:shadow-rose-500/30" },
  emerald: { lineTop: "bg-gradient-to-b from-emerald-400/50 to-transparent", lineBottom: "bg-gradient-to-t from-emerald-400/40 to-transparent", dot: "border-emerald-300/40 bg-emerald-400/70", label: "text-emerald-300", cardHover: "hover:shadow-emerald-500/30" },
  yellow: { lineTop: "bg-gradient-to-b from-yellow-400/50 to-transparent", lineBottom: "bg-gradient-to-t from-yellow-400/40 to-transparent", dot: "border-yellow-300/40 bg-yellow-400/70", label: "text-yellow-300", cardHover: "hover:shadow-yellow-500/30" },
  slate: { lineTop: "bg-gradient-to-b from-slate-400/50 to-transparent", lineBottom: "bg-gradient-to-t from-slate-400/40 to-transparent", dot: "border-slate-300/40 bg-slate-400/70", label: "text-slate-300", cardHover: "hover:shadow-slate-500/30" },
  red: { lineTop: "bg-gradient-to-b from-red-400/50 to-transparent", lineBottom: "bg-gradient-to-t from-red-400/40 to-transparent", dot: "border-red-300/40 bg-red-400/70", label: "text-red-300", cardHover: "hover:shadow-red-500/30" },
  fuchsia: { lineTop: "bg-gradient-to-b from-fuchsia-400/50 to-transparent", lineBottom: "bg-gradient-to-t from-fuchsia-400/40 to-transparent", dot: "border-fuchsia-300/40 bg-fuchsia-400/70", label: "text-fuchsia-300", cardHover: "hover:shadow-fuchsia-500/30" },
};

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
    <div className="app-scroll relative w-full h-full min-h-0 flex flex-col items-center justify-start overflow-y-auto overflow-x-hidden pt-16 sm:pt-32 pb-24 sm:pb-20 px-2 sm:px-0">
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

        <p className="text-slate-50 mt-6 text-2xl sm:text-3xl font-semibold tracking-wide drop-shadow-[0_0_10px_rgba(255,180,80,0.35)]">
          {streak > 0 ? `${streak}-day streak` : "No current streak"}
        </p>
      </motion.div>

      {/* 🌙 Timeline entries */}
      <div className="relative mx-auto w-full max-w-3xl mt-8 sm:mt-10 mb-8 px-1 sm:px-0">
        <div className="absolute left-[4.5rem] sm:left-[5.25rem] top-0 bottom-0 w-[1.5px] bg-gradient-to-b from-white/15 via-white/8 to-transparent rounded-full" />

        <AnimatePresence>
          {timeline.map((mood, i) => {
            const meta = moodMeta[mood.moodType ?? "calm"];
            const color = meta.color;
            const cc = moodColorClasses[color] ?? moodColorClasses.cyan;

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
                className="relative flex items-center gap-4 sm:gap-6 mb-8 sm:mb-12"
              >
                <div className="text-right text-slate-400 text-xs sm:text-sm w-[3.25rem] sm:w-16 shrink-0">
                  {format(new Date(mood.date), "MMM d")}
                </div>

                <div className="relative w-5 h-full flex items-center justify-center">
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
                  className={`min-w-0 flex-1 bg-white/[0.05] border border-white/10 rounded-2xl p-4 sm:p-6 backdrop-blur-md shadow-[0_6px_18px_rgba(0,0,0,0.45)] ${cc.cardHover} transition-all duration-300`}
                  whileHover={{ scale: 1.02, y: -2 }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl sm:text-3xl drop-shadow">
                      {meta.emoji}
                    </span>
                    <span
                      className={`${cc.label} text-lg sm:text-xl font-semibold tracking-wide`}
                    >
                      {meta.label}
                    </span>
                  </div>
                  {mood.note ? (
                    <p className="selectable-text text-slate-200 text-sm sm:text-base leading-relaxed">
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
