"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import GlassPanel from "../components/GlassPanel";
import { apiFetch } from "../hooks/useApi";
import { getUserFromToken } from "../hooks/useAuth";

const mockNotes = [
  {
    id: "1",
    title: "First Note",
    preview: "This is the first note's preview.",
  },
  { id: "2", title: "Second Note", preview: "Another note, deep in thought." },
  { id: "3", title: "Third Note", preview: "A quiet observation..." },
];

export default function NotesOverviewPage() {
  const [notes, setNotes] = useState<any[]>([]);
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
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((data) => setNotes(data as any[]))
      .catch((err) => {
        console.error("Failed to fetch notes", err);
        setError("Could not load notes.");
      })
      .finally(() => setLoading(false));
  }, []);

  const notesToRender = notes.length > 0 ? notes : mockNotes;

  return (
    <div className="h-screen flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden bg-transparent">
      {/* Ripple background layer */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse,rgba(30,144,255,0.02)_0%,transparent_70%)] bg-[length:200%_200%] animate-[ripple_24s_linear_infinite] z-0" />

      <motion.div
        animate={{
          y: [0, 1.5, 0, -1.5, 0],
          rotate: [0, 0.3, 0, -0.3, 0],
        }}
        transition={{
          duration: 14,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="relative z-10 w-full max-w-6xl px-4"
      >
        {/* subtle glow */}
        <div className="absolute -inset-1 rounded-2xl bg-cyan-200/5 blur-2xl z-0" />

        <GlassPanel className="relative z-10 h-[65vh] flex flex-col justify-start gap-8">
          {/* Top Section */}
          <div className="flex justify-between items-center">
            <h2 className="text-slate-100 text-3xl font-semibold tracking-wide">
              Your Notes
            </h2>
            <Link
              href="/notes/new"
              className="px-5 py-2 bg-white/10 hover:bg-white/20 text-slate-100 rounded-md border border-white/10 transition text-sm"
            >
              + New Note
            </Link>
          </div>

          {/* Notes Grid */}
          {loading ? (
            <p className="text-slate-400 text-center text-lg">Loading...</p>
          ) : error ? (
            <p className="text-red-400 text-center text-lg">{error}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {notesToRender.map((note) => (
                <motion.div
                  key={note.id}
                  animate={{ y: [0, 1, 0, -1, 0] }}
                  whileHover={{
                    y: -2,
                    scale: 1.015,
                    boxShadow: "0 6px 12px rgba(255, 255, 255, 0.05)",
                  }}
                  transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <Link
                    href={`/notes/${note.id}`}
                    className="block backdrop-blur-sm bg-white/5 border border-white/5 p-5 rounded-lg hover:bg-white/10 transition h-full"
                  >
                    <h3 className="text-slate-100 text-lg font-semibold mb-2">
                      {note.title}
                    </h3>
                    <p className="text-slate-400 text-sm">
                      {note.preview || note.content?.slice(0, 100) || ""}
                    </p>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </GlassPanel>
      </motion.div>
    </div>
  );
}
