"use client";

import Link from "next/link";
import { useState } from "react";
import { Mark } from "./Mark";
import { modules } from "../modules";
import { btnPrimary } from "../site";

const links = [
  { href: "/stories", label: "Stories" },
  { href: "/blog", label: "Journal" },
  { href: "/press", label: "Press" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07080c]/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-slate-100"
          onClick={close}
        >
          <Mark className="h-5 w-5 text-cyan-200" />
          <span className="text-sm font-medium tracking-[0.22em] uppercase">
            Prysmic
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-slate-300 md:flex" aria-label="Primary">
          <details className="relative">
            <summary className="cursor-pointer list-none text-slate-300 hover:text-cyan-200 [&::-webkit-details-marker]:hidden">
              Rooms
            </summary>
            <div className="absolute left-1/2 top-full z-10 mt-3 w-56 -translate-x-1/2 rounded-xl border border-white/10 bg-[#0c0e12]/95 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl">
              {modules.map((module) => (
                <Link
                  key={module.slug}
                  href={`/modules/${module.slug}`}
                  className="block rounded-lg px-3 py-2 text-slate-200 hover:bg-white/5 hover:text-cyan-100"
                >
                  {module.nav}
                </Link>
              ))}
            </div>
          </details>
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-cyan-200">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <Link href="/login" className="text-sm text-slate-300 hover:text-cyan-200">
            Enter
          </Link>
          <Link href="/signup" className={btnPrimary}>
            Begin
          </Link>
        </div>

        <button
          type="button"
          className="tap-target inline-flex items-center justify-center rounded-md border border-white/10 px-3 text-sm text-slate-200 md:hidden"
          aria-expanded={open}
          aria-controls="marketing-menu"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {open && (
        <nav
          id="marketing-menu"
          className="border-t border-white/10 bg-[#07080c] px-5 py-4 md:hidden"
          aria-label="Mobile"
        >
          <p className="text-[0.65rem] uppercase tracking-[0.22em] text-slate-500">
            Rooms
          </p>
          <ul className="mt-2 space-y-1">
            {modules.map((module) => (
              <li key={module.slug}>
                <Link
                  href={`/modules/${module.slug}`}
                  onClick={close}
                  className="block py-2 text-slate-200"
                >
                  {module.nav}
                </Link>
              </li>
            ))}
          </ul>
          <ul className="mt-4 space-y-1 border-t border-white/10 pt-3">
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} onClick={close} className="block py-2 text-slate-200">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-3">
            <Link href="/login" onClick={close} className="tap-target inline-flex flex-1 items-center justify-center rounded-md border border-white/10 text-sm text-slate-100">
              Enter
            </Link>
            <Link href="/signup" onClick={close} className={`${btnPrimary} flex-1`}>
              Begin
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
