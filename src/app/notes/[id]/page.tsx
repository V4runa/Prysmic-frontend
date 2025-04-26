"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import GlassPanel from "../../components/GlassPanel";
import { apiFetch } from "../../hooks/useApi";

export default function ViewNotePage() {
  const { id } = useParams();
  const [note, setNote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token || !id) {
      setError("Unauthorized or missing note ID");
      setLoading(false);
      return;
    }

    apiFetch(`/notes/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(setNote)
      .catch((err) => {
        console.error("Failed to fetch note", err);
        setError("Note could not be found.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="h-screen flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden bg-transparent">
      <GlassPanel className="w-full max-w-6xl h-[65vh] flex flex-col justify-start gap-8">
        <div className="flex justify-between items-center">
          <h2 className="text-slate-100 text-3xl font-semibold tracking-wide">
            Viewing Note
          </h2>
          <Link
            href="/notes"
            className="px-5 py-2 bg-white/10 hover:bg-white/20 text-slate-100 rounded-md border border-white/10 transition text-sm"
          >
            ← Back to Notes
          </Link>
        </div>

        {loading ? (
          <p className="text-slate-400 text-lg">Loading...</p>
        ) : error ? (
          <p className="text-red-400 text-lg">{error}</p>
        ) : (
          <>
            <h3 className="text-slate-100 text-2xl font-semibold mb-2">
              {note.title}
            </h3>
            <p className="text-slate-300 whitespace-pre-wrap text-base leading-relaxed">
              {note.content}
            </p>
            {note.tags?.length > 0 && (
              <div className="mt-4 text-slate-400 text-sm">
                Tags: {note.tags.map((t: any) => t.name).join(", ")}
              </div>
            )}
          </>
        )}
      </GlassPanel>
    </div>
  );
}
