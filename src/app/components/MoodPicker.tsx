"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface MoodPickerProps {
  onSelect: (mood: string) => void;
}

const moods = [
  { key: "joyful", label: "Joyful", emoji: "☀️", color: "from-amber-300 to-orange-500" },
  { key: "calm", label: "Calm", emoji: "🌊", color: "from-cyan-300 to-blue-600" },
  { key: "focused", label: "Focused", emoji: "🎯", color: "from-sky-400 to-indigo-700" },
  { key: "tired", label: "Tired", emoji: "🌙", color: "from-slate-500 to-indigo-800" },
  { key: "anxious", label: "Anxious", emoji: "🌪️", color: "from-rose-300 to-red-600" },
  { key: "inspired", label: "Inspired", emoji: "🔮", color: "from-emerald-300 to-teal-600" },
  { key: "grateful", label: "Grateful", emoji: "🕊️", color: "from-lime-300 to-emerald-500" },
  { key: "lonely", label: "Lonely", emoji: "🌫️", color: "from-indigo-400 to-slate-700" },
  { key: "angry", label: "Angry", emoji: "🔥", color: "from-red-400 to-orange-600" },
  { key: "hopeful", label: "Hopeful", emoji: "🌈", color: "from-fuchsia-300 to-violet-600" },
];

export default function MoodPicker({ onSelect }: MoodPickerProps) {
  const [hoveredMood, setHoveredMood] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-center justify-center text-center w-full h-full px-6 py-8">
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-3xl sm:text-4xl font-semibold text-slate-100 mb-12 tracking-wide"
      >
        How are you feeling today?
      </motion.h2>

      <motion.div
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 sm:gap-8 place-items-center w-full max-w-5xl"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.8 }}
      >
        {moods.map((mood, i) => (
          <motion.button
            key={mood.key}
            onMouseEnter={() => setHoveredMood(mood.key)}
            onMouseLeave={() => setHoveredMood(null)}
            onClick={() => {
              setSelected(mood.key);
              setTimeout(() => onSelect(mood.key), 700);
            }}
            disabled={!!selected}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05, type: "spring", stiffness: 180 }}
            whileHover={{
              scale: 1.08,
              rotate: 1,
              boxShadow: "0 0 25px rgba(255,255,255,0.2)",
            }}
            whileTap={{ scale: 0.92 }}
            className={`relative flex flex-col items-center justify-center w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36
              rounded-3xl bg-gradient-to-br ${mood.color}
              text-white/90 shadow-md backdrop-blur-md border border-white/10 transition-all duration-300 overflow-hidden
              ${
                selected === mood.key
                  ? "scale-110 ring-4 ring-white/20 shadow-xl"
                  : hoveredMood === mood.key
                  ? "ring-2 ring-white/10 brightness-110"
                  : "brightness-95"
              }
            `}
          >
            <motion.span
              className="text-4xl sm:text-5xl mb-2 drop-shadow-sm"
              animate={
                selected === mood.key
                  ? { scale: [1, 1.4, 1], rotate: [0, 8, -8, 0] }
                  : {}
              }
              transition={{ duration: 0.8 }}
            >
              {mood.emoji}
            </motion.span>

            <span className="text-sm sm:text-base font-medium tracking-wide z-10 text-white">
              {mood.label}
            </span>

            <AnimatePresence>
              {hoveredMood === mood.key && (
                <motion.div
                  layoutId="aura"
                  className="absolute inset-0 rounded-3xl bg-white/5 blur-2xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.6 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                />
              )}
            </AnimatePresence>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
