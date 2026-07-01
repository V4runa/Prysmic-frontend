// === /notes/new/page.tsx ===
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import GlassPanel from "../../components/GlassPanel";
import PageTransition from "../../components/PageTransition";
import { apiFetch } from "../../hooks/useApi";
import { useTags } from "../../hooks/useTags";
import {
  uploadAttachment,
  acceptFiles,
  CLIENT_MAX_ATTACHMENTS_PER_NOTE,
} from "../../hooks/useNoteAttachments";
import AttachmentZone, {
  AttachmentItemView,
} from "../../components/AttachmentZone";
import RichTextEditor from "../../components/RichTextEditor";
import { noteHtmlToText } from "../../lib/noteContent";
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

  // Revoke any lingering preview URLs when leaving the page.
  const stagedRef = useRef(staged);
  stagedRef.current = staged;
  useEffect(
    () => () => stagedRef.current.forEach((s) => URL.revokeObjectURL(s.url)),
    []
  );

  const contentText = noteHtmlToText(content);
  const wordCount = contentText ? contentText.split(/\s+/).length : 0;

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
    if (saving) return;
    setError("");
    setSaving(true);

    try {
      const created = await apiFetch<{ id: number }>("/notes", {
        method: "POST",
        body: JSON.stringify({
          title,
          content,
          tagIds: selectedTagIds,
        }),
      });

      // Upload staged files onto the freshly-created note (images compress
      // client-side inside uploadAttachment). Done sequentially to respect
      // the per-note cap and keep ordering stable.
      for (const s of staged) {
        await uploadAttachment(created.id, s.file);
      }
      staged.forEach((s) => URL.revokeObjectURL(s.url));

      queryClient.invalidateQueries({ queryKey: ["notes"] });
      router.push(`/notes/${created.id}`);
    } catch (err: Error | unknown) {
      console.error("Note creation failed", err);
      setError("Failed to create note.");
      setSaving(false);
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
                onChange={(e) => setTitle(e.target.value)}
                className="text-lg sm:text-xl"
              />

              <RichTextEditor
                editable
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
                        onClick={() => toggleTag(tag.id)}
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

            <div className="flex-shrink-0 flex justify-between items-center gap-3 mt-4">
              <span className="text-xs text-slate-500 tabular-nums">
                {wordCount} {wordCount === 1 ? "word" : "words"}
                <span className="hidden sm:inline text-slate-600">
                  {"  ·  "}⌘/Ctrl + S to save
                </span>
              </span>
              <FormButton type="submit" variant="primary" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </FormButton>
            </div>

            {error && (
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-400 text-sm text-center"
              >
                {error}
              </motion.p>
            )}
          </form>
        </div>
        </GlassPanel>
      </div>
    </PageTransition>
  );
}