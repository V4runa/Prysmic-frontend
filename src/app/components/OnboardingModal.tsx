"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  NotebookPen,
  Tags,
  ScrollText,
  ListChecks,
  HeartPulse,
  Sparkles,
} from "lucide-react";
import { SIGNUP_EMAIL_NOTE } from "../lib/authMessages";
import { readSignupEmailNote } from "../lib/storedSession";
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
    desc: "Write down ideas and thoughts, and come back to them later.",
    color: "text-cyan-300",
  },
  {
    icon: Tags,
    label: "Tag Codex",
    desc: "Create your own tags so you can organize notes and find them again.",
    color: "text-violet-300",
  },
  {
    icon: ScrollText,
    label: "Contracts",
    desc: "Habits framed as personal commitments, with check-ins and streaks.",
    color: "text-emerald-300",
  },
  {
    icon: ListChecks,
    label: "Tasks",
    desc: "Things you need to do, organized by what matters most.",
    color: "text-amber-300",
  },
  {
    icon: HeartPulse,
    label: "Moods",
    desc: "Check in with how you feel, and see it next to the rest of your day.",
    color: "text-rose-300",
  },
];

const steps = [
  {
    eyebrow: "Welcome, wanderer",
    title: "Welcome to Prysmic",
    body: "Prysmic is a place to keep your notes, moods, and the commitments you want to follow through on.",
  },
  {
    eyebrow: "What's here",
    title: "Five parts of the app",
    body: "We've added a small sample of each so nothing feels empty on your first visit.",
  },
  {
    eyebrow: "You're in control",
    title: "Start wherever you like",
    body: "There's a Start Here note pinned at the top of Notes. Everything you see is a sample — keep it, change it, or clear it out.",
  },
];

export default function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const emailNote = useSyncExternalStore(
    () => () => {},
    readSignupEmailNote,
    () => false
  );

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
            className="relative w-full max-w-lg max-h-[88dvh] overflow-y-auto app-scroll rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-black/50"
          >
            <button
              onClick={finish}
              className="tap-target absolute top-1.5 right-1.5 flex items-center justify-center rounded-md px-2 text-xs uppercase tracking-wide text-slate-500 hover:text-slate-300 transition"
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
                  {current.title}
                </h2>
                <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                  {current.body}
                </p>
                {step === 0 && emailNote && (
                  <p className="mt-4 text-sm text-cyan-100/90 leading-relaxed">
                    {SIGNUP_EMAIL_NOTE}
                  </p>
                )}

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
                  {isLast ? "Get started" : "Continue"}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
