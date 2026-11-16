import { readAccessToken, readEmailVerifiedFlag } from "./accountProfile";
import { messageFromBody } from "./authMessages";
import {
  ACCESS_TOKEN_KEY,
  emitSessionChange,
  isSessionRestoreSuppressed,
  readStoredToken,
  rememberEmailVerified,
} from "./storedSession";

/** API origin. Cookie calls and ordinary calls share this. */
export function apiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
}

export const REFRESH_PATH = "/auth/refresh";
export const REFRESH_LOCK_NAME = "prysmic-refresh";

const LOCK_STORAGE_KEY = "prysmic.refreshLock";
const LOCK_TTL_MS = 20_000;

/**
 * Routes whose response sets or clears `prysmic_refresh`.
 * Other calls stay uncredentialed so they keep today's CORS shape.
 */
const COOKIE_PATHS = new Set([
  "/auth/signup",
  "/auth/login",
  "/auth/refresh",
  "/auth/logout",
  "/auth/password/change",
  "/auth/password/reset",
]);

/**
 * These 401s are not an expired access token. Refreshing and retrying
 * would send the same body twice (a password, a one-time link).
 */
const REFRESH_EXEMPT_PATHS = new Set([
  "/auth/login",
  "/auth/signup",
  "/auth/refresh",
  "/auth/logout",
  "/auth/password/forgot",
  "/auth/password/reset",
  "/auth/password-policy",
  "/auth/email/verify",
  "/auth/email/resend",
]);

export type RefreshResult =
  | { ok: true; accessToken: string; emailVerified: boolean | null; reused: boolean }
  | { ok: false; reason: "expired" | "revoked" | "failed" | "paused" };

export type RefreshLock = {
  request<T>(name: string, callback: () => Promise<T>): Promise<T>;
};

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type RefreshClient = {
  fetch: (url: string, init: RequestInit) => Promise<Response>;
  readToken: () => string | null;
  writeToken: (token: string, emailVerified: boolean | null) => void;
  now: () => number;
  lock: RefreshLock | null;
  paused: () => boolean;
  wait: (ms: number) => Promise<void>;
  storage: StorageLike | null;
};

let refreshPaused = false;

/** Logout sets this so an in-flight 401 cannot rotate the cookie we are revoking. */
export function pauseSessionRefresh(paused: boolean): void {
  refreshPaused = paused;
}

export function isSessionRefreshPaused(): boolean {
  return refreshPaused;
}

export function resetRefreshSessionForTests(): void {
  refreshPaused = false;
  browserCoordinator = null;
}

function requestPath(endpoint: string): string {
  const query = endpoint.indexOf("?");
  return query === -1 ? endpoint : endpoint.slice(0, query);
}

export function requestNeedsSessionCookie(endpoint: string, method: string | undefined): boolean {
  const path = requestPath(endpoint);
  const verb = (method ?? "GET").toUpperCase();
  if (path === "/users/me" && verb === "DELETE") return true;
  return verb === "POST" && COOKIE_PATHS.has(path);
}

export function isRefreshExemptPath(endpoint: string): boolean {
  return REFRESH_EXEMPT_PATHS.has(requestPath(endpoint));
}

/** Wrong current password. Anything else on an authenticated 401 can try refresh. */
export function isCredentialRejection(body: unknown): boolean {
  const message = (messageFromBody(body) ?? "").trim();
  return /^invalid credentials$/i.test(message);
}

export function decodeAccessPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const padded = part.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (part.length % 4)) % 4);
    const json = JSON.parse(atob(padded)) as unknown;
    if (!json || typeof json !== "object") return null;
    return json as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** True when the access token has an expiry still in the future. */
export function isAccessTokenCurrent(token: string | null, nowMs = Date.now()): boolean {
  if (!token) return false;
  const payload = decodeAccessPayload(token);
  const exp = payload?.exp;
  if (typeof exp !== "number" || !Number.isFinite(exp)) return false;
  return exp > Math.floor(nowMs / 1000);
}

/**
 * One refresh for this tab, and one across tabs.
 * A second tab that finds a newer access token uses it and does not present
 * the cookie again. The backend treats a second use of a rotated cookie as
 * reuse; a short grace window is not required for this to be safe.
 */
export function createRefreshCoordinator(client: RefreshClient) {
  let inflight: Promise<RefreshResult> | null = null;

  return {
    refresh(staleToken: string | null): Promise<RefreshResult> {
      if (client.paused()) return Promise.resolve({ ok: false, reason: "paused" });
      if (inflight) return inflight;
      const run = runRefresh(client, staleToken).finally(() => {
        inflight = null;
      });
      inflight = run;
      return run;
    },
  };
}

async function runRefresh(client: RefreshClient, staleToken: string | null): Promise<RefreshResult> {
  const execute = () => rotateOnce(client, staleToken);
  if (client.lock) {
    try {
      return await client.lock.request(REFRESH_LOCK_NAME, execute);
    } catch {
      // The lock itself was unavailable. The callback does not throw.
      return fallbackLock(client, staleToken, execute);
    }
  }
  return fallbackLock(client, staleToken, execute);
}

async function rotateOnce(client: RefreshClient, staleToken: string | null): Promise<RefreshResult> {
  try {
    if (client.paused()) return { ok: false, reason: "paused" };
    const current = client.readToken();
    if (current && current !== staleToken && isAccessTokenCurrent(current, client.now())) {
      return { ok: true, accessToken: current, emailVerified: null, reused: true };
    }

    const res = await client.fetch(`${apiBaseUrl()}${REFRESH_PATH}`, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    if (client.paused()) return { ok: false, reason: "paused" };

    if (res.status === 401) {
      const body = await res.json().catch(() => null);
      const code = body && typeof body === "object" ? (body as { code?: unknown }).code : null;
      if (code === "refresh_expired") return { ok: false, reason: "expired" };
      if (code === "refresh_revoked") return { ok: false, reason: "revoked" };
      return { ok: false, reason: "failed" };
    }

    if (!res.ok) return { ok: false, reason: "failed" };

    const body = await res.json().catch(() => null);
    const accessToken = readAccessToken(body);
    if (!accessToken) return { ok: false, reason: "failed" };
    const emailVerified = readEmailVerifiedFlag(body);
    client.writeToken(accessToken, emailVerified);
    return { ok: true, accessToken, emailVerified, reused: false };
  } catch {
    return { ok: false, reason: "failed" };
  }
}

type LockRecord = { id: string; until: number };

function readLock(storage: StorageLike): LockRecord | null {
  const raw = storage.getItem(LOCK_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as LockRecord;
    if (!parsed || typeof parsed.id !== "string" || typeof parsed.until !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function tryAcquire(storage: StorageLike, owner: string, now: number): boolean {
  const current = readLock(storage);
  if (current && current.until > now && current.id !== owner) return false;
  storage.setItem(LOCK_STORAGE_KEY, JSON.stringify({ id: owner, until: now + LOCK_TTL_MS }));
  return readLock(storage)?.id === owner;
}

function releaseLock(storage: StorageLike, owner: string): void {
  if (readLock(storage)?.id === owner) storage.removeItem(LOCK_STORAGE_KEY);
}

async function fallbackLock(
  client: RefreshClient,
  staleToken: string | null,
  execute: () => Promise<RefreshResult>
): Promise<RefreshResult> {
  const storage = client.storage;
  if (!storage) return execute();

  const owner = `${client.now()}-${Math.random().toString(36).slice(2)}`;
  const deadline = client.now() + LOCK_TTL_MS;

  while (client.now() < deadline) {
    if (client.paused()) return { ok: false, reason: "paused" };
    if (tryAcquire(storage, owner, client.now())) {
      try {
        return await execute();
      } finally {
        releaseLock(storage, owner);
      }
    }
    const current = client.readToken();
    if (current && current !== staleToken && isAccessTokenCurrent(current, client.now())) {
      return { ok: true, accessToken: current, emailVerified: null, reused: true };
    }
    await client.wait(25);
  }

  return execute();
}

function browserLock(): RefreshLock | null {
  if (typeof navigator === "undefined" || !navigator.locks?.request) return null;
  const locks = navigator.locks;
  return {
    async request<T>(name: string, callback: () => Promise<T>): Promise<T> {
      // DOM types type the callback result as T. Browsers also accept a
      // promise and resolve request() with its value.
      return (await locks.request(name, () => callback() as unknown as T)) as T;
    },
  };
}

function browserStorage(): StorageLike | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

function writeBrowserToken(token: string, emailVerified: boolean | null): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
  if (typeof emailVerified === "boolean") rememberEmailVerified(emailVerified);
  emitSessionChange();
}

let browserCoordinator: ReturnType<typeof createRefreshCoordinator> | null = null;

function getBrowserCoordinator() {
  if (!browserCoordinator) {
    browserCoordinator = createRefreshCoordinator({
      fetch: (url, init) => fetch(url, init),
      readToken: () => readStoredToken(),
      writeToken: writeBrowserToken,
      now: () => Date.now(),
      lock: browserLock(),
      paused: () => refreshPaused,
      wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      storage: browserStorage(),
    });
  }
  return browserCoordinator;
}

/** Cookie-only refresh. `staleToken` is the access token that just failed, if any. */
export function refreshAccessSession(staleToken: string | null): Promise<RefreshResult> {
  return getBrowserCoordinator().refresh(staleToken);
}

/**
 * On load, a missing or expired access token can still have a live cookie.
 * A tab that just signed out does not try, so a failed logout stays signed out.
 */
export async function restoreSessionIfNeeded(): Promise<boolean> {
  const token = readStoredToken();
  if (isAccessTokenCurrent(token)) return true;
  if (isSessionRestoreSuppressed()) return false;
  const result = await refreshAccessSession(token);
  return result.ok;
}
