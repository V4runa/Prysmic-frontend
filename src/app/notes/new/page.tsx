"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import GlassPanel from "../../components/GlassPanel";
import { apiFetch } from "../../hooks/useApi";

export default function NotesPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");

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
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          content,
          tagIds: [],
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
        <div className="flex justify-between items-center">
          <h2 className="text-slate-100 text-3xl font-semibold tracking-wide">
            New Note
          </h2>
          <Link
            href="/notes"
            className="px-5 py-2 bg-white/10 hover:bg-white/20 text-slate-100 rounded-md border border-white/10 transition text-sm"
          >
            ← Back to Notes
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 bg-white/10 text-slate-200 placeholder-slate-400/40 rounded-md"
          />
          <textarea
            placeholder="Write your note here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={12}
            className="w-full px-4 py-2 bg-white/10 text-slate-200 placeholder-slate-400/40 rounded-md resize-none"
          />
          <button
            type="submit"
            className="self-end px-5 py-2 mt-4 bg-white/5 hover:bg-cyan-200/10 text-slate-100 rounded-md border border-white/10"
          >
            Save
          </button>
        </form>

        {error && (
          <p className="text-red-400 text-sm mt-3 text-center">{error}</p>
        )}
      </GlassPanel>
    </div>
  );
}
