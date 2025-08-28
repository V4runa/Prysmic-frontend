"use client";

import Link from "next/link";
import GlassPanel from "./components/GlassPanel";
import PageTransition from "./components/PageTransition"; // ✅

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-[#0b0c0f] via-[#101215] to-[#13161a]">
      <PageTransition>
        <GlassPanel className="w-full max-w-2xl text-center">
          <h1 className="text-4xl text-slate-100 font-semibold mb-4 tracking-wide">
            Welcome to <span className="text-cyan-300">Prysmic</span>
          </h1>
          <p className="text-slate-400 text-lg mb-6">
          Prysmic is an extension to your cognition. A smoothly designed space to capture thoughts, track habits, and organize tasks.
          </p>

          <div className="flex justify-center gap-6">
            <Link
              href="/login"
              className="px-6 py-2 bg-white/10 hover:bg-white/20 text-slate-100 rounded-md border border-white/10 transition"
            >
              Log In
            </Link>
            <Link
              href="/signup"
              className="px-6 py-2 bg-cyan-400/10 hover:bg-cyan-400/20 text-cyan-200 rounded-md border border-cyan-300/10 transition"
            >
              Sign Up
            </Link>
          </div>

          <p className="text-xs text-slate-500 mt-8 tracking-wide uppercase">
            Created by a wanderer of code and thought
          </p>
        </GlassPanel>
      </PageTransition>
    </div>
  );
}
