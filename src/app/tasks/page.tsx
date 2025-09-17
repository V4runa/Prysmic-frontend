"use client";

import { useEffect, useState, useCallback } from "react";
import { Task } from "../tasks/types/task";
import { apiFetch } from "../hooks/useApi";
import PageTransition from "../components/PageTransition";
import GlassPanel from "../components/GlassPanel";
import TaskCard from "../components/TaskCard";
import QuickTaskInput from "../components/QuickTaskInput";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [loadingCompleted, setLoadingCompleted] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor));

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Task[]>("/tasks?complete=false");
      const sorted = [...data].sort(
        (a, b) => a.priority - b.priority
      );
      setTasks(sorted);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCompletedTasks = useCallback(async () => {
    setLoadingCompleted(true);
    try {
      const data = await apiFetch<Task[]>("/tasks?complete=true");
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

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = tasks.findIndex((t) => t.id === active.id);
      const newIndex = tasks.findIndex((t) => t.id === over.id);
      setTasks((prev) => arrayMove(prev, oldIndex, newIndex));
    }
  };

  return (
    <PageTransition>
      <div className="pt-[80px] px-[clamp(1rem,5vw,3rem)] pb-20 min-h-screen">
        <GlassPanel className="p-6 w-full flex flex-col gap-6">
          <h1 className="text-3xl font-bold text-white">Your Tasks</h1>

          <QuickTaskInput onTaskCreated={fetchTasks} />

          <div className="mt-4">
            {loading ? (
              <p className="text-white/60 text-sm">Loading tasks...</p>
            ) : tasks.length === 0 ? (
              <p className="text-white/60 text-sm">No tasks found.</p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={tasks.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {tasks.map((task) => (
                      <SortableTaskCard
                        key={task.id}
                        task={task}
                        onUpdate={fetchTasks}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>

          <div className="mt-8">
            <button
              onClick={() => setShowCompleted((prev) => !prev)}
              className="text-sm text-cyan-400 hover:underline"
            >
              {showCompleted ? "Hide Completed Tasks" : "Show Completed Tasks"}
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

// ✨ Drag-enabled wrapper for TaskCard
function SortableTaskCard({ task, onUpdate }: { task: Task; onUpdate: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} onUpdate={onUpdate} />
    </div>
  );
}
