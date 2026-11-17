"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, MouseEvent, RefObject } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { tagTone } from "../lib/tagColors";

interface TagChipProps {
  tag: { name: string; color?: string | null };
  className?: string;
  style?: CSSProperties;
  /** Hidden measurer. No tooltip, no tab stop, no clicks. */
  measureOnly?: boolean;
}

/**
 * One tag name. The chip never grows past 11rem or its container.
 * A longer name ends in an ellipsis, and only then does a hover or
 * keyboard focus show the rest.
 */
export default function TagChip({ tag, className, style, measureOnly = false }: TagChipProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [truncated, setTruncated] = useState(false);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const showTip = !measureOnly && truncated && (hover || focus);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      const next = el.scrollWidth > el.clientWidth + 1;
      setTruncated((prev) => (prev === next ? prev : next));
    };
    check();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [tag.name, className, style?.width, style?.maxWidth]);

  const openNote = (event: MouseEvent<HTMLSpanElement>) => {
    const overlay = event.currentTarget
      .closest(".glass-card")
      ?.querySelector<HTMLAnchorElement>(":scope > a.absolute");
    if (!overlay) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      window.open(overlay.href, "_blank", "noopener,noreferrer");
      return;
    }
    overlay.click();
  };

  return (
    <>
      <span
        ref={ref}
        style={style}
        data-tag-chip=""
        data-truncated={truncated ? "true" : "false"}
        aria-label={tag.name}
        tabIndex={!measureOnly && truncated ? 0 : undefined}
        onMouseEnter={measureOnly ? undefined : () => setHover(true)}
        onMouseLeave={measureOnly ? undefined : () => setHover(false)}
        onFocus={measureOnly ? undefined : () => setFocus(true)}
        onBlur={measureOnly ? undefined : () => setFocus(false)}
        onClick={measureOnly ? undefined : openNote}
        className={clsx(
          "tag-chip px-2 sm:px-3 py-1 text-xs rounded-full border backdrop-blur-md shadow-sm",
          measureOnly ? "pointer-events-none" : "pointer-events-auto",
          tagTone(tag.color, "slate"),
          className
        )}
      >
        {tag.name}
      </span>
      {showTip ? <TagNameTip anchorRef={ref} name={tag.name} /> : null}
    </>
  );
}

function TagNameTip({
  anchorRef,
  name,
}: {
  anchorRef: RefObject<HTMLSpanElement | null>;
  name: string;
}) {
  const tipRef = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const place = () => {
      const tip = tipRef.current;
      const rect = anchor.getBoundingClientRect();
      const height = tip?.offsetHeight ?? 28;
      const width = tip?.offsetWidth ?? 160;
      let top = rect.bottom + 6;
      if (top + height > window.innerHeight - 8) top = Math.max(8, rect.top - height - 6);
      let left = rect.left;
      if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - 8 - width);
      setPos((prev) => (prev && prev.top === top && prev.left === left ? prev : { top, left }));
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchorRef, name]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <span
      ref={tipRef}
      data-tag-tooltip=""
      aria-hidden="true"
      style={{ top: pos?.top ?? 0, left: pos?.left ?? 0, visibility: pos ? "visible" : "hidden" }}
      className="pointer-events-none fixed z-[90] max-w-[16rem] rounded-md border border-white/10 bg-[#14161c]/95 px-2 py-1 text-xs leading-snug text-slate-200 shadow-[0_10px_24px_-16px_rgba(0,0,0,0.8)] backdrop-blur-md break-words"
    >
      {name}
    </span>,
    document.body
  );
}
