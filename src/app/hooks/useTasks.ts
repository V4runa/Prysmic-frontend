import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Task } from "../tasks/types/task";
import { apiFetch } from "./useApi";

export const tasksQueryKey = ["tasks"] as const;

/**
 * Fetches every task once and partitions client-side. This replaces the
 * previous three parallel requests (active/completed/archived) with a single
 * cached request that all task views derive from.
 */
export function useTasks() {
  const query = useQuery({
    queryKey: tasksQueryKey,
    queryFn: () => apiFetch<Task[]>("/tasks"),
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
  return () => queryClient.invalidateQueries({ queryKey: tasksQueryKey });
}
