import type { Metadata } from "next";
import Link from "next/link";
import { IllustrativeNotice } from "@/marketing/components/IllustrativeNotice";
import { kickerClass, SITE_DESCRIPTION } from "@/marketing/site";

export const metadata: Metadata = {
  title: "Press",
  description:
    "Boilerplate, logo, and product images for Prysmic. Contact details are not final.",
  alternates: { canonical: "/press" },
};

const shots = [
  ["Month", "/marketing/calendar.webp"],
  ["A day", "/marketing/calendar-day.webp"],
  ["Notes", "/marketing/notes.webp"],
  ["A note", "/marketing/note.webp"],
  ["Tags", "/marketing/tags.webp"],
  ["Contracts", "/marketing/habits.webp"],
  ["A contract", "/marketing/habit.webp"],
  ["Moods", "/marketing/moods.webp"],
  ["Mood palette", "/marketing/moods-palette.webp"],
  ["Tasks", "/marketing/tasks.webp"],
];

export default function PressPage() {
  return (
    <article className="px-5 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <p className={kickerClass}>Press</p>
        <h1 className="font-display mt-4 text-5xl font-medium leading-tight text-slate-50 sm:text-6xl">
          A short kit.
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-slate-300">
          Logos, a description you can quote, and pictures of the product. The pictures are of a fictional workspace made for this site.
        </p>

        <section className="mt-12 rounded-2xl border border-amber-300/30 bg-amber-400/10 p-5 sm:p-6">
          <p className="text-[0.65rem] uppercase tracking-[0.18em] text-amber-200">
            Needs Eddy before launch
          </p>
          <h2 className="font-display mt-3 text-3xl text-amber-50">Contact</h2>
          <p className="mt-3 text-sm leading-relaxed text-amber-100">
            There is no confirmed press contact. Do not publish a guessed address. Replace this block with Eddy&apos;s name, the email that should receive mail, and any handle that is actually his.
          </p>
          <p className="mt-4 font-mono text-sm text-amber-200/80">
            press@prysmic.me — placeholder, unconfirmed, do not use
          </p>
        </section>

        <section className="mt-14">
          <h2 className="font-display text-3xl text-slate-50">Boilerplate</h2>
          <p className="mt-4 text-base leading-relaxed text-slate-300">{SITE_DESCRIPTION}</p>
          <p className="mt-4 text-base leading-relaxed text-slate-300">
            It is made for people who write, journal, and keep a reflective practice. It is not a productivity suite and not a copy of a second-brain system. Tags, which you create, are how you return to a note. There is no text search.
          </p>
          <p className="mt-4 text-sm text-slate-500">
            Short form: Prysmic is an interface for your cognition — notes, habit contracts, moods, and tasks on one calendar.
          </p>
        </section>

        <section className="mt-14">
          <h2 className="font-display text-3xl text-slate-50">Name and address</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            <li>Name: Prysmic. Capital P, the rest lowercase.</li>
            <li>Site: https://www.prysmic.me</li>
            <li>The wordmark is set in Inter, the same type as the product. The crystal mark is a drawing of the prism, not a photograph of a customer.</li>
          </ul>
          <ul className="mt-6 space-y-2 text-sm">
            <li><a className="text-cyan-200 underline decoration-cyan-300/30 underline-offset-4" href="/press/mark.svg" download>Crystal mark, SVG</a></li>
            <li><a className="text-cyan-200 underline decoration-cyan-300/30 underline-offset-4" href="/press/wordmark.svg" download>Wordmark, SVG</a></li>
            <li><a className="text-cyan-200 underline decoration-cyan-300/30 underline-offset-4" href="/prism-hero.png" download>Prism painting, PNG</a></li>
          </ul>
        </section>

        <section className="mt-14">
          <h2 className="font-display text-3xl text-slate-50">Product pictures</h2>
          <div className="mt-4">
            <IllustrativeNotice compact />
          </div>
          <ul className="mt-6 space-y-2 text-sm">
            {shots.map(([label, href]) => (
              <li key={href}>
                <a className="text-cyan-200 underline decoration-cyan-300/30 underline-offset-4" href={href} download>
                  {label}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-slate-400">
            More of the site is in the <Link href="/stories" className="text-cyan-200 underline decoration-cyan-300/30 underline-offset-4">illustrative stories</Link>. Do not describe them as customer stories.
          </p>
        </section>
      </div>
    </article>
  );
}
