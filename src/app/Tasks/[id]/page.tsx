"use client";


import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import GlassPanel from "../../components/GlassPanel";
import MotionDiv from "../../components/MotionDiv";
import TaskForm from "../../components/TaskForm";
import { apiFetch } from "../../hooks/useApi";
import { Task } from "../types/task";

export default function TaskDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchTask = async () => {
      try {
        const data = await apiFetch<Task>(`/tasks/${id}`);
        setTask(data);
      } catch (err) {
        console.error("Failed to fetch task:", err);
        router.push("/tasks");
      } finally {
        setLoading(false);
      }
    };
    fetchTask();
  }, [id, router]);

  const handleSuccess = () => {
    router.push("/tasks");
  };

  const handleAction = async (endpoint: string) => {
    if (!id) return;
    setActionLoading(true);
    try {
      await apiFetch(`/tasks/${id}/${endpoint}`, { method: "POST" });
      router.push("/tasks");
    } catch (err) {
      console.error(`Failed to ${endpoint} task:`, err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm("Are you sure you want to delete this task?")) return;
    setActionLoading(true);
    try {
      await apiFetch(`/tasks/${id}`, { method: "DELETE" });
      router.push("/tasks");
    } catch (err) {
      console.error("Failed to delete task:", err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return null;

  return (
    <MotionDiv>
      <GlassPanel className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-4">Edit Task</h1>
        {task ? (
          <>
            <TaskForm task={task} onSuccess={handleSuccess} />

            <div className="mt-6 flex flex-wrap gap-4">
              <button
                onClick={() => handleAction(task.isComplete ? "uncomplete" : "complete")}
                disabled={actionLoading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md transition disabled:opacity-50"
              >
                {task.isComplete ? "Mark Incomplete" : "Mark Complete"}
              </button>

              <button
                onClick={() => handleAction(task.isArchived ? "unarchive" : "archive")}
                disabled={actionLoading}
                className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-4 rounded-md transition disabled:opacity-50"
              >
                {task.isArchived ? "Unarchive" : "Archive"}
              </button>

              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-md transition disabled:opacity-50"
              >
                Delete Task
              </button>
            </div>
          </>
        ) : (
          <p className="text-white/70">Task not found.</p>
        )}
      </GlassPanel>
    </MotionDiv>
  );
}