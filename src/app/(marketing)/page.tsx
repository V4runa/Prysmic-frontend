import Link from "next/link";
import type { Metadata } from "next";
import { EnterIfSignedIn } from "@/marketing/components/EnterIfSignedIn";
import { HeroStage } from "@/marketing/components/HeroStage";
import { IllustrativeNotice } from "@/marketing/components/IllustrativeNotice";
import { LoopClip } from "@/marketing/components/LoopClip";
import { Shot } from "@/marketing/components/Shot";
import { moduleMap } from "@/marketing/modules";
import { btnGhost, btnPrimary, kickerClass, SITE_DESCRIPTION, SITE_URL } from "@/marketing/site";

export const metadata: Metadata = {
  title: "Prysmic",
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Prysmic",
  url: SITE_URL,
  description: SITE_DESCRIPTION,
};

const frame =
  "overflow-hidden rounded-2xl border border-white/10 bg-[#0c0e12] shadow-[0_24px_60px_-32px_rgba(0,0,0,0.85)]";

const days = [
  { name: "Mon", mark: "Clear", line: "Morning pages. The sentence I kept." },
  { name: "Tue", mark: "Threshold", line: "A note for what the room was doing." },
  { name: "Wed", mark: "River", line: "The color of the rain, and a task to revise it." },
  { name: "Thu", mark: "Letter", line: "Written in full, and not sent." },
  { name: "Fri", mark: "Held", line: "The evening sit. A margin, not a plan." },
  { name: "Sat", mark: "Walk", line: "The long way, placed on the day." },
  { name: "Sun", mark: "Practice", line: "On returning. The week is already the calendar." },
];

function RoomLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="mt-5 inline-flex text-sm text-cyan-200 underline decoration-cyan-300/30 underline-offset-4 hover:decoration-cyan-200"
    >
      {children}
    </Link>
  );
}

export default function HomePage() {
  const calendarClip = moduleMap.calendar.clip;

  return (
    <>
      <EnterIfSignedIn />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="overflow-x-clip px-5 pb-8 pt-14 sm:px-8 sm:pt-20 lg:pb-14">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-12">
          <div>
            <p className={kickerClass}>An interface for cognition</p>
            <h1 className="font-display mt-5 text-[clamp(3.25rem,6.4vw,5.75rem)] font-medium leading-[0.9] text-slate-50">
              Between
              <br />
              <span className="italic text-slate-100/95">the mind</span>
              <br />
              and the world.
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-slate-300">
              A place to set a moment down and come back to it. Notes, moods, contracts, and tasks share one calendar.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className={btnPrimary}>
                Begin
              </Link>
              <Link href="/login" className={btnGhost}>
                Enter
              </Link>
            </div>
          </div>
          <HeroStage />
        </div>
      </section>

      <section id="rooms" className="scroll-mt-20 overflow-x-clip px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-2 lg:gap-14">
          <div className="relative min-w-0 pb-8">
            <div className={frame}>
              <Shot
                src="/marketing/notes.webp"
                alt="Eight fictional notes, tagged dawn, draft, river, and correspondence."
                sizes="(min-width: 1024px) 560px, 100vw"
                className="aspect-[16/10]"
              />
            </div>
            <div className={`${frame} absolute -bottom-6 right-3 w-[58%] rotate-[2.5deg] sm:right-6`}>
              <Shot
                src="/marketing/tags.webp"
                alt="The tag codex: dawn, draft, threshold, river, correspondence, practice."
                sizes="280px"
                className="aspect-[16/9]"
              />
            </div>
          </div>
          <div className="pt-8 lg:pt-0">
            <p className={kickerClass}>Notes and tags</p>
            <h2 className="font-display mt-3 text-4xl font-medium text-slate-50 sm:text-5xl">
              A sentence, and the mark that brings you back.
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-slate-300">
              You write the moment and give it a tag you named. There is no text search. The way back is the word you chose.
            </p>
            <div className="flex flex-wrap gap-x-6">
              <RoomLink href="/modules/notes">Notes</RoomLink>
              <RoomLink href="/modules/tags">Tags</RoomLink>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <p className={kickerClass}>The calendar, at the center</p>
          <h2 className="font-display mt-3 max-w-3xl text-4xl font-medium text-slate-50 sm:text-5xl">
            The other rooms arrive on the day.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-300">
            A note, a mood, a contract, and a task are not four tools. Open the day and they are already in it.
          </p>

          <div className="mt-10 grid items-center gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.15fr)] lg:gap-10">
            <ul className="grid grid-cols-2 gap-3">
              {[
                ["/marketing/note.webp", "Note", "The sentence I kept"],
                ["/marketing/moods.webp", "Mood", "Clear, then Held"],
                ["/marketing/habit.webp", "Contract", "Morning pages"],
                ["/marketing/tasks.webp", "Task", "The river paragraph"],
              ].map(([src, label, text]) => (
                <li key={label} className={`${frame} p-2`}>
                  <Shot src={src} alt="" sizes="240px" className="aspect-[16/10] rounded-lg" />
                  <p className="px-1 pb-1 pt-2 text-[0.65rem] uppercase tracking-[0.18em] text-cyan-200/80">
                    {label}
                  </p>
                  <p className="px-1 pb-1 text-sm text-slate-200">{text}</p>
                </li>
              ))}
            </ul>
            <div>
              <div className={`${frame} relative aspect-[16/10]`}>
                <Shot
                  src="/marketing/calendar-day.webp"
                  alt="Monday the 9th in folio: morning pages kept, the mood Clear, and the note The sentence I kept."
                  sizes="(min-width: 1024px) 640px, 100vw"
                  fill
                />
              </div>
              <p className="mt-3 text-sm text-slate-400">
                The same Monday, opened. Illustrative entries from folio.
              </p>
            </div>
          </div>

          {calendarClip && (
            <div className="mt-8">
              <div className={`${frame} relative aspect-[16/10]`}>
                <LoopClip clip={calendarClip} sizes="(min-width: 1024px) 1100px, 100vw" />
              </div>
              <p className="mt-3 text-sm text-slate-400">{calendarClip.label}</p>
            </div>
          )}
          <RoomLink href="/modules/calendar">The calendar</RoomLink>
        </div>
      </section>

      <section className="px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-2 lg:gap-14">
          <div className="lg:order-2">
            <div className={frame}>
              <Shot
                src="/marketing/habits.webp"
                alt="Two fictional contracts, Evening sit and Morning pages, with their streaks."
                sizes="(min-width: 1024px) 560px, 100vw"
                className="aspect-[16/10]"
              />
            </div>
            <div className={`${frame} mt-3`}>
              <Shot
                src="/marketing/habit.webp"
                alt="The Morning pages contract, open to its intention and affirmation."
                sizes="(min-width: 1024px) 560px, 100vw"
                className="aspect-[16/9]"
              />
            </div>
          </div>
          <div>
            <p className={kickerClass}>Contracts</p>
            <h2 className="font-display mt-3 text-4xl font-medium text-slate-50 sm:text-5xl">
              A promise with a name, not a checkbox.
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-slate-300">
              Intention, affirmation, color, icon, and a rhythm. The streak is the trace of returning.
            </p>
            <RoomLink href="/modules/habits">Habit contracts</RoomLink>
          </div>
        </div>
      </section>

      <section className="px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-2 lg:gap-14">
          <div className={frame}>
            <Shot
              src="/marketing/moods.webp"
              alt="A mood timeline in folio: Clear, Held, and Tender across recent days."
              sizes="(min-width: 1024px) 560px, 100vw"
              className="aspect-[16/10]"
            />
          </div>
          <div>
            <p className={kickerClass}>Moods</p>
            <h2 className="font-display mt-3 text-4xl font-medium text-slate-50 sm:text-5xl">
              The weather of a day, named by you.
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-slate-300">
              Make the palette. Leave a short note, or none. The timeline keeps the noticing. It does not grade it.
            </p>
            <RoomLink href="/modules/moods">Moods</RoomLink>
          </div>
        </div>
      </section>

      <section className="px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-2 lg:gap-14">
          <div className={`${frame} lg:order-2`}>
            <Shot
              src="/marketing/tasks.webp"
              alt="A short fictional task list, with due days and priorities."
              sizes="(min-width: 1024px) 560px, 100vw"
              className="aspect-[16/10]"
            />
          </div>
          <div>
            <p className={kickerClass}>Tasks</p>
            <h2 className="font-display mt-3 text-4xl font-medium text-slate-50 sm:text-5xl">
              What is asking, given a day.
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-slate-300">
              A few things that want doing. They sit on the same calendar as the note and the mood.
            </p>
            <RoomLink href="/modules/tasks">Tasks</RoomLink>
          </div>
        </div>
      </section>

      <section className="px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <IllustrativeNotice compact />
          <h2 className="font-display mt-8 text-4xl font-medium text-slate-50 sm:text-5xl">
            One invented week, in the same rooms.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-300">
            A writer who does not exist, moving through folio. Not a customer, and not a result.
          </p>
          <ol className="mt-8 flex gap-3 overflow-x-auto pb-2">
            {days.map((day) => (
              <li
                key={day.name}
                className="w-44 shrink-0 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <p className="text-[0.65rem] uppercase tracking-[0.2em] text-cyan-200/80">
                  {day.name}
                </p>
                <p className="mt-2 font-display text-2xl text-slate-50">{day.mark}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{day.line}</p>
              </li>
            ))}
          </ol>
          <RoomLink href="/stories/a-week-of-pages">Read the week</RoomLink>
        </div>
      </section>

      <section className="border-t border-white/10 bg-white/[0.03]">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-14 sm:px-8 sm:py-16 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className={kickerClass}>Early access</p>
            <h2 className="font-display mt-3 max-w-xl text-4xl font-medium text-slate-50 sm:text-5xl">
              Come in. There is no price list yet.
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/signup" className={btnPrimary}>
              Begin
            </Link>
            <Link href="/pricing" className={btnGhost}>
              Early access
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
