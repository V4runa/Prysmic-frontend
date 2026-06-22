"use client";

import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import clsx from "clsx";
import { tactile } from "../lib/motion";

interface MoodReflectionProps {
  moodType: string;
  onSubmit: (note?: string) => void | Promise<void>;
  onSkip: () => void | Promise<void>;
}

// Fully-spelled classes per mood tint (Tailwind v4 can't compile `bg-${color}`).
const moodTint: Record<string, { glow: string; btn: string }> = {
  amber: { glow: "bg-amber-500/20", btn: "border-amber-400/30 bg-amber-500/10 hover:bg-amber-400/20" },
  cyan: { glow: "bg-cyan-500/20", btn: "border-cyan-400/30 bg-cyan-500/10 hover:bg-cyan-400/20" },
  blue: { glow: "bg-blue-500/20", btn: "border-blue-400/30 bg-blue-500/10 hover:bg-blue-400/20" },
  violet: { glow: "bg-violet-500/20", btn: "border-violet-400/30 bg-violet-500/10 hover:bg-violet-400/20" },
  rose: { glow: "bg-rose-500/20", btn: "border-rose-400/30 bg-rose-500/10 hover:bg-rose-400/20" },
  emerald: { glow: "bg-emerald-500/20", btn: "border-emerald-400/30 bg-emerald-500/10 hover:bg-emerald-400/20" },
  yellow: { glow: "bg-yellow-500/20", btn: "border-yellow-400/30 bg-yellow-500/10 hover:bg-yellow-400/20" },
  slate: { glow: "bg-slate-500/20", btn: "border-slate-400/30 bg-slate-500/10 hover:bg-slate-400/20" },
  red: { glow: "bg-red-500/20", btn: "border-red-400/30 bg-red-500/10 hover:bg-red-400/20" },
  fuchsia: { glow: "bg-fuchsia-500/20", btn: "border-fuchsia-400/30 bg-fuchsia-500/10 hover:bg-fuchsia-400/20" },
};

export default function MoodReflection({
  moodType,
  onSubmit,
  onSkip,
}: MoodReflectionProps) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
  const tint = moodTint[color] ?? moodTint.cyan;

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
