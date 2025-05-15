"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import GlassPanel from "../components/GlassPanel";
import PageTransition from "../components/PageTransition";
import { apiFetch } from "../hooks/useApi";
import { CheckCircle2, Trash2, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

interface Habit {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  checks?: { date: string }[];
  createdAt: string;
}

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<Habit[]>("/habits")
      .then(setHabits)
      .catch(() => setError("Failed to load habits"));
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      const created = await apiFetch<Habit>("/habits", {
        method: "POST",
        body: JSON.stringify({ name, description }),
      });
      setHabits((prev) => [...prev, created]);
      setName("");
      setDescription("");
    } catch {
      setError("Failed to create habit");
    }
  };

  const handleCheckToggle = async (id: number) => {
    try {
      const res = await apiFetch<{ checked: boolean }>(`/habits/${id}/check`, {
        method: "POST",
      });
      const today = new Date().toISOString().split("T")[0];
      setHabits((prev) =>
        prev.map((h) =>
          h.id === id
            ? {
                ...h,
                checks: res.checked
                  ? [...(h.checks || []), { date: today }]
                  : (h.checks || []).filter((c) => c.date !== today),
              }
            : h
        )
      );
    } catch {
      setError("Failed to toggle check-in");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiFetch(`/habits/${id}`, { method: "DELETE" });
      setHabits((prev) => prev.filter((h) => h.id !== id));
    } catch {
      setError("Failed to delete habit");
    }
  };

  const isCheckedToday = (habit: Habit) => {
    const today = new Date().toISOString().split("T")[0];
    return habit.checks?.some((c) => c.date === today);
  };

  return (
    <PageTransition>
      <div className="min-h-screen w-full flex flex-col items-center justify-start gap-12 pt-8 pb-20 px-6">
        <GlassPanel className="w-full max-w-4xl flex flex-col gap-6">
          <h2 className="text-3xl text-slate-100 font-bold tracking-wide">Your Daily Contracts</h2>
          <p className="text-slate-400">
            Commitments to growth, forged with intention.
          </p>

          {/* Create Habit */}
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <input
              type="text"
              placeholder="New habit title..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 px-4 py-2 bg-white/10 text-slate-200 rounded-md border border-white/10"
            />
            <input
              type="text"
              placeholder="Short description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex-1 px-4 py-2 bg-white/10 text-slate-300 rounded-md border border-white/10"
            />
            <button
              onClick={handleCreate}
              className="px-5 py-2 bg-cyan-400/10 text-cyan-300 rounded-md border border-cyan-300/20 hover:bg-cyan-400/20 transition"
            >
              +
            </button>
          </div>

          {/* Habit Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {habits.map((habit) => {
              const isTodayChecked = isCheckedToday(habit);
              return (
                <motion.div
                  key={habit.id}
                  whileHover={{ scale: 1.02 }}
                  className={`relative flex flex-col gap-3 rounded-2xl p-5 border border-white/10 bg-white/5 backdrop-blur-md shadow-md transition ${
                    isTodayChecked ? "ring-2 ring-cyan-400/40 shadow-cyan-400/20" : ""
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-slate-100 truncate">
                      {habit.name}
                    </h3>
                    <button
                      onClick={() => handleCheckToggle(habit.id)}
                      title="Check-in for today"
                      className={`rounded-full p-2 border ${
                        isTodayChecked
                          ? "bg-cyan-400/20 border-cyan-300/30"
                          : "bg-white/10 border-white/10 hover:bg-white/20"
                      }`}
                    >
                      <CheckCircle2
                        className={`h-5 w-5 ${
                          isTodayChecked ? "text-cyan-300" : "text-slate-300"
                        }`}
                      />
                    </button>
                  </div>

                  {habit.description && (
                    <p className="text-slate-400 text-sm line-clamp-3">
                      {habit.description}
                    </p>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Link
                      href={`/habits/${habit.id}`}
                      title="Open habit contract"
                      className="p-1 border border-cyan-300/20 rounded-md hover:bg-cyan-400/10"
                    >
                      <ExternalLink className="h-4 w-4 text-cyan-300" />
                    </Link>
                    <button
                      onClick={() => handleDelete(habit.id)}
                      title="Delete habit"
                      className="p-1 border border-red-300/20 rounded-md hover:bg-red-400/10"
                    >
                      <Trash2 className="h-4 w-4 text-red-300" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
        </GlassPanel>
      </div>
    </PageTransition>
  );
}
