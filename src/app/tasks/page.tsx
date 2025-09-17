"use client";

import { useEffect, useState, useCallback } from "react";
import { Task, TaskPriority } from "../tasks/types/task";
import { apiFetch } from "../hooks/useApi";
import PageTransition from "../components/PageTransition";
import GlassPanel from "../components/GlassPanel";
import TaskCard from "../components/TaskCard";
import TaskFilters from "../components/TaskFilters";
import QuickTaskInput from "../components/QuickTaskInput";

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<{
    complete?: boolean;
    priority?: TaskPriority;
    search: string;
  }>({
    complete: false, // default to showing incomplete tasks
    priority: undefined,
    search: "",
  });

  const [showCompleted, setShowCompleted] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [loadingCompleted, setLoadingCompleted] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
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
  }, [filters]);

  const fetchCompletedTasks = useCallback(async () => {
    setLoadingCompleted(true);
    try {
      const params = new URLSearchParams();
      params.append("complete", "true");
      const data = await apiFetch<Task[]>(`/tasks?${params.toString()}`);
      setCompletedTasks(data);
    } catch (err) {
      console.error("Failed to fetch completed tasks:", err);
    } finally {
      setLoadingCompleted(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    if (showCompleted) {
      fetchCompletedTasks();
    }
  }, [showCompleted, fetchCompletedTasks]);

  return (
    <PageTransition>
      <div className="pt-[80px] px-[clamp(1rem,5vw,3rem)] pb-20 min-h-screen">
        <GlassPanel className="p-6 w-full flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-3xl font-bold text-white">Your Tasks</h1>
          </div>

          <div className="w-full flex flex-col gap-4">
            <QuickTaskInput onTaskCreated={fetchTasks} />
            <TaskFilters filters={filters} setFilters={setFilters} />
          </div>

          <div className="mt-4">
            {loading ? (
              <p className="text-white/60 text-sm">Loading tasks...</p>
            ) : tasks.length === 0 ? (
              <p className="text-white/60 text-sm">No tasks found.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {tasks.map((task) => (
                  <TaskCard key={task.id} task={task} onUpdate={fetchTasks} />
                ))}
              </div>
            )}
          </div>

          {/* ✅ Toggle for showing completed tasks */}
          <div className="mt-8">
            <button
              onClick={() => setShowCompleted((prev) => !prev)}
              className="text-sm text-cyan-400 hover:underline"
            >
              {showCompleted
                ? "Hide Completed Tasks"
                : `Show Completed Tasks`}
            </button>
          </div>

          {showCompleted && (
            <div className="mt-4">
              <h2 className="text-white/60 text-lg font-medium mb-2">Completed Tasks</h2>
              {loadingCompleted ? (
                <p className="text-white/60 text-sm">Loading completed tasks...</p>
              ) : completedTasks.length === 0 ? (
                <p className="text-white/60 text-sm">No completed tasks.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 opacity-70">
                  {completedTasks.map((task) => (
                    <TaskCard key={task.id} task={task} onUpdate={fetchTasks} />
                  ))}
                </div>
              )}
            </div>
          )}
        </GlassPanel>
      </div>
    </PageTransition>
  );
}
