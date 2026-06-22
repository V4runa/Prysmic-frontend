import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./useApi";

export interface MoodOption {
  id: number;
  label: string;
  emoji: string;
  color: string;
  sortOrder?: number;
}

export const moodOptionsQueryKey = ["mood-options"] as const;

/**
 * The user's customizable mood palette. Seeded with defaults server-side the
 * first time a user has none, so this always returns a usable set.
 */
export function useMoodOptions(enabled = true) {
  return useQuery({
    queryKey: moodOptionsQueryKey,
    queryFn: () => apiFetch<MoodOption[]>("/mood-options"),
    enabled,
  });
}

export function useInvalidateMoodOptions() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: moodOptionsQueryKey });
}
