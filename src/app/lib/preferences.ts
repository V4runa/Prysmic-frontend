// Choices that belong to this browser, not the account.
// Login landing, clock, habit/mood rollover, and the avatar all live here.

export const PREFERENCES_KEY = "prysmic.preferences";

export const LANDING_PAGES = [
  { id: "notes", href: "/notes", label: "Notes" },
  { id: "calendar", href: "/calendar", label: "Calendar" },
  { id: "habits", href: "/habits", label: "Habits" },
  { id: "tasks", href: "/tasks", label: "Tasks" },
  { id: "moods", href: "/moods", label: "Moods" },
] as const;

export type LandingPageId = (typeof LANDING_PAGES)[number]["id"];

export type ClockFormat = "12h" | "24h";

/** Midnight through 8 AM. The default matches DAY_RESET_HOUR in date.ts. */
export const DAY_RESET_HOURS = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const;

export type DayResetHour = (typeof DAY_RESET_HOURS)[number];

export const AVATAR_COLORS = [
  { id: "cyan", label: "Cyan", face: "bg-cyan-400/20 text-cyan-50 border-cyan-200/40", swatch: "bg-cyan-300" },
  { id: "teal", label: "Teal", face: "bg-teal-400/20 text-teal-50 border-teal-200/40", swatch: "bg-teal-300" },
  { id: "violet", label: "Violet", face: "bg-violet-400/20 text-violet-50 border-violet-200/40", swatch: "bg-violet-300" },
  { id: "indigo", label: "Indigo", face: "bg-indigo-400/20 text-indigo-50 border-indigo-200/40", swatch: "bg-indigo-300" },
  { id: "amber", label: "Amber", face: "bg-amber-300/20 text-amber-50 border-amber-200/40", swatch: "bg-amber-300" },
  { id: "rose", label: "Rose", face: "bg-rose-400/20 text-rose-50 border-rose-200/40", swatch: "bg-rose-300" },
  { id: "slate", label: "Slate", face: "bg-slate-300/15 text-slate-50 border-slate-200/35", swatch: "bg-slate-300" },
] as const;

export type AvatarColorId = (typeof AVATAR_COLORS)[number]["id"];

export const AVATAR_GLYPHS = [
  { id: "spark", label: "Spark" },
  { id: "moon", label: "Moon" },
  { id: "sun", label: "Sun" },
  { id: "feather", label: "Feather" },
  { id: "leaf", label: "Leaf" },
  { id: "peak", label: "Peak" },
  { id: "compass", label: "Compass" },
  { id: "tide", label: "Tide" },
  { id: "gem", label: "Gem" },
  { id: "star", label: "Star" },
  { id: "cloud", label: "Cloud" },
  { id: "hex", label: "Hexagon" },
] as const;

export type AvatarGlyphId = (typeof AVATAR_GLYPHS)[number]["id"];

export type AvatarStyle = "monogram" | "glyph";

export interface AvatarPreference {
  style: AvatarStyle;
  color: AvatarColorId;
  glyph: AvatarGlyphId;
}

export interface Preferences {
  landingPage: LandingPageId;
  clockFormat: ClockFormat;
  dayResetHour: DayResetHour;
  avatar: AvatarPreference;
}

export const DEFAULT_AVATAR: AvatarPreference = {
  style: "monogram",
  color: "cyan",
  glyph: "spark",
};

export const DEFAULT_PREFERENCES: Preferences = {
  landingPage: "notes",
  clockFormat: "12h",
  dayResetHour: 6,
  avatar: DEFAULT_AVATAR,
};

const listeners = new Set<() => void>();

let cachedRaw: string | null = null;
let cachedPrefs: Preferences = DEFAULT_PREFERENCES;
let cacheReady = false;

function isLandingPage(value: unknown): value is LandingPageId {
  return LANDING_PAGES.some((page) => page.id === value);
}

function isClockFormat(value: unknown): value is ClockFormat {
  return value === "12h" || value === "24h";
}

export function isDayResetHour(value: unknown): value is DayResetHour {
  return typeof value === "number" && (DAY_RESET_HOURS as readonly number[]).includes(value);
}

function isAvatarColor(value: unknown): value is AvatarColorId {
  return AVATAR_COLORS.some((color) => color.id === value);
}

function isAvatarGlyph(value: unknown): value is AvatarGlyphId {
  return AVATAR_GLYPHS.some((glyph) => glyph.id === value);
}

export function parseAvatar(value: unknown): AvatarPreference {
  if (!value || typeof value !== "object" || Array.isArray(value)) return DEFAULT_AVATAR;
  const record = value as Record<string, unknown>;
  const style: AvatarStyle = record.style === "glyph" ? "glyph" : "monogram";
  return {
    style,
    color: isAvatarColor(record.color) ? record.color : DEFAULT_AVATAR.color,
    glyph: isAvatarGlyph(record.glyph) ? record.glyph : DEFAULT_AVATAR.glyph,
  };
}

export function parsePreferences(raw: string | null): Preferences {
  if (!raw) return DEFAULT_PREFERENCES;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return DEFAULT_PREFERENCES;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return DEFAULT_PREFERENCES;
  const record = value as Record<string, unknown>;
  return {
    landingPage: isLandingPage(record.landingPage) ? record.landingPage : DEFAULT_PREFERENCES.landingPage,
    clockFormat: isClockFormat(record.clockFormat) ? record.clockFormat : DEFAULT_PREFERENCES.clockFormat,
    dayResetHour: isDayResetHour(record.dayResetHour) ? record.dayResetHour : DEFAULT_PREFERENCES.dayResetHour,
    avatar: parseAvatar(record.avatar),
  };
}

function readRaw(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(PREFERENCES_KEY);
  } catch {
    return null;
  }
}

/** Stable snapshot for useSyncExternalStore. The server snapshot is the default. */
export function readPreferences(): Preferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  const raw = readRaw();
  if (cacheReady && raw === cachedRaw) return cachedPrefs;
  cachedRaw = raw;
  cachedPrefs = parsePreferences(raw);
  cacheReady = true;
  return cachedPrefs;
}

export function writePreferences(next: Preferences): Preferences {
  const stored = parsePreferences(JSON.stringify(next));
  const raw = JSON.stringify(stored);
  try {
    localStorage.setItem(PREFERENCES_KEY, raw);
  } catch {
    // Private mode can reject storage. This tab still keeps the choice in memory.
  }
  cachedRaw = raw;
  cachedPrefs = stored;
  cacheReady = true;
  listeners.forEach((listener) => listener());
  return stored;
}

export function subscribePreferences(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== PREFERENCES_KEY) return;
    cacheReady = false;
    listener();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

export function readDayResetHour(): DayResetHour {
  return readPreferences().dayResetHour;
}

export function readClockFormat(): ClockFormat {
  return readPreferences().clockFormat;
}

export function landingHref(prefs: Preferences = readPreferences()): string {
  return LANDING_PAGES.find((page) => page.id === prefs.landingPage)?.href ?? "/notes";
}

export function dayResetLabel(hour: number): string {
  if (hour === 0) return "Midnight";
  return `${hour}:00 AM`;
}

/** First letter of the username, or a question mark when the name is empty. */
export function monogramInitial(username?: string | null): string {
  const trimmed = (username ?? "").trim();
  if (!trimmed) return "?";
  const first = Array.from(trimmed)[0] ?? "?";
  return first.toLocaleUpperCase();
}

export function avatarColor(id: AvatarColorId) {
  return AVATAR_COLORS.find((color) => color.id === id) ?? AVATAR_COLORS[0];
}
