"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import clsx from "clsx";
import { tactile } from "../lib/motion";
import { moodColor } from "../lib/moodColors";

interface MoodReflectionProps {
  color?: string;
  onSubmit: (note?: string) => void | Promise<void>;
  onSkip: () => void | Promise<void>;
}

export default function MoodReflection({
  color,
  onSubmit,
  onSkip,
}: MoodReflectionProps) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const tint = moodColor(color);

  // Await the save so a failure resets the button (with an inline retry)
  // instead of stranding the user on a permanent "Saving..." state. On success
  // the parent transitions away and this component unmounts.
  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      await onSubmit(note.trim() || undefined);
    } catch {
      setError("Couldn't save your mood. Please try again.");
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    setSubmitting(true);
    setError("");
    try {
      await onSkip();
    } catch {
      setError("Couldn't save your mood. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      key="reflection"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className={clsx(
        "relative w-full h-full overflow-y-auto app-scroll text-center rounded-2xl"
      )}
    >
      {/* Mood color tint background */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.15 }}
        className={`absolute inset-0 ${tint.glow} blur-2xl`}
      />

      <div className="relative z-10 min-h-full flex flex-col items-center justify-center px-4 py-6 sm:py-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8 }}
        className="w-full max-w-lg flex flex-col items-center gap-6 sm:gap-8"
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
            {...tactile}
            onClick={handleSubmit}
            disabled={submitting}
            className={`px-6 py-2 rounded-md font-medium text-white border transition-colors ${tint.btn}`}
          >
            {submitting ? "Saving..." : "Submit"}
          </motion.button>

          <motion.button
            {...tactile}
            onClick={handleSkip}
            disabled={submitting}
            className="px-6 py-2 rounded-md font-medium text-slate-300 border border-white/10 hover:bg-white/10 transition-colors"
          >
            Skip
          </motion.button>
        </div>

        {error && (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        )}

        <motion.div
          className="text-xs text-slate-500 mt-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          {note.length}/180 characters
        </motion.div>
      </motion.div>
      </div>
    </motion.div>
  );
}
