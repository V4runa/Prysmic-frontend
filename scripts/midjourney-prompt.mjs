#!/usr/bin/env node
/**
 * Prysmic — Midjourney prompt generator
 * ------------------------------------------------------------------
 * Prysmic is a calm, glassy, wanderer-themed personal mind workspace:
 * notes, contracts (habits), tasks, moods and a unified calendar —
 * "an extension to your cognition."
 *
 * This script does NOT describe UI, screens or app chrome. It generates
 * *atmospheric* Midjourney prompts — the feeling of using Prysmic:
 * a single beam of thought refracted into a quiet spectrum, dark cosmic
 * stillness lit by cyan glow, frosted light and slow motion.
 *
 * The output is stylized and abstract on purpose, so an image can later
 * graduate into a logo, a favicon, a hero backdrop, or in-app texture.
 *
 * Usage:
 *   node scripts/midjourney-prompt.mjs                 # 5 mixed prompts
 *   node scripts/midjourney-prompt.mjs --count 8
 *   node scripts/midjourney-prompt.mjs --theme prism   # pick a concept
 *   node scripts/midjourney-prompt.mjs --use hero      # aspect/use preset
 *   node scripts/midjourney-prompt.mjs --use logo
 *   node scripts/midjourney-prompt.mjs --seed 42       # reproducible
 *   node scripts/midjourney-prompt.mjs --list          # list themes/presets
 *
 * No dependencies. Run with any modern Node (ESM).
 */

// ----------------------------------------------------------------------------
// Brand palette — pulled from globals.css / AppShell so the art stays on-brand.
// ----------------------------------------------------------------------------
const PALETTE = {
  voidBlack: "#0b0c0f",
  deepIndigo: "#0a0f2c",
  slateNight: "#13161a",
  cyanGlow: "#67e8f9", // primary accent (cyan-300)
  iceMist: "#a5f3fc",
  spectrum: ["#67e8f9", "#a78bfa", "#f9a8d4", "#fcd34d", "#6ee7b7"], // mood spectrum
};

// ----------------------------------------------------------------------------
// Modular vocabulary. Each concept is a "seed" for an atmosphere, not a scene.
// ----------------------------------------------------------------------------
const THEMES = {
  prism: {
    label: "Prism Heart — a single thought refracted into a spectrum",
    subjects: [
      "a solitary floating glass prism suspended in dark stillness, a single fine beam of white light entering and fanning out into a soft cyan-to-violet spectrum",
      "one clear crystalline shard catching a thread of light and splitting it into a quiet rainbow of muted jewel tones",
      "a slow-turning faceted gem of light in an endless dark room, refracting a lone ray into gentle ribbons of color",
    ],
    mood: "contemplative, precise, sacred quiet",
    motifs: ["refraction", "a single beam becoming many", "clarity out of darkness"],
  },
  aurora: {
    label: "Cognitive Aurora — thought as soft living light",
    subjects: [
      "a gentle aurora of cyan and violet light breathing across a near-black sky, threads of glow drifting like slow ideas",
      "soft neural filaments of light weaving through deep space, faint spectrum hues pulsing along the strands",
      "a calm field of luminous mist and delicate light-threads, like a mind quietly thinking in the dark",
    ],
    mood: "calm, alive-but-unhurried, ethereal",
    motifs: ["breathing light", "synaptic threads", "slow flow"],
  },
  wanderer: {
    label: "The Wanderer's Flow — a lone traveler in a river of light",
    subjects: [
      "a small solitary silhouette standing before a wide dark expanse, a luminous cyan river of light flowing toward the horizon",
      "a lone wanderer figure, back turned, gazing into a vast calm void where soft spectral light gathers on the far edge",
      "a single traveler walking a thin path of glowing light through a boundless dark, drifting particles of color around them",
    ],
    mood: "solitary, serene, quietly hopeful",
    motifs: ["the wanderer", "entering the flow", "vast calm space"],
  },
  constellation: {
    label: "Constellation Mind — scattered thoughts coalescing",
    subjects: [
      "scattered points of soft light drifting in dark space, fine luminous lines connecting them into a delicate emerging constellation",
      "loose glowing motes gathering and linking into a gentle web of light, order forming out of quiet chaos",
      "a nebula of tiny cyan and violet sparks slowly organizing into constellation-like structure against deep indigo",
    ],
    mood: "meditative, ordering, gently structured",
    motifs: ["second brain", "connecting fragments", "structure from scatter"],
  },
  sanctuary: {
    label: "Glass Sanctuary — a quiet room lit from within",
    subjects: [
      "an abstract frosted-glass architectural form glowing softly from inside, backlit by a cyan light in a dark void",
      "layered translucent glass planes floating in darkness, volumetric light passing through and blooming into soft color",
      "a serene chamber of frosted glass and diffuse light, calm and weightless, a single warm-cool glow at its center",
    ],
    mood: "calm, protected, weightless",
    motifs: ["glassmorphism", "quiet room", "lit from within"],
  },
  facets: {
    label: "Facets — pure abstract refracted light (best for logo/favicon)",
    subjects: [
      "a minimal abstract emblem of a prism refracting light, clean geometric facets fanning a small spectrum, centered in dark negative space",
      "a single elegant faceted mark of light, cyan core blooming into a subtle spectrum, simple enough to read as a symbol",
      "an abstract geometric glyph suggesting a prism and a beam of light, balanced, iconic, generous negative space",
    ],
    mood: "iconic, minimal, precise",
    motifs: ["mark", "symbol", "reduction to essence"],
  },
};

// Shared atmospheric modifiers woven into every prompt.
const ATMOSPHERE = [
  "deep near-black cosmic background",
  "soft volumetric cyan glow (#67e8f9)",
  "muted jewel-tone spectrum accents (violet, rose, amber, mint)",
  "frosted glass and gentle light bloom",
  "drifting dust and faint particles",
  "slow, weightless, unhurried feeling",
  "high contrast between darkness and a single source of light",
];

// Style suffixes — stylized, not photoreal, not literal.
const STYLE = [
  "stylized, atmospheric, painterly-meets-digital",
  "elegant minimal abstraction, refined and modern",
  "dreamlike and cinematic, soft focus depth",
  "clean vector-adjacent light shapes, poster-like",
];

// Negative guidance — keep it non-literal, no UI, no clutter.
const NEGATIVE =
  "text, letters, words, watermark, UI, interface, buttons, screens, app mockup, dashboard, phone, laptop, monitor, cluttered, busy, photoreal people faces";

// Use-case presets control aspect ratio and any framing bias.
const USE_PRESETS = {
  hero: { ar: "16:9", note: "wide hero / landing backdrop", frame: "expansive composition, room to breathe, subject off-center" },
  wide: { ar: "21:9", note: "ultra-wide banner", frame: "cinematic panorama, vast negative space" },
  square: { ar: "1:1", note: "social / general", frame: "balanced centered composition" },
  logo: { ar: "1:1", note: "logo exploration", frame: "single centered emblem, generous negative space, reads at small size, simple silhouette" },
  favicon: { ar: "1:1", note: "favicon exploration", frame: "extremely simple centered mark, bold silhouette, legible at 32px, minimal detail" },
  mobile: { ar: "9:16", note: "mobile splash", frame: "vertical composition, light gathering low or center" },
};

const MJ_FLAGS = "--v 6.1 --style raw --chaos 12 --stylize 350";

// ----------------------------------------------------------------------------
// Tiny seeded RNG so --seed gives reproducible prompt sets.
// ----------------------------------------------------------------------------
function makeRng(seed) {
  let s = seed >>> 0 || 0x9e3779b9;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 0xffffffff;
  };
}
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

// ----------------------------------------------------------------------------
// Prompt builder.
// ----------------------------------------------------------------------------
function buildPrompt(themeKey, useKey, rng) {
  const theme = THEMES[themeKey];
  const use = USE_PRESETS[useKey] || USE_PRESETS.hero;

  const subject = pick(rng, theme.subjects);
  const atmoA = pick(rng, ATMOSPHERE);
  let atmoB = pick(rng, ATMOSPHERE);
  while (atmoB === atmoA) atmoB = pick(rng, ATMOSPHERE);
  const style = pick(rng, STYLE);

  const body = [
    subject,
    `${theme.mood}`,
    use.frame,
    atmoA,
    atmoB,
    "color palette: deep indigo #0a0f2c and near-black #0b0c0f with luminous cyan #67e8f9 and a subtle jewel-tone spectrum",
    style,
  ].join(", ");

  return `${body} --ar ${use.ar} ${MJ_FLAGS} --no ${NEGATIVE}`;
}

// ----------------------------------------------------------------------------
// CLI parsing.
// ----------------------------------------------------------------------------
function parseArgs(argv) {
  const args = { count: 5, theme: null, use: "hero", seed: null, list: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--list") args.list = true;
    else if (a === "--count") args.count = parseInt(argv[++i], 10) || 5;
    else if (a === "--theme") args.theme = argv[++i];
    else if (a === "--use") args.use = argv[++i];
    else if (a === "--seed") args.seed = parseInt(argv[++i], 10);
    else if (a === "--help" || a === "-h") args.help = true;
  }
  return args;
}

function printList() {
  console.log("\nThemes (--theme <key>):\n");
  for (const [key, t] of Object.entries(THEMES)) {
    console.log(`  ${key.padEnd(14)} ${t.label}`);
  }
  console.log("\nUse presets (--use <key>):\n");
  for (const [key, u] of Object.entries(USE_PRESETS)) {
    console.log(`  ${key.padEnd(10)} ${u.ar.padEnd(6)} ${u.note}`);
  }
  console.log(
    "\nBrand palette:\n  " +
      Object.entries(PALETTE)
        .filter(([, v]) => typeof v === "string")
        .map(([k, v]) => `${k}:${v}`)
        .join("  ") +
      "\n"
  );
}

function printHelp() {
  console.log(`
Prysmic — Midjourney prompt generator

  node scripts/midjourney-prompt.mjs [options]

Options:
  --count <n>     how many prompts to print (default 5)
  --theme <key>   lock to one concept (default: rotate through all)
  --use <key>     aspect/use preset: hero wide square logo favicon mobile
  --seed <n>      reproducible output
  --list          show available themes, presets and palette
  --help          show this help

Examples:
  node scripts/midjourney-prompt.mjs --use logo --theme facets --count 4
  node scripts/midjourney-prompt.mjs --use hero --seed 7
`);
}

// ----------------------------------------------------------------------------
// Main.
// ----------------------------------------------------------------------------
function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return printHelp();
  if (args.list) return printList();

  if (args.theme && !THEMES[args.theme]) {
    console.error(`Unknown theme "${args.theme}". Run with --list to see options.`);
    process.exit(1);
  }
  if (!USE_PRESETS[args.use]) {
    console.error(`Unknown use preset "${args.use}". Run with --list to see options.`);
    process.exit(1);
  }

  const seed = args.seed ?? Math.floor(Math.random() * 1e9);
  const rng = makeRng(seed);
  const themeKeys = args.theme ? [args.theme] : Object.keys(THEMES);

  console.log(`\n  PRYSMIC · Midjourney prompts`);
  console.log(`  use: ${args.use} (${USE_PRESETS[args.use].ar})  ·  seed: ${seed}\n`);

  for (let i = 0; i < args.count; i++) {
    const themeKey = args.theme ? args.theme : themeKeys[i % themeKeys.length];
    const prompt = buildPrompt(themeKey, args.use, rng);
    console.log(`  [${String(i + 1).padStart(2, "0")}] (${themeKey})`);
    console.log(`  ${prompt}\n`);
  }

  console.log(
    `  Tip: paste one line into Midjourney. Re-run with the same --seed to reproduce,\n` +
      `  or --theme facets --use logo/favicon when you're ready to explore a mark.\n`
  );
}

main();
