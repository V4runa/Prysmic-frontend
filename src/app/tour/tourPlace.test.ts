import assert from "node:assert/strict";
import test from "node:test";
import { cardSpotInside, containTourCard, intersects, overlapArea, placeMoodCard, placeTourCard, ringSidePad, TOUR_CARD_WIDTH, type Box } from "./tourPlace";

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

test("a calendar day keeps the card off the weeks below it", () => {
  const day = box({ x: 250, y: 520, width: 28, height: 28 });
  const weeks = [0, 1, 2, 3, 4, 5].flatMap((row) =>
    [0, 1, 2, 3, 4, 5, 6].map((col) =>
      box({ x: 16 + col * 52, y: 180 + row * 88, width: 48, height: 80 })
    )
  );
  const spot = placeTourCard({
    viewport: phone,
    insets: phoneInsets,
    card: { width: 358, height: 210 },
    target: day,
    softObstacles: weeks,
    obstacles: [box({ x: 0, y: 72, width: 390, height: 72 })],
    presentation: "anchor",
    shieldBelow: true,
  });
  assert.ok(spot);
  const placed = asBox(spot, 210);
  assert.equal(overlapArea(placed, day), 0);
  const below = weeks.filter((cell) => cell.y > day.y + day.height);
  const covered = below.reduce((sum, cell) => sum + overlapArea(placed, cell), 0);
  assert.equal(covered, 0);
  assert.ok(placed.y + placed.height <= day.y);
});

test("a wide mood grid keeps the card centered underneath", () => {
  const grid = box({ x: 200, y: 140, width: 1000, height: 420 });
  const spot = placeTourCard({
    viewport: { width: 1920, height: 1080 },
    insets: open,
    card: { width: 400, height: 200 },
    target: grid,
    presentation: "anchor",
    bias: "below",
  });
  assert.ok(spot);
  const placed = asBox(spot, 200);
  assert.equal(overlapArea(placed, grid), 0);
  assert.ok(placed.y >= grid.y + grid.height);
  assert.ok(Math.abs(placed.x + placed.width / 2 - (grid.x + grid.width / 2)) < 2);
});

test("the phone calendar card sits against today's week and off that row", () => {
  const week = box({ x: 12, y: 430, width: 366, height: 96 });
  const spot = placeTourCard({
    viewport: phone,
    insets: phoneInsets,
    card: { width: 358, height: 200 },
    target: box({ x: 250, y: 448, width: 24, height: 24 }),
    week,
    presentation: "anchor",
    bias: "around-week",
  });
  assert.ok(spot);
  const placed = asBox(spot, 200);
  assert.equal(overlapArea(placed, week), 0);
  const below = placed.y >= week.y + week.height + 12;
  const above = placed.y + placed.height <= week.y - 12;
  assert.ok(below || above);
});

test("a phone card that would pass the tab bar is pulled back on screen at full width", () => {
  const spot = containTourCard(
    { top: 700, left: 40, width: 300 },
    220,
    { width: 390, height: 844 },
    phoneInsets,
    { phone: true }
  );
  assert.equal(spot.left, 16);
  assert.equal(spot.width, 358);
  assert.ok(spot.top + 220 <= 844 - phoneInsets.bottom);
  assert.ok(spot.top >= phoneInsets.top);
});

test("a card taller than the safe area starts at the top instead of below the screen", () => {
  const spot = containTourCard(
    { top: 500, left: 16, width: 328 },
    600,
    { width: 375, height: 667 },
    { top: 72, bottom: 80 },
    { phone: true }
  );
  assert.equal(spot.top, 72);
  assert.equal(spot.width, 343);
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

test("a phone mood card sits on its content height directly under the ring", () => {
  const rows: { top: number; bottom: number }[] = [
    { top: 80, bottom: 180 },
    { top: 196, bottom: 296 },
    { top: 312, bottom: 412 },
    { top: 428, bottom: 528 },
  ];
  const placed = placeMoodCard(rows, 180, 60, 700, 12);
  assert.ok(placed);
  assert.equal(placed.ringRows, 3);
  assert.equal(placed.top, 412 + 12);
  assert.ok(placed.top + 180 <= 700);
});

test("a phone mood card leaves out a row hidden under the header", () => {
  const rows: { top: number; bottom: number }[] = [
    { top: 40, bottom: 140 },
    { top: 156, bottom: 256 },
    { top: 272, bottom: 372 },
  ];
  const placed = placeMoodCard(rows, 160, 72, 640, 12);
  assert.ok(placed);
  assert.equal(placed.ringRows, 2);
  assert.equal(placed.top, 372 + 12);
});

test("the tasks ring keeps 8px between its stroke and the More button", () => {
  const field = { left: 80, top: 160, right: 900, bottom: 204 };
  const more = { left: 912, top: 160, right: 990, bottom: 204 };
  const sides = ringSidePad(field, [more], 8);
  assert.equal(sides.right, 2);
  assert.equal(sides.left, 8);
  const strokeEdge = field.right + sides.right + 2;
  assert.ok(more.left - strokeEdge >= 8);
});
