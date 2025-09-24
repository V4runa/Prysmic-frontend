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
    { label: "Tags", href: "/tags" },
    { label: "Habits", href: "/habits" },
    { label: "Tasks", href: "/tasks" },
    { label: "Coming Soon...", href: "#", disabled: true },
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
        <motion.div
          initial={{ backgroundPosition: "0% 50%" }}
          animate={{ backgroundPosition: "100% 50%" }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 bg-gradient-to-br from-[#0a0f2c] via-[#111827] to-[#000000] bg-[length:400%_400%] pointer-events-none"
          style={{ zIndex: -10 }}
        />

        <div className="absolute inset-0 bg-black/70 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_40%,rgba(0,0,0,0.7)_100%)] pointer-events-none" />
      </motion.div>

      {/* Top Navigation Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 backdrop-blur-lg bg-white/5 border-b border-white/10 px-4 py-2 flex justify-between items-center shadow-sm h-12">
        <div className="flex gap-2 sm:gap-4 lg:gap-6 items-center min-w-0">
          <h1 className="text-lg sm:text-xl font-bold tracking-wide">Prysmic</h1>
          <div className="hidden sm:flex gap-2 sm:gap-4 lg:gap-6 items-center">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`text-xs sm:text-sm hover:text-cyan-300 transition whitespace-nowrap ${
                  pathname === item.href ? "text-cyan-300" : "text-slate-300"
                } ${item.disabled ? "opacity-30 cursor-not-allowed" : ""}`}
                onClick={(e) => item.disabled && e.preventDefault()}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex gap-2 sm:gap-4 items-center text-xs sm:text-sm min-w-0">
          {username && (
            <span className="text-slate-400 italic hidden sm:inline">
              Wandering as {username}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="bg-white/10 hover:bg-white/20 px-2 sm:px-3 py-1 rounded-md border border-white/10 text-xs sm:text-sm"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      <div className="sm:hidden fixed top-12 left-0 right-0 z-40 backdrop-blur-lg bg-white/5 border-b border-white/10 px-4 py-2">
        <div className="flex gap-2 overflow-x-auto">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`text-xs hover:text-cyan-300 transition whitespace-nowrap px-2 py-1 rounded ${
                pathname === item.href 
                  ? "text-cyan-300 bg-cyan-400/10" 
                  : "text-slate-300 hover:bg-white/10"
              } ${item.disabled ? "opacity-30 cursor-not-allowed" : ""}`}
              onClick={(e) => item.disabled && e.preventDefault()}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="relative z-10 pt-12 sm:pt-12">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
