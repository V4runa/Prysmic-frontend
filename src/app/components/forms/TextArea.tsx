"use client";

import { forwardRef, useEffect, useRef } from "react";
import clsx from "clsx";
import { fieldInput } from "./styles";

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Grow to fit content instead of showing an inner scrollbar. */
  autoGrow?: boolean;
  /** Cap for autoGrow height before the textarea scrolls internally. */
  maxGrowPx?: number;
}

/** Styled multi-line input with optional content-fitting auto-grow. */
const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { className, autoGrow = false, maxGrowPx = 480, value, ...rest },
  ref
) {
  const innerRef = useRef<HTMLTextAreaElement | null>(null);

  const setRefs = (el: HTMLTextAreaElement | null) => {
    innerRef.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref)
      (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
  };

  useEffect(() => {
    if (!autoGrow) return;
    const el = innerRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, maxGrowPx);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > maxGrowPx ? "auto" : "hidden";
  }, [autoGrow, maxGrowPx, value]);

  return (
    <textarea
      ref={setRefs}
      value={value}
      className={clsx(fieldInput, autoGrow && "resize-none overflow-hidden", className)}
      {...rest}
    />
  );
});

export default TextArea;
