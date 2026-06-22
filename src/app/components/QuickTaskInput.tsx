"use client";

import { useState, useRef } from "react";
import { apiFetch } from "../hooks/useApi";
import { motion, AnimatePresence } from "framer-motion";
import { TaskPriority } from "../tasks/types/task";
import { ChevronDown, ChevronUp, Plus, Check } from "lucide-react";
import { tactile } from "../lib/motion";
import clsx from "clsx";

interface QuickTaskInputProps {
  onTaskCreated?: () => void;
}

export default function QuickTaskInput({ onTaskCreated }: QuickTaskInputProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [dueDate, setDueDate] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [error, setError] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  const toggleExpanded = () => setExpanded((prev) => !prev);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = {
        title,
        description: description.trim() || null,
        priority,
        dueDate: dueDate || null,
      };

      await apiFetch("/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setTitle("");
      setDescription("");
      setPriority(TaskPriority.MEDIUM);
      setDueDate("");
      setExpanded(false);
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1100);
      titleRef.current?.focus();
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

  const moreButton = (className?: string) => (
    <motion.button
      {...tactile}
      onClick={toggleExpanded}
      type="button"
      className={clsx(
        "tap-target px-3 py-2 text-white/70 hover:text-white border border-white/20 rounded-md transition-colors flex items-center justify-center gap-1",
        className
      )}
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
    </motion.button>
  );

  const addButton = (className?: string) => (
    <motion.button
      {...tactile}
      onClick={handleSubmit}
      disabled={loading}
      animate={
        justAdded
          ? { backgroundColor: "rgb(22,163,74)" }
          : { backgroundColor: "rgb(8,145,178)" }
      }
      className={clsx(
        "tap-target px-4 py-2 text-white rounded-md font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5",
        className
      )}
    >
      {loading ? (
        "Adding..."
      ) : justAdded ? (
        <>
          <Check className="h-4 w-4" /> Added
        </>
      ) : (
        <>
          <Plus className="h-4 w-4" /> Add
        </>
      )}
    </motion.button>
  );

  return (
    <motion.div
      className="mb-6 w-full flex flex-col gap-3"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Title row — inline actions on desktop, stacked compose on mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <input
          ref={titleRef}
          type="text"
          placeholder="Add a new task..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full sm:flex-1 bg-white/10 border border-white/20 text-white placeholder-white/40 px-4 py-2 rounded-md focus-band transition"
        />

        <div className="hidden sm:flex items-center gap-3">
          {moreButton()}
          {addButton("min-w-[88px]")}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="expanded-fields"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-white/70 mb-1 block">Priority</label>
                <select
                  value={priority}
                  onChange={(e) =>
                    setPriority(Number(e.target.value) as TaskPriority)
                  }
                  className="w-full bg-[#13161a] text-slate-100 border border-white/20 px-4 py-2 rounded-md focus-band transition"
                >
                  <option value={TaskPriority.LOW} className="bg-[#13161a] text-slate-100">Low</option>
                  <option value={TaskPriority.MEDIUM} className="bg-[#13161a] text-slate-100">Medium</option>
                  <option value={TaskPriority.HIGH} className="bg-[#13161a] text-slate-100">High</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-white/70 mb-1 block">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-white/10 text-white border border-white/20 px-4 py-2 rounded-md focus-band transition [color-scheme:dark]"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="text-sm text-white/70 mb-1 block">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Optional task details..."
                className="w-full bg-white/10 text-white border border-white/20 px-4 py-2 rounded-md focus-band transition"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* Mobile action row — Add is always the last, full-width step */}
      <div className="flex sm:hidden items-center gap-3">
        {moreButton()}
        {addButton("flex-1")}
      </div>
    </motion.div>
  );
}
