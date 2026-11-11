import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ApiError } from "../hooks/useApi";
import {
  apiErrorMentionsField,
  formatCalendarDay,
  isCalendarDateKey,
  isNoteNotFound,
  noteCalendarEvent,
  noteFlagPayload,
  notesForList,
  parseOriginNoteId,
  patchNoteFlags,
  readOriginatedContracts,
  readOriginNote,
} from "./noteMenu";

test("pin and archive always send the current tags and both flags", () => {
  assert.deepEqual(
    noteFlagPayload(
      { tags: [{ id: 4 }, { id: 9 }], isPinned: false, isArchived: false },
      { isPinned: true }
    ),
    { isPinned: true, isArchived: false, tagIds: [4, 9] }
  );
  assert.deepEqual(
    noteFlagPayload(
      { tags: [], isPinned: true, isArchived: false },
      { isArchived: true }
    ),
    { isPinned: true, isArchived: true, tagIds: [] }
  );
  assert.deepEqual(noteFlagPayload({}, { isPinned: true }), {
    isPinned: true,
    isArchived: false,
    tagIds: [],
  });
});

test("list filtering keeps server order and tolerates a missing archive flag", () => {
  const notes = [
    { id: 1, isPinned: true, isArchived: false, title: "pinned" },
    { id: 2, isPinned: false, title: "plain" },
    { id: 3, isPinned: false, isArchived: true, title: "old" },
  ];
  assert.deepEqual(
    notesForList(notes, false).map((note) => note.id),
    [1, 2]
  );
  assert.deepEqual(
    notesForList(notes, true).map((note) => note.id),
    [3]
  );
  assert.deepEqual(
    patchNoteFlags(notes, 2, { isPinned: true, isArchived: true }).map((note) => [
      note.id,
      note.isPinned,
      note.isArchived,
    ]),
    [
      [1, true, false],
      [2, true, true],
      [3, false, true],
    ]
  );
});

test("a note becomes an all-day calendar event linked to that note", () => {
  assert.deepEqual(noteCalendarEvent({ id: 12, title: "  Garden " }, "2026-11-11"), {
    title: "Garden",
    description: null,
    allDay: true,
    startDate: "2026-11-11",
    endDate: null,
    startTime: null,
    endTime: null,
    color: "cyan",
    location: null,
    recurrence: "none",
    recurrenceEndDate: null,
    linkedType: "note",
    linkedId: 12,
  });
  assert.equal(noteCalendarEvent({ id: 1, title: "   " }, "2026-01-02").title, "Note");
  assert.equal(isCalendarDateKey("2026-11-11"), true);
  assert.equal(isCalendarDateKey("2026-02-31"), false);
  assert.equal(isCalendarDateKey("11/11/2026"), false);
  assert.equal(formatCalendarDay("2026-11-11"), "Nov 11, 2026");
});

test("origin links and unknown-field errors degrade when the shape is old", () => {
  assert.equal(parseOriginNoteId("15"), 15);
  assert.equal(parseOriginNoteId("0"), null);
  assert.equal(parseOriginNoteId("nope"), null);
  assert.deepEqual(readOriginNote({ id: 3, title: "Garden" }), {
    id: 3,
    title: "Garden",
  });
  assert.equal(readOriginNote(null), null);
  assert.equal(readOriginNote({ id: "3", title: "Garden" }), null);
  assert.deepEqual(
    readOriginatedContracts([
      { id: 8, title: "Water" },
      { id: "no", title: "Skip" },
      null,
    ]),
    [{ id: 8, title: "Water" }]
  );
  assert.deepEqual(readOriginatedContracts(undefined), []);

  const unknown = new ApiError(
    400,
    "Bad Request",
    { message: ["property originNoteId should not exist"] },
    null
  );
  assert.equal(apiErrorMentionsField(unknown, "originNoteId"), true);
  assert.equal(apiErrorMentionsField(unknown, "tagIds"), false);
  const missing = new ApiError(404, "Not Found", { message: "Note not found" }, null);
  assert.equal(isNoteNotFound(missing), true);
  assert.equal(
    isNoteNotFound(new ApiError(404, "Not Found", { message: "Linked item not found" }, null)),
    false
  );
});

test("the note surfaces wire the menu without moving delete into it", () => {
  const list = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
  const note = readFileSync(new URL("./[id]/page.tsx", import.meta.url), "utf8");
  const menu = readFileSync(
    new URL("../components/NoteActionsMenu.tsx", import.meta.url),
    "utf8"
  );
  const habit = readFileSync(new URL("../habits/[id]/page.tsx", import.meta.url), "utf8");
  const create = readFileSync(new URL("../habits/new/page.tsx", import.meta.url), "utf8");
  const calendar = readFileSync(new URL("../calendar/page.tsx", import.meta.url), "utf8");

  assert.match(list, /NoteActionsMenu/);
  assert.match(list, /archived=true/);
  assert.match(list, /notesForList/);
  assert.match(note, /NoteActionsMenu/);
  assert.match(note, /Contracts from this note/);
  assert.match(note, /window\.print\(\)/);
  assert.match(menu, /stopPropagation/);
  assert.match(menu, /originNoteId/);
  assert.match(menu, /noteFlagPayload/);
  assert.match(menu, /createCalendarEvent/);
  assert.match(menu, /aria-haspopup="menu"/);
  assert.doesNotMatch(menu, /Delete/);
  assert.match(note, /Are you sure you want to delete this note/);
  assert.match(habit, /From note:/);
  assert.match(create, /originNoteId/);
  assert.match(calendar, /isCalendarDateKey/);
});
