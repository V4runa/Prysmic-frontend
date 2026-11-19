"use client";

import { useEffect, useState } from "react";
import { pageIsBusy, scrollIntoPanel, toRect, visibleQuery, visibleRects } from "./tourDom";
import { unionRect, type Rect } from "./tourLayout";

const FALLBACK = "main h1, main h2";
const GIVE_UP_MS = 8000;

function far(a: Rect, b: Rect): boolean {
  return Math.abs(a.x - b.x) > 16 || Math.abs(a.y - b.y) > 16 || Math.abs(a.width - b.width) > 16 || Math.abs(a.height - b.height) > 16;
}

/**
 * Measure the lit subject once it has settled. Small later shifts are ignored
 * so the glow does not jitter while the page finishes painting.
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
    let still = 0;
    let last: Rect | null = null;
    let locked: Rect | null = null;
    let scrolled = false;
    const started = performance.now();

    const publish = (box: Rect) => {
      locked = box;
      setRect(box);
    };

    const finish = (box: Rect) => {
      publish(box);
      setReady(true);
    };

    const read = () => {
      if (cancelled) return;
      if (pageIsBusy() && performance.now() - started < GIVE_UP_MS) {
        still = 0;
        last = null;
        frame = requestAnimationFrame(read);
        return;
      }
      const found = visibleRects(selectors);
      const box = unionRect(found.rects);
      if (!found.element || !box) {
        if (performance.now() - started >= GIVE_UP_MS) {
          const fallback = visibleQuery(FALLBACK);
          if (fallback) finish(toRect(fallback.getBoundingClientRect()));
          else setReady(true);
          return;
        }
        frame = requestAnimationFrame(read);
        return;
      }
      if (!scrolled) {
        scrolled = true;
        scrollIntoPanel(found.element, true);
      }
      const settled =
        last !== null &&
        Math.abs(box.x - last.x) < 0.6 &&
        Math.abs(box.y - last.y) < 0.6 &&
        Math.abs(box.width - last.width) < 0.6 &&
        Math.abs(box.height - last.height) < 0.6;
      still = settled ? still + 1 : 0;
      last = box;
      if (still >= 3 || performance.now() - started >= GIVE_UP_MS) {
        const fonts = document.fonts?.ready ?? Promise.resolve();
        void fonts.then(() => {
          if (cancelled) return;
          const again = unionRect(visibleRects(selectors).rects) ?? box;
          finish(again);
        });
        return;
      }
      frame = requestAnimationFrame(read);
    };

    const follow = () => {
      if (!locked) return;
      const next = unionRect(visibleRects(selectors).rects);
      if (next && far(next, locked)) publish(next);
    };

    frame = requestAnimationFrame(read);
    window.addEventListener("resize", follow);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", follow);
    };
    // selectors is represented by key. Scroll is instant; `reduced` is unused.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key, reduced]);

  return { rect, ready };
}
