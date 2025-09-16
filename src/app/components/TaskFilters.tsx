"use client";

import { TaskPriority } from "../tasks/types/task";
import { Search } from "lucide-react";

interface TaskFiltersProps {
  filters: {
    complete?: boolean;
    priority?: TaskPriority;
    search: string;
  };
  setFilters: (filters: TaskFiltersProps["filters"]) => void;
}

const priorityOptions = [
  { label: "Low", value: TaskPriority.LOW, color: "text-emerald-300" },
  { label: "Medium", value: TaskPriority.MEDIUM, color: "text-amber-300" },
  { label: "High", value: TaskPriority.HIGH, color: "text-rose-300" },
];

export default function TaskFilters({ filters, setFilters }: TaskFiltersProps) {
  return (
    <div className="grid sm:grid-cols-3 gap-4 mb-6 w-full">
      {/* 🔍 Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 h-4 w-4" />
        <input
          type="text"
          placeholder="Search tasks..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="w-full pl-9 pr-4 py-2 bg-white/10 border border-white/20 text-white placeholder-white/40 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
      </div>

      {/* 🚩 Priority */}
      <select
        value={filters.priority ?? ""}
        onChange={(e) =>
          setFilters({
            ...filters,
            priority:
              e.target.value === ""
                ? undefined
                : (Number(e.target.value) as TaskPriority),
          })
        }
        className="w-full bg-white/10 border border-white/20 text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
      >
        <option value="">All Priorities</option>
        {priorityOptions.map((opt) => (
          <option
            key={opt.value}
            value={opt.value}
            className={opt.color}
          >
            {opt.label}
          </option>
        ))}
      </select>

      {/* ✅ Completion */}
      <select
        value={
          filters.complete === undefined
            ? ""
            : filters.complete
            ? "true"
            : "false"
        }
        onChange={(e) =>
          setFilters({
            ...filters,
            complete:
              e.target.value === ""
                ? undefined
                : e.target.value === "true",
          })
        }
        className="w-full bg-white/10 border border-white/20 text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
      >
        <option value="">All Statuses</option>
        <option value="false">Incomplete</option>
        <option value="true">Complete</option>
      </select>
    </div>
  );
}
