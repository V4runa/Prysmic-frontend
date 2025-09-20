"use client";

import { useState, useRef, useEffect } from "react";
import { Task, TaskPriority } from "../tasks/types/task";
import { apiFetch } from "../hooks/useApi";
import {
  CheckCircle2,
  Circle,
  Pencil,
  Save,
  MoreVertical,
  Archive,
  Trash2,
} from "lucide-react";
import clsx from "clsx";
import { format } from "date-fns";
import { motion } from "framer-motion";

interface TaskCardProps {
  task: Task;
  onUpdate?: () => void;
}

const priorityMap = {
  [TaskPriority.LOW]: {
    class: "border-emerald-400/30 bg-emerald-400/5 text-emerald-300",
    label: "Low",
  },
  [TaskPriority.MEDIUM]: {
    class: "border-amber-400/30 bg-amber-400/5 text-amber-300",
    label: "Medium",
  },
  [TaskPriority.HIGH]: {
    class: "border-rose-400/30 bg-rose-400/5 text-rose-300",
    label: "High",
  },
};

export default function TaskCard({ task, onUpdate }: TaskCardProps) {
  const [updating, setUpdating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [showMenu, setShowMenu] = useState(false);
  const [animating, setAnimating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const toggleComplete = async () => {
    if (updating) return;
    setUpdating(true);
    try {
      const endpoint = task.isComplete ? "uncomplete" : "complete";
      await apiFetch(`/tasks/${task.id}/${endpoint}`, { method: "POST" });
      setAnimating(true);
      setTimeout(() => setAnimating(false), 1200);
      onUpdate?.();
    } finally {
      setUpdating(false);
    }
  };

  const archive = async () => {
    await apiFetch(`/tasks/${task.id}/archive`, { method: "POST" });
    onUpdate?.();
  };

  const del = async () => {
    await apiFetch(`/tasks/${task.id}`, { method: "DELETE" });
    onUpdate?.();
  };

  const saveTitle = async () => {
    if (!title.trim() || title.trim() === task.title) {
      setTitle(task.title);
      setEditing(false);
      return;
    }

    setUpdating(true);
    try {
      await apiFetch(`/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });
      onUpdate?.();
    } finally {
      setEditing(false);
      setUpdating(false);
    }
  };

  return (
    <motion.div
      className={clsx(
        "relative group p-4 rounded-xl border backdrop-blur-lg shadow-md transition",
        "bg-white/5 border-white/10 hover:shadow-lg",
        updating && "opacity-50 pointer-events-none"
      )}
      initial={false}
      animate={animating ? { scale: 1.03 } : { scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
    >
      {/* ✅ Completion glow */}
      {animating && (
        <>
          <motion.div
            className="absolute inset-0 bg-green-300/10 blur-2xl rounded-xl z-0"
            initial={{ opacity: 0.6, scale: 0.9 }}
            animate={{ opacity: 0, scale: 1.6 }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
          <motion.div
            className="absolute inset-0 border-2 border-green-400/30 rounded-xl z-0"
            initial={{ opacity: 0.5, scale: 0.8 }}
            animate={{ opacity: 0, scale: 1.3 }}
            transition={{ duration: 1.1, ease: "easeOut" }}
          />
        </>
      )}

      {/* Top row */}
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="relative">
              <input
                ref={inputRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveTitle();
                  if (e.key === "Escape") {
                    setTitle(task.title);
                    setEditing(false);
                  }
                }}
                className="w-full bg-white/10 border border-cyan-400/20 text-white px-3 py-1.5 rounded-md text-sm outline-none"
              />
              <Save
                className="absolute right-2 top-1.5 h-4 w-4 text-cyan-300 cursor-pointer"
                onClick={saveTitle}
              />
            </div>
          ) : (
            <div className="flex justify-between items-start gap-2">
              <h3
                className={clsx(
                  "text-white font-medium text-base truncate cursor-pointer",
                  task.isComplete && "line-through text-white/40"
                )}
                onClick={() => setEditing(true)}
              >
                {task.title}
              </h3>
              <Pencil
                className="h-4 w-4 text-cyan-300 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                onClick={() => setEditing(true)}
              />
            </div>
          )}

          {task.description && (
            <p className="text-sm text-white/60 mt-1 line-clamp-3">{task.description}</p>
          )}

          {task.dueDate && (
            <p className="text-xs text-white/40 mt-1">
              Due: {format(new Date(task.dueDate), "PPP")}
            </p>
          )}

          <div
            className={clsx(
              "mt-2 inline-block px-2 py-0.5 text-xs rounded-full border font-medium",
              priorityMap[task.priority].class
            )}
          >
            {priorityMap[task.priority].label} Priority
          </div>
        </div>

        {/* Menu (top-right) */}
        <div className="relative">
          <MoreVertical
            className="h-5 w-5 text-white/40 cursor-pointer hover:text-white"
            onClick={() => setShowMenu((prev) => !prev)}
          />
          {showMenu && (
            <div className="absolute right-0 mt-2 w-28 bg-zinc-800 border border-white/10 shadow-xl rounded-md z-30 overflow-hidden">
              <button
                className="w-full flex items-center gap-2 text-sm px-3 py-2 text-white/80 hover:bg-zinc-700"
                onClick={archive}
              >
                <Archive className="h-4 w-4" />
                Archive
              </button>
              <button
                className="w-full flex items-center gap-2 text-sm px-3 py-2 text-red-400 hover:bg-zinc-700"
                onClick={del}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ✅ Completion button (center-right) */}
      <div className="absolute top-1/2 right-4 -translate-y-1/2 z-20">
        <motion.button
          onClick={toggleComplete}
          whileTap={{ scale: 0.9 }}
          title="Toggle complete"
          className="rounded-full border border-white/20 p-1 hover:bg-white/10 transition"
        >
          {task.isComplete ? (
            <CheckCircle2 className="h-5 w-5 text-green-400" />
          ) : (
            <Circle className="h-5 w-5 text-white/30" />
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}
