import type { Metadata } from "next";
import Link from "next/link";
import { DraftBanner } from "@/marketing/components/DraftBanner";
import { kickerClass } from "@/marketing/site";

export const metadata: Metadata = {
  title: "Terms",
  description:
    "Draft terms for Prysmic. Needs legal review before launch. Not legal advice. Pricing is not set.",
  alternates: { canonical: "/terms" },
  robots: { index: false, follow: true },
};

export default function TermsPage() {
  return (
    <>
      <DraftBanner>
        These terms are a working draft. They are not legal advice, they have not been reviewed by a lawyer, and they are not in force until Eddy approves a finished version.
      </DraftBanner>
      <article className="px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-2xl space-y-6 text-base leading-relaxed text-slate-300">
          <p className={kickerClass}>Terms</p>
          <h1 className="font-display text-5xl font-medium text-slate-50">Terms of use</h1>
          <p className="text-sm text-slate-400">Draft prepared November 2026. Needs review before launch.</p>

          <h2 className="font-display pt-4 text-3xl text-slate-50">The service</h2>
          <p>
            Prysmic is an interface for your own cognition: a place to keep notes, tags, habit contracts, moods, tasks, and a calendar. Early access is open. Creating an account means you can use those rooms. It does not mean a paid plan exists.
          </p>

          <h2 className="font-display pt-4 text-3xl text-slate-50">Your content stays yours</h2>
          <p>
            You keep the rights to what you write. You give the operator only the permission needed to host that content and show it back to you, including in an export you request. That permission ends when the content or the account is deleted, except for copies that must be kept briefly in ordinary backups.{" "}
            <span className="text-amber-200">Needs Eddy: how long backups actually live, once you know.</span>
          </p>
          <p>
            You are responsible for what you store. Do not use Prysmic to break the law, to harm someone, or to upload material you have no right to keep.
          </p>

          <h2 className="font-display pt-4 text-3xl text-slate-50">Your account</h2>
          <p>
            You need an email, a username, and a password. Keep the password to yourself. The session lives in the browser you signed in with. You can sign out. Account deletion exists on the service and removes the account and the records tied to it.{" "}
            <span className="text-amber-200">Needs Eddy: describe the in-product steps, once a person can start them without using the API directly.</span>
          </p>

          <h2 className="font-display pt-4 text-3xl text-slate-50">Price</h2>
          <p>
            No price, tier, or limit has been set. This draft does not create a subscription. If a price is introduced later, these terms have to be updated and people have to be told before they are charged. Nothing on the site should be read as a promise that early access stays free, or that it becomes paid. That decision is open.
          </p>

          <h2 className="font-display pt-4 text-3xl text-slate-50">The service can change, and it can fail</h2>
          <p>
            Early access is offered as it stands. Rooms may change. The service may be unavailable. To the extent the law allows, the operator does not promise that Prysmic will be error-free or that a journal kept here is a substitute for your own copies. Export exists so you can take a JSON snapshot. Attachment file bytes are not in that snapshot.{" "}
            <span className="text-amber-200">Needs Eddy: any warranty or liability wording your counsel wants, and the governing law and venue. Do not guess a country.</span>
          </p>

          <h2 className="font-display pt-4 text-3xl text-slate-50">Ending</h2>
          <p>
            You can stop using Prysmic and delete the account. The operator may suspend an account that is used to harm others or to abuse the service. A finished version of these terms should say how that notice is given.
          </p>

          <p className="pt-4 text-sm text-slate-400">
            This page is a draft. It is not legal advice. The{" "}
            <Link href="/privacy" className="text-cyan-200 underline decoration-cyan-300/30 underline-offset-4">
              privacy draft
            </Link>{" "}
            describes what is stored.
          </p>
        </div>
      </article>
    </>
  );
}
