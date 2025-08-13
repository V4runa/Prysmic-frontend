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
  const [notesPerPage, setNotesPerPage] = useState(6);

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

  useEffect(() => {
    const height = window.innerHeight;
    const cardHeight = 300;
    const usable = height - 140;
    const rows = Math.floor(usable / cardHeight);
    const columns =
      window.innerWidth < 768
        ? 1
        : window.innerWidth < 1024
        ? 2
        : window.innerWidth < 1280
        ? 3
        : 4;
    setNotesPerPage(Math.max(1, rows * columns));
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTags]);

  const toggleTag = (name: string) => {
    setActiveTags((prev) =>
      prev.includes(name)
        ? prev.filter((tag) => tag !== name)
        : [...prev, name]
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

  return (
    <div className="w-full h-[calc(100vh-80px)] px-[clamp(1rem,4vw,2rem)] pt-6 pb-4 flex gap-6 items-start overflow-hidden mt-12">
      {/* Left: Tags */}
      {allTags.length > 0 && (
        <GlassPanel className="hidden md:flex flex-col w-64 p-4 gap-4 shadow-xl rounded-2xl backdrop-blur-md bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 text-slate-200 uppercase text-xs font-semibold tracking-widest">
            <Tag size={20} /> Tags
          </div>

          <div className="flex flex-col gap-3 mt-1">
            {allTags.map((tag) => {
              const isActive = activeTags.includes(tag.name);
              return (
                <motion.div
                  key={tag.id}
                  layout
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 180, damping: 18 }}
                  onClick={() => toggleTag(tag.name)}
                  className={`cursor-pointer px-4 py-2 flex items-center justify-between rounded-xl border backdrop-blur-lg relative
                  border-${tag.color}-300/20
                  ${
                    isActive
                      ? `ring ring-${tag.color}-300 shadow-[0_0_10px] shadow-${tag.color}-400/40 scale-[1.05] bg-${tag.color}-500/10`
                      : "hover:bg-white/20"
                  }`}
                  style={{
                    background: isActive ? `rgba(255, 255, 255, 0.10)` : "rgba(255,255,255,0.025)",
                  }}
                >
                  <span
                    className={`text-sm font-medium truncate w-40 text-${tag.color}-300`}
                  >
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

          <div className="mt-auto pt-6 flex flex-col items-center gap-1">
            <span className="uppercase tracking-wide text-[10px] text-slate-400 font-semibold">
              Echoes of Thought
            </span>
            <div className="w-20 h-16 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md shadow-inner flex items-center justify-center">
              <span className="text-3xl font-mono text-slate-200">
                {filteredNotes.length}
              </span>
            </div>
          </div>
        </GlassPanel>
      )}

      {/* Right: Notes */}
      <GlassPanel className="flex-grow w-full h-full flex flex-col justify-start gap-6 overflow-hidden">
        <div className="flex justify-between items-start">
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

        {loading ? (
          <p className="text-slate-400 text-center text-lg">Loading...</p>
        ) : error ? (
          <p className="text-red-400 text-center text-lg">{error}</p>
        ) : filteredNotes.length === 0 ? (
          <p className="text-slate-400 text-center text-lg">
            No notes match your filter.
          </p>
        ) : (
          <>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage + activeTags.join(",")}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              >
                {currentNotes.map((note, i) => (
                  <motion.div
                    key={note.id}
                    custom={i}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
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
                    <div
                      className="mt-4 text-xs text-slate-400"
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

            <div className="mt-auto flex justify-center pt-6">
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
          </>
        )}
      </GlassPanel>
    </div>
  );
}
