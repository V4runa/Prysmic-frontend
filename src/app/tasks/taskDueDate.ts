import { format } from "date-fns";
import { taskDueDayKey } from "../lib/date";

/** "November 6th, 2026" for the task's intended calendar day. */
export function formatTaskDueDate(dueDate: string): string {
  const [year, month, day] = taskDueDayKey(dueDate).split("-").map(Number);
  return format(new Date(year, month - 1, day), "PPP");
}

/** `<input type="date">` value: the same intended day the list and calendar use. */
export function taskDueInputValue(dueDate?: string | null): string {
  if (!dueDate) return "";
  return taskDueDayKey(dueDate);
}
