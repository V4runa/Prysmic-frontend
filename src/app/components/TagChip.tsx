import clsx from "clsx";
import { tagTone } from "../lib/tagColors";

interface TagChipProps {
  tag: { name: string; color?: string | null };
  className?: string;
}

/** Static tag chip. Same surface as the chips on a note card. */
export default function TagChip({ tag, className }: TagChipProps) {
  return (
    <span
      className={clsx(
        "max-w-full break-words px-2 sm:px-3 py-1 text-xs rounded-full border backdrop-blur-md shadow-sm",
        tagTone(tag.color, "slate"),
        className
      )}
    >
      {tag.name}
    </span>
  );
}
