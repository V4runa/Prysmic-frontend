export const TAG_COLOR_OPTIONS = [
  { name: "Astral", value: "cyan" },
  { name: "Ember", value: "rose" },
  { name: "Whisper", value: "slate" },
  { name: "Pulse", value: "violet" },
  { name: "Verdant", value: "emerald" },
  { name: "Sunwake", value: "amber" },
] as const;

export type TagColorValue = (typeof TAG_COLOR_OPTIONS)[number]["value"];

export const tagColorClasses: Record<string, string> = {
  cyan: "text-cyan-300 border-cyan-300/30 shadow-cyan-300/10",
  rose: "text-rose-300 border-rose-300/30 shadow-rose-300/10",
  slate: "text-slate-300 border-slate-300/30 shadow-slate-300/10",
  violet: "text-violet-300 border-violet-300/30 shadow-violet-300/10",
  emerald: "text-emerald-300 border-emerald-300/30 shadow-emerald-300/10",
  amber: "text-amber-300 border-amber-300/30 shadow-amber-300/10",
};

export const tagActiveClasses: Record<string, string> = {
  cyan: "ring ring-cyan-300 shadow-[0_0_10px] shadow-cyan-400/40 bg-cyan-500/10",
  rose: "ring ring-rose-300 shadow-[0_0_10px] shadow-rose-400/40 bg-rose-500/10",
  slate: "ring ring-slate-300 shadow-[0_0_10px] shadow-slate-400/40 bg-slate-500/10",
  violet: "ring ring-violet-300 shadow-[0_0_10px] shadow-violet-400/40 bg-violet-500/10",
  emerald: "ring ring-emerald-300 shadow-[0_0_10px] shadow-emerald-400/40 bg-emerald-500/10",
  amber: "ring ring-amber-300 shadow-[0_0_10px] shadow-amber-400/40 bg-amber-500/10",
};

// Fully-spelled classes for the selected color swatch (Tailwind v4 can't see
// `ring-${value}-300`, so these must be literal strings).
export const selectedColorClasses: Record<string, string> = {
  cyan: "ring-2 ring-cyan-300 text-cyan-200 border-cyan-300",
  rose: "ring-2 ring-rose-300 text-rose-200 border-rose-300",
  slate: "ring-2 ring-slate-300 text-slate-200 border-slate-300",
  violet: "ring-2 ring-violet-300 text-violet-200 border-violet-300",
  emerald: "ring-2 ring-emerald-300 text-emerald-200 border-emerald-300",
  amber: "ring-2 ring-amber-300 text-amber-200 border-amber-300",
};

export function tagColorKey(color: string | null | undefined, fallback = "slate"): string {
  if (color && tagColorClasses[color]) return color;
  return tagColorClasses[fallback] ? fallback : "slate";
}

export function tagTone(color: string | null | undefined, fallback = "slate"): string {
  return tagColorClasses[tagColorKey(color, fallback)];
}

export function tagActiveTone(color: string | null | undefined, fallback = "slate"): string {
  const key = tagColorKey(color, fallback);
  return tagActiveClasses[key] ?? tagActiveClasses.slate;
}
