"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Trash2, Save, X } from "lucide-react";
import GlassPanel from "../components/GlassPanel";
import PageTransition from "../components/PageTransition";
import TagColorChoices from "../components/TagColorChoices";
import { apiFetch } from "../hooks/useApi";
import { Tag, useTags, useInvalidateTags } from "../hooks/useTags";
import { tactileSubtle } from "../lib/motion";
import { tagColorClasses, tagColorKey } from "../lib/tagColors";
import { notesTagHref, tagDeleteErrorMessage, tagUsageLabel, tasksTagHref } from "../lib/tagQuery";
import { TextField, FormButton } from "../components/forms";

export default function TagsPage() {
  const { data: tags = [], isError, isLoading } = useTags();
  const invalidateTags = useInvalidateTags();
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("cyan");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editedName, setEditedName] = useState("");
  const [editedColor, setEditedColor] = useState("cyan");
  const [error, setError] = useState(isError ? "Could not fetch tags" : "");

  const handleCreate = async () => {
    if (!newTagName.trim()) return;
    setError("");
    try {
      await apiFetch<Tag>("/tags", {
        method: "POST",
        body: JSON.stringify({ name: newTagName, color: newTagColor }),
      });
      await invalidateTags();
      setNewTagName("");
    } catch {
      setError("Failed to create tag");
    }
  };

  const handleDelete = async (id: number) => {
    setError("");
    try {
      await apiFetch(`/tags/${id}`, { method: "DELETE" });
      await invalidateTags();
    } catch (err) {
      setError(tagDeleteErrorMessage(err));
    }
  };

  const handleSaveEdit = async (id: number) => {
    if (!editedName.trim()) return;
    setError("");
    try {
      await apiFetch<Tag>(`/tags/${id}`, {
        method: "PUT",
        body: JSON.stringify({ name: editedName, color: editedColor }),
      });
      await invalidateTags();
      setEditingId(null);
    } catch {
      setError("Failed to update tag");
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.04 },
    }),
  };

  return (
    <PageTransition>
      <div className="w-full app-page-h flex flex-col items-center px-3 sm:px-6 md:px-10 xl:px-12 2xl:px-20 pt-3 sm:pt-4 pb-3 sm:pb-4 gap-4 sm:gap-6">
      <GlassPanel className="w-full max-w-[1400px] flex flex-col gap-4 sm:gap-6 h-full min-h-0">
        {/* Header */}
        <h2 className="text-slate-100 text-2xl sm:text-3xl lg:text-4xl font-bold tracking-wide">
          Tag Codex
        </h2>

        {/* Tag creation */}
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <div className="flex-grow min-w-[150px] sm:min-w-[200px]">
            <TextField
              placeholder="Tag name..."
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <FormButton variant="secondary" onClick={handleCreate}>
            + Create
          </FormButton>
        </div>

        <TagColorChoices value={newTagColor} onChange={setNewTagColor} />

        {/* Tags Grid */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto app-scroll p-1">
            {isLoading && tags.length === 0 ? (
              <div className="grid grid-cols-1 min-[480px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-6">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-20 rounded-xl bg-white/5 border border-white/10 animate-pulse"
                  />
                ))}
              </div>
            ) : (
            <AnimatePresence mode="wait">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="grid grid-cols-1 min-[480px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-6"
              >
                {tags.map((tag, i) => {
                const colorClass = tagColorClasses[tagColorKey(tag.color, "cyan")];
                return (
                  <motion.div
                    key={tag.id}
                    custom={i}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    whileTap={{ scale: 0.99 }}
                    className={`card-lift rounded-xl px-3 sm:px-4 py-2 sm:py-3 border border-white/10 bg-white/5 flex items-start justify-between gap-2 shadow-md ${colorClass}`}
                  >
                    {editingId === tag.id ? (
                      <div className="flex flex-col gap-2 w-full">
                        <TextField
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                        />
                        <TagColorChoices value={editedColor} onChange={setEditedColor} />
                        <div className="flex gap-2 mt-2">
                          <motion.button
                            {...tactileSubtle}
                            onClick={() => handleSaveEdit(tag.id)}
                            title="Save"
                            className="tap-target flex items-center justify-center p-2 sm:p-1 border border-cyan-300/20 rounded-md hover:bg-cyan-400/10"
                          >
                            <Save className="h-4 w-4 text-cyan-300" />
                          </motion.button>
                          <motion.button
                            {...tactileSubtle}
                            onClick={() => setEditingId(null)}
                            title="Cancel"
                            className="tap-target flex items-center justify-center p-2 sm:p-1 border border-white/10 rounded-md hover:bg-white/10"
                          >
                            <X className="h-4 w-4 text-slate-300" />
                          </motion.button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                          <span className="text-xs sm:text-sm font-medium truncate">
                            {tag.name}
                          </span>
                          <div className="flex flex-col items-start gap-0.5 text-[11px] sm:text-xs font-medium leading-tight">
                            <Link
                              href={notesTagHref(tag.id)}
                              className="inline-flex min-h-8 items-center py-1 underline-offset-2 hover:underline"
                            >
                              {tagUsageLabel(tag.noteCount, "note", "notes")}
                            </Link>
                            <Link
                              href={tasksTagHref(tag.id)}
                              className="inline-flex min-h-8 items-center py-1 underline-offset-2 hover:underline"
                            >
                              {tagUsageLabel(tag.taskCount, "task", "tasks")}
                            </Link>
                          </div>
                        </div>
                        <div className="flex gap-1 sm:gap-2 shrink-0">
                          <motion.button
                            {...tactileSubtle}
                            onClick={() => {
                              setEditingId(tag.id);
                              setEditedName(tag.name);
                              setEditedColor(tag.color || "cyan");
                            }}
                            title="Edit"
                            className="tap-target flex items-center justify-center p-2 sm:p-1 border border-cyan-300/20 rounded-md hover:bg-cyan-400/10"
                          >
                            <Pencil className="h-4 w-4 text-cyan-300" />
                          </motion.button>
                          <motion.button
                            {...tactileSubtle}
                            onClick={() => handleDelete(tag.id)}
                            title="Delete"
                            className="tap-target flex items-center justify-center p-2 sm:p-1 border border-red-300/20 rounded-md hover:bg-red-400/10"
                          >
                            <Trash2 className="h-4 w-4 text-red-300" />
                          </motion.button>
                        </div>
                      </>
                    )}
                  </motion.div>
                );
              })}
              </motion.div>
            </AnimatePresence>
            )}
          </div>
        </div>

        {error && (
          <p role="alert" className="text-red-400 text-sm break-words">
            {error}
          </p>
        )}
      </GlassPanel>
      </div>
    </PageTransition>
  );
}
