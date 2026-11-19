import { DAY_RESET_HOUR, localDateKey } from "./date";
import {
  DEFAULT_MOOD_COLOR,
  LEGACY_MOOD_META,
  MOOD_COLORS,
  MOOD_COLOR_VALUES,
  resolveMoodVisual,
} from "./moodColors";

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

// Mid-tones of the mood palette, plus `green`. The picker stores `emerald`
// for its green swatch. Older entries, including Satisfied, store `green`.
const ROOM_RGB: Record<string, readonly [number, number, number]> = {
  amber: [251, 191, 36],
  cyan: [34, 211, 238],
  blue: [96, 165, 250],
  violet: [167, 139, 250],
  rose: [251, 113, 133],
  emerald: [52, 211, 153],
  green: [34, 197, 94],
  yellow: [250, 204, 21],
  slate: [148, 163, 184],
  red: [248, 113, 113],
  fuchsia: [232, 121, 249],
};

/**
 * Names a stored mood can carry that are not picker keys. Each one points at
 * a room color above. The backend keeps `color` as free text, and older
 * clients wrote Tailwind names and the picker's display names.
 */
export const MOOD_ROOM_ALIASES: Record<string, string> = {
  green: "green",
  lime: "green",
  mint: "emerald",
  teal: "cyan",
  sky: "cyan",
  indigo: "blue",
  purple: "violet",
  pink: "rose",
  orange: "amber",
  gold: "yellow",
  gray: "slate",
  grey: "slate",
};

/** Picker tokens, legacy colors, display names, and known stored aliases. */
export function storedMoodColorTokens(): string[] {
  const tokens = new Set<string>([
    ...MOOD_COLOR_VALUES,
    ...Object.values(LEGACY_MOOD_META).map((meta) => meta.color),
    ...Object.values(MOOD_COLORS).map((color) => color.name.toLowerCase()),
    ...Object.keys(MOOD_ROOM_ALIASES),
  ]);
  return [...tokens];
}

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

const hexAccents = new Map<string, MoodShellAccent>();

function accentFromHex(token: string): MoodShellAccent | null {
  const match = /^#([0-9a-f]{6})$/i.exec(token);
  if (!match) return null;
  const key = match[1].toLowerCase();
  const cached = hexAccents.get(key);
  if (cached) return cached;
  const value = Number.parseInt(key, 16);
  const accent = buildAccent([(value >> 16) & 255, (value >> 8) & 255, value & 255]);
  hexAccents.set(key, accent);
  return accent;
}

function canonicalRoomToken(token: string): string | null {
  if (ACCENTS[token]) return token;
  const alias = MOOD_ROOM_ALIASES[token];
  if (alias && ACCENTS[alias]) return alias;
  const named = Object.entries(MOOD_COLORS).find(
    ([, color]) => color.name.toLowerCase() === token
  );
  return named ? named[0] : null;
}

/**
 * Map a stored mood color to shell accent values.
 * A blank token means no mood, so the room stays as it is. A known picker
 * token, legacy color, alias (`green`, `gold`, …), or hex is used as-is.
 * Anything else still tints, using the same default the mood UI already
 * paints for an unrecognized token. The same input always returns the same object.
 */
export function moodShellAccent(colorToken: string | null | undefined): MoodShellAccent | null {
  if (!colorToken) return null;
  const token = colorToken.trim().toLowerCase();
  if (!token) return null;
  const canonical = canonicalRoomToken(token);
  if (canonical) return ACCENTS[canonical];
  return accentFromHex(token) ?? ACCENTS[DEFAULT_MOOD_COLOR];
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
