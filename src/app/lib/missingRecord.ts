import type { TaskParamState } from "./calendarDay";
import { ApiError } from "../hooks/useApi";

/** A missing note, task, or contract. Malformed ids are caught before the request. */
export function isMissingRecord(err: unknown): boolean {
  return err instanceof ApiError && err.status === 404;
}

/**
 * The tasks list is the task page. A bad `task` value is missing immediately.
 * A real id is missing once the list has loaded without it. A list that has
 * not settled yet is not treated as missing, so a slow load does not flash
 * "not found".
 */
export function isFocusedTaskMissing(
  focus: TaskParamState,
  loadedTasks: { id: number }[] | undefined
): boolean {
  if (focus.kind === "absent") return false;
  if (focus.kind === "invalid") return true;
  if (!loadedTasks) return false;
  return !loadedTasks.some((task) => task.id === focus.id);
}
