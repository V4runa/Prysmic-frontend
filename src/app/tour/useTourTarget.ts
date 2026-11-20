"use client";

import { useEffect, useState } from "react";
import { pageIsBusy, scrollIntoPanel, toRect, visibleQuery, visibleRects } from "./tourDom";
import { unionRect, type Rect } from "./tourLayout";

const FALLBACK = "main";
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
): { rect: Rect | null; ready: boolean; marker: string | null } {
  const [rect, setRect] = useState<Rect | null>(null);
  const [marker, setMarker] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const key = selectors.join("|");
  const session = enabled ? key : "";
  const [tracked, setTracked] = useState(session);
  if (tracked !== session) {
    setTracked(session);
    setReady(false);
    setRect(null);
    setMarker(null);
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

    const publish = (box: Rect, node: HTMLElement | null) => {
      locked = box;
      setRect(box);
      setMarker(node?.getAttribute("data-tour") ?? null);
    };

    const finish = (box: Rect, node: HTMLElement | null) => {
      publish(box, node);
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
          if (fallback) finish(toRect(fallback.getBoundingClientRect()), fallback);
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
          const again = visibleRects(selectors);
          finish(unionRect(again.rects) ?? box, again.element);
        });
        return;
      }
      frame = requestAnimationFrame(read);
    };

    const follow = () => {
      if (!locked) return;
      const next = visibleRects(selectors);
      const box = unionRect(next.rects);
      if (box && far(box, locked)) publish(box, next.element);
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

  return { rect, ready, marker };
}
