"use client";

import { useEffect, useRef } from "react";

type AutoGrowTextareaProps =
  React.TextareaHTMLAttributes<HTMLTextAreaElement>;

/**
 * A textarea that grows to fit its content (no inner scrollbar jump while
 * typing). Pair with a `min-h-[...]` class to set a comfortable starting
 * height; CSS min-height keeps it tall when content is short.
 */
export default function AutoGrowTextarea({
  value,
  className = "",
  ...rest
}: AutoGrowTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      className={`resize-none overflow-hidden ${className}`}
      {...rest}
    />
  );
}
