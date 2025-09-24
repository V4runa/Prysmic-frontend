// === /notes/new/page.tsx ===
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import GlassPanel from "../../components/GlassPanel";
import PageTransition from "../../components/PageTransition";
import { apiFetch } from "../../hooks/useApi";
import { motion, AnimatePresence } from "framer-motion";

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
    } catch (err: Error | unknown) {
      console.error("Note creation failed", err);
      setError("Failed to create note.");
    }
  };

  return (
    <PageTransition>
      <div className="w-full h-[calc(100vh-3rem)] flex flex-col items-center px-4 sm:px-6 md:px-10 xl:px-12 2xl:px-20 pt-4 pb-4 gap-4 sm:gap-6">
        <GlassPanel className="w-full max-w-[1400px] flex flex-col gap-4 sm:gap-6 h-full min-h-0">
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
        <div className="flex-1 flex flex-col min-h-0">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-6 h-full">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex-1 flex flex-col gap-4 sm:gap-6"
            >
              <input
                type="text"
                placeholder="Title your thought..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 text-slate-200 placeholder-slate-400/40 rounded-md text-lg sm:text-xl"
              />

              <textarea
                placeholder="Let it flow onto the pond..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                className="w-full px-4 py-3 bg-white/10 text-slate-200 placeholder-slate-400/40 rounded-md resize-none text-sm sm:text-base flex-1"
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
                        whileHover={{ scale: 1.05 }}
                        onClick={() => toggleTag(tag.id)}
                        className={`px-3 sm:px-4 py-1 text-xs rounded-full border backdrop-blur-md shadow-sm transition ${
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

            <div className="flex-shrink-0 flex justify-end gap-3 mt-4">
              <button
                type="submit"
                className="px-4 sm:px-5 py-2 bg-cyan-400/10 hover:bg-cyan-400/20 text-cyan-300 rounded-md border border-cyan-300/20 transition text-sm"
              >
                Save
              </button>
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