import type { CSSProperties } from "react";
import clsx from "clsx";
import { tagTone } from "../lib/tagColors";

interface TagChipProps {
  tag: { name: string; color?: string | null };
  className?: string;
  style?: CSSProperties;
  /** One line, ellipsis at the chip's max width. List rows use this. */
  truncate?: boolean;
}

/** Static tag chip. Same surface as the chips on a note card. */
export default function TagChip({ tag, className, style, truncate = false }: TagChipProps) {
  return (
    <span
      style={style}
      className={clsx(
        "px-2 sm:px-3 py-1 text-xs rounded-full border backdrop-blur-md shadow-sm",
        truncate ? "inline-block min-w-0 truncate align-middle" : "max-w-full break-words",
        tagTone(tag.color, "slate"),
        className
      )}
    >
      {tag.name}
    </span>
  );
}
