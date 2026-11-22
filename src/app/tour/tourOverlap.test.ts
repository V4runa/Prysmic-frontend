import assert from "node:assert/strict";
import test from "node:test";
import { partialOverlap } from "./tourOverlap";

test("a card that misses a line is clear", () => {
  assert.equal(
    partialOverlap({ x: 16, y: 200, width: 320, height: 180 }, { x: 40, y: 420, width: 280, height: 24 }),
    false
  );
});

test("a card that swallows a line is covered", () => {
  assert.equal(
    partialOverlap({ x: 16, y: 200, width: 320, height: 180 }, { x: 40, y: 240, width: 200, height: 24 }),
    false
  );
});

test("a card that cuts through a line is a partial overlap", () => {
  assert.equal(
    partialOverlap({ x: 16, y: 200, width: 320, height: 180 }, { x: 40, y: 360, width: 280, height: 40 }),
    true
  );
});

test("a ring that nicks a subtitle is a partial overlap", () => {
  assert.equal(
    partialOverlap({ x: 20, y: 140, width: 160, height: 48 }, { x: 16, y: 128, width: 300, height: 20 }),
    true
  );
});
