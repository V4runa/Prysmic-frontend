import Link from "next/link";
import type { Metadata } from "next";
import { FuturePricing } from "@/marketing/components/FuturePricing";
import { btnPrimary, kickerClass } from "@/marketing/site";

export const metadata: Metadata = {
  title: "Early access",
  description:
    "Prysmic is in early access. Pricing has not been decided, and no plans or prices are listed.",
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  return (
    <article className="px-5 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <p className={kickerClass}>Early access</p>
        <h1 className="font-display mt-4 text-5xl font-medium leading-tight text-slate-50 sm:text-6xl">
          Come in before a price exists.
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-slate-300">
          Pricing is not decided. This page will not invent a number, a tier, or a limit to make the decision look finished. Early access is the invitation: make an account and use the rooms.
        </p>
        <div className="mt-8">
          <Link href="/signup" className={btnPrimary}>
            Begin
          </Link>
        </div>
        <p className="mt-8 max-w-xl text-sm leading-relaxed text-slate-400">
          If you already have an account,{" "}
          <Link href="/login" className="text-cyan-200 underline decoration-cyan-300/30 underline-offset-4">
            enter
          </Link>
          . You will land in your notes, the same place sign-in has always opened.
        </p>
        <FuturePricing />
      </div>
    </article>
  );
}
