import Link from "next/link";
import { Mark } from "./Mark";
import { btnPrimary, marketingShell } from "../site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07080c]/80 pl-[var(--safe-left)] pr-[var(--safe-right)] pt-[var(--safe-top)] backdrop-blur-lg">
      <div className={`${marketingShell} flex h-16 items-center justify-between gap-4 px-5 sm:px-8`}>
        <Link href="/" className="flex items-center gap-2 text-slate-100">
          <Mark className="h-5 w-5 text-cyan-200" />
          <span className="text-sm font-medium">Prysmic</span>
        </Link>
        <div className="flex items-center gap-3 sm:gap-5">
          <Link href="/login" className="text-sm text-slate-300 hover:text-cyan-200">
            Sign in
          </Link>
          <Link href="/signup" className={btnPrimary}>
            Create account
          </Link>
        </div>
      </div>
    </header>
  );
}
