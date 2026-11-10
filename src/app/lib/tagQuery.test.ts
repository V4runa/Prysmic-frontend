import assert from "node:assert/strict";
import test from "node:test";
import {
  notesTagHref,
  parseTagIds,
  tagDeleteErrorMessage,
  tagFilterHref,
  tagUsageLabel,
  taskMatchesTag,
  tasksTagHref,
} from "./tagQuery";

test("parseTagIds reads repeated and comma-separated tag ids", () => {
  assert.deepEqual(parseTagIds("tagId=3"), [3]);
  assert.deepEqual(parseTagIds("tagId=3&tagId=4"), [3, 4]);
  assert.deepEqual(parseTagIds("tagId=3,4"), [3, 4]);
  assert.deepEqual(parseTagIds("q=1&tagId=8"), [8]);
  assert.deepEqual(parseTagIds("tagId=2&tagId=2"), [2]);
  assert.deepEqual(parseTagIds("tagId=0&tagId=-1&tagId=foo&tagId=2.5&tagId="), []);
});

test("tagFilterHref replaces tag ids and keeps other params", () => {
  assert.equal(tagFilterHref("/tasks", "q=1", [8]), "/tasks?q=1&tagId=8");
  assert.equal(tagFilterHref("/notes", "tagId=1&tagId=2", []), "/notes");
  assert.equal(tagFilterHref("/notes", "", [1, 2]), "/notes?tagId=1&tagId=2");
  assert.equal(notesTagHref(12), "/notes?tagId=12");
  assert.equal(tasksTagHref(12), "/tasks?tagId=12");
});

test("tagUsageLabel pluralizes counts and skips a missing count", () => {
  assert.equal(tagUsageLabel(0, "note", "notes"), "0 notes");
  assert.equal(tagUsageLabel(1, "note", "notes"), "1 note");
  assert.equal(tagUsageLabel(2, "task", "tasks"), "2 tasks");
  assert.equal(tagUsageLabel(undefined, "note", "notes"), "Notes");
  assert.equal(tagUsageLabel(Number.NaN, "task", "tasks"), "Tasks");
});

test("tagDeleteErrorMessage shows the 409 message only", () => {
  assert.equal(
    tagDeleteErrorMessage({
      status: 409,
      body: { statusCode: 409, message: "This tag is still on 2 notes and 1 task.", error: "Conflict" },
    }),
    "This tag is still on 2 notes and 1 task."
  );
  assert.equal(
    tagDeleteErrorMessage({ status: 409, body: { message: ["Still in use."] } }),
    "Still in use."
  );
  assert.equal(
    tagDeleteErrorMessage({ status: 500, body: { message: "Cannot delete tag as it is associated with notes" } }),
    "Failed to delete tag"
  );
  assert.equal(tagDeleteErrorMessage({ status: 409, body: {} }), "Failed to delete tag");
  assert.equal(tagDeleteErrorMessage(new Error("nope")), "Failed to delete tag");
});

test("taskMatchesTag trusts a missing tags array and filters a present one", () => {
  assert.equal(taskMatchesTag({ tags: undefined }, 4), true);
  assert.equal(taskMatchesTag({}, null), true);
  assert.equal(taskMatchesTag({ tags: [{ id: 4 }, { id: 9 }] }, 4), true);
  assert.equal(taskMatchesTag({ tags: [{ id: 9 }] }, 4), false);
  assert.equal(taskMatchesTag({ tags: [] }, 4), false);
});
