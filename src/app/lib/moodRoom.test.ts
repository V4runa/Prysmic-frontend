import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { DEFAULT_MOOD_COLOR, LEGACY_MOOD_META, MOOD_COLORS, MOOD_COLOR_VALUES } from "./moodColors";
import { tagColorClasses } from "./tagColors";
import {
  MOOD_ROOM_ALIASES,
  MOOD_ROOM_POOL,
  MOOD_ROOM_VEIL,
  moodEntryDay,
  moodShellAccent,
  msUntilNextLogicalDay,
  storedMoodColorTokens,
  todaysMoodColor,
  type MoodShellAccent,
} from "./moodRoom";

/** Tailwind steps used as rendered text. Mirrors tagColors.test.ts. */
const SHADE: Record<string, Record<string, string>> = {
  cyan: { 300: "#67e8f9" },
  blue: { 400: "#60a5fa" },
  violet: { 300: "#c4b5fd" },
  rose: { 300: "#fda4af" },
  fuchsia: { 400: "#e879f9" },
  orange: { 200: "#fed7aa", 400: "#fb923c" },
  amber: { 300: "#fcd34d" },
  emerald: { 300: "#6ee7b7" },
  lime: { 200: "#d9f99d" },
  teal: { 600: "#0d9488" },
  slate: { 300: "#cbd5e1", 400: "#94a3b8", 500: "#64748b" },
};

const NOTE_TITLE = "#f1f5f9";
const NOTE_BODY = "#cbd5e1";
const NOTE_MUTED = "#94a3b8";
const NOTE_LINK = "#67e8f9";
const PLACEHOLDER = "#64748b";

function channel(value: number): number {
  const srgb = value / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

function luminance(rgb: readonly [number, number, number]): number {
  return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
}

function hexRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function contrast(foreground: string, background: readonly [number, number, number]): number {
  const lighter = Math.max(luminance(hexRgb(foreground)), luminance(background));
  const darker = Math.min(luminance(hexRgb(foreground)), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

function over(
  background: readonly [number, number, number],
  foreground: readonly [number, number, number],
  alpha: number
): [number, number, number] {
  return [
    background[0] * (1 - alpha) + foreground[0] * alpha,
    background[1] * (1 - alpha) + foreground[1] * alpha,
    background[2] * (1 - alpha) + foreground[2] * alpha,
  ];
}

/** Center of the room: body color, then the existing dark scrim. No mood yet. */
const UNTINTED_ROOM = over([11, 12, 15], [6, 7, 10], 0.55);

function moodRgb(accent: MoodShellAccent): [number, number, number] {
  return [accent.r, accent.g, accent.b];
}

/** Where notes, tags, and buttons sit: veil only, then the glass card's white. */
function readingSurface(accent: MoodShellAccent | null): [number, number, number] {
  const washed = accent ? over(UNTINTED_ROOM, moodRgb(accent), accent.veil) : UNTINTED_ROOM;
  return over(washed, [255, 255, 255], 0.09);
}

/** Header and tab bar: veil, then the top pool, then the bar's own white. */
function headerSurface(accent: MoodShellAccent): [number, number, number] {
  const veiled = over(UNTINTED_ROOM, moodRgb(accent), accent.veil);
  const pooled = over(veiled, moodRgb(accent), accent.pool);
  return over(pooled, [255, 255, 255], 0.05);
}

function textHex(classes: string): string {
  const match = classes.match(/(?:^|\s)text-([a-z]+)-(\d+)/);
  assert.ok(match, `missing text class in ${classes}`);
  const hex = SHADE[match[1]]?.[match[2]];
  assert.ok(hex, `no rendered color for ${match[1]}-${match[2]}`);
  return hex;
}

test("every mood color token becomes one stable shell accent", () => {
  for (const token of MOOD_COLOR_VALUES) {
    const accent = moodShellAccent(token);
    assert.ok(accent, token);
    assert.equal(moodShellAccent(token), accent);
    assert.equal(moodShellAccent(` ${token.toUpperCase()} `), accent);
    assert.equal(accent.veil, MOOD_ROOM_VEIL);
    assert.equal(accent.pool, MOOD_ROOM_POOL);
    assert.ok(accent.pool > accent.veil);
    assert.ok(accent.veil < 0.05);
    assert.ok(accent.r >= 0 && accent.r <= 255);
  }
  assert.equal(moodShellAccent(null), null);
  assert.equal(moodShellAccent(""), null);
  assert.equal(moodShellAccent("   "), null);
  assert.equal(moodShellAccent("rainbow"), moodShellAccent(DEFAULT_MOOD_COLOR));
});

test("every color a mood can store resolves to a tint", () => {
  const tokens = new Set<string>([
    ...MOOD_COLOR_VALUES,
    ...Object.values(LEGACY_MOOD_META).map((meta) => meta.color),
    ...Object.values(MOOD_COLORS).map((color) => color.name.toLowerCase()),
    ...Object.keys(MOOD_ROOM_ALIASES),
    "green",
  ]);
  assert.deepEqual(new Set(storedMoodColorTokens()), tokens);
  for (const token of tokens) {
    const accent = moodShellAccent(token);
    assert.ok(accent, token);
    assert.equal(moodShellAccent(token.toUpperCase()), accent);
  }
  const green = moodShellAccent("green");
  assert.ok(green);
  assert.ok(green.g > green.r && green.g > green.b);
  assert.notEqual(green, moodShellAccent("rose"));
  assert.notEqual(green, moodShellAccent("emerald"));
  assert.equal(moodShellAccent("gold"), moodShellAccent("yellow"));
  const painted = moodShellAccent("#22c55e");
  assert.ok(painted);
  assert.equal(painted.r, 34);
  assert.equal(painted.g, 197);
  assert.equal(painted.b, 94);
  assert.equal(moodShellAccent("#22c55e"), painted);
});

test("today's mood color follows the logical day and the stored color", () => {
  const entries = [
    { date: "2026-11-18", color: "amber", moodType: "Joyful" },
    { date: "2026-11-19", color: "rose", moodType: "Calm" },
  ];
  assert.equal(todaysMoodColor(entries, "2026-11-19"), "rose");
  assert.equal(todaysMoodColor(entries, "2026-11-18"), "amber");
  assert.equal(todaysMoodColor(entries, "2026-11-17"), null);
  assert.equal(todaysMoodColor([], "2026-11-19"), null);

  assert.equal(
    todaysMoodColor([{ date: "2026-11-19", moodType: "joyful" }], "2026-11-19"),
    "amber"
  );
  assert.equal(
    todaysMoodColor(
      [{ date: "2026-11-19", color: "violet", moodType: "joyful" }],
      "2026-11-19"
    ),
    "violet"
  );
  assert.equal(
    moodShellAccent(todaysMoodColor([{ date: "2026-11-19", color: "nope" }], "2026-11-19")),
    moodShellAccent(DEFAULT_MOOD_COLOR)
  );
  assert.equal(
    moodShellAccent(todaysMoodColor([{ date: "2026-11-19", color: "green", moodType: "Satisfied" }], "2026-11-19")),
    moodShellAccent("green")
  );

  const newer = todaysMoodColor(
    [
      { date: "2026-11-19", color: "slate" },
      { date: "2026-11-19T18:00:00", color: "emerald" },
    ],
    "2026-11-19"
  );
  assert.equal(newer, "emerald");
});

test("a date-only mood stays on that day, and a timestamp uses the local day", () => {
  assert.equal(moodEntryDay("2026-11-19"), "2026-11-19");
  assert.equal(moodEntryDay(""), "");
  assert.equal(moodEntryDay("not-a-date"), "");
  const afternoon = new Date(2026, 10, 19, 15, 0, 0);
  assert.equal(moodEntryDay(afternoon.toISOString()), "2026-11-19");
});

test("the room light ends at the rollover hour", () => {
  const early = new Date(2026, 10, 19, 2, 0, 0);
  const boundary = new Date(2026, 10, 19, 6, 0, 0);
  const later = new Date(2026, 10, 19, 10, 30, 0);
  assert.equal(msUntilNextLogicalDay(early, 6), 4 * 60 * 60 * 1000);
  assert.equal(msUntilNextLogicalDay(boundary, 6), 24 * 60 * 60 * 1000);
  assert.equal(msUntilNextLogicalDay(later, 6), (19 * 60 + 30) * 60 * 1000);
  assert.equal(msUntilNextLogicalDay(later, 0), (13 * 60 + 30) * 60 * 1000);
  assert.equal(msUntilNextLogicalDay(early, 99), msUntilNextLogicalDay(early, 6));
});

test("note text, tags, and header type keep their contrast under every mood", () => {
  const plain = readingSurface(null);
  for (const token of storedMoodColorTokens()) {
    const accent = moodShellAccent(token);
    assert.ok(accent);
    const card = readingSurface(accent);
    const header = headerSurface(accent);

    assert.ok(contrast(NOTE_BODY, card) >= 10, `${token} note body ${contrast(NOTE_BODY, card)}`);
    assert.ok(contrast(NOTE_TITLE, card) >= 13, `${token} title`);
    assert.ok(contrast(NOTE_MUTED, card) >= 5.6, `${token} muted ${contrast(NOTE_MUTED, card)}`);
    assert.ok(contrast(NOTE_LINK, card) >= 9.5, `${token} link`);
    assert.ok(contrast(NOTE_TITLE, header) >= 8, `${token} header title`);
    assert.ok(contrast(NOTE_MUTED, header) >= 4.5, `${token} header account line ${contrast(NOTE_MUTED, header)}`);
    assert.ok(contrast(NOTE_LINK, header) >= 4.5, `${token} header link`);

    const placeholderNow = contrast(PLACEHOLDER, card);
    const placeholderWas = contrast(PLACEHOLDER, plain);
    assert.ok(
      placeholderNow >= placeholderWas - 0.35,
      `${token} placeholder ${placeholderNow} vs ${placeholderWas}`
    );

    for (const [name, classes] of Object.entries(tagColorClasses)) {
      const hex = textHex(classes);
      const now = contrast(hex, card);
      const was = contrast(hex, plain);
      const floor = was >= 4.5 ? 4.5 : was - 0.22;
      assert.ok(now >= floor, `${token} tag ${name} ${now.toFixed(2)} vs ${was.toFixed(2)} floor ${floor.toFixed(2)}`);
    }
  }
});

test("the wash is a flat gradient and the flame pulse is untouched", () => {
  const css = readFileSync(new URL("../globals.css", import.meta.url), "utf8");
  const start = css.indexOf("Today's mood, as room light.");
  const end = css.indexOf("Reveal hover-gated affordances", start);
  assert.ok(start > 0 && end > start);
  const section = css.slice(start, end);
  assert.equal(section.includes("backdrop-filter"), false);
  assert.equal(section.includes("blur("), false);
  assert.match(section, /var\(--mood-room-veil\)/);
  assert.match(section, /var\(--mood-room-pool\)/);
  assert.match(section, /transparent 68%/);

  const shell = readFileSync(new URL("../components/AppShell.tsx", import.meta.url), "utf8");
  assert.match(shell, /useMoodRoom/);
  assert.match(shell, /mood-room-wash/);
  assert.match(
    shell,
    /<h1 className="shrink-0 cursor-default text-lg font-bold leading-none tracking-wide sm:text-xl">\s*Prysmic\s*<\/h1>/
  );

  const flame = readFileSync(new URL("../components/MoodTimeline.tsx", import.meta.url), "utf8");
  assert.match(flame, /scale: \[1, 1\.08, 1\]/);
  assert.match(flame, /duration: 3\.8/);
});
