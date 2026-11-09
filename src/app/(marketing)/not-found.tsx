import Link from "next/link";
import { btnGhost } from "@/marketing/site";

export default function MarketingNotFound() {
  return (
    <div className="mx-auto max-w-xl px-5 py-24 sm:px-8">
      <h1 className="text-3xl font-semibold text-slate-50">Page not found</h1>
      <p className="mt-4 text-base leading-relaxed text-slate-300">
        That address is not a page on this site.
      </p>
      <Link href="/" className={`${btnGhost} mt-8`}>
        Back to Prysmic
      </Link>
    </div>
  );
}
