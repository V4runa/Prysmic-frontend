// === /notes/[id]/page.tsx ===
"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import GlassPanel from "../../components/GlassPanel";
import PageTransition from "../../components/PageTransition";
import Spinner from "../../components/Spinner";
import { apiFetch } from "../../hooks/useApi";
import { getUserFromToken } from "../../hooks/useAuth";
import { useTags } from "../../hooks/useTags";
import {
  useNoteAttachments,
  acceptFiles,
  CLIENT_MAX_ATTACHMENTS_PER_NOTE,
} from "../../hooks/useNoteAttachments";
import AttachmentZone, {
  AttachmentItemView,
} from "../../components/AttachmentZone";
import dynamic from "next/dynamic";
import { noteHtmlToText } from "../../lib/noteContent";
import {
  clearDraftIfMatches,
  clearDraftIfOtherUser,
  copiesMatch,
  decideRestore,
  draftHasWriting,
  noteDraftStorage,
  noteOwnerId,
  ownerForDraftWrite,
  readDraft,
  writeDraft,
  type NoteDraft,
  type NoteDraftCopy,
} from "../noteDraft";
import {
  CONFLICT_MESSAGE,
  KEPT_NEWER_MESSAGE,
  claimSaveLock,
  releaseSaveLock,
  runExistingNoteSave,
  saveErrorMessage,
  settleSavedRevision,
  shouldShowNoteEditor,
} from "../noteSave";
import {
  clientEffectsForSave,
  currentSessionEpoch,
  saveAudience,
} from "../../lib/sessionBoundary";
import { useWritingGuard } from "../useWritingGuard";

// TipTap is heavy; load it only when the editor actually renders so it stays
// out of the initial route bundle.
const RichTextEditor = dynamic(
  () => import("../../components/RichTextEditor"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[200px] rounded-md bg-white/5 border border-white/10 animate-pulse" />
    ),
  }
);
import { tactile } from "../../lib/motion";
import { TextField } from "../../components/forms";
import { Pencil, Trash2, ArrowLeft, Save, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Tag {
  id: number;
  name: string;
  color?: string;
}

interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt?: string | null;
  tags?: Tag[];
}

const tagColorClasses: Record<string, string> = {
  cyan: "text-cyan-300 border-cyan-300/30 shadow-cyan-300/10",
  rose: "text-rose-300 border-rose-300/30 shadow-rose-300/10",
  slate: "text-slate-300 border-slate-300/30 shadow-slate-300/10",
  violet: "text-violet-300 border-violet-300/30 shadow-violet-300/10",
  emerald: "text-emerald-300 border-emerald-300/30 shadow-emerald-300/10",
  amber: "text-amber-300 border-amber-300/30 shadow-amber-300/10",
};

export default function ViewNotePage() {
  const { id } = useParams();
  const noteId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedContent, setEditedContent] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [actionError, setActionError] = useState("");
  const [attachError, setAttachError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [baseUpdatedAt, setBaseUpdatedAt] = useState<string | null>(null);
  const [pendingOverwrite, setPendingOverwrite] = useState(false);
  const [heldDraft, setHeldDraft] = useState<NoteDraft | null>(null);
  const [restored, setRestored] = useState(false);
  const [persisted, setPersisted] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const hydratedRef = useRef(false);
  const savingRef = useRef(false);
  const sessionEpochAtEdit = useRef(currentSessionEpoch());
  const sessionOwnerRef = useRef<number | null>(null);
  const latestRef = useRef<NoteDraftCopy>({ title: "", content: "", tagIds: [] });
  latestRef.current = { title: editedTitle, content: editedContent, tagIds: selectedTagIds };

  const draftOwner = () => {
    const tokenOwner = noteOwnerId(getUserFromToken()?.userId);
    if (tokenOwner && sessionOwnerRef.current == null) sessionOwnerRef.current = tokenOwner;
    return ownerForDraftWrite(sessionOwnerRef.current, tokenOwner);
  };

  const numericNoteId = noteId ? Number(noteId) : null;
  const {
    attachments,
    upload: uploadAttachment,
    remove: removeAttachment,
  } = useNoteAttachments(numericNoteId);

  const {
    data: note = null,
    isLoading: loading,
    isError,
  } = useQuery({
    queryKey: ["note", noteId],
    queryFn: () => apiFetch<Note>(`/notes/${noteId}`),
    enabled: !!noteId,
  });

  const { data: availableTags = [] } = useTags(!!noteId);

  const loadFailed = isError && !note;
  const showEditor = shouldShowNoteEditor(loading, loadFailed);
  useWritingGuard(showEditor && editing && dirty, persisted);

  // Seed from the server once. A later refetch must not wipe unsaved writing.
  useEffect(() => {
    if (!note || !noteId) return;
    const serverUpdatedAt = note.updatedAt ?? null;
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      const storage = noteDraftStorage();
      const owner = draftOwner();
      if (!storage) setPersisted(false);
      if (storage && owner) clearDraftIfOtherUser(storage, owner);
      const draft = storage ? readDraft(storage) : null;
      const decision = decideRestore({
        draft,
        userId: owner,
        noteKey: String(noteId),
        serverUpdatedAt,
      });
      if (
        draft?.serverCopy &&
        copiesMatch(draft, draft.serverCopy) &&
        (decision === "apply" || decision === "hold")
      ) {
        if (storage) {
          clearDraftIfMatches(storage, {
            userId: owner ?? draft.userId,
            noteKey: String(noteId),
            createdId: draft.createdId,
          });
        }
      } else if (decision === "apply" && draft && draftHasWriting(draft)) {
        setEditedTitle(draft.title);
        setEditedContent(draft.content);
        setSelectedTagIds(draft.tagIds);
        setBaseUpdatedAt(draft.baseUpdatedAt ?? serverUpdatedAt);
        setDirty(true);
        setEditing(true);
        setRestored(true);
        setHydrated(true);
        return;
      } else if (decision === "hold" && draft) {
        setHeldDraft(draft);
      }
      setEditedTitle(note.title);
      setEditedContent(note.content || "");
      setSelectedTagIds(note.tags?.map((tag) => tag.id) || []);
      setBaseUpdatedAt(serverUpdatedAt);
      setDirty(false);
      setHydrated(true);
      return;
    }
    if (dirty) return;
    setEditedTitle(note.title);
    setEditedContent(note.content || "");
    setSelectedTagIds(note.tags?.map((tag) => tag.id) || []);
    setBaseUpdatedAt(serverUpdatedAt);
  }, [note, noteId, dirty]);

  useEffect(() => {
    if (!hydrated || !editing || !dirty || !noteId) return;
    if (heldDraft) {
      setPersisted(false);
      return;
    }
    const owner = draftOwner();
    const storage = noteDraftStorage();
    const effects = clientEffectsForSave(
      saveAudience(sessionEpochAtEdit.current, owner, noteOwnerId(getUserFromToken()?.userId))
    );
    if (!effects.writeDraft) return;
    if (!owner || !storage) {
      setPersisted(false);
      return;
    }
    const result = writeDraft(storage, {
      v: 1,
      userId: owner,
      noteKey: String(noteId),
      title: editedTitle,
      content: editedContent,
      tagIds: selectedTagIds,
      createdId: null,
      baseUpdatedAt,
      serverCopy: null,
      savedAt: Date.now(),
    });
    setPersisted(result.ok);
  }, [
    hydrated,
    editing,
    dirty,
    noteId,
    editedTitle,
    editedContent,
    selectedTagIds,
    baseUpdatedAt,
    heldDraft,
  ]);

  useEffect(() => {
    const flush = () => {
      if (!editing || !noteId) return;
      const owner = draftOwner();
      const storage = noteDraftStorage();
      const latest = latestRef.current;
      const effects = clientEffectsForSave(
        saveAudience(sessionEpochAtEdit.current, owner, noteOwnerId(getUserFromToken()?.userId))
      );
      if (!effects.writeDraft || !owner || !storage || !draftHasWriting(latest)) {
        setPersisted(false);
        return;
      }
      const result = writeDraft(storage, {
        v: 1,
        userId: owner,
        noteKey: String(noteId),
        title: latest.title,
        content: latest.content,
        tagIds: latest.tagIds,
        createdId: null,
        baseUpdatedAt,
        serverCopy: null,
        savedAt: Date.now(),
      });
      setPersisted(result.ok);
    };
    window.addEventListener("token-expired", flush);
    return () => window.removeEventListener("token-expired", flush);
  }, [editing, noteId, baseUpdatedAt]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this note?")) return;

    try {
      setDeleting(true);
      await apiFetch(`/notes/${noteId}`, { method: "DELETE" });
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      router.push("/notes");
    } catch (err) {
      console.error("Failed to delete note", err);
      setActionError("Failed to delete note.");
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveUpdate = async () => {
    if (!noteId || !claimSaveLock(savingRef)) return;
    const snapshot: NoteDraftCopy = {
      title: editedTitle,
      content: editedContent,
      tagIds: [...selectedTagIds],
    };
    setActionError("");
    setSaving(true);
    const startedEpoch = currentSessionEpoch();
    const ownerAtSave = draftOwner();
    const audienceNow = () =>
      saveAudience(startedEpoch, ownerAtSave, noteOwnerId(getUserFromToken()?.userId));
    let result: Awaited<ReturnType<typeof runExistingNoteSave>>;
    try {
      result = await runExistingNoteSave({
      baseUpdatedAt,
      force: pendingOverwrite,
      allowUpdate: () => audienceNow() === "same",
      loadLatest: () => apiFetch<Note>(`/notes/${noteId}`),
      update: () =>
        apiFetch<Note>(`/notes/${noteId}`, {
          method: "PUT",
          body: JSON.stringify(snapshot),
        }),
    });
    } finally {
      releaseSaveLock(savingRef);
      setSaving(false);
    }

    if (audienceNow() === "abandoned" || result.status === "detached") return;

    if (result.status === "conflict") {
      setPendingOverwrite(true);
      setActionError(CONFLICT_MESSAGE);
      return;
    }
    if (result.status === "error") {
      console.error("Note save failed");
      setActionError(saveErrorMessage(result.kind, "update"));
      return;
    }

    if (!clientEffectsForSave(audienceNow()).touchCache) return;

    queryClient.setQueryData<Note | null>(["note", noteId], (old) =>
      old
        ? {
            ...old,
            title: snapshot.title,
            content: snapshot.content,
            updatedAt: result.updatedAt ?? old.updatedAt,
            tags: availableTags.filter((tag) => snapshot.tagIds.includes(tag.id)),
          }
        : old
    );
    queryClient.invalidateQueries({ queryKey: ["notes"] });
    setBaseUpdatedAt(result.updatedAt);
    setPendingOverwrite(false);

    if (settleSavedRevision(snapshot, latestRef.current) === "keep-latest") {
      setDirty(true);
      setActionError(KEPT_NEWER_MESSAGE);
      return;
    }

    const owner = draftOwner();
    const storage = noteDraftStorage();
    if (owner && storage) {
      clearDraftIfMatches(storage, {
        userId: owner,
        noteKey: String(noteId),
        createdId: null,
      });
    }
    setDirty(false);
    setHeldDraft(null);
    setRestored(false);
    setEditing(false);
  };

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
    setDirty(true);
  };

  const clearThisDraft = () => {
    const owner = draftOwner();
    const storage = noteDraftStorage();
    if (!owner || !storage || !noteId) return;
    clearDraftIfMatches(storage, {
      userId: owner,
      noteKey: String(noteId),
      createdId: null,
    });
  };

  const handleCancelEdit = () => {
    if (savingRef.current) return;
    clearThisDraft();
    setEditedTitle(note?.title || "");
    setEditedContent(note?.content || "");
    setSelectedTagIds(note?.tags?.map((tag) => tag.id) || []);
    setBaseUpdatedAt(note?.updatedAt ?? null);
    setDirty(false);
    setPendingOverwrite(false);
    setHeldDraft(null);
    setRestored(false);
    setActionError("");
    setEditing(false);
  };

  const applyHeldDraft = () => {
    if (!heldDraft) return;
    setEditedTitle(heldDraft.title);
    setEditedContent(heldDraft.content);
    setSelectedTagIds(heldDraft.tagIds);
    setBaseUpdatedAt(heldDraft.baseUpdatedAt);
    setDirty(true);
    setEditing(true);
    setHeldDraft(null);
    setRestored(true);
  };

  const discardHeldDraft = () => {
    clearThisDraft();
    setHeldDraft(null);
  };

  const attachmentItems: AttachmentItemView[] = attachments.map((a) => ({
    key: `a-${a.id}`,
    name: a.filename,
    size: a.size,
    mimeType: a.mimeType,
    remote: { noteId: numericNoteId as number, id: a.id },
  }));

  const handleAddAttachments = (files: File[]) => {
    const { accepted, error } = acceptFiles(files, attachments.length);
    setAttachError(error);
    accepted.forEach((file) => uploadAttachment.mutate(file));
  };

  const handleRemoveAttachment = (item: AttachmentItemView) => {
    if (!item.remote) return;
    if (!confirm("Remove this attachment?")) return;
    removeAttachment.mutate(item.remote.id);
  };

  const attachmentsEditable = editing || attachmentItems.length > 0;

  const editedText = noteHtmlToText(editedContent);
  const wordCount = editedText ? editedText.split(/\s+/).length : 0;

  const handleEditorKeyDown = (e: React.KeyboardEvent) => {
    if (editing && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      handleSaveUpdate();
    }
  };

  return (
    <PageTransition>
      <div className="w-full app-page-h flex flex-col items-center px-3 sm:px-6 md:px-10 xl:px-12 2xl:px-20 pt-3 sm:pt-4 pb-3 sm:pb-4 gap-4 sm:gap-6">
        <GlassPanel className="w-full max-w-[1400px] flex flex-col gap-4 sm:gap-6 h-full min-h-0">
        <div className="flex justify-between items-center gap-3">
          <h2 className="text-slate-100 text-2xl sm:text-3xl font-bold tracking-wide truncate">
            {editing ? "Editing Note" : "Viewing Note"}
          </h2>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {!editing ? (
              <>
                <motion.button {...tactile} className="tap-target flex items-center justify-center p-2 bg-cyan-400/10 hover:bg-cyan-400/20 rounded-md border border-cyan-300/20" onClick={() => setEditing(true)} title="Edit">
                  <Pencil className="h-5 w-5 text-cyan-300" />
                </motion.button>
                <motion.button {...tactile} className="tap-target flex items-center justify-center p-2 bg-red-400/10 hover:bg-red-400/20 rounded-md border border-red-300/20" onClick={handleDelete} disabled={deleting} title="Delete">
                  <Trash2 className="h-5 w-5 text-red-300" />
                </motion.button>
              </>
            ) : (
              <>
                <motion.button
                  {...tactile}
                  className="tap-target flex items-center justify-center p-2 bg-cyan-400/10 hover:bg-cyan-400/20 rounded-md border border-cyan-300/20 disabled:opacity-50"
                  onClick={handleSaveUpdate}
                  disabled={saving}
                  title={pendingOverwrite ? "Overwrite saved note" : saving ? "Saving" : "Save"}
                  aria-label={pendingOverwrite ? "Overwrite saved note" : saving ? "Saving" : "Save"}
                >
                  <Save className="h-5 w-5 text-cyan-300" />
                </motion.button>
                <motion.button
                  {...tactile}
                  className="tap-target flex items-center justify-center p-2 bg-white/10 hover:bg-white/20 rounded-md border border-white/10 disabled:opacity-50"
                  onClick={handleCancelEdit}
                  disabled={saving}
                  title={saving ? "Saving" : "Cancel"}
                  aria-label={saving ? "Saving" : "Cancel"}
                >
                  <X className="h-5 w-5 text-slate-300" />
                </motion.button>
              </>
            )}
            <motion.div {...tactile} className="inline-flex">
              <Link href="/notes" className="tap-target flex items-center justify-center p-2 bg-white/10 hover:bg-white/20 rounded-md border border-white/10" title="Back">
                <ArrowLeft className="h-5 w-5 text-slate-300" />
              </Link>
            </motion.div>
          </div>
        </div>

        {!showEditor ? (
          loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Spinner label="Unrolling your note..." />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-red-400 text-lg">Note could not be found.</p>
            </div>
          )
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {actionError && (
              <p role="alert" className="text-sm text-rose-300/90 mb-3">
                {actionError}
              </p>
            )}
            {heldDraft && (
              <div className="text-sm text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1 mb-3">
                <span>This tab still has unsaved writing, and the saved note changed. It was not applied.</span>
                <button type="button" onClick={applyHeldDraft} className="text-cyan-300 hover:underline">
                  Restore writing
                </button>
                <button type="button" onClick={discardHeldDraft} className="text-slate-500 hover:text-slate-300">
                  Discard
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto app-scroll pr-2 flex flex-col gap-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={editing ? "edit" : "view"}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  onKeyDown={handleEditorKeyDown}
                  className="flex flex-col gap-4"
                >
                  {editing ? (
                    <TextField
                      value={editedTitle}
                      disabled={saving}
                      onChange={(e) => {
                        setEditedTitle(e.target.value);
                        setDirty(true);
                      }}
                      autoFocus
                      className="text-xl sm:text-2xl font-semibold"
                    />
                  ) : (
                    <h3 className="text-slate-100 text-xl sm:text-2xl font-bold">{note?.title}</h3>
                  )}
                  {editing ? (
                    <>
                      <RichTextEditor
                        editable={!saving}
                        content={editedContent}
                        onChange={(html) => {
                          if (saving) return;
                          setEditedContent(html);
                          if (html !== editedContent) setDirty(true);
                        }}
                        autoFocus
                        placeholder="Let it flow onto the pond..."
                      />
                      <span className="text-xs text-slate-500 tabular-nums">
                        {wordCount} {wordCount === 1 ? "word" : "words"}
                        <span className="hidden sm:inline text-slate-600">
                          {"  ·  "}⌘/Ctrl + S to save
                        </span>
                      </span>
                      {saving && (
                        <p className="text-xs text-slate-400">Saving… editing is paused so this copy stays intact.</p>
                      )}
                      {restored && (
                        <p className="text-xs text-slate-400">Restored unsaved writing from this tab.</p>
                      )}
                      {dirty && (
                        <p className="text-xs text-slate-500">
                          Unsaved writing stays in this tab until you save, discard it, log out, or close the tab.
                        </p>
                      )}
                      {dirty && !persisted && (
                        <p className="text-xs text-amber-200/80">
                          Couldn&apos;t keep a copy in this tab. Leaving this page can lose it.
                        </p>
                      )}
                    </>
                  ) : (
                    <RichTextEditor content={note?.content ?? ""} />
                  )}
                </motion.div>
              </AnimatePresence>

              <AttachmentZone
                items={attachmentItems}
                editable={attachmentsEditable}
                onAddFiles={handleAddAttachments}
                onRemove={handleRemoveAttachment}
                busy={uploadAttachment.isPending}
                error={
                  attachError ||
                  (uploadAttachment.isError
                    ? "Upload failed — check the file type and size."
                    : null)
                }
                max={CLIENT_MAX_ATTACHMENTS_PER_NOTE}
              />
            </div>
            <div className="flex-shrink-0 flex flex-wrap gap-2 sm:gap-3 mt-4">
              {(editing ? availableTags : note?.tags || []).map((tag, i) => {
                const color = tag.color || "slate";
                const active = selectedTagIds.includes(tag.id);
                const base = tagColorClasses[color];
                return (
                  <motion.button
                    key={tag.id}
                    type="button"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    whileTap={editing ? { scale: 0.93 } : undefined}
                    disabled={saving}
                    onClick={() => editing && !saving && toggleTag(tag.id)}
                    className={`${editing ? "interactive-chip" : ""} px-3 sm:px-4 py-1 text-xs rounded-full border backdrop-blur-md shadow-sm transition-colors ${
                      active
                        ? `${base} ring-1 ring-white/20`
                        : "text-slate-300 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    {tag.name}
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}
        </GlassPanel>
      </div>
    </PageTransition>
  );
}
