"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import GlassPanel from "../../components/GlassPanel";
import PageTransition from "../../components/PageTransition";
import { apiFetch } from "../../hooks/useApi";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import {
  CheckCircle2,
  Save,
  X,
  ArrowLeft,
  PencilIcon,
  Flame,
  Target,
} from "lucide-react";
import {
  habitIconMap as iconMap,
  habitIconChoices as iconChoices,
  IconKey,
} from "../../components/habitIcons";
import { getHabitColor } from "../../lib/habitColors";
import { tactile, tactileSubtle } from "../../lib/motion";
import Sparkles from "../../components/Sparkles";
import Spinner from "../../components/Spinner";
import { HabitFrequency } from "../../enums/habit-frequency.enum";

const colorChoices = ["cyan", "violet", "rose", "amber", "emerald", "blue"] as const;

const colorClassMap: Record<string, string> = {
  cyan: "bg-cyan-400/50 border-cyan-300 ring-cyan-500",
  violet: "bg-violet-400/50 border-violet-300 ring-violet-500",
  rose: "bg-rose-400/50 border-rose-300 ring-rose-500",
  amber: "bg-amber-400/50 border-amber-300 ring-amber-500",
  emerald: "bg-emerald-400/50 border-emerald-300 ring-emerald-500",
  blue: "bg-blue-400/50 border-blue-300 ring-blue-500",
};

const bgPanelMap: Record<string, string> = {
  cyan: "bg-cyan-500/5",
  violet: "bg-violet-500/5",
  rose: "bg-rose-500/5",
  amber: "bg-amber-500/5",
  emerald: "bg-emerald-500/5",
  blue: "bg-blue-500/5",
};

interface Habit {
  id: number;
  name: string;
  description?: string;
  intent?: string;
  affirmation?: string;
  color?: string;
  icon?: IconKey;
  frequency?: HabitFrequency;
  checks?: { date: string }[];
  checkedToday: boolean;
  currentStreak: number;
  longestStreak: number;
  createdAt: string;
}

export default function HabitDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [habit, setHabit] = useState<Habit | null>(null);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<Partial<Habit>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchHabit = async () => {
      try {
        const habitData = await apiFetch<Habit>(`/habits/${id}`);
        setHabit(habitData);
        setForm(habitData);
      } catch {
        setError("Could not load habit");
      }
    };
    fetchHabit();
  }, [id]);

  const isCheckedToday = habit?.checkedToday ?? false;
  const color = form.color || habit?.color || "cyan";
  const c = getHabitColor(color);
  const [justChecked, setJustChecked] = useState(false);
  const iconKey = (form.icon || habit?.icon || "star") as IconKey;
  const IconComponent = iconMap[iconKey];

  const toggleCheck = async () => {
    if (!habit) return;
    
    const previousState = habit;

    // Optimistic update
    const willCheck = !habit.checkedToday;
    setHabit({
      ...habit,
      checkedToday: willCheck,
      currentStreak: willCheck
        ? habit.currentStreak + 1
        : Math.max(0, habit.currentStreak - 1),
    });
    if (willCheck) {
      setJustChecked(true);
      setTimeout(() => setJustChecked(false), 900);
    }

    try {
      // The check endpoint returns the fully updated habit, so no follow-up
      // GET is needed.
      const habitData = await apiFetch<Habit>(`/habits/${id}/check`, {
        method: "POST",
      });
      setHabit(habitData);
      setForm(habitData);
      queryClient.invalidateQueries({ queryKey: ["habits"] });
    } catch {
      // Revert on error
      setHabit(previousState);
      setError("Failed to toggle check-in");
    }
  };

  const saveEdits = async () => {
    try {
      const updated = await apiFetch<Habit>(`/habits/${id}`, {
        method: "PUT",
        body: JSON.stringify(form),
      });
      setHabit(updated);
      setEdit(false);
      queryClient.invalidateQueries({ queryKey: ["habits"] });
    } catch {
      setError("Failed to save changes");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this contract?")) return;
    try {
      await apiFetch(`/habits/${id}`, { method: "DELETE" });
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      router.push("/habits");
    } catch {
      setError("Failed to delete habit");
    }
  };

  const handleChange = (field: keyof Habit, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  if (!habit) {
    return (
      <div className="app-page-h flex items-center justify-center">
        {error ? (
          <p className="text-slate-400">{error}</p>
        ) : (
          <Spinner label="Summoning contract..." />
        )}
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="w-full app-page-h flex flex-col items-center px-3 sm:px-6 md:px-10 xl:px-12 2xl:px-20 pt-3 sm:pt-4 pb-3 sm:pb-4 gap-4 sm:gap-6">
        <GlassPanel className={clsx("w-full max-w-[1400px] flex flex-col gap-4 sm:gap-6 h-full min-h-0", bgPanelMap[color])}>
          <div className="flex justify-between items-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-wide">
              {edit ? "Edit Contract" : "Habit Contract"}
            </h2>
            <motion.button
              {...tactile}
              onClick={() => router.push("/habits")}
              className="tap-target p-2 border border-white/10 rounded-md hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5 text-slate-300" />
            </motion.button>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <AnimatePresence mode="wait">
              {edit ? (
                <motion.div
                  key="edit"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="flex-1 flex flex-col gap-4 sm:gap-6"
                >
                  <input
                    value={form.name || ""}
                    onChange={(e) => handleChange("name", e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 text-slate-100 rounded-md text-lg sm:text-xl"
                  />
                  <textarea
                    value={form.description || ""}
                    onChange={(e) => handleChange("description", e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 text-slate-300 rounded-md"
                    rows={2}
                  />
                  <textarea
                    value={form.intent || ""}
                    onChange={(e) => handleChange("intent", e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 text-indigo-300 rounded-md"
                    rows={2}
                  />
                  <textarea
                    value={form.affirmation || ""}
                    onChange={(e) => handleChange("affirmation", e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 text-emerald-300 rounded-md"
                    rows={2}
                  />

                  <div className="flex flex-col gap-2">
                    <label className="text-slate-300 text-sm">Color</label>
                    <div className="flex flex-wrap gap-3">
                      {colorChoices.map((c, i) => (
                        <motion.button
                          key={c}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.05 }}
                          onClick={() => handleChange("color", c)}
                          className={clsx(
                            "w-8 h-8 rounded-full transition",
                            form.color === c
                              ? `ring-2 ${colorClassMap[c]}`
                              : "border border-white/10 bg-white/10 hover:bg-white/20"
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-slate-300 text-sm">Icon</label>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                      {iconChoices.map((icon, i) => {
                        const Icon = iconMap[icon as IconKey];
                        return (
                          <motion.button
                            key={icon}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.02 }}
                            onClick={() => handleChange("icon", icon)}
                            className={clsx(
                              "p-2 rounded-md border transition",
                              form.icon === icon
                                ? "bg-white/10 border-cyan-400"
                                : "border-white/10 hover:bg-white/10"
                            )}
                          >
                            <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-slate-100" />
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={saveEdits}
                      className="tap-target flex items-center justify-center gap-2 px-4 sm:px-3 py-2 bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-300/20 rounded-md"
                    >
                      <Save className="h-5 w-5 text-cyan-300" />
                      <span className="sm:hidden text-cyan-300 text-sm font-medium">Save</span>
                    </button>
                    <button
                      onClick={() => setEdit(false)}
                      className="tap-target flex items-center justify-center gap-2 px-4 sm:px-3 py-2 border border-white/10 hover:bg-white/10 rounded-md"
                    >
                      <X className="h-5 w-5 text-slate-300" />
                      <span className="sm:hidden text-slate-300 text-sm font-medium">Cancel</span>
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="view"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="flex-1 flex flex-col gap-4 sm:gap-6"
                >
                  <div className="flex justify-between items-center gap-3">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      {IconComponent && (
                        <span className={`shrink-0 p-2 rounded-full ${c.detailIconBg}`}>
                          <IconComponent className={`h-6 w-6 ${c.icon}`} />
                        </span>
                      )}
                      <h3 className="text-lg sm:text-xl font-semibold text-slate-100 truncate">
                        {habit.name}
                      </h3>
                      {habit.frequency && (
                        <span className={clsx(
                          "shrink-0 text-xs px-2 py-1 rounded-md font-medium tracking-wide",
                          {
                            daily: "bg-cyan-500/10 text-cyan-300 border border-cyan-300/20",
                            weekly: "bg-violet-500/10 text-violet-300 border border-violet-300/20",
                            monthly: "bg-amber-500/10 text-amber-300 border border-amber-300/20",
                          }[habit.frequency]
                        )}>
                          {habit.frequency.charAt(0).toUpperCase() + habit.frequency.slice(1)}
                        </span>
                      )}
                    </div>

                    <div className="relative shrink-0">
                      {justChecked && <Sparkles color={c.spark} count={12} />}
                      <motion.button
                        {...tactileSubtle}
                        animate={{
                          boxShadow: isCheckedToday
                            ? `0 0 14px ${c.spark}`
                            : "0 0 0px rgba(0,0,0,0)",
                        }}
                        transition={{ type: "spring", stiffness: 300 }}
                        onClick={toggleCheck}
                        className={clsx(
                          "tap-target relative z-10 rounded-full p-2 border transition-colors flex items-center justify-center",
                          isCheckedToday
                            ? `${c.detailIconBg} ${c.checkBorder}`
                            : "bg-white/10 border-white/10 hover:bg-white/20"
                        )}
                      >
                        <motion.span
                          key={isCheckedToday ? "on" : "off"}
                          initial={{ scale: 0.5, rotate: -30 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 14 }}
                          className="inline-flex"
                        >
                          <CheckCircle2
                            className={clsx(
                              "h-5 w-5",
                              isCheckedToday ? c.icon : "text-slate-300"
                            )}
                          />
                        </motion.span>
                      </motion.button>
                    </div>
                  </div>

                  {/* Streak Information */}
                  <div className="flex flex-wrap gap-3 sm:gap-4 items-center">
                    {habit.currentStreak > 0 && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                        <Flame className={`h-4 w-4 ${c.flame}`} />
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-400">Current Streak</span>
                          <span className={`text-sm font-semibold ${c.streakText}`}>
                            {habit.currentStreak} day{habit.currentStreak !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    )}
                    {habit.longestStreak > 0 && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                        <Target className={`h-4 w-4 ${c.flameMuted}`} />
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-400">Longest Streak</span>
                          <span className={`text-sm font-semibold ${c.streakTextMuted}`}>
                            {habit.longestStreak} day{habit.longestStreak !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {habit.description && (
                    <p className="text-slate-400 whitespace-pre-line text-sm sm:text-base">{habit.description}</p>
                  )}
                  {habit.intent && (
                    <p className="text-indigo-300 whitespace-pre-line text-sm">{habit.intent}</p>
                  )}
                  {habit.affirmation && (
                    <p className="text-emerald-300 italic whitespace-pre-line text-sm">
                      &ldquo;{habit.affirmation}&rdquo;
                    </p>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setEdit(true)}
                      className="tap-target flex items-center justify-center gap-2 px-4 sm:px-3 py-2 border border-cyan-300/20 hover:bg-cyan-400/10 rounded-md"
                    >
                      <PencilIcon className="h-5 w-5 text-cyan-300" />
                      <span className="sm:hidden text-cyan-300 text-sm font-medium">Edit</span>
                    </button>
                    <button
                      onClick={handleDelete}
                      className="tap-target flex items-center justify-center px-4 py-2 text-red-300 text-sm font-medium border border-red-300/20 hover:bg-red-400/10 rounded-md"
                    >
                      Delete
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
        </GlassPanel>
      </div>
    </PageTransition>
  );
}
