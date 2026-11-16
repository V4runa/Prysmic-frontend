/**
 * Rasterize the Prysmic mark into the PWA icons.
 * Run: node scripts/render-pwa-icons.mjs
 *
 * The "any" icons keep the rounded mark and transparent corners.
 * The Apple icon is the same mark on a full-bleed square; iOS applies its mask.
 * The maskable icon keeps the mark inside the center 80% safe zone.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const mark = readFileSync(join(root, "src/app/icon.svg"), "utf8");
const chrome = [
  "/usr/local/bin/google-chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].find((path) => existsSync(path));
if (!chrome) throw new Error("Chrome is required to rasterize the icons.");

const maskable = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <rect width="64" height="64" fill="#07080c"/>
  <g transform="translate(32 32) scale(0.72) translate(-32 -32)">
    <path d="M32 8 L54 20.5 V43.5 L32 56 L10 43.5 V20.5 Z" stroke="#a5f3fc" stroke-width="2"/>
    <path d="M10 20.5 L32 33 L54 20.5" stroke="#a5f3fc" stroke-width="1.5"/>
    <path d="M32 33 V56" stroke="#a5f3fc" stroke-width="1.5" opacity="0.6"/>
  </g>
</svg>
`;

const puppeteer = (await import("puppeteer-core")).default;
const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

async function render(svg, size, file, background) {
  const page = await browser.newPage();
  await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
  const bg = background ?? "transparent";
  await page.setContent(`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  html, body { margin: 0; width: ${size}px; height: ${size}px; overflow: hidden; background: ${bg}; }
  svg { display: block; width: ${size}px; height: ${size}px; }
</style>
</head>
<body>${svg}</body>
</html>`);
  const png = await page.screenshot({
    type: "png",
    clip: { x: 0, y: 0, width: size, height: size },
    omitBackground: background == null,
  });
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, png);
  await page.close();
}

await render(mark, 192, join(root, "public/icons/icon-192.png"));
await render(mark, 512, join(root, "public/icons/icon-512.png"));
await render(maskable, 512, join(root, "public/icons/icon-512-maskable.png"), "#07080c");
await render(mark, 180, join(root, "public/apple-touch-icon.png"), "#07080c");

await browser.close();
