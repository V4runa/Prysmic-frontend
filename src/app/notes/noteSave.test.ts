import assert from "node:assert/strict";
import test from "node:test";
import {
  CONFLICT_MESSAGE,
  KEPT_NEWER_MESSAGE,
  classifySaveError,
  decideExistingSave,
  runExistingNoteSave,
  saveErrorMessage,
  claimSaveLock,
  releaseSaveLock,
  saveNewNote,
  settleSavedRevision,
  shouldShowNoteEditor,
} from "./noteSave";

const sessionExpired = () => new Error("Session expired. unauthorized");
const serverFailed = () => new Error("API Error: 500 Internal Server Error - {}");
const offline = () => new TypeError("Failed to fetch");

test("create failure and 401 keep the note uncreated and unsaved", async () => {
  let posts = 0;
  const denied = await saveNewNote({
    title: "Garden",
    content: "<p>Path</p>",
    tagIds: [1],
    createdId: null,
    updatedAt: null,
    serverCopy: null,
    files: [],
    create: async () => {
      posts += 1;
      throw sessionExpired();
    },
  });
  assert.equal(denied.status, "error");
  if (denied.status !== "error") return;
  assert.equal(denied.createdId, null);
  assert.equal(denied.kind, "unauthorized");
  assert.equal(denied.phase, "create");
  assert.equal(posts, 1);
  assert.match(saveErrorMessage(denied.kind, denied.phase), /still here/i);

  posts = 0;
  const failed = await saveNewNote({
    title: "Garden",
    content: "<p>Path</p>",
    tagIds: [],
    createdId: null,
    updatedAt: null,
    serverCopy: null,
    files: [],
    create: async () => {
      posts += 1;
      throw serverFailed();
    },
  });
  assert.equal(failed.status, "error");
  if (failed.status !== "error") return;
  assert.equal(failed.kind, "server");
  assert.equal(failed.createdId, null);

  const network = await saveNewNote({
    title: "Garden",
    content: "<p>Path</p>",
    tagIds: [],
    createdId: null,
    updatedAt: null,
    serverCopy: null,
    files: [],
    create: async () => {
      throw offline();
    },
  });
  assert.equal(network.status, "error");
  if (network.status !== "error") return;
  assert.equal(network.kind, "network");
  assert.equal(classifySaveError(offline()), "network");
});

test("a failed attachment does not create a second note, and retry uploads only what remains", async () => {
  let posts = 0;
  let createdNotice: number | null = null;
  const uploaded: string[] = [];
  const files = ["a", "b"].map((key) => ({
    key,
    upload: async () => {
      uploaded.push(key);
      if (key === "b" && uploaded.filter((k) => k === "b").length === 1) {
        throw serverFailed();
      }
    },
  }));

  const first = await saveNewNote({
    title: "Garden",
    content: "<p>Path</p>",
    tagIds: [2],
    createdId: null,
    updatedAt: null,
    serverCopy: null,
    files,
    create: async () => {
      posts += 1;
      return { id: 41, updatedAt: "2026-11-07T03:00:00.000Z" };
    },
    onCreated: (created) => {
      createdNotice = created.id;
    },
  });

  assert.equal(posts, 1);
  assert.equal(createdNotice, 41);
  assert.equal(first.status, "error");
  if (first.status !== "error") return;
  assert.equal(first.phase, "attachment");
  assert.equal(first.createdId, 41);
  assert.deepEqual(first.uploadedKeys, ["a"]);
  assert.match(saveErrorMessage(first.kind, first.phase), /not saved as a second note/i);

  const remaining = files.filter((file) => !first.uploadedKeys.includes(file.key));
  const second = await saveNewNote({
    title: "Garden",
    content: "<p>Path</p>",
    tagIds: [2],
    createdId: first.createdId,
    updatedAt: first.updatedAt,
    serverCopy: { title: "Garden", content: "<p>Path</p>", tagIds: [2] },
    files: remaining,
    create: async () => {
      posts += 1;
      return { id: 99, updatedAt: null };
    },
  });

  assert.equal(posts, 1);
  assert.equal(second.status, "saved");
  if (second.status !== "saved") return;
  assert.equal(second.createdId, 41);
  assert.deepEqual(uploaded, ["a", "b", "b"]);
});

test("changed text after a created note is PUT, not posted again", async () => {
  let posts = 0;
  let puts = 0;
  const failedUpdate = await saveNewNote({
    title: "Garden revised",
    content: "<p>Path</p>",
    tagIds: [2],
    createdId: 41,
    updatedAt: "2026-11-07T03:00:00.000Z",
    serverCopy: { title: "Garden", content: "<p>Path</p>", tagIds: [2] },
    files: [{ key: "b", upload: async () => undefined }],
    create: async () => {
      posts += 1;
      return { id: 99, updatedAt: null };
    },
    update: async () => {
      puts += 1;
      throw serverFailed();
    },
  });
  assert.equal(posts, 0);
  assert.equal(puts, 1);
  assert.equal(failedUpdate.status, "error");
  if (failedUpdate.status !== "error") return;
  assert.equal(failedUpdate.phase, "update");
  assert.equal(failedUpdate.createdId, 41);
  assert.match(saveErrorMessage(failedUpdate.kind, failedUpdate.phase), /not saved/i);

  let uploaded = 0;
  const saved = await saveNewNote({
    title: "Garden revised",
    content: "<p>Path</p>",
    tagIds: [2],
    createdId: 41,
    updatedAt: "2026-11-07T03:00:00.000Z",
    serverCopy: { title: "Garden", content: "<p>Path</p>", tagIds: [2] },
    files: [{ key: "b", upload: async () => { uploaded += 1; } }],
    create: async () => {
      posts += 1;
      return { id: 99, updatedAt: null };
    },
    update: async () => {
      puts += 1;
      return { updatedAt: "2026-11-07T04:00:00.000Z" };
    },
  });
  assert.equal(posts, 0);
  assert.equal(puts, 2);
  assert.equal(uploaded, 1);
  assert.equal(saved.status, "saved");
  if (saved.status !== "saved") return;
  assert.equal(saved.createdId, 41);
  assert.equal(saved.updatedAt, "2026-11-07T04:00:00.000Z");
});

test("a delayed create does not upload or rewrite the draft after logout", async () => {
  let resolveCreate: (value: { id: number; updatedAt: string | null }) => void = () => {};
  let wrote = false;
  let uploads = 0;
  let audience: "same" | "recoverable" | "abandoned" = "same";
  const pending = saveNewNote({
    title: "Private line",
    content: "<p>secret</p>",
    tagIds: [],
    createdId: null,
    updatedAt: null,
    serverCopy: null,
    audience: () => audience,
    files: [{ key: "a", upload: async () => { uploads += 1; } }],
    create: () =>
      new Promise((resolve) => {
        resolveCreate = resolve;
      }),
    onCreated: () => {
      wrote = true;
    },
  });
  audience = "abandoned";
  resolveCreate({ id: 41, updatedAt: "2026-11-07T03:00:00.000Z" });
  const result = await pending;
  assert.equal(result.status, "detached");
  assert.equal(wrote, false);
  assert.equal(uploads, 0);
});

test("a recovered note is not silently overwritten when the server copy moved", async () => {
  let puts = 0;
  const blocked = await saveNewNote({
    title: "Revised",
    content: "<p>Path</p>",
    tagIds: [2],
    createdId: 41,
    updatedAt: "2026-11-07T03:00:00.000Z",
    serverCopy: { title: "Garden", content: "<p>Path</p>", tagIds: [2] },
    files: [],
    loadLatest: async () => ({ updatedAt: "2026-11-07T05:00:00.000Z" }),
    create: async () => {
      throw new Error("should not create");
    },
    update: async () => {
      puts += 1;
      return { updatedAt: "2026-11-07T06:00:00.000Z" };
    },
  });
  assert.equal(blocked.status, "conflict");
  assert.equal(puts, 0);

  const forced = await saveNewNote({
    title: "Revised",
    content: "<p>Path</p>",
    tagIds: [2],
    createdId: 41,
    updatedAt: "2026-11-07T03:00:00.000Z",
    serverCopy: { title: "Garden", content: "<p>Path</p>", tagIds: [2] },
    force: true,
    files: [],
    loadLatest: async () => ({ updatedAt: "2026-11-07T05:00:00.000Z" }),
    create: async () => {
      throw new Error("should not create");
    },
    update: async () => {
      puts += 1;
      return { updatedAt: "2026-11-07T06:00:00.000Z" };
    },
  });
  assert.equal(forced.status, "saved");
  assert.equal(puts, 1);
});

test("an edit PUT is not sent once the save has been abandoned", async () => {
  let puts = 0;
  let allow = true;
  const result = await runExistingNoteSave({
    baseUpdatedAt: "2026-11-07T03:00:00.000Z",
    force: false,
    allowUpdate: () => allow,
    loadLatest: async () => {
      allow = false;
      return { updatedAt: "2026-11-07T03:00:00.000Z" };
    },
    update: async () => {
      puts += 1;
      return { updatedAt: "2026-11-07T04:00:00.000Z" };
    },
  });
  assert.equal(result.status, "detached");
  assert.equal(puts, 0);
});

test("a save lock blocks cancel and a second save until the request finishes", () => {
  const lock = { current: false };
  assert.equal(claimSaveLock(lock), true);
  assert.equal(claimSaveLock(lock), false);
  releaseSaveLock(lock);
  assert.equal(claimSaveLock(lock), true);
});

test("a save that is overtaken by newer typing does not count as fully saved", () => {
  const snapshot = { title: "Garden", content: "<p>Path</p>", tagIds: [1] };
  assert.equal(settleSavedRevision(snapshot, snapshot), "exit");
  assert.equal(
    settleSavedRevision(snapshot, { ...snapshot, title: "Garden revised" }),
    "keep-latest"
  );
  assert.match(KEPT_NEWER_MESSAGE, /Newer changes are still here/);
});

test("edit 401 and 500 do not mark the note saved or hide the editor", async () => {
  let puts = 0;
  const update = async () => {
    puts += 1;
    return { updatedAt: "2026-11-07T04:00:00.000Z" };
  };

  const expired = await runExistingNoteSave({
    baseUpdatedAt: "2026-11-07T03:00:00.000Z",
    force: false,
    loadLatest: async () => {
      throw sessionExpired();
    },
    update,
  });
  assert.deepEqual(expired, { status: "error", kind: "unauthorized" });
  assert.equal(puts, 0);
  assert.equal(shouldShowNoteEditor(false, false), true);

  const failed = await runExistingNoteSave({
    baseUpdatedAt: "2026-11-07T03:00:00.000Z",
    force: false,
    loadLatest: async () => ({ updatedAt: "2026-11-07T03:00:00.000Z" }),
    update: async () => {
      puts += 1;
      throw serverFailed();
    },
  });
  assert.equal(failed.status, "error");
  if (failed.status !== "error") return;
  assert.equal(failed.kind, "server");
  assert.equal(puts, 1);
  assert.match(saveErrorMessage("server", "update"), /not saved/i);
  assert.match(saveErrorMessage("unauthorized", "update"), /still here/i);
});

test("a newer server note blocks the write until overwrite is explicit", async () => {
  assert.equal(
    decideExistingSave("2026-11-07T03:00:00.000Z", "2026-11-07T05:00:00.000Z", false),
    "conflict"
  );
  assert.equal(
    decideExistingSave("2026-11-07T03:00:00.000Z", "2026-11-07T03:00:00.000Z", false),
    "put"
  );

  let puts = 0;
  const blocked = await runExistingNoteSave({
    baseUpdatedAt: "2026-11-07T03:00:00.000Z",
    force: false,
    loadLatest: async () => ({ updatedAt: "2026-11-07T05:00:00.000Z" }),
    update: async () => {
      puts += 1;
      return { updatedAt: "nope" };
    },
  });
  assert.deepEqual(blocked, { status: "conflict" });
  assert.equal(puts, 0);
  assert.match(CONFLICT_MESSAGE, /still here/i);

  const forced = await runExistingNoteSave({
    baseUpdatedAt: "2026-11-07T03:00:00.000Z",
    force: true,
    loadLatest: async () => ({ updatedAt: "2026-11-07T05:00:00.000Z" }),
    update: async () => {
      puts += 1;
      return { updatedAt: "2026-11-07T06:00:00.000Z" };
    },
  });
  assert.deepEqual(forced, { status: "saved", updatedAt: "2026-11-07T06:00:00.000Z" });
  assert.equal(puts, 1);
});

test("a failed load is not treated as a missing note that closes the editor", () => {
  assert.equal(shouldShowNoteEditor(true, false), false);
  assert.equal(shouldShowNoteEditor(false, true), false);
  assert.equal(shouldShowNoteEditor(false, false), true);
});
