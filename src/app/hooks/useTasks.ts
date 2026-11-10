import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Task } from "../tasks/types/task";
import { apiFetch } from "./useApi";
import { calendarQueryKey } from "./useCalendar";

export const tasksQueryKey = ["tasks"] as const;

/**
 * One cached task list, partitioned into active, completed, and archived.
 * Passing a tagId asks GET /tasks to filter and stores that result separately.
 * Omitted tagIds on a later PATCH leave existing tags in place.
 */
export function useTasks(tagId?: number | null) {
  const filterId = typeof tagId === "number" && tagId > 0 ? tagId : null;
  const query = useQuery({
    queryKey: filterId == null ? tasksQueryKey : [...tasksQueryKey, "tag", filterId],
    queryFn: () =>
      apiFetch<Task[]>(filterId == null ? "/tasks" : `/tasks?tagId=${filterId}`),
  });

  const partitioned = useMemo(() => {
    const all = query.data ?? [];
    return {
      active: all
        .filter((t) => !t.isComplete && !t.isArchived)
        .sort((a, b) => a.priority - b.priority),
      completed: all.filter((t) => t.isComplete && !t.isArchived),
      archived: all.filter((t) => t.isArchived),
    };
  }, [query.data]);

  return { ...query, ...partitioned };
}

export function useInvalidateTasks() {
  const queryClient = useQueryClient();
  // The calendar keeps its own feed. Habit checks already invalidate it;
  // task edits have to as well, or a visit within the cache window still
  // shows the previous done state.
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: tasksQueryKey }),
      queryClient.invalidateQueries({ queryKey: calendarQueryKey }),
    ]);
}
