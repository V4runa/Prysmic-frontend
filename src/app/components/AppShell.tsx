"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PageTransition from "./PageTransition";
import { motion } from "framer-motion";

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
    { label: "Tags", href: "/tags" },
    { label: "Habits", href: "/habits" },
    { label: "Summon AI", href: "#", disabled: true },
  ];

  return (
    <div className="min-h-screen text-slate-100 font-sans relative overflow-hidden">
      {/* Background Layer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2, ease: "easeOut" }}
        className="fixed inset-0 -z-10"
      >
        {/* Subtle Cosmic Moving Gradient */}
        <motion.div
          initial={{ backgroundPosition: "0% 50%" }}
          animate={{ backgroundPosition: "100% 50%" }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 bg-gradient-to-br from-[#0a0f2c] via-[#111827] to-[#000000] bg-[length:400%_400%] pointer-events-none"
          style={{ zIndex: -10 }}
        />

        {/* Darkened overlay */}
        <div className="absolute inset-0 bg-black/70 pointer-events-none" />

        {/* Radial vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_40%,rgba(0,0,0,0.7)_100%)] pointer-events-none" />
      </motion.div>

      {/* Top Navigation Bar */}
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
          {username && (
            <span className="text-slate-400 italic">
              Wandering as {username}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded-md border border-white/10"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="pt-20 px-4 pb-10 w-full max-w-[95vw] mx-auto relative z-10 bg-transparent">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
