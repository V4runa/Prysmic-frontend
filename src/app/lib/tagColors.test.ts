import assert from "node:assert/strict";
import test from "node:test";
import {
  TAG_COLOR_OPTIONS,
  leastUsedTagColor,
  tagActiveClasses,
  tagColorClasses,
  tagColorKey,
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

const ORIGINAL_VALUES = new Set(["cyan", "rose", "slate", "violet", "emerald", "amber"]);

/** Tailwind steps used as the rendered chip text. */
const SHADE: Record<string, Record<string, string>> = {
  cyan: { 300: "#67e8f9" },
  blue: { 400: "#60a5fa" },
  violet: { 300: "#c4b5fd" },
  rose: { 300: "#fda4af" },
  fuchsia: { 400: "#e879f9" },
  orange: { 400: "#fb923c" },
  amber: { 300: "#fcd34d" },
  emerald: { 300: "#6ee7b7" },
  lime: { 200: "#d9f99d" },
  stone: { 400: "#a8a29e" },
  slate: { 300: "#cbd5e1" },
};

/**
 * CIEDE2000. The locked violet/slate pair is 14.89, so the floor for the
 * whole palette sits just under that. Every added color must clear 15.
 */
const PALETTE_FLOOR = 14.5;
const ADDED_COLOR_FLOOR = 15;

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
  const n = Number.parseInt(hex.slice(1), 16);
  const r = channel((n >> 16) & 255);
  const g = channel((n >> 8) & 255);
  const b = channel(n & 255);
  let x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
  let y = r * 0.2126729 + g * 0.7151522 + b * 0.072175;
  let z = r * 0.0193339 + g * 0.119192 + b * 0.9503041;
  x /= 0.95047;
  y /= 1;
  z /= 1.08883;
  const pivot = (value: number) => (value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116);
  const fx = pivot(x);
  const fy = pivot(y);
  const fz = pivot(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** Sharma, Wu, Dalal CIEDE2000. Same result on either theme: the text hex does not change. */
function deltaE00(hex1: string, hex2: string): number {
  const [L1, a1, b1] = lab(hex1);
  const [L2, a2, b2] = lab(hex2);
  const avgLp = (L1 + L2) / 2;
  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const avgC = (C1 + C2) / 2;
  const avgC7 = avgC ** 7;
  const G = 0.5 * (1 - Math.sqrt(avgC7 / (avgC7 + 25 ** 7)));
  const a1p = a1 * (1 + G);
  const a2p = a2 * (1 + G);
  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);
  const avgCp = (C1p + C2p) / 2;
  const hue = (ap: number, bp: number) => {
    if (ap === 0 && bp === 0) return 0;
    const degrees = (Math.atan2(bp, ap) * 180) / Math.PI;
    return degrees < 0 ? degrees + 360 : degrees;
  };
  const h1p = hue(a1p, b1);
  const h2p = hue(a2p, b2);
  let dh = h2p - h1p;
  if (C1p * C2p === 0) dh = 0;
  else if (dh > 180) dh -= 360;
  else if (dh < -180) dh += 360;
  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(((dh * Math.PI) / 180) / 2);
  let avgHp = (h1p + h2p) / 2;
  if (C1p * C2p === 0) avgHp = h1p + h2p;
  else if (Math.abs(h1p - h2p) > 180) avgHp += avgHp < 180 ? 180 : -180;
  const hp = (avgHp * Math.PI) / 180;
  const T =
    1 -
    0.17 * Math.cos(hp - (30 * Math.PI) / 180) +
    0.24 * Math.cos(2 * hp) +
    0.32 * Math.cos(3 * hp + (6 * Math.PI) / 180) -
    0.2 * Math.cos(4 * hp - (63 * Math.PI) / 180);
  const avgLp50 = avgLp - 50;
  const SL = 1 + (0.015 * avgLp50 * avgLp50) / Math.sqrt(20 + avgLp50 * avgLp50);
  const SC = 1 + 0.045 * avgCp;
  const SH = 1 + 0.015 * avgCp * T;
  const avgCp7 = avgCp ** 7;
  const RC = 2 * Math.sqrt(avgCp7 / (avgCp7 + 25 ** 7));
  const dTheta = 30 * Math.exp(-(((avgHp - 275) / 25) ** 2));
  const RT = -Math.sin((2 * dTheta * Math.PI) / 180) * RC;
  return Math.sqrt(
    (dLp / SL) ** 2 + (dCp / SC) ** 2 + (dHp / SH) ** 2 + RT * (dCp / SC) * (dHp / SH)
  );
}

function textHex(classes: string): string {
  const match = classes.match(/(?:^|\s)text-([a-z]+)-(\d+)/);
  assert.ok(match, `missing text class in ${classes}`);
  const hex = SHADE[match[1]]?.[match[2]];
  assert.ok(hex, `no rendered color for ${match[1]}-${match[2]}`);
  return hex;
}

test("the palette is eleven colors in family order", () => {
  assert.deepEqual(
    TAG_COLOR_OPTIONS.map((color) => color.value),
    ["cyan", "blue", "violet", "rose", "fuchsia", "orange", "amber", "emerald", "lime", "sand", "slate"]
  );
  assert.deepEqual(
    TAG_COLOR_OPTIONS.map((color) => color.name),
    ["Astral", "Dusk", "Pulse", "Ember", "Flare", "Cinder", "Sunwake", "Verdant", "Fern", "Dune", "Whisper"]
  );
});

test("chip text stays a pale outline and every pair clears CIEDE2000", () => {
  const rendered = TAG_COLOR_OPTIONS.map((color) => {
    const chip = tagColorClasses[color.value];
    assert.equal(chip.includes("bg-"), false, color.value);
    assert.equal(chip.includes("light:"), false, color.value);
    assert.match(chip, /border-/);
    assert.match(chip, /\/30/);
    assert.match(chip, /shadow-/);
    assert.match(tagActiveClasses[color.value], /ring /);
    assert.match(tagActiveClasses[color.value], /bg-[a-z]+-\d+\/10/);
    const hex = textHex(chip);
    assert.ok(contrast(hex, "#0b0c0f") >= 4.5, `${color.name} on the dark page`);
    assert.ok(contrast(hex, "#1e2327") >= 4.5, `${color.name} on the glass`);
    return { ...color, hex };
  });

  let closest = { distance: Number.POSITIVE_INFINITY, a: "", b: "" };
  for (let i = 0; i < rendered.length; i += 1) {
    for (let j = i + 1; j < rendered.length; j += 1) {
      const distance = deltaE00(rendered[i].hex, rendered[j].hex);
      if (distance < closest.distance) {
        closest = { distance, a: rendered[i].name, b: rendered[j].name };
      }
      assert.ok(
        distance >= PALETTE_FLOOR,
        `${rendered[i].name}/${rendered[j].name} ΔE00 ${distance.toFixed(2)}`
      );
      const added = !ORIGINAL_VALUES.has(rendered[i].value) || !ORIGINAL_VALUES.has(rendered[j].value);
      if (added) {
        assert.ok(
          distance >= ADDED_COLOR_FLOOR,
          `${rendered[i].name}/${rendered[j].name} ΔE00 ${distance.toFixed(2)}`
        );
      }
    }
  }
  assert.equal(closest.a, "Pulse");
  assert.equal(closest.b, "Whisper");
  assert.ok(Math.abs(closest.distance - 14.89) < 0.05, closest.distance.toFixed(2));
});

test("the original six colors keep their dark chip classes", () => {
  for (const [value, classes] of Object.entries(ORIGINAL_DARK)) {
    assert.equal(tagColorClasses[value], classes, value);
    assert.equal(tagTone(value), classes);
  }
  assert.equal(tagColorKey("cyan"), "cyan");
  assert.equal(tagColorKey("not-a-color"), "slate");
  assert.equal(tagColorKey(null, "cyan"), "cyan");
  assert.equal(tagColorKey("sky"), "slate");
  assert.equal(tagColorKey("teal"), "slate");
  assert.equal(tagColorKey("pink"), "slate");
  assert.equal(tagColorKey("yellow"), "slate");
  assert.equal(tagColorKey("zinc"), "slate");
  assert.equal(tagTone("sand"), "text-stone-400 border-stone-400/30 shadow-stone-400/10");
});

test("a new tag takes the least-used color, ties broken by palette order", () => {
  assert.equal(leastUsedTagColor([]), "cyan");
  assert.equal(leastUsedTagColor([{ color: null }, { color: undefined }, { color: "" }]), "cyan");
  assert.equal(leastUsedTagColor([{ color: "magenta" }, { color: "sky" }, { color: "zinc" }]), "cyan");
  assert.equal(leastUsedTagColor([{ color: "cyan" }]), "blue");
  assert.equal(
    leastUsedTagColor([
      { color: "cyan" },
      { color: "blue" },
      { color: "cyan" },
      { color: "blue" },
    ]),
    "violet"
  );
  assert.equal(
    leastUsedTagColor(TAG_COLOR_OPTIONS.map((color) => ({ color: color.value }))),
    "cyan"
  );
  const crowded: { color: string }[] = [];
  for (const color of TAG_COLOR_OPTIONS) {
    crowded.push({ color: color.value });
    if (color.value !== "slate") crowded.push({ color: color.value });
  }
  assert.equal(leastUsedTagColor(crowded), "slate");
  assert.equal(
    leastUsedTagColor([{ color: "cyan" }, { color: "cyan" }, { color: "chartreuse" }]),
    "blue"
  );
});
