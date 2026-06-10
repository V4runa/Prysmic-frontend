"use client";

import { motion } from "framer-motion";

interface SpinnerProps {
  label?: string;
  className?: string;
}

/**
 * A calm, glassy loading indicator that matches the app's ethereal feel —
 * a softly rotating cyan ring rather than a plain "Loading..." string.
 */
export default function Spinner({ label, className = "" }: SpinnerProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 text-slate-400 ${className}`}
    >
      <motion.span
        className="h-8 w-8 rounded-full border-2 border-white/10 border-t-cyan-300/80"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
        style={{ boxShadow: "0 0 14px rgba(103,232,249,0.15)" }}
      />
      {label && (
        <motion.p
          className="text-sm tracking-wide"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          {label}
        </motion.p>
      )}
    </div>
  );
}
