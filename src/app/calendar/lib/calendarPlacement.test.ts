import assert from "node:assert/strict";
import test from "node:test";
import { localDateKey } from "../../lib/date";
import {
  ALL_SOURCES_ON,
  bucketsForDay,
  dayStats,
  filterBuckets,
  focusDayForView,
  indexFeed,
  itemDay,
  visibleDayBuckets,
  weekRange,
  type SourceFilter,
} from "./calendarLib";
import type { CalendarSource } from "../types";
import type {
  CalendarEventItem,
  CalendarHabitItem,
  CalendarItem,
  CalendarMoodItem,
  CalendarNoteItem,
  CalendarTaskItem,
} from "../types";

/**
 * Feed fixtures mirror the calendar API. Date-only task due dates arrive as
 * UTC midnight. Habit ("contract") and mood dates are already YYYY-MM-DD.
 * Notes are real instants and must keep local-day placement.
 */
const STORED_GARDEN_DUE = new Date("2026-11-06").toISOString();

const activeTask: CalendarTaskItem = {
  source: "task",
  id: 1,
  title: "Test — choose the garden path",
  priority: 2,
  isComplete: false,
  dueDate: STORED_GARDEN_DUE,
};

const completedTask: CalendarTaskItem = {
  source: "task",
  id: 2,
  title: "Closed the gate",
  priority: 1,
  isComplete: true,
  dueDate: "2026-11-06T00:00:00.000Z",
};

const timedTask: CalendarTaskItem = {
  source: "task",
  id: 7,
  title: "Water before midnight",
  priority: 3,
  isComplete: false,
  dueDate: "2026-11-06T03:30:00.000Z",
};

const note: CalendarNoteItem = {
  source: "note",
  id: 3,
  title: "Soil notes",
  createdAt: "2026-11-06T00:00:00.000Z",
};

const habit: CalendarHabitItem = {
  source: "habit",
  key: "habit-4-2026-11-06",
  id: 4,
  title: "Garden contract",
  color: "#88a",
  date: "2026-11-06",
  expected: true,
  checked: true,
};

const mood: CalendarMoodItem = {
  source: "mood",
  id: 8,
  moodType: "calm",
  emoji: "🌿",
  date: "2026-11-06",
  backfilled: false,
};

const event: CalendarEventItem = {
  source: "event",
  key: "event-9-2026-11-06",
  id: 9,
  title: "Walk the beds",
  allDay: true,
  startDate: "2026-11-06",
  endDate: "2026-11-06",
  recurrence: "none",
  isRecurringInstance: false,
  color: "cyan",
};

const items: CalendarItem[] = [
  activeTask,
  completedTask,
  timedTask,
  note,
  habit,
  mood,
  event,
];

const tasksOff: SourceFilter = { ...ALL_SOURCES_ON, task: false };

test("date-only tasks land on the picked day in the day bucket views read", () => {
  const index = indexFeed(items);
  assert.equal(itemDay(activeTask), "2026-11-06");
  assert.equal(itemDay(completedTask), "2026-11-06");

  const nov6 = bucketsForDay(index, "2026-11-06");
  const titles = nov6.tasks.map((t) => t.title);
  assert.ok(titles.includes(activeTask.title));
  assert.ok(titles.includes(completedTask.title));

  const nov5 = bucketsForDay(index, "2026-11-05");
  assert.equal(
    nov5.tasks.some((t) => t.id === activeTask.id || t.id === completedTask.id),
    false
  );

  if (process.env.TZ === "America/New_York") {
    assert.equal(localDateKey(STORED_GARDEN_DUE), "2026-11-05");
  }
});

test("week and day agenda titles follow the bucket; the month cell uses the count", () => {
  const index = indexFeed(items);
  const agenda = bucketsForDay(index, "2026-11-06");
  const grid = filterBuckets(agenda, ALL_SOURCES_ON);
  const titles = grid.tasks.map((t) => t.title);

  // Week cells and the day agenda render these titles. The month cell does not:
  // DaySummary shows dayStats.tasks, a count, instead of the title.
  assert.ok(titles.includes("Test — choose the garden path"));
  assert.ok(titles.includes("Closed the gate"));

  const stats = dayStats(grid);
  assert.equal(stats.tasks, grid.tasks.length);
  assert.equal(
    stats.tasksDone,
    grid.tasks.filter((t) => t.isComplete).length
  );
  assert.equal(grid.tasks.find((t) => t.id === activeTask.id)?.isComplete, false);
  assert.equal(grid.tasks.find((t) => t.id === completedTask.id)?.isComplete, true);

  if (process.env.TZ === "America/New_York") {
    assert.deepEqual(titles.sort(), [
      "Closed the gate",
      "Test — choose the garden path",
    ]);
    assert.equal(stats.tasks, 2);
    assert.equal(stats.tasksDone, 1);
  } else {
    assert.ok(titles.includes("Water before midnight"));
    assert.equal(stats.tasks, 3);
    assert.equal(stats.tasksDone, 1);
  }
});

test("filtering returns a copy and does not mutate the day bucket", () => {
  const index = indexFeed(items);
  const agenda = bucketsForDay(index, "2026-11-06");
  assert.ok(agenda.tasks.length >= 2);
  const before = agenda.tasks.map((t) => t.id);

  const hidden = filterBuckets(agenda, tasksOff);
  assert.equal(hidden.tasks.length, 0);
  assert.equal(hidden.notes.length, agenda.notes.length);
  assert.equal(hidden.moods.length, agenda.moods.length);
  assert.equal(hidden.habits.length, agenda.habits.length);
  assert.equal(hidden.events.length, agenda.events.length);
  assert.deepEqual(
    agenda.tasks.map((t) => t.id),
    before
  );

  const shown = filterBuckets(agenda, ALL_SOURCES_ON);
  assert.deepEqual(
    shown.tasks.map((t) => t.id),
    before
  );
});

test("the agenda uses the same source lens as the grid, for every entry type", () => {
  const index = indexFeed(items);
  const day = "2026-11-06";
  const noteDay = itemDay(note);

  const keys = {
    event: "events",
    task: "tasks",
    habit: "habits",
    mood: "moods",
    note: "notes",
  } as const;

  const lensDay = (source: CalendarSource) =>
    source === "note" ? noteDay : day;

  for (const source of Object.keys(keys) as CalendarSource[]) {
    const on = visibleDayBuckets(index, lensDay(source), ALL_SOURCES_ON);
    const off = visibleDayBuckets(index, lensDay(source), {
      ...ALL_SOURCES_ON,
      [source]: false,
    });
    const key = keys[source];
    assert.ok(on[key].length > 0, `${source} is present before the filter`);
    assert.equal(off[key].length, 0, `${source} is hidden when its filter is off`);
  }

  const shown = visibleDayBuckets(index, day, ALL_SOURCES_ON);
  const done = shown.tasks.find((t) => t.id === completedTask.id);
  assert.equal(done?.isComplete, true);
  assert.ok(shown.tasks.some((t) => t.isComplete === false));

  const tasksHidden = visibleDayBuckets(index, day, tasksOff);
  assert.equal(
    tasksHidden.tasks.some((t) => t.id === completedTask.id),
    false
  );
  assert.ok(tasksHidden.events.length > 0);
  assert.ok(tasksHidden.habits.length > 0);
  assert.ok(tasksHidden.moods.length > 0);
});

test("switching views opens the selected day, or the start of the period", () => {
  // November 2026's grid includes Oct 26–Dec 6. The 9th is a Monday.
  assert.equal(focusDayForView("month", "2026-11-09", "2026-11-03"), "2026-11-03");
  // A leading day from the previous month is a real selection, not today.
  assert.equal(focusDayForView("month", "2026-11-09", "2026-10-28"), "2026-10-28");
  // Today left behind while browsing October is not on that grid.
  assert.equal(focusDayForView("month", "2026-10-09", "2026-11-09"), "2026-10-01");
  // A trailing day of the next month stays selected.
  assert.equal(focusDayForView("month", "2026-10-09", "2026-11-01"), "2026-11-01");
  // The week of a selected day in the viewed month, not the navigation cursor.
  assert.equal(focusDayForView("month", "2026-10-09", "2026-10-20"), "2026-10-20");
  const octoberWeek = weekRange(focusDayForView("month", "2026-10-09", "2026-10-20"));
  assert.equal(octoberWeek.from <= "2026-10-20" && octoberWeek.to >= "2026-10-20", true);

  // Week of Nov 9–15. A click inside it wins; a click outside falls back to Monday.
  assert.equal(focusDayForView("week", "2026-11-11", "2026-11-12"), "2026-11-12");
  assert.equal(focusDayForView("week", "2026-11-11", "2026-11-03"), "2026-11-09");
  assert.equal(focusDayForView("week", "2026-10-09", "2026-10-20"), "2026-10-05");

  // Day view is already the day on screen.
  assert.equal(focusDayForView("day", "2026-10-28", "2026-11-09"), "2026-10-28");
  assert.equal(focusDayForView("month", "2026-10-09", null), "2026-10-01");
});

test("notes stay on the local instant; contracts, moods, and events stay on their calendar day", () => {
  const index = indexFeed(items);
  const noteDay = localDateKey(note.createdAt);
  assert.equal(itemDay(note), noteDay);
  assert.equal(
    bucketsForDay(index, noteDay).notes.some((n) => n.title === note.title),
    true
  );

  assert.equal(itemDay(habit), "2026-11-06");
  assert.equal(itemDay(mood), "2026-11-06");
  assert.equal(itemDay(event), "2026-11-06");

  const nov6 = bucketsForDay(index, "2026-11-06");
  assert.equal(nov6.habits[0]?.title, "Garden contract");
  assert.equal(nov6.moods[0]?.date, "2026-11-06");
  assert.equal(nov6.events[0]?.title, "Walk the beds");
  assert.equal(bucketsForDay(index, "2026-11-05").habits.length, 0);
  assert.equal(bucketsForDay(index, "2026-11-05").moods.length, 0);
  assert.equal(bucketsForDay(index, "2026-11-05").events.length, 0);

  if (process.env.TZ === "America/New_York") {
    assert.equal(noteDay, "2026-11-05");
    assert.equal(
      nov6.notes.some((n) => n.id === note.id),
      false
    );
  } else if (process.env.TZ === "UTC" || process.env.TZ === "Asia/Tokyo") {
    assert.equal(noteDay, "2026-11-06");
  } else {
    assert.fail(`unexpected TZ ${process.env.TZ}`);
  }
});

test("a timed task follows the local day and does not drag contracts with it", () => {
  const index = indexFeed(items);
  const day = localDateKey(timedTask.dueDate);
  assert.equal(itemDay(timedTask), day);
  assert.equal(
    bucketsForDay(index, day).tasks.some((t) => t.title === timedTask.title),
    true
  );
  assert.equal(itemDay(habit), "2026-11-06");

  if (process.env.TZ === "America/New_York") {
    assert.equal(day, "2026-11-05");
    assert.equal(
      bucketsForDay(index, "2026-11-06").tasks.some((t) => t.id === timedTask.id),
      false
    );
  } else if (process.env.TZ === "UTC" || process.env.TZ === "Asia/Tokyo") {
    assert.equal(day, "2026-11-06");
  }
});
