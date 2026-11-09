import Link from "next/link";
import type { Metadata } from "next";
import { modules } from "@/marketing/modules";
import { kickerClass } from "@/marketing/site";

export const metadata: Metadata = {
  title: "Rooms",
  description:
    "The rooms of Prysmic: notes, tags, habit contracts, moods, tasks, and the calendar that holds them on one timeline.",
  alternates: { canonical: "/modules" },
};

export default function ModulesIndexPage() {
  return (
    <article className="px-5 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <p className={kickerClass}>The rooms</p>
        <h1 className="font-display mt-4 text-5xl font-medium leading-tight text-slate-50 sm:text-6xl">
          One environment.
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-slate-300">
          Each room is a way of keeping something. The calendar is where they meet. Choose one to see it in use.
        </p>
        <ul className="mt-12 border-t border-white/10">
          {modules.map((module) => (
            <li key={module.slug} className="border-b border-white/10">
              <Link href={`/modules/${module.slug}`} className="group block py-6">
                <span className="text-[0.65rem] uppercase tracking-[0.22em] text-slate-500">
                  {module.kicker}
                </span>
                <span className="mt-2 block font-display text-3xl text-slate-50 group-hover:text-cyan-100">
                  {module.title}
                </span>
                <span className="mt-2 block text-sm leading-relaxed text-slate-400">
                  {module.deck}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
