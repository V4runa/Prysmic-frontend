import Link from "next/link";
import { Mark } from "./Mark";
import { modules } from "../modules";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2 text-slate-100">
            <Mark className="h-5 w-5 text-cyan-200" />
            <span className="text-sm tracking-[0.22em] uppercase">Prysmic</span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
            An interface for your cognition. A place between the mind and the world.
          </p>
          <p className="mt-6 text-xs uppercase tracking-[0.18em] text-slate-500">
            Created by a wanderer of code and thought
          </p>
        </div>

        <div>
          <p className="text-[0.65rem] uppercase tracking-[0.22em] text-slate-500">
            Rooms
          </p>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            {modules.map((module) => (
              <li key={module.slug}>
                <Link href={`/modules/${module.slug}`} className="hover:text-cyan-200">
                  {module.nav}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-[0.65rem] uppercase tracking-[0.22em] text-slate-500">
            Site
          </p>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            <li><Link className="hover:text-cyan-200" href="/stories">Stories</Link></li>
            <li><Link className="hover:text-cyan-200" href="/blog">Journal</Link></li>
            <li><Link className="hover:text-cyan-200" href="/press">Press</Link></li>
            <li><Link className="hover:text-cyan-200" href="/pricing">Early access</Link></li>
            <li><Link className="hover:text-cyan-200" href="/privacy">Privacy</Link></li>
            <li><Link className="hover:text-cyan-200" href="/terms">Terms</Link></li>
            <li><Link className="hover:text-cyan-200" href="/login">Enter</Link></li>
            <li><Link className="hover:text-cyan-200" href="/signup">Begin</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-5 py-5 text-xs leading-relaxed text-slate-500 sm:px-8">
          Press contact is not set yet. See the press page before launch. Privacy and terms are drafts and need review.
        </p>
      </div>
    </footer>
  );
}
