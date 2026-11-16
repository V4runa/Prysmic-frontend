import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ApiError, apiFetch, apiFetchDownload } from "../hooks/useApi";
import { NOTE_DRAFT_KEY } from "../notes/noteDraft";
import { resetPersonalCacheOwnerForTests } from "./personalCache";
import { completeLogout, requestLogout } from "./logout";
import {
  createRefreshCoordinator,
  isAccessTokenCurrent,
  isCredentialRejection,
  isRefreshExemptPath,
  isSessionRefreshPaused,
  pauseSessionRefresh,
  requestNeedsSessionCookie,
  resetRefreshSessionForTests,
  restoreSessionIfNeeded,
  type RefreshClient,
  type RefreshLock,
} from "./refreshSession";
import { currentSessionEpoch, resetSessionEpochForTests } from "./sessionBoundary";
import {
  discardExpiredAccessToken,
  isSessionRestoreSuppressed,
  suppressSessionRestore,
} from "./storedSession";

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

function jwt(exp: number, sub = 7): string {
  const payload = Buffer.from(
    JSON.stringify({ sub, exp, username: "Ada", email: "ada@prysmic.test" })
  ).toString("base64url");
  return `eyJhbGciOiJIUzI1NiJ9.${payload}.sig`;
}

const future = () => Math.floor(Date.now() / 1000) + 60 * 60;
const past = () => Math.floor(Date.now() / 1000) - 60;

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function queueLock(): RefreshLock {
  let tail: Promise<unknown> = Promise.resolve();
  return {
    request(_name, callback) {
      const run = tail.then(() => callback());
      tail = run.then(
        () => undefined,
        () => undefined
      );
      return run;
    },
  };
}

type Seen = { url: string; init: RequestInit };

function installBrowser() {
  const local = memoryStorage();
  const session = memoryStorage();
  const events: string[] = [];
  Object.defineProperty(globalThis, "localStorage", { value: local, configurable: true });
  Object.defineProperty(globalThis, "sessionStorage", { value: session, configurable: true });
  Object.defineProperty(globalThis, "window", {
    value: {
      localStorage: local,
      sessionStorage: session,
      dispatchEvent(event: Event) {
        events.push(event.type);
        return true;
      },
      confirm() {
        return true;
      },
    },
    configurable: true,
  });
  return { local, session, events };
}

test.beforeEach(() => {
  installBrowser();
  resetRefreshSessionForTests();
  resetSessionEpochForTests();
  resetPersonalCacheOwnerForTests();
});

test.afterEach(() => {
  pauseSessionRefresh(false);
  resetRefreshSessionForTests();
});

test("cookie calls are credentialed and ordinary calls are not", () => {
  for (const path of [
    "/auth/signup",
    "/auth/login",
    "/auth/refresh",
    "/auth/logout",
    "/auth/password/change",
    "/auth/password/reset",
  ]) {
    assert.equal(requestNeedsSessionCookie(path, "POST"), true, path);
    assert.equal(requestNeedsSessionCookie(path, "GET"), false, path);
  }
  assert.equal(requestNeedsSessionCookie("/users/me", "DELETE"), true);
  assert.equal(requestNeedsSessionCookie("/users/me", "GET"), false);
  assert.equal(requestNeedsSessionCookie("/notes", "GET"), false);
  assert.equal(requestNeedsSessionCookie("/notes", "POST"), false);
  assert.equal(requestNeedsSessionCookie("/auth/password/forgot", "POST"), false);
  assert.equal(requestNeedsSessionCookie("/auth/email/verify", "POST"), false);

  assert.equal(isRefreshExemptPath("/auth/login"), true);
  assert.equal(isRefreshExemptPath("/auth/password/reset"), true);
  assert.equal(isRefreshExemptPath("/auth/password/change"), false);
  assert.equal(isRefreshExemptPath("/notes/4"), false);
  assert.equal(isCredentialRejection({ message: "Invalid credentials" }), true);
  assert.equal(isCredentialRejection({ message: "Unauthorized" }), false);
});

test("an access token is current only while its expiry is ahead", () => {
  assert.equal(isAccessTokenCurrent(null), false);
  assert.equal(isAccessTokenCurrent("not-a-jwt"), false);
  assert.equal(isAccessTokenCurrent(jwt(future())), true);
  assert.equal(isAccessTokenCurrent(jwt(past())), false);
});

test("one tab's refresh is shared, and a second tab reuses the new access token", async () => {
  const storage = memoryStorage();
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let refreshes = 0;
  const fresh = jwt(future());
  const fetchImpl: RefreshClient["fetch"] = async (url) => {
    assert.equal(url.endsWith("/auth/refresh"), true);
    refreshes += 1;
    if (refreshes === 1) await gate;
    return jsonResponse(200, { access_token: fresh, emailVerified: true });
  };
  const client = (lock: RefreshLock | null): RefreshClient => ({
    fetch: fetchImpl,
    readToken: () => storage.getItem("token"),
    writeToken: (token) => storage.setItem("token", token),
    now: () => Date.now(),
    lock,
    paused: () => false,
    wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    storage,
  });

  const lock = queueLock();
  const tabA = createRefreshCoordinator(client(lock));
  const tabB = createRefreshCoordinator(client(lock));
  const both = Promise.all([tabA.refresh(null), tabB.refresh(null)]);
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(refreshes, 1);
  release();
  const [a, b] = await both;
  assert.equal(a.ok && b.ok, true);
  if (a.ok && b.ok) {
    assert.equal(a.accessToken, fresh);
    assert.equal(b.accessToken, fresh);
    assert.equal(a.reused || b.reused, true);
  }
  assert.equal(storage.getItem("token"), fresh);
  assert.equal(refreshes, 1);

  // The storage fallback, used where Web Locks is missing, does the same.
  storage.removeItem("token");
  refreshes = 0;
  let releaseFallback = () => {};
  const fallbackGate = new Promise<void>((resolve) => {
    releaseFallback = resolve;
  });
  const fallbackFetch: RefreshClient["fetch"] = async () => {
    refreshes += 1;
    if (refreshes === 1) await fallbackGate;
    return jsonResponse(200, { access_token: fresh, emailVerified: true });
  };
  const fallbackClient = (): RefreshClient => ({
    fetch: fallbackFetch,
    readToken: () => storage.getItem("token"),
    writeToken: (token) => storage.setItem("token", token),
    now: () => Date.now(),
    lock: null,
    paused: () => false,
    wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    storage,
  });
  const left = createRefreshCoordinator(fallbackClient());
  const right = createRefreshCoordinator(fallbackClient());
  const pair = Promise.all([left.refresh(storage.getItem("token")), right.refresh(null)]);
  await new Promise((resolve) => setTimeout(resolve, 40));
  assert.equal(refreshes, 1);
  releaseFallback();
  const [leftResult, rightResult] = await pair;
  assert.equal(leftResult.ok && rightResult.ok, true);
  assert.equal(refreshes, 1);
  assert.equal(storage.getItem("token"), fresh);
});

test("a same-tab burst refreshes once", async () => {
  const storage = memoryStorage();
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let refreshes = 0;
  const fresh = jwt(future());
  const coordinator = createRefreshCoordinator({
    fetch: async () => {
      refreshes += 1;
      await gate;
      return jsonResponse(200, { access_token: fresh, emailVerified: false });
    },
    readToken: () => storage.getItem("token"),
    writeToken: (token) => storage.setItem("token", token),
    now: () => Date.now(),
    lock: queueLock(),
    paused: () => false,
    wait: () => Promise.resolve(),
    storage,
  });
  const both = Promise.all([coordinator.refresh(null), coordinator.refresh(null)]);
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(refreshes, 1);
  release();
  const [a, b] = await both;
  assert.equal(a.ok && b.ok, true);
  assert.equal(refreshes, 1);
});

test("a 401 refreshes once, retries, and leaves the note draft in place", async () => {
  const expired = jwt(past());
  const fresh = jwt(future());
  localStorage.setItem("token", expired);
  sessionStorage.setItem(NOTE_DRAFT_KEY, "{\"title\":\"unsaved\"}");
  const seen: Seen[] = [];
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    seen.push({ url, init: init ?? {} });
    if (url.endsWith("/auth/refresh")) {
      assert.equal(init?.credentials, "include");
      assert.equal(init?.body, undefined);
      return jsonResponse(200, { access_token: fresh, emailVerified: true });
    }
    const auth = new Headers(init?.headers).get("authorization");
    if (auth === `Bearer ${fresh}`) return jsonResponse(200, { id: 3, title: "kept" });
    return jsonResponse(401, { message: "Unauthorized" });
  };

  const note = await apiFetch<{ id: number; title: string }>("/notes/3");
  assert.equal(note.title, "kept");
  assert.equal(seen.filter((call) => call.url.endsWith("/auth/refresh")).length, 1);
  const notes = seen.filter((call) => call.url.endsWith("/notes/3"));
  assert.equal(notes.length, 2);
  assert.equal(notes[0]?.init.credentials, undefined);
  assert.equal(new Headers(notes[1]?.init.headers).get("authorization"), `Bearer ${fresh}`);
  assert.equal(localStorage.getItem("token"), fresh);
  assert.equal(sessionStorage.getItem(NOTE_DRAFT_KEY), "{\"title\":\"unsaved\"}");
  assert.equal(currentSessionEpoch(), 0);
});

test("two calls that 401 together share one refresh", async () => {
  const expired = jwt(past());
  const fresh = jwt(future());
  localStorage.setItem("token", expired);
  let refreshes = 0;
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/auth/refresh")) {
      refreshes += 1;
      await gate;
      return jsonResponse(200, { access_token: fresh, emailVerified: true });
    }
    const auth = new Headers(init?.headers).get("authorization");
    if (auth === `Bearer ${fresh}`) return jsonResponse(200, { ok: true });
    return jsonResponse(401, { message: "Unauthorized" });
  };

  const both = Promise.all([apiFetch("/notes"), apiFetch("/tasks")]);
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(refreshes, 1);
  release();
  const [notes, tasks] = await both;
  assert.deepEqual(notes, { ok: true });
  assert.deepEqual(tasks, { ok: true });
  assert.equal(refreshes, 1);
});

test("a failed refresh signs in again and does not retry the original call", async () => {
  localStorage.setItem("token", jwt(past()));
  sessionStorage.setItem(NOTE_DRAFT_KEY, "{\"title\":\"still here\"}");
  const events: string[] = [];
  const win = globalThis.window as { dispatchEvent: (event: Event) => boolean };
  const original = win.dispatchEvent.bind(win);
  win.dispatchEvent = (event: Event) => {
    events.push(event.type);
    return original(event);
  };
  let notes = 0;
  let refreshes = 0;
  globalThis.fetch = async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/auth/refresh")) {
      refreshes += 1;
      return jsonResponse(401, {
        statusCode: 401,
        message: "This session has expired. Sign in again.",
        error: "Unauthorized",
        code: "refresh_expired",
      });
    }
    notes += 1;
    return jsonResponse(401, { message: "Unauthorized" });
  };

  await assert.rejects(apiFetch("/notes"), /Session expired/);
  assert.equal(notes, 1);
  assert.equal(refreshes, 1);
  assert.equal(localStorage.getItem("token"), null);
  assert.equal(sessionStorage.getItem(NOTE_DRAFT_KEY), "{\"title\":\"still here\"}");
  assert.equal(currentSessionEpoch(), 0);
  assert.deepEqual(events, ["token-expired"]);
});

test("a wrong password does not refresh, and an expired password change does", async () => {
  const expired = jwt(past());
  const fresh = jwt(future(), 7);
  const renewed = jwt(future(), 7);
  localStorage.setItem("token", expired);
  let refreshes = 0;
  let phase: "wrong" | "expired" = "wrong";
  const changeInits: RequestInit[] = [];
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/auth/refresh")) {
      refreshes += 1;
      return jsonResponse(200, { access_token: fresh, emailVerified: true });
    }
    changeInits.push(init ?? {});
    if (phase === "wrong") {
      return jsonResponse(401, { message: "Invalid credentials" });
    }
    const auth = new Headers(init?.headers).get("authorization");
    if (auth === `Bearer ${fresh}`) {
      return jsonResponse(200, { access_token: renewed, emailVerified: true });
    }
    return jsonResponse(401, { message: "Unauthorized" });
  };

  await assert.rejects(
    apiFetch("/auth/password/change", {
      method: "POST",
      keepSessionOn401: true,
      body: JSON.stringify({ currentPassword: "nope", newPassword: "better-secret" }),
    }),
    (err: unknown) => err instanceof ApiError && err.status === 401
  );
  assert.equal(refreshes, 0);
  assert.equal(changeInits[0]?.credentials, "include");
  assert.equal(localStorage.getItem("token"), expired);

  phase = "expired";
  const updated = await apiFetch<{ access_token: string }>("/auth/password/change", {
    method: "POST",
    keepSessionOn401: true,
    body: JSON.stringify({ currentPassword: "current-secret", newPassword: "better-secret" }),
  });
  assert.equal(updated.access_token, renewed);
  assert.equal(refreshes, 1);
  assert.equal(changeInits.at(-1)?.credentials, "include");
  assert.equal(localStorage.getItem("token"), fresh);
});

test("login and account deletion send the cookie, and a bad login does not refresh", async () => {
  const seen: Seen[] = [];
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    seen.push({ url: String(input), init: init ?? {} });
    if (String(input).endsWith("/auth/login")) {
      return jsonResponse(401, { message: "Invalid credentials" });
    }
    if (String(input).endsWith("/users/me")) return new Response(null, { status: 204 });
    return jsonResponse(500, {});
  };

  await assert.rejects(
    apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ identifier: "Ada", password: "nope" }) }),
    /Session expired/
  );
  assert.equal(seen.some((call) => call.url.endsWith("/auth/refresh")), false);
  assert.equal(seen[0]?.init.credentials, "include");

  resetRefreshSessionForTests();
  await apiFetch("/users/me", { method: "DELETE", keepSessionOn401: true, body: JSON.stringify({ password: "secret" }) });
  const deletion = seen.find((call) => call.url.endsWith("/users/me"));
  assert.equal(deletion?.init.credentials, "include");
  assert.equal(deletion?.init.method, "DELETE");
});

test("a download 401 refreshes once and then saves the file", async () => {
  const expired = jwt(past());
  const fresh = jwt(future());
  localStorage.setItem("token", expired);
  let refreshes = 0;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/auth/refresh")) {
      refreshes += 1;
      return jsonResponse(200, { access_token: fresh, emailVerified: true });
    }
    const auth = new Headers(init?.headers).get("authorization");
    if (auth === `Bearer ${fresh}`) {
      return new Response(JSON.stringify({ exportedAt: "2026-11-16T00:00:00.000Z" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return jsonResponse(401, { message: "Unauthorized" });
  };

  const file = await apiFetchDownload("/export");
  assert.match(await file.blob.text(), /exportedAt/);
  assert.equal(refreshes, 1);
  assert.equal(localStorage.getItem("token"), fresh);
});

test("silent restore uses the cookie when the access token is missing or old", async () => {
  let refreshes = 0;
  const fresh = jwt(future());
  globalThis.fetch = async () => {
    refreshes += 1;
    return jsonResponse(200, { access_token: fresh, emailVerified: true });
  };
  assert.equal(await restoreSessionIfNeeded(), true);
  assert.equal(refreshes, 1);
  assert.equal(localStorage.getItem("token"), fresh);

  refreshes = 0;
  assert.equal(await restoreSessionIfNeeded(), true);
  assert.equal(refreshes, 0);

  localStorage.setItem("token", jwt(past()));
  const newer = jwt(future());
  globalThis.fetch = async () => {
    refreshes += 1;
    return jsonResponse(200, { access_token: newer, emailVerified: false });
  };
  assert.equal(await restoreSessionIfNeeded(), true);
  assert.equal(localStorage.getItem("token"), newer);

  suppressSessionRestore();
  localStorage.setItem("token", jwt(past()));
  refreshes = 0;
  assert.equal(await restoreSessionIfNeeded(), false);
  assert.equal(refreshes, 0);
  assert.equal(isSessionRestoreSuppressed(), true);
});

test("signing out revokes the cookie and clears local state even when the network fails", async () => {
  localStorage.setItem("token", jwt(future()));
  sessionStorage.setItem(NOTE_DRAFT_KEY, "{\"title\":\"draft\"}");
  let calls = 0;
  let landed = "";
  await completeLogout({
    queryClient: { clear() {} },
    navigate: (href) => {
      landed = href;
    },
    logout: async () => {
      calls += 1;
      throw new Error("offline");
    },
  });
  assert.equal(calls, 1);
  assert.equal(localStorage.getItem("token"), null);
  assert.equal(sessionStorage.getItem(NOTE_DRAFT_KEY), null);
  assert.equal(landed, "/login");
  assert.equal(isSessionRestoreSuppressed(), true);
  assert.equal(isSessionRefreshPaused(), false);

  const kept = jwt(future());
  localStorage.setItem("token", kept);
  const draft = {
    v: 1,
    userId: 7,
    noteKey: "new",
    title: "keep",
    content: "<p>words</p>",
    tagIds: [],
    createdId: null,
    baseUpdatedAt: null,
    serverCopy: null,
    savedAt: Date.now(),
  };
  sessionStorage.setItem(NOTE_DRAFT_KEY, JSON.stringify(draft));
  let logouts = 0;
  const cancelled = requestLogout({
    queryClient: { clear() {} },
    navigate: () => {
      landed = "nope";
    },
    confirm: () => false,
    logout: async () => {
      logouts += 1;
    },
  });
  assert.equal(cancelled, false);
  assert.equal(logouts, 0);
  assert.equal(localStorage.getItem("token"), kept);
  assert.equal(JSON.parse(sessionStorage.getItem(NOTE_DRAFT_KEY) ?? "{}").title, "keep");

  const seen: Seen[] = [];
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    seen.push({ url: String(input), init: init ?? {} });
    return jsonResponse(200, { loggedOut: true });
  };
  landed = "";
  await completeLogout({
    queryClient: { clear() {} },
    navigate: (href) => {
      landed = href;
    },
  });
  assert.equal(seen[0]?.url.endsWith("/auth/logout"), true);
  assert.equal(seen[0]?.init.method, "POST");
  assert.equal(seen[0]?.init.credentials, "include");
  assert.equal(seen[0]?.init.body, undefined);
  assert.equal(landed, "/login");
  assert.equal(localStorage.getItem("token"), null);
});

test("ending an expired session keeps the draft and does not switch accounts", () => {
  const epoch = currentSessionEpoch();
  localStorage.setItem("token", jwt(past()));
  sessionStorage.setItem(NOTE_DRAFT_KEY, "{\"title\":\"recover me\"}");
  discardExpiredAccessToken();
  assert.equal(localStorage.getItem("token"), null);
  assert.equal(sessionStorage.getItem(NOTE_DRAFT_KEY), "{\"title\":\"recover me\"}");
  assert.equal(currentSessionEpoch(), epoch);
});

test("the sign-in screen, privacy policy, and password change match the session contract", () => {
  const login = readFileSync(new URL("../login/page.tsx", import.meta.url), "utf8");
  assert.match(login, /restoreSessionIfNeeded/);
  assert.match(login, /One moment…/);
  assert.match(login, /Enter the Flow/);
  const formAt = login.indexOf("Enter the Flow");
  const gateAt = login.indexOf("if (!ready)");
  assert.equal(gateAt < formAt, true);

  const privacy = readFileSync(new URL("../(marketing)/privacy/page.tsx", import.meta.url), "utf8");
  assert.match(privacy, /Last updated: November 16, 2026/);
  assert.match(privacy, /Eduardo Martin Gargani/);
  assert.match(privacy, /one essential sign-in cookie on api\.prysmic\.me/);
  assert.match(privacy, /httpOnly/);
  assert.match(privacy, /up to 30 days/);
  assert.match(privacy, /renewed while you use the app/);
  assert.match(privacy, /short-lived sign-in token in your browser's local storage/);
  assert.match(
    privacy,
    /While you write, an unsaved copy of the note you're editing is kept in that browser tab so it isn't lost, and it's cleared when the tab closes or after 24 hours\./
  );
  assert.match(privacy, /Signing out, changing your password, or deleting your account ends the cookie and the token/);
  assert.match(privacy, /does not set tracking or analytics cookies/);
  assert.match(privacy, /one hour for password reset/);
  assert.equal(privacy.includes("Prysmic does not set cookies."), false);
  assert.equal(privacy.includes("expires after one hour"), false);

  const settings = readFileSync(new URL("../settings/page.tsx", import.meta.url), "utf8");
  assert.match(settings, /\/auth\/password\/change/);
  assert.match(settings, /token: outcome\.token/);

  const note = readFileSync(new URL("../notes/[id]/page.tsx", import.meta.url), "utf8");
  assert.match(note, /token-expired/);
  const fresh = readFileSync(new URL("../notes/new/page.tsx", import.meta.url), "utf8");
  assert.match(fresh, /token-expired/);
});
