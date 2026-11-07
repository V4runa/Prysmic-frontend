import { isNoteContentEmpty } from "../lib/noteContent";

/**
 * One unsaved note kept in this browser tab (sessionStorage).
 * Not the account, not attachments, and not shared with other tabs.
 * The tab closing drops it. A day-old copy is ignored so a forgotten tab
 * does not keep private writing indefinitely.
 */
export const NOTE_DRAFT_KEY = "prysmic.noteDraft.v1";
export const NOTE_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

export interface NoteDraftCopy {
  title: string;
  content: string;
  tagIds: number[];
}

export interface NoteDraft extends NoteDraftCopy {
  v: 1;
  userId: number;
  /** "new" or the note id being edited. */
  noteKey: string;
  /** Set after POST succeeds so a retry does not create a second note. */
  createdId: number | null;
  /** Server updatedAt when this editing session started. */
  baseUpdatedAt: string | null;
  /** Body last accepted by the server, when create already succeeded. */
  serverCopy: NoteDraftCopy | null;
  savedAt: number;
}

export interface DraftStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type WriteDraftResult =
  | { ok: true }
  | { ok: false; reason: "storage" | "occupied" };

export function noteOwnerId(userId: number | string | null | undefined): number | null {
  if (userId == null || userId === "") return null;
  const n = typeof userId === "number" ? userId : Number(userId);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function draftHasWriting(draft: NoteDraftCopy): boolean {
  return (
    draft.title.trim().length > 0 ||
    !isNoteContentEmpty(draft.content) ||
    draft.tagIds.length > 0
  );
}

export function copiesMatch(a: NoteDraftCopy, b: NoteDraftCopy): boolean {
  if (a.title !== b.title || a.content !== b.content) return false;
  if (a.tagIds.length !== b.tagIds.length) return false;
  const left = [...a.tagIds].sort((x, y) => x - y);
  const right = [...b.tagIds].sort((x, y) => x - y);
  return left.every((id, i) => id === right[i]);
}

function sameInstant(a: string, b: string): boolean {
  const left = Date.parse(a);
  const right = Date.parse(b);
  if (Number.isNaN(left) || Number.isNaN(right)) return a === b;
  return left === right;
}

function isIdList(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.every((id) => typeof id === "number" && Number.isInteger(id))
  );
}

function isCopy(value: unknown): value is NoteDraftCopy {
  if (!value || typeof value !== "object") return false;
  const copy = value as NoteDraftCopy;
  return (
    typeof copy.title === "string" &&
    typeof copy.content === "string" &&
    isIdList(copy.tagIds)
  );
}

function isDraftShape(value: unknown): value is NoteDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as NoteDraft;
  return (
    draft.v === 1 &&
    noteOwnerId(draft.userId) != null &&
    typeof draft.noteKey === "string" &&
    typeof draft.title === "string" &&
    typeof draft.content === "string" &&
    isIdList(draft.tagIds) &&
    (draft.createdId == null || typeof draft.createdId === "number") &&
    (draft.baseUpdatedAt == null || typeof draft.baseUpdatedAt === "string") &&
    (draft.serverCopy == null || isCopy(draft.serverCopy)) &&
    typeof draft.savedAt === "number"
  );
}

export function readDraft(
  storage: DraftStorage,
  now = Date.now()
): NoteDraft | null {
  let raw: string | null;
  try {
    raw = storage.getItem(NOTE_DRAFT_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isDraftShape(parsed)) {
      storage.removeItem(NOTE_DRAFT_KEY);
      return null;
    }
    if (now - parsed.savedAt > NOTE_DRAFT_TTL_MS) {
      storage.removeItem(NOTE_DRAFT_KEY);
      return null;
    }
    if (parsed.serverCopy == null) parsed.serverCopy = null;
    return parsed;
  } catch {
    try {
      storage.removeItem(NOTE_DRAFT_KEY);
    } catch {
      /* ignore a storage that cannot be cleaned */
    }
    return null;
  }
}

function sameSlot(a: NoteDraft, b: NoteDraft): boolean {
  if (a.userId !== b.userId) return false;
  if (a.noteKey === b.noteKey) return true;
  if (a.createdId != null && String(a.createdId) === b.noteKey) return true;
  if (b.createdId != null && String(b.createdId) === a.noteKey) return true;
  return false;
}

export function writeDraft(storage: DraftStorage, draft: NoteDraft): WriteDraftResult {
  const existing = readDraft(storage, draft.savedAt);
  if (existing && !sameSlot(existing, draft)) {
    return { ok: false, reason: "occupied" };
  }
  try {
    storage.setItem(NOTE_DRAFT_KEY, JSON.stringify(draft));
    return { ok: true };
  } catch {
    return { ok: false, reason: "storage" };
  }
}

export function clearDraft(storage: DraftStorage): void {
  try {
    storage.removeItem(NOTE_DRAFT_KEY);
  } catch {
    /* leaving the page must not throw if storage is blocked */
  }
}

/** Drop a draft that belongs to someone else once a different account is in this tab. */
export function clearDraftIfOtherUser(storage: DraftStorage, userId: number): boolean {
  const draft = readDraft(storage);
  if (!draft || draft.userId === userId) return false;
  clearDraft(storage);
  return true;
}

export type RestoreDecision = "apply" | "hold" | "ignore";

/**
 * apply — put the draft into the editor.
 * hold — the server copy moved, or we cannot prove it didn't. Do not apply.
 * ignore — nothing for this user and note.
 */
export function decideRestore(opts: {
  draft: NoteDraft | null;
  userId: number | null;
  noteKey: string;
  serverUpdatedAt: string | null;
}): RestoreDecision {
  const { draft, userId, noteKey, serverUpdatedAt } = opts;
  if (!draft || userId == null || draft.userId !== userId) return "ignore";
  const matches =
    draft.noteKey === noteKey ||
    (draft.createdId != null && String(draft.createdId) === noteKey);
  if (!matches) return "ignore";
  if (!draftHasWriting(draft) && draft.createdId == null) return "ignore";

  if (noteKey === "new") return "apply";

  if (
    draft.baseUpdatedAt &&
    serverUpdatedAt &&
    sameInstant(draft.baseUpdatedAt, serverUpdatedAt)
  ) {
    return "apply";
  }
  return "hold";
}

/** Where the notes list should send the owner, without putting the writing in the URL. */
export function recoveryHref(draft: NoteDraft): string {
  if (draft.createdId != null) return `/notes/${draft.createdId}`;
  if (draft.noteKey === "new") return "/notes/new";
  return `/notes/${encodeURIComponent(draft.noteKey)}`;
}

export function draftVisibleToUser(
  draft: NoteDraft | null,
  userId: number | null
): NoteDraft | null {
  if (!draft || userId == null || draft.userId !== userId) return null;
  if (!draftHasWriting(draft) && draft.createdId == null) return null;
  return draft;
}
