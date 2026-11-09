import Image from "next/image";
import type { Figure as FigureData } from "../modules";

export function Figure({
  figure,
  priority = false,
  sizes = "(min-width: 1024px) 720px, 100vw",
}: {
  figure: FigureData;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <figure className="min-w-0">
      <div className="glass-card relative aspect-[16/10] overflow-hidden rounded-2xl">
        <Image
          src={figure.src}
          alt={figure.alt}
          fill
          priority={priority}
          sizes={sizes}
          className="object-cover object-top"
        />
      </div>
      <figcaption className="mt-3 text-sm leading-relaxed text-slate-400">
        {figure.caption}
      </figcaption>
    </figure>
  );
}
