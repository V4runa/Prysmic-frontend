import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  formatUpdateDate,
  publishedUpdates,
  toPublicChangelog,
  type ProductUpdate,
} from "../../content/updates";
import {
  UPDATES_SEEN_KEY,
  baselineState,
  dismissUpdateHighlight,
  ensureUpdatesBaseline,
  hasUnread,
  isEntryUnread,
  markUpdatesViewed,
  parseUpdatesSeen,
  pendingHighlight,
} from "./updatesSeen";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
    removeItem(key: string) {
      map.delete(key);
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
  };
}

const entries: ProductUpdate[] = [
  {
    id: "tags",
    date: "2026-11-10",
    kind: "new",
    highlight: true,
    title: "Tags",
    summary: "Tags are shared.",
  },
  {
    id: "updates",
    date: "2026-11-10",
    kind: "new",
    title: "Updates",
    summary: "Updates is here.",
  },
  {
    id: "settings",
    date: "2026-11-09",
    kind: "new",
    title: "Settings",
    summary: "Settings is here.",
  },
];

test("a first visit announces the newest highlight and stays quiet about older entries", () => {
  const storage = memoryStorage();
  assert.equal(ensureUpdatesBaseline(storage, entries), true);
  const state = parseUpdatesSeen(storage.getItem(UPDATES_SEEN_KEY));
  assert.ok(state);
  assert.equal(state.lastSeenId, "updates");
  assert.equal(hasUnread(entries, state), true);
  assert.equal(pendingHighlight(entries, state)?.id, "tags");
  assert.equal(state.dismissedHighlightIds.includes("tags"), false);
  const settings = entries.find((entry) => entry.id === "settings");
  assert.ok(settings);
  assert.equal(isEntryUnread(settings, entries, state), false);
  assert.equal(ensureUpdatesBaseline(storage, entries), false);
});

test("a first visit with no highlight is caught up through the newest entry", () => {
  const plain = entries.map((entry) => ({ ...entry, highlight: undefined }));
  const storage = memoryStorage();
  ensureUpdatesBaseline(storage, plain);
  const state = parseUpdatesSeen(storage.getItem(UPDATES_SEEN_KEY));
  assert.ok(state);
  assert.equal(state.lastSeenId, "tags");
  assert.equal(hasUnread(plain, state), false);
  assert.equal(pendingHighlight(plain, state), null);
});

test("a broken record is replaced with a caught-up baseline", () => {
  const storage = memoryStorage();
  storage.setItem(UPDATES_SEEN_KEY, "{");
  assert.equal(parseUpdatesSeen("{"), null);
  assert.equal(ensureUpdatesBaseline(storage, entries), true);
  const state = parseUpdatesSeen(storage.getItem(UPDATES_SEEN_KEY));
  assert.deepEqual(state, baselineState(entries));
  assert.equal(pendingHighlight(entries, state!)?.id, "tags");
  assert.equal(hasUnread(entries, state!), true);
});

test("entries newer than the last one viewed light the dot, and opening Updates clears it", () => {
  const storage = memoryStorage();
  storage.setItem(
    UPDATES_SEEN_KEY,
    JSON.stringify({
      v: 1,
      lastSeenId: "settings",
      lastSeenDate: "2026-11-09",
      dismissedHighlightIds: [],
    })
  );
  const unseen = parseUpdatesSeen(storage.getItem(UPDATES_SEEN_KEY))!;
  assert.equal(hasUnread(entries, unseen), true);
  assert.equal(pendingHighlight(entries, unseen)?.id, "tags");

  const dismissed = dismissUpdateHighlight(storage, entries, "tags");
  assert.equal(pendingHighlight(entries, dismissed), null);
  assert.equal(hasUnread(entries, dismissed), true);

  const seen = markUpdatesViewed(storage, entries);
  assert.equal(seen.lastSeenId, "tags");
  assert.equal(hasUnread(entries, seen), false);
  assert.equal(pendingHighlight(entries, seen), null);
});

test("a same-day entry written above the last one viewed is unread", () => {
  const state = {
    v: 1 as const,
    lastSeenId: "updates",
    lastSeenDate: "2026-11-10",
    dismissedHighlightIds: [] as string[],
  };
  assert.equal(hasUnread(entries, state), true);
  assert.equal(pendingHighlight(entries, state)?.id, "tags");
});

test("a removed last-seen id falls back to its date", () => {
  const state = {
    v: 1 as const,
    lastSeenId: "retired",
    lastSeenDate: "2026-11-09",
    dismissedHighlightIds: [] as string[],
  };
  assert.equal(hasUnread(entries, state), true);
  assert.equal(pendingHighlight(entries, state)?.id, "tags");
  const caughtUp = {
    ...state,
    lastSeenDate: "2026-11-10",
  };
  assert.equal(hasUnread(entries, caughtUp), false);
});

test("the published changelog is newest first and ready for a public page", () => {
  const source = readFileSync(new URL("../../content/updates.ts", import.meta.url), "utf8");
  assert.equal(source.includes("TODO(Eddy)"), false);
  assert.equal(source.includes("header-identity"), false);
  assert.equal(source.includes("Search notes"), false);

  const updates = publishedUpdates();
  const changelog = toPublicChangelog();
  assert.deepEqual(
    changelog.updates.map((entry) => entry.id),
    updates.map((entry) => entry.id)
  );
  assert.equal(changelog.updates[0]?.id, "note-into-task");
  assert.equal(changelog.updates[0]?.highlight, false);
  assert.equal(changelog.updates[0]?.kind, "new");
  assert.equal(changelog.updates[0]?.date, "2026-11-11");
  assert.equal(changelog.updates[0]?.title, "Make a task from a note");
  assert.equal(changelog.updates[1]?.id, "note-actions");
  assert.equal(changelog.updates[1]?.highlight, false);
  assert.equal(changelog.updates[1]?.kind, "new");
  assert.equal(changelog.updates[1]?.date, "2026-11-11");
  assert.equal(changelog.updates[1]?.title, "More you can do with a note");
  assert.equal(changelog.updates[2]?.id, "calendar-day-links");
  assert.equal(changelog.updates[2]?.highlight, false);
  assert.equal(changelog.updates[2]?.kind, "new");
  assert.equal(changelog.updates[2]?.date, "2026-11-11");
  assert.equal(changelog.updates[3]?.id, "calendar-finished-tasks");
  assert.equal(changelog.updates[3]?.highlight, false);
  assert.equal(changelog.updates[3]?.kind, "improved");
  assert.equal(changelog.updates[3]?.date, "2026-11-11");
  assert.equal(changelog.updates[4]?.id, "shared-tags-notes-tasks");
  assert.equal(changelog.updates[4]?.highlight, true);
  assert.equal(changelog.updates[4]?.date, "2026-11-10");
  assert.equal(changelog.updates[5]?.id, "updates-view");
  assert.equal(
    changelog.updates.find((entry) => entry.id === "plain-first-run-copy")?.title,
    "A clearer welcome and plainer starter notes"
  );
  assert.equal(changelog.updates.some((entry) => entry.id === "header-identity"), false);
  assert.equal(formatUpdateDate("2026-11-10"), "Nov 10, 2026");
  assert.equal(formatUpdateDate("2026-11-09"), "Nov 9, 2026");

  const ids = new Set(changelog.updates.map((entry) => entry.id));
  assert.equal(ids.size, changelog.updates.length);
  for (let i = 1; i < changelog.updates.length; i += 1) {
    assert.equal(changelog.updates[i - 1].date >= changelog.updates[i].date, true);
  }
  assert.deepEqual(
    changelog.comingSoon.map((item) => item.id),
    []
  );
  assert.equal(
    changelog.updates.some((entry) => entry.kind === "new"),
    true
  );
  assert.equal(
    changelog.updates.some((entry) => entry.kind === "improved"),
    true
  );
});
