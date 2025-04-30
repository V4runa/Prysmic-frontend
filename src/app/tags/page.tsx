// === /tags/page.tsx ===
"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
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

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    if (!token) return;
    apiFetch<Tag[]>("/tags", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(setTags)
      .catch(() => setError("Could not fetch tags"));
  }, [token]);

  const handleCreate = async () => {
    if (!token || !newTagName.trim()) return;
    try {
      const created = await apiFetch<Tag>("/tags", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newTagName, color: newTagColor }),
      });
      setTags((prev) => [...prev, created]);
      setNewTagName("");
    } catch {
      setError("Failed to create tag");
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) return;
    try {
      await apiFetch(`/tags/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setTags((prev) => prev.filter((t) => t.id !== id));
    } catch {
      setError("Failed to delete tag");
    }
  };

  const handleSaveEdit = async (id: number) => {
    if (!token || !editedName.trim()) return;
    try {
      const updated = await apiFetch<Tag>(`/tags/${id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: editedName, color: editedColor }),
      });
      setTags((prev) => prev.map((t) => (t.id === id ? updated : t)));
      setEditingId(null);
    } catch {
      setError("Failed to update tag");
    }
  };

  return (
    <PageTransition>
      <div className="h-screen flex flex-col items-center justify-center px-4 py-8 overflow-y-auto">
        <GlassPanel className="w-full max-w-3xl flex flex-col gap-8">
          <h2 className="text-slate-100 text-3xl font-bold tracking-wide">Tag Codex</h2>

          {/* Tag Creation */}
          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="Tag name..."
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              className="w-full px-4 py-2 bg-white/10 text-slate-200 rounded-md border border-white/10"
            />
            <div className="flex flex-wrap items-center gap-2">
              {colorOptions.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setNewTagColor(c.value)}
                  className={`px-3 py-1 text-xs rounded-full border backdrop-blur-md transition ${
                    newTagColor === c.value
                      ? `${tagColorClasses[c.value]} ring-2 ring-${c.value}-300 text-${c.value}-200 border-${c.value}-300`
                      : `border-white/10 text-slate-400 hover:text-white hover:border-white/20`
                  }`}
                >
                  {c.name}
                </button>
              ))}
              <button
                onClick={handleCreate}
                className="px-3 py-2 text-sm text-slate-300 hover:text-white border border-white/10 rounded-md hover:bg-white/10 transition"
              >
                +
              </button>
            </div>
          </div>

          {/* Tags Display */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {tags.map((tag) => {
              const colorClass = tagColorClasses[tag.color || "cyan"];
              return (
                <motion.div
                  key={tag.id}
                  whileHover={{ scale: 1.02 }}
                  className={`rounded-xl px-4 py-3 border border-white/10 bg-white/5 flex items-center justify-between shadow-md ${colorClass}`}
                >
                  {editingId === tag.id ? (
                    <div className="flex flex-col gap-2 w-full">
                      <input
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="w-full px-3 py-1 bg-white/10 text-slate-200 rounded-md border border-white/10"
                      />
                      <div className="flex gap-2 flex-wrap">
                        {colorOptions.map((c) => (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => setEditedColor(c.value)}
                            className={`px-3 py-1 text-xs rounded-full border backdrop-blur-md transition ${
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
                          <Save className="h-4 w-4 text-cyan-300" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          title="Cancel"
                          className="p-1 border border-white/10 rounded-md hover:bg-white/10"
                        >
                          <X className="h-4 w-4 text-slate-300" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm font-medium truncate max-w-[150px]">
                        {tag.name}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingId(tag.id);
                            setEditedName(tag.name);
                            setEditedColor(tag.color || "cyan");
                          }}
                          title="Edit"
                          className="p-1 border border-cyan-300/20 rounded-md hover:bg-cyan-400/10"
                        >
                          <Pencil className="h-4 w-4 text-cyan-300" />
                        </button>
                        <button
                          onClick={() => handleDelete(tag.id)}
                          title="Delete"
                          className="p-1 border border-red-300/20 rounded-md hover:bg-red-400/10"
                        >
                          <Trash2 className="h-4 w-4 text-red-300" />
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              );
            })}
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
        </GlassPanel>
      </div>
    </PageTransition>
  );
}
