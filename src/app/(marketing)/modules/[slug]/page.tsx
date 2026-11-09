import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Figure } from "@/marketing/components/Figure";
import { IllustrativeNotice } from "@/marketing/components/IllustrativeNotice";
import { LoopClip } from "@/marketing/components/LoopClip";
import { moduleMap, modules, type ModuleSlug } from "@/marketing/modules";
import { btnPrimary, kickerClass } from "@/marketing/site";

function isSlug(value: string): value is ModuleSlug {
  return value in moduleMap;
}

export function generateStaticParams() {
  return modules.map((module) => ({ slug: module.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!isSlug(slug)) return {};
  const module = moduleMap[slug];
  return {
    title: module.title,
    description: module.deck,
    alternates: { canonical: `/modules/${slug}` },
  };
}

export default async function ModulePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isSlug(slug)) notFound();
  const module = moduleMap[slug];
  const others = modules.filter((item) => item.slug !== slug);

  return (
    <article>
      <header className="px-5 pb-10 pt-16 sm:px-8 sm:pt-24">
        <div className="mx-auto max-w-6xl">
          <p className={kickerClass}>{module.kicker}</p>
          <h1 className="font-display mt-4 max-w-4xl text-5xl font-medium leading-[0.95] text-slate-50 sm:text-7xl">
            {module.title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">
            {module.deck}
          </p>
        </div>
      </header>

      <div className="px-5 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <IllustrativeNotice compact />
          <div className="mt-8">
            <Figure figure={module.figure} priority sizes="(min-width: 1024px) 1100px, 100vw" />
          </div>
        </div>
      </div>

      <section className="px-5 py-16 sm:px-8">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div className="space-y-5 text-base leading-relaxed text-slate-300 sm:text-lg">
            {module.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <ul className="space-y-8">
            {module.points.map((point) => (
              <li key={point.title}>
                <h2 className="font-display text-2xl text-slate-50">{point.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{point.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {module.clip && (
        <section className="px-5 pb-8 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <p className={kickerClass}>In motion</p>
            <h2 className="font-display mt-3 text-3xl text-slate-50 sm:text-4xl">
              A few seconds of the room.
            </h2>
            <div className="glass-card relative mt-8 aspect-[16/10] overflow-hidden rounded-2xl">
              <LoopClip clip={module.clip} />
            </div>
            <p className="mt-3 text-sm text-slate-400">{module.clip.label}</p>
          </div>
        </section>
      )}

      {module.secondary && (
        <section className="px-5 py-12 sm:px-8">
          <div className="mx-auto max-w-6xl lg:max-w-4xl">
            <Figure figure={module.secondary} />
          </div>
        </section>
      )}

      <section className="px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-6xl border-t border-white/10 pt-12">
          <p className={kickerClass}>Also in the environment</p>
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-300">
            {others.map((item) => (
              <li key={item.slug}>
                <Link href={`/modules/${item.slug}`} className="hover:text-cyan-200">
                  {item.nav}
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/signup" className={`${btnPrimary} mt-10`}>
            Begin
          </Link>
        </div>
      </section>
    </article>
  );
}
