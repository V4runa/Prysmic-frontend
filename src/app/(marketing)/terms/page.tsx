import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms",
  description:
    "Draft terms for Prysmic. Your writing stays yours. This page needs review before it is final.",
  alternates: { canonical: "/terms" },
  robots: { index: false, follow: true },
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-2xl px-5 py-16 sm:px-8 sm:py-20">
      <p className="text-sm text-amber-200">
        Draft. This page needs review before it is treated as final. It is not legal advice.
      </p>
      <h1 className="mt-6 text-4xl font-semibold text-slate-50">Terms</h1>
      <div className="mt-8 space-y-4 text-base leading-relaxed text-slate-300">
        <p>
          Prysmic is a private notebook for notes, habit contracts, moods, tasks, and a calendar. Creating an account lets you use it. Early access is free. No price has been set. If that changes, these terms will be updated first, and you will be told before you are charged.
        </p>
        <p>
          You keep what you write. You allow Prysmic to store it and show it back to you, including in a JSON download you request. There are no feeds and no sharing with other people.
        </p>
        <p>
          You are responsible for the material you store. Do not use Prysmic to break the law or to keep material you have no right to keep.
        </p>
        <p>
          The service is offered as it stands during early access. It may change, and it may be unavailable at times. A JSON download is there so you can keep a copy of your writing. Attached file bytes are not part of that download.
        </p>
        <p>
          You can stop using Prysmic at any time, and you can delete your account from your Account page. Questions can go to{" "}
          <a href="mailto:hello@prysmic.me" className="text-cyan-200 underline decoration-cyan-300/30 underline-offset-4">
            hello@prysmic.me
          </a>
          .
        </p>
        <p className="text-sm text-slate-400">
          See also the{" "}
          <Link href="/privacy" className="text-cyan-200 underline decoration-cyan-300/30 underline-offset-4">
            privacy notice
          </Link>
          .
        </p>
      </div>
    </article>
  );
}
