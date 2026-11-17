"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { mergeCreatedTag, tagNameToCreate } from "../lib/tagCreate";
import type { Tag } from "../lib/tag";
import { apiFetch } from "./useApi";
import { tagsQueryKey } from "./useTags";

/** POST /tags, then refresh the list Notes, Tasks, and the Tag Codex share. */
export function useCreateTag() {
  const queryClient = useQueryClient();
  return useCallback(
    async (name: string, color: string): Promise<Tag> => {
      const trimmed = tagNameToCreate(name);
      if (!trimmed) throw new Error("Missing tag name");
      const created = await apiFetch<Tag>("/tags", {
        method: "POST",
        body: JSON.stringify({ name: trimmed, color }),
      });
      queryClient.setQueryData<Tag[]>(tagsQueryKey, (prev) => mergeCreatedTag(prev ?? [], created));
      void queryClient.invalidateQueries({ queryKey: tagsQueryKey });
      return created;
    },
    [queryClient]
  );
}
