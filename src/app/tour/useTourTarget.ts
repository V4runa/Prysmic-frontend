"use client";

import { useEffect, useState } from "react";
import { scrollIntoPanel, toRect, visibleQuery, visibleRects } from "./tourDom";
import { unionRect, type Rect } from "./tourLayout";

const FALLBACK = "main h1, main h2";
const STABLE_FRAMES = 4;
const GIVE_UP_MS = 4000;

/**
 * Find the lit control, bring it into the panel, and follow it while it moves.
 * If it never mounts, the page heading stands in so the walk can continue.
 */
export function useTourTarget(
  selectors: readonly string[],
  enabled: boolean,
  reduced: boolean
): { rect: Rect | null; ready: boolean } {
  const [rect, setRect] = useState<Rect | null>(null);
  const [ready, setReady] = useState(false);
  const key = selectors.join("|");
  const session = enabled ? key : "";
  const [tracked, setTracked] = useState(session);
  if (tracked !== session) {
    setTracked(session);
    setReady(false);
    setRect(null);
  }

  useEffect(() => {
    if (!enabled || selectors.length === 0) return;

    let cancelled = false;
    let frame = 0;
    let stable = 0;
    let last: Rect | null = null;
    let scrolled = false;
    let observer: ResizeObserver | null = null;
    const started = performance.now();

    const publish = (box: Rect | null) => {
      if (!cancelled && box) setRect(box);
    };

    const watch = (element: HTMLElement) => {
      observer?.disconnect();
      observer = new ResizeObserver(() => {
        const next = unionRect(visibleRects(selectors).rects);
        publish(next);
      });
      observer.observe(element);
    };

    const finish = (element: HTMLElement, box: Rect) => {
      publish(box);
      setReady(true);
      watch(element);
    };

    const tick = () => {
      if (cancelled) return;
      const found = visibleRects(selectors);
      const box = unionRect(found.rects);
      if (!found.element || !box) {
        if (performance.now() - started >= GIVE_UP_MS) {
          const fallback = visibleQuery(FALLBACK);
          if (fallback) finish(fallback, toRect(fallback.getBoundingClientRect()));
          else {
            setRect(null);
            setReady(true);
          }
          return;
        }
        frame = requestAnimationFrame(tick);
        return;
      }

      if (!scrolled) {
        scrolled = true;
        scrollIntoPanel(found.element, reduced);
      }

      const settled =
        last &&
        Math.abs(box.x - last.x) < 0.6 &&
        Math.abs(box.y - last.y) < 0.6 &&
        Math.abs(box.width - last.width) < 0.6 &&
        Math.abs(box.height - last.height) < 0.6;
      stable = settled ? stable + 1 : 0;
      last = box;
      publish(box);

      if (stable >= STABLE_FRAMES || performance.now() - started >= GIVE_UP_MS) {
        finish(found.element, box);
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    const follow = () => {
      const next = unionRect(visibleRects(selectors).rects);
      publish(next);
    };
    window.addEventListener("scroll", follow, true);
    window.addEventListener("resize", follow);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("scroll", follow, true);
      window.removeEventListener("resize", follow);
    };
    // selectors is represented by key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key, reduced]);

  return { rect, ready };
}
