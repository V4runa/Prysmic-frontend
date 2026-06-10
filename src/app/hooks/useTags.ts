import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./useApi";

export interface Tag {
  id: number;
  name: string;
  color?: string;
}

export const tagsQueryKey = ["tags"] as const;

/**
 * Shared tags query. Because /tags is requested from the tags page, the notes
 * list, the note editor, and the new-note page, sharing one cache key means it
 * is fetched once and reused across all of them instead of refetched per page.
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
