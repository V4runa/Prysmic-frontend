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
  const [isCompleting, setIsCompleting] = useState(false);
  const [isUncompleting, setIsUncompleting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const toggleComplete = async () => {
    if (updating || animating) return;
    setUpdating(true);
    try {
      const endpoint = task.isComplete ? "uncomplete" : "complete";
      await apiFetch(`/tasks/${task.id}/${endpoint}`, { method: "POST" });

      if (!task.isComplete) {
        setAnimating(true);
        setTimeout(() => {
          setIsCompleting(true);
        }, 1000);

        setTimeout(() => {
          onUpdate?.();
          setIsCompleting(false);
          setAnimating(false);
        }, 2000);
      } else {
        setAnimating(true);
        setTimeout(() => {
          setIsUncompleting(true);
        }, 200); // Start uncompleting animation at 0.2s

        setTimeout(() => {
          onUpdate?.();
          setIsUncompleting(false);
          setAnimating(false);
        }, 1200); // 1.2 seconds - uncompleting completes
      }
    } finally {
      setUpdating(false);
    }
  };

  const archive = async () => {
    setIsArchiving(true);
    setAnimating(true);
    await apiFetch(`/tasks/${task.id}/archive`, { method: "POST" });
    setTimeout(() => {
      onUpdate?.();
      setIsArchiving(false);
    }, 2000);
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
        "relative group p-4 rounded-xl border backdrop-blur-lg shadow-md transition min-h-[120px]",
        "bg-white/5 border-white/10 hover:shadow-lg",
        updating && "opacity-50 pointer-events-none",
        task.isComplete && "bg-green-500/5 border-green-400/20",
        isCompleting && "opacity-0 scale-95"
      )}
      initial={false}
      animate={
        isCompleting
          ? {
              opacity: 0,
              scale: 0.95,
              y: -20,
              rotateX: -5,
            }
          : isUncompleting
          ? {
              opacity: 0.9,
              scale: 1.02,
              y: -2,
              rotateX: 1,
            }
          : isArchiving
          ? {
              opacity: 0,
              scale: 0.9,
              y: 20,
              rotateX: 5,
            }
          : animating
          ? { scale: 1.02 }
          : { scale: 1, opacity: 1, y: 0, rotateX: 0 }
      }
      transition={{
        type: "spring",
        stiffness: 100,
        damping: 30,
        duration: isCompleting
          ? 1.0
          : isUncompleting || isArchiving
          ? 1.0
          : 0.3,
      }}
    >
      {/* ✅ Completion animation overlay */}
      {animating && !task.isComplete && (
        <motion.div
          className="absolute inset-0 bg-green-500/20 backdrop-blur-sm rounded-xl z-20 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {/* Checkmark animation */}
          <motion.div
            className="relative z-10"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.3, ease: "backOut" }}
          >
            <motion.div
              className="bg-green-500 rounded-full p-4 shadow-lg"
              animate={{
                scale: [1, 1.3, 1],
                boxShadow: [
                  "0 0 0 0 rgba(34, 197, 94, 0.4)",
                  "0 0 0 30px rgba(34, 197, 94, 0)",
                  "0 0 0 0 rgba(34, 197, 94, 0)",
                ],
              }}
              transition={{
                duration: 0.6,
                delay: 0.4,
                times: [0, 0.6, 1],
              }}
            >
              <CheckCircle2 className="h-8 w-8 text-white" />
            </motion.div>
          </motion.div>

          {/* Success text */}
          <motion.div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.2 }}
          >
            <span className="text-green-300 font-medium text-sm">
              Completed!
            </span>
          </motion.div>
        </motion.div>
      )}

      {/* Uncompleting animation overlay */}
      {animating && task.isComplete && isUncompleting && (
        <motion.div
          className="absolute inset-0 bg-blue-500/20 backdrop-blur-sm rounded-xl z-20 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {/* Remove strikethrough animation */}
          <motion.div
            className="absolute top-1/2 left-0 h-0.5 bg-blue-400 -translate-y-1/2"
            initial={{ width: "100%" }}
            animate={{ width: 0 }}
            transition={{
              delay: 0.3,
              duration: 0.6,
              ease: "easeIn",
            }}
          />

          <motion.div
            className="relative z-10"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.4, ease: "backOut" }}
          >
            <motion.div
              className="bg-blue-500 rounded-full p-4 shadow-lg"
              animate={{
                scale: [1, 1.2, 1],
                boxShadow: [
                  "0 0 0 0 rgba(59, 130, 246, 0.4)",
                  "0 0 0 25px rgba(59, 130, 246, 0)",
                  "0 0 0 0 rgba(59, 130, 246, 0)",
                ],
              }}
              transition={{
                duration: 0.8,
                delay: 0.4,
                times: [0, 0.6, 1],
              }}
            >
              <Circle className="h-8 w-8 text-white" />
            </motion.div>
          </motion.div>

          <motion.div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.3 }}
          >
            <span className="text-blue-300 font-medium text-sm">
              Reactivated!
            </span>
          </motion.div>
        </motion.div>
      )}

      {/* Archiving animation overlay */}
      {animating && isArchiving && (
        <motion.div
          className="absolute inset-0 bg-orange-500/20 backdrop-blur-sm rounded-xl z-20 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="relative z-10"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.6, ease: "backOut" }}
          >
            <motion.div
              className="bg-orange-500 rounded-full p-4 shadow-lg"
              animate={{
                scale: [1, 1.1, 1],
                boxShadow: [
                  "0 0 0 0 rgba(249, 115, 22, 0.4)",
                  "0 0 0 20px rgba(249, 115, 22, 0)",
                  "0 0 0 0 rgba(249, 115, 22, 0)",
                ],
              }}
              transition={{
                duration: 1.2,
                delay: 0.5,
                times: [0, 0.5, 1],
              }}
            >
              <Archive className="h-8 w-8 text-white" />
            </motion.div>
          </motion.div>

          <motion.div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.4 }}
          >
            <span className="text-orange-300 font-medium text-sm">
              Archived!
            </span>
          </motion.div>
        </motion.div>
      )}

      {/* Top row */}
      <div className="flex justify-between items-start gap-3 mb-4">
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
              <motion.h3
                className={clsx(
                  "text-white font-medium text-base truncate cursor-pointer relative",
                  task.isComplete && "text-green-300/60"
                )}
                onClick={() => setEditing(true)}
                animate={
                  animating && !task.isComplete
                    ? {
                        color: "rgb(34, 197, 94, 0.6)",
                      }
                    : animating && task.isComplete && isUncompleting
                    ? {
                        color: "rgb(255, 255, 255)",
                      }
                    : task.isComplete
                    ? {
                        color: "rgb(34, 197, 94, 0.6)",
                      }
                    : {}
                }
                transition={{
                  duration: 0.6,
                  delay:
                    animating && !task.isComplete
                      ? 0.3
                      : animating && task.isComplete && isUncompleting
                      ? 0.3
                      : 0,
                }}
              >
                {task.title}
                {/* Animated strikethrough line for completing */}
                {animating && !task.isComplete && (
                  <motion.div
                    className="absolute top-1/2 left-0 h-0.5 bg-green-400 -translate-y-1/2"
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{
                      delay: 0.2,
                      duration: 0.6,
                      ease: "easeOut",
                    }}
                  />
                )}
                {/* Animated reverse strikethrough line for uncompleting */}
                {animating && task.isComplete && isUncompleting && (
                  <motion.div
                    className="absolute top-1/2 left-0 h-0.5 bg-green-400 -translate-y-1/2"
                    initial={{ width: "100%" }}
                    animate={{ width: 0 }}
                    transition={{
                      delay: 0.3,
                      duration: 0.6,
                      ease: "easeIn",
                    }}
                  />
                )}
                {/* Static strikethrough for completed tasks */}
                {task.isComplete && !animating && (
                  <div className="absolute top-1/2 left-0 w-full h-0.5 bg-green-400 -translate-y-1/2" />
                )}
              </motion.h3>
              <Pencil
                className="h-4 w-4 text-cyan-300 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                onClick={() => setEditing(true)}
              />
            </div>
          )}

          {task.description && (
            <p
              className={clsx(
                "text-sm mt-1 line-clamp-3",
                task.isComplete ? "text-green-300/50" : "text-white/60"
              )}
            >
              {task.description}
            </p>
          )}

          {task.dueDate && (
            <p
              className={clsx(
                "text-xs mt-1",
                task.isComplete ? "text-green-300/40" : "text-white/40"
              )}
            >
              Due: {format(new Date(task.dueDate), "PPP")}
            </p>
          )}
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

      {/* Bottom section with priority and completion status */}
      <div className="flex justify-between items-center">
        <div
          className={clsx(
            "inline-block px-2 py-0.5 text-xs rounded-full border font-medium",
            task.isComplete
              ? "border-green-400/30 bg-green-400/10 text-green-300"
              : priorityMap[task.priority].class
          )}
        >
          {task.isComplete
            ? "Completed"
            : `${priorityMap[task.priority].label} Priority`}
        </div>
      </div>

      {/* ✅ Completion button (bottom-right) */}
      <div className="absolute bottom-4 right-4 z-20">
        <motion.button
          onClick={toggleComplete}
          whileTap={{ scale: 0.9 }}
          title="Toggle complete"
          className={clsx(
            "rounded-full border p-2 transition",
            task.isComplete
              ? "border-green-400/30 bg-green-400/10 hover:bg-green-400/20"
              : "border-white/20 hover:bg-white/10"
          )}
        >
          {task.isComplete ? (
            <CheckCircle2 className="h-4 w-4 text-green-400" />
          ) : (
            <Circle className="h-4 w-4 text-white/30" />
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}
