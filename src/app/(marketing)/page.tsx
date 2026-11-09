import Link from "next/link";
import type { Metadata } from "next";
import { EnterIfSignedIn } from "@/marketing/components/EnterIfSignedIn";
import { LoopClip } from "@/marketing/components/LoopClip";
import { Shot } from "@/marketing/components/Shot";
import { ogImage } from "@/marketing/og";
import { btnGhost, btnPrimary, kickerClass, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "@/marketing/site";

export const metadata: Metadata = {
  title: { absolute: SITE_TITLE },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    locale: "en_US",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [ogImage],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [ogImage],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Prysmic",
  url: SITE_URL,
  description: SITE_DESCRIPTION,
};

const frame =
  "overflow-hidden rounded-xl border border-white/10 bg-[#0c0e12]";

const section = "mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-24";

const notesClip = {
  mp4: "/marketing/clips/notes.mp4",
  webm: "/marketing/clips/notes.webm",
  poster: "/marketing/clips/notes.jpg",
  label: "Choosing the novel tag filters the notes list.",
};

const habitClip = {
  mp4: "/marketing/clips/habit.mp4",
  webm: "/marketing/clips/habit.webm",
  poster: "/marketing/clips/habit.jpg",
  label: "Checking off the Evening pages contract.",
};

const calendarClip = {
  mp4: "/marketing/clips/calendar.mp4",
  webm: "/marketing/clips/calendar.webm",
  poster: "/marketing/clips/calendar.jpg",
  label: "Opening a day that holds a contract, a mood, a note, and a task.",
};

export default function HomePage() {
  return (
    <>
      <EnterIfSignedIn />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className={section}>
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <h1 className="text-4xl font-semibold leading-tight text-slate-50 sm:text-5xl">
              A calm place to keep your ideas and come back to them.
            </h1>
            <p className="mt-6 text-base leading-relaxed text-slate-300 sm:text-lg">
              Prysmic is a private notebook for creative work and reflective practice. Write notes and organize them with tags you name. Write your habits as short contracts with yourself and check them off. Log how each day felt. The calendar puts it all together, day by day.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className={btnPrimary}>
                Create account
              </Link>
              <Link href="/login" className={btnGhost}>
                Sign in
              </Link>
            </div>
            <p className="mt-4 text-sm text-slate-400">
              Free while Prysmic is in early access.
            </p>
          </div>
          <figure>
            <div className={frame}>
              <Shot
                src="/marketing/notes.webp"
                alt="The Notes page with the novel tag selected and the matching notes listed."
                sizes="(min-width: 1024px) 560px, 100vw"
                priority
                className="aspect-[16/10]"
              />
            </div>
            <figcaption className="mt-3 text-sm text-slate-400">
              The Notes page, filtered by one tag. Sample content.
            </figcaption>
          </figure>
        </div>
      </section>

      <section className={section}>
        <p className={kickerClass}>Notes and tags</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold text-slate-50 sm:text-4xl">
          Organize your notes in your own words.
        </h2>
        <div className="mt-6 max-w-2xl space-y-4 text-base leading-relaxed text-slate-300">
          <p>
            Notes are rich text, with headings, lists, checklists and links. You can attach images, PDFs or text files to any note.
          </p>
          <p>
            Each note can carry tags that you create and color. A tag might be a project, a recurring theme, or a dream log. Choose a tag and every note under it is in front of you.
          </p>
        </div>
        <figure className="mt-10">
          <div className={`${frame} relative aspect-[16/10]`}>
            <LoopClip clip={notesClip} sizes="(min-width: 1024px) 960px, 100vw" />
          </div>
          <figcaption className="mt-3 text-sm text-slate-400">{notesClip.label}</figcaption>
        </figure>
        <figure className="mt-8">
          <div className={frame}>
            <Shot
              src="/marketing/note.webp"
              alt="An open note titled Chapter 3: the train scene, with a heading, a paragraph, two tags, and an attached image."
              sizes="(min-width: 1024px) 960px, 100vw"
              className="aspect-[16/10]"
            />
          </div>
        </figure>
      </section>

      <section className={section}>
        <p className={kickerClass}>Habit contracts</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold text-slate-50 sm:text-4xl">
          Write your habits as contracts with yourself.
        </h2>
        <div className="mt-6 max-w-2xl space-y-4 text-base leading-relaxed text-slate-300">
          <p>
            A contract has a name, an intent that says why it matters to you, and an affirmation you want to keep in mind. Set it as daily, weekly or monthly, and pick a color and an icon.
          </p>
          <p>
            When you&apos;ve done it, check it off. Prysmic keeps your current streak and your longest one, and you can undo a check-in made by mistake.
          </p>
        </div>
        <figure className="mt-10">
          <div className={frame}>
            <Shot
              src="/marketing/habit.webp"
              alt="The Write 300 words contract, open to its daily frequency, intent, affirmation, and streak."
              sizes="(min-width: 1024px) 960px, 100vw"
              className="aspect-[16/10]"
            />
          </div>
        </figure>
        <figure className="mt-8">
          <div className={`${frame} relative aspect-[16/10]`}>
            <LoopClip clip={habitClip} sizes="(min-width: 1024px) 960px, 100vw" />
          </div>
          <figcaption className="mt-3 text-sm text-slate-400">{habitClip.label}</figcaption>
        </figure>
      </section>

      <section className={section}>
        <p className={kickerClass}>Moods and tasks</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold text-slate-50 sm:text-4xl">
          Note how the day felt and what still needs doing.
        </h2>
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-white/10 p-5 sm:p-6">
            <h3 className="text-lg font-semibold text-slate-50">Moods</h3>
            <p className="mt-3 text-base leading-relaxed text-slate-300">
              Log one mood a day from a set you make yourself, each with a name and an emoji. Add a short reflection if you want one. Your recent days appear as a timeline.
            </p>
            <div className={`${frame} mt-5`}>
              <Shot
                src="/marketing/moods.webp"
                alt="A mood timeline with Focused, Restless, and Calm."
                sizes="(min-width: 1024px) 480px, 100vw"
                className="aspect-[16/10]"
              />
            </div>
          </div>
          <div className="rounded-xl border border-white/10 p-5 sm:p-6">
            <h3 className="text-lg font-semibold text-slate-50">Tasks</h3>
            <p className="mt-3 text-base leading-relaxed text-slate-300">
              Add what needs doing with a priority and a due date. Each task appears on the calendar on its due date, and you can add one straight from any day.
            </p>
            <div className={`${frame} mt-5`}>
              <Shot
                src="/marketing/tasks.webp"
                alt="A task list with due dates, including a revision due today."
                sizes="(min-width: 1024px) 480px, 100vw"
                className="aspect-[16/10]"
              />
            </div>
          </div>
        </div>
      </section>

      <section className={section}>
        <p className={kickerClass}>Calendar</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold text-slate-50 sm:text-4xl">
          Everything you keep shows up on the calendar.
        </h2>
        <div className="mt-6 max-w-2xl space-y-4 text-base leading-relaxed text-slate-300">
          <p>
            Open any day to see what you wrote, which contracts you kept, how you felt and what was due. Switch between month, week and day views, and filter by type when you only want to see one kind of entry.
          </p>
          <p>
            You can also add your own events and link them to a note, a task or a habit. Over time the calendar becomes a record you can look back through by date.
          </p>
        </div>
        <figure className="mt-10">
          <div className={`${frame} relative aspect-[16/10]`}>
            <LoopClip clip={calendarClip} sizes="(min-width: 1024px) 1024px, 100vw" />
          </div>
          <figcaption className="mt-3 text-sm text-slate-400">{calendarClip.label}</figcaption>
        </figure>
      </section>

      <section className={section}>
        <p className={kickerClass}>Getting started</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold text-slate-50 sm:text-4xl">
          Start with one note.
        </h2>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-300">
          When you create an account, Prysmic adds a few sample notes, tags and contracts so you can see how things fit together. A Start Here note waits at the top of your Notes. Edit or delete the samples whenever you like.
        </p>
        <ol className="mt-8 max-w-2xl list-decimal space-y-2 pl-5 text-base leading-relaxed text-slate-300">
          <li>Write a note and give it a tag of your own.</li>
          <li>Write one contract and check it off.</li>
          <li>Open the calendar and look at the day.</li>
        </ol>
        <ul className="mt-8 max-w-2xl space-y-2 text-sm leading-relaxed text-slate-400">
          <li>Prysmic has no feeds, followers or sharing. What you write stays in your account.</li>
          <li>Download everything you&apos;ve written as a JSON file at any time.</li>
          <li>Delete your account and everything in it from your Account page.</li>
          <li>Prysmic runs in your browser, on a computer or a phone.</li>
        </ul>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link href="/signup" className={btnPrimary}>
            Create account
          </Link>
          <p className="text-sm text-slate-400">
            Already have an account?{" "}
            <Link href="/login" className="text-cyan-200 underline decoration-cyan-300/30 underline-offset-4">
              Sign in
            </Link>
          </p>
        </div>
        <p className="mt-4 text-sm text-slate-400">
          Free while Prysmic is in early access.
        </p>
      </section>
    </>
  );
}
