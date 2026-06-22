// Shared mood color palette. Mood options/entries store a color *token*
// (e.g. "amber") and the UI resolves it to fully-spelled Tailwind classes here.
// Classes must be literal strings so Tailwind v4 can see them at build time
// (it cannot compile `bg-${color}`).

export interface MoodColorDef {
  /** Friendly name shown in the color picker. */
  name: string;
  /** Picker tile gradient, used as `bg-gradient-to-br ${gradient}`. */
  gradient: string;
  /** Reflection screen background glow. */
  glow: string;
  /** Reflection submit button. */
  btn: string;
  /** Timeline line/dot/label/card classes. */
  lineTop: string;
  lineBottom: string;
  dot: string;
  label: string;
  cardHover: string;
}

export const MOOD_COLORS: Record<string, MoodColorDef> = {
  amber: {
    name: "Amber",
    gradient: "from-amber-300 to-orange-500",
    glow: "bg-amber-500/20",
    btn: "border-amber-400/30 bg-amber-500/10 hover:bg-amber-400/20",
    lineTop: "bg-gradient-to-b from-amber-400/50 to-transparent",
    lineBottom: "bg-gradient-to-t from-amber-400/40 to-transparent",
    dot: "border-amber-300/40 bg-amber-400/70",
    label: "text-amber-300",
    cardHover: "hover:shadow-amber-500/30",
  },
  cyan: {
    name: "Cyan",
    gradient: "from-cyan-300 to-blue-600",
    glow: "bg-cyan-500/20",
    btn: "border-cyan-400/30 bg-cyan-500/10 hover:bg-cyan-400/20",
    lineTop: "bg-gradient-to-b from-cyan-400/50 to-transparent",
    lineBottom: "bg-gradient-to-t from-cyan-400/40 to-transparent",
    dot: "border-cyan-300/40 bg-cyan-400/70",
    label: "text-cyan-300",
    cardHover: "hover:shadow-cyan-500/30",
  },
  blue: {
    name: "Blue",
    gradient: "from-sky-400 to-indigo-700",
    glow: "bg-blue-500/20",
    btn: "border-blue-400/30 bg-blue-500/10 hover:bg-blue-400/20",
    lineTop: "bg-gradient-to-b from-blue-400/50 to-transparent",
    lineBottom: "bg-gradient-to-t from-blue-400/40 to-transparent",
    dot: "border-blue-300/40 bg-blue-400/70",
    label: "text-blue-300",
    cardHover: "hover:shadow-blue-500/30",
  },
  violet: {
    name: "Violet",
    gradient: "from-violet-400 to-indigo-700",
    glow: "bg-violet-500/20",
    btn: "border-violet-400/30 bg-violet-500/10 hover:bg-violet-400/20",
    lineTop: "bg-gradient-to-b from-violet-400/50 to-transparent",
    lineBottom: "bg-gradient-to-t from-violet-400/40 to-transparent",
    dot: "border-violet-300/40 bg-violet-400/70",
    label: "text-violet-300",
    cardHover: "hover:shadow-violet-500/30",
  },
  rose: {
    name: "Rose",
    gradient: "from-rose-300 to-red-600",
    glow: "bg-rose-500/20",
    btn: "border-rose-400/30 bg-rose-500/10 hover:bg-rose-400/20",
    lineTop: "bg-gradient-to-b from-rose-400/50 to-transparent",
    lineBottom: "bg-gradient-to-t from-rose-400/40 to-transparent",
    dot: "border-rose-300/40 bg-rose-400/70",
    label: "text-rose-300",
    cardHover: "hover:shadow-rose-500/30",
  },
  emerald: {
    name: "Emerald",
    gradient: "from-emerald-300 to-teal-600",
    glow: "bg-emerald-500/20",
    btn: "border-emerald-400/30 bg-emerald-500/10 hover:bg-emerald-400/20",
    lineTop: "bg-gradient-to-b from-emerald-400/50 to-transparent",
    lineBottom: "bg-gradient-to-t from-emerald-400/40 to-transparent",
    dot: "border-emerald-300/40 bg-emerald-400/70",
    label: "text-emerald-300",
    cardHover: "hover:shadow-emerald-500/30",
  },
  yellow: {
    name: "Gold",
    gradient: "from-yellow-300 to-amber-500",
    glow: "bg-yellow-500/20",
    btn: "border-yellow-400/30 bg-yellow-500/10 hover:bg-yellow-400/20",
    lineTop: "bg-gradient-to-b from-yellow-400/50 to-transparent",
    lineBottom: "bg-gradient-to-t from-yellow-400/40 to-transparent",
    dot: "border-yellow-300/40 bg-yellow-400/70",
    label: "text-yellow-300",
    cardHover: "hover:shadow-yellow-500/30",
  },
  slate: {
    name: "Slate",
    gradient: "from-slate-400 to-slate-700",
    glow: "bg-slate-500/20",
    btn: "border-slate-400/30 bg-slate-500/10 hover:bg-slate-400/20",
    lineTop: "bg-gradient-to-b from-slate-400/50 to-transparent",
    lineBottom: "bg-gradient-to-t from-slate-400/40 to-transparent",
    dot: "border-slate-300/40 bg-slate-400/70",
    label: "text-slate-300",
    cardHover: "hover:shadow-slate-500/30",
  },
  red: {
    name: "Red",
    gradient: "from-red-400 to-orange-600",
    glow: "bg-red-500/20",
    btn: "border-red-400/30 bg-red-500/10 hover:bg-red-400/20",
    lineTop: "bg-gradient-to-b from-red-400/50 to-transparent",
    lineBottom: "bg-gradient-to-t from-red-400/40 to-transparent",
    dot: "border-red-300/40 bg-red-400/70",
    label: "text-red-300",
    cardHover: "hover:shadow-red-500/30",
  },
  fuchsia: {
    name: "Fuchsia",
    gradient: "from-fuchsia-300 to-violet-600",
    glow: "bg-fuchsia-500/20",
    btn: "border-fuchsia-400/30 bg-fuchsia-500/10 hover:bg-fuchsia-400/20",
    lineTop: "bg-gradient-to-b from-fuchsia-400/50 to-transparent",
    lineBottom: "bg-gradient-to-t from-fuchsia-400/40 to-transparent",
    dot: "border-fuchsia-300/40 bg-fuchsia-400/70",
    label: "text-fuchsia-300",
    cardHover: "hover:shadow-fuchsia-500/30",
  },
};

export const MOOD_COLOR_VALUES = Object.keys(MOOD_COLORS);
export const DEFAULT_MOOD_COLOR = "cyan";

export function moodColor(token?: string): MoodColorDef {
  return MOOD_COLORS[token ?? ""] ?? MOOD_COLORS[DEFAULT_MOOD_COLOR];
}

// Legacy mapping for mood entries logged before custom moods existed (their
// `moodType` is a lowercase key and they have no stored color). Lets the
// timeline render them with the right color and a nicely-cased label.
export const LEGACY_MOOD_META: Record<
  string,
  { color: string; emoji: string; label: string }
> = {
  joyful: { color: "amber", emoji: "☀️", label: "Joyful" },
  calm: { color: "cyan", emoji: "🌊", label: "Calm" },
  focused: { color: "blue", emoji: "🎯", label: "Focused" },
  tired: { color: "violet", emoji: "🌙", label: "Tired" },
  anxious: { color: "rose", emoji: "🌪️", label: "Anxious" },
  inspired: { color: "emerald", emoji: "🔮", label: "Inspired" },
  grateful: { color: "yellow", emoji: "🕊️", label: "Grateful" },
  lonely: { color: "slate", emoji: "🌫️", label: "Lonely" },
  angry: { color: "red", emoji: "🔥", label: "Angry" },
  hopeful: { color: "fuchsia", emoji: "🌈", label: "Hopeful" },
};

/**
 * Resolve how a mood entry should look, preferring its own snapshot fields and
 * falling back to the legacy map for older entries.
 */
export function resolveMoodVisual(entry: {
  moodType?: string;
  emoji?: string;
  color?: string;
}): { color: string; emoji: string; label: string; classes: MoodColorDef } {
  const legacy = LEGACY_MOOD_META[(entry.moodType ?? "").toLowerCase()];
  const color = entry.color || legacy?.color || DEFAULT_MOOD_COLOR;
  const emoji = entry.emoji || legacy?.emoji || "🌫️";
  const label = legacy?.label || entry.moodType?.trim() || "Mood";
  return { color, emoji, label, classes: moodColor(color) };
}
