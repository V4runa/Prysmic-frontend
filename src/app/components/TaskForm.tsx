"use client";

import { useState, useEffect } from "react";
import { Task, TaskPriority } from "../tasks/types/task";
import { taskDueInputValue } from "../tasks/taskDueDate";
import { apiFetch } from "../hooks/useApi";
import { withoutOriginNoteId } from "../notes/noteMenu";
import { useTags } from "../hooks/useTags";
import { Field, TextField, TextArea, SelectField, FormButton } from "./forms";
import TagPicker from "./TagPicker";

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
  const [dueDate, setDueDate] = useState<string>(taskDueInputValue(task?.dueDate));
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>(
    task?.tags?.map((tag) => tag.id) ?? []
  );
  const [tagsTouched, setTagsTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { data: tags = [] } = useTags();

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setPriority(task.priority ?? TaskPriority.MEDIUM);
      setDueDate(taskDueInputValue(task.dueDate));
      setSelectedTagIds(task.tags?.map((tag) => tag.id) ?? []);
      setTagsTouched(false);
    }
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload: {
        title: string;
        description: string;
        priority: TaskPriority;
        dueDate: string | null;
        tagIds?: number[];
      } = { title, description, priority, dueDate: dueDate || null };
      // Send tagIds when this task already has a tags array, or the picker
      // was used. A title-only edit elsewhere omits tagIds so tags stay put.
      if (!task || Array.isArray(task.tags) || tagsTouched) {
        payload.tagIds = selectedTagIds;
      }

      if (task) {
        await apiFetch(`/tasks/${task.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(withoutOriginNoteId(payload)),
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

      <Field label="Tags">
        <TagPicker
          tags={tags}
          selectedIds={selectedTagIds}
          disabled={loading}
          allowCreate
          onChange={(ids) => {
            setSelectedTagIds(ids);
            setTagsTouched(true);
          }}
        />
      </Field>

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
