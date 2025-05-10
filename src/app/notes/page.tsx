"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import GlassPanel from "../components/GlassPanel";
import { apiFetch } from "../hooks/useApi";
import { getUserFromToken } from "../hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { Tag } from "lucide-react";

interface Note {
  id: number;
  title: string;
  content: string;
  tags?: { id: number; name: string; color?: string }[];
}

interface TagData {
  id: number;
  name: string;
  color?: string;
  count?: number;
}

export default function NotesOverviewPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [allTags, setAllTags] = useState<TagData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const notesPerPage = 12;

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = getUserFromToken();

    if (!token || !user) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    Promise.all([
      apiFetch(`/notes/user/${user.userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      apiFetch(`/tags`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])
      .then(([notesData, tagsData]) => {
        const tagList = tagsData as TagData[];
        const notesList = notesData as Note[];
        setNotes(notesList);

        const tagCountMap: Record<string, number> = {};
        notesList.forEach((note) => {
          note.tags?.forEach((tag) => {
            tagCountMap[tag.name] = (tagCountMap[tag.name] || 0) + 1;
          });
        });

        const enrichedTags = tagList.map((tag) => ({
          ...tag,
          count: tagCountMap[tag.name] || 0,
        }));

        setAllTags(enrichedTags.sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch((err) => {
        console.error("Failed to fetch notes or tags", err);
        setError("Could not load notes or tags.");
      })
      .finally(() => setLoading(false));
  }, []);

  // 👇 Reset pagination when tag changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTag]);

  const filteredNotes = activeTag
    ? notes.filter((note) => note.tags?.some((tag) => tag.name === activeTag))
    : notes;

  const totalPages = Math.max(1, Math.ceil(filteredNotes.length / notesPerPage));
  const indexOfLastNote = currentPage * notesPerPage;
  const indexOfFirstNote = indexOfLastNote - notesPerPage;
  const currentNotes = filteredNotes.slice(indexOfFirstNote, indexOfLastNote);

  return (
    <div className="min-h-screen w-full flex flex-row items-start justify-center px-6 py-12 bg-transparent gap-8">
      {/* Sidebar Tags */}
      {allTags.length > 0 && (
        <GlassPanel className="hidden md:flex flex-col w-64 max-h-[85vh] p-4 gap-4 overflow-y-auto shadow-xl rounded-2xl backdrop-blur-md bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-1 text-slate-200 uppercase text-xs font-semibold tracking-widest">
            <Tag size={14} /> Tags
          </div>
          <div className="flex flex-col gap-3">
            {allTags.map((tag) => {
              const isActive = tag.name === activeTag;
              return (
                <motion.div
                  key={tag.id}
                  whileHover={{ scale: 1.03 }}
                  transition={{ type: "spring", stiffness: 100 }}
                  onClick={() => setActiveTag(isActive ? null : tag.name)}
                  className={`cursor-pointer group px-4 py-2 flex items-center justify-between rounded-xl border transition backdrop-blur-lg border-${tag.color}-300/20 hover:bg-${tag.color}-300/10 ${
                    isActive ? `bg-${tag.color}-300/20 shadow-inner shadow-${tag.color}-400/40` : "bg-white/5"
                  }`}
                >
                  <span className={`text-sm font-medium text-${tag.color}-300 truncate w-40`}>
                    {tag.name}
                  </span>
                  <div
                    className={`text-xs font-semibold rounded bg-white/10 text-${tag.color}-300 border border-${tag.color}-300/30 px-2 py-1 min-w-[32px] text-center`}
                  >
                    {tag.count}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </GlassPanel>
      )}

      {/* Notes Pad */}
      <GlassPanel className="flex-grow max-w-[95vw] min-h-[85vh] w-full flex flex-col justify-start gap-8">
        <div className="flex justify-between items-center">
          <h2 className="text-slate-100 text-3xl font-bold tracking-wide">Your Notes</h2>
          <Link
            href="/notes/new"
            className="px-5 py-2 bg-cyan-400/10 hover:bg-cyan-400/20 text-cyan-300 rounded-md border border-cyan-300/20 transition text-sm"
          >
            + New Note
          </Link>
        </div>

        {loading ? (
          <p className="text-slate-400 text-center text-lg">Loading...</p>
        ) : error ? (
          <p className="text-red-400 text-center text-lg">{error}</p>
        ) : filteredNotes.length === 0 ? (
          <p className="text-slate-400 text-center text-lg">No notes match your filter.</p>
        ) : (
          <>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage + (activeTag ?? "")}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              >
                {currentNotes.map((note) => (
                  <motion.div
                    key={note.id}
                    whileHover={{ scale: 1.03 }}
                    transition={{ type: "spring", stiffness: 100 }}
                    className="relative rounded-2xl backdrop-blur-md bg-white/5 border border-white/10 p-6 shadow-lg hover:shadow-2xl hover:bg-white/10 transition-all overflow-hidden flex flex-col justify-between h-full"
                  >
                    <div>
                      <h3 className="text-slate-100 text-xl font-semibold mb-3 truncate">
                        {note.title}
                      </h3>
                      <p className="text-slate-400 text-sm leading-relaxed mb-5 overflow-hidden line-clamp-5">
                        {note.content.slice(0, 250)}...
                      </p>
                    </div>
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {note.tags.map((tag) => (
                          <span
                            key={tag.id}
                            className={`px-3 py-1 text-xs rounded-full border backdrop-blur-md shadow-sm transition text-${tag.color ?? "slate"}-300 border-${tag.color ?? "slate"}-300/30`}
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                    <Link href={`/notes/${note.id}`} className="absolute inset-0 z-10" />
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>

            {/* Pagination Controls */}
            <div className="mt-auto flex justify-center pt-6">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-xs rounded-md border bg-white/10 text-white border-white/10 hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ← Prev
                </button>

                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    disabled={currentPage === i + 1}
                    className={`px-3 py-1 text-xs rounded-md backdrop-blur-md border transition ${
                      currentPage === i + 1
                        ? "bg-white/20 text-cyan-300 border-cyan-300/30"
                        : "bg-white/10 text-white border-white/10 hover:bg-white/15"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-xs rounded-md border bg-white/10 text-white border-white/10 hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>
          </>
        )}
      </GlassPanel>
    </div>
  );
}
