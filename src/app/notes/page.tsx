"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import GlassPanel from "../components/GlassPanel";
import { apiFetch } from "../hooks/useApi";
import { getUserFromToken } from "../hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { Tag } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Note {
  id: number;
  title: string;
  content: string;
  tags?: { id: number; name: string; color?: string }[];
  createdAt: string;
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
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [notesPerPage] = useState(8);

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

        setNotes(notesList);
        setAllTags(enrichedTags.sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(() => setError("Could not load notes or tags."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTags]);

  const toggleTag = (name: string) => {
    setActiveTags((prev) =>
      prev.includes(name) ? prev.filter((tag) => tag !== name) : [...prev, name]
    );
  };

  const filteredNotes = activeTags.length
    ? notes.filter((note) =>
        note.tags?.some((tag) => activeTags.includes(tag.name))
      )
    : notes;

  const totalPages = Math.max(
    1,
    Math.ceil(filteredNotes.length / notesPerPage)
  );
  const indexOfLastNote = currentPage * notesPerPage;
  const indexOfFirstNote = indexOfLastNote - notesPerPage;
  const currentNotes = filteredNotes.slice(indexOfFirstNote, indexOfLastNote);

  const cardVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.04 },
    }),
  };

  const tagColorClasses: Record<string, string> = {
    cyan: "text-cyan-300 border-cyan-300/30 shadow-cyan-300/10",
    rose: "text-rose-300 border-rose-300/30 shadow-rose-300/10",
    slate: "text-slate-300 border-slate-300/30 shadow-slate-300/10",
    violet: "text-violet-300 border-violet-300/30 shadow-violet-300/10",
    emerald: "text-emerald-300 border-emerald-300/30 shadow-emerald-300/10",
    amber: "text-amber-300 border-amber-300/30 shadow-amber-300/10",
  };

  const tagActiveClasses: Record<string, string> = {
    cyan: "ring ring-cyan-300 shadow-[0_0_10px] shadow-cyan-400/40 scale-[1.05] bg-cyan-500/10",
    rose: "ring ring-rose-300 shadow-[0_0_10px] shadow-rose-400/40 scale-[1.05] bg-rose-500/10",
    slate: "ring ring-slate-300 shadow-[0_0_10px] shadow-slate-400/40 scale-[1.05] bg-slate-500/10",
    violet: "ring ring-violet-300 shadow-[0_0_10px] shadow-violet-400/40 scale-[1.05] bg-violet-500/10",
    emerald: "ring ring-emerald-300 shadow-[0_0_10px] shadow-emerald-400/40 scale-[1.05] bg-emerald-500/10",
    amber: "ring ring-amber-300 shadow-[0_0_10px] shadow-amber-400/40 scale-[1.05] bg-amber-500/10",
  };

  return (
    <div className="w-full h-[calc(100vh-3rem)] flex flex-col xl:flex-row px-4 sm:px-6 md:px-10 xl:px-12 2xl:px-20 pt-4 pb-4 gap-4 sm:gap-6">
      {/* Sidebar (desktop only) */}
      {allTags.length > 0 && (
        <aside className="hidden xl:block w-[260px] shrink-0">
          <GlassPanel className="flex flex-col max-h-[calc(100vh-8rem)] overflow-y-auto p-4 gap-4 shadow-xl rounded-2xl backdrop-blur-md bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 text-slate-200 uppercase text-xs font-semibold tracking-widest">
              <Tag size={20} /> Tags
            </div>
            <div className="flex flex-col gap-3 mt-1">
              {allTags.map((tag, i) => {
                const isActive = activeTags.includes(tag.name);
                const color = tag.color || "slate";
                const baseClasses = tagColorClasses[color];
                const activeClasses = tagActiveClasses[color];
                
                return (
                  <motion.div
                    key={tag.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05, type: "spring", stiffness: 180, damping: 18 }}
                    layout
                    whileTap={{ scale: 0.98 }}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => toggleTag(tag.name)}
                    className={`cursor-pointer px-4 py-2 flex items-center justify-between rounded-xl border backdrop-blur-lg relative transition-all duration-200 ${
                      baseClasses
                    } ${
                      isActive
                        ? activeClasses
                        : "hover:bg-white/20"
                    }`}
                    style={{
                      background: isActive
                        ? `rgba(255, 255, 255, 0.10)`
                        : "rgba(255,255,255,0.025)",
                    }}
                  >
                    <span className={`text-sm font-medium truncate w-40 ${baseClasses.split(' ')[0]}`}>
                      {tag.name}
                    </span>
                    <div className={`text-xs font-semibold rounded bg-white/10 ${baseClasses.split(' ')[0]} border ${baseClasses.split(' ')[1]} px-2 py-1 min-w-[32px] text-center`}>
                      {tag.count}
                    </div>
                  </motion.div>
                );
              })}
            </div>
            {activeTags.length > 0 && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={() => setActiveTags([])}
                  className="text-xs text-cyan-300 underline hover:text-cyan-200 transition"
                >
                  Clear all tags
                </button>
              </div>
            )}
            
            {/* Notes Counter */}
            <div className="flex justify-center pt-3 border-t border-white/10">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 shadow-inner min-w-[60px]"
              >
                <div className="text-center">
                  <div className="text-lg font-bold text-slate-200 leading-none">
                    {filteredNotes.length.toString().padStart(2, '0')}
                  </div>
                  <div className="text-xs text-slate-400 uppercase tracking-wider mt-0.5">
                    {filteredNotes.length === 1 ? 'Note' : 'Notes'}
                  </div>
                </div>
              </motion.div>
            </div>
          </GlassPanel>
        </aside>
      )}

      {/* Main content */}
      <main className="flex-grow flex flex-col items-center gap-4 sm:gap-6 min-h-0">
        <GlassPanel className="w-full max-w-[1400px] flex flex-col gap-4 sm:gap-6 h-full min-h-0">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <h2 className="text-slate-100 text-3xl font-bold tracking-wide">
              Your Notes
            </h2>
            <Link
              href="/notes/new"
              className="px-5 py-2 bg-cyan-400/10 hover:bg-cyan-400/20 text-cyan-300 rounded-md border border-cyan-300/20 transition text-sm"
            >
              + New Note
            </Link>
          </div>

          {/* Mobile tag filter bar */}
          {allTags.length > 0 && (
            <div className="xl:hidden overflow-x-auto flex gap-2 py-3 px-1 -mx-1">
              {allTags.map((tag, i) => {
                const isActive = activeTags.includes(tag.name);
                const color = tag.color || "slate";
                const baseClasses = tagColorClasses[color];
                
                return (
                  <motion.button
                    key={tag.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => toggleTag(tag.name)}
                    className={`text-xs px-3 py-1 rounded-full border whitespace-nowrap transition-all duration-200 ${
                      baseClasses
                    } ${
                      isActive
                        ? `bg-${color}-500/20 ring-1 ring-${color}-300/50`
                        : `hover:bg-white/10`
                    }`}
                  >
                    {tag.name}
                  </motion.button>
                );
              })}
              {activeTags.length > 0 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: allTags.length * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setActiveTags([])}
                  className="text-xs text-cyan-300 underline ml-auto hover:text-cyan-200 transition"
                >
                  Clear
                </motion.button>
              )}
            </div>
          )}

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-slate-400 text-center text-lg">Loading...</p>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-red-400 text-center text-lg">{error}</p>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-slate-400 text-center text-lg">
                No notes match your filter.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentPage + activeTags.join(",")}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6 w-full"
                  >
                    {currentNotes.map((note, i) => (
                      <motion.div
                        key={note.id}
                        custom={i}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        className="relative rounded-2xl backdrop-blur-md bg-white/5 border border-white/10 p-4 sm:p-6 shadow-lg hover:shadow-2xl hover:bg-white/10 transition-all overflow-hidden flex flex-col justify-between h-full"
                      >
                        <div>
                          <h3 className="text-slate-100 text-lg sm:text-xl font-semibold mb-2 sm:mb-3 truncate">
                            {note.title}
                          </h3>
                          <p className="text-slate-400 text-sm leading-relaxed mb-3 sm:mb-5 overflow-hidden line-clamp-4 sm:line-clamp-5">
                            {note.content.slice(0, 200)}...
                          </p>
                        </div>
                        {note.tags && note.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 sm:gap-2 mt-2">
                            {note.tags.map((tag) => (
                              <span
                                key={tag.id}
                                className={`px-2 sm:px-3 py-1 text-xs rounded-full border backdrop-blur-md shadow-sm transition text-${
                                  tag.color ?? "slate"
                                }-300 border-${tag.color ?? "slate"}-300/30`}
                              >
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        )}
                        <div
                          className="mt-3 sm:mt-4 text-xs text-slate-400"
                          title={new Date(note.createdAt).toLocaleString()}
                        >
                          {formatDistanceToNow(new Date(note.createdAt), {
                            addSuffix: true,
                          })}
                        </div>
                        <Link
                          href={`/notes/${note.id}`}
                          className="absolute inset-0 z-10"
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Pagination - Always visible at bottom */}
              <div className="flex-shrink-0 pt-4 border-t border-white/10">
                <div className="flex items-center gap-2 flex-wrap justify-center">
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
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-xs rounded-md border bg-white/10 text-white border-white/10 hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              </div>
            </div>
          )}
        </GlassPanel>
      </main>
    </div>
  );
}
