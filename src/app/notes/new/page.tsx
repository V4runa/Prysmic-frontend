"use client";

import Link from "next/link";
import GlassPanel from "../../components/GlassPanel";

export default function NotesPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-[#0b0c0f] via-[#101215] to-[#13161a]">
      <GlassPanel className="w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-slate-100 text-xl font-semibold">New Note</h2>
          <Link href="/notes" className="text-cyan-300 text-sm hover:underline">
            ← Back to Notes
          </Link>
        </div>

        <form className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Title"
            className="w-full px-4 py-2 bg-white/10 text-slate-200 placeholder-slate-400/40 rounded-md"
          />
          <textarea
            placeholder="Write your note here..."
            rows={10}
            className="w-full px-4 py-2 bg-white/10 text-slate-200 placeholder-slate-400/40 rounded-md resize-none"
          />
          <button
            type="submit"
            className="self-end px-4 py-2 mt-2 bg-white/5 hover:bg-cyan-200/10 text-slate-100 rounded-md border border-white/10"
          >
            Save
          </button>
        </form>
      </GlassPanel>
    </div>
  );
}
