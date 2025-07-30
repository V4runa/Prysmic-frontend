// === /notes/new/page.tsx ===
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import GlassPanel from "../../components/GlassPanel";
import { apiFetch } from "../../hooks/useApi";
import { motion } from "framer-motion";

interface Tag {
  id: number;
  name: string;
  color?: string;
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
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Unauthorized");
      return;
    }

    apiFetch("/tags", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((data) => setTags(data as Tag[]))
      .catch((err) => {
        console.error("Failed to fetch tags", err);
      });
  }, []);

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const token = localStorage.getItem("token");
    if (!token) {
      setError("You must be logged in to create a note.");
      return;
    }

    try {
      await apiFetch("/notes", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title,
          content,
          tagIds: selectedTagIds,
        }),
      });

      router.push("/notes");
    } catch (err: any) {
      console.error("Note creation failed", err);
      setError("Failed to create note.");
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden bg-transparent">
      <GlassPanel className="w-full max-w-6xl h-[65vh] flex flex-col justify-start gap-8">
        {/* Top Row */}
        <div className="flex justify-between items-center">
          <h2 className="text-slate-100 text-3xl font-bold tracking-wide">
            Create Note
          </h2>
          <Link
            href="/notes"
            className="px-5 py-2 bg-cyan-400/10 hover:bg-cyan-400/20 text-cyan-300 rounded-md border border-cyan-300/20 transition text-sm"
          >
            ← Back
          </Link>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <input
            type="text"
            placeholder="Title your thought..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 bg-white/10 text-slate-200 placeholder-slate-400/40 rounded-md text-lg"
          />

          <textarea
            placeholder="Let it flow onto the pond..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            className="w-full px-4 py-2 bg-white/10 text-slate-200 placeholder-slate-400/40 rounded-md resize-none text-base"
          />

          <div className="flex flex-col gap-3">
            <h4 className="text-slate-300 text-sm uppercase tracking-wider mb-1">
              Attach tags (optional)
            </h4>
            <div className="flex flex-wrap gap-3">
              {tags.map((tag) => (
                <motion.button
                  key={tag.id}
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  onClick={() => toggleTag(tag.id)}
                  className={`px-4 py-1 text-xs rounded-full border backdrop-blur-md shadow-sm transition ${
                    selectedTagIds.includes(tag.id)
                      ? `${tagColorClasses[tag.color ?? "cyan"]} ring-1 ring-inset ring-white/20`
                      : `text-slate-300 border-white/10 hover:bg-white/10`
                  }`}
                >
                  {tag.name}
                </motion.button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="self-end px-5 py-2 mt-4 bg-cyan-400/10 hover:bg-cyan-400/20 text-cyan-300 rounded-md border border-cyan-300/20 transition text-sm"
          >
            Save
          </button>

          {error && (
            <p className="text-red-400 text-sm mt-3 text-center">{error}</p>
          )}
        </form>
      </GlassPanel>
    </div>
  );
}