import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ApiError } from "../hooks/useApi";
import {
  TAG_CREATE_DUPLICATE,
  TAG_CREATE_FAILED,
  TAG_CREATE_OFFLINE,
  duplicateTagName,
  mergeCreatedTag,
  selectionWithCreatedTag,
  tagCreateErrorMessage,
  tagNameToCreate,
} from "./tagCreate";

test("a tag name is trimmed, and a blank name is not saved", () => {
  assert.equal(tagNameToCreate("  Field notes  "), "Field notes");
  assert.equal(tagNameToCreate("   "), null);
  assert.equal(tagNameToCreate(""), null);
});

test("a duplicate name matches exactly, including a typed name with extra spaces", () => {
  const tags = [{ name: "Field notes" }, { name: "work" }];
  assert.equal(duplicateTagName("Field notes", tags), true);
  assert.equal(duplicateTagName("  Field notes  ", tags), true);
  assert.equal(duplicateTagName("field notes", tags), false);
  assert.equal(duplicateTagName("Work", tags), false);
  assert.equal(duplicateTagName("Field  notes", tags), false);
  assert.equal(duplicateTagName("   ", tags), false);
});

test("create failures name a duplicate, a lost connection, or a plain failure", () => {
  assert.equal(tagCreateErrorMessage(new TypeError("Failed to fetch")), TAG_CREATE_OFFLINE);
  assert.equal(
    tagCreateErrorMessage(new ApiError(409, "Conflict", { message: "Tag already exists for this user" }, null)),
    "Tag already exists for this user"
  );
  assert.equal(tagCreateErrorMessage(new ApiError(409, "Conflict", {}, null)), TAG_CREATE_DUPLICATE);
  assert.equal(
    tagCreateErrorMessage(
      new ApiError(500, "Internal Server Error", { message: "duplicate key value violates unique constraint" }, null)
    ),
    TAG_CREATE_DUPLICATE
  );
  assert.equal(
    tagCreateErrorMessage(new ApiError(500, "Internal Server Error", { message: "Internal server error" }, null)),
    TAG_CREATE_FAILED
  );
  assert.equal(tagCreateErrorMessage(new Error("nope")), TAG_CREATE_FAILED);
  assert.equal(tagCreateErrorMessage("nope"), TAG_CREATE_FAILED);
});

test("the new tag is added beside the tags already chosen", () => {
  assert.deepEqual(selectionWithCreatedTag([4, 9], 12), [4, 9, 12]);
  assert.deepEqual(selectionWithCreatedTag([4, 12], 12), [4, 12]);
  assert.deepEqual(selectionWithCreatedTag([4, 9], 12, "single"), [12]);
  assert.deepEqual(selectionWithCreatedTag([4], Number.NaN), [4]);
  const chosen = [4, 9];
  selectionWithCreatedTag(chosen, 12);
  assert.deepEqual(chosen, [4, 9]);
});

test("a created tag joins the shared list once, in name order", () => {
  const list = [
    { id: 2, name: "Zebra" },
    { id: 1, name: "Alpha" },
  ];
  assert.deepEqual(
    mergeCreatedTag(list, { id: 3, name: "Middle" }),
    [
      { id: 1, name: "Alpha" },
      { id: 3, name: "Middle" },
      { id: 2, name: "Zebra" },
    ]
  );
  assert.deepEqual(mergeCreatedTag(list, { id: 1, name: "Alpha" }), list);
  assert.deepEqual(list, [
    { id: 2, name: "Zebra" },
    { id: 1, name: "Alpha" },
  ]);
});

test("the new-tag dialog starts on the least-used color", () => {
  const dialog = readFileSync(new URL("../components/CreateTagDialog.tsx", import.meta.url), "utf8");
  assert.match(dialog, /leastUsedTagColor\(tags\)/);
  assert.equal(dialog.includes('useState("cyan")'), false);
});

test("both note editors open tag creation in a dialog from the picker", () => {
  const picker = readFileSync(new URL("../components/TagPicker.tsx", import.meta.url), "utf8");
  const create = readFileSync(new URL("../notes/new/page.tsx", import.meta.url), "utf8");
  const edit = readFileSync(new URL("../notes/[id]/page.tsx", import.meta.url), "utf8");
  assert.equal(picker.includes("+ New tag"), true);
  assert.equal(picker.includes("CreateTagDialog"), true);
  assert.equal(create.includes("createInDialog"), true);
  assert.equal(edit.includes("createInDialog"), true);
});
