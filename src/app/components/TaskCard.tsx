"use client";

import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { Task, TaskPriority } from "../tasks/types/task";
import { apiFetch } from "../hooks/useApi";
import { CheckCircle2, Circle, Pencil, Save } from "lucide-react";
import clsx from "clsx";

interface TaskCardProps {
  task: Task;
  onUpdate?: () => void;
}

const priorityMap = {
  [TaskPriority.LOW]: {
    label: "Low",
    class: "text-emerald-300 border-emerald-300/30 bg-emerald-400/5",
  },
  [TaskPriority.MEDIUM]: {
    label: "Medium",
    class: "text-amber-300 border-amber-300/30 bg-amber-400/5",
  },
  [TaskPriority.HIGH]: {
    label: "High",
    class: "text-rose-300 border-rose-300/30 bg-rose-400/5",
  },
};

export default function TaskCard({ task, onUpdate }: TaskCardProps) {
  const [updating, setUpdating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const priority = priorityMap[task.priority];

  const toggleComplete = async () => {
    setUpdating(true);
    try {
      await apiFetch(`/tasks/${task.id}/${task.isComplete ? "uncomplete" : "complete"}`, {
        method: "POST",
      });
      onUpdate?.();
    } catch (err) {
      console.error("Toggle failed", err);
    } finally {
      setUpdating(false);
    }
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
    } catch (err) {
      console.error("Failed to update title", err);
    } finally {
      setEditing(false);
      setUpdating(false);
    }
  };

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
    }
  }, [editing]);

  return (
    <div
      className={clsx(
        "relative group p-4 rounded-xl border backdrop-blur-lg shadow-md transition",
        "bg-white/5 border-white/10 hover:shadow-lg hover:border-cyan-500",
        updating && "opacity-50 pointer-events-none"
      )}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={toggleComplete}
          disabled={updating}
          className="mt-1 rounded-full border border-white/20 p-1 hover:bg-white/10 transition"
          title={task.isComplete ? "Mark Incomplete" : "Mark Complete"}
        >
          {task.isComplete ? (
            <CheckCircle2 className="h-5 w-5 text-green-400" />
          ) : (
            <Circle className="h-5 w-5 text-white/30" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="relative">
              <input
                ref={inputRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    saveTitle();
                  } else if (e.key === "Escape") {
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
                title="Click to edit"
                onClick={() => setEditing(true)}
              >
                {task.title}
              </h3>
              <Pencil
                className="h-4 w-4 text-cyan-300 opacity-0 group-hover:opacity-100 transition"
                onClick={() => setEditing(true)}
              />
            </div>
          )}

          {task.description && (
            <p className="text-sm text-white/60 mt-1 line-clamp-3">
              {task.description}
            </p>
          )}

          {task.dueDate && (
            <p className="text-xs text-white/40 mt-1">
              Due: {format(new Date(task.dueDate), "PPP")}
            </p>
          )}

          <div
            className={clsx(
              "mt-2 inline-block px-2 py-0.5 text-xs rounded-full border font-medium",
              priority.class
            )}
          >
            {priority.label} Priority
          </div>
        </div>
      </div>
    </div>
  );
}