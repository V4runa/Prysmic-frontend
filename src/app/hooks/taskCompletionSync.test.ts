import assert from "node:assert/strict";
import test from "node:test";
import { QueryClient } from "@tanstack/react-query";
import type { CalendarFeed, CalendarItem } from "../calendar/types";
import { calendarQueryKey } from "./useCalendar";
import { rememberTaskCompletion } from "./taskCompletionSync";
import { tasksQueryKey } from "./useTasks";
import { TaskPriority, type Task } from "../tasks/types/task";

const openTask: CalendarItem = {
  source: "task",
  id: 4,
  title: "Leave the gate open",
  priority: 3,
  isComplete: false,
  dueDate: "2026-11-06T00:00:00.000Z",
};

const doneTask: CalendarItem = {
  source: "task",
  id: 5,
  title: "Shut the gate",
  priority: 1,
  isComplete: true,
  dueDate: "2026-11-06T00:00:00.000Z",
};

function taskRow(item: Extract<CalendarItem, { source: "task" }>, isComplete = item.isComplete): Task {
  return {
    id: item.id,
    userId: 1,
    title: item.title,
    isComplete,
    isArchived: false,
    priority: item.priority as TaskPriority,
    dueDate: item.dueDate,
    createdAt: "2026-11-06T00:00:00.000Z",
    updatedAt: "2026-11-06T00:00:00.000Z",
  };
}

test("remembering completion updates every cached calendar window", () => {
  const client = new QueryClient();
  const november: CalendarFeed = {
    from: "2026-11-01",
    to: "2026-11-30",
    items: [openTask, doneTask],
  };
  const october: CalendarFeed = {
    from: "2026-10-01",
    to: "2026-10-31",
    items: [{ ...openTask, dueDate: "2026-10-20T00:00:00.000Z" }],
  };
  client.setQueryData([...calendarQueryKey, november.from, november.to], november);
  client.setQueryData([...calendarQueryKey, october.from, october.to], october);
  client.setQueryData(tasksQueryKey, [taskRow(openTask), taskRow(doneTask)]);

  rememberTaskCompletion(client, openTask.id, true);

  const nextNovember = client.getQueryData<CalendarFeed>([
    ...calendarQueryKey,
    november.from,
    november.to,
  ]);
  const nextOctober = client.getQueryData<CalendarFeed>([
    ...calendarQueryKey,
    october.from,
    october.to,
  ]);
  const novemberOpen = nextNovember?.items.find(
    (item) => item.source === "task" && item.id === openTask.id,
  );
  const novemberDone = nextNovember?.items.find(
    (item) => item.source === "task" && item.id === doneTask.id,
  );
  const octoberOpen = nextOctober?.items[0];
  assert.ok(novemberOpen && novemberOpen.source === "task" && novemberOpen.isComplete);
  assert.ok(novemberDone && novemberDone.source === "task" && novemberDone.isComplete);
  assert.ok(octoberOpen && octoberOpen.source === "task" && octoberOpen.isComplete);
  assert.equal(openTask.isComplete, false);
  assert.equal(client.getQueryData<Task[]>(tasksQueryKey)?.find((task) => task.id === openTask.id)?.isComplete, true);

  rememberTaskCompletion(client, doneTask.id, false, { tasks: false });
  const reopenedFeed = client.getQueryData<CalendarFeed>([
    ...calendarQueryKey,
    november.from,
    november.to,
  ]);
  const reopened = reopenedFeed?.items.find(
    (item) => item.source === "task" && item.id === doneTask.id,
  );
  assert.ok(reopened && reopened.source === "task" && reopened.isComplete === false);
  assert.equal(
    client.getQueryData<Task[]>(tasksQueryKey)?.find((task) => task.id === doneTask.id)?.isComplete,
    true,
  );
});
