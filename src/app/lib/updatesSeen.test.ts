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

test("tidier tags on busy notes is unread for someone caught up through the previous entry", () => {
  const updates = publishedUpdates();
  const newest = updates[0];
  const tidier = updates.find((entry) => entry.id === "tidier-tags");
  const colors = updates.find((entry) => entry.id === "more-tag-colors");
  const madeFromNote = updates.find((entry) => entry.id === "create-tag-from-note");
  assert.equal(newest?.id, "contract-record");
  assert.equal(newest?.kind, "new");
  assert.equal(newest?.highlight, undefined);
  assert.equal(newest?.date, "2026-11-18");
  assert.equal(newest?.title, "A record of the days you kept");
  assert.equal(
    newest?.summary,
    "A contract now shows the days you kept it, month by month. A kept day opens that day on the calendar."
  );
  assert.equal(tidier?.kind, "improved");
  assert.equal(tidier?.highlight, undefined);
  assert.equal(tidier?.date, "2026-11-17");
  assert.equal(tidier?.title, "Tidier tags on busy notes");
  assert.equal(colors?.id, "more-tag-colors");
  assert.equal(colors?.kind, "new");
  assert.equal(colors?.highlight, undefined);
  assert.ok(madeFromNote);
  assert.equal(madeFromNote?.highlight, undefined);
  const throughHomeScreen = {
    v: 1 as const,
    lastSeenId: "add-to-home-screen",
    lastSeenDate: "2026-11-16",
    dismissedHighlightIds: ["shared-tags-notes-tasks"],
  };
  assert.equal(isEntryUnread(madeFromNote!, updates, throughHomeScreen), true);
  assert.equal(hasUnread(updates, throughHomeScreen), true);
  assert.equal(pendingHighlight(updates, throughHomeScreen), null);
  const caughtUp = {
    v: 1 as const,
    lastSeenId: "create-tag-from-note",
    lastSeenDate: "2026-11-17",
    dismissedHighlightIds: ["shared-tags-notes-tasks"],
  };
  assert.equal(isEntryUnread(newest!, updates, caughtUp), true);
  assert.equal(isEntryUnread(tidier!, updates, caughtUp), true);
  assert.equal(isEntryUnread(colors!, updates, caughtUp), true);
  assert.equal(isEntryUnread(madeFromNote!, updates, caughtUp), false);
  assert.equal(hasUnread(updates, caughtUp), true);
  assert.equal(pendingHighlight(updates, caughtUp), null);
  const seen = markUpdatesViewed(memoryStorage(), updates);
  assert.equal(seen.lastSeenId, "contract-record");
  assert.equal(hasUnread(updates, seen), false);
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
  assert.equal(changelog.updates[0]?.id, "contract-record");
  assert.equal(changelog.updates[0]?.highlight, false);
  assert.equal(changelog.updates[0]?.kind, "new");
  assert.equal(changelog.updates[0]?.date, "2026-11-18");
  assert.equal(changelog.updates[0]?.title, "A record of the days you kept");
  assert.equal(
    changelog.updates[0]?.summary,
    "A contract now shows the days you kept it, month by month. A kept day opens that day on the calendar."
  );
  assert.equal(changelog.updates[1]?.id, "tidier-tags");
  assert.equal(changelog.updates[1]?.highlight, false);
  assert.equal(changelog.updates[1]?.kind, "improved");
  assert.equal(changelog.updates[1]?.date, "2026-11-17");
  assert.equal(changelog.updates[1]?.title, "Tidier tags on busy notes");
  assert.equal(
    changelog.updates[1]?.summary,
    "Notes with lots of tags keep them on one line now. Tap the +number to show them all."
  );
  assert.equal(changelog.updates[2]?.id, "more-tag-colors");
  assert.equal(changelog.updates[2]?.highlight, false);
  assert.equal(changelog.updates[2]?.kind, "new");
  assert.equal(changelog.updates[2]?.date, "2026-11-17");
  assert.equal(changelog.updates[2]?.title, "Twice the colors for your tags");
  assert.equal(
    changelog.updates[2]?.summary,
    "Tags now come in twelve quiet colors, and a new tag starts on the one you use least."
  );
  assert.equal(changelog.updates[3]?.id, "create-tag-from-note");
  assert.equal(changelog.updates[3]?.highlight, false);
  assert.equal(changelog.updates[3]?.kind, "new");
  assert.equal(changelog.updates[3]?.date, "2026-11-17");
  assert.equal(changelog.updates[3]?.title, "Make a tag without leaving your note");
  assert.equal(
    changelog.updates[3]?.summary,
    "You can make a new tag from the note you're writing, and it stays selected on that note."
  );
  assert.equal(changelog.updates[4]?.id, "add-to-home-screen");
  assert.equal(changelog.updates[4]?.highlight, false);
  assert.equal(changelog.updates[4]?.kind, "new");
  assert.equal(changelog.updates[4]?.date, "2026-11-16");
  assert.equal(changelog.updates[4]?.title, "Add Prysmic to your Home Screen");
  assert.equal(
    changelog.updates[4]?.summary,
    "Prysmic opens full screen, like an app, on your phone or computer."
  );
  assert.equal(changelog.updates[5]?.id, "stay-signed-in");
  assert.equal(changelog.updates[5]?.highlight, false);
  assert.equal(changelog.updates[5]?.kind, "improved");
  assert.equal(changelog.updates[5]?.date, "2026-11-16");
  assert.equal(changelog.updates[5]?.title, "You'll stay signed in now");
  assert.equal(
    changelog.updates[5]?.summary,
    "Prysmic keeps you signed in for 30 days while you use it, and signing out still ends it."
  );
  assert.equal(changelog.updates[6]?.id, "large-screen-layout");
  assert.equal(changelog.updates[6]?.highlight, false);
  assert.equal(changelog.updates[6]?.kind, "improved");
  assert.equal(changelog.updates[6]?.date, "2026-11-14");
  assert.equal(changelog.updates[6]?.title, "Looks right on big screens");
  assert.equal(changelog.updates[7]?.id, "mood-check-in");
  assert.equal(changelog.updates[7]?.highlight, false);
  assert.equal(changelog.updates[7]?.kind, "improved");
  assert.equal(changelog.updates[7]?.date, "2026-11-14");
  assert.equal(changelog.updates[7]?.title, "Moods that fit your day");
  assert.equal(changelog.updates[8]?.id, "phone-layout");
  assert.equal(changelog.updates[8]?.highlight, false);
  assert.equal(changelog.updates[8]?.kind, "improved");
  assert.equal(changelog.updates[8]?.date, "2026-11-12");
  assert.equal(changelog.updates[8]?.title, "Easier to use on a phone");
  assert.equal(changelog.updates[9]?.id, "note-into-task");
  assert.equal(changelog.updates[9]?.highlight, false);
  assert.equal(changelog.updates[9]?.kind, "new");
  assert.equal(changelog.updates[9]?.date, "2026-11-11");
  assert.equal(changelog.updates[9]?.title, "Make a task from a note");
  assert.equal(changelog.updates[10]?.id, "note-actions");
  assert.equal(changelog.updates[10]?.highlight, false);
  assert.equal(changelog.updates[10]?.kind, "new");
  assert.equal(changelog.updates[10]?.date, "2026-11-11");
  assert.equal(changelog.updates[10]?.title, "More you can do with a note");
  assert.equal(changelog.updates[11]?.id, "calendar-day-links");
  assert.equal(changelog.updates[11]?.highlight, false);
  assert.equal(changelog.updates[11]?.kind, "new");
  assert.equal(changelog.updates[11]?.date, "2026-11-11");
  assert.equal(changelog.updates[12]?.id, "calendar-finished-tasks");
  assert.equal(changelog.updates[12]?.highlight, false);
  assert.equal(changelog.updates[12]?.kind, "improved");
  assert.equal(changelog.updates[12]?.date, "2026-11-11");
  assert.equal(changelog.updates[13]?.id, "shared-tags-notes-tasks");
  assert.equal(changelog.updates[13]?.highlight, true);
  assert.equal(changelog.updates[13]?.date, "2026-11-10");
  assert.equal(changelog.updates[14]?.id, "updates-view");
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
    ["phone-apps"]
  );
  assert.equal(changelog.comingSoon[0]?.title, "Phone apps");
  assert.equal(
    changelog.comingSoon[0]?.summary,
    "Prysmic is coming to iPhone and Android."
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
