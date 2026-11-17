/**
 * How many tag chips fit on one row.
 *
 * Widths are measured by the row (ResizeObserver). This function only decides
 * the count: natural chips first, a long name truncated when that keeps it on
 * the row, then a "+N" pill for the rest.
 */

/** Matches `max-w-44` (11rem) at a 16px root. Long names ellipsize here. */
export const TAG_ROW_MAX_CHIP_WIDTH = 176;

/**
 * A chip narrower than this is mostly an ellipsis. The row shows the pill
 * instead of a sliver beside it.
 */
export const TAG_ROW_MIN_CHIP_WIDTH = 48;

const FIT_EPSILON = 0.5;

export type TagRowLayout = {
  visibleCount: number;
  /** Null keeps that chip at its measured width. A number ellipsizes it. */
  widths: Array<number | null>;
  hiddenCount: number;
};

export function overflowPillText(hiddenCount: number): string {
  return `+${Math.max(0, Math.floor(hiddenCount))}`;
}

export function moreTagsLabel(hiddenCount: number): string {
  const count = Math.max(0, Math.floor(hiddenCount));
  return count === 1 ? "Show 1 more tag" : `Show ${count} more tags`;
}

export function fewerTagsLabel(): string {
  return "Show fewer tags";
}

function capWidth(width: number, maxChipWidth: number): number {
  if (!Number.isFinite(width) || width <= 0) return 0;
  return Math.min(width, maxChipWidth);
}

/**
 * Show every chip when the only overflow comes from names that already hit
 * the max width. Shorter chips stay at their measured width.
 */
function fitByTruncatingLongNames(
  naturals: readonly number[],
  budget: number,
  maxChipWidth: number,
  minChipWidth: number
): Array<number | null> | null {
  if (budget < 0) return null;
  const naturalSum = naturals.reduce((sum, width) => sum + width, 0);
  if (naturalSum <= budget + FIT_EPSILON) return naturals.map(() => null);

  const widths = naturals.slice();
  let overflow = naturalSum - budget;
  const order = widths
    .map((width, index) => ({ width, index }))
    .sort((a, b) => b.width - a.width || a.index - b.index);

  for (const item of order) {
    if (overflow <= FIT_EPSILON) break;
    const current = widths[item.index] ?? 0;
    if (current < maxChipWidth - 1) continue;
    const floor = Math.min(current, minChipWidth);
    const cut = Math.min(Math.max(0, current - floor), overflow);
    widths[item.index] = current - cut;
    overflow -= cut;
  }

  if (overflow > FIT_EPSILON) return null;
  return widths.map((width, index) => {
    const natural = naturals[index] ?? 0;
    if (width >= natural - FIT_EPSILON) return null;
    return Math.max(0, Math.floor(width));
  });
}

export function layoutTagRow(input: {
  containerWidth: number;
  chipWidths: readonly number[];
  gap: number;
  pillWidth: (hiddenCount: number) => number;
  maxChipWidth?: number;
  minChipWidth?: number;
}): TagRowLayout {
  const maxChipWidth = input.maxChipWidth ?? TAG_ROW_MAX_CHIP_WIDTH;
  const minChipWidth = input.minChipWidth ?? TAG_ROW_MIN_CHIP_WIDTH;
  const gap = Number.isFinite(input.gap) && input.gap > 0 ? input.gap : 0;
  const natural = input.chipWidths.map((width) => capWidth(width, maxChipWidth));
  const count = natural.length;

  if (count === 0) return { visibleCount: 0, widths: [], hiddenCount: 0 };

  const container = Number.isFinite(input.containerWidth) ? input.containerWidth : 0;
  if (container <= 0) return { visibleCount: 0, widths: [], hiddenCount: count };

  const between = Math.max(0, count - 1) * gap;
  const all = fitByTruncatingLongNames(natural, container - between, maxChipWidth, minChipWidth);
  if (all) return { visibleCount: count, widths: all, hiddenCount: 0 };

  for (let visible = count - 1; visible >= 1; visible -= 1) {
    const hidden = count - visible;
    const pill = Math.max(0, input.pillWidth(hidden));
    const budget = container - pill - visible * gap;
    const prefix = natural.slice(0, visible);
    const naturalSum = prefix.reduce((sum, width) => sum + width, 0);
    if (naturalSum <= budget + FIT_EPSILON) {
      return { visibleCount: visible, widths: prefix.map(() => null), hiddenCount: hidden };
    }
  }

  if (count > 1) {
    const hidden = count - 1;
    const pill = Math.max(0, input.pillWidth(hidden));
    const budget = container - pill - gap;
    const first = natural[0] ?? 0;
    if (budget >= minChipWidth && first > 0) {
      const width = Math.min(first, Math.floor(budget));
      return {
        visibleCount: 1,
        widths: [width < first - FIT_EPSILON ? width : null],
        hiddenCount: hidden,
      };
    }
  } else if (container >= 16) {
    const first = natural[0] ?? 0;
    const width = Math.min(first, Math.floor(container));
    return {
      visibleCount: 1,
      widths: [width < first - FIT_EPSILON ? width : null],
      hiddenCount: 0,
    };
  }

  return { visibleCount: 0, widths: [], hiddenCount: count };
}
