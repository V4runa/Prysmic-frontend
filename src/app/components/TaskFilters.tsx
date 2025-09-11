import { TaskPriority } from "../Tasks/types/task";

interface TaskFiltersProps {
  filters: {
    complete?: boolean;
    priority?: TaskPriority;
    search: string;
  };
  setFilters: (filters: TaskFiltersProps["filters"]) => void;
}

export default function TaskFilters({ filters, setFilters }: TaskFiltersProps) {
  return (
    <div className="flex flex-wrap gap-4 mb-6">
      <input
        type="text"
        placeholder="Search tasks..."
        value={filters.search}
        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        className="bg-white/10 border border-white/20 text-white placeholder-white/40 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
      />

      <select
        value={filters.priority ?? ""}
        onChange={(e) =>
          setFilters({
            ...filters,
            priority: e.target.value === "" ? undefined : Number(e.target.value) as TaskPriority,
          })
        }
        className="bg-white/10 border border-white/20 text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
      >
        <option value="">All Priorities</option>
        <option value={TaskPriority.LOW}>Low</option>
        <option value={TaskPriority.MEDIUM}>Medium</option>
        <option value={TaskPriority.HIGH}>High</option>
      </select>

      <select
        value={filters.complete === undefined ? "" : filters.complete ? "true" : "false"}
        onChange={(e) =>
          setFilters({
            ...filters,
            complete: e.target.value === "" ? undefined : e.target.value === "true",
          })
        }
        className="bg-white/10 border border-white/20 text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
      >
        <option value="">All Statuses</option>
        <option value="false">Incomplete</option>
        <option value="true">Complete</option>
      </select>
    </div>
  );
}
