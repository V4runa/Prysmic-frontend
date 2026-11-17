import assert from "node:assert/strict";
import test from "node:test";
import {
  TAG_ROW_MAX_CHIP_WIDTH,
  TAG_ROW_MIN_CHIP_WIDTH,
  layoutTagRow,
  fewerTagsLabel,
  moreTagsLabel,
  overflowPillText,
} from "./tagOverflow";

const pill = (hidden: number) => (hidden >= 10 ? 36 : 28);

function usedWidth(
  layout: ReturnType<typeof layoutTagRow>,
  chipWidths: readonly number[],
  gap: number,
  container: number
) {
  const natural = chipWidths.map((width) => Math.min(width, TAG_ROW_MAX_CHIP_WIDTH));
  let used = 0;
  for (let i = 0; i < layout.visibleCount; i += 1) {
    const assigned = layout.widths[i];
    used += assigned == null ? natural[i]! : assigned;
    if (i > 0) used += gap;
  }
  if (layout.hiddenCount > 0) {
    if (layout.visibleCount > 0) used += gap;
    used += pill(layout.hiddenCount);
  }
  assert.equal(layout.visibleCount + layout.hiddenCount, chipWidths.length);
  assert.ok(used <= container + 0.5, `row used ${used}px in ${container}px`);
  assert.equal(overflowPillText(layout.hiddenCount).includes("..."), false);
}

test("no tags leaves the row empty", () => {
  assert.deepEqual(
    layoutTagRow({ containerWidth: 240, chipWidths: [], gap: 4, pillWidth: pill }),
    { visibleCount: 0, widths: [], hiddenCount: 0 }
  );
});

test("every chip shows when they fit, with no pill", () => {
  const chipWidths = [48, 60, 52];
  const layout = layoutTagRow({ containerWidth: 240, chipWidths, gap: 8, pillWidth: pill });
  assert.deepEqual(layout, { visibleCount: 3, widths: [null, null, null], hiddenCount: 0 });
  usedWidth(layout, chipWidths, 8, 240);
});

test("a full row of short chips keeps a prefix and a +N pill", () => {
  const chipWidths = [70, 70, 70, 70, 70];
  const layout = layoutTagRow({ containerWidth: 200, chipWidths, gap: 4, pillWidth: pill });
  assert.equal(layout.hiddenCount > 0, true);
  assert.equal(layout.visibleCount >= 1, true);
  assert.deepEqual(layout.widths, layout.widths.map(() => null));
  assert.equal(moreTagsLabel(layout.hiddenCount), `Show ${layout.hiddenCount} more tags`);
  usedWidth(layout, chipWidths, 4, 200);
});

test("short chips are not squeezed just to avoid the pill", () => {
  const chipWidths = [70, 70, 70, 70];
  const layout = layoutTagRow({ containerWidth: 220, chipWidths, gap: 4, pillWidth: pill });
  assert.equal(layout.hiddenCount > 0, true);
  assert.ok(layout.widths.every((width) => width == null));
  usedWidth(layout, chipWidths, 4, 220);
});

test("a long name truncates so the other tags still fit on the row", () => {
  const chipWidths = [240, 50, 50, 50];
  const layout = layoutTagRow({
    containerWidth: 280,
    chipWidths,
    gap: 4,
    pillWidth: pill,
    maxChipWidth: TAG_ROW_MAX_CHIP_WIDTH,
  });
  assert.equal(layout.hiddenCount, 0);
  assert.equal(layout.visibleCount, 4);
  assert.equal(typeof layout.widths[0], "number");
  assert.ok((layout.widths[0] ?? 0) < TAG_ROW_MAX_CHIP_WIDTH);
  assert.ok((layout.widths[0] ?? 0) >= TAG_ROW_MIN_CHIP_WIDTH);
  assert.deepEqual(layout.widths.slice(1), [null, null, null]);
  usedWidth(layout, chipWidths, 4, 280);
});

test("one very long tag truncates to the row and does not add a pill", () => {
  const chipWidths = [420];
  const layout = layoutTagRow({ containerWidth: 160, chipWidths, gap: 4, pillWidth: pill });
  assert.deepEqual(layout, { visibleCount: 1, widths: [160], hiddenCount: 0 });
  usedWidth(layout, chipWidths, 4, 160);
});

test("a tiny row shows only the pill when a chip cannot sit beside it", () => {
  const chipWidths = [80, 80, 80];
  const layout = layoutTagRow({ containerWidth: 40, chipWidths, gap: 4, pillWidth: pill });
  assert.deepEqual(layout, { visibleCount: 0, widths: [], hiddenCount: 3 });
  assert.equal(overflowPillText(layout.hiddenCount), "+3");
  usedWidth(layout, chipWidths, 4, 40);
});

test("one chip truncates beside the pill when that is all that fits", () => {
  const chipWidths = [160, 80, 80];
  const layout = layoutTagRow({ containerWidth: 100, chipWidths, gap: 4, pillWidth: pill });
  assert.equal(layout.visibleCount, 1);
  assert.equal(layout.hiddenCount, 2);
  assert.equal(typeof layout.widths[0], "number");
  assert.ok((layout.widths[0] ?? 0) >= TAG_ROW_MIN_CHIP_WIDTH);
  usedWidth(layout, chipWidths, 4, 100);
});

test("a wider pill for two digits can hide one more chip", () => {
  const chipWidths = [50, 50, 50];
  const narrow = () => 28;
  const wide = () => 64;
  const withNarrow = layoutTagRow({ containerWidth: 140, chipWidths, gap: 4, pillWidth: narrow });
  const withWide = layoutTagRow({ containerWidth: 140, chipWidths, gap: 4, pillWidth: wide });
  assert.ok(withWide.visibleCount < withNarrow.visibleCount);
});

test("a wider container fits more chips", () => {
  const chipWidths = [60, 60, 60, 60];
  const narrow = layoutTagRow({ containerWidth: 150, chipWidths, gap: 8, pillWidth: pill });
  const wide = layoutTagRow({ containerWidth: 320, chipWidths, gap: 8, pillWidth: pill });
  assert.ok(wide.visibleCount > narrow.visibleCount);
  assert.equal(wide.hiddenCount, 0);
});

test("a zero-width container hides every tag behind the pill", () => {
  const layout = layoutTagRow({ containerWidth: 0, chipWidths: [40, 40], gap: 4, pillWidth: pill });
  assert.deepEqual(layout, { visibleCount: 0, widths: [], hiddenCount: 2 });
});

test("labels stay plain and never use a bare ellipsis", () => {
  assert.equal(overflowPillText(1), "+1");
  assert.equal(overflowPillText(12), "+12");
  assert.equal(moreTagsLabel(1), "Show 1 more tag");
  assert.equal(moreTagsLabel(3), "Show 3 more tags");
  assert.equal(fewerTagsLabel(), "Show fewer tags");
  assert.equal(moreTagsLabel(1).includes("..."), false);
  assert.equal(fewerTagsLabel().includes("..."), false);
  assert.equal(overflowPillText(4).includes("..."), false);
});
