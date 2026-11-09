"use client";

import { useRef, useState } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { withTaskCompletion } from "../calendar/lib/calendarLib";
import type { CalendarFeed } from "../calendar/types";
import type { Task } from "../tasks/types/task";
import { apiFetch } from "./useApi";
import { calendarQueryKey } from "./useCalendar";
import { tasksQueryKey } from "./useTasks";

/**
 * Write a task's real completion into caches that already display it.
 *
 * The tasks list waits out its completion animation before it refetches, so
 * callers that must keep that card on screen pass `{ tasks: false }` and patch
 * only the calendar. The calendar feed is what still showed the old check.
 */
export function rememberTaskCompletion(
  queryClient: QueryClient,
  taskId: number,
  isComplete: boolean,
  options?: { tasks?: boolean },
) {
  queryClient.setQueriesData<CalendarFeed>({ queryKey: calendarQueryKey }, (feed) => {
    if (!feed) return feed;
    const items = withTaskCompletion(feed.items, taskId, isComplete);
    if (items === feed.items) return feed;
    return { ...feed, items };
  });

  if (options?.tasks === false) return;
  const tasks = queryClient.getQueryData<Task[]>(tasksQueryKey);
  if (!tasks) return;

  let changed = false;
  const next = tasks.map((task) => {
    if (task.id !== taskId || task.isComplete === isComplete) return task;
    changed = true;
    return {
      ...task,
      isComplete,
      completedAt: isComplete ? new Date().toISOString() : null,
    };
  });
  if (changed) queryClient.setQueryData(tasksQueryKey, next);
}

/** Mark a task done or not done, then update the calendar and task caches. */
export function useToggleCalendarTask() {
  const queryClient = useQueryClient();
  const pending = useRef<number | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);

  async function toggleTask(task: { id: number; isComplete: boolean }) {
    if (pending.current != null) return;
    pending.current = task.id;
    setPendingId(task.id);
    const next = !task.isComplete;
    try {
      const endpoint = task.isComplete ? "uncomplete" : "complete";
      await apiFetch(`/tasks/${task.id}/${endpoint}`, { method: "POST" });
      rememberTaskCompletion(queryClient, task.id, next);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: calendarQueryKey }),
        queryClient.invalidateQueries({ queryKey: tasksQueryKey }),
      ]);
    } catch {
      // Leave the cached check as it was. The request did not stick.
    } finally {
      pending.current = null;
      setPendingId(null);
    }
  }

  return { pendingId, toggleTask };
}
