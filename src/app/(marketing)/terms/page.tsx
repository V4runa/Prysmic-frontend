import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms for using Prysmic. Your writing stays yours, early access is free, and you can delete your account at any time.",
  alternates: { canonical: "/terms" },
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

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-2xl px-5 py-16 sm:px-8 sm:py-20">
      <h1 className="text-4xl font-semibold text-slate-50">Terms of Service</h1>
      <p className="mt-3 text-sm text-slate-400">Last updated: November 9, 2026</p>
      <div className="mt-8 space-y-8 text-base leading-relaxed text-slate-300">
        <p>
          {`These terms are an agreement between you and Eduardo Martin Gargani ("we"), who runs Prysmic. By creating an account, you agree to them.`}
        </p>

        <Section title="Who can use Prysmic">
          <p>
            You must be at least 13 years old, and old enough to agree to these terms where you live.
          </p>
        </Section>

        <Section title="Your account">
          <p>
            {`Keep your password private. You are responsible for activity on your account. If you think someone else has access, reset your password and tell us at `}
            <Mail />
            {`. We can't recover writing you've deleted.`}
          </p>
        </Section>

        <Section title="Your content">
          <p>
            {`What you write belongs to you. You give us permission to store, process and display it only so Prysmic can work for you, including backups and the JSON download you request. We don't claim ownership, share it, or use it for any other purpose. That permission ends when you delete the content or your account. Copies in backups are removed within 14 days.`}
          </p>
        </Section>

        <Section title="Acceptable use">
          <p>
            {`Don't use Prysmic to break the law, to store material you have no right to keep, or to store malware. Don't try to reach other people's accounts or data, overload or probe the service, get around its limits, or use automated means to create accounts.`}
          </p>
        </Section>

        <Section title="Early access">
          <p>
            {`Prysmic is in early access and is free. Features may change, and the service may sometimes be unavailable. We back up data nightly, but we can't promise it will never be lost, so please download a copy of anything important.`}
          </p>
        </Section>

        <Section title="Paid plans">
          <p>
            No price has been set. If we introduce paid plans, we will update these terms and tell you before any charge. Nothing will be charged without your explicit agreement. Accounts created during early access will keep free access to the features they had during early access.
          </p>
        </Section>

        <Section title="Ending your use">
          <p>
            {`You can stop using Prysmic and delete your account at any time from your Account page. We may suspend or close an account that seriously or repeatedly breaks these terms. Where we reasonably can, we'll give you notice and a chance to download your data first. If we ever shut Prysmic down, we will give at least 30 days' notice so you can export your data.`}
          </p>
        </Section>

        <Section title="Disclaimer">
          <p>
            {`Prysmic is provided "as is" and "as available", without warranties of any kind, express or implied, to the extent the law allows.`}
          </p>
        </Section>

        <Section title="Limitation of liability">
          <p>
            {`To the extent the law allows, we are not liable for indirect, incidental or consequential damages, or for loss of data, and our total liability for any claim is limited to the greater of the amount you paid us in the 12 months before the claim or US$50. Some places don't allow these limits, so they may not fully apply to you. Nothing here limits rights you have under consumer protection laws that cannot be waived.`}
          </p>
        </Section>

        <Section title="Changes to these terms">
          <p>
            We may update these terms. We will change the date above. For significant changes, we will tell you by email or in the app before they take effect. If you keep using Prysmic after that, you accept the new terms.
          </p>
        </Section>

        <Section title="Governing law">
          <p>
            These terms are governed by the laws of the State of Florida, USA, and disputes will be handled in the courts of Orange County, Florida, unless the law where you live requires otherwise.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            <Mail />
            {`. Our `}
            <Link href="/privacy" className={linkClass}>
              Privacy Policy
            </Link>
            {` explains how we handle your data.`}
          </p>
        </Section>
      </div>
    </article>
  );
}
