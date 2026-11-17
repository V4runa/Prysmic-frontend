"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { TAG_COLOR_OPTIONS, tagActiveClasses, tagColorClasses } from "../lib/tagColors";

interface TagColorChoicesProps {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
  /** Extra classes for each pill, such as a larger touch target in a dialog. */
  className?: string;
  /** Id of the visible label for this group. */
  labelledBy?: string;
}

/** Named color pills, ordered cool, warm, then earth and neutral. */
export default function TagColorChoices({
  value,
  onChange,
  disabled,
  className,
  labelledBy,
}: TagColorChoicesProps) {
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const selectedIndex = TAG_COLOR_OPTIONS.findIndex((color) => color.value === value);

  const choose = (index: number) => {
    if (disabled) return;
    const next = TAG_COLOR_OPTIONS[index];
    if (!next) return;
    onChange(next.value);
    buttons.current.get(next.value)?.focus();
  };

  const move = (delta: number) => {
    const length = TAG_COLOR_OPTIONS.length;
    const start = selectedIndex === -1 ? (delta > 0 ? -1 : 0) : selectedIndex;
    choose((start + delta + length) % length);
  };

  return (
    <div
      role="radiogroup"
      aria-label={labelledBy ? undefined : "Tag color"}
      aria-labelledby={labelledBy}
      className="flex max-w-full flex-wrap gap-2"
      onKeyDown={(event) => {
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          event.preventDefault();
          move(1);
        } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          event.preventDefault();
          move(-1);
        } else if (event.key === "Home") {
          event.preventDefault();
          choose(0);
        } else if (event.key === "End") {
          event.preventDefault();
          choose(TAG_COLOR_OPTIONS.length - 1);
        }
      }}
    >
      {TAG_COLOR_OPTIONS.map((color, index) => {
        const selected = color.value === value;
        return (
          <motion.button
            key={color.value}
            ref={(node) => {
              if (node) buttons.current.set(color.value, node);
              else buttons.current.delete(color.value);
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={color.name}
            tabIndex={disabled ? -1 : selected || (selectedIndex === -1 && index === 0) ? 0 : -1}
            disabled={disabled}
            whileTap={disabled ? undefined : { scale: 0.96 }}
            onClick={() => onChange(color.value)}
            className={clsx(
              "inline-flex h-11 items-center rounded-full border px-3.5 text-xs backdrop-blur-md shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40",
              tagColorClasses[color.value],
              selected ? tagActiveClasses[color.value] : "hover:bg-white/10",
              className
            )}
          >
            {color.name}
          </motion.button>
        );
      })}
    </div>
  );
}
