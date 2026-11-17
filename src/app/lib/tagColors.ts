/**
 * Named tag colors. A chip is pale tinted text, a hairline outline, and a
 * faint glow — no solid fill — so a fully tagged page stays calm.
 *
 * The server stores color as a free string. The original six values keep
 * the dark treatment they already had. A few newcomers step off the 300
 * tint where 300 would match a neighbor or glare: indigo and teal sit at
 * 400, gold and lime at 200 so they are not neon, sand is a warm peach
 * (a stone gray matches Whisper, and a cream matches Gleam), and the
 * neutral gray is zinc-400.
 *
 * globals.css lightens the page background in light mode, but these chips
 * sit on the same dark glass. Darker ink for that theme sank into the glass,
 * so both themes keep this pale tint.
 *
 * Every class is a full literal. Tailwind cannot see a name built at runtime.
 */

export const TAG_COLOR_OPTIONS = [
  { name: "Astral", value: "cyan" },
  { name: "Drift", value: "sky" },
  { name: "Dusk", value: "indigo" },
  { name: "Pulse", value: "violet" },
  { name: "Tide", value: "teal" },
  { name: "Ember", value: "rose" },
  { name: "Flare", value: "fuchsia" },
  { name: "Dawn", value: "pink" },
  { name: "Cinder", value: "orange" },
  { name: "Sunwake", value: "amber" },
  { name: "Gleam", value: "yellow" },
  { name: "Verdant", value: "emerald" },
  { name: "Fern", value: "lime" },
  { name: "Dune", value: "sand" },
  { name: "Whisper", value: "slate" },
  { name: "Ash", value: "zinc" },
] as const;

export type TagColorValue = (typeof TAG_COLOR_OPTIONS)[number]["value"];

export const tagColorClasses: Record<string, string> = {
  cyan: "text-cyan-300 border-cyan-300/30 shadow-cyan-300/10",
  sky: "text-sky-300 border-sky-300/30 shadow-sky-300/10",
  indigo: "text-indigo-400 border-indigo-400/30 shadow-indigo-400/10",
  violet: "text-violet-300 border-violet-300/30 shadow-violet-300/10",
  teal: "text-teal-400 border-teal-400/30 shadow-teal-400/10",
  rose: "text-rose-300 border-rose-300/30 shadow-rose-300/10",
  fuchsia: "text-fuchsia-300 border-fuchsia-300/30 shadow-fuchsia-300/10",
  pink: "text-pink-300 border-pink-300/30 shadow-pink-300/10",
  orange: "text-orange-300 border-orange-300/30 shadow-orange-300/10",
  amber: "text-amber-300 border-amber-300/30 shadow-amber-300/10",
  yellow: "text-yellow-200 border-yellow-200/30 shadow-yellow-200/10",
  emerald: "text-emerald-300 border-emerald-300/30 shadow-emerald-300/10",
  lime: "text-lime-200 border-lime-200/30 shadow-lime-200/10",
  sand: "text-orange-200 border-orange-200/30 shadow-orange-200/10",
  slate: "text-slate-300 border-slate-300/30 shadow-slate-300/10",
  zinc: "text-zinc-400 border-zinc-400/30 shadow-zinc-400/10",
};

export const tagActiveClasses: Record<string, string> = {
  cyan: "ring ring-cyan-300 shadow-[0_0_10px] shadow-cyan-400/40 bg-cyan-500/10",
  rose: "ring ring-rose-300 shadow-[0_0_10px] shadow-rose-400/40 bg-rose-500/10",
  slate: "ring ring-slate-300 shadow-[0_0_10px] shadow-slate-400/40 bg-slate-500/10",
  violet: "ring ring-violet-300 shadow-[0_0_10px] shadow-violet-400/40 bg-violet-500/10",
  emerald: "ring ring-emerald-300 shadow-[0_0_10px] shadow-emerald-400/40 bg-emerald-500/10",
  amber: "ring ring-amber-300 shadow-[0_0_10px] shadow-amber-400/40 bg-amber-500/10",
  sky: "ring ring-sky-300 shadow-[0_0_10px] shadow-sky-400/40 bg-sky-500/10",
  indigo: "ring ring-indigo-400 shadow-[0_0_10px] shadow-indigo-400/40 bg-indigo-500/10",
  teal: "ring ring-teal-400 shadow-[0_0_10px] shadow-teal-400/40 bg-teal-500/10",
  fuchsia: "ring ring-fuchsia-300 shadow-[0_0_10px] shadow-fuchsia-400/40 bg-fuchsia-500/10",
  pink: "ring ring-pink-300 shadow-[0_0_10px] shadow-pink-400/40 bg-pink-500/10",
  orange: "ring ring-orange-300 shadow-[0_0_10px] shadow-orange-400/40 bg-orange-500/10",
  yellow: "ring ring-yellow-200 shadow-[0_0_10px] shadow-yellow-300/40 bg-yellow-500/10",
  lime: "ring ring-lime-200 shadow-[0_0_10px] shadow-lime-300/40 bg-lime-500/10",
  sand: "ring ring-orange-200 shadow-[0_0_10px] shadow-orange-300/40 bg-orange-400/10",
  zinc: "ring ring-zinc-400 shadow-[0_0_10px] shadow-zinc-400/40 bg-zinc-500/10",
};

// Selected swatch. Literal strings so Tailwind emits the outline.
export const selectedColorClasses: Record<string, string> = {
  cyan: "outline outline-2 outline-offset-[3px] outline-white/90",
  rose: "outline outline-2 outline-offset-[3px] outline-white/90",
  slate: "outline outline-2 outline-offset-[3px] outline-white/90",
  violet: "outline outline-2 outline-offset-[3px] outline-white/90",
  emerald: "outline outline-2 outline-offset-[3px] outline-white/90",
  amber: "outline outline-2 outline-offset-[3px] outline-white/90",
  sky: "outline outline-2 outline-offset-[3px] outline-white/90",
  indigo: "outline outline-2 outline-offset-[3px] outline-white/90",
  teal: "outline outline-2 outline-offset-[3px] outline-white/90",
  fuchsia: "outline outline-2 outline-offset-[3px] outline-white/90",
  pink: "outline outline-2 outline-offset-[3px] outline-white/90",
  orange: "outline outline-2 outline-offset-[3px] outline-white/90",
  yellow: "outline outline-2 outline-offset-[3px] outline-white/90",
  lime: "outline outline-2 outline-offset-[3px] outline-white/90",
  sand: "outline outline-2 outline-offset-[3px] outline-white/90",
  zinc: "outline outline-2 outline-offset-[3px] outline-white/90",
};

/** Picker dot. Same tint as the chip, so the choice previews the tag. */
export const tagSwatchClasses: Record<string, string> = {
  cyan: "bg-cyan-300 shadow-[0_0_10px] shadow-cyan-300/40",
  sky: "bg-sky-300 shadow-[0_0_10px] shadow-sky-300/40",
  indigo: "bg-indigo-400 shadow-[0_0_10px] shadow-indigo-400/40",
  violet: "bg-violet-300 shadow-[0_0_10px] shadow-violet-300/40",
  teal: "bg-teal-400 shadow-[0_0_10px] shadow-teal-400/40",
  rose: "bg-rose-300 shadow-[0_0_10px] shadow-rose-300/40",
  fuchsia: "bg-fuchsia-300 shadow-[0_0_10px] shadow-fuchsia-300/40",
  pink: "bg-pink-300 shadow-[0_0_10px] shadow-pink-300/40",
  orange: "bg-orange-300 shadow-[0_0_10px] shadow-orange-300/40",
  amber: "bg-amber-300 shadow-[0_0_10px] shadow-amber-300/40",
  yellow: "bg-yellow-200 shadow-[0_0_10px] shadow-yellow-200/40",
  emerald: "bg-emerald-300 shadow-[0_0_10px] shadow-emerald-300/40",
  lime: "bg-lime-200 shadow-[0_0_10px] shadow-lime-200/40",
  sand: "bg-orange-200 shadow-[0_0_10px] shadow-orange-200/40",
  slate: "bg-slate-300 shadow-[0_0_10px] shadow-slate-300/40",
  zinc: "bg-zinc-400 shadow-[0_0_10px] shadow-zinc-400/40",
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

/**
 * Color for a new tag: whichever palette color the user has used least.
 * Ties keep palette order, so an empty list starts on Astral.
 * Colors outside the palette do not count.
 */
export function leastUsedTagColor(
  tags: readonly { color?: string | null }[]
): TagColorValue {
  const counts = new Map<string, number>();
  for (const option of TAG_COLOR_OPTIONS) counts.set(option.value, 0);
  for (const tag of tags) {
    const color = tag.color;
    if (!color || !counts.has(color)) continue;
    counts.set(color, (counts.get(color) ?? 0) + 1);
  }
  let best: TagColorValue = TAG_COLOR_OPTIONS[0].value;
  let bestCount = Number.POSITIVE_INFINITY;
  for (const option of TAG_COLOR_OPTIONS) {
    const count = counts.get(option.value) ?? 0;
    if (count < bestCount) {
      best = option.value;
      bestCount = count;
    }
  }
  return best;
}
