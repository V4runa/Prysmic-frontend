import assert from "node:assert/strict";
import test from "node:test";
import {
  NOTE_DRAFT_KEY,
  NOTE_DRAFT_TTL_MS,
  clearDraft,
  clearDraftIfMatches,
  clearDraftIfOtherUser,
  decideRestore,
  draftVisibleToUser,
  noteDraftStorage,
  ownerForDraftWrite,
  readDraft,
  recoveryHref,
  writeDraft,
  type DraftStorage,
  type NoteDraft,
} from "./noteDraft";

function memoryStorage(): DraftStorage & { dump: () => string | null } {
  const bag = new Map<string, string>();
  return {
    getItem: (key) => bag.get(key) ?? null,
    setItem: (key, value) => bag.set(key, value),
    removeItem: (key) => bag.delete(key),
    dump: () => bag.get(NOTE_DRAFT_KEY) ?? null,
  };
}

function draft(overrides: Partial<NoteDraft> = {}): NoteDraft {
  return {
    v: 1,
    userId: 7,
    noteKey: "new",
    title: "Garden path",
    content: "<p>Choose the quiet one.</p>",
    tagIds: [3, 1],
    createdId: null,
    baseUpdatedAt: null,
    serverCopy: null,
    savedAt: Date.now(),
    ...overrides,
  };
}

test("a draft round-trips for its owner and stays out of the URL", () => {
  const storage = memoryStorage();
  const stored = draft();
  assert.deepEqual(writeDraft(storage, stored), { ok: true });
  assert.deepEqual(readDraft(storage, stored.savedAt), stored);
  assert.equal(recoveryHref(stored), "/notes/new");
  assert.equal(recoveryHref(stored).includes("Garden"), false);
  assert.equal(recoveryHref(stored).includes("quiet"), false);
  const raw = storage.dump() ?? "";
  assert.equal(raw.includes("attachment"), false);
  assert.equal(raw.includes("base64"), false);
});

test("another user's draft is not visible and is dropped when a different account enters", () => {
  const storage = memoryStorage();
  writeDraft(storage, draft({ userId: 7, title: "Private" }));
  assert.equal(draftVisibleToUser(readDraft(storage), 8), null);
  assert.equal(decideRestore({
    draft: readDraft(storage),
    userId: 8,
    noteKey: "new",
    serverUpdatedAt: null,
  }), "ignore");
  assert.equal(clearDraftIfOtherUser(storage, 8), true);
  assert.equal(readDraft(storage), null);
  writeDraft(storage, draft({ userId: 8 }));
  assert.equal(clearDraftIfOtherUser(storage, 8), false);
  assert.equal(readDraft(storage)?.userId, 8);
});

test("an occupied slot is not overwritten by a different note", () => {
  const storage = memoryStorage();
  writeDraft(storage, draft({ noteKey: "5", title: "Keep me" }));
  const blocked = writeDraft(
    storage,
    draft({ noteKey: "new", title: "Other", savedAt: draft().savedAt + 10 })
  );
  assert.deepEqual(blocked, { ok: false, reason: "occupied" });
  assert.equal(readDraft(storage)?.title, "Keep me");
});

test("a created note can take over its own new-note slot", () => {
  const storage = memoryStorage();
  writeDraft(storage, draft({ noteKey: "new", createdId: 12, title: "Saved text" }));
  const moved = writeDraft(
    storage,
    draft({
      noteKey: "12",
      createdId: 12,
      title: "Saved text",
      baseUpdatedAt: "2026-11-07T03:00:00.000Z",
      savedAt: draft().savedAt + 5,
    })
  );
  assert.deepEqual(moved, { ok: true });
  assert.equal(readDraft(storage)?.noteKey, "12");
  assert.equal(recoveryHref(readDraft(storage)!), "/notes/12");
});

test("a newer server copy is held, a matching one is applied, and a day-old draft is dropped", () => {
  const matching = draft({
    noteKey: "4",
    baseUpdatedAt: "2026-11-07T03:00:00.000Z",
  });
  assert.equal(decideRestore({
    draft: matching,
    userId: 7,
    noteKey: "4",
    serverUpdatedAt: "2026-11-07T03:00:00.000Z",
  }), "apply");
  assert.equal(decideRestore({
    draft: matching,
    userId: 7,
    noteKey: "4",
    serverUpdatedAt: "2026-11-07T05:00:00.000Z",
  }), "hold");
  assert.equal(decideRestore({
    draft: matching,
    userId: 7,
    noteKey: "9",
    serverUpdatedAt: matching.baseUpdatedAt,
  }), "ignore");

  const storage = memoryStorage();
  writeDraft(storage, matching);
  assert.equal(readDraft(storage, matching.savedAt + NOTE_DRAFT_TTL_MS + 1), null);
});

test("storage failures and corrupt payloads do not throw or pretend success", () => {
  const broken: DraftStorage = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("quota");
    },
    removeItem: () => {
      throw new Error("blocked");
    },
  };
  assert.equal(readDraft(broken), null);
  assert.deepEqual(writeDraft(broken, draft()), { ok: false, reason: "storage" });
  clearDraft(broken);

  const storage = memoryStorage();
  storage.setItem(NOTE_DRAFT_KEY, "{not json");
  assert.equal(readDraft(storage), null);
  assert.equal(storage.dump(), null);
});

test("saving one note does not clear a different note occupying the slot", () => {
  const storage = memoryStorage();
  writeDraft(storage, draft({ noteKey: "5", title: "Keep me" }));
  const cleared = clearDraftIfMatches(storage, {
    userId: 7,
    noteKey: "new",
    createdId: 41,
  });
  assert.equal(cleared, false);
  assert.equal(readDraft(storage)?.title, "Keep me");
  assert.equal(
    clearDraftIfMatches(storage, { userId: 7, noteKey: "5", createdId: null }),
    true
  );
  assert.equal(readDraft(storage), null);
});

test("a cleared token still flushes under the original owner and never another user", () => {
  const storage = memoryStorage();
  const remembered = 7;
  assert.equal(ownerForDraftWrite(remembered, 7), 7);
  writeDraft(storage, draft({ userId: 7, title: "before", savedAt: Date.now() }));
  assert.equal(ownerForDraftWrite(remembered, null), 7);
  writeDraft(storage, draft({ userId: 7, title: "after the token was cleared", savedAt: Date.now() }));
  assert.equal(readDraft(storage)?.title, "after the token was cleared");
  assert.equal(readDraft(storage)?.userId, 7);
  assert.equal(ownerForDraftWrite(remembered, 8), null);
  assert.equal(readDraft(storage)?.userId, 7);
});

test("a throwing sessionStorage getter is treated as unavailable", () => {
  const source = {} as { sessionStorage: DraftStorage };
  Object.defineProperty(source, "sessionStorage", {
    get() {
      throw new Error("SecurityError");
    },
  });
  assert.equal(noteDraftStorage(source), null);
  assert.equal(noteDraftStorage(undefined), null);
});

test("logout clears the draft that was kept for reauth", () => {
  const storage = memoryStorage();
  writeDraft(storage, draft());
  clearDraft(storage);
  assert.equal(readDraft(storage), null);
  assert.equal(draftVisibleToUser(null, 7), null);
});
