import type { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Prysmic handles your account and the notes, habits, tasks, moods, and calendar events you keep. Your writing is visible only to you.",
  alternates: { canonical: "/privacy" },
};

const linkClass =
  "text-cyan-200 underline decoration-cyan-300/30 underline-offset-4";

function Mail() {
  return (
    <a href="mailto:hello@prysmic.me" className={linkClass}>
      hello@prysmic.me
    </a>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-slate-50">{title}</h2>
      {children}
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl px-5 py-16 sm:px-8 sm:py-20">
      <h1 className="text-4xl font-semibold text-slate-50">Privacy Policy</h1>
      <p className="mt-3 text-sm text-slate-400">Last updated: November 9, 2026</p>
      <div className="mt-8 space-y-8 text-base leading-relaxed text-slate-300">
        <p>
          {`Prysmic is a private notebook for notes, habits, tasks, moods and a calendar. It is run by Eduardo Martin Gargani, Orlando, Florida, USA ("we"). There are no feeds, followers or sharing. What you write is visible only to you.`}
        </p>

        <Section title="What we collect">
          <ul className="list-disc space-y-2 pl-5 marker:text-slate-500">
            <li>
              Account details: a username, an email address, and a password stored only as a one-way hash (bcrypt). We never see or store your actual password.
            </li>
            <li>
              What you add: notes, tags, attached files, habit contracts and check-ins, tasks, moods and mood notes, custom moods, and calendar events.
            </li>
            <li>
              Technical data: our hosting providers keep standard server logs, which can include your IP address, browser type and the pages requested. We use IP addresses briefly to limit repeated password-reset and login-related requests. Those counters live in memory for about 15 minutes and are not stored.
            </li>
          </ul>
        </Section>

        <Section title="How we use it">
          <p>
            Only to run Prysmic: to store your writing and show it back to you, keep your account secure, send account emails, and find and fix errors. We do not sell your data, show ads, build advertising profiles, or use your content to train AI. Your content is not sent to any AI service.
          </p>
          <p>
            Mood entries and journal writing can be personal, and can touch on health. We treat all of it as private content. It is never analyzed for any purpose other than showing it to you.
          </p>
        </Section>

        <Section title="Emails">
          <p>
            We use your email address only for account messages: confirming your address, resetting your password, and confirming that your account was deleted. No marketing email is sent without your separate consent.
          </p>
        </Section>

        <Section title="Your browser">
          <p>
            {`Prysmic does not set cookies. To keep you signed in, the app stores a sign-in token in your browser's local storage. It expires after one hour. While you write, an unsaved copy of the note you're editing is kept in that browser tab so it isn't lost, and it's cleared when the tab closes or after 24 hours. Signing out removes the token.`}
          </p>
        </Section>

        <Section title="Analytics">
          <p>
            We use Vercel Web Analytics on the public pages only (the home page, sign-in, sign-up, password reset and email confirmation pages, and the privacy and terms pages). It uses no cookies, counts visits without identifying you, and never runs inside the app where you write. When an account is created, we count that as one sign-up with no details attached.
          </p>
        </Section>

        <Section title="Error reports">
          <p>
            When something breaks, a report goes to Sentry so we can fix it. A report includes the error type and technical trace, the page path, browser and device type, and timing information. On a sample of requests, we also send timing data to measure speed. Before anything leaves your browser or our server, we remove note, task and mood text, email addresses, passwords, sign-in tokens, request bodies, form input and IP addresses. The server only reports unexpected failures, not routine ones like a wrong password.
          </p>
        </Section>

        <Section title="Who processes data for us">
          <ul className="list-disc space-y-2 pl-5 marker:text-slate-500">
            <li>Vercel (website hosting and analytics), United States</li>
            <li>Railway (application server and database), United States (US West)</li>
            <li>Resend (sending account emails), United States</li>
            <li>Sentry (error reports), United States</li>
            <li>
              Namecheap (forwards mail sent to <Mail />)
            </li>
          </ul>
          <p>
            We also use an uptime service that only checks whether our public pages respond. It receives no user data. Each provider handles data only to deliver its service to us. Your data is stored and processed in the United States. If you are outside the US, using Prysmic means your data is transferred there.
          </p>
        </Section>

        <Section title="Security">
          <p>
            All traffic uses HTTPS. Passwords are hashed. Email links expire: 48 hours for confirmation, one hour for password reset. Only the operator has access to the production systems. No system is perfectly secure. If a breach affects your personal data, we will email you without undue delay and explain what happened and what we are doing about it.
          </p>
        </Section>

        <Section title="How long we keep data">
          <p>
            {`We keep your account and content until you delete them or delete your account. When you delete your account, everything it holds is removed from the live database right away: the account, notes, tags, attached files, habits and check-ins, tasks, moods, custom moods and calendar events. We also keep encrypted nightly backups for disaster recovery. Each backup is deleted after 14 days, so deleted data disappears from backups within 14 days. Expired email links are purged within about a day. Error reports and server logs are kept for the providers' standard retention periods and contain no note, task or mood content.`}
          </p>
        </Section>

        <Section title="Your choices and rights">
          <p>
            {`You can see and edit everything in the app, download it as a JSON file from your Account page, and delete your account there at any time. Attached files are listed in the download by name, type and size; download any file you want to keep from its note. Depending on where you live (for example under GDPR in the EU/UK or the CCPA in California), you may also have the right to access, correct, delete or move your data, to object to or restrict certain processing, and to complain to your local data protection authority. Email `}
            <Mail />
            {` to use any of these rights. We will answer within 30 days. We don't sell or share personal information as the CCPA defines those terms.`}
          </p>
        </Section>

        <Section title="Children">
          <p>
            Prysmic is not intended for anyone under 13. If you believe a child under that age has an account, email us and we will delete it.
          </p>
        </Section>

        <Section title="Changes">
          <p>
            If we change this policy, we will update the date above. For significant changes, we will tell you by email or in the app before they take effect.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Eduardo Martin Gargani, <Mail />
          </p>
        </Section>
      </div>
    </article>
  );
}
