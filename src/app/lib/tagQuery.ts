import { messageFromBody } from "./authMessages";

export const TAG_QUERY_PARAM = "tagId";

type TagSearch = string | { getAll(name: string): string[] };

function searchParams(search: TagSearch): { getAll(name: string): string[] } {
  return typeof search === "string" ? new URLSearchParams(search) : search;
}

/** Positive integer tag ids from `tagId` (repeated or comma-separated). */
export function parseTagIds(search: TagSearch): number[] {
  const ids: number[] = [];
  for (const raw of searchParams(search).getAll(TAG_QUERY_PARAM)) {
    for (const part of raw.split(",")) {
      const id = Number(part.trim());
      if (!Number.isInteger(id) || id <= 0 || ids.includes(id)) continue;
      ids.push(id);
    }
  }
  return ids;
}

/** Replace tagId params and keep every other query param. */
export function tagFilterHref(pathname: string, search: string, ids: number[]): string {
  const next = new URLSearchParams(search);
  next.delete(TAG_QUERY_PARAM);
  for (const id of ids) next.append(TAG_QUERY_PARAM, String(id));
  const query = next.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function notesTagHref(tagId: number): string {
  return tagFilterHref("/notes", "", [tagId]);
}

export function tasksTagHref(tagId: number): string {
  return tagFilterHref("/tasks", "", [tagId]);
}

/**
 * "3 notes" / "1 task". When the list payload has no count yet, the link
 * still names the list without inventing a zero.
 */
export function tagUsageLabel(
  count: number | undefined,
  singular: string,
  plural: string
): string {
  if (typeof count !== "number" || !Number.isFinite(count)) {
    return plural.charAt(0).toUpperCase() + plural.slice(1);
  }
  const n = Math.max(0, Math.floor(count));
  return `${n} ${n === 1 ? singular : plural}`;
}

const DELETE_FALLBACK = "Failed to delete tag";

/** A 409 from DELETE /tags/:id carries the reason in `message`. */
export function tagDeleteErrorMessage(err: unknown): string {
  if (!err || typeof err !== "object") return DELETE_FALLBACK;
  if ((err as { status?: unknown }).status !== 409) return DELETE_FALLBACK;
  const message = messageFromBody((err as { body?: unknown }).body);
  if (!message || message.length > 500) return DELETE_FALLBACK;
  return message;
}

/**
 * Keep a task when this response has no `tags` array. The list request already
 * sent `tagId`; an older server that omits tags should not hide every task.
 * Once tags are present, match them here too.
 */
export function taskMatchesTag(
  task: { tags?: { id: number }[] | null },
  tagId: number | null
): boolean {
  if (tagId == null) return true;
  if (!Array.isArray(task.tags)) return true;
  return task.tags.some((tag) => tag.id === tagId);
}
