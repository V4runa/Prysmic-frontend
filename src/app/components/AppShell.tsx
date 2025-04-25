// src/components/AppShell.tsx

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const decoded = JSON.parse(atob(token.split(".")[1]));
      setUsername(decoded.username || null);
    } catch {
      setUsername(null);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  const navItems = [
    { label: "Notes", href: "/notes" },
    { label: "New", href: "/notes/new" },
    { label: "Summon AI", href: "#", disabled: true },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b0c0f] via-[#101215] to-[#13161a] text-slate-100 font-sans">
      <div className="fixed top-0 left-0 right-0 z-50 backdrop-blur-lg bg-white/5 border-b border-white/10 px-4 py-3 flex justify-between items-center shadow-sm">
        <div className="flex gap-6 items-center">
          <h1 className="text-xl font-bold tracking-wide">AI Notes</h1>
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`text-sm hover:text-cyan-300 transition ${
                pathname === item.href ? "text-cyan-300" : "text-slate-300"
              } ${item.disabled ? "opacity-30 cursor-not-allowed" : ""}`}
              onClick={(e) => item.disabled && e.preventDefault()}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex gap-4 items-center text-sm">
          {username && <span className="text-slate-400 italic">Wandering as {username}</span>}
          <button
            onClick={handleLogout}
            className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded-md border border-white/10"
          >
            Logout
          </button>
        </div>
      </div>

      <main className="pt-20 px-4 pb-10 max-w-7xl mx-auto">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 64, scale: 0.985, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 1 }}
            transition={{ duration: 1.6, ease: [0.25, 1, 0.3, 1] }}
            style={{ transformOrigin: "center" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}