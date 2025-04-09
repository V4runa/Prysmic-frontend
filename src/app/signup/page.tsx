"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import GlassPanel from "../components/GlassPanel";

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-[#0b0c0f] via-[#101215] to-[#13161a]">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <GlassPanel>
          <h2 className="text-slate-100 text-2xl font-medium mb-6 text-center tracking-wide">
            Create an Account
          </h2>

          <form className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Full Name"
              className="w-full px-4 py-2 bg-white/10 text-slate-200 placeholder-slate-400/40 rounded-md"
            />
            <input
              type="email"
              placeholder="Email"
              className="w-full px-4 py-2 bg-white/10 text-slate-200 placeholder-slate-400/40 rounded-md"
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full px-4 py-2 bg-white/10 text-slate-200 placeholder-slate-400/40 rounded-md"
            />
            <button
              type="submit"
              className="w-full py-2 mt-2 bg-white/5 hover:bg-cyan-200/10 text-slate-100 rounded-md border border-white/10"
            >
              Sign Up
            </button>
          </form>

          <p className="text-slate-400 text-sm mt-4 text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-cyan-300 hover:underline">
              Log in
            </Link>
          </p>
        </GlassPanel>
      </motion.div>
    </div>
  );
}
