"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  NotebookPen,
  Tags,
  ScrollText,
  ListChecks,
  HeartPulse,
  Sparkles,
} from "lucide-react";
import { springSoft, tactile } from "../lib/motion";

const PENDING_KEY = "prysmic_onboarding_pending";
const COMPLETE_KEY = "prysmic_onboarding_complete";

/**
 * Call this right after a successful signup so the welcome flow greets the
 * wanderer on their first authenticated screen. The modal itself decides when
 * to render based on these flags, so existing users logging in never see it.
 */
export function markOnboardingPending() {
  try {
    localStorage.setItem(PENDING_KEY, "1");
  } catch {
    // localStorage may be unavailable (privacy mode); onboarding is optional.
  }
}

const features = [
  {
    icon: NotebookPen,
    label: "Notes",
    desc: "Capture a thought the moment it arrives, before it slips away.",
    color: "text-cyan-300",
  },
  {
    icon: Tags,
    label: "Tag Codex",
    desc: "Give thoughts color and meaning so you can find a single thread later.",
    color: "text-violet-300",
  },
  {
    icon: ScrollText,
    label: "Contracts",
    desc: "Your habits, framed as quiet promises. Each check-in grows a streak.",
    color: "text-emerald-300",
  },
  {
    icon: ListChecks,
    label: "Tasks",
    desc: "The things that need doing, sorted by what matters most.",
    color: "text-amber-300",
  },
  {
    icon: HeartPulse,
    label: "Moods",
    desc: "A gentle daily check-in with how you actually feel.",
    color: "text-rose-300",
  },
];

const steps = [
  {
    eyebrow: "Welcome, wanderer",
    title: "Enter the Flow",
    body: "Prysmic is an extension to your cognition — a calm place to set down what your mind would rather not carry alone.",
  },
  {
    eyebrow: "The lay of the land",
    title: "Five quiet rooms",
    body: "We've prepared a small sample of each so nothing feels empty on your first visit.",
  },
  {
    eyebrow: "You're in control",
    title: "Begin where you like",
    body: "We pinned a ✦ Start Here note at the top of your Notes. Everything you see is a sample — keep it, reshape it, or clear it all out.",
  },
];

export default function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (
        localStorage.getItem(PENDING_KEY) === "1" &&
        localStorage.getItem(COMPLETE_KEY) !== "1"
      ) {
        setOpen(true);
      }
    } catch {
      // ignore storage access failures
    }
  }, []);

  const finish = () => {
    try {
      localStorage.removeItem(PENDING_KEY);
      localStorage.setItem(COMPLETE_KEY, "1");
    } catch {
      // ignore storage access failures
    }
    setOpen(false);
  };

  const isLast = step === steps.length - 1;
  const current = steps[step];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={finish}
          />

          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={springSoft}
            className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-black/50"
          >
            <button
              onClick={finish}
              className="absolute top-4 right-5 text-xs uppercase tracking-wide text-slate-500 hover:text-slate-300 transition"
            >
              Skip
            </button>

            <div className="flex items-center gap-2 text-cyan-300/80 mb-3">
              <Sparkles size={16} />
              <span className="text-xs uppercase tracking-[0.2em]">
                {current.eyebrow}
              </span>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={springSoft}
              >
                <h2 className="text-2xl sm:text-3xl font-semibold text-slate-100 tracking-wide mb-3">
                  {step === 0 ? (
                    <>
                      Enter the <span className="text-cyan-300">Flow</span>
                    </>
                  ) : (
                    current.title
                  )}
                </h2>
                <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                  {current.body}
                </p>

                {step === 1 && (
                  <div className="mt-5 flex flex-col gap-3">
                    {features.map((f) => (
                      <div
                        key={f.label}
                        className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2.5"
                      >
                        <f.icon size={18} className={`mt-0.5 ${f.color}`} />
                        <div>
                          <p className="text-slate-200 text-sm font-medium">
                            {f.label}
                          </p>
                          <p className="text-slate-500 text-xs leading-snug">
                            {f.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="mt-7 flex items-center justify-between">
              <div className="flex gap-1.5">
                {steps.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === step
                        ? "w-6 bg-cyan-300"
                        : "w-1.5 bg-white/15"
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-3">
                {step > 0 && (
                  <button
                    onClick={() => setStep((s) => s - 1)}
                    className="text-sm text-slate-400 hover:text-slate-200 transition px-2 py-2"
                  >
                    Back
                  </button>
                )}
                <motion.button
                  {...tactile}
                  onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
                  className="rounded-md border border-cyan-300/20 bg-cyan-400/10 hover:bg-cyan-400/20 text-cyan-100 px-5 py-2.5 text-sm tracking-wide transition"
                >
                  {isLast ? "Enter the Flow" : "Continue"}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
