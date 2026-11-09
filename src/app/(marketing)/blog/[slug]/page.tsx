import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { compileMDX } from "next-mdx-remote/rsc";
import { mdxComponents } from "@/marketing/components/MdxProse";
import { getPublishedPost, getPublishedPosts } from "@/marketing/journal";
import { kickerClass } from "@/marketing/site";

export function generateStaticParams() {
  return getPublishedPosts().map((post) => ({ slug: post.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPublishedPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
    },
  };
}

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

export default async function JournalPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPublishedPost(slug);
  if (!post) notFound();

  const { content } = await compileMDX({
    source: post.body,
    components: mdxComponents,
  });

  return (
    <article className="px-5 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-2xl">
        <p className={kickerClass}>Journal</p>
        <h1 className="font-display mt-4 text-5xl font-medium leading-tight text-slate-50">
          {post.title}
        </h1>
        <p className="mt-4 text-sm text-slate-400">
          <time dateTime={post.date}>{formatDate(post.date)}</time>
        </p>
        <p className="mt-6 text-lg leading-relaxed text-slate-300">{post.description}</p>
        <div className="mt-10 border-t border-white/10 pt-10">{content}</div>
        <p className="mt-14">
          <Link
            href="/blog"
            className="text-sm text-cyan-200 underline decoration-cyan-300/30 underline-offset-4"
          >
            Back to the journal
          </Link>
        </p>
      </div>
    </article>
  );
}
