/**
 * Named tag colors. A chip is pale tinted text, a hairline outline, and a
 * faint glow — no solid fill — so a fully tagged page stays calm.
 *
 * The server stores color as a free string. The original six values keep
 * the dark treatment they already had. Six more fill the gaps that still
 * read as their own hue at this tint: Dusk is a true blue, Tide a deep
 * ocean teal, Flare a magenta, Cinder an orange, Fern a yellow-green,
 * and Dune a warm sand. A red sits on Ember, and a lighter teal sits on
 * Verdant, so those shades are not used.
 *
 * Both themes use these same pale classes. The light theme lightens the
 * page background, but the chips sit on the dark glass either way.
 *
 * Every class is a full literal. Tailwind cannot see a name built at runtime.
 */

export const TAG_COLOR_OPTIONS = [
  { name: "Astral", value: "cyan" },
  { name: "Dusk", value: "blue" },
  { name: "Tide", value: "teal" },
  { name: "Pulse", value: "violet" },
  { name: "Ember", value: "rose" },
  { name: "Flare", value: "fuchsia" },
  { name: "Cinder", value: "orange" },
  { name: "Sunwake", value: "amber" },
  { name: "Verdant", value: "emerald" },
  { name: "Fern", value: "lime" },
  { name: "Dune", value: "sand" },
  { name: "Whisper", value: "slate" },
] as const;

export type TagColorValue = (typeof TAG_COLOR_OPTIONS)[number]["value"];

export const tagColorClasses: Record<string, string> = {
  cyan: "text-cyan-300 border-cyan-300/30 shadow-cyan-300/10",
  blue: "text-blue-400 border-blue-400/30 shadow-blue-400/10",
  violet: "text-violet-300 border-violet-300/30 shadow-violet-300/10",
  rose: "text-rose-300 border-rose-300/30 shadow-rose-300/10",
  fuchsia: "text-fuchsia-400 border-fuchsia-400/30 shadow-fuchsia-400/10",
  orange: "text-orange-400 border-orange-400/30 shadow-orange-400/10",
  amber: "text-amber-300 border-amber-300/30 shadow-amber-300/10",
  emerald: "text-emerald-300 border-emerald-300/30 shadow-emerald-300/10",
  lime: "text-lime-200 border-lime-200/30 shadow-lime-200/10",
  sand: "text-orange-200 border-orange-200/30 shadow-orange-200/10",
  teal: "text-teal-600 border-teal-600/30 shadow-teal-600/10",
  slate: "text-slate-300 border-slate-300/30 shadow-slate-300/10",
};

export const tagActiveClasses: Record<string, string> = {
  cyan: "ring ring-cyan-300 shadow-[0_0_10px] shadow-cyan-400/40 bg-cyan-500/10",
  rose: "ring ring-rose-300 shadow-[0_0_10px] shadow-rose-400/40 bg-rose-500/10",
  slate: "ring ring-slate-300 shadow-[0_0_10px] shadow-slate-400/40 bg-slate-500/10",
  violet: "ring ring-violet-300 shadow-[0_0_10px] shadow-violet-400/40 bg-violet-500/10",
  emerald: "ring ring-emerald-300 shadow-[0_0_10px] shadow-emerald-400/40 bg-emerald-500/10",
  amber: "ring ring-amber-300 shadow-[0_0_10px] shadow-amber-400/40 bg-amber-500/10",
  blue: "ring ring-blue-400 shadow-[0_0_10px] shadow-blue-400/40 bg-blue-500/10",
  fuchsia: "ring ring-fuchsia-400 shadow-[0_0_10px] shadow-fuchsia-400/40 bg-fuchsia-500/10",
  orange: "ring ring-orange-400 shadow-[0_0_10px] shadow-orange-400/40 bg-orange-500/10",
  lime: "ring ring-lime-200 shadow-[0_0_10px] shadow-lime-300/40 bg-lime-500/10",
  sand: "ring ring-orange-200 shadow-[0_0_10px] shadow-orange-300/40 bg-orange-400/10",
  teal: "ring ring-teal-600 shadow-[0_0_10px] shadow-teal-500/40 bg-teal-500/10",
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
