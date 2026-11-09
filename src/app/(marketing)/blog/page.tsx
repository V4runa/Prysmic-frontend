import Link from "next/link";
import type { Metadata } from "next";
import { getPublishedPosts } from "@/marketing/journal";
import { kickerClass } from "@/marketing/site";

export const metadata: Metadata = {
  title: "Journal",
  description:
    "Writing from Prysmic. Nothing is published here yet. The journal is ready for when there is something to set down.",
  alternates: {
    canonical: "/blog",
    types: { "application/rss+xml": "/blog/rss.xml" },
  },
};

function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export default function JournalPage() {
  const posts = getPublishedPosts();

  return (
    <article className="px-5 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <p className={kickerClass}>Journal</p>
        <h1 className="font-display mt-4 text-5xl font-medium leading-tight text-slate-50 sm:text-6xl">
          Notes from the threshold.
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-slate-300">
          Longer writing will live here, when there is something worth setting down. The feed is at{" "}
          <Link href="/blog/rss.xml" className="text-cyan-200 underline decoration-cyan-300/30 underline-offset-4">
            the journal RSS
          </Link>
          .
        </p>

        {posts.length === 0 ? (
          <div className="mt-16 border-t border-white/10 pt-12">
            <p className="font-display text-3xl italic text-slate-200">The journal is quiet.</p>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-400">
              Nothing has been published. Drafts being considered are not on this page, and they are not linked.
            </p>
          </div>
        ) : (
          <ul className="mt-14 divide-y divide-white/10 border-t border-white/10">
            {posts.map((post) => (
              <li key={post.slug}>
                <Link href={`/blog/${post.slug}`} className="group block py-8">
                  <time dateTime={post.date} className="text-[0.7rem] uppercase tracking-[0.18em] text-slate-500">
                    {formatDate(post.date)}
                  </time>
                  <h2 className="font-display mt-3 text-3xl text-slate-50 group-hover:text-cyan-100">
                    {post.title}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-slate-400">{post.description}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
