"use client";

import { useState } from "react";
import { apiFetch } from "../hooks/useApi";
import { motion, AnimatePresence } from "framer-motion";
import { TaskPriority } from "../tasks/types/task";
import { ChevronDown, ChevronUp } from "lucide-react";

interface QuickTaskInputProps {
  onTaskCreated?: () => void;
}

export default function QuickTaskInput({ onTaskCreated }: QuickTaskInputProps) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [dueDate, setDueDate] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleExpanded = () => setExpanded((prev) => !prev);

  const handleSubmit = async () => {
    if (!title.trim()) return;

    setLoading(true);
    setError("");

    try {
      const payload = {
        title,
        priority,
        dueDate: dueDate || null,
      };

      await apiFetch("/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setTitle("");
      setPriority(TaskPriority.MEDIUM);
      setDueDate("");
      setExpanded(false);
      onTaskCreated?.();
    } catch (err) {
      console.error("Failed to create task", err);
      setError("Could not create task");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !expanded) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <motion.div
      className="mb-6 w-full"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <input
          type="text"
          placeholder="Add a new task..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-white/10 border border-white/20 text-white placeholder-white/40 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
        />

        <button
          onClick={toggleExpanded}
          type="button"
          className="px-3 py-2 text-white/70 hover:text-white border border-white/20 rounded-md transition flex items-center gap-1"
        >
          {expanded ? (
            <>
              Less <ChevronUp className="h-4 w-4" />
            </>
          ) : (
            <>
              More <ChevronDown className="h-4 w-4" />
            </>
          )}
        </button>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-md font-medium transition disabled:opacity-50"
        >
          {loading ? "Adding..." : "Add"}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="expanded-fields"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 overflow-hidden"
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-white/70 mb-1 block">Priority</label>
                <select
                  value={priority}
                  onChange={(e) =>
                    setPriority(Number(e.target.value) as TaskPriority)
                  }
                  className="w-full bg-white/10 text-white border border-white/20 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value={TaskPriority.LOW}>Low</option>
                  <option value={TaskPriority.MEDIUM}>Medium</option>
                  <option value={TaskPriority.HIGH}>High</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-white/70 mb-1 block">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-white/10 text-white border border-white/20 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <p className="text-red-400 text-sm mt-3">{error}</p>
      )}
    </motion.div>
  );
}
