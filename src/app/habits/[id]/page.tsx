"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import GlassPanel from "../../components/GlassPanel";
import { apiFetch } from "../../hooks/useApi";
import { CheckCircle2, Trash2, Save, X, ArrowLeft, PencilIcon } from "lucide-react";
import { motion } from "framer-motion";

interface Habit {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  checks?: { date: string }[];
  createdAt: string;
}

export default function HabitDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [habit, setHabit] = useState<Habit | null>(null);
  const [editedName, setEditedName] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState("");

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    apiFetch(`/habits/${id}`)
      .then((data: unknown) => {
        const habitData = data as Habit;
        setHabit(habitData);
        setEditedName(habitData.name);
        setEditedDescription(habitData.description || "");
      })
      .catch(() => setError("Could not load habit"));
  }, [id]);

  const isCheckedToday = habit?.checks?.some((c) => c.date === today);

  const toggleCheck = async () => {
    try {
      const res = await apiFetch<{ checked: boolean }>(`/habits/${id}/check`, {
        method: "POST",
      });
      const newCheck = { date: today };
      if (habit) {
        setHabit({
          ...habit,
          checks: res.checked
            ? [...(habit.checks || []), newCheck]
            : (habit.checks || []).filter((c) => c.date !== today),
        });
      }
    } catch {
      setError("Failed to toggle check-in");
    }
  };

  const saveEdits = async () => {
    try {
      const updated = await apiFetch<Habit>(`/habits/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editedName,
          description: editedDescription,
        }),
      });
      setHabit(updated);
      setIsEditing(false);
    } catch {
      setError("Failed to save changes");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this contract?")) return;
    try {
      await apiFetch(`/habits/${id}`, { method: "DELETE" });
      router.push("/habits");
    } catch {
      setError("Failed to delete habit");
    }
  };

  if (!habit) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400">{error || "Loading..."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 bg-transparent">
      <GlassPanel className="w-full max-w-3xl flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold text-slate-100 tracking-wide">
            {isEditing ? "Edit Contract" : "Habit Contract"}
          </h2>
          <button
            onClick={() => router.push("/habits")}
            title="Back"
            className="p-2 border border-white/10 rounded-md hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5 text-slate-300" />
          </button>
        </div>

        {isEditing ? (
          <>
            <input
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              className="w-full px-4 py-2 bg-white/10 text-slate-100 rounded-md"
            />
            <textarea
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 bg-white/10 text-slate-300 rounded-md resize-none"
              placeholder="Describe the intent, ritual, or scope of this habit..."
            />
            <div className="flex gap-3">
              <button
                onClick={saveEdits}
                className="p-2 bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-300/20 rounded-md"
              >
                <Save className="h-5 w-5 text-cyan-300" />
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="p-2 border border-white/10 hover:bg-white/10 rounded-md"
              >
                <X className="h-5 w-5 text-slate-300" />
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-slate-100">{habit.name}</h3>
              <button
                onClick={toggleCheck}
                className={`rounded-full p-2 border ${
                  isCheckedToday
                    ? "bg-cyan-400/20 border-cyan-300/30"
                    : "bg-white/10 border-white/10 hover:bg-white/20"
                }`}
              >
                <CheckCircle2
                  className={`h-5 w-5 ${
                    isCheckedToday ? "text-cyan-300" : "text-slate-300"
                  }`}
                />
              </button>
            </div>

            {habit.description && (
              <p className="text-slate-400 whitespace-pre-line">{habit.description}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 border border-cyan-300/20 hover:bg-cyan-400/10 rounded-md"
              >
                <PencilIcon className="h-5 w-5 text-cyan-300" />
              </button>
              <button
                onClick={handleDelete}
                className="p-2 border border-red-300/20 hover:bg-red-400/10 rounded-md"
              >
                <Trash2 className="h-5 w-5 text-red-300" />
              </button>
            </div>
          </>
        )}
      </GlassPanel>
    </div>
  );
}
