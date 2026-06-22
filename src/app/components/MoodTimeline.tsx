"use client";

import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { localDateKey, localToday } from "../lib/date";
import { resolveMoodVisual } from "../lib/moodColors";

interface MoodEntry {
  id: number;
  moodType?: string;
  note?: string;
  date: string;
  emoji?: string;
  color?: string;
}

interface MoodTimelineProps {
  timeline?: MoodEntry[];
}

export default function MoodTimeline({ timeline = [] }: MoodTimelineProps) {
  // 🔥 streak logic
  // Count consecutive local days that have at least one mood entry, walking
  // backwards from today. Using a Set of local-day keys makes this robust to
  // multiple entries on the same day and to timezone offsets. A one-day grace
  // applies: if today isn't logged yet, the streak earned through yesterday
  // still counts (it only breaks once a full day is missed).
  const loggedDays = new Set(timeline.map((m) => localDateKey(m.date)));
  let streak = 0;
  if (loggedDays.size > 0) {
    const cursor = new Date();
    if (!loggedDays.has(localToday())) {
      cursor.setDate(cursor.getDate() - 1);
    }
    while (loggedDays.has(localDateKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
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
