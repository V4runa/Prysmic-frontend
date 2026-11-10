"use client";

import { motion } from "framer-motion";
import { TAG_COLOR_OPTIONS, selectedColorClasses, tagColorClasses } from "../lib/tagColors";

interface TagColorChoicesProps {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

/** The six named swatches from the Tags page. */
export default function TagColorChoices({ value, onChange, disabled }: TagColorChoicesProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {TAG_COLOR_OPTIONS.map((color) => (
        <motion.button
          key={color.value}
          type="button"
          disabled={disabled}
          aria-pressed={value === color.value}
          whileTap={disabled ? undefined : { scale: 0.92 }}
          onClick={() => onChange(color.value)}
          className={`interactive-chip px-3 py-1 text-xs rounded-full border backdrop-blur-md transition-colors disabled:opacity-40 ${
            value === color.value
              ? `${tagColorClasses[color.value]} ${selectedColorClasses[color.value]}`
              : "border-white/10 text-slate-400 hover:text-white hover:border-white/20"
          }`}
        >
          {color.name}
        </motion.button>
      ))}
    </div>
  );
}
