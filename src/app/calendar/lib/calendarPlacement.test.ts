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
  monthTaskMark,
  taskChipKey,
  taskDoneToggleLabel,
  taskPlacements,
  taskSectionTitle,
  visibleDayBuckets,
  weekRange,
  withTaskCompletion,
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

test("a task is checked only when isComplete is true", () => {
  // Priority, id, and due date are always set. They are not completion.
  const open = monthTaskMark([activeTask, timedTask]);
  assert.equal(open.checked, false);
  assert.equal(open.done, 0);
  assert.equal(open.text, "2");
  assert.match(open.label, /open/);

  const mixed = monthTaskMark([activeTask, completedTask]);
  assert.equal(mixed.checked, false);
  assert.equal(mixed.text, "1/2");
  assert.equal(mixed.label, "1 of 2 tasks completed");

  const done = monthTaskMark([completedTask]);
  assert.equal(done.checked, true);
  assert.equal(done.text, "1");
  assert.equal(done.label, "1 completed task");

  assert.equal(taskDoneToggleLabel(activeTask.title, false), `Mark done, ${activeTask.title}`);
  assert.equal(
    taskDoneToggleLabel(completedTask.title, true),
    `Mark not done, ${completedTask.title}`,
  );
});

test("updating completion flips isComplete and leaves the rest of the feed", () => {
  const feed: CalendarItem[] = [activeTask, completedTask, event, habit];
  const marked = withTaskCompletion(feed, activeTask.id, true);
  const updated = marked.find((item) => item.source === "task" && item.id === activeTask.id);
  assert.ok(updated && updated.source === "task" && updated.isComplete);
  assert.equal(activeTask.isComplete, false);
  assert.equal(
    marked.find((item) => item.source === "task" && item.id === completedTask.id),
    completedTask,
  );
  assert.equal(marked.find((item) => item.source === "event"), event);

  const cleared = withTaskCompletion(marked, completedTask.id, false);
  const reopened = cleared.find((item) => item.source === "task" && item.id === completedTask.id);
  assert.ok(reopened && reopened.source === "task" && reopened.isComplete === false);
  assert.equal(monthTaskMark(cleared.filter((item) => item.source === "task")).checked, false);

  assert.equal(withTaskCompletion(feed, activeTask.id, false), feed);
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

function chipsOn(items: CalendarItem[], day: string) {
  return bucketsForDay(indexFeed(items), day).tasks;
}

test("a feed without the new task fields still places each task on its due day only", () => {
  const index = indexFeed(items);
  const nov6 = bucketsForDay(index, "2026-11-06");
  assert.ok(nov6.tasks.length >= 2);
  for (const task of nov6.tasks) {
    assert.equal(task.chip, "due");
    assert.equal(task.calendarReason, undefined);
    assert.equal(task.completedAt, undefined);
  }
  assert.equal(taskSectionTitle(nov6.tasks), "Tasks due");
  assert.equal(itemDay(completedTask), "2026-11-06");
  assert.deepEqual(taskPlacements(completedTask), [
    { day: "2026-11-06", reason: "due" },
  ]);

  const keys = nov6.tasks.map((task) => taskChipKey(task, "2026-11-06"));
  assert.equal(new Set(keys).size, keys.length);
});

test("a task finished with no due date sits on the finish day and is not presented as due", () => {
  // The backend repeats completedAt into dueDate so older clients still get a string.
  const completedAt = "2026-11-06T00:00:00.000Z";
  const task: CalendarTaskItem = {
    source: "task",
    id: 21,
    title: "Put the tools away",
    priority: 1,
    isComplete: true,
    dueDate: completedAt,
    completedAt,
    calendarReason: "completed",
  };

  const finish = localDateKey(completedAt);
  assert.deepEqual(taskPlacements(task), [{ day: finish, reason: "completed" }]);
  assert.equal(itemDay(task), finish);

  const day = chipsOn([task], finish);
  assert.equal(day.length, 1);
  assert.equal(day[0]?.id, task.id);
  assert.equal(day[0]?.chip, "completed");
  assert.equal(day[0]?.isComplete, true);
  assert.equal(taskSectionTitle(day), "Tasks");
  assert.equal(monthTaskMark(day).checked, true);
  assert.equal(monthTaskMark(day).label, "1 completed task");
  assert.equal(taskChipKey(day[0]!, finish), `task-${task.id}-${finish}-completed`);
  assert.equal("chip" in task, false);

  const dueDay = "2026-11-06";
  if (finish !== dueDay) {
    assert.equal(chipsOn([task], dueDay).length, 0);
  }
  if (process.env.TZ === "America/New_York") {
    assert.equal(finish, "2026-11-05");
    assert.equal(dueDay, "2026-11-06");
  } else if (process.env.TZ === "UTC" || process.env.TZ === "Asia/Tokyo") {
    assert.equal(finish, "2026-11-06");
  }
});

test("a finished task with a due date outside this window is not also drawn on that due day", () => {
  const completedAt = "2026-11-08T12:00:00.000Z";
  const task: CalendarTaskItem = {
    source: "task",
    id: 22,
    title: "Stack the pots",
    priority: 2,
    isComplete: true,
    dueDate: "2026-11-01T00:00:00.000Z",
    completedAt,
    calendarReason: "completed",
  };

  const finish = localDateKey(completedAt);
  assert.equal(finish, "2026-11-08");
  assert.deepEqual(taskPlacements(task), [{ day: finish, reason: "completed" }]);
  assert.equal(chipsOn([task], "2026-11-01").length, 0);
  const day = chipsOn([task], finish);
  assert.equal(day.length, 1);
  assert.equal(day[0]?.isComplete, true);
  assert.equal(day[0]?.chip, "completed");
  assert.equal(taskSectionTitle(day), "Tasks");
});

test("a task due and finished on the same local day is one done chip", () => {
  // Noon UTC is still November 6 in New York, UTC, and Tokyo.
  const completedAt = "2026-11-06T12:00:00.000Z";
  const task: CalendarTaskItem = {
    source: "task",
    id: 23,
    title: "Close the gate",
    priority: 2,
    isComplete: true,
    dueDate: "2026-11-06T00:00:00.000Z",
    completedAt,
    calendarReason: "both",
  };

  assert.equal(localDateKey(completedAt), "2026-11-06");
  assert.deepEqual(taskPlacements(task), [{ day: "2026-11-06", reason: "due" }]);

  const day = chipsOn([task, activeTask], "2026-11-06");
  const copies = day.filter((item) => item.id === task.id);
  assert.equal(copies.length, 1);
  assert.equal(copies[0]?.chip, "due");
  assert.equal(copies[0]?.isComplete, true);
  assert.equal(taskSectionTitle(day), "Tasks due");
  assert.equal(monthTaskMark(day).checked, false);
  assert.equal(taskChipKey(copies[0]!, "2026-11-06"), "task-23-2026-11-06-due");
});

test("a task due one day and finished on another shows once on each day, marked done", () => {
  const completedAt = "2026-11-08T12:00:00.000Z";
  const task: CalendarTaskItem = {
    source: "task",
    id: 24,
    title: "Turn the beds",
    priority: 3,
    isComplete: true,
    dueDate: "2026-11-06T00:00:00.000Z",
    completedAt,
    calendarReason: "both",
  };

  const finish = localDateKey(completedAt);
  assert.equal(finish, "2026-11-08");
  assert.deepEqual(taskPlacements(task), [
    { day: "2026-11-06", reason: "due" },
    { day: finish, reason: "completed" },
  ]);

  const index = indexFeed([task, activeTask]);
  const due = bucketsForDay(index, "2026-11-06").tasks.filter((item) => item.id === task.id);
  const done = bucketsForDay(index, finish).tasks.filter((item) => item.id === task.id);
  assert.equal(due.length, 1);
  assert.equal(done.length, 1);
  assert.equal(due[0]?.chip, "due");
  assert.equal(done[0]?.chip, "completed");
  assert.equal(due[0]?.isComplete, true);
  assert.equal(done[0]?.isComplete, true);
  assert.equal(taskSectionTitle(bucketsForDay(index, "2026-11-06").tasks), "Tasks due");
  assert.equal(taskSectionTitle(bucketsForDay(index, finish).tasks), "Tasks");
  assert.equal(monthTaskMark(bucketsForDay(index, finish).tasks).checked, true);

  const dueKey = taskChipKey(due[0]!, "2026-11-06");
  const doneKey = taskChipKey(done[0]!, finish);
  assert.equal(dueKey, "task-24-2026-11-06-due");
  assert.equal(doneKey, `task-24-${finish}-completed`);
  assert.notEqual(dueKey, doneKey);

  assert.equal(bucketsForDay(index, "2026-11-07").tasks.some((item) => item.id === task.id), false);
});

test("a due-day row does not also draw a finish day outside this window", () => {
  const task: CalendarTaskItem = {
    source: "task",
    id: 25,
    title: "Rake the path",
    priority: 1,
    isComplete: true,
    dueDate: "2026-11-06T00:00:00.000Z",
    completedAt: "2026-11-02T12:00:00.000Z",
    calendarReason: "due",
  };

  assert.deepEqual(taskPlacements(task), [{ day: "2026-11-06", reason: "due" }]);
  const day = chipsOn([task], "2026-11-06");
  assert.equal(day.length, 1);
  assert.equal(day[0]?.isComplete, true);
  assert.equal(day[0]?.chip, "due");
  assert.equal(chipsOn([task], "2026-11-02").length, 0);
  assert.equal(taskSectionTitle(day), "Tasks due");
  assert.equal(monthTaskMark(day).checked, true);
});

test("a completed task with no stored completion time stays on its due day", () => {
  const task: CalendarTaskItem = {
    source: "task",
    id: 26,
    title: "Oil the shears",
    priority: 1,
    isComplete: true,
    dueDate: "2026-11-06T00:00:00.000Z",
    completedAt: null,
    calendarReason: "due",
  };

  assert.deepEqual(taskPlacements(task), [{ day: "2026-11-06", reason: "due" }]);
  const day = chipsOn([task], "2026-11-06");
  assert.equal(day[0]?.isComplete, true);
  assert.equal(day[0]?.chip, "due");
  assert.equal(monthTaskMark(day).label, "1 completed task");
});
