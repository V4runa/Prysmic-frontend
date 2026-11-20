import assert from "node:assert/strict";
import test from "node:test";
import {
  PHONE_RIBBON_BOTTOM,
  RIBBON_ESTIMATE,
  glowFor,
  lanternAnchor,
  placeRibbon,
  ribbonHitsTarget,
} from "./tourLayout";

const desktop = { width: 1440, height: 900 };

test("a wide control is lit across its whole box, with feather outside", () => {
  const bar = { x: 48, y: 96, width: 960, height: 52 };
  const glow = glowFor(bar);
  assert.ok(glow);
  assert.ok(glow.x < bar.x);
  assert.ok(glow.y < bar.y);
  assert.ok(glow.x + glow.width > bar.x + bar.width);
  assert.ok(glow.y + glow.height > bar.y + bar.height);
  assert.ok(glow.feather >= 28);
  assert.equal(glowFor(null), null);
  assert.equal(glowFor({ x: 0, y: 0, width: 0, height: 40 }), null);
});

test("a narrow calendar cell keeps the lantern off the date numeral", () => {
  const cell = { x: 220, y: 340, width: 52, height: 72 };
  const anchor = lanternAnchor(cell, "calendar");
  const center = cell.x + cell.width / 2;
  assert.ok(Math.abs(anchor.x - center) > 12);
  assert.ok(anchor.x > cell.x && anchor.x < cell.x + cell.width);
  assert.ok(anchor.y > cell.y && anchor.y < cell.y + 20);
  const old = { x: cell.x - 14, y: cell.y - 22 };
  assert.ok(anchor.x > old.x);
  assert.ok(anchor.y > old.y);
});

test("a wide calendar cell keeps the lantern centered along today's top", () => {
  const cell = { x: 400, y: 200, width: 140, height: 110 };
  const anchor = lanternAnchor(cell, "calendar");
  assert.ok(Math.abs(anchor.x - (cell.x + cell.width / 2)) < 2);
  assert.ok(anchor.y > cell.y && anchor.y < cell.y + 28);
});

test("phone copy docks above the tab bar, including the safe area", () => {
  const place = placeRibbon({
    stop: "moods",
    phone: true,
    keyboard: false,
    target: { x: 16, y: 140, width: 380, height: 460 },
    anchor: null,
    viewport: { width: 412, height: 780 },
    header: 56,
    tabbar: 60,
  });
  assert.equal(place.bottom, PHONE_RIBBON_BOTTOM);
  assert.match(String(place.bottom), /safe-area|bottomnav-h/);
  assert.equal(place.top, undefined);
  assert.equal(place.left, 16);
  assert.ok(place.width <= 412 - 32);
});

test("desktop copy sits below the lit control and stays inside the screen", () => {
  const target = { x: 980, y: 120, width: 148, height: 40 };
  const place = placeRibbon({
    stop: "notes",
    phone: false,
    keyboard: false,
    target,
    anchor: null,
    viewport: desktop,
    header: 48,
    tabbar: 0,
  });
  assert.equal(typeof place.top, "number");
  assert.ok(place.top! >= target.y + target.height + 24);
  assert.ok(place.top! + RIBBON_ESTIMATE <= desktop.height);
  assert.ok(place.left >= 16);
  assert.ok(place.left + place.width <= desktop.width - 16);
  assert.equal(ribbonHitsTarget(place, target, RIBBON_ESTIMATE, desktop.height), false);
});

test("a target near the bottom keeps the panel above it", () => {
  const target = { x: 400, y: 760, width: 80, height: 64 };
  const place = placeRibbon({
    stop: "calendar",
    phone: false,
    keyboard: false,
    target,
    anchor: null,
    viewport: desktop,
    header: 48,
    tabbar: 0,
  });
  assert.ok(place.top! + RIBBON_ESTIMATE <= target.y);
  assert.equal(ribbonHitsTarget(place, target, RIBBON_ESTIMATE, desktop.height), false);
});
