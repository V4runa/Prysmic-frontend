"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../hooks/useApi";
import { Task, TaskPriority } from "../tasks/types/task";
import PageTransition from "../components/PageTransition";
import GlassPanel from "../components/GlassPanel";
import TaskCard from "../components/TaskCard";
import TaskFilters from "../components/TaskFilters";

export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<{
    complete?: boolean;
    priority?: TaskPriority;
    search: string;
  }>({
    complete: undefined,
    priority: undefined,
    search: "",
  });

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const params = new URLSearchParams();
        if (filters.complete !== undefined) {
          params.append("complete", String(filters.complete));
        }
        if (filters.priority !== undefined) {
          params.append("priority", String(filters.priority));
        }
        if (filters.search.trim()) {
          params.append("search", filters.search);
        }
        const data = await apiFetch<Task[]>(`/tasks?${params.toString()}`);
        setTasks(data);
      } catch (err) {
        console.error("Failed to fetch tasks:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [filters]);

  return (
    <PageTransition>
      <div className="pt-[80px] px-[clamp(1rem,5vw,3rem)] pb-20 min-h-screen">
        <GlassPanel className="p-6 w-full">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-white">Your Tasks</h1>
            <button
              onClick={() => router.push("/tasks/new")}
              className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2 px-4 rounded-md shadow-md transition-colors"
            >
              + New Task
            </button>
          </div>

          <TaskFilters filters={filters} setFilters={setFilters} />

          {loading ? (
            <p className="text-white/60 mt-8">Loading tasks...</p>
          ) : tasks.length === 0 ? (
            <p className="text-white/60 mt-8">No tasks found.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-6">
              {tasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </GlassPanel>
      </div>
    </PageTransition>
  );
}