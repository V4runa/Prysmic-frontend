"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import GlassPanel from "../../components/GlassPanel";

export default function ViewNotePage() {
  const { id } = useParams();

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-[#0b0c0f] via-[#101215] to-[#13161a]">
      <GlassPanel className="w-full max-w-2xl min-h-[300px]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-slate-100 text-xl font-semibold">Viewing Note</h2>
          <Link href="/notes" className="text-cyan-300 text-sm hover:underline">
            ← Back to Notes
          </Link>
        </div>

        <p className="text-slate-400 mb-2">
          Note ID: <span className="text-slate-200">{id}</span>
        </p>

        <div className="text-slate-300 italic">
          (Note content will be displayed here.)
        </div>
      </GlassPanel>
    </div>
  );
}
