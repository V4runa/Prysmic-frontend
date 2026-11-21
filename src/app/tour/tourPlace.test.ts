import assert from "node:assert/strict";
import test from "node:test";
import { cardSpotInside, intersects, overlapArea, placeTourCard, TOUR_CARD_WIDTH, type Box } from "./tourPlace";

const desktop = { width: 1440, height: 900 };
const phone = { width: 390, height: 844 };
const card = { width: TOUR_CARD_WIDTH, height: 220 };
const open = { top: 64, bottom: 16 };
const phoneInsets = { top: 72, bottom: 76 };

function box(partial: Partial<Box> & Pick<Box, "x" | "y">): Box {
  return { width: 120, height: 44, ...partial };
}

function asBox(spot: { top: number; left: number; width: number }, height: number): Box {
  return { x: spot.left, y: spot.top, width: spot.width, height };
}

test("welcome stays centered inside the safe area", () => {
  const spot = placeTourCard({
    viewport: phone,
    insets: phoneInsets,
    card,
    target: null,
    presentation: "center",
  });
  assert.ok(spot);
  assert.equal(cardSpotInside(spot, card.height, phone, phoneInsets), true);
  assert.ok(spot.top + card.height <= phone.height - phoneInsets.bottom);
});

test("a step without a target does not invent a centered card", () => {
  assert.equal(
    placeTourCard({
      viewport: desktop,
      insets: open,
      card,
      target: null,
      presentation: "anchor",
    }),
    null
  );
});

test("the card sits beside a top-right button without covering it", () => {
  const button = box({ x: 1240, y: 96, width: 140, height: 40 });
  const spot = placeTourCard({
    viewport: desktop,
    insets: open,
    card,
    target: button,
    presentation: "anchor",
  });
  assert.ok(spot);
  const placed = asBox(spot, card.height);
  assert.equal(intersects(placed, button), false);
  assert.equal(cardSpotInside(spot, card.height, desktop, open), true);
  assert.ok(spot.top >= button.y - 8);
});

test("the phone card stays above the tab bar and off the target", () => {
  const button = box({ x: 230, y: 88, width: 130, height: 40 });
  const spot = placeTourCard({
    viewport: phone,
    insets: phoneInsets,
    card: { width: 358, height: 230 },
    target: button,
    presentation: "anchor",
  });
  assert.ok(spot);
  const placed = asBox(spot, 230);
  assert.equal(intersects(placed, button), false);
  assert.equal(cardSpotInside(spot, 230, phone, phoneInsets), true);
  assert.ok(spot.top + 230 <= phone.height - phoneInsets.bottom);
});

test("the card avoids a keep-clear row under the target", () => {
  const field = box({ x: 80, y: 180, width: 900, height: 44 });
  const search = box({ x: 80, y: 240, width: 900, height: 48 });
  const spot = placeTourCard({
    viewport: desktop,
    insets: open,
    card,
    target: field,
    obstacles: [search],
    presentation: "anchor",
  });
  assert.ok(spot);
  const placed = asBox(spot, card.height);
  assert.equal(overlapArea(placed, field), 0);
  assert.equal(overlapArea(placed, search), 0);
});
