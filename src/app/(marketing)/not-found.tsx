import Link from "next/link";
import { btnGhost, kickerClass } from "@/marketing/site";

export default function MarketingNotFound() {
  return (
    <div className="px-5 py-24 sm:px-8">
      <div className="mx-auto max-w-xl">
        <p className={kickerClass}>Missing</p>
        <h1 className="font-display mt-4 text-5xl text-slate-50">This page was not set down.</h1>
        <p className="mt-5 text-base leading-relaxed text-slate-300">
          The address does not match a public page. Drafts of the journal are not published, and they are not reachable from here.
        </p>
        <Link href="/" className={`${btnGhost} mt-8`}>
          Back to the threshold
        </Link>
      </div>
    </div>
  );
}
