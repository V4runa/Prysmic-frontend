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

export function sameServerInstant(a: string, b: string): boolean {
  const left = Date.parse(a);
  const right = Date.parse(b);
  if (Number.isNaN(left) || Number.isNaN(right)) return a === b;
  return left === right;
}

/** Whether a PUT is allowed. A failed freshness check never reaches this. */
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
      phase: "create" | "attachment";
      uploadedKeys: string[];
    };

/**
 * Create once, then upload files. A later call with createdId must not POST again.
 * onCreated runs before uploads so the id can be kept even if a file fails.
 */
export async function saveNewNote(opts: {
  title: string;
  content: string;
  tagIds: number[];
  createdId: number | null;
  updatedAt: string | null;
  files: PendingUpload[];
  create: () => Promise<{ id: number; updatedAt?: string | null }>;
  onCreated?: (created: { id: number; updatedAt: string | null }) => void;
}): Promise<NewNoteSaveResult> {
  let createdId = opts.createdId;
  let updatedAt = opts.updatedAt;

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

export type ExistingSaveResult =
  | { status: "saved"; updatedAt: string | null }
  | { status: "conflict" }
  | { status: "error"; kind: SaveFailureKind };

/**
 * Load the server timestamp first. Skip the PUT when that load fails or the
 * note moved, unless the caller is explicitly overwriting.
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
