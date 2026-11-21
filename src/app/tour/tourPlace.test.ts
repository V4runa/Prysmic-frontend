import assert from "node:assert/strict";
import test from "node:test";
import { cardSpotInside, placeTourCard, TOUR_CARD_WIDTH, type Box } from "./tourPlace";

const desktop = { width: 1440, height: 900 };
const phone = { width: 390, height: 844 };
const card = { width: TOUR_CARD_WIDTH, height: 220 };

function target(box: Partial<Box> & Pick<Box, "x" | "y">): Box {
  return { width: 120, height: 40, ...box };
}

test("a phone step docks the same card full-width at the bottom", () => {
  const spot = placeTourCard({
    viewport: phone,
    card,
    target: target({ x: 40, y: 180 }),
    presentation: "step",
  });
  assert.equal(spot.mode, "bottom");
  if (spot.mode !== "bottom") return;
  assert.equal(spot.left, 16);
  assert.equal(spot.width, 390 - 32);
  assert.equal(cardSpotInside(spot, card.height, phone), true);
});

test("welcome and close stay centered on a phone and a desktop", () => {
  for (const viewport of [phone, desktop]) {
    const spot = placeTourCard({
      viewport,
      card,
      target: target({ x: 10, y: 10 }),
      presentation: "center",
    });
    assert.equal(spot.mode, "fixed");
    if (spot.mode !== "fixed") continue;
    assert.ok(Math.abs(spot.left + spot.width / 2 - viewport.width / 2) < 1);
    assert.equal(cardSpotInside(spot, card.height, viewport), true);
  }
});

test("a desktop step sits beside the target and stays on screen", () => {
  const beside = placeTourCard({
    viewport: desktop,
    card,
    target: target({ x: 80, y: 120, width: 140, height: 44 }),
    presentation: "step",
  });
  assert.equal(beside.mode, "fixed");
  if (beside.mode !== "fixed") return;
  assert.equal(beside.left, 80 + 140 + 12);
  assert.equal(beside.top, 120);
  assert.equal(cardSpotInside(beside, card.height, desktop), true);

  const edge = placeTourCard({
    viewport: desktop,
    card,
    target: target({ x: 1280, y: 80, width: 120, height: 40 }),
    presentation: "step",
  });
  assert.equal(edge.mode, "fixed");
  if (edge.mode !== "fixed") return;
  assert.ok(edge.left + edge.width <= desktop.width - 16);
  assert.ok(edge.left >= 16);
  assert.equal(cardSpotInside(edge, card.height, desktop), true);
});

test("a docked card stays full-width at the bottom on a desktop", () => {
  const spot = placeTourCard({
    viewport: desktop,
    card,
    target: null,
    presentation: "step",
    dock: true,
  });
  assert.equal(spot.mode, "bottom");
  if (spot.mode !== "bottom") return;
  assert.equal(spot.left, 16);
  assert.equal(spot.width, 1440 - 32);
  assert.equal(cardSpotInside(spot, card.height, desktop), true);
});

test("a missing target centers the card instead of failing", () => {
  const spot = placeTourCard({
    viewport: desktop,
    card,
    target: null,
    presentation: "step",
  });
  assert.equal(spot.mode, "fixed");
  if (spot.mode !== "fixed") return;
  assert.ok(Math.abs(spot.left + TOUR_CARD_WIDTH / 2 - desktop.width / 2) < 1);
  assert.equal(cardSpotInside(spot, card.height, desktop), true);
});

test("a card taller than the viewport is pinned inside the margins", () => {
  const short = { width: 800, height: 240 };
  const spot = placeTourCard({
    viewport: short,
    card: { width: TOUR_CARD_WIDTH, height: 400 },
    target: null,
    presentation: "center",
  });
  assert.equal(spot.mode, "fixed");
  if (spot.mode !== "fixed") return;
  assert.ok(spot.top >= 16);
  assert.ok(spot.left >= 16);
  assert.ok(spot.left + spot.width <= short.width);
});
