"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  StickyNote,
  Tag as TagIcon,
  Flame,
  CheckSquare,
  Smile,
  LogOut,
  type LucideIcon,
} from "lucide-react";

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

  const navItems: {
    label: string;
    href: string;
    icon?: LucideIcon;
    disabled?: boolean;
  }[] = [
    { label: "Notes", href: "/notes", icon: StickyNote },
    { label: "Tags", href: "/tags", icon: TagIcon },
    { label: "Habits", href: "/habits", icon: Flame },
    { label: "Tasks", href: "/tasks", icon: CheckSquare },
    { label: "Moods", href: "/moods", icon: Smile },
    { label: "Coming Soon...", href: "#", disabled: true },
  ];

  // Bottom tab bar (mobile) only shows the real destinations.
  const bottomNavItems = navItems.filter((item) => !item.disabled);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-[100dvh] text-slate-100 font-sans relative overflow-hidden">
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
      <div className="app-header fixed top-0 left-0 right-0 z-50 backdrop-blur-lg bg-white/5 border-b border-white/10 px-4 flex justify-between items-center shadow-sm select-none">
        <div className="flex gap-2 sm:gap-4 lg:gap-6 items-center min-w-0">
          <h1 className="text-lg sm:text-xl font-bold tracking-wide cursor-default">Prysmic</h1>
          {/* Inline links: desktop / tablet only — phones use the bottom tab bar. */}
          <div className="hidden sm:flex gap-2 sm:gap-4 lg:gap-6 items-center">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`text-xs sm:text-sm hover:text-cyan-300 transition whitespace-nowrap ${
                  isActive(item.href) && !item.disabled ? "text-cyan-300" : "text-slate-300"
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
            aria-label="Log out"
            className="tap-target flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 px-2 sm:px-3 py-1 rounded-md border border-white/10 text-xs sm:text-sm"
          >
            <LogOut className="h-4 w-4 sm:hidden" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="app-main relative z-10">
        {children}
      </main>

      {/* Native-style Bottom Tab Bar (mobile only) */}
      <nav
        className="app-bottom-nav sm:hidden fixed bottom-0 left-0 right-0 z-50 backdrop-blur-lg bg-[#0b0c0f]/80 border-t border-white/10 flex items-stretch select-none"
        aria-label="Primary"
      >
        {bottomNavItems.map((item) => {
          const Icon = item.icon!;
          const active = isActive(item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              className="relative flex-1 flex flex-col items-center justify-center gap-0.5 pt-1.5"
            >
              {active && (
                <motion.span
                  layoutId="bottomNavActive"
                  className="absolute top-0 h-0.5 w-8 rounded-full bg-cyan-300 shadow-[0_0_8px_rgba(103,232,249,0.7)]"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <motion.div
                whileTap={{ scale: 0.85 }}
                className="flex flex-col items-center justify-center gap-0.5"
              >
                <Icon
                  className={`h-5 w-5 transition-colors ${
                    active ? "text-cyan-300" : "text-slate-400"
                  }`}
                />
                <span
                  className={`text-[10px] font-medium tracking-wide transition-colors ${
                    active ? "text-cyan-300" : "text-slate-400"
                  }`}
                >
                  {item.label}
                </span>
              </motion.div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
