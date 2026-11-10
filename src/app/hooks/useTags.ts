import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./useApi";
import type { Tag } from "../lib/tag";

export type { Tag };

export const tagsQueryKey = ["tags"] as const;

/**
 * Shared tags query. Notes, tasks, and the tags page all read this cache, so
 * /tags is fetched once and reused instead of refetched per page.
 */
export function useTags(enabled = true) {
  return useQuery({
    queryKey: tagsQueryKey,
    queryFn: () => apiFetch<Tag[]>("/tags"),
    enabled,
  });
}

export function useInvalidateTags() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: tagsQueryKey });
}
