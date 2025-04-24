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
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-[#0b0c0f] via-[#101215] to-[#13161a]">
      <GlassPanel className="w-full max-w-2xl min-h-[300px]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-slate-100 text-xl font-semibold">Viewing Note</h2>
          <Link href="/notes" className="text-cyan-300 text-sm hover:underline">
            ← Back to Notes
          </Link>
        </div>

        {loading ? (
          <p className="text-slate-400">Loading...</p>
        ) : error ? (
          <p className="text-red-400">{error}</p>
        ) : (
          <>
            <h3 className="text-slate-100 text-2xl font-semibold mb-3">
              {note.title}
            </h3>
            <p className="text-slate-300 whitespace-pre-wrap">{note.content}</p>
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
