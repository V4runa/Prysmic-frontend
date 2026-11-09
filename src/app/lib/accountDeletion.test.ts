import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ACCOUNT_DELETED_NOTICE } from "./authMessages";
import {
  clearDeletedAccount,
  deleteConfirmationReady,
  deletionFailureMessage,
  interpretDeleteAccount,
  signalSessionExpired,
  WRONG_PASSWORD_MESSAGE,
} from "./accountDeletion";
import { resetPersonalCacheOwnerForTests, syncPersonalCache } from "./personalCache";
import { isPublicPath } from "./publicPaths";
import { currentSessionEpoch, resetSessionEpochForTests } from "./sessionBoundary";
import {
  applyAuthSession,
  dismissVerifyPrompt,
  readLoginNotice,
  rememberEmailVerified,
} from "./storedSession";
import { NOTE_DRAFT_KEY, readDraft, writeDraft, type DraftStorage, type NoteDraft } from "../notes/noteDraft";

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

function draftStorage(): DraftStorage & { dump: () => string | null } {
  const bag = new Map<string, string>();
  return {
    getItem: (key) => bag.get(key) ?? null,
    setItem: (key, value) => bag.set(key, value),
    removeItem: (key) => bag.delete(key),
    dump: () => bag.get(NOTE_DRAFT_KEY) ?? null,
  };
}

function draft(userId = 7): NoteDraft {
  return {
    v: 1,
    userId,
    noteKey: "new",
    title: "Garden path",
    content: "<p>Choose the quiet one.</p>",
    tagIds: [1],
    createdId: null,
    baseUpdatedAt: null,
    serverCopy: null,
    savedAt: Date.now(),
  };
}

function jwt(sub: number, username = "Ada"): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode({
    sub,
    username,
    email: `${username.toLowerCase()}@prysmic.test`,
  })}.sig`;
}

test.beforeEach(() => {
  const local = memoryStorage();
  const session = memoryStorage();
  Object.defineProperty(globalThis, "localStorage", { value: local, configurable: true });
  Object.defineProperty(globalThis, "sessionStorage", { value: session, configurable: true });
  resetSessionEpochForTests();
  resetPersonalCacheOwnerForTests();
});

test("deletion waits for DELETE and a password", () => {
  assert.equal(deleteConfirmationReady("delete", "secret"), false);
  assert.equal(deleteConfirmationReady("DELETE ", ""), false);
  assert.equal(deleteConfirmationReady(" DELETE ", "current"), true);
});

test("delete responses stay on the page except for success", () => {
  assert.equal(interpretDeleteAccount(204, null, null).type, "deleted");
  assert.deepEqual(interpretDeleteAccount(401, { message: "Invalid credentials" }, null), {
    type: "rejected",
    message: WRONG_PASSWORD_MESSAGE,
  });
  assert.equal(WRONG_PASSWORD_MESSAGE, "That password doesn't match.");
  assert.deepEqual(
    interpretDeleteAccount(401, { message: "Unauthorized: Invalid or missing token" }, null),
    { type: "expired" }
  );
  assert.equal(
    deletionFailureMessage({
      status: 401,
      body: { message: "Invalid credentials" },
      retryAfter: null,
    }),
    WRONG_PASSWORD_MESSAGE
  );
  assert.equal(
    deletionFailureMessage({
      status: 401,
      body: { message: "Unauthorized: Invalid or missing token" },
      retryAfter: null,
    }),
    ""
  );
  const wait = interpretDeleteAccount(429, { message: "Too Many Requests" }, "30");
  assert.equal(wait.type, "wait");
  if (wait.type === "wait") {
    assert.match(wait.message, /Wait a little/);
    assert.match(wait.message, /30 seconds/);
    assert.equal(wait.message.includes("Too Many Requests"), false);
  }
  const missing = interpretDeleteAccount(400, { message: "Password is required." }, null);
  assert.equal(missing.type === "deleted" || missing.type === "expired" ? "" : missing.message, "Password is required.");
  assert.equal(deletionFailureMessage({ network: true }).includes("still here"), true);
  assert.equal(deletionFailureMessage({}).includes("still here"), true);
});

test("a dead session during deletion uses the usual sign-out signal", () => {
  localStorage.setItem("token", "still-signed-in");
  localStorage.setItem("lastMoodDate", "2026-11-09");
  const events: string[] = [];
  Object.defineProperty(globalThis, "window", {
    value: {
      dispatchEvent(event: Event) {
        events.push(event.type);
        return true;
      },
    },
    configurable: true,
  });
  try {
    signalSessionExpired();
    assert.equal(localStorage.getItem("token"), null);
    assert.equal(localStorage.getItem("lastMoodDate"), "2026-11-09");
    assert.deepEqual(events, ["token-expired"]);
    assert.equal(readLoginNotice(), null);
  } finally {
    delete (globalThis as { window?: unknown }).window;
  }
});

test("deleting an account clears that user's draft and reminder, then the session", () => {
  const now = Date.parse("2026-11-09T00:00:00.000Z");
  applyAuthSession({ token: jwt(7), emailVerified: false, signedUp: true });
  dismissVerifyPrompt(now);
  rememberEmailVerified(false);

  localStorage.setItem("token", jwt(8, "Bea"));
  dismissVerifyPrompt(now);
  rememberEmailVerified(false);

  localStorage.setItem("token", jwt(7));
  localStorage.setItem("lastMoodDate", "2026-11-09");
  localStorage.setItem("prysmic_onboarding_pending", "1");
  localStorage.setItem("prysmic_onboarding_complete", "1");
  localStorage.setItem("prysmic.calendarSources", "{\"notes\":true}");
  const storage = draftStorage();
  assert.deepEqual(writeDraft(storage, draft(7)), { ok: true });
  syncPersonalCache({ clear() {} }, 7);
  const epoch = currentSessionEpoch();
  let cleared = 0;

  clearDeletedAccount({
    draftStorage: storage,
    queryClient: {
      clear() {
        cleared += 1;
      },
    },
  });

  assert.equal(localStorage.getItem("token"), null);
  assert.equal(readDraft(storage), null);
  assert.equal(storage.dump(), null);
  assert.equal(readLoginNotice(), ACCOUNT_DELETED_NOTICE);
  assert.equal(ACCOUNT_DELETED_NOTICE, "Your account has been deleted.");
  assert.equal(localStorage.getItem("lastMoodDate"), "2026-11-09");
  assert.equal(localStorage.getItem("prysmic_onboarding_pending"), "1");
  assert.equal(localStorage.getItem("prysmic_onboarding_complete"), "1");
  assert.equal(localStorage.getItem("prysmic.calendarSources"), "{\"notes\":true}");
  assert.ok(currentSessionEpoch() > epoch);
  assert.equal(cleared, 1);

  const snooze = JSON.parse(localStorage.getItem("prysmic.verifyPromptSnooze") ?? "{}") as Record<string, number>;
  assert.equal("7" in snooze, false);
  assert.equal(typeof snooze["8"], "number");
  const verified = JSON.parse(localStorage.getItem("prysmic.emailVerified") ?? "{}") as Record<string, boolean>;
  assert.equal("7" in verified, false);
  assert.equal(verified["8"], false);
});

test("a missing user id does not wipe someone else's reminder", () => {
  localStorage.setItem("token", "not-a-jwt");
  localStorage.setItem("prysmic.verifyPromptSnooze", JSON.stringify({ "3": 99 }));
  const storage = draftStorage();
  writeDraft(storage, draft(3));
  clearDeletedAccount({ draftStorage: storage });
  const snooze = JSON.parse(localStorage.getItem("prysmic.verifyPromptSnooze") ?? "{}") as Record<string, number>;
  assert.equal(snooze["3"], 99);
  assert.equal(readDraft(storage), null);
  assert.equal(localStorage.getItem("token"), null);
  assert.equal(readLoginNotice(), ACCOUNT_DELETED_NOTICE);
});

test("account deletion stays inside the app shell and reuses export", () => {
  assert.equal(isPublicPath("/account"), false);
  const paths = readFileSync(new URL("./publicPaths.ts", import.meta.url), "utf8");
  assert.equal(paths.includes("/account"), false);
  const shell = readFileSync(new URL("../components/ClientShellWrapper.tsx", import.meta.url), "utf8");
  assert.equal(shell.includes("/account"), false);

  const page = readFileSync(new URL("../account/page.tsx", import.meta.url), "utf8");
  assert.match(page, /ExportDataButton/);
  assert.match(page, /notes, tags, habits, tasks, and moods/);
  assert.match(page, /can(?:'|&#39;|&apos;)t be undone/);
  assert.match(page, /DeleteAccountDialog/);
  assert.match(page, /readStoredToken/);
  assert.match(page, /router\.replace\("\/login"\)/);

  const dialog = readFileSync(new URL("../components/DeleteAccountDialog.tsx", import.meta.url), "utf8");
  assert.match(dialog, /can(?:'|&#39;|&apos;)t be undone/);
  assert.match(dialog, /method:\s*"DELETE"/);
  assert.match(dialog, /\/users\/me/);
  assert.match(dialog, /keepSessionOn401:\s*true/);
  assert.match(dialog, /password/);
  const submit = dialog.slice(dialog.indexOf("async function onSubmit"));
  assert.ok(submit.indexOf('"/users/me"') < submit.indexOf("clearDeletedAccount"));
  assert.ok(submit.indexOf("clearDeletedAccount") < submit.indexOf('router.push("/login")'));
  assert.match(dialog, /router\.push\("\/login"\)/);
  assert.match(dialog, /signalSessionExpired/);
  assert.equal(dialog.includes("clearDraft"), false);

  const appShell = readFileSync(new URL("../components/AppShell.tsx", import.meta.url), "utf8");
  assert.match(appShell, /href="\/account"/);
  const helper = readFileSync(new URL("./accountDeletion.ts", import.meta.url), "utf8");
  assert.match(helper, /clearDraft/);
  assert.match(helper, /clearUserAuthMemory/);
  assert.match(helper, /ACCOUNT_DELETED_NOTICE/);
  const session = readFileSync(new URL("./storedSession.ts", import.meta.url), "utf8");
  assert.equal(session.includes("clearDraft"), false);
});
