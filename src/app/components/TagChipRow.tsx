"use client";

import { useCallback, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import clsx from "clsx";
import { tagTone } from "../lib/tagColors";
import {
  TAG_ROW_MAX_CHIP_WIDTH,
  TAG_ROW_MIN_CHIP_WIDTH,
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

function placePopover(anchor: DOMRect, width: number, height: number) {
  const margin = 8;
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const bottomGap = viewportW < 640 ? 72 : margin;
  let left = anchor.left;
  if (left + width > viewportW - margin) left = viewportW - margin - width;
  if (left < margin) left = margin;
  const spaceBelow = viewportH - bottomGap - anchor.bottom - 6;
  const spaceAbove = anchor.top - margin - 6;
  const openAbove = spaceBelow < Math.min(height, 140) && spaceAbove > spaceBelow;
  const top = openAbove ? Math.max(margin, anchor.top - 6 - height) : anchor.bottom + 6;
  return { top, left };
}

/**
 * One line of tag chips for a card or row.
 * Measures the row and keeps the rest behind a "+N" pill.
 * The note page and the tag picker still show every tag.
 */
export default function TagChipRow({
  tags,
  className,
}: {
  tags: readonly TagChipRowTag[];
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const popoverId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<TagRowLayout | null>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const focusedOnOpen = useRef(false);

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

  const hidden = layout?.hiddenCount ?? 0;
  const visible = layout?.visibleCount ?? 0;

  const closePopover = useCallback(() => {
    setOpen(false);
    setCoords(null);
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      focusedOnOpen.current = false;
      return;
    }
    const place = () => {
      const anchor = buttonRef.current;
      const popover = popoverRef.current;
      if (!anchor || !popover) return;
      const anchorBox = anchor.getBoundingClientRect();
      const popBox = popover.getBoundingClientRect();
      setCoords((prev) => {
        const next = placePopover(anchorBox, popBox.width, popBox.height);
        if (prev && prev.top === next.top && prev.left === next.left) return prev;
        return next;
      });
    };
    place();
    const popover = popoverRef.current;
    const observer =
      popover && typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => place()) : null;
    if (popover && observer) observer.observe(popover);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, hidden, tagKey]);

  useLayoutEffect(() => {
    if (!open || !coords || focusedOnOpen.current) return;
    focusedOnOpen.current = true;
    popoverRef.current?.focus({ preventScroll: true });
  }, [open, coords]);

  useLayoutEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      closePopover();
      buttonRef.current?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (buttonRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      closePopover();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer, true);
    };
  }, [open, closePopover]);

  if (tags.length === 0) return null;

  const shown = layout ? tags.slice(0, visible) : [];
  const label = moreTagsLabel(hidden);

  return (
    <div className={clsx("relative z-20 min-w-0", className)} data-tag-row="">
      <div
        ref={containerRef}
        className="flex min-h-[1.625rem] min-w-0 flex-nowrap items-center gap-1 overflow-x-clip pointer-events-none sm:gap-2"
      >
        {shown.map((tag, index) => {
          const width = layout?.widths[index];
          return (
            <TagChip
              key={tag.id}
              tag={tag}
              truncate
              className="max-w-44 shrink-0"
              style={width == null ? undefined : { width, maxWidth: width }}
            />
          );
        })}
        {hidden > 0 ? (
          <button
            ref={buttonRef}
            type="button"
            className="pointer-events-auto relative inline-flex shrink-0 items-center justify-center"
            aria-label={label}
            aria-expanded={open}
            aria-haspopup="dialog"
            aria-controls={open ? popoverId : undefined}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setCoords(null);
              setOpen((value) => !value);
            }}
          >
            <span className={PILL_CLASS}>{overflowPillText(hidden)}</span>
            <span
              aria-hidden="true"
              className="absolute top-1/2 right-0 h-11 w-11 -translate-y-1/2"
            />
          </button>
        ) : null}
      </div>

      <div
        ref={measureRef}
        aria-hidden="true"
        className="pointer-events-none invisible absolute left-0 top-0 flex w-max flex-nowrap gap-1 sm:gap-2"
      >
        {tags.map((tag) => (
          <span key={tag.id} data-tag-measure="" className="inline-flex max-w-44 shrink-0">
            <TagChip tag={tag} truncate className="max-w-44" />
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

      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {open ? (
                <motion.div
                  key="tag-overflow"
                  ref={popoverRef}
                  id={popoverId}
                  role="dialog"
                  aria-label="All tags"
                  aria-modal="false"
                  tabIndex={-1}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: coords ? 1 : 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.14, ease: "easeOut" }}
                  style={{
                    top: coords?.top ?? 0,
                    left: coords?.left ?? 0,
                    visibility: coords ? "visible" : "hidden",
                  }}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                  className="fixed z-[90] w-max max-w-[min(16rem,calc(100vw-1rem))] rounded-xl border border-white/10 bg-[#14161c]/95 p-2.5 shadow-[0_16px_40px_-20px_rgba(0,0,0,0.75)] backdrop-blur-md outline-none"
                >
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <TagChip key={tag.id} tag={tag} />
                    ))}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body
          )
        : null}
    </div>
  );
}
