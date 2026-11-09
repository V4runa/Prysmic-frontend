import type { Metadata } from "next";
import Link from "next/link";
import { DraftBanner } from "@/marketing/components/DraftBanner";
import { kickerClass } from "@/marketing/site";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "Draft privacy notice for Prysmic, a personal journaling app. Needs legal review before launch. Not legal advice.",
  alternates: { canonical: "/privacy" },
  robots: { index: false, follow: true },
};

export default function PrivacyPage() {
  return (
    <>
      <DraftBanner>
        This privacy notice is a working draft for a personal journaling app. It is not legal advice, it has not been reviewed by a lawyer, and it must not be treated as the live policy until Eddy replaces the placeholders and approves it.
      </DraftBanner>
      <article className="px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-2xl space-y-6 text-base leading-relaxed text-slate-300">
          <p className={kickerClass}>Privacy</p>
          <h1 className="font-display text-5xl font-medium text-slate-50">Privacy notice</h1>
          <p className="text-sm text-slate-400">Draft prepared November 2026. Needs review before launch.</p>

          <h2 className="font-display pt-4 text-3xl text-slate-50">Who this is from</h2>
          <p>
            Prysmic is a personal journaling environment: notes, tags, habit contracts, moods, tasks, and a calendar that gathers them. The operator&apos;s legal name, address, and contact email are not filled in yet.{" "}
            <span className="text-amber-200">Needs Eddy&apos;s legal name, postal contact, and a real email before launch.</span>
          </p>

          <h2 className="font-display pt-4 text-3xl text-slate-50">What you keep here is yours</h2>
          <p>
            The words, moods, contracts, and tasks you write are your content. Prysmic stores them so it can show them back to you. The operator does not sell personal data, does not sell your writing, and does not run advertising against it. This draft does not grant the operator any right to publish your journal or to use it to train models.
          </p>

          <h2 className="font-display pt-4 text-3xl text-slate-50">What is stored</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Account: username, email address, and a password hash. The password itself is not stored in a form the operator can read.</li>
            <li>Notes: title, HTML content, pin and archive flags, and timestamps. Tags you create, and which notes or tasks they are attached to.</li>
            <li>Habit contracts: name, description, intention, affirmation, color, icon, frequency, and the dates you check in.</li>
            <li>Moods: the names, emoji, and colors in your palette, and the mood you record for a day, including an optional short note and whether it was added later.</li>
            <li>Tasks: title, description, priority, due day, completion, and archive state.</li>
            <li>Calendar events you create: title, description, dates, times, color, place, and recurrence.</li>
            <li>Attachments on a note: the file itself, plus the filename, the type, the size, and when it was added.</li>
            <li>A session token, kept in the browser&apos;s local storage rather than a cookie. It expires. Signing out removes it from that browser.</li>
          </ul>

          <h2 className="font-display pt-4 text-3xl text-slate-50">Export</h2>
          <p>
            An authenticated account export exists as JSON. It includes your notes (as HTML and as plain text), tags, tasks, habit contracts and their check-ins, moods, mood options, and calendar events. Attachment files are not inside that JSON. Their filename, type, and size are. The export is a snapshot for you. It is not a file the server imports back. Passwords and session tokens are not included.
          </p>
          <p className="text-amber-200">
            Needs Eddy: the export is implemented on the API. This frontend does not yet show a button for it. Say, in the final notice, exactly how a person downloads it.
          </p>

          <h2 className="font-display pt-4 text-3xl text-slate-50">Who else sees it</h2>
          <p>
            The public site does not load a tracking script. A slot exists to add a privacy-respecting analytics tool later. It is empty, and it should stay empty until the provider is named in this notice.
          </p>
          <p>
            The site and the app are hosted so they can run. The host processes the data needed to store your account and serve the pages.{" "}
            <span className="text-amber-200">Needs Eddy: name the hosts (the site is deployed on Vercel; the API host should be named here) and any subprocessors before launch.</span>
          </p>
          <p>
            Prysmic does not sell data to data brokers. This draft does not authorize sharing your journal with other people. If a legal demand arrives, the operator may have to respond to it. That possibility should be reviewed, not decorated.
          </p>

          <h2 className="font-display pt-4 text-3xl text-slate-50">How long it stays</h2>
          <p>
            Content stays until you delete it or delete the account. Deleting an account removes the account. Notes, tags, tasks, habits, moods, calendar events, and attachments are stored against that account and are removed with it where the database is set to cascade.{" "}
            <span className="text-amber-200">Needs Eddy: confirm that account deletion is reachable by a person in the product, not only by the API, and describe the steps.</span>
          </p>

          <h2 className="font-display pt-4 text-3xl text-slate-50">Children</h2>
          <p>
            Prysmic is not made for children.{" "}
            <span className="text-amber-200">Needs Eddy: the age threshold for your jurisdiction, and whether accounts under that age will be refused.</span>
          </p>

          <h2 className="font-display pt-4 text-3xl text-slate-50">Your requests</h2>
          <p>
            You can ask to see, correct, export, or delete what is held about you. Until a contact address is published, there is no monitored inbox for those requests.{" "}
            <span className="text-amber-200">Needs Eddy: the address people should write to, and the regions whose privacy rights you intend to honor by name (for example GDPR or CCPA) after counsel reviews them.</span>
          </p>

          <p className="pt-4 text-sm text-slate-400">
            This page is a draft. It is not a contract and not legal advice. See also the{" "}
            <Link href="/terms" className="text-cyan-200 underline decoration-cyan-300/30 underline-offset-4">
              draft terms
            </Link>
            .
          </p>
        </div>
      </article>
    </>
  );
}
