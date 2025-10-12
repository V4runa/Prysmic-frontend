"use client";

import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import clsx from "clsx";

interface MoodReflectionProps {
  moodType: string;
  onSubmit: (note?: string) => void;
  onSkip: () => void;
}

export default function MoodReflection({
  moodType,
  onSubmit,
  onSkip,
}: MoodReflectionProps) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // mood → color tint mapping
  const moodColors: Record<string, string> = useMemo(
    () => ({
      joyful: "amber",
      calm: "cyan",
      focused: "blue",
      tired: "violet",
      anxious: "rose",
      inspired: "emerald",
      grateful: "yellow",
      lonely: "slate",
      angry: "red",
      hopeful: "fuchsia",
    }),
    []
  );

  const color = moodColors[moodType] || "cyan";

  const handleSubmit = async () => {
    setSubmitting(true);
    setTimeout(() => {
      onSubmit(note.trim() || undefined);
    }, 400); // let fade animation breathe
  };

  return (
    <motion.div
      key="reflection"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className={clsx(
        "flex flex-col items-center justify-center text-center w-full h-full relative overflow-hidden rounded-2xl"
      )}
    >
      {/* Mood color tint background */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.15 }}
        className={`absolute inset-0 bg-${color}-500/20 blur-2xl`}
      />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8 }}
        className="relative z-10 w-full max-w-lg flex flex-col items-center gap-6 sm:gap-8"
      >
        <h2 className="text-2xl sm:text-3xl font-semibold text-slate-100">
          Would you like to leave a reflection?
        </h2>

        <p className="text-sm text-slate-400">
          Just a few words about your day — or skip if you’d prefer silence.
        </p>

        <textarea
          maxLength={180}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Write your reflection here..."
          className="w-full rounded-xl bg-white/5 border border-white/10 text-slate-200 placeholder-white/40 
                     px-4 py-3 sm:px-5 sm:py-4 text-sm sm:text-base focus:outline-none 
                     focus:ring-2 focus:ring-cyan-400/40 backdrop-blur-md transition"
          rows={3}
        />

        <div className="flex gap-4 mt-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleSubmit}
            disabled={submitting}
            className={`px-6 py-2 rounded-md font-medium text-white border border-${color}-400/30 
              bg-${color}-500/10 hover:bg-${color}-400/20 transition`}
          >
            {submitting ? "Saving..." : "Submit"}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setSubmitting(true);
              setTimeout(() => onSkip(), 400);
            }}
            disabled={submitting}
            className="px-6 py-2 rounded-md font-medium text-slate-300 border border-white/10 hover:bg-white/10 transition"
          >
            Skip
          </motion.button>
        </div>

        <motion.div
          className="text-xs text-slate-500 mt-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          {note.length}/180 characters
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
