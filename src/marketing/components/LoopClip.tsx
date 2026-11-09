"use client";

import { useEffect, useRef } from "react";
import type { Clip } from "../modules";

export function LoopClip({ clip }: { clip: Clip }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      el.pause();
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) {
          el.play().catch(() => {
            /* Autoplay can be blocked. The poster remains. */
          });
        } else {
          el.pause();
        }
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      className="h-full w-full object-cover object-top"
      poster={clip.poster}
      muted
      playsInline
      loop
      preload="metadata"
      aria-label={clip.label}
    >
      <source src={clip.webm} type="video/webm" />
      <source src={clip.mp4} type="video/mp4" />
    </video>
  );
}
