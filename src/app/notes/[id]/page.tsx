// === /notes/[id]/page.tsx ===
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import GlassPanel from "../../components/GlassPanel";
import PageTransition from "../../components/PageTransition";
import AutoGrowTextarea from "../../components/AutoGrowTextarea";
import Spinner from "../../components/Spinner";
import { apiFetch } from "../../hooks/useApi";
import { useTags } from "../../hooks/useTags";
import { tactile } from "../../lib/motion";
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

  const error =
    actionError || (isError ? "Note could not be found." : "");

  // Seed the edit form whenever the fetched note changes.
  useEffect(() => {
    if (note) {
      setEditedTitle(note.title);
      setEditedContent(note.content);
      setSelectedTagIds(note.tags?.map((tag) => tag.id) || []);
    }
  }, [note]);

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
    try {
      await apiFetch(`/notes/${noteId}`, {
        method: "PUT",
        body: JSON.stringify({
          title: editedTitle,
          content: editedContent,
          tagIds: selectedTagIds,
        }),
      });

      queryClient.setQueryData<Note | null>(["note", noteId], (old) =>
        old
          ? {
              ...old,
              title: editedTitle,
              content: editedContent,
              tags: availableTags.filter((tag) =>
                selectedTagIds.includes(tag.id)
              ),
            }
          : old
      );
      queryClient.invalidateQueries({ queryKey: ["notes"] });

      setEditing(false);
    } catch (err) {
      console.error("Failed to update note", err);
      setActionError("Failed to update note.");
    }
  };

  const toggleTag = (tagId: number) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const handleCancelEdit = () => {
    setEditedTitle(note?.title || "");
    setEditedContent(note?.content || "");
    setSelectedTagIds(note?.tags?.map(tag => tag.id) || []);
    setEditing(false);
  };

  const wordCount = editedContent.trim()
    ? editedContent.trim().split(/\s+/).length
    : 0;

  const handleEditorKeyDown = (e: React.KeyboardEvent) => {
    if (editing && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      handleSaveUpdate();
    }
  };

  return (
    <PageTransition>
      <div className="w-full h-[calc(100vh-3rem)] flex flex-col items-center px-4 sm:px-6 md:px-10 xl:px-12 2xl:px-20 pt-4 pb-4 gap-4 sm:gap-6">
        <GlassPanel className="w-full max-w-[1400px] flex flex-col gap-4 sm:gap-6 h-full min-h-0">
        <div className="flex justify-between items-center">
          <h2 className="text-slate-100 text-3xl font-bold tracking-wide">
            {editing ? "Editing Note" : "Viewing Note"}
          </h2>
          <div className="flex items-center gap-3">
            {!editing ? (
              <>
                <motion.button {...tactile} className="p-2 bg-cyan-400/10 hover:bg-cyan-400/20 rounded-md border border-cyan-300/20" onClick={() => setEditing(true)} title="Edit">
                  <Pencil className="h-5 w-5 text-cyan-300" />
                </motion.button>
                <motion.button {...tactile} className="p-2 bg-red-400/10 hover:bg-red-400/20 rounded-md border border-red-300/20" onClick={handleDelete} disabled={deleting} title="Delete">
                  <Trash2 className="h-5 w-5 text-red-300" />
                </motion.button>
              </>
            ) : (
              <>
                <motion.button {...tactile} className="p-2 bg-cyan-400/10 hover:bg-cyan-400/20 rounded-md border border-cyan-300/20" onClick={handleSaveUpdate} title="Save">
                  <Save className="h-5 w-5 text-cyan-300" />
                </motion.button>
                <motion.button {...tactile} className="p-2 bg-white/10 hover:bg-white/20 rounded-md border border-white/10" onClick={handleCancelEdit} title="Cancel">
                  <X className="h-5 w-5 text-slate-300" />
                </motion.button>
              </>
            )}
            <motion.div {...tactile} className="inline-flex">
              <Link href="/notes" className="p-2 bg-white/10 hover:bg-white/20 rounded-md border border-white/10" title="Back">
                <ArrowLeft className="h-5 w-5 text-slate-300" />
              </Link>
            </motion.div>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Spinner label="Unrolling your note..." />
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-red-400 text-lg">{error}</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-4">
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
                    <input
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      autoFocus
                      className="w-full px-4 py-3 bg-white/10 text-slate-200 placeholder-slate-400/40 rounded-md text-xl sm:text-2xl font-semibold border border-transparent focus:border-cyan-400/40 focus:bg-white/[0.07] focus:shadow-[0_0_22px_rgba(103,232,249,0.12)] outline-none transition"
                    />
                  ) : (
                    <h3 className="text-slate-100 text-xl sm:text-2xl font-bold">{note?.title}</h3>
                  )}
                  {editing ? (
                    <>
                      <AutoGrowTextarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        className="w-full px-4 py-3 bg-white/10 text-slate-200 placeholder-slate-400/40 rounded-md text-sm sm:text-base leading-relaxed min-h-[12rem] border border-transparent focus:border-cyan-400/40 focus:bg-white/[0.07] focus:shadow-[0_0_22px_rgba(103,232,249,0.12)] outline-none transition"
                      />
                      <span className="text-xs text-slate-500 tabular-nums">
                        {wordCount} {wordCount === 1 ? "word" : "words"}
                        <span className="hidden sm:inline text-slate-600">
                          {"  ·  "}⌘/Ctrl + S to save
                        </span>
                      </span>
                    </>
                  ) : (
                    <p className="text-slate-300 whitespace-pre-wrap text-sm sm:text-base leading-relaxed">{note?.content}</p>
                  )}
                </motion.div>
              </AnimatePresence>
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
                    whileHover={editing ? { scale: 1.08 } : undefined}
                    whileTap={editing ? { scale: 0.93 } : undefined}
                    onClick={() => editing && toggleTag(tag.id)}
                    className={`px-3 sm:px-4 py-1 text-xs rounded-full border backdrop-blur-md shadow-sm transition ${
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
