"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import { Check } from "lucide-react";

interface HabitProgressRingProps {
  done: number;
  total: number;
  /** Outer diameter in px. */
  size?: number;
  strokeWidth?: number;
  /** Show "done/total" (or a check when perfect) in the center. */
  showLabel?: boolean;
  className?: string;
}

/**
 * A small circular gauge for a day's habit completion. Amber while in progress,
 * gold + check once every expected habit is done — the little trophy that makes
 * filling the month feel good.
 */
export default function HabitProgressRing({
  done,
  total,
  size = 18,
  strokeWidth = 2.5,
  showLabel = false,
  className,
}: HabitProgressRingProps) {
  if (total <= 0) return null;

  const perfect = done >= total;
  const pct = Math.max(0, Math.min(1, done / total));
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const center = size / 2;

  return (
    <span
      className={clsx("relative inline-flex items-center justify-center", className)}
      title={`${done}/${total} habits`}
      aria-label={`${done} of ${total} habits done`}
    >
      <svg width={size} height={size} className={clsx(perfect && "drop-shadow-[0_0_5px_rgba(251,191,36,0.6)]")}>
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-white/12"
        />
        <motion.circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={perfect ? "text-amber-300" : "text-amber-400/80"}
          transform={`rotate(-90 ${center} ${center})`}
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ type: "spring", stiffness: 160, damping: 22 }}
        />
      </svg>
      {showLabel && (
        <span className="absolute inset-0 flex items-center justify-center">
          {perfect ? (
            <Check
              className="text-amber-200"
              style={{ width: size * 0.42, height: size * 0.42 }}
              strokeWidth={3}
            />
          ) : (
            <span
              className="font-semibold tabular-nums text-slate-200 leading-none"
              style={{ fontSize: Math.max(9, size * 0.3) }}
            >
              {done}
              <span className="text-slate-500">/{total}</span>
            </span>
          )}
        </span>
      )}
    </span>
  );
}
