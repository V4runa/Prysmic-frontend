import { messageFromBody } from "./authMessages";

export const TAG_CREATE_FAILED = "Failed to create tag";
export const TAG_CREATE_DUPLICATE = "A tag with that name already exists.";
export const TAG_CREATE_OFFLINE = "Could not reach Prysmic. Check your connection and try again.";
export const TAG_CREATE_NAME = "Add a name.";

/**
 * Name sent to POST /tags. The Tag Codex and the note editor both ignore a
 * blank name. Surrounding spaces are not part of the name.
 */
export function tagNameToCreate(name: string): string | null {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * The server treats a name as taken when it matches exactly for this account.
 * "Work" and "work" are different names.
 */
export function duplicateTagName(name: string, tags: readonly { name: string }[]): boolean {
  const trimmed = tagNameToCreate(name);
  if (!trimmed) return false;
  return tags.some((tag) => tag.name === trimmed);
}

function readableMessage(body: unknown): string | null {
  const message = messageFromBody(body);
  if (!message || message.length > 500) return null;
  return message;
}

/** What to show when POST /tags fails. A 409 message is used as the server wrote it. */
export function tagCreateErrorMessage(err: unknown): string {
  if (err instanceof TypeError) return TAG_CREATE_OFFLINE;
  if (!err || typeof err !== "object") return TAG_CREATE_FAILED;
  const status = (err as { status?: unknown }).status;
  if (typeof status !== "number") return TAG_CREATE_FAILED;
  const message = readableMessage((err as { body?: unknown }).body);
  if (status === 409) return message ?? TAG_CREATE_DUPLICATE;
  if (message && /already exists|duplicate key|unique constraint/i.test(message)) {
    return TAG_CREATE_DUPLICATE;
  }
  return TAG_CREATE_FAILED;
}

/** Keep every tag already chosen, and add the one just created. */
export function selectionWithCreatedTag(
  selectedIds: readonly number[],
  createdId: number,
  selection: "multiple" | "single" = "multiple"
): number[] {
  if (!Number.isInteger(createdId)) return [...selectedIds];
  if (selection === "single") return [createdId];
  if (selectedIds.includes(createdId)) return [...selectedIds];
  return [...selectedIds, createdId];
}

export function mergeCreatedTag<T extends { id: number; name: string }>(
  list: readonly T[],
  created: T
): T[] {
  if (list.some((tag) => tag.id === created.id)) return [...list];
  return [...list, created].sort((a, b) => a.name.localeCompare(b.name));
}
