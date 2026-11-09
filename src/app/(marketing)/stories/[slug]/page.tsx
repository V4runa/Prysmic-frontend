import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IllustrativeNotice } from "@/marketing/components/IllustrativeNotice";
import { stories, storyMap } from "@/marketing/stories";
import { btnGhost, kickerClass } from "@/marketing/site";

export function generateStaticParams() {
  return stories.map((story) => ({ slug: story.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const story = storyMap[slug];
  if (!story) return {};
  return {
    title: story.title,
    description: story.dek,
    alternates: { canonical: `/stories/${slug}` },
  };
}

export default async function StoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const story = storyMap[slug];
  if (!story) notFound();

  return (
    <article className="px-5 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-2xl">
        <p className={kickerClass}>{story.kicker}</p>
        <h1 className="font-display mt-4 text-5xl font-medium leading-tight text-slate-50 sm:text-6xl">
          {story.title}
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-slate-300">{story.dek}</p>
        <div className="mt-8">
          <IllustrativeNotice />
        </div>

        <ol className="mt-14 space-y-12">
          {story.days.map((day) => (
            <li key={day.label}>
              <p className="text-[0.7rem] uppercase tracking-[0.22em] text-cyan-200/80">
                {day.label}
              </p>
              <h2 className="font-display mt-2 text-3xl text-slate-50">{day.title}</h2>
              <p className="mt-4 text-base leading-relaxed text-slate-300">{day.body}</p>
            </li>
          ))}
        </ol>

        <p className="mt-14 border-t border-white/10 pt-8 text-lg leading-relaxed text-slate-200">
          {story.close}
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/stories" className={btnGhost}>
            Both weeks
          </Link>
          <Link href="/signup" className={btnGhost}>
            Begin
          </Link>
        </div>
      </div>
    </article>
  );
}
