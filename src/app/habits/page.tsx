"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import GlassPanel from "../components/GlassPanel";
import PageTransition from "../components/PageTransition";
import { apiFetch } from "../hooks/useApi";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Flame,
  Moon,
  Book,
  Star,
  Wand2,
  Palette,
  Feather,
  Bolt,
  TreePine,
  Circle,
  Bell,
  Cloud,
  Compass,
  Droplet,
  Eye,
  Heart,
  Key,
  Leaf,
  Lightbulb,
  Mountain,
  Sun,
  Target,
  Thermometer,
  Umbrella,
  BrainCircuit,
  Shield,
  Anchor,
  Infinity,
} from "lucide-react";

const iconMap = {
  flame: Flame,
  moon: Moon,
  book: Book,
  star: Star,
  wand2: Wand2,
  palette: Palette,
  feather: Feather,
  bolt: Bolt,
  treepine: TreePine,
  circle: Circle,
  bell: Bell,
  cloud: Cloud,
  compass: Compass,
  droplet: Droplet,
  eye: Eye,
  heart: Heart,
  key: Key,
  leaf: Leaf,
  lightbulb: Lightbulb,
  mountain: Mountain,
  sun: Sun,
  target: Target,
  thermometer: Thermometer,
  umbrella: Umbrella,
  braincircuit: BrainCircuit,
  shield: Shield,
  anchor: Anchor,
  infinity: Infinity,
} as const;

type IconKey = keyof typeof iconMap;

interface Habit {
  id: number;
  name: string;
  description?: string;
  color?: string;
  icon?: IconKey;
  checks?: { date: string }[];
  createdAt: string;
}

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [error, setError] = useState("");
  const [animatingId, setAnimatingId] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    apiFetch<Habit[]>("/habits")
      .then(setHabits)
      .catch(() => setError("Failed to load habits"));
  }, []);

  const isCheckedToday = (habit: Habit) => {
    const today = new Date().toISOString().split("T")[0];
    return habit.checks?.some((c) => c.date === today);
  };

  const handleCheck = async (habitId: number) => {
    try {
      await apiFetch(`/habits/${habitId}/check`, { method: "POST" });
      setHabits((prev) =>
        prev.map((h) =>
          h.id === habitId
            ? {
                ...h,
                checks: [...(h.checks || []), { date: new Date().toISOString().split("T")[0] }],
              }
            : h
        )
      );
      setAnimatingId(habitId);
      setTimeout(() => setAnimatingId(null), 1400);
    } catch {
      setError("Failed to mark habit as complete.");
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
      <div className="w-full h-[calc(100vh-3rem)] flex flex-col items-center px-4 sm:px-6 md:px-10 xl:px-12 2xl:px-20 pt-4 pb-4 gap-4 sm:gap-6">
      <GlassPanel className="w-full max-w-[1400px] flex flex-col gap-4 sm:gap-6 h-full min-h-0">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-slate-100 text-2xl sm:text-3xl font-bold tracking-wide">Your Contracts</h2>
            <p className="text-slate-400 text-sm sm:text-base">Sacred commitments to self-discipline and growth.</p>
          </div>
          <button
            onClick={() => router.push("/habits/new")}
            className="px-3 sm:px-4 py-2 text-cyan-300 border border-cyan-400/30 hover:bg-cyan-400/10 rounded-md text-sm sm:text-base"
          >
            + New Contract
          </button>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
              >
                {habits.map((habit, i) => {
                const iconKey: IconKey = habit.icon && iconMap[habit.icon] ? habit.icon : "star";
                const IconComponent = iconMap[iconKey];
                const isTodayChecked = isCheckedToday(habit);
                const color = habit.color || "cyan";
                const animating = animatingId === habit.id;

                return (
                  <motion.div
                    key={habit.id}
                    custom={i}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    whileHover={{ scale: 1.02 }}
                    onClick={() => router.push(`/habits/${habit.id}`)}
                    className={`relative flex flex-col gap-3 rounded-2xl p-4 sm:p-5 cursor-pointer overflow-hidden backdrop-blur-md transition border ${
                      isTodayChecked
                        ? `bg-${color}-900/20 border-${color}-500/20 backdrop-blur-sm saturate-50 ring-2 ring-${color}-300/40`
                        : `bg-${color}-400/5 border-${color}-400/20`
                    }`}
                  >
                    {/* 🎆 Completion Burst */}
                    {animating && (
                      <>
                        <motion.div
                          className={`absolute inset-0 bg-${color}-300/20 blur-2xl rounded-2xl z-0`}
                          initial={{ opacity: 0.6, scale: 0.9 }}
                          animate={{ opacity: 0, scale: 1.7 }}
                          transition={{ duration: 1, ease: "easeOut" }}
                        />
                        <motion.div
                          className={`absolute inset-0 border-2 border-${color}-400/40 rounded-2xl z-0`}
                          initial={{ opacity: 0.5, scale: 0.8 }}
                          animate={{ opacity: 0, scale: 1.3 }}
                          transition={{ duration: 1.1, ease: "easeOut" }}
                        />
                        <motion.div
                          className={`absolute top-2 right-2 z-10`}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1.4, opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          <CheckCircle2 className={`h-6 w-6 sm:h-7 sm:w-7 text-${color}-300`} />
                        </motion.div>
                      </>
                    )}

                    {/* Main Card Content */}
                    <div className="flex items-center gap-3 z-10 relative">
                      {IconComponent && (
                        <IconComponent
                          className={`h-4 w-4 sm:h-5 sm:w-5 ${
                            isTodayChecked
                              ? `text-${color}-400/50`
                              : `text-${color}-300`
                          }`}
                        />
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

                    {/* ✅ Check Button */}
                    <div
                      className="absolute top-2 right-2 z-20"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isTodayChecked) handleCheck(habit.id);
                      }}
                    >
                      {isTodayChecked ? (
                        <CheckCircle2 className={`h-4 w-4 sm:h-5 sm:w-5 text-${color}-300`} />
                      ) : (
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          title="Mark as complete"
                          className={`h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center rounded-full border border-${color}-300/30 bg-white/10 hover:bg-${color}-400/10`}
                        >
                          <CheckCircle2 className={`h-3 w-3 sm:h-4 sm:w-4 text-${color}-300`} />
                        </motion.button>
                      )}
                    </div>
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
