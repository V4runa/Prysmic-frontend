"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import GlassPanel from "../components/GlassPanel";
import PageTransition from "../components/PageTransition";
import { apiFetch } from "../hooks/useApi";
import { habitIconMap, IconKey } from "../components/habitIcons";
import { getHabitColor } from "../lib/habitColors";
import { localToday } from "../lib/date";
import { tactile, tactileSubtle } from "../lib/motion";
import Sparkles from "../components/Sparkles";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Flame } from "lucide-react";

const iconMap = habitIconMap;

interface Habit {
  id: number;
  name: string;
  description?: string;
  color?: string;
  icon?: IconKey;
  checks?: { date: string }[];
  checkedToday: boolean;
  currentStreak: number;
  longestStreak: number;
  createdAt: string;
}

const habitsQueryKey = ["habits"] as const;

export default function HabitsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: habits = [], isError } = useQuery({
    queryKey: habitsQueryKey,
    queryFn: () => apiFetch<Habit[]>(`/habits?today=${localToday()}`),
  });
  const [error, setError] = useState("");
  const [animatingId, setAnimatingId] = useState<number | null>(null);
  const lastCheckDate = useRef<string>(localToday());

  useEffect(() => {
    if (isError) setError("Failed to load habits");
  }, [isError]);

  // Auto-refresh when the calendar day changes (local-day reset)
  useEffect(() => {
    const interval = setInterval(() => {
      const today = localToday();
      if (lastCheckDate.current !== today) {
        lastCheckDate.current = today;
        queryClient.invalidateQueries({ queryKey: habitsQueryKey });
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [queryClient]);

  // From the grid, completing a habit is intentionally one-way: tapping an
  // already-completed habit never un-checks it (that would silently break a
  // streak). Undo lives in the habit detail view behind a confirmation.
  const handleComplete = async (habitId: number) => {
    const previous = queryClient.getQueryData<Habit[]>(habitsQueryKey);
    const previousState = previous?.find((h) => h.id === habitId);
    if (!previousState || previousState.checkedToday) return;

    // Optimistically reflect completion. We only flip `checkedToday` (and don't
    // guess the new streak count) so the displayed number is never wrong — the
    // accurate streak comes back from the server response below.
    queryClient.setQueryData<Habit[]>(habitsQueryKey, (prev) =>
      (prev ?? []).map((h) =>
        h.id === habitId ? { ...h, checkedToday: true } : h
      )
    );
    setAnimatingId(habitId);
    setTimeout(() => setAnimatingId(null), 1400);

    try {
      // The check endpoint returns the fully updated habit (with accurate
      // streaks), so no follow-up GET is needed.
      const updatedHabit = await apiFetch<Habit>(`/habits/${habitId}/check`, {
        method: "POST",
        body: JSON.stringify({ date: localToday() }),
      });
      queryClient.setQueryData<Habit[]>(habitsQueryKey, (prev) =>
        (prev ?? []).map((h) => (h.id === habitId ? updatedHabit : h))
      );
    } catch {
      // Revert on error
      queryClient.setQueryData<Habit[]>(habitsQueryKey, (prev) =>
        (prev ?? []).map((h) => (h.id === habitId ? previousState : h))
      );
      setError("Failed to mark habit complete.");
      setAnimatingId(null);
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.04 },
    }),
  };

  return (
    <PageTransition>
      <div className="w-full app-page-h flex flex-col items-center px-3 sm:px-6 md:px-10 xl:px-12 2xl:px-20 pt-3 sm:pt-4 pb-3 sm:pb-4 gap-4 sm:gap-6">
      <GlassPanel className="w-full max-w-[1400px] flex flex-col gap-4 sm:gap-6 h-full min-h-0">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-slate-100 text-2xl sm:text-3xl font-bold tracking-wide">Your Contracts</h2>
            <p className="text-slate-400 text-sm sm:text-base">Sacred commitments to self-discipline and growth.</p>
          </div>
          <motion.button
            {...tactile}
            onClick={() => router.push("/habits/new")}
            className="px-3 sm:px-4 py-2 text-cyan-300 border border-cyan-400/30 hover:bg-cyan-400/10 hover:shadow-[0_0_18px_rgba(103,232,249,0.25)] rounded-md text-sm sm:text-base transition-shadow"
          >
            + New Contract
          </motion.button>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-1">
            <AnimatePresence mode="wait">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
              >
                {habits.map((habit, i) => {
                const iconKey: IconKey = habit.icon && iconMap[habit.icon] ? habit.icon : "star";
                const IconComponent = iconMap[iconKey];
                const isTodayChecked = habit.checkedToday;
                const c = getHabitColor(habit.color);
                const animating = animatingId === habit.id;

                return (
                  <motion.div
                    key={habit.id}
                    custom={i}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    whileTap={{ scale: 0.99 }}
                    transition={{ type: "spring", stiffness: 300, damping: 24 }}
                    onClick={() => router.push(`/habits/${habit.id}`)}
                    className={`card-lift group relative flex flex-col gap-3 rounded-2xl p-4 sm:p-5 cursor-pointer overflow-hidden backdrop-blur-md border ${
                      isTodayChecked ? c.cardChecked : c.cardIdle
                    }`}
                  >
                    {/* 🎆 Completion Burst */}
                    {animating && (
                      <>
                        <Sparkles color={c.spark} />
                        <motion.div
                          className={`absolute inset-0 ${c.burstGlow} blur-2xl rounded-2xl z-0`}
                          initial={{ opacity: 0.6, scale: 0.9 }}
                          animate={{ opacity: 0, scale: 1.7 }}
                          transition={{ duration: 1, ease: "easeOut" }}
                        />
                        <motion.div
                          className={`absolute inset-0 border-2 ${c.burstRing} rounded-2xl z-0`}
                          initial={{ opacity: 0.5, scale: 0.8 }}
                          animate={{ opacity: 0, scale: 1.3 }}
                          transition={{ duration: 1.1, ease: "easeOut" }}
                        />
                      </>
                    )}

                    {/* Main Card Content */}
                    <div className="flex items-center gap-3 z-10 relative pr-8">
                      {IconComponent && (
                        <motion.span
                          animate={animating ? { scale: [1, 1.35, 1], rotate: [0, -8, 8, 0] } : {}}
                          transition={{ duration: 0.7 }}
                        >
                          <IconComponent
                            className={`h-4 w-4 sm:h-5 sm:w-5 ${
                              isTodayChecked ? c.iconMuted : c.icon
                            }`}
                          />
                        </motion.span>
                      )}
                      <h3
                        className={`text-base sm:text-lg font-semibold ${
                          isTodayChecked ? "text-slate-400/70 line-through" : "text-slate-100"
                        } truncate`}
                      >
                        {habit.name}
                      </h3>
                    </div>

                    {habit.description && (
                      <p
                        className={`text-xs sm:text-sm line-clamp-3 z-10 ${
                          isTodayChecked ? "text-slate-400/40" : "text-slate-400"
                        }`}
                      >
                        {habit.description}
                      </p>
                    )}

                    {/* Streak Badge */}
                    {habit.currentStreak > 0 && (
                      <div className="flex items-center gap-1 z-10 relative mt-auto">
                        <motion.span
                          animate={animating ? { scale: [1, 1.4, 1] } : {}}
                          transition={{ duration: 0.6 }}
                        >
                          <Flame className={`h-3 w-3 sm:h-4 sm:w-4 ${c.flame}`} />
                        </motion.span>
                        <span className={`text-xs sm:text-sm font-medium ${c.streakText}`}>
                          {habit.currentStreak} day{habit.currentStreak !== 1 ? "s" : ""}
                        </span>
                      </div>
                    )}

                    {/* ✅ Check Button */}
                    {isTodayChecked ? (
                      // Completed: a non-destructive badge. Tapping it falls
                      // through to the card click, which opens the detail view
                      // where the day can be undone (behind a confirm).
                      <div
                        className="absolute top-2 right-2 z-20 pointer-events-none"
                        title="Completed today — open to undo"
                      >
                        <motion.span
                          initial={{ scale: 0.6, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 14 }}
                          className="inline-flex"
                        >
                          <CheckCircle2 className={`h-5 w-5 sm:h-6 sm:w-6 ${c.icon}`} />
                        </motion.span>
                      </div>
                    ) : (
                      <div
                        className="absolute top-2 right-2 z-20"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleComplete(habit.id);
                        }}
                      >
                        <motion.button
                          {...tactileSubtle}
                          title="Mark as complete"
                          className={`h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center rounded-full border ${c.checkBorder} bg-white/10 ${c.checkHover}`}
                        >
                          <CheckCircle2 className={`h-3 w-3 sm:h-4 sm:w-4 ${c.icon}`} />
                        </motion.button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
      </GlassPanel>
      </div>
    </PageTransition>
  );
}
