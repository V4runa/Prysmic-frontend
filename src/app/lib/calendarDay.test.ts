import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  calendarDayFromSearch,
  calendarDayHref,
  formatCalendarDay,
  habitHref,
  isCalendarDayKey,
  linkedItemHref,
  moodHref,
  noteHref,
  parseTaskFocus,
  taskHref,
} from "./calendarDay";

test("calendar day keys reject impossible dates and do not shift the written day", () => {
  assert.equal(isCalendarDayKey("2026-11-11"), true);
  assert.equal(isCalendarDayKey("2024-02-29"), true);
  assert.equal(isCalendarDayKey("2026-02-29"), false);
  assert.equal(isCalendarDayKey("2026-11-31"), false);
  assert.equal(isCalendarDayKey("2026-13-01"), false);
  assert.equal(isCalendarDayKey("2026-00-10"), false);
  assert.equal(isCalendarDayKey("11-11-2026"), false);
  assert.equal(isCalendarDayKey("2026-11-11T00:00:00.000Z"), false);
  assert.equal(isCalendarDayKey(""), false);
  assert.equal(isCalendarDayKey(null), false);
  assert.equal(isCalendarDayKey(undefined), false);

  assert.equal(calendarDayFromSearch("date=2026-11-11"), "2026-11-11");
  assert.equal(calendarDayFromSearch("view=month&date=2024-02-29"), "2024-02-29");
  assert.equal(calendarDayFromSearch("date=2026-02-29"), null);
  assert.equal(calendarDayFromSearch("date=2026-11-11T00:00:00.000Z"), null);
  assert.equal(calendarDayFromSearch(""), null);

  assert.equal(formatCalendarDay("2026-11-11"), "Nov 11, 2026");
  assert.equal(formatCalendarDay("2026-11-09"), "Nov 9, 2026");
  assert.equal(formatCalendarDay("not-a-day"), "not-a-day");

  assert.equal(calendarDayHref("2026-11-11"), "/calendar?date=2026-11-11");
  assert.equal(noteHref(4), "/notes/4");
  assert.equal(taskHref(9), "/tasks?task=9");
  assert.equal(parseTaskFocus("task=9"), 9);
  assert.equal(parseTaskFocus("tagId=2&task=9"), 9);
  assert.equal(parseTaskFocus("task=0"), null);
  assert.equal(parseTaskFocus("task=1.5"), null);
  assert.equal(parseTaskFocus("task=01"), 1);
  assert.equal(parseTaskFocus(""), null);
  assert.equal(habitHref(3), "/habits/3");
  assert.equal(habitHref(3, "2026-11-03"), "/habits/3?date=2026-11-03");
  assert.equal(habitHref(3, "nope"), "/habits/3");
  assert.equal(moodHref("2026-11-03"), "/moods?date=2026-11-03");
  assert.equal(linkedItemHref("note", 4), "/notes/4");
  assert.equal(linkedItemHref("task", 9), "/tasks?task=9");
  assert.equal(linkedItemHref("habit", 3, "2026-11-03"), "/habits/3?date=2026-11-03");
});

test("calendar days and module items link to each other", () => {
  const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
  const agenda = read("../calendar/components/DayAgenda.tsx");
  assert.match(agenda, /noteHref/);
  assert.match(agenda, /taskHref/);
  assert.match(agenda, /habitHref/);
  assert.match(agenda, /linkedItemHref/);
  assert.equal(agenda.includes('router.push("/tasks")'), false);

  const week = read("../calendar/components/WeekView.tsx");
  assert.match(week, /noteHref/);
  assert.match(week, /taskHref/);
  assert.match(week, /moodHref/);

  const moodEditor = read("../calendar/components/DayMoodEditor.tsx");
  assert.match(moodEditor, /moodHref/);

  const calendar = read("../calendar/page.tsx");
  assert.match(calendar, /calendarDayFromSearch/);
  assert.match(calendar, /date/);

  assert.match(read("../components/TaskCard.tsx"), /calendarDayHref/);
  assert.match(read("../notes/page.tsx"), /calendarDayHref/);
  assert.match(read("../components/MoodTimeline.tsx"), /calendarDayHref/);
  assert.match(read("../habits/[id]/page.tsx"), /calendarDayHref/);
  assert.match(read("../moods/page.tsx"), /calendarDayFromSearch/);
  assert.match(read("../tasks/page.tsx"), /parseTaskFocus/);
});
