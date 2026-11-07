// === /notes/new/page.tsx ===
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import GlassPanel from "../../components/GlassPanel";
import PageTransition from "../../components/PageTransition";
import { apiFetch } from "../../hooks/useApi";
import { getUserFromToken } from "../../hooks/useAuth";
import { useTags } from "../../hooks/useTags";
import {
  uploadAttachment,
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
  saveErrorMessage,
  saveNewNote,
  settleSavedRevision,
} from "../noteSave";
import {
  clientEffectsForSave,
  currentSessionEpoch,
  saveAudience,
} from "../../lib/sessionBoundary";
import { bindNewNoteCreate, uploadWithCreatedId } from "../bindNewNoteCreate";
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
import { motion, AnimatePresence } from "framer-motion";
import { TextField, FormButton } from "../../components/forms";

interface StagedFile {
  id: string;
  file: File;
  url: string;
}

const tagColorClasses: Record<string, string> = {
  cyan: "text-cyan-300 border-cyan-300/30 shadow-cyan-300/10",
  rose: "text-rose-300 border-rose-300/30 shadow-rose-300/10",
  slate: "text-slate-300 border-slate-300/30 shadow-slate-300/10",
  violet: "text-violet-300 border-violet-300/30 shadow-violet-300/10",
  emerald: "text-emerald-300 border-emerald-300/30 shadow-emerald-300/10",
  amber: "text-amber-300 border-amber-300/30 shadow-amber-300/10",
};

export default function CreateNotePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const { data: tags = [] } = useTags();
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [serverCopy, setServerCopy] = useState<NoteDraftCopy | null>(null);
  const [baseUpdatedAt, setBaseUpdatedAt] = useState<string | null>(null);
  const [uploadedKeys, setUploadedKeys] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [persisted, setPersisted] = useState(true);
  const [restored, setRestored] = useState(false);
  const [pendingOverwrite, setPendingOverwrite] = useState(false);
  const createdIdRef = useRef<number | null>(null);
  const suppressPersist = useRef(false);
  const savingRef = useRef(false);
  const sessionOwnerRef = useRef<number | null>(null);
  const sessionEpochAtEdit = useRef(currentSessionEpoch());
  const latestRef = useRef({ title: "", content: "", tagIds: [] as number[] });
  latestRef.current = { title, content, tagIds: selectedTagIds };

  const draftOwner = () => {
    const tokenOwner = noteOwnerId(getUserFromToken()?.userId);
    if (tokenOwner && sessionOwnerRef.current == null) sessionOwnerRef.current = tokenOwner;
    return ownerForDraftWrite(sessionOwnerRef.current, tokenOwner);
  };

  // Revoke any lingering preview URLs when leaving the page.
  const stagedRef = useRef(staged);
  stagedRef.current = staged;
  useEffect(
    () => () => stagedRef.current.forEach((s) => URL.revokeObjectURL(s.url)),
    []
  );

  const contentText = noteHtmlToText(content);
  const wordCount = contentText ? contentText.split(/\s+/).length : 0;
  const dirty = draftHasWriting({ title, content, tagIds: selectedTagIds }) || createdId != null;
  useWritingGuard(hydrated && dirty, persisted);

  useEffect(() => {
    const storage = noteDraftStorage();
    const owner = draftOwner();
    if (!storage) setPersisted(false);
    if (storage && owner) clearDraftIfOtherUser(storage, owner);
    const draft = storage ? readDraft(storage) : null;
    if (draft && owner && draft.userId === owner && draft.noteKey === "new") {
      const copy = { title: draft.title, content: draft.content, tagIds: draft.tagIds };
      if (draft.createdId && draft.serverCopy && copiesMatch(copy, draft.serverCopy)) {
        clearDraftIfMatches(storage!, {
          userId: owner,
          noteKey: "new",
          createdId: draft.createdId,
        });
        router.replace(`/notes/${draft.createdId}`);
        return;
      }
      setTitle(draft.title);
      setContent(draft.content);
      setSelectedTagIds(draft.tagIds);
      setCreatedId(draft.createdId);
      createdIdRef.current = draft.createdId;
      setServerCopy(draft.serverCopy);
      setBaseUpdatedAt(draft.baseUpdatedAt);
      setRestored(draftHasWriting(copy));
    }
    setHydrated(true);
  }, [router]);

  useEffect(() => {
    createdIdRef.current = createdId;
  }, [createdId]);

  useEffect(() => {
    if (!hydrated || suppressPersist.current) return;
    const owner = draftOwner();
    const storage = noteDraftStorage();
    const writing = draftHasWriting({ title, content, tagIds: selectedTagIds }) || createdId != null;
    const effects = clientEffectsForSave(
      saveAudience(sessionEpochAtEdit.current, owner, noteOwnerId(getUserFromToken()?.userId))
    );
    if (!effects.writeDraft) return;
    if (!owner || !storage) {
      if (writing) setPersisted(false);
      return;
    }
    const next: NoteDraft = {
      v: 1,
      userId: owner,
      noteKey: "new",
      title,
      content,
      tagIds: selectedTagIds,
      createdId,
      baseUpdatedAt,
      serverCopy,
      savedAt: Date.now(),
    };
    if (!draftHasWriting(next) && createdId == null) {
      clearDraftIfMatches(storage, { userId: owner, noteKey: "new", createdId: null });
      setPersisted(true);
      return;
    }
    setPersisted(writeDraft(storage, next).ok);
  }, [hydrated, title, content, selectedTagIds, createdId, baseUpdatedAt, serverCopy]);

  useEffect(() => {
    const flush = () => {
      if (suppressPersist.current) return;
      const owner = draftOwner();
      const storage = noteDraftStorage();
      const latest = latestRef.current;
      const effects = clientEffectsForSave(
        saveAudience(sessionEpochAtEdit.current, owner, noteOwnerId(getUserFromToken()?.userId))
      );
      if (!effects.writeDraft || !owner || !storage) {
        setPersisted(false);
        return;
      }
      if (!draftHasWriting(latest) && createdIdRef.current == null) return;
      const result = writeDraft(storage, {
        v: 1,
        userId: owner,
        noteKey: "new",
        title: latest.title,
        content: latest.content,
        tagIds: latest.tagIds,
        createdId: createdIdRef.current,
        baseUpdatedAt,
        serverCopy,
        savedAt: Date.now(),
      });
      setPersisted(result.ok);
    };
    window.addEventListener("token-expired", flush);
    return () => window.removeEventListener("token-expired", flush);
  }, [baseUpdatedAt, serverCopy]);

  const attachmentItems: AttachmentItemView[] = staged.map((s) => ({
    key: s.id,
    name: s.file.name,
    size: s.file.size,
    mimeType: s.file.type,
    localUrl: s.url,
  }));

  const handleAddAttachments = (files: File[]) => {
    const { accepted, error } = acceptFiles(files, staged.length);
    setAttachError(error);
    setStaged((prev) => [
      ...prev,
      ...accepted.map((file) => ({
        id: crypto.randomUUID(),
        file,
        url: URL.createObjectURL(file),
      })),
    ]);
  };

  const handleRemoveAttachment = (item: AttachmentItemView) => {
    setStaged((prev) => {
      const target = prev.find((s) => s.id === item.key);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((s) => s.id !== item.key);
    });
  };

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimSaveLock(savingRef)) return;
    setError("");
    setSaving(true);

    const snapshot: NoteDraftCopy = { title, content, tagIds: [...selectedTagIds] };
    const owner = draftOwner();
    const storage = noteDraftStorage();
    const startedEpoch = currentSessionEpoch();
    const audienceNow = () =>
      saveAudience(startedEpoch, owner, noteOwnerId(getUserFromToken()?.userId));
    const pending = staged.filter((file) => !uploadedKeys.includes(file.id));

    try {
      const result = await saveNewNote({
        ...snapshot,
        createdId,
        updatedAt: baseUpdatedAt,
        serverCopy,
        force: pendingOverwrite,
        audience: audienceNow,
        loadLatest: createdId
          ? () => apiFetch<{ updatedAt?: string | null }>(`/notes/${createdId}`)
          : undefined,
        files: pending.map((file) => ({
          key: file.id,
          upload: () => uploadWithCreatedId(createdIdRef, (id) => uploadAttachment(id, file.file)),
        })),
        create: () =>
          apiFetch<{ id: number; updatedAt?: string | null }>("/notes", {
            method: "POST",
            body: JSON.stringify(snapshot),
          }),
        update: (id) =>
          apiFetch<{ updatedAt?: string | null }>(`/notes/${id}`, {
            method: "PUT",
            body: JSON.stringify(snapshot),
          }),
        onCreated: bindNewNoteCreate({
          createdIdRef,
          storage,
          owner,
          snapshot,
          writeDraftAllowed: clientEffectsForSave(audienceNow()).writeDraft,
          rememberInMemory: (created) => {
            setCreatedId(created.id);
            setServerCopy(snapshot);
            setBaseUpdatedAt(created.updatedAt);
          },
        }),
        onTextSynced: (synced) => {
          if (audienceNow() === "abandoned") return;
          setServerCopy(snapshot);
          setBaseUpdatedAt(synced.updatedAt);
        },
      });

      if (audienceNow() === "abandoned" || result.status === "detached") {
        setSaving(false);
        return;
      }

      if (result.status === "conflict") {
        setPendingOverwrite(true);
        setError(CONFLICT_MESSAGE);
        setSaving(false);
        return;
      }

      if (result.status === "error") {
        setUploadedKeys((prev) => [...new Set([...prev, ...result.uploadedKeys])]);
        if (result.createdId != null) setCreatedId(result.createdId);
        setError(saveErrorMessage(result.kind, result.phase));
        setSaving(false);
        return;
      }

      if (audienceNow() !== "same") {
        setSaving(false);
        return;
      }

      if (settleSavedRevision(snapshot, latestRef.current) === "keep-latest") {
        createdIdRef.current = result.createdId;
        setCreatedId(result.createdId);
        setServerCopy(snapshot);
        setBaseUpdatedAt(result.updatedAt);
        setError(KEPT_NEWER_MESSAGE);
        setSaving(false);
        return;
      }

      if (!clientEffectsForSave(audienceNow()).navigate) {
        setSaving(false);
        return;
      }

      suppressPersist.current = true;
      setPendingOverwrite(false);
      if (owner && storage) {
        clearDraftIfMatches(storage, {
          userId: owner,
          noteKey: "new",
          createdId: result.createdId,
        });
      }
      staged.forEach((file) => URL.revokeObjectURL(file.url));
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      router.push(`/notes/${result.createdId}`);
    } catch {
      console.error("Note save failed");
      setError(saveErrorMessage("server", "create"));
      setSaving(false);
    } finally {
      releaseSaveLock(savingRef);
    }
  };

  return (
    <PageTransition>
      <div className="w-full app-page-h flex flex-col items-center px-3 sm:px-6 md:px-10 xl:px-12 2xl:px-20 pt-3 sm:pt-4 pb-3 sm:pb-4 gap-4 sm:gap-6">
        <GlassPanel className="w-full max-w-[1400px] flex flex-col gap-4 sm:gap-6 h-full min-h-0">
        {/* Top Row */}
        <div className="flex justify-between items-center gap-3">
          <h2 className="text-slate-100 text-2xl sm:text-3xl font-bold tracking-wide truncate">
            Create Note
          </h2>
          <Link
            href="/notes"
            className="tap-target flex items-center justify-center shrink-0 px-4 sm:px-5 py-2 bg-cyan-400/10 hover:bg-cyan-400/20 text-cyan-300 rounded-md border border-cyan-300/20 transition text-sm"
          >
            ← Back
          </Link>
        </div>

        {/* Form */}
        <div className="flex-1 flex flex-col min-h-0">
          <form
            onSubmit={handleSubmit}
            onKeyDown={handleEditorKeyDown}
            className="flex flex-col gap-4 sm:gap-6 h-full"
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex-1 flex flex-col gap-4 sm:gap-6 overflow-y-auto app-scroll pr-1"
            >
              <TextField
                autoFocus
                placeholder="Title your thought..."
                value={title}
                disabled={saving}
                onChange={(e) => setTitle(e.target.value)}
                className="text-lg sm:text-xl"
              />

              <RichTextEditor
                editable={!saving}
                content={content}
                onChange={setContent}
                placeholder="Let it flow onto the pond..."
              />

              <AttachmentZone
                items={attachmentItems}
                editable
                onAddFiles={handleAddAttachments}
                onRemove={handleRemoveAttachment}
                busy={saving}
                error={attachError}
                max={CLIENT_MAX_ATTACHMENTS_PER_NOTE}
              />

              <div className="flex flex-col gap-3">
                <h4 className="text-slate-300 text-sm uppercase tracking-wider">
                  Attach tags (optional)
                </h4>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <AnimatePresence>
                    {tags.map((tag, i) => (
                      <motion.button
                        key={tag.id}
                        type="button"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ delay: i * 0.05 }}
                        whileTap={{ scale: 0.93 }}
                        disabled={saving}
                        onClick={() => {
                          if (!saving) toggleTag(tag.id);
                        }}
                        className={`interactive-chip px-3 sm:px-4 py-1 text-xs rounded-full border backdrop-blur-md shadow-sm transition-colors ${
                          selectedTagIds.includes(tag.id)
                            ? `${tagColorClasses[tag.color ?? "cyan"]} ring-1 ring-inset ring-white/20`
                            : `text-slate-300 border-white/10 hover:bg-white/10`
                        }`}
                      >
                        {tag.name}
                      </motion.button>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>

            <div className="flex-shrink-0 flex flex-col gap-2 mt-4">
              <div className="flex justify-between items-center gap-3">
                <span className="text-xs text-slate-500 tabular-nums">
                  {wordCount} {wordCount === 1 ? "word" : "words"}
                  <span className="hidden sm:inline text-slate-600">
                    {"  ·  "}⌘/Ctrl + S to save
                  </span>
                </span>
                <FormButton type="submit" variant="primary" disabled={saving}>
                  {saving ? "Saving…" : pendingOverwrite ? "Overwrite" : "Save"}
                </FormButton>
              </div>
              {restored && !error && (
                <p className="text-xs text-slate-400">Restored unsaved writing from this tab.</p>
              )}
              {saving && (
                <p className="text-xs text-slate-400">Saving… editing is paused so this copy stays intact.</p>
              )}
              {dirty && !saving && !error && (
                <p className="text-xs text-slate-500">
                  Unsaved writing stays in this tab until you save, discard it, log out, or close the tab. It is not uploaded until you save.
                </p>
              )}
              {dirty && !persisted && (
                <p className="text-xs text-amber-200/80">
                  Couldn&apos;t keep a copy in this tab. Leaving this page can lose it.
                </p>
              )}
              {error && (
                <p role="alert" className="text-rose-300/90 text-sm">
                  {error}
                </p>
              )}
            </div>
          </form>
        </div>
        </GlassPanel>
      </div>
    </PageTransition>
  );
}