"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Trash2, Save, X } from "lucide-react";
import GlassPanel from "../components/GlassPanel";
import PageTransition from "../components/PageTransition";
import { apiFetch } from "../hooks/useApi";
import { Tag, useTags, useInvalidateTags } from "../hooks/useTags";
import { tactileSubtle } from "../lib/motion";
import { TextField, FormButton } from "../components/forms";

const colorOptions = [
  { name: "Astral", value: "cyan" },
  { name: "Ember", value: "rose" },
  { name: "Whisper", value: "slate" },
  { name: "Pulse", value: "violet" },
  { name: "Verdant", value: "emerald" },
  { name: "Sunwake", value: "amber" },
];

const tagColorClasses: Record<string, string> = {
  cyan: "text-cyan-300 border-cyan-300/30 shadow-cyan-300/10",
  rose: "text-rose-300 border-rose-300/30 shadow-rose-300/10",
  slate: "text-slate-300 border-slate-300/30 shadow-slate-300/10",
  violet: "text-violet-300 border-violet-300/30 shadow-violet-300/10",
  emerald: "text-emerald-300 border-emerald-300/30 shadow-emerald-300/10",
  amber: "text-amber-300 border-amber-300/30 shadow-amber-300/10",
};

// Fully-spelled classes for the selected color swatch (Tailwind v4 can't see
// `ring-${value}-300`, so these must be literal strings).
const selectedColorClasses: Record<string, string> = {
  cyan: "ring-2 ring-cyan-300 text-cyan-200 border-cyan-300",
  rose: "ring-2 ring-rose-300 text-rose-200 border-rose-300",
  slate: "ring-2 ring-slate-300 text-slate-200 border-slate-300",
  violet: "ring-2 ring-violet-300 text-violet-200 border-violet-300",
  emerald: "ring-2 ring-emerald-300 text-emerald-200 border-emerald-300",
  amber: "ring-2 ring-amber-300 text-amber-200 border-amber-300",
};

export default function TagsPage() {
  const { data: tags = [], isError } = useTags();
  const invalidateTags = useInvalidateTags();
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("cyan");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editedName, setEditedName] = useState("");
  const [editedColor, setEditedColor] = useState("cyan");
  const [error, setError] = useState(isError ? "Could not fetch tags" : "");

  const handleCreate = async () => {
    if (!newTagName.trim()) return;
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
    try {
      await apiFetch(`/tags/${id}`, { method: "DELETE" });
      await invalidateTags();
    } catch {
      setError("Failed to delete tag");
    }
  };

  const handleSaveEdit = async (id: number) => {
    if (!editedName.trim()) return;
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

        {/* Color options */}
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {colorOptions.map((c) => (
            <motion.button
              key={c.value}
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => setNewTagColor(c.value)}
              className={`interactive-chip px-3 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm rounded-full border backdrop-blur-md transition-colors ${
                newTagColor === c.value
                  ? `${tagColorClasses[c.value]} ${selectedColorClasses[c.value]}`
                  : `border-white/10 text-slate-400 hover:text-white hover:border-white/20`
              }`}
            >
              {c.name}
            </motion.button>
          ))}
        </div>

        {/* Tags Grid */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-1">
            <AnimatePresence mode="wait">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6"
              >
                {tags.map((tag, i) => {
                const colorClass = tagColorClasses[tag.color || "cyan"];
                return (
                  <motion.div
                    key={tag.id}
                    custom={i}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    whileTap={{ scale: 0.99 }}
                    className={`card-lift rounded-xl px-3 sm:px-4 py-2 sm:py-3 border border-white/10 bg-white/5 flex items-center justify-between shadow-md ${colorClass}`}
                  >
                    {editingId === tag.id ? (
                      <div className="flex flex-col gap-2 w-full">
                        <TextField
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                        />
                        <div className="flex gap-1 sm:gap-2 flex-wrap">
                          {colorOptions.map((c) => (
                            <motion.button
                              key={c.value}
                              type="button"
                              whileTap={{ scale: 0.92 }}
                              onClick={() => setEditedColor(c.value)}
                              className={`interactive-chip px-2 sm:px-3 py-1 text-xs rounded-full border backdrop-blur-md transition-colors ${
                                editedColor === c.value
                                  ? `${tagColorClasses[c.value]} ${selectedColorClasses[c.value]}`
                                  : `border-white/10 text-slate-400 hover:text-white hover:border-white/20`
                              }`}
                            >
                              {c.name}
                            </motion.button>
                          ))}
                        </div>
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
                        <span className="text-xs sm:text-sm font-medium truncate max-w-[100px] sm:max-w-[150px]">
                          {tag.name}
                        </span>
                        <div className="flex gap-1 sm:gap-2">
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
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}
      </GlassPanel>
      </div>
    </PageTransition>
  );
}
