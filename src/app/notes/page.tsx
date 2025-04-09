"use client";

import Link from "next/link";
import GlassPanel from "../components/GlassPanel";

const mockNotes = [
  { id: "1", title: "First Note", preview: "This is the first note's preview." },
  { id: "2", title: "Second Note", preview: "Another note, deep in thought." },
  { id: "3", title: "Third Note", preview: "A quiet observation..." },
];

export default function NotesOverviewPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-[#0b0c0f] via-[#101215] to-[#13161a]">
      <GlassPanel className="w-full max-w-6xl min-h-[500px]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-slate-100 text-2xl font-semibold">Your Notes</h2>
          <Link
            href="/notes/new"
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-slate-100 rounded-md border border-white/10"
          >
            + New Note
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockNotes.map((note) => (
            <Link
              key={note.id}
              href={`/notes/${note.id}`}
              className="block backdrop-blur-sm bg-white/5 border border-white/5 p-4 rounded-lg hover:bg-white/10 transition"
            >
              <h3 className="text-slate-100 text-lg font-medium mb-2">{note.title}</h3>
              <p className="text-slate-400 text-sm">{note.preview}</p>
            </Link>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
}
