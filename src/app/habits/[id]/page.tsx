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
import { habitIconMap as iconMap, IconKey } from "../../components/habitIcons";
import { getHabitColor } from "../../lib/habitColors";
import { localToday } from "../../lib/date";
import { tactile, tactileSubtle } from "../../lib/motion";
import Sparkles from "../../components/Sparkles";
import Spinner from "../../components/Spinner";
import { HabitFrequency } from "../../enums/habit-frequency.enum";
import { Field, TextField, TextArea, SelectField, FormButton } from "../../components/forms";
import HabitColorPicker from "../../components/HabitColorPicker";
import HabitIconPicker from "../../components/HabitIconPicker";

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
        const habitData = await apiFetch<Habit>(
          `/habits/${id}?today=${localToday()}`
        );
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

    const willCheck = !habit.checkedToday;

    // Undoing a completed day is the only way to break a streak by hand, so we
    // gate it behind an explicit confirmation to prevent accidental loss.
    if (!willCheck) {
      const ok = window.confirm(
        "Undo today's completion? This will remove today from your streak."
      );
      if (!ok) return;
    }

    const previousState = habit;

    // Optimistically flip only `checkedToday` (not the streak number) so the
    // displayed streak is never a wrong guess — it's reconciled from the
    // server response below.
    setHabit({ ...habit, checkedToday: willCheck });
    if (willCheck) {
      setJustChecked(true);
      setTimeout(() => setJustChecked(false), 900);
    }

    try {
      // The check endpoint returns the fully updated habit, so no follow-up
      // GET is needed.
      const habitData = await apiFetch<Habit>(`/habits/${id}/check`, {
        method: "POST",
        body: JSON.stringify({ date: localToday() }),
      });
      setHabit(habitData);
      setForm(habitData);
      queryClient.invalidateQueries({ queryKey: ["habits"] });
    } catch {
      // Revert on error
      setHabit(previousState);
      setError("Failed to update check-in");
    }
  };

  const saveEdits = async () => {
    setError("");
    // The API rejects unknown fields (forbidNonWhitelisted), so send only the
    // editable ones — never the computed/read-only fields carried on `form`
    // (id, checks, streaks, checkedToday, createdAt, userId).
    const payload = {
      name: form.name,
      description: form.description,
      intent: form.intent,
      affirmation: form.affirmation,
      color: form.color,
      icon: form.icon,
      frequency: form.frequency,
    };
    try {
      const updated = await apiFetch<Habit>(`/habits/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setHabit(updated);
      setForm(updated);
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
                  className="flex-1 overflow-y-auto app-scroll min-h-0 -mr-1 pr-1"
                >
                  <div className="flex flex-col gap-4 sm:gap-5">
                    <Field label="Name" htmlFor="habit-name">
                      <TextField
                        id="habit-name"
                        value={form.name || ""}
                        onChange={(e) => handleChange("name", e.target.value)}
                        placeholder="Name your contract"
                      />
                    </Field>
                    <Field label="Description" htmlFor="habit-description">
                      <TextArea
                        id="habit-description"
                        rows={2}
                        value={form.description || ""}
                        onChange={(e) => handleChange("description", e.target.value)}
                        placeholder="What does this habit involve?"
                      />
                    </Field>
                    <Field label="Intent" htmlFor="habit-intent">
                      <TextArea
                        id="habit-intent"
                        rows={2}
                        value={form.intent || ""}
                        onChange={(e) => handleChange("intent", e.target.value)}
                        placeholder="Why does this matter to you?"
                      />
                    </Field>
                    <Field label="Affirmation" htmlFor="habit-affirmation">
                      <TextArea
                        id="habit-affirmation"
                        rows={2}
                        value={form.affirmation || ""}
                        onChange={(e) => handleChange("affirmation", e.target.value)}
                        placeholder="A truth to repeat"
                      />
                    </Field>
                    <Field label="Frequency" htmlFor="habit-frequency">
                      <SelectField
                        id="habit-frequency"
                        value={form.frequency || HabitFrequency.DAILY}
                        onChange={(e) => handleChange("frequency", e.target.value)}
                      >
                        {(Object.values(HabitFrequency) as string[]).map((freq) => (
                          <option key={freq} value={freq}>
                            {freq.charAt(0).toUpperCase() + freq.slice(1)}
                          </option>
                        ))}
                      </SelectField>
                    </Field>
                    <Field label="Colour">
                      <HabitColorPicker
                        value={form.color}
                        onChange={(color) => handleChange("color", color)}
                      />
                    </Field>
                    <Field label="Icon">
                      <HabitIconPicker
                        value={form.icon}
                        onChange={(icon) => handleChange("icon", icon)}
                      />
                    </Field>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="view"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="flex-1 overflow-y-auto app-scroll min-h-0 -mr-1 pr-1"
                >
                  <div className="flex flex-col gap-4 sm:gap-6">
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
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action footer — pinned below the scroll area so Save/Cancel stay
                reachable on mobile even when the form overflows. */}
            <div className="shrink-0 flex flex-col gap-3 pt-3">
              {error && <p className="text-red-400 text-sm">{error}</p>}
              {edit ? (
                <div className="flex gap-3">
                  <FormButton variant="primary" onClick={saveEdits} className="flex-1 sm:flex-none">
                    <Save className="h-4 w-4" /> Save
                  </FormButton>
                  <FormButton variant="secondary" onClick={() => setEdit(false)} className="flex-1 sm:flex-none">
                    <X className="h-4 w-4" /> Cancel
                  </FormButton>
                </div>
              ) : (
                <div className="flex gap-3">
                  <FormButton variant="primary" onClick={() => setEdit(true)} className="flex-1 sm:flex-none">
                    <PencilIcon className="h-4 w-4" /> Edit
                  </FormButton>
                  <FormButton variant="danger" onClick={handleDelete} className="flex-1 sm:flex-none">
                    Delete
                  </FormButton>
                </div>
              )}
            </div>
          </div>
        </GlassPanel>
      </div>
    </PageTransition>
  );
}
