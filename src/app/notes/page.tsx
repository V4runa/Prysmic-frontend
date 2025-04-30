// === /notes/page.tsx ===
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import GlassPanel from "../components/GlassPanel";
import { apiFetch } from "../hooks/useApi";
import { getUserFromToken } from "../hooks/useAuth";
import { motion } from "framer-motion";

interface Note {
  id: number;
  title: string;
  content: string;
  tags?: { id: number; name: string; color?: string }[];
}

const tagColorClasses: Record<string, string> = {
  cyan: "text-cyan-300 border-cyan-300/30 shadow-cyan-300/10",
  rose: "text-rose-300 border-rose-300/30 shadow-rose-300/10",
  slate: "text-slate-300 border-slate-300/30 shadow-slate-300/10",
  violet: "text-violet-300 border-violet-300/30 shadow-violet-300/10",
  emerald: "text-emerald-300 border-emerald-300/30 shadow-emerald-300/10",
  amber: "text-amber-300 border-amber-300/30 shadow-amber-300/10",
};

export default function NotesOverviewPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = getUserFromToken();

    if (!token || !user) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    apiFetch(`/notes/user/${user.userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((data) => setNotes(data as Note[]))
      .catch((err) => {
        console.error("Failed to fetch notes", err);
        setError("Could not load notes.");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="h-screen flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden bg-transparent">
      <GlassPanel className="w-full max-w-6xl h-[65vh] flex flex-col justify-start gap-8">
        <div className="flex justify-between items-center">
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
        ) : notes.length === 0 ? (
          <p className="text-slate-400 text-center text-lg">No notes yet. Create one!</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {notes.map((note) => (
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
                        className={`px-3 py-1 text-xs rounded-full border backdrop-blur-md shadow-sm transition ${
                          tagColorClasses[tag.color ?? "cyan"]
                        }`}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}

                <Link href={`/notes/${note.id}`} className="absolute inset-0 z-10" />
              </motion.div>
            ))}
          </div>
        )}
      </GlassPanel>
    </div>
  );
}
