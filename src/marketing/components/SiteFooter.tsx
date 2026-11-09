import Link from "next/link";
import { Mark } from "./Mark";

const links = [
  { href: "/login", label: "Sign in" },
  { href: "/signup", label: "Create account" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
        <div className="flex items-center gap-2 text-slate-100">
          <Mark className="h-5 w-5 text-cyan-200" />
          <span className="text-sm font-medium">Prysmic</span>
        </div>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400">
          A private notebook for notes, habits and moods, organized on one calendar.
        </p>
        <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-300">
          {links.map((link) => (
            <li key={link.label}>
              <Link href={link.href} className="hover:text-cyan-200">
                {link.label}
              </Link>
            </li>
          ))}
          <li>
            <a href="mailto:hello@prysmic.me" className="hover:text-cyan-200">
              Contact
            </a>
          </li>
        </ul>
        <p className="mt-8 text-xs uppercase tracking-widest text-slate-500">
          Created by a wanderer of code and thought
        </p>
        <p className="mt-3 text-xs text-slate-500">© 2026 Prysmic</p>
      </div>
    </footer>
  );
}
