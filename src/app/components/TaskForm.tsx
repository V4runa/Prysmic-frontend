"use client";

import { useState, useEffect } from "react";
import { Task, TaskPriority } from "../tasks/types/task";
import { apiFetch } from "../hooks/useApi";
import clsx from "clsx";

interface TaskFormProps {
  task?: Task; // if present = edit mode
  onSuccess?: () => void;
}

export default function TaskForm({ task, onSuccess }: TaskFormProps) {
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [priority, setPriority] = useState<TaskPriority>(
    task?.priority ?? TaskPriority.MEDIUM
  );
  const [dueDate, setDueDate] = useState<string>(
    task?.dueDate ? task.dueDate.slice(0, 10) : ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setPriority(task.priority ?? TaskPriority.MEDIUM);
      setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : "");
    }
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = { title, description, priority, dueDate: dueDate || null };

      if (task) {
        await apiFetch(`/tasks/${task.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      onSuccess?.();
    } catch (err) {
      console.error("Error saving task:", err);
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="text-white block mb-1 text-sm">Title</label>
        <input
          type="text"
          value={title}
          required
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md px-4 py-2 bg-white/10 text-white placeholder-white/40 border border-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          placeholder="e.g., Fix landing page bug"
        />
      </div>

      <div>
        <label className="text-white block mb-1 text-sm">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full rounded-md px-4 py-2 bg-white/10 text-white placeholder-white/40 border border-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          placeholder="Optional notes or extra context..."
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-white block mb-1 text-sm">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value) as TaskPriority)}
            className="w-full rounded-md px-4 py-2 bg-white/10 text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value={TaskPriority.LOW}>Low</option>
            <option value={TaskPriority.MEDIUM}>Medium</option>
            <option value={TaskPriority.HIGH}>High</option>
          </select>
        </div>

        <div>
          <label className="text-white block mb-1 text-sm">Due Date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-md px-4 py-2 bg-white/10 text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className={clsx(
          "mt-4 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2 px-6 rounded-md transition duration-200",
          loading && "opacity-60"
        )}
      >
        {loading
          ? task
            ? "Saving..."
            : "Creating..."
          : task
          ? "Save Changes"
          : "Create Task"}
      </button>
    </form>
  );
}
