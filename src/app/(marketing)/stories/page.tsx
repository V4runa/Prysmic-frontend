import Link from "next/link";
import type { Metadata } from "next";
import { IllustrativeNotice } from "@/marketing/components/IllustrativeNotice";
import { stories } from "@/marketing/stories";
import { kickerClass } from "@/marketing/site";

export const metadata: Metadata = {
  title: "Stories",
  description:
    "Illustrative weeks showing how a writer or a contemplative practice might move through Prysmic. Fiction, not testimonials.",
  alternates: { canonical: "/stories" },
};

export default function StoriesPage() {
  return (
    <article className="px-5 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <p className={kickerClass}>Illustrative stories</p>
        <h1 className="font-display mt-4 text-5xl font-medium leading-tight text-slate-50 sm:text-6xl">
          Weeks that were never lived.
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-slate-300">
          These are written to show the rooms sharing a week. The people in them are not real. There are no customers quoted here, and no outcomes claimed.
        </p>
        <div className="mt-8">
          <IllustrativeNotice />
        </div>
        <ul className="mt-12 space-y-4">
          {stories.map((story) => (
            <li key={story.slug}>
              <Link
                href={`/stories/${story.slug}`}
                className="glass-card block rounded-2xl p-6 sm:p-8"
              >
                <p className={kickerClass}>{story.kicker}</p>
                <h2 className="font-display mt-3 text-4xl text-slate-50">{story.title}</h2>
                <p className="mt-4 text-sm leading-relaxed text-slate-300">{story.dek}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
