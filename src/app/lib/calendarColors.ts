// Visual language for the calendar grid.
//
// Differentiation is carried by three stacked signals: the source ICON, the
// chip/token FORM, and COLOR. Color is the weakest signal by design, so non-
// event sources use a single consistent per-source accent (instantly answers
// "what kind of thing is this?"). Events are the calendar's own first-class
// objects and keep their user-chosen color. Moods render as an ambient cell
// tint via the shared mood palette (see moodColors.ts), never as a chip.
//
// All classes are fully spelled out because Tailwind v4 only emits CSS for
// class strings it can statically see (it cannot compile `bg-${x}`).

export interface SourceAccent {
  /** Icon + text color. */
  text: string;
  /** Chip surface (bg + border). */
  chip: string;
  /** Small status dot (mobile month + week rails). */
  dot: string;
}

// Per-source accents for the non-event, non-mood sources.
export const SOURCE_ACCENT: Record<"task" | "habit" | "note", SourceAccent> = {
  task: {
    text: "text-sky-300",
    chip: "bg-sky-500/10 border-sky-400/30 text-sky-200",
    dot: "bg-sky-400",
  },
  habit: {
    text: "text-amber-300",
    chip: "bg-amber-500/10 border-amber-400/30 text-amber-200",
    dot: "bg-amber-400",
  },
  note: {
    text: "text-violet-300",
    chip: "bg-violet-500/10 border-violet-400/30 text-violet-200",
    dot: "bg-violet-400",
  },
};

export interface EventColor {
  /** Spanning bar surface. */
  bar: string;
  /** Bar surface on hover. */
  barHover: string;
  /** Compact chip surface. */
  chip: string;
  /** Status dot. */
  dot: string;
  /** Accent text/icon. */
  text: string;
  /** Swatch fill for the color picker. */
  swatch: string;
}

export const EVENT_PALETTE: Record<string, EventColor> = {
  cyan: {
    bar: "bg-cyan-500/25 border-cyan-400/40 text-cyan-50",
    barHover: "hover:bg-cyan-500/40",
    chip: "bg-cyan-500/10 border-cyan-400/30 text-cyan-100",
    dot: "bg-cyan-400",
    text: "text-cyan-300",
    swatch: "bg-cyan-400",
  },
  violet: {
    bar: "bg-violet-500/25 border-violet-400/40 text-violet-50",
    barHover: "hover:bg-violet-500/40",
    chip: "bg-violet-500/10 border-violet-400/30 text-violet-100",
    dot: "bg-violet-400",
    text: "text-violet-300",
    swatch: "bg-violet-400",
  },
  rose: {
    bar: "bg-rose-500/25 border-rose-400/40 text-rose-50",
    barHover: "hover:bg-rose-500/40",
    chip: "bg-rose-500/10 border-rose-400/30 text-rose-100",
    dot: "bg-rose-400",
    text: "text-rose-300",
    swatch: "bg-rose-400",
  },
  amber: {
    bar: "bg-amber-500/25 border-amber-400/40 text-amber-50",
    barHover: "hover:bg-amber-500/40",
    chip: "bg-amber-500/10 border-amber-400/30 text-amber-100",
    dot: "bg-amber-400",
    text: "text-amber-300",
    swatch: "bg-amber-400",
  },
  emerald: {
    bar: "bg-emerald-500/25 border-emerald-400/40 text-emerald-50",
    barHover: "hover:bg-emerald-500/40",
    chip: "bg-emerald-500/10 border-emerald-400/30 text-emerald-100",
    dot: "bg-emerald-400",
    text: "text-emerald-300",
    swatch: "bg-emerald-400",
  },
  blue: {
    bar: "bg-blue-500/25 border-blue-400/40 text-blue-50",
    barHover: "hover:bg-blue-500/40",
    chip: "bg-blue-500/10 border-blue-400/30 text-blue-100",
    dot: "bg-blue-400",
    text: "text-blue-300",
    swatch: "bg-blue-400",
  },
};

export const EVENT_COLOR_TOKENS = Object.keys(EVENT_PALETTE);
export const DEFAULT_EVENT_COLOR = "cyan";

export function getEventColor(token?: string): EventColor {
  return EVENT_PALETTE[token ?? ""] ?? EVENT_PALETTE[DEFAULT_EVENT_COLOR];
}
