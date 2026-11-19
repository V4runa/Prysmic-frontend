"use client";

import { useEffect, useState } from "react";
import { scrollIntoPanel, toRect, visibleQuery, visibleRects } from "./tourDom";
import { unionRect, type Rect } from "./tourLayout";

const FALLBACK = "main h1, main h2";
const GIVE_UP_MS = 4000;

function rectKey(box: Rect): string {
  return [box.x, box.y, box.width, box.height].map((value) => value.toFixed(1)).join(",");
}

/**
 * Find the lit control and keep following it. The first stable reading lets
 * the stop present; measurement continues after that, because a phone layout
 * can still shift when fonts finish or the route animation settles.
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
    let stillSince = 0;
    let last: Rect | null = null;
    let lastPublished = "";
    let scrolled = false;
    let markedReady = false;
    let observer: ResizeObserver | null = null;
    let watching: HTMLElement | null = null;
    const started = performance.now();

    const publish = (box: Rect) => {
      const nextKey = rectKey(box);
      if (nextKey === lastPublished) return;
      lastPublished = nextKey;
      setRect(box);
    };

    const watch = (element: HTMLElement) => {
      if (watching === element && observer) return;
      observer?.disconnect();
      watching = element;
      observer = new ResizeObserver(() => {
        const box = unionRect(visibleRects(selectors).rects);
        if (box) publish(box);
      });
      let node: HTMLElement | null = element;
      while (node) {
        observer.observe(node);
        node = node.parentElement;
      }
    };

    const read = () => {
      const found = visibleRects(selectors);
      const box = unionRect(found.rects);
      if (found.element && box) {
        watch(found.element);
        const settled =
          last !== null &&
          Math.abs(box.x - last.x) < 0.6 &&
          Math.abs(box.y - last.y) < 0.6 &&
          Math.abs(box.width - last.width) < 0.6 &&
          Math.abs(box.height - last.height) < 0.6;
        if (settled) {
          if (stillSince === 0) stillSince = performance.now();
        } else {
          stillSince = 0;
        }
        last = box;
        publish(box);
        const heldStill = stillSince !== 0 && performance.now() - stillSince >= 180;
        // Scroll only from a settled box. A reading taken while the route is
        // still moving would park the control, and the pool would stay there.
        if (!scrolled && heldStill) {
          scrolled = true;
          const before = rectKey(box);
          scrollIntoPanel(found.element, true);
          const moved = unionRect(visibleRects(selectors).rects);
          if (moved && rectKey(moved) !== before) {
            stillSince = 0;
            last = moved;
            publish(moved);
            return;
          }
        }
        if (!markedReady && (heldStill || performance.now() - started >= GIVE_UP_MS)) {
          markedReady = true;
          setReady(true);
        }
        return;
      }
      if (!markedReady && performance.now() - started >= GIVE_UP_MS) {
        const fallback = visibleQuery(FALLBACK);
        markedReady = true;
        if (fallback) {
          const box = toRect(fallback.getBoundingClientRect());
          watch(fallback);
          publish(box);
        }
        setReady(true);
      }
    };

    const loop = () => {
      if (cancelled) return;
      read();
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    const onFonts = () => {
      if (!cancelled) read();
    };
    document.fonts?.ready.then(onFonts).catch(() => undefined);

    const follow = () => read();
    window.addEventListener("scroll", follow, true);
    window.addEventListener("resize", follow);
    window.visualViewport?.addEventListener("resize", follow);
    window.visualViewport?.addEventListener("scroll", follow);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("scroll", follow, true);
      window.removeEventListener("resize", follow);
      window.visualViewport?.removeEventListener("resize", follow);
      window.visualViewport?.removeEventListener("scroll", follow);
    };
    // selectors is represented by key. `reduced` is unused; scroll is instant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key, reduced]);

  return { rect, ready };
}
