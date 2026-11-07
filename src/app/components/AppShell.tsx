"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { syncPersonalCache } from "../lib/personalCache";
import { bumpSessionEpoch } from "../lib/sessionBoundary";
import {
  clearDraft,
  clearDraftIfOtherUser,
  draftHasWriting,
  noteDraftStorage,
  noteOwnerId,
  readDraft,
} from "../notes/noteDraft";
import {
  StickyNote,
  Tag as TagIcon,
  Flame,
  CheckSquare,
  Smile,
  CalendarDays,
  LogOut,
  type LucideIcon,
} from "lucide-react";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      syncPersonalCache(queryClient, null);
      return;
    }
    try {
      const decoded = JSON.parse(atob(token.split(".")[1]));
      setUsername(decoded.username || null);
      const owner = noteOwnerId(decoded.sub);
      syncPersonalCache(queryClient, owner);
      const storage = noteDraftStorage();
      if (storage && owner) clearDraftIfOtherUser(storage, owner);
    } catch {
      setUsername(null);
    }
  }, [queryClient]);

  const handleLogout = () => {
    const storage = noteDraftStorage();
    const draft = storage ? readDraft(storage) : null;
    if (
      draft &&
      draftHasWriting(draft) &&
      !window.confirm("Log out? Unsaved writing in this tab will be discarded.")
    ) {
      return;
    }
    bumpSessionEpoch();
    if (storage) clearDraft(storage);
    syncPersonalCache(queryClient, null);
    localStorage.removeItem("token");
    router.push("/login");
  };

  const navItems: {
    label: string;
    href: string;
    icon?: LucideIcon;
    disabled?: boolean;
    /** Kept off the mobile tab bar (5-icon ceiling) but shown in the header. */
    desktopOnly?: boolean;
  }[] = [
    { label: "Notes", href: "/notes", icon: StickyNote },
    { label: "Calendar", href: "/calendar", icon: CalendarDays },
    { label: "Habits", href: "/habits", icon: Flame },
    { label: "Tasks", href: "/tasks", icon: CheckSquare },
    { label: "Moods", href: "/moods", icon: Smile },
    // Tags is a supporting taxonomy reached from within Notes on mobile.
    { label: "Tags", href: "/tags", icon: TagIcon, desktopOnly: true },
    { label: "Coming Soon...", href: "#", disabled: true },
  ];

  // Bottom tab bar (mobile) only shows the real, phone-priority destinations.
  const bottomNavItems = navItems.filter(
    (item) => !item.disabled && !item.desktopOnly
  );

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-[100dvh] text-slate-100 font-sans relative overflow-hidden">
      {/* Scrim over the app-wide prism backdrop (rendered once in
          ClientShellWrapper). Darkens and vignettes the living prism so it
          recedes into ambience behind dense content while still breathing. */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-[#06070a]/55" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,7,10,0)_35%,rgba(6,7,10,0.72)_100%)]" />
      </div>

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
