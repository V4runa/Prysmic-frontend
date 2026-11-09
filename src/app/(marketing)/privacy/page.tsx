import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "Draft privacy notice for Prysmic. Your writing stays in your account. This page needs review before it is final.",
  alternates: { canonical: "/privacy" },
  robots: { index: false, follow: true },
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl px-5 py-16 sm:px-8 sm:py-20">
      <p className="text-sm text-amber-200">
        Draft. This page needs review before it is treated as final. It is not legal advice.
      </p>
      <h1 className="mt-6 text-4xl font-semibold text-slate-50">Privacy</h1>
      <div className="mt-8 space-y-4 text-base leading-relaxed text-slate-300">
        <p>
          Prysmic is a private notebook. There are no feeds, followers or sharing. What you write stays in your account.
        </p>
        <p>
          We store the account you create (a username, an email address, and a password hash), and the notes, tags, files, habit contracts, check-ins, moods, tasks, and calendar events you add.
        </p>
        <p>
          Your email address is used only to send account messages, through our email provider. It is not used for marketing.
        </p>
        <p>
          You can download what you have written as a JSON file. The file includes your notes, tags, tasks, contracts, check-ins, moods, and calendar events. Attached files are listed by name, type, and size. The file bytes themselves are not included in that download.
        </p>
        <p>
          You can delete your account from your Account page. That permanently deletes your notes, tags, habits, tasks, and moods, and it cannot be undone.
        </p>
        <p>
          This site uses Vercel Web Analytics. It is cookieless. It counts anonymous page visits on the public site only. When you create an account, that is counted too, with none of your details attached. It does not see what you write.
        </p>
        <p>
          Error reports are sent to Sentry for diagnostics only, and they do not include your notes, tasks, moods, email address, or password.
        </p>
        <p>
          Questions can go to{" "}
          <a href="mailto:hello@prysmic.me" className="text-cyan-200 underline decoration-cyan-300/30 underline-offset-4">
            hello@prysmic.me
          </a>
          .
        </p>
        <p className="text-sm text-slate-400">
          See also the{" "}
          <Link href="/terms" className="text-cyan-200 underline decoration-cyan-300/30 underline-offset-4">
            terms
          </Link>
          .
        </p>
      </div>
    </article>
  );
}
