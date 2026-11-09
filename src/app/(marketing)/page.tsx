import Link from "next/link";
import type { Metadata } from "next";
import { EnterIfSignedIn } from "@/marketing/components/EnterIfSignedIn";
import { Figure } from "@/marketing/components/Figure";
import { IllustrativeNotice } from "@/marketing/components/IllustrativeNotice";
import { Reveal } from "@/marketing/components/Reveal";
import {
  hingeAfter,
  hingeBefore,
  homeChapters,
  moduleMap,
} from "@/marketing/modules";
import { stories } from "@/marketing/stories";
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

export default function HomePage() {
  const calendar = moduleMap.calendar;

  return (
    <>
      <EnterIfSignedIn />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:pb-28 lg:pt-28">
        <div className="marketing-rise mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
          <div>
            <p className={kickerClass}>An interface for cognition</p>
            <h1 className="font-display mt-6 text-[clamp(3.5rem,8vw,7.25rem)] font-medium leading-[0.9] text-slate-50">
              Between
              <br />
              <span className="italic text-slate-100/95">the mind</span>
              <br />
              and the world.
            </h1>
          </div>
          <div className="marketing-rise marketing-rise-delay max-w-md lg:pb-3">
            <p className="text-lg leading-relaxed text-slate-300">
              Prysmic is a place to set a moment down and come back to it.
              Notes, moods, habit contracts, and tasks are one environment.
              They share a calendar, and the calendar is where a week becomes readable.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className={btnPrimary}>
                Begin
              </Link>
              <Link href="/login" className={btnGhost}>
                Enter
              </Link>
            </div>
            <p className="mt-6 text-sm text-slate-400">
              Early access is open.{" "}
              <Link href="/pricing" className="text-cyan-200/90 underline decoration-cyan-300/30 underline-offset-4">
                A price has not been chosen.
              </Link>
            </p>
          </div>
        </div>
      </section>

      <section id="rooms" className="scroll-mt-20 px-5 py-8 sm:px-8">
        <Reveal>
          <div className="mx-auto max-w-6xl">
            <p className={kickerClass}>The rooms</p>
            <h2 className="font-display mt-4 max-w-3xl text-4xl font-medium leading-tight text-slate-50 sm:text-5xl">
              Five quiet rooms, and the timeline that holds them.
            </h2>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-300">
              Nothing here is a separate tool you have to remember to open.
              What you write, notice, promise, and still need to do all land on the same days.
            </p>

            <div className="mt-12 border-t border-white/10">
              {hingeBefore.map((slug) => {
                const room = moduleMap[slug];
                return (
                  <Link
                    key={slug}
                    href={`/modules/${slug}`}
                    className="group grid gap-2 border-b border-white/10 py-6 sm:grid-cols-[10rem_1fr_auto] sm:items-baseline sm:gap-8"
                  >
                    <span className="text-[0.7rem] uppercase tracking-[0.22em] text-slate-500">
                      {room.kicker}
                    </span>
                    <span>
                      <span className="font-display text-3xl text-slate-100 group-hover:text-cyan-100">
                        {room.nav}
                      </span>
                      <span className="mt-1 block text-sm text-slate-400 sm:mt-0 sm:inline sm:pl-4">
                        {room.hinge}
                      </span>
                    </span>
                    <span className="hidden text-sm text-slate-500 sm:inline" aria-hidden>
                      →
                    </span>
                  </Link>
                );
              })}

              <Link
                href="/modules/calendar"
                className="group block border-b border-cyan-300/20 bg-white/[0.03] px-4 py-8 sm:px-8"
              >
                <span className="text-[0.7rem] uppercase tracking-[0.22em] text-cyan-200/80">
                  {calendar.kicker}
                </span>
                <span className="mt-3 block font-display text-4xl text-slate-50 group-hover:text-cyan-100 sm:text-5xl">
                  {calendar.title}
                </span>
                <span className="mt-3 block max-w-xl text-base leading-relaxed text-slate-300">
                  {calendar.hinge} Open a day and the other rooms are already inside it.
                </span>
              </Link>

              {hingeAfter.map((slug) => {
                const room = moduleMap[slug];
                return (
                  <Link
                    key={slug}
                    href={`/modules/${slug}`}
                    className="group grid gap-2 border-b border-white/10 py-6 sm:grid-cols-[10rem_1fr_auto] sm:items-baseline sm:gap-8"
                  >
                    <span className="text-[0.7rem] uppercase tracking-[0.22em] text-slate-500">
                      {room.kicker}
                    </span>
                    <span>
                      <span className="font-display text-3xl text-slate-100 group-hover:text-cyan-100">
                        {room.nav}
                      </span>
                      <span className="mt-1 block text-sm text-slate-400 sm:mt-0 sm:inline sm:pl-4">
                        {room.hinge}
                      </span>
                    </span>
                    <span className="hidden text-sm text-slate-500 sm:inline" aria-hidden>
                      →
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </Reveal>
      </section>

      <div className="mx-auto max-w-6xl px-5 pt-16 sm:px-8">
        <IllustrativeNotice />
      </div>

      {homeChapters.map((slug, index) => {
        const room = moduleMap[slug];
        const flip = index % 2 === 1;
        return (
          <section key={slug} className="px-5 py-16 sm:px-8 sm:py-24">
            <Reveal>
              <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
                <div className={flip ? "lg:order-2" : ""}>
                  <p className={kickerClass}>{room.kicker}</p>
                  <h2 className="font-display mt-4 text-4xl font-medium text-slate-50 sm:text-5xl">
                    {room.title}
                  </h2>
                  <p className="mt-5 text-base leading-relaxed text-slate-300 sm:text-lg">
                    {room.home}
                  </p>
                  <Link
                    href={`/modules/${slug}`}
                    className="mt-6 inline-flex text-sm text-cyan-200 underline decoration-cyan-300/30 underline-offset-4 hover:decoration-cyan-200"
                  >
                    Look closer
                  </Link>
                </div>
                <Figure figure={room.figure} priority={index === 0} />
              </div>
            </Reveal>
          </section>
        );
      })}

      <section className="px-5 py-16 sm:px-8 sm:py-24">
        <Reveal>
          <div className="mx-auto max-w-6xl">
            <p className={kickerClass}>How a week holds</p>
            <h2 className="font-display mt-4 max-w-3xl text-4xl font-medium leading-tight text-slate-50 sm:text-5xl">
              The rooms are easier to see inside a life. These lives are made up.
            </h2>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-300">
              Two weeks, written so you can watch a note, a mood, a contract, and a task share the same days. They are illustrations. They are not people we know, and they are not results.
            </p>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {stories.map((story) => (
                <Link
                  key={story.slug}
                  href={`/stories/${story.slug}`}
                  className="glass-card group rounded-2xl p-6 sm:p-8"
                >
                  <p className={kickerClass}>{story.kicker}</p>
                  <h3 className="font-display mt-4 text-3xl text-slate-50 group-hover:text-cyan-100">
                    {story.title}
                  </h3>
                  <p className="mt-4 text-sm leading-relaxed text-slate-300">
                    {story.dek}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      <section className="px-5 pb-24 pt-8 sm:px-8 sm:pb-32">
        <Reveal>
          <div className="mx-auto max-w-6xl border-t border-white/10 pt-16">
            <p className={kickerClass}>Early access</p>
            <h2 className="font-display mt-4 max-w-3xl text-4xl font-medium leading-tight text-slate-50 sm:text-6xl">
              Come in. There is no price list yet.
            </h2>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-300">
              The rooms are open. When a price is decided, it will be said plainly, on its own page. Until then, beginning is enough.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className={btnPrimary}>
                Begin
              </Link>
              <Link href="/pricing" className={btnGhost}>
                Early access
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
