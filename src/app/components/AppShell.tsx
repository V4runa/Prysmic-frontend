"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import EmailVerificationPrompt, { syncVerificationProfile } from "./EmailVerificationPrompt";
import UserAvatar from "./UserAvatar";
import { readSessionClaims, useSessionIdentity } from "../hooks/useAuth";
import { apiFetch } from "../hooks/useApi";
import { readSelf } from "../lib/accountProfile";
import { requestLogout } from "../lib/logout";
import { syncPersonalCache } from "../lib/personalCache";
import { usePreferences } from "../hooks/usePreferences";
import { publishSessionProfile } from "../lib/sessionIdentity";
import {
  clearDraftIfOtherUser,
  noteDraftStorage,
  noteOwnerId,
} from "../notes/noteDraft";
import {
  StickyNote,
  Tag as TagIcon,
  Flame,
  CheckSquare,
  Smile,
  CalendarDays,
  LogOut,
  Settings,
  type LucideIcon,
} from "lucide-react";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { username } = useSessionIdentity();
  const { avatar } = usePreferences();

  useEffect(() => {
    const claims = readSessionClaims();
    if (!claims) {
      syncPersonalCache(queryClient, null);
      return;
    }
    const owner = noteOwnerId(claims.userId);
    syncPersonalCache(queryClient, owner);
    const storage = noteDraftStorage();
    if (storage && owner) clearDraftIfOtherUser(storage, owner);
  }, [queryClient, username]);

  useEffect(() => {
    const claims = readSessionClaims();
    if (!claims) return;
    let cancelled = false;
    apiFetch<unknown>("/users")
      .then((body) => {
        if (cancelled) return;
        const me = readSelf(body, claims.userId);
        if (!me) return;
        publishSessionProfile({
          userId: me.id,
          username: me.username,
          email: me.email,
          emailVerified: me.emailVerified,
        });
        syncVerificationProfile({ email: me.email, emailVerified: me.emailVerified });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = () => {
    requestLogout({ queryClient, navigate: (href) => router.push(href) });
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
  const settingsActive = isActive("/settings") || isActive("/account");

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
          <span className="min-w-0 truncate italic text-slate-400">
            {username ? `Wandering as ${username}` : "Account"}
          </span>
          <Link
            href="/settings"
            aria-label="Settings"
            aria-current={settingsActive ? "page" : undefined}
            className={`tap-target inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border px-2 py-1 text-xs sm:px-3 sm:text-sm ${
              settingsActive
                ? "border-cyan-300/40 bg-white/15 text-cyan-50"
                : "border-white/10 bg-white/10 text-slate-100 hover:bg-white/20"
            }`}
          >
            <UserAvatar username={username} avatar={avatar} />
            <Settings className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Settings</span>
          </Link>
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
        <EmailVerificationPrompt />
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
