"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Clip } from "../modules";

/**
 * The still is always in the document, so the frame is never an empty box:
 * before JavaScript, with reduced motion, and in a screenshot taken before
 * the video bytes arrive. The file itself loads only once the frame is on screen.
 */
export function LoopClip({
  clip,
  priority = false,
  sizes = "(min-width: 1024px) 960px, 100vw",
}: {
  clip: Clip;
  priority?: boolean;
  sizes?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [play, setPlay] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const io = new IntersectionObserver(
      ([entry]) => setPlay(Boolean(entry?.isIntersecting)),
      { threshold: 0.4 }
    );
    io.observe(root);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (play) {
      video.play().catch(() => {
        /* Autoplay can be refused. The poster stays. */
      });
    } else {
      video.pause();
    }
  }, [play]);

  return (
    <div ref={rootRef} className="absolute inset-0 bg-[#0c0e12]">
      <Image
        src={clip.poster}
        alt={play ? "" : clip.label}
        fill
        priority={priority}
        sizes={sizes}
        className="object-cover object-top"
      />
      {play && (
        <video
          ref={videoRef}
          className={`absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-300 ${ready ? "opacity-100" : "opacity-0"}`}
          poster={clip.poster}
          muted
          playsInline
          loop
          preload="none"
          aria-label={clip.label}
          onLoadedData={() => setReady(true)}
        >
          <source src={clip.webm} type="video/webm" />
          <source src={clip.mp4} type="video/mp4" />
        </video>
      )}
    </div>
  );
}
