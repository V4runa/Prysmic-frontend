import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { bindNewNoteCreate, uploadWithCreatedId } from "./bindNewNoteCreate";
import { NOTE_DRAFT_KEY, type DraftStorage } from "./noteDraft";
import { saveNewNote } from "./noteSave";
import { clientEffectsForSave } from "../lib/sessionBoundary";

test("the new-note page keeps the created id when storage is unavailable", () => {
  const page = readFileSync(new URL("./new/page.tsx", import.meta.url), "utf8");
  assert.match(page, /onCreated:\s*bindNewNoteCreate\(/);
  assert.match(page, /uploadWithCreatedId\(createdIdRef/);
  assert.doesNotMatch(page, /writeDraft \|\| !owner \|\| !storage\) return/);
});

test("the first attachment upload uses the returned id and does not create twice", async () => {
  const createdIdRef: { current: number | null } = { current: null };
  const source = {} as { sessionStorage: DraftStorage };
  Object.defineProperty(source, "sessionStorage", {
    get() {
      throw new Error("SecurityError");
    },
  });
  let posts = 0;
  let uploadedTo: number | null = null;
  let remembered: number | null = null;

  const result = await saveNewNote({
    title: "Garden",
    content: "<p>Path</p>",
    tagIds: [1],
    createdId: null,
    updatedAt: null,
    serverCopy: null,
    files: [
      {
        key: "a",
        upload: () =>
          uploadWithCreatedId(createdIdRef, async (id) => {
            uploadedTo = id;
          }),
      },
    ],
    create: async () => {
      posts += 1;
      return { id: 41, updatedAt: "2026-11-07T03:00:00.000Z" };
    },
    onCreated: bindNewNoteCreate({
      createdIdRef,
      storage: null,
      owner: 7,
      snapshot: { title: "Garden", content: "<p>Path</p>", tagIds: [1] },
      writeDraftAllowed: clientEffectsForSave("same").writeDraft,
      rememberInMemory: (created) => {
        remembered = created.id;
      },
    }),
  });

  assert.equal(posts, 1);
  assert.equal(uploadedTo, 41);
  assert.equal(createdIdRef.current, 41);
  assert.equal(remembered, 41);
  assert.equal(result.status, "saved");
  assert.throws(() => source.sessionStorage, /SecurityError/);
  assert.equal(NOTE_DRAFT_KEY.length > 0, true);
});

test("an abandoned create still does not write the draft", () => {
  const createdIdRef: { current: number | null } = { current: null };
  const storage: DraftStorage = {
    getItem: () => null,
    setItem: () => {
      throw new Error("draft written");
    },
    removeItem: () => undefined,
  };
  const onCreated = bindNewNoteCreate({
    createdIdRef,
    storage,
    owner: 7,
    snapshot: { title: "Private", content: "<p>secret</p>", tagIds: [] },
    writeDraftAllowed: clientEffectsForSave("abandoned").writeDraft,
    rememberInMemory: () => undefined,
  });
  onCreated({ id: 41, updatedAt: null });
  assert.equal(createdIdRef.current, 41);
});
