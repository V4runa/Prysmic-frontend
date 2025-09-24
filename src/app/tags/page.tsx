"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Trash2, Save, X } from "lucide-react";
import GlassPanel from "../components/GlassPanel";
import PageTransition from "../components/PageTransition";
import { apiFetch } from "../hooks/useApi";

interface Tag {
  id: number;
  name: string;
  color?: string;
}

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

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("cyan");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editedName, setEditedName] = useState("");
  const [editedColor, setEditedColor] = useState("cyan");
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<Tag[]>("/tags")
      .then(setTags)
      .catch(() => setError("Could not fetch tags"));
  }, []);

  const handleCreate = async () => {
    if (!newTagName.trim()) return;
    try {
      const created = await apiFetch<Tag>("/tags", {
        method: "POST",
        body: JSON.stringify({ name: newTagName, color: newTagColor }),
      });
      setTags((prev) => [...prev, created]);
      setNewTagName("");
    } catch {
      setError("Failed to create tag");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiFetch(`/tags/${id}`, { method: "DELETE" });
      setTags((prev) => prev.filter((t) => t.id !== id));
    } catch {
      setError("Failed to delete tag");
    }
  };

  const handleSaveEdit = async (id: number) => {
    if (!editedName.trim()) return;
    try {
      const updated = await apiFetch<Tag>(`/tags/${id}`, {
        method: "PUT",
        body: JSON.stringify({ name: editedName, color: editedColor }),
      });
      setTags((prev) => prev.map((t) => (t.id === id ? updated : t)));
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
      <div className="w-full h-[calc(100vh-3rem)] flex flex-col items-center px-4 sm:px-6 md:px-10 xl:px-12 2xl:px-20 pt-4 pb-4 gap-4 sm:gap-6">
      <GlassPanel className="w-full max-w-[1400px] flex flex-col gap-4 sm:gap-6 h-full min-h-0">
        {/* Header */}
        <h2 className="text-slate-100 text-2xl sm:text-3xl lg:text-4xl font-bold tracking-wide">
          Tag Codex
        </h2>

        {/* Tag creation */}
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <input
            type="text"
            placeholder="Tag name..."
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="flex-grow px-3 sm:px-4 py-2 sm:py-3 bg-white/10 text-slate-200 rounded-md border border-white/10 min-w-[150px] sm:min-w-[200px] text-sm sm:text-base"
          />
          <button
            onClick={handleCreate}
            className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-slate-300 hover:text-white border border-white/10 rounded-md hover:bg-white/10 transition"
          >
            + Create
          </button>
        </div>

        {/* Color options */}
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {colorOptions.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setNewTagColor(c.value)}
              className={`px-3 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm rounded-full border backdrop-blur-md transition ${
                newTagColor === c.value
                  ? `${tagColorClasses[c.value]} ring-2 ring-${c.value}-300 text-${c.value}-200 border-${c.value}-300`
                  : `border-white/10 text-slate-400 hover:text-white hover:border-white/20`
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Tags Grid */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto">
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
                    whileHover={{ scale: 1.02 }}
                    className={`rounded-xl px-3 sm:px-4 py-2 sm:py-3 border border-white/10 bg-white/5 flex items-center justify-between shadow-md ${colorClass}`}
                  >
                    {editingId === tag.id ? (
                      <div className="flex flex-col gap-2 w-full">
                        <input
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          className="w-full px-2 sm:px-3 py-1 sm:py-2 bg-white/10 text-slate-200 rounded-md border border-white/10 text-xs sm:text-sm"
                        />
                        <div className="flex gap-1 sm:gap-2 flex-wrap">
                          {colorOptions.map((c) => (
                            <button
                              key={c.value}
                              type="button"
                              onClick={() => setEditedColor(c.value)}
                              className={`px-2 sm:px-3 py-1 text-xs rounded-full border backdrop-blur-md transition ${
                                editedColor === c.value
                                  ? `${tagColorClasses[c.value]} ring-2 ring-${c.value}-300 text-${c.value}-200 border-${c.value}-300`
                                  : `border-white/10 text-slate-400 hover:text-white hover:border-white/20`
                              }`}
                            >
                              {c.name}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleSaveEdit(tag.id)}
                            title="Save"
                            className="p-1 border border-cyan-300/20 rounded-md hover:bg-cyan-400/10"
                          >
                            <Save className="h-3 w-3 sm:h-4 sm:w-4 text-cyan-300" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            title="Cancel"
                            className="p-1 border border-white/10 rounded-md hover:bg-white/10"
                          >
                            <X className="h-3 w-3 sm:h-4 sm:w-4 text-slate-300" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className="text-xs sm:text-sm font-medium truncate max-w-[100px] sm:max-w-[150px]">
                          {tag.name}
                        </span>
                        <div className="flex gap-1 sm:gap-2">
                          <button
                            onClick={() => {
                              setEditingId(tag.id);
                              setEditedName(tag.name);
                              setEditedColor(tag.color || "cyan");
                            }}
                            title="Edit"
                            className="p-1 border border-cyan-300/20 rounded-md hover:bg-cyan-400/10"
                          >
                            <Pencil className="h-3 w-3 sm:h-4 sm:w-4 text-cyan-300" />
                          </button>
                          <button
                            onClick={() => handleDelete(tag.id)}
                            title="Delete"
                            className="p-1 border border-red-300/20 rounded-md hover:bg-red-400/10"
                          >
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 text-red-300" />
                          </button>
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
