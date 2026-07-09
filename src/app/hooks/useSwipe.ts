"use client";

import { useRef } from "react";

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  /** Minimum horizontal travel (px) to count as a swipe. */
  threshold?: number;
}

/**
 * Lightweight touch-swipe detection for horizontal navigation. Returns touch
 * handlers to spread onto an element. A gesture only fires when the horizontal
 * travel clears `threshold` AND clearly dominates the vertical travel, so it
 * never hijacks normal vertical scrolling.
 */
export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  threshold = 60,
}: SwipeHandlers) {
  const start = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!start.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.current.x;
    const dy = t.clientY - start.current.y;
    start.current = null;

    // Ignore short gestures and anything more vertical than horizontal.
    if (Math.abs(dx) < threshold || Math.abs(dx) <= Math.abs(dy)) return;

    if (dx < 0) onSwipeLeft?.();
    else onSwipeRight?.();
  };

  return { onTouchStart, onTouchEnd };
}
