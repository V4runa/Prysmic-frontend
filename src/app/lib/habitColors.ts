/**
 * Static Tailwind class sets per habit color.
 *
 * Tailwind v4 only ships classes it can see as complete strings at build time,
 * so the previous `bg-${color}-400/5` template strings never generated any CSS
 * (habit colors silently fell back to nothing). These fully-spelled maps fix
 * that and give each habit a coherent, glowing identity.
 */

export interface HabitColor {
  /** Particle color for the celebratory burst. */
  spark: string;
  /** Card surface when not yet checked today. */
  cardIdle: string;
  /** Card surface once checked today. */
  cardChecked: string;
  /** Burst glow + ring used on check-in. */
  burstGlow: string;
  burstRing: string;
  /** Icon + accent text. */
  icon: string;
  iconMuted: string;
  flame: string;
  streakText: string;
  /** Check button (idle circle). */
  checkBorder: string;
  checkHover: string;
  /** Detail page accents. */
  detailIconBg: string;
  detailPanel: string;
  streakTextMuted: string;
  flameMuted: string;
}

const cyan: HabitColor = {
  spark: "rgb(103, 232, 249)",
  cardIdle: "bg-cyan-400/5 border-cyan-400/20",
  cardChecked: "bg-cyan-900/20 border-cyan-500/20 saturate-50 ring-2 ring-cyan-300/40",
  burstGlow: "bg-cyan-300/20",
  burstRing: "border-cyan-400/40",
  icon: "text-cyan-300",
  iconMuted: "text-cyan-400/50",
  flame: "text-cyan-400",
  streakText: "text-cyan-300",
  checkBorder: "border-cyan-300/30",
  checkHover: "hover:bg-cyan-400/10",
  detailIconBg: "bg-cyan-500/10",
  detailPanel: "bg-cyan-500/5",
  streakTextMuted: "text-cyan-300/70",
  flameMuted: "text-cyan-400/70",
};

const violet: HabitColor = {
  spark: "rgb(196, 181, 253)",
  cardIdle: "bg-violet-400/5 border-violet-400/20",
  cardChecked: "bg-violet-900/20 border-violet-500/20 saturate-50 ring-2 ring-violet-300/40",
  burstGlow: "bg-violet-300/20",
  burstRing: "border-violet-400/40",
  icon: "text-violet-300",
  iconMuted: "text-violet-400/50",
  flame: "text-violet-400",
  streakText: "text-violet-300",
  checkBorder: "border-violet-300/30",
  checkHover: "hover:bg-violet-400/10",
  detailIconBg: "bg-violet-500/10",
  detailPanel: "bg-violet-500/5",
  streakTextMuted: "text-violet-300/70",
  flameMuted: "text-violet-400/70",
};

const rose: HabitColor = {
  spark: "rgb(253, 164, 175)",
  cardIdle: "bg-rose-400/5 border-rose-400/20",
  cardChecked: "bg-rose-900/20 border-rose-500/20 saturate-50 ring-2 ring-rose-300/40",
  burstGlow: "bg-rose-300/20",
  burstRing: "border-rose-400/40",
  icon: "text-rose-300",
  iconMuted: "text-rose-400/50",
  flame: "text-rose-400",
  streakText: "text-rose-300",
  checkBorder: "border-rose-300/30",
  checkHover: "hover:bg-rose-400/10",
  detailIconBg: "bg-rose-500/10",
  detailPanel: "bg-rose-500/5",
  streakTextMuted: "text-rose-300/70",
  flameMuted: "text-rose-400/70",
};

const amber: HabitColor = {
  spark: "rgb(252, 211, 77)",
  cardIdle: "bg-amber-400/5 border-amber-400/20",
  cardChecked: "bg-amber-900/20 border-amber-500/20 saturate-50 ring-2 ring-amber-300/40",
  burstGlow: "bg-amber-300/20",
  burstRing: "border-amber-400/40",
  icon: "text-amber-300",
  iconMuted: "text-amber-400/50",
  flame: "text-amber-400",
  streakText: "text-amber-300",
  checkBorder: "border-amber-300/30",
  checkHover: "hover:bg-amber-400/10",
  detailIconBg: "bg-amber-500/10",
  detailPanel: "bg-amber-500/5",
  streakTextMuted: "text-amber-300/70",
  flameMuted: "text-amber-400/70",
};

const emerald: HabitColor = {
  spark: "rgb(110, 231, 183)",
  cardIdle: "bg-emerald-400/5 border-emerald-400/20",
  cardChecked: "bg-emerald-900/20 border-emerald-500/20 saturate-50 ring-2 ring-emerald-300/40",
  burstGlow: "bg-emerald-300/20",
  burstRing: "border-emerald-400/40",
  icon: "text-emerald-300",
  iconMuted: "text-emerald-400/50",
  flame: "text-emerald-400",
  streakText: "text-emerald-300",
  checkBorder: "border-emerald-300/30",
  checkHover: "hover:bg-emerald-400/10",
  detailIconBg: "bg-emerald-500/10",
  detailPanel: "bg-emerald-500/5",
  streakTextMuted: "text-emerald-300/70",
  flameMuted: "text-emerald-400/70",
};

const blue: HabitColor = {
  spark: "rgb(147, 197, 253)",
  cardIdle: "bg-blue-400/5 border-blue-400/20",
  cardChecked: "bg-blue-900/20 border-blue-500/20 saturate-50 ring-2 ring-blue-300/40",
  burstGlow: "bg-blue-300/20",
  burstRing: "border-blue-400/40",
  icon: "text-blue-300",
  iconMuted: "text-blue-400/50",
  flame: "text-blue-400",
  streakText: "text-blue-300",
  checkBorder: "border-blue-300/30",
  checkHover: "hover:bg-blue-400/10",
  detailIconBg: "bg-blue-500/10",
  detailPanel: "bg-blue-500/5",
  streakTextMuted: "text-blue-300/70",
  flameMuted: "text-blue-400/70",
};

const habitColors: Record<string, HabitColor> = {
  cyan,
  violet,
  rose,
  amber,
  emerald,
  blue,
};

export function getHabitColor(color?: string): HabitColor {
  return habitColors[color ?? "cyan"] ?? cyan;
}
