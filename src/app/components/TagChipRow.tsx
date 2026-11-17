"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import clsx from "clsx";
import { tagTone } from "../lib/tagColors";
import {
  TAG_ROW_MAX_CHIP_WIDTH,
  TAG_ROW_MIN_CHIP_WIDTH,
  fewerTagsLabel,
  layoutTagRow,
  moreTagsLabel,
  overflowPillText,
  type TagRowLayout,
} from "../lib/tagOverflow";
import TagChip from "./TagChip";

export type TagChipRowTag = {
  id: string | number;
  name: string;
  color?: string | null;
};

const PILL_CLASS = clsx(
  "inline-flex max-w-full items-center whitespace-nowrap rounded-full border px-2 py-1 text-xs shadow-sm backdrop-blur-md sm:px-3",
  tagTone(null, "slate")
);

function sameLayout(a: TagRowLayout, b: TagRowLayout): boolean {
  if (a.visibleCount !== b.visibleCount || a.hiddenCount !== b.hiddenCount) return false;
  if (a.widths.length !== b.widths.length) return false;
  return a.widths.every((width, index) => width === b.widths[index]);
}

/**
 * One line of tag chips for a card or row.
 * "+N" opens the rest in place. "Show less" folds them back.
 * The note page still lists every tag on its own.
 */
export default function TagChipRow({
  tags,
  className,
}: {
  tags: readonly TagChipRowTag[];
  className?: string;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<TagRowLayout | null>(null);
  const [expanded, setExpanded] = useState(false);
  const pendingHeight = useRef<number | null>(null);

  const tagKey = tags.map((tag) => `${tag.id}\0${tag.name}\0${tag.color ?? ""}`).join("\n");

  const measure = useCallback(() => {
    const container = containerRef.current;
    const measureEl = measureRef.current;
    if (!container || !measureEl) return;
    const containerWidth = container.clientWidth;
    if (containerWidth <= 0) return;
    const chipWidths = [...measureEl.querySelectorAll<HTMLElement>("[data-tag-measure]")].map(
      (el) => el.offsetWidth
    );
    const pills = new Map<number, number>();
    for (const el of measureEl.querySelectorAll<HTMLElement>("[data-pill-measure]")) {
      pills.set(Number(el.dataset.hidden), el.offsetWidth);
    }
    const gap = Number.parseFloat(getComputedStyle(container).columnGap);
    const next = layoutTagRow({
      containerWidth,
      chipWidths,
      gap: Number.isFinite(gap) ? gap : 0,
      pillWidth: (hidden) => pills.get(hidden) ?? 0,
      maxChipWidth: TAG_ROW_MAX_CHIP_WIDTH,
      minChipWidth: TAG_ROW_MIN_CHIP_WIDTH,
    });
    setLayout((prev) => (prev && sameLayout(prev, next) ? prev : next));
  }, []);

  useLayoutEffect(() => {
    measure();
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(container);
    const fonts = document.fonts;
    const onFonts = () => measure();
    void fonts?.ready.then(onFonts);
    fonts?.addEventListener("loadingdone", onFonts);
    return () => {
      observer.disconnect();
      fonts?.removeEventListener("loadingdone", onFonts);
    };
  }, [measure, tagKey]);

  useLayoutEffect(() => {
    const shell = shellRef.current;
    const start = pendingHeight.current;
    if (!shell || start == null) return;
    pendingHeight.current = null;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const end = shell.scrollHeight;
    if (reduce || Math.abs(end - start) < 1) {
      shell.style.height = "";
      shell.style.overflow = "";
      shell.style.transition = "";
      return;
    }
    shell.style.height = `${start}px`;
    shell.style.overflow = "hidden";
    void shell.offsetHeight;
    shell.style.transition = "height 180ms ease-out";
    shell.style.height = `${end}px`;
    const finish = () => {
      shell.style.height = "";
      shell.style.overflow = "";
      shell.style.transition = "";
      shell.removeEventListener("transitionend", finish);
    };
    shell.addEventListener("transitionend", finish);
    const timer = window.setTimeout(finish, 260);
    return () => {
      window.clearTimeout(timer);
      shell.removeEventListener("transitionend", finish);
    };
  }, [expanded]);

  if (tags.length === 0) return null;

  const hidden = layout?.hiddenCount ?? 0;
  const visible = layout?.visibleCount ?? 0;
  const shown = !layout ? [] : expanded ? tags : tags.slice(0, visible);
  const label = expanded ? fewerTagsLabel() : moreTagsLabel(hidden);

  const toggle = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const shell = shellRef.current;
    if (shell && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      pendingHeight.current = shell.offsetHeight;
      shell.style.height = `${shell.offsetHeight}px`;
      shell.style.overflow = "hidden";
    }
    setExpanded((value) => !value);
  };

  return (
    <div
      ref={shellRef}
      className={clsx("relative z-20 min-w-0", className)}
      data-tag-row=""
      data-expanded={expanded ? "true" : "false"}
    >
      <div
        ref={containerRef}
        className={clsx(
          "flex min-h-[1.625rem] min-w-0 items-center gap-1 pointer-events-none sm:gap-2",
          expanded ? "flex-wrap" : "flex-nowrap overflow-x-clip"
        )}
      >
        {shown.map((tag, index) => {
          const width = expanded ? null : layout?.widths[index];
          return (
            <TagChip
              key={tag.id}
              tag={tag}
              className="pointer-events-auto shrink-0"
              style={width == null ? undefined : { width, maxWidth: width }}
            />
          );
        })}
        {hidden > 0 ? (
          <button
            type="button"
            className="pointer-events-auto relative inline-flex shrink-0 items-center justify-center"
            aria-label={label}
            aria-expanded={expanded}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={toggle}
          >
            <span className={PILL_CLASS}>{expanded ? "Show less" : overflowPillText(hidden)}</span>
            <span aria-hidden="true" className="absolute top-1/2 right-0 h-11 w-11 -translate-y-1/2" />
          </button>
        ) : null}
      </div>

      <div
        ref={measureRef}
        aria-hidden="true"
        className="pointer-events-none invisible absolute left-0 top-0 flex w-max flex-nowrap gap-1 sm:gap-2"
      >
        {tags.map((tag) => (
          <span key={tag.id} data-tag-measure="" className="inline-flex max-w-[min(11rem,100%)] shrink-0">
            <TagChip tag={tag} measureOnly />
          </span>
        ))}
        {tags.map((_, index) => {
          const hiddenCount = index + 1;
          return (
            <span key={hiddenCount} data-pill-measure="" data-hidden={hiddenCount} className={PILL_CLASS}>
              {overflowPillText(hiddenCount)}
            </span>
          );
        })}
      </div>
    </div>
  );
}
