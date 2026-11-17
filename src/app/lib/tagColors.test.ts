import assert from "node:assert/strict";
import test from "node:test";
import {
  TAG_COLOR_OPTIONS,
  leastUsedTagColor,
  selectedColorClasses,
  tagActiveClasses,
  tagColorClasses,
  tagColorKey,
  tagSwatchClasses,
  tagTone,
} from "./tagColors";

const ORIGINAL_DARK = {
  cyan: "text-cyan-300 border-cyan-300/30 shadow-cyan-300/10",
  rose: "text-rose-300 border-rose-300/30 shadow-rose-300/10",
  slate: "text-slate-300 border-slate-300/30 shadow-slate-300/10",
  violet: "text-violet-300 border-violet-300/30 shadow-violet-300/10",
  emerald: "text-emerald-300 border-emerald-300/30 shadow-emerald-300/10",
  amber: "text-amber-300 border-amber-300/30 shadow-amber-300/10",
} as const;

/** Tailwind default palette steps used by the tag chips. */
const SHADE: Record<string, Record<string, string>> = {
  cyan: { 300: "#67e8f9", 600: "#0891b2", 700: "#0e7490", 800: "#155e75" },
  sky: { 300: "#7dd3fc", 600: "#0284c7", 700: "#0369a1" },
  indigo: { 400: "#818cf8", 500: "#6366f1", 700: "#4338ca" },
  violet: { 300: "#c4b5fd", 500: "#8b5cf6", 700: "#6d28d9" },
  teal: { 400: "#2dd4bf", 600: "#0d9488", 800: "#115e59" },
  rose: { 300: "#fda4af", 500: "#f43f5e", 700: "#be123c" },
  fuchsia: { 300: "#f0abfc", 500: "#d946ef", 700: "#a21caf" },
  pink: { 300: "#f9a8d4", 500: "#ec4899", 700: "#be185d" },
  orange: { 200: "#fed7aa", 300: "#fdba74" },
  amber: { 300: "#fcd34d" },
  yellow: { 200: "#fef08a" },
  emerald: { 300: "#6ee7b7" },
  lime: { 200: "#d9f99d" },
  slate: { 300: "#cbd5e1" },
  zinc: { 400: "#a1a1aa" },
};

function channel(value: number): number {
  const srgb = value / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const rgb = Number.parseInt(hex.slice(1), 16);
  return (
    0.2126 * channel((rgb >> 16) & 255) +
    0.7152 * channel((rgb >> 8) & 255) +
    0.0722 * channel(rgb & 255)
  );
}

function contrast(foreground: string, background: string): number {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

function lab(hex: string): [number, number, number] {
  const rgb = [0, 2, 4].map((offset) => Number.parseInt(hex.slice(1 + offset, 3 + offset), 16));
  const [r, g, b] = rgb.map((value) => {
    const srgb = value / 255;
    return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  let x = r * 0.4124 + g * 0.3576 + b * 0.1805;
  let y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  let z = r * 0.0193 + g * 0.1192 + b * 0.9505;
  x /= 0.95047;
  y /= 1;
  z /= 1.08883;
  const pivot = (value: number) => (value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116);
  const fx = pivot(x);
  const fy = pivot(y);
  const fz = pivot(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function deltaE(a: string, b: string): number {
  const [l1, a1, b1] = lab(a);
  const [l2, a2, b2] = lab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

function shadeOf(classes: string): { family: string; step: string; hex: string } {
  const match = classes.match(/(?:^|\s)text-([a-z]+)-(\d+)/);
  assert.ok(match, `missing text class in ${classes}`);
  const family = match[1];
  const step = match[2];
  const hex = SHADE[family]?.[step];
  assert.ok(hex, `no swatch for ${family}-${step}`);
  return { family, step, hex };
}

test("the palette is sixteen colors in family order", () => {
  assert.deepEqual(
    TAG_COLOR_OPTIONS.map((color) => color.value),
    [
      "cyan",
      "sky",
      "indigo",
      "violet",
      "teal",
      "rose",
      "fuchsia",
      "pink",
      "orange",
      "amber",
      "yellow",
      "emerald",
      "lime",
      "sand",
      "slate",
      "zinc",
    ]
  );
  assert.deepEqual(
    TAG_COLOR_OPTIONS.map((color) => color.name),
    [
      "Astral",
      "Drift",
      "Dusk",
      "Pulse",
      "Tide",
      "Ember",
      "Flare",
      "Dawn",
      "Cinder",
      "Sunwake",
      "Gleam",
      "Verdant",
      "Fern",
      "Dune",
      "Whisper",
      "Ash",
    ]
  );
  assert.equal(new Set(TAG_COLOR_OPTIONS.map((color) => color.value)).size, 16);
});

test("every color keeps the pale chip treatment on the dark glass", () => {
  const ink: string[] = [];
  for (const { value } of TAG_COLOR_OPTIONS) {
    const chip = tagColorClasses[value];
    assert.equal(chip.includes("bg-"), false, value);
    assert.equal(chip.includes("light:"), false, value);
    assert.match(chip, /border-/);
    assert.match(chip, /\/30/);
    assert.match(chip, /shadow-/);
    assert.equal(chip.includes("${"), false);
    assert.match(tagActiveClasses[value], /ring /);
    assert.match(tagActiveClasses[value], /bg-[a-z]+-\d+\/10/);
    assert.match(selectedColorClasses[value], /outline /);
    assert.match(tagSwatchClasses[value], /(?:^|\s)bg-/);
    const tone = shadeOf(chip);
    // Page background, and the glass card these chips actually sit on.
    assert.ok(contrast(tone.hex, "#0b0c0f") >= 4.5, `${value} on page`);
    assert.ok(contrast(tone.hex, "#1e2327") >= 4.5, `${value} on glass`);
    ink.push(tone.hex);
  }
  for (let i = 0; i < ink.length; i += 1) {
    for (let j = i + 1; j < ink.length; j += 1) {
      const distance = deltaE(ink[i], ink[j]);
      assert.ok(
        distance >= 16,
        `${TAG_COLOR_OPTIONS[i].value} and ${TAG_COLOR_OPTIONS[j].value} are too close (${distance.toFixed(1)})`
      );
    }
  }
});

test("the original six colors keep their dark chip classes", () => {
  for (const [value, classes] of Object.entries(ORIGINAL_DARK)) {
    assert.equal(tagColorClasses[value].startsWith(classes), true, value);
    assert.equal(tagTone(value), tagColorClasses[value]);
  }
  assert.equal(tagColorKey("cyan"), "cyan");
  assert.equal(tagColorKey("not-a-color"), "slate");
  assert.equal(tagColorKey(null, "cyan"), "cyan");
  assert.equal(tagTone("sand").includes("text-orange-200"), true);
});

test("a new tag takes the least-used color, ties broken by palette order", () => {
  assert.equal(leastUsedTagColor([]), "cyan");
  assert.equal(leastUsedTagColor([{ color: null }, { color: undefined }, { color: "" }]), "cyan");
  assert.equal(leastUsedTagColor([{ color: "magenta" }, { color: "nope" }]), "cyan");
  assert.equal(leastUsedTagColor([{ color: "cyan" }]), "sky");
  assert.equal(
    leastUsedTagColor([
      { color: "cyan" },
      { color: "sky" },
      { color: "cyan" },
      { color: "sky" },
    ]),
    "indigo"
  );
  assert.equal(
    leastUsedTagColor(TAG_COLOR_OPTIONS.map((color) => ({ color: color.value }))),
    "cyan"
  );
  const crowded: { color: string }[] = [];
  for (const color of TAG_COLOR_OPTIONS) {
    crowded.push({ color: color.value });
    if (color.value !== "zinc") crowded.push({ color: color.value });
  }
  assert.equal(leastUsedTagColor(crowded), "zinc");
  assert.equal(
    leastUsedTagColor([{ color: "cyan" }, { color: "cyan" }, { color: "chartreuse" }]),
    "sky"
  );
});
