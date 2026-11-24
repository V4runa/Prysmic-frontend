"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { tactile } from "../lib/motion";
import { scheduleViewportPin } from "../lib/pinViewport";
import { moodColor } from "../lib/moodColors";
import { TextArea, FormButton } from "./forms";

interface MoodReflectionProps {
  color?: string;
  initialNote?: string;
  maxLength?: number;
  skipLabel?: string;
  onSubmit: (note?: string) => void | Promise<void>;
  onSkip: () => void | Promise<void>;
}

export default function MoodReflection({
  color,
  initialNote = "",
  maxLength = 180,
  skipLabel = "Skip",
  onSubmit,
  onSkip,
}: MoodReflectionProps) {
  const [note, setNote] = useState(initialNote);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const tint = moodColor(color);

  // Removing a focused textarea does not always blur it on iOS, so the
  // window can stay scrolled after Skip or Submit unmounts this screen.
  useEffect(() => {
    const root = rootRef.current;
    return () => {
      const active = document.activeElement;
      if (active instanceof HTMLElement && root?.contains(active)) active.blur();
      scheduleViewportPin();
    };
  }, []);

  // Await the save so a failure resets the button (with an inline retry)
  // instead of stranding the user on a permanent "Saving..." state. On success
  // the parent transitions away and this component unmounts.
  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      await onSubmit(note.trim());
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
      ref={rootRef}
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
          Just a few words about your day, or skip this.
        </p>

        <TextArea
          maxLength={maxLength}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Write your reflection here..."
          rows={3}
          className="text-left"
        />

        <div className="flex gap-4 mt-2">
          <motion.button
            {...tactile}
            onClick={handleSubmit}
            disabled={submitting}
            className={`tap-target px-6 py-2.5 rounded-md font-medium text-sm text-white border transition-colors disabled:opacity-60 ${tint.btn}`}
          >
            {submitting ? "Saving..." : "Submit"}
          </motion.button>

          <FormButton variant="secondary" onClick={handleSkip} disabled={submitting}>
            {skipLabel}
          </FormButton>
        </div>

        {error && (
          <p className="text-sm text-rose-400" role="alert">
            {error}
          </p>
        )}

        <motion.div
          className="text-xs text-slate-500 mt-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          {note.length}/{maxLength} characters
        </motion.div>
      </motion.div>
      </div>
    </motion.div>
  );
}
