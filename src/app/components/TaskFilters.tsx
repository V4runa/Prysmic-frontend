"use client";

import { Search, X } from "lucide-react";
import { TaskPriority } from "../tasks/types/task";
import { TextField, SelectField } from "./forms";

export interface TaskFilterState {
  search: string;
  // "all" = no priority constraint. Status is intentionally omitted — the
  // Active/Completed/Archived tabs already own that axis.
  priority: TaskPriority | "all";
}

export const DEFAULT_TASK_FILTERS: TaskFilterState = {
  search: "",
  priority: "all",
};

export const hasActiveFilters = (f: TaskFilterState) =>
  f.search.trim() !== "" || f.priority !== "all";

const priorityOptions: { label: string; value: TaskPriority | "all" }[] = [
  { label: "All priorities", value: "all" },
  { label: "High priority", value: TaskPriority.HIGH },
  { label: "Medium priority", value: TaskPriority.MEDIUM },
  { label: "Low priority", value: TaskPriority.LOW },
];

interface TaskFiltersProps {
  filters: TaskFilterState;
  onChange: (filters: TaskFilterState) => void;
}

export default function TaskFilters({ filters, onChange }: TaskFiltersProps) {
  const active = hasActiveFilters(filters);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      {/* Search — grows to fill available width */}
      <div className="relative flex-1 min-w-0">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
        <TextField
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Search by title or description..."
          aria-label="Search tasks"
          className="pl-9"
        />
      </div>

      <div className="flex items-center gap-3">
        <div className="w-full sm:w-48">
          <SelectField
            value={String(filters.priority)}
            onChange={(e) =>
              onChange({
                ...filters,
                priority:
                  e.target.value === "all"
                    ? "all"
                    : (Number(e.target.value) as TaskPriority),
              })
            }
            aria-label="Filter by priority"
          >
            {priorityOptions.map((o) => (
              <option key={String(o.value)} value={String(o.value)}>
                {o.label}
              </option>
            ))}
          </SelectField>
        </div>

        {active && (
          <button
            type="button"
            onClick={() => onChange(DEFAULT_TASK_FILTERS)}
            aria-label="Clear filters"
            className="tap-target shrink-0 flex items-center gap-1 rounded-md px-2.5 py-2 text-xs text-slate-300 border border-white/10 hover:bg-white/10 transition"
          >
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>
    </div>
  );
}
