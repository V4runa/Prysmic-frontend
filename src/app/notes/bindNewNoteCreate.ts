import { writeDraft, type DraftStorage, type NoteDraftCopy } from "./noteDraft";

/**
 * The id from a successful POST has to live in memory before any draft write.
 * Tab storage may be unavailable; that must not drop the id the attachment
 * upload reads. An abandoned session still skips the draft write.
 */
export function bindNewNoteCreate(opts: {
  createdIdRef: { current: number | null };
  storage: DraftStorage | null;
  owner: number | null;
  snapshot: NoteDraftCopy;
  writeDraftAllowed: boolean;
  rememberInMemory: (created: { id: number; updatedAt: string | null }) => void;
}): (created: { id: number; updatedAt: string | null }) => void {
  return (created) => {
    opts.createdIdRef.current = created.id;
    opts.rememberInMemory(created);
    if (!opts.writeDraftAllowed || opts.owner == null || !opts.storage) return;
    writeDraft(opts.storage, {
      v: 1,
      userId: opts.owner,
      noteKey: "new",
      ...opts.snapshot,
      createdId: created.id,
      baseUpdatedAt: created.updatedAt,
      serverCopy: opts.snapshot,
      savedAt: Date.now(),
    });
  };
}

/** Uploads use the id retained in memory, not a draft read. */
export async function uploadWithCreatedId(
  createdIdRef: { current: number | null },
  upload: (noteId: number) => Promise<unknown>
): Promise<void> {
  const id = createdIdRef.current;
  if (id == null) throw new Error("API Error: 500 missing note id");
  await upload(id);
}
