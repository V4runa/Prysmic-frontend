"use client";

import { useState, useEffect } from "react";
import { Task, TaskPriority } from "../tasks/types/task";
import { apiFetch } from "../hooks/useApi";
import { Field, TextField, TextArea, SelectField, FormButton } from "./forms";

interface TaskFormProps {
  task?: Task; // if present = edit mode
  onSuccess?: () => void;
}

export default function TaskForm({ task, onSuccess }: TaskFormProps) {
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [priority, setPriority] = useState<TaskPriority>(
    task?.priority ?? TaskPriority.MEDIUM
  );
  const [dueDate, setDueDate] = useState<string>(
    task?.dueDate ? task.dueDate.slice(0, 10) : ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setPriority(task.priority ?? TaskPriority.MEDIUM);
      setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : "");
    }
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = { title, description, priority, dueDate: dueDate || null };

      if (task) {
        await apiFetch(`/tasks/${task.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      onSuccess?.();
    } catch (err) {
      console.error("Error saving task:", err);
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Title" htmlFor="task-title">
        <TextField
          id="task-title"
          value={title}
          required
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Fix landing page bug"
        />
      </Field>

      <Field label="Description" htmlFor="task-description">
        <TextArea
          id="task-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Optional notes or extra context..."
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Priority" htmlFor="task-priority">
          <SelectField
            id="task-priority"
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value) as TaskPriority)}
          >
            <option value={TaskPriority.LOW}>Low</option>
            <option value={TaskPriority.MEDIUM}>Medium</option>
            <option value={TaskPriority.HIGH}>High</option>
          </SelectField>
        </Field>

        <Field label="Due Date" htmlFor="task-due">
          <TextField
            id="task-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </Field>
      </div>

      {error && <p className="text-rose-400 text-sm">{error}</p>}

      <FormButton
        type="submit"
        variant="primary"
        disabled={loading}
        className="w-full sm:w-auto sm:self-start"
      >
        {loading
          ? task
            ? "Saving..."
            : "Creating..."
          : task
          ? "Save Changes"
          : "Create Task"}
      </FormButton>
    </form>
  );
}
