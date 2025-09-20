"use client";

import { useEffect, useState, useCallback } from "react";
import { Task } from "../tasks/types/task";
import { apiFetch } from "../hooks/useApi";
import PageTransition from "../components/PageTransition";
import GlassPanel from "../components/GlassPanel";
import TaskCard from "../components/TaskCard";
import QuickTaskInput from "../components/QuickTaskInput";

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<"active" | "completed" | "archived">("active");
  const [loading, setLoading] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const [active, completed, archived] = await Promise.all([
        apiFetch<Task[]>("/tasks?complete=false&archived=false"),
        apiFetch<Task[]>("/tasks?complete=true&archived=false"),
        apiFetch<Task[]>("/tasks?archived=true"),
      ]);
      setTasks(active.sort((a, b) => a.priority - b.priority));
      setCompletedTasks(completed);
      setArchivedTasks(archived);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const visibleTasks =
    activeTab === "active"
      ? [...tasks, ...completedTasks] // Both incomplete and completed (non-archived)
      : activeTab === "completed"
      ? completedTasks // Only completed, non-archived tasks
      : archivedTasks; // Only archived tasks

  return (
    <PageTransition>
      <div className="pt-[80px] px-[clamp(1rem,5vw,3rem)] pb-20 min-h-screen">
        <GlassPanel className="p-6 w-full flex flex-col gap-6">
          <h1 className="text-3xl font-bold text-white">Your Tasks</h1>

          {/* Traditional tab-style nav */}
          <div className="flex border-b border-white/10 text-white">
            {["active", "completed", "archived"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as "active" | "completed" | "archived")}
                className={`px-4 py-2 -mb-px transition font-medium ${
                  activeTab === tab
                    ? "border-b-2 border-cyan-400 text-cyan-300"
                    : "text-white/40 hover:text-white"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {activeTab === "active" && <QuickTaskInput onTaskCreated={fetchTasks} />}

          {loading ? (
            <p className="text-white/60 text-sm mt-6">Loading tasks...</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleTasks.map((task) => (
                <TaskCard key={task.id} task={task} onUpdate={fetchTasks} />
              ))}
              {visibleTasks.length === 0 && (
                <p className="text-white/40 text-sm mt-4">No tasks to show.</p>
              )}
            </div>
          )}
        </GlassPanel>
      </div>
    </PageTransition>
  );
}
