import assert from "node:assert/strict";
import test from "node:test";
import { ApiError } from "../hooks/useApi";
import { taskParamState } from "./calendarDay";
import { isFocusedTaskMissing, isMissingRecord } from "./missingRecord";

test("a 404 is a missing record, and other failures are not", () => {
  assert.equal(
    isMissingRecord(new ApiError(404, "Not Found", { message: "Note not found" }, null)),
    true
  );
  assert.equal(
    isMissingRecord(new ApiError(404, "Not Found", { message: "Habit not found" }, null)),
    true
  );
  assert.equal(isMissingRecord(new ApiError(400, "Bad Request", { message: "bad" }, null)), false);
  assert.equal(isMissingRecord(new ApiError(500, "Error", { message: "down" }, null)), false);
  assert.equal(isMissingRecord(new Error("network")), false);
  assert.equal(isMissingRecord(null), false);
});

test("a focused task is missing only when the link is bad or the loaded list lacks it", () => {
  const tasks = [{ id: 4 }, { id: 9 }];
  assert.equal(isFocusedTaskMissing(taskParamState(""), undefined), false);
  assert.equal(isFocusedTaskMissing(taskParamState(""), tasks), false);
  assert.equal(isFocusedTaskMissing(taskParamState("task=nope"), undefined), true);
  assert.equal(isFocusedTaskMissing(taskParamState("task="), undefined), true);
  assert.equal(isFocusedTaskMissing(taskParamState("task=9"), undefined), false);
  assert.equal(isFocusedTaskMissing(taskParamState("task=9"), tasks), false);
  assert.equal(isFocusedTaskMissing(taskParamState("task=3"), tasks), true);
  assert.equal(isFocusedTaskMissing({ kind: "id", id: 3 }, undefined), false);
});
