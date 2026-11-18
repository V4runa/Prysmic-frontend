import assert from "node:assert/strict";
import test from "node:test";
import { monthGridRange } from "../calendar/lib/calendarLib";
import {
  CHECKIN_RANGE_MAX_DAYS,
  applyCheckinDate,
  buildRecordDays,
  canStepRecordMonth,
  checkinRangeForMonth,
  checkinsPath,
  contractSignedDay,
  inclusiveDaySpan,
  parseCheckins,
  recordDayLabel,
  stepRecordMonth,
} from "./contractRecord";

function flat(weeks: ReturnType<typeof buildRecordDays>) {
  return weeks.flat();
}

test("one calendar month stays inside the check-in range cap", () => {
  for (const anchor of ["2026-11-18", "2026-02-01", "2024-02-29", "2026-08-31", "2026-03-01"]) {
    const range = checkinRangeForMonth(anchor);
    const span = inclusiveDaySpan(range.from, range.to);
    assert.equal(span <= CHECKIN_RANGE_MAX_DAYS, true, anchor);
    assert.equal(span <= 42, true, anchor);
    assert.equal(new Date(`${range.from}T00:00:00Z`).getUTCDay(), 1, range.from);
    assert.equal(new Date(`${range.to}T00:00:00Z`).getUTCDay(), 0, range.to);
    assert.deepEqual(range, monthGridRange(anchor));
  }
  assert.equal(
    checkinsPath(4, "2026-11-18"),
    `/habits/4/checkins?from=${monthGridRange("2026-11-18").from}&to=${monthGridRange("2026-11-18").to}`
  );
});

test("check-ins are the returned days, and a month cannot step past the current one", () => {
  const parsed = parseCheckins({
    from: "2026-10-26",
    to: "2026-12-06",
    dates: ["2026-11-18", "2026-11-02", "2026-11-02", "nope", "2026-11-18T00:00:00.000Z"],
    signedAt: "2026-10-02T00:00:00.000Z",
  });
  assert.ok(parsed);
  assert.deepEqual(parsed.dates, ["2026-11-02", "2026-11-18"]);
  assert.equal("signedDay" in parsed, false);
  assert.equal(parseCheckins({ from: "2026-11-01", to: "2026-11-30" }), null);
  assert.equal(parseCheckins({ from: "2026-11-30", to: "2026-11-01", dates: [] }), null);
  assert.equal(parseCheckins({ from: "2026-02-31", to: "2026-03-01", dates: [] }), null);
  assert.equal(parseCheckins({ from: "2026-01-01", to: "2026-04-01", dates: [] }), null);
  assert.equal(parseCheckins(null), null);

  assert.equal(canStepRecordMonth("2026-11-18", "2026-11-18", 1), false);
  assert.equal(canStepRecordMonth("2026-11-01", "2026-11-30", 1), false);
  assert.equal(canStepRecordMonth("2026-10-18", "2026-11-18", 1), true);
  assert.equal(stepRecordMonth("2026-11-18", "2026-11-18", 1), "2026-11-18");
  assert.equal(stepRecordMonth("2026-10-18", "2026-11-18", 1), "2026-11-18");
  assert.equal(stepRecordMonth("2026-11-18", "2026-11-18", -1), "2026-10-18");

  const weeks = buildRecordDays({
    anchor: "2026-11-18",
    today: "2026-11-18",
    signedDay: "2026-10-02",
    dates: ["2026-11-02", "2026-11-09", "2026-11-18"],
  });
  const days = flat(weeks);
  assert.equal(weeks[0]?.length, 7);
  assert.equal(days.find((day) => day.key === "2026-11-02")?.kept, true);
  assert.equal(days.find((day) => day.key === "2026-11-03")?.kept, false);
  assert.equal(days.find((day) => day.key === "2026-11-18")?.isToday, true);
  assert.equal(days.find((day) => day.key === "2026-11-18")?.kept, true);
  assert.equal(days.filter((day) => day.kept).map((day) => day.key).join(","), "2026-11-02,2026-11-09,2026-11-18");
  assert.equal(recordDayLabel(days.find((day) => day.key === "2026-11-18")!), "Nov 18, 2026, today, kept");
});

test("weekly and monthly contracts mark only the day that was kept", () => {
  const days = flat(
    buildRecordDays({
      anchor: "2026-11-18",
      today: "2026-11-18",
      signedDay: "2026-01-01",
      dates: ["2026-11-12"],
    })
  );
  assert.deepEqual(
    days.filter((day) => day.kept).map((day) => day.key),
    ["2026-11-12"]
  );
});

test("days before the contract was signed come from the habit createdAt", () => {
  assert.equal(contractSignedDay("2026-10-02T00:00:00.000Z"), "2026-10-02");
  assert.equal(contractSignedDay("2026-10-02"), "2026-10-02");
  assert.equal(contractSignedDay(""), null);
  assert.equal(contractSignedDay(null), null);
  const days = flat(
    buildRecordDays({
      anchor: "2026-10-18",
      today: "2026-11-18",
      signedDay: contractSignedDay("2026-10-02T00:00:00.000Z"),
      dates: ["2026-10-01", "2026-10-02", "2026-10-05"],
    })
  );
  const first = days.find((day) => day.key === "2026-10-01");
  const signed = days.find((day) => day.key === "2026-10-02");
  const later = days.find((day) => day.key === "2026-10-05");
  assert.equal(first?.beforeContract, true);
  assert.equal(first?.kept, false);
  assert.match(first?.label ?? "", /before this contract/);
  assert.equal(signed?.beforeContract, false);
  assert.equal(signed?.kept, true);
  assert.equal(later?.kept, true);

  const updated = applyCheckinDate(
    { from: "2026-10-01", to: "2026-10-31", dates: ["2026-10-02"] },
    "2026-10-05",
    true
  );
  assert.deepEqual(updated.dates, ["2026-10-02", "2026-10-05"]);
  const undone = applyCheckinDate(updated, "2026-10-02", false);
  assert.deepEqual(undone.dates, ["2026-10-05"]);
});
