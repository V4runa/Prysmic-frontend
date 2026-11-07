import { copiesMatch, type NoteDraftCopy } from "./noteDraft";

export type SaveFailureKind = "unauthorized" | "network" | "server";

export function classifySaveError(err: unknown): SaveFailureKind {
  if (err instanceof TypeError) return "network";
  const message = err instanceof Error ? err.message : "";
  if (message.startsWith("Session expired")) return "unauthorized";
  return "server";
}

export function saveErrorMessage(
  kind: SaveFailureKind,
  phase: "create" | "update" | "attachment"
): string {
  if (phase === "attachment" && kind === "unauthorized") {
    return "The note text is saved. The session expired before an attachment uploaded, and that file was only held on this page — add it again after you sign in.";
  }
  if (phase === "attachment") {
    return "The note text is saved. An attachment did not upload — save again to retry that file. This was not saved as a second note.";
  }
  if (kind === "unauthorized") {
    return "Your session expired. This writing is still here. Sign in again, then continue it from Notes.";
  }
  if (kind === "network") {
    return "Could not reach the server. This writing is still here.";
  }
  return phase === "create"
    ? "The note was not saved. This writing is still here."
    : "The changes were not saved. This writing is still here.";
}

export const CONFLICT_MESSAGE =
  "The saved note changed. This writing is still here. Save again to overwrite it, or cancel to use the saved copy.";

export const KEPT_NEWER_MESSAGE =
  "Saved what was already sent. Newer changes are still here.";

export function sameServerInstant(a: string, b: string): boolean {
  const left = Date.parse(a);
  const right = Date.parse(b);
  if (Number.isNaN(left) || Number.isNaN(right)) return a === b;
  return left === right;
}

/**
 * Whether a PUT is allowed given a freshness read we already finished.
 * That read and the later PUT are not atomic: another write can still land
 * between them. There is no server conditional update. A second explicit
 * save overwrites whatever the server has at PUT time.
 */
export function decideExistingSave(
  baseUpdatedAt: string | null,
  latestUpdatedAt: string | null,
  force: boolean
): "put" | "conflict" {
  if (force) return "put";
  if (!baseUpdatedAt || !latestUpdatedAt) return "put";
  if (!sameServerInstant(baseUpdatedAt, latestUpdatedAt)) return "conflict";
  return "put";
}

export interface PendingUpload {
  key: string;
  upload: () => Promise<void>;
}

export type NewNoteSaveResult =
  | { status: "saved"; createdId: number; updatedAt: string | null }
  | {
      status: "error";
      createdId: number | null;
      updatedAt: string | null;
      kind: SaveFailureKind;
      phase: "create" | "update" | "attachment";
      uploadedKeys: string[];
    };

/**
 * Create at most once. If that note already exists, PUT the latest text when
 * it differs from the last body the server accepted, then upload files.
 * Success means both the text and the files in this call landed.
 */
export async function saveNewNote(opts: {
  title: string;
  content: string;
  tagIds: number[];
  createdId: number | null;
  updatedAt: string | null;
  serverCopy: NoteDraftCopy | null;
  files: PendingUpload[];
  create: () => Promise<{ id: number; updatedAt?: string | null }>;
  update?: (id: number) => Promise<{ updatedAt?: string | null }>;
  onCreated?: (created: { id: number; updatedAt: string | null }) => void;
  onTextSynced?: (synced: { id: number; updatedAt: string | null }) => void;
}): Promise<NewNoteSaveResult> {
  let createdId = opts.createdId;
  let updatedAt = opts.updatedAt;
  const snapshot: NoteDraftCopy = {
    title: opts.title,
    content: opts.content,
    tagIds: opts.tagIds,
  };

  if (createdId == null) {
    try {
      const created = await opts.create();
      createdId = created.id;
      updatedAt = created.updatedAt ?? null;
      opts.onCreated?.({ id: createdId, updatedAt });
    } catch (err) {
      return {
        status: "error",
        createdId: null,
        updatedAt: null,
        kind: classifySaveError(err),
        phase: "create",
        uploadedKeys: [],
      };
    }
  } else if (!opts.serverCopy || !copiesMatch(snapshot, opts.serverCopy)) {
    if (!opts.update) {
      return {
        status: "error",
        createdId,
        updatedAt,
        kind: "server",
        phase: "update",
        uploadedKeys: [],
      };
    }
    try {
      const saved = await opts.update(createdId);
      updatedAt = saved.updatedAt ?? updatedAt;
      opts.onTextSynced?.({ id: createdId, updatedAt });
    } catch (err) {
      return {
        status: "error",
        createdId,
        updatedAt,
        kind: classifySaveError(err),
        phase: "update",
        uploadedKeys: [],
      };
    }
  }

  const uploadedKeys: string[] = [];
  for (const file of opts.files) {
    try {
      await file.upload();
      uploadedKeys.push(file.key);
    } catch (err) {
      return {
        status: "error",
        createdId,
        updatedAt,
        kind: classifySaveError(err),
        phase: "attachment",
        uploadedKeys,
      };
    }
  }

  return { status: "saved", createdId, updatedAt };
}

/** Synchronous lock so Cancel or a second Save cannot start before React re-renders. */
export function claimSaveLock(lock: { current: boolean }): boolean {
  if (lock.current) return false;
  lock.current = true;
  return true;
}

export function releaseSaveLock(lock: { current: boolean }): void {
  lock.current = false;
}

/** After a successful write, leave the editor only if nothing newer was typed. */
export function settleSavedRevision(
  snapshot: NoteDraftCopy,
  latest: NoteDraftCopy
): "exit" | "keep-latest" {
  return copiesMatch(snapshot, latest) ? "exit" : "keep-latest";
}

export type ExistingSaveResult =
  | { status: "saved"; updatedAt: string | null }
  | { status: "conflict" }
  | { status: "error"; kind: SaveFailureKind };

/**
 * Load the server timestamp first. Skip the PUT when that load fails or the
 * note moved, unless the caller is explicitly overwriting. The GET and PUT
 * are separate requests; this does not stop a concurrent write that arrives
 * after the GET.
 */
export async function runExistingNoteSave(opts: {
  baseUpdatedAt: string | null;
  force: boolean;
  loadLatest: () => Promise<{ updatedAt?: string | null }>;
  update: () => Promise<{ updatedAt?: string | null }>;
}): Promise<ExistingSaveResult> {
  let latest: string | null;
  try {
    const fresh = await opts.loadLatest();
    latest = fresh.updatedAt ?? null;
  } catch (err) {
    return { status: "error", kind: classifySaveError(err) };
  }

  if (decideExistingSave(opts.baseUpdatedAt, latest, opts.force) === "conflict") {
    return { status: "conflict" };
  }

  try {
    const saved = await opts.update();
    return { status: "saved", updatedAt: saved.updatedAt ?? latest };
  } catch (err) {
    return { status: "error", kind: classifySaveError(err) };
  }
}

/** A save error must not replace the editor. Only a failed load does. */
export function shouldShowNoteEditor(loading: boolean, loadFailed: boolean): boolean {
  return !loading && !loadFailed;
}
