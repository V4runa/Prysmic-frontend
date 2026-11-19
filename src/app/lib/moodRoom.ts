import { DAY_RESET_HOUR, localDateKey } from "./date";
import { resolveMoodVisual } from "./moodColors";

/**
 * Today's mood, as light in the room.
 *
 * Pure values: no DOM, no CSS, no storage. A React Native shell can paint the
 * same channels and alphas. The web shell only turns them into a wash behind
 * the page and a faint edge on the header and tab bar.
 *
 * The veil is the only color that reaches the reading surface. The pools sit
 * at the top and bottom and fade out before the middle of the page. Alphas
 * stay low so note text, tags, and buttons keep the contrast they have now.
 */

export type MoodDayEntry = {
  date?: string | null;
  color?: string | null;
  moodType?: string | null;
  emoji?: string | null;
};

export type MoodShellAccent = {
  /** Mood hue, 0–255. */
  r: number;
  g: number;
  b: number;
  /** Even film over the whole room, including behind cards. */
  veil: number;
  /** Light pooled above the page, behind the header. */
  pool: number;
  /** Light pooled under the page, behind the phone tab bar. */
  poolBottom: number;
  /** Hairline on the header and tab bar. */
  edge: number;
  /** Soft inset glow on the header and tab bar. Not a solid fill. */
  chrome: number;
};

/** Tuned so a yellow mood, the brightest, still leaves text readable. */
export const MOOD_ROOM_VEIL = 0.024;
export const MOOD_ROOM_POOL = 0.16;
export const MOOD_ROOM_POOL_BOTTOM = 0.1;
export const MOOD_ROOM_EDGE = 0.5;
export const MOOD_ROOM_CHROME = 0.4;

// Mid-tones of the mood palette. Same tokens as MOOD_COLORS.
const ROOM_RGB: Record<string, readonly [number, number, number]> = {
  amber: [251, 191, 36],
  cyan: [34, 211, 238],
  blue: [96, 165, 250],
  violet: [167, 139, 250],
  rose: [251, 113, 133],
  emerald: [52, 211, 153],
  yellow: [250, 204, 21],
  slate: [148, 163, 184],
  red: [248, 113, 113],
  fuchsia: [232, 121, 249],
};

function buildAccent(rgb: readonly [number, number, number]): MoodShellAccent {
  return {
    r: rgb[0],
    g: rgb[1],
    b: rgb[2],
    veil: MOOD_ROOM_VEIL,
    pool: MOOD_ROOM_POOL,
    poolBottom: MOOD_ROOM_POOL_BOTTOM,
    edge: MOOD_ROOM_EDGE,
    chrome: MOOD_ROOM_CHROME,
  };
}

const ACCENTS: Record<string, MoodShellAccent> = Object.fromEntries(
  Object.entries(ROOM_RGB).map(([token, rgb]) => [token, buildAccent(rgb)])
);

/**
 * Map a stored mood color token to shell accent values.
 * Unknown or empty tokens return null — the room stays as it is.
 * The same token always returns the same object.
 */
export function moodShellAccent(colorToken: string | null | undefined): MoodShellAccent | null {
  if (!colorToken) return null;
  return ACCENTS[colorToken.trim().toLowerCase()] ?? null;
}

/** The calendar day a mood entry belongs to, or "" when the date is unusable. */
export function moodEntryDay(date: string | null | undefined): string {
  if (!date) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  return localDateKey(parsed);
}

/**
 * Color token for the logical day, or null when that day has no mood.
 * A stored color wins. Older entries with only a mood name use the same
 * legacy color the timeline already shows. The newest entry wins if a day
 * somehow has more than one.
 */
export function todaysMoodColor(
  entries: readonly MoodDayEntry[],
  logicalDay: string
): string | null {
  if (!logicalDay) return null;
  const matches = entries
    .map((entry, index) => ({ entry, index, day: moodEntryDay(entry.date) }))
    .filter((item) => item.day === logicalDay);
  if (matches.length === 0) return null;
  matches.sort((a, b) => {
    const byDate = (b.entry.date ?? "").localeCompare(a.entry.date ?? "");
    if (byDate !== 0) return byDate;
    return a.index - b.index;
  });
  const chosen = matches[0].entry;
  const color = resolveMoodVisual({
    moodType: chosen.moodType ?? undefined,
    emoji: chosen.emoji ?? undefined,
    color: chosen.color ?? undefined,
  })
    .color.trim()
    .toLowerCase();
  return color || null;
}

function resetHour(hour: number): number {
  if (!Number.isInteger(hour) || hour < 0 || hour > 8) return DAY_RESET_HOUR;
  return hour;
}

/**
 * Milliseconds until the next logical-day boundary. Used so a room tint
 * ends when the day rolls over, even if the tab stays open.
 */
export function msUntilNextLogicalDay(now: Date, hour = DAY_RESET_HOUR): number {
  const next = new Date(now.getTime());
  next.setHours(resetHour(hour), 0, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}
