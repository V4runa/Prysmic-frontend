import assert from "node:assert/strict";
import test from "node:test";
import { localDateKey } from "../../lib/date";
import {
  ALL_SOURCES_ON,
  bucketsForDay,
  dayStats,
  filterBuckets,
  indexFeed,
  itemDay,
  type SourceFilter,
} from "./calendarLib";
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

test("the tasks filter hides the grid layer and leaves the unfiltered day bucket intact", () => {
  const index = indexFeed(items);
  const agenda = bucketsForDay(index, "2026-11-06");
  assert.ok(agenda.tasks.length >= 2);

  const hidden = filterBuckets(agenda, tasksOff);
  assert.equal(hidden.tasks.length, 0);
  assert.equal(hidden.notes.length, agenda.notes.length);
  assert.equal(hidden.moods.length, agenda.moods.length);
  assert.equal(hidden.habits.length, agenda.habits.length);
  assert.equal(hidden.events.length, agenda.events.length);

  const shown = filterBuckets(agenda, ALL_SOURCES_ON);
  assert.deepEqual(
    shown.tasks.map((t) => t.id),
    agenda.tasks.map((t) => t.id)
  );
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
