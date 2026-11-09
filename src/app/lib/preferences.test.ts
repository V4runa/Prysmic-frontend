import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { formatClock } from "../calendar/lib/calendarLib";
import {
  DEFAULT_PREFERENCES,
  PREFERENCES_KEY,
  dayResetLabel,
  landingHref,
  monogramInitial,
  parsePreferences,
  readPreferences,
  writePreferences,
} from "./preferences";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
    removeItem(key: string) {
      map.delete(key);
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
  };
}

test("a missing or broken preference record stays on the defaults", () => {
  assert.deepEqual(parsePreferences(null), DEFAULT_PREFERENCES);
  assert.equal(parsePreferences("{").landingPage, "notes");
  assert.equal(parsePreferences("[]").clockFormat, "12h");
  const partial = parsePreferences(
    JSON.stringify({ landingPage: "calendar", clockFormat: "24h", dayResetHour: 0, avatar: { style: "nope", color: "rose" } })
  );
  assert.equal(partial.landingPage, "calendar");
  assert.equal(partial.clockFormat, "24h");
  assert.equal(partial.dayResetHour, 0);
  assert.equal(partial.avatar.style, "monogram");
  assert.equal(partial.avatar.color, "rose");
  assert.equal(partial.avatar.glyph, "spark");
  assert.equal(dayResetLabel(0), "Midnight");
  assert.equal(dayResetLabel(6), "6:00 AM");
  assert.equal(landingHref(partial), "/calendar");
  assert.equal(monogramInitial(" ada"), "A");
  assert.equal(monogramInitial(""), "?");
});

test("preferences round-trip in local storage and clocks follow the saved format", () => {
  const local = memoryStorage();
  const hadWindow = "window" in globalThis;
  const previousWindow = globalThis.window;
  const hadStorage = "localStorage" in globalThis;
  const previousStorage = globalThis.localStorage;
  Object.defineProperty(globalThis, "localStorage", { value: local, configurable: true });
  Object.defineProperty(globalThis, "window", { value: globalThis, configurable: true });
  try {
  assert.equal(readPreferences().dayResetHour, 6);
  const stored = writePreferences({
    ...DEFAULT_PREFERENCES,
    clockFormat: "24h",
    dayResetHour: 2,
    avatar: { style: "glyph", color: "violet", glyph: "moon" },
  });
  assert.equal(stored.clockFormat, "24h");
  assert.equal(local.getItem(PREFERENCES_KEY)?.includes("\"moon\""), true);
  assert.equal(readPreferences().avatar.glyph, "moon");
  assert.equal(formatClock("21:05:00"), "9:05 PM");
  assert.equal(formatClock("21:05:00", "24h"), "21:05");
  assert.equal(formatClock("00:00:00", "12h"), "12:00 AM");
  assert.equal(formatClock("12:00:00", "24h"), "12:00");
  assert.equal(formatClock(null, "24h"), "");
  } finally {
    if (hadWindow) {
      Object.defineProperty(globalThis, "window", { value: previousWindow, configurable: true });
    } else {
      delete (globalThis as { window?: Window }).window;
    }
    if (hadStorage) {
      Object.defineProperty(globalThis, "localStorage", { value: previousStorage, configurable: true });
    } else {
      delete (globalThis as { localStorage?: Storage }).localStorage;
    }
  }
});

test("calendar clocks and habit days read the saved preference", () => {
  for (const file of ["WeekView.tsx", "DayAgenda.tsx", "MonthView.tsx"]) {
    const source = readFileSync(new URL(`../calendar/components/${file}`, import.meta.url), "utf8");
    assert.match(source, /usePreferences/);
    assert.match(source, /formatClock\([\s\S]*clockFormat/);
  }
  for (const file of [
    "../habits/page.tsx",
    "../habits/[id]/page.tsx",
    "../moods/page.tsx",
    "../components/MoodTimeline.tsx",
    "../calendar/components/DayMoodEditor.tsx",
  ]) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.match(source, /useLogicalToday/);
  }
  const settings = readFileSync(new URL("../settings/page.tsx", import.meta.url), "utf8");
  assert.match(settings, /\/auth\/password\/change/);
  assert.match(settings, /\/users\/\$\{userId\}/);
  assert.match(settings, /\/auth\/email\/resend/);
  assert.match(settings, /\/auth\/password-policy/);
  assert.equal(settings.includes("applyAuthSession"), true);
  const profile = settings.slice(settings.indexOf("function ProfileSection"), settings.indexOf("function SecuritySection"));
  assert.equal(profile.includes("applyAuthSession"), false);
});
