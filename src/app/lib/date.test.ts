import assert from "node:assert/strict";
import test from "node:test";
import { format } from "date-fns";
import { localDateKey, logicalToday, taskDueDayKey } from "./date";
import { formatTaskDueDate, taskDueInputValue } from "../tasks/taskDueDate";

/**
 * What the task API does with a date-only body (`dueDate: "YYYY-MM-DD"`):
 * JavaScript parses that form as UTC midnight, and Nest serializes the stored
 * timestamp with `Date.toISOString()`. No network call — this is the contract.
 */
function persistedDueIso(dateOnly: string): string {
  return new Date(dateOnly).toISOString();
}

/** The list label and calendar day the app used before this fix. */
function legacyDay(value: string): string {
  return localDateKey(value);
}

function legacyLabel(value: string): string {
  return format(new Date(value), "PPP");
}

const GARDEN_DAY = "2026-11-06";
const storedGardenDay = persistedDueIso(GARDEN_DAY);

test("the runner is actually in the requested timezone", () => {
  assert.equal(
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    process.env.TZ
  );
});

test("a date-only due date persists as UTC midnight of that day", () => {
  assert.equal(storedGardenDay, "2026-11-06T00:00:00.000Z");
});

test("Nov 6 2026 stays November 6th from create through label, edit, and resave", () => {
  assert.equal(taskDueDayKey(GARDEN_DAY), GARDEN_DAY);
  assert.equal(taskDueDayKey(storedGardenDay), GARDEN_DAY);
  assert.equal(formatTaskDueDate(GARDEN_DAY), "November 6th, 2026");
  assert.equal(formatTaskDueDate(storedGardenDay), "November 6th, 2026");

  const input = taskDueInputValue(storedGardenDay);
  assert.equal(input, GARDEN_DAY);
  const resaved = persistedDueIso(input);
  assert.equal(taskDueDayKey(resaved), GARDEN_DAY);
  assert.equal(formatTaskDueDate(resaved), "November 6th, 2026");

  const moved = "2026-12-01";
  const movedStored = persistedDueIso(moved);
  assert.equal(taskDueInputValue(movedStored), moved);
  assert.equal(taskDueDayKey(movedStored), moved);
  assert.equal(formatTaskDueDate(movedStored), "December 1st, 2026");
});

test("reproduces the America/New_York off-by-one and leaves UTC and Tokyo on the picked day", () => {
  const tz = process.env.TZ;
  if (tz === "America/New_York") {
    assert.equal(legacyDay(storedGardenDay), "2026-11-05");
    assert.equal(legacyLabel(storedGardenDay), "November 5th, 2026");
  } else if (tz === "UTC" || tz === "Asia/Tokyo") {
    assert.equal(legacyDay(storedGardenDay), GARDEN_DAY);
    assert.equal(legacyLabel(storedGardenDay), "November 6th, 2026");
  } else {
    assert.fail(`unexpected TZ ${tz}`);
  }
  assert.equal(formatTaskDueDate(storedGardenDay), "November 6th, 2026");
});

test("DST transition and midnight date-only values stay on the picked day", () => {
  for (const day of ["2026-03-08", "2026-11-01", "2026-11-06"]) {
    const iso = persistedDueIso(day);
    assert.equal(iso, `${day}T00:00:00.000Z`);
    assert.equal(taskDueDayKey(day), day);
    assert.equal(taskDueDayKey(iso), day);
    assert.equal(taskDueInputValue(iso), day);
    if (process.env.TZ === "America/New_York") {
      assert.equal(legacyDay(iso), legacyDay(`${day}T00:00:00.000Z`));
      assert.notEqual(legacyDay(iso), day);
    }
  }
});

test("accepts the ISO shapes a timestamp column round-trips as", () => {
  for (const value of [
    "2026-11-06",
    "2026-11-06T00:00:00Z",
    "2026-11-06T00:00:00.000Z",
    "2026-11-06T00:00:00.000000Z",
    "2026-11-06T00:00:00+00:00",
    "2026-11-06T00:00:00.000+00:00",
    "2026-11-06T00:00:00+0000",
    "2026-11-06T00:00:00-00:00",
  ]) {
    assert.equal(taskDueDayKey(value), "2026-11-06", value);
    assert.equal(formatTaskDueDate(value), "November 6th, 2026", value);
  }
});

test("a timestamp with a real time-of-day stays on the local day", () => {
  const eveningBeforeUtc = "2026-11-06T03:30:00.000Z";
  const afterTokyoMidnight = "2026-11-06T15:30:00.000Z";
  const tz = process.env.TZ;

  assert.equal(taskDueDayKey(eveningBeforeUtc), localDateKey(eveningBeforeUtc));
  assert.equal(taskDueDayKey(afterTokyoMidnight), localDateKey(afterTokyoMidnight));

  if (tz === "America/New_York") {
    assert.equal(taskDueDayKey(eveningBeforeUtc), "2026-11-05");
    assert.equal(formatTaskDueDate(eveningBeforeUtc), "November 5th, 2026");
    assert.equal(taskDueInputValue(eveningBeforeUtc), "2026-11-05");
    assert.equal(eveningBeforeUtc.slice(0, 10), "2026-11-06");
    assert.equal(taskDueDayKey(afterTokyoMidnight), "2026-11-06");
  } else if (tz === "UTC") {
    assert.equal(taskDueDayKey(eveningBeforeUtc), "2026-11-06");
    assert.equal(taskDueDayKey(afterTokyoMidnight), "2026-11-06");
  } else if (tz === "Asia/Tokyo") {
    assert.equal(taskDueDayKey(eveningBeforeUtc), "2026-11-06");
    assert.equal(taskDueDayKey(afterTokyoMidnight), "2026-11-07");
    assert.equal(formatTaskDueDate(afterTokyoMidnight), "November 7th, 2026");
  } else {
    assert.fail(`unexpected TZ ${tz}`);
  }
});

test("logical today follows the rollover hour and defaults to 6am", () => {
  const early = new Date(2026, 10, 9, 5, 30, 0);
  const boundary = new Date(2026, 10, 9, 6, 0, 0);
  const twoAm = new Date(2026, 10, 9, 2, 0, 0);
  assert.equal(logicalToday(early, 6), "2026-11-08");
  assert.equal(logicalToday(boundary, 6), "2026-11-09");
  assert.equal(logicalToday(twoAm, 0), "2026-11-09");
  assert.equal(logicalToday(twoAm, 8), "2026-11-08");
  assert.equal(logicalToday(new Date(2026, 10, 9, 8, 0, 0), 8), "2026-11-09");
  assert.equal(logicalToday(early), "2026-11-08");
});

test("an empty due date stays empty in the editor", () => {
  assert.equal(taskDueInputValue(null), "");
  assert.equal(taskDueInputValue(undefined), "");
  assert.equal(taskDueInputValue(""), "");
});
