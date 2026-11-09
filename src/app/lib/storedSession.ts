import { syncPersonalCache } from "./personalCache";
import { bumpSessionEpoch } from "./sessionBoundary";

/** Existing session key. Login, signup, and logout already use this name. */
export const ACCESS_TOKEN_KEY = "token";

/** How long "Not now" hides the confirmation note. */
export const VERIFY_PROMPT_SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;

const VERIFIED_KEY = "prysmic.emailVerified";
const SNOOZE_KEY = "prysmic.verifyPromptSnooze";
const REFRESH_KEY = "prysmic.emailVerifiedRefreshed";
const SIGNUP_NOTE_KEY = "prysmic.signupEmailNote";
const LOGIN_NOTICE_KEY = "prysmic.loginNotice";

type QueryClientLike = {
  clear: () => void;
  cancelQueries?: () => Promise<unknown>;
};

function sessionGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function sessionSet(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Private mode can reject storage. The flow still continues.
  }
}

function sessionRemove(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Ignore.
  }
}

function localGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function localSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode can reject storage.
  }
}

function readRecord(key: string): Record<string, unknown> {
  const raw = localGet(key);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, unknown>;
  } catch {
    return {};
  }
}

function currentUserId(): number | null {
  const token = readStoredToken();
  if (!token) return null;
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/"))) as { sub?: unknown };
    return typeof json.sub === "number" ? json.sub : null;
  } catch {
    return null;
  }
}

export function readStoredToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function hasStoredSession(): boolean {
  return Boolean(readStoredToken());
}

/**
 * Remember login or signup. The access token stays in localStorage under
 * "token", the same place the rest of the app already reads it.
 * emailVerified is cached per user in localStorage so another tab already
 * knows, and a profile refresh is not required on every visit.
 */
export function applyAuthSession(input: {
  token: string;
  emailVerified?: boolean;
  signedUp?: boolean;
}): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, input.token);
  sessionRemove(LOGIN_NOTICE_KEY);
  sessionRemove(REFRESH_KEY);
  if (typeof input.emailVerified === "boolean") {
    rememberEmailVerified(input.emailVerified);
  }
  if (input.signedUp) sessionSet(SIGNUP_NOTE_KEY, "1");
  else sessionRemove(SIGNUP_NOTE_KEY);
}

export function rememberEmailVerified(verified: boolean): void {
  const id = currentUserId();
  if (id == null) return;
  const cache = readRecord(VERIFIED_KEY);
  cache[String(id)] = verified;
  localSet(VERIFIED_KEY, JSON.stringify(cache));
  if (verified) {
    clearVerifySnooze(id);
    sessionRemove(SIGNUP_NOTE_KEY);
  }
}

export function readRememberedEmailVerified(): boolean | null {
  const id = currentUserId();
  if (id == null) return null;
  const value = readRecord(VERIFIED_KEY)[String(id)];
  return typeof value === "boolean" ? value : null;
}

/**
 * The profile is fetched at most once per tab session, and skipped entirely
 * when this user is already known to be verified.
 */
export function shouldRefreshEmailVerified(): boolean {
  if (readRememberedEmailVerified() === true) return false;
  const id = currentUserId();
  if (id == null) return false;
  return sessionGet(REFRESH_KEY) !== String(id);
}

export function markEmailVerifiedRefreshed(): void {
  const id = currentUserId();
  if (id == null) return;
  sessionSet(REFRESH_KEY, String(id));
}

export function readSignupEmailNote(): boolean {
  return sessionGet(SIGNUP_NOTE_KEY) === "1";
}

export function clearSignupEmailNote(): void {
  sessionRemove(SIGNUP_NOTE_KEY);
}

function clearVerifySnooze(userId: number): void {
  const snoozes = readRecord(SNOOZE_KEY);
  if (!(String(userId) in snoozes)) return;
  delete snoozes[String(userId)];
  localSet(SNOOZE_KEY, JSON.stringify(snoozes));
}

/** Hide the note for this user for three days. A later verification clears it. */
export function dismissVerifyPrompt(now = Date.now()): void {
  const id = currentUserId();
  if (id == null) return;
  const snoozes = readRecord(SNOOZE_KEY);
  snoozes[String(id)] = now + VERIFY_PROMPT_SNOOZE_MS;
  localSet(SNOOZE_KEY, JSON.stringify(snoozes));
}

export function isVerifyPromptDismissed(now = Date.now()): boolean {
  const id = currentUserId();
  if (id == null) return false;
  const until = readRecord(SNOOZE_KEY)[String(id)];
  return typeof until === "number" && until > now;
}

export function setLoginNotice(message: string): void {
  sessionSet(LOGIN_NOTICE_KEY, message);
}

export function readLoginNotice(): string | null {
  return sessionGet(LOGIN_NOTICE_KEY);
}

/**
 * End the signed-in session the same way logout does: advance the session
 * epoch, drop the in-memory query cache, and remove the access token.
 * The note draft is left alone so unsaved writing can be recovered after
 * the next sign-in. Call setLoginNotice after this if a message should survive.
 */
export function clearStoredSession(queryClient?: QueryClientLike): void {
  bumpSessionEpoch();
  if (queryClient) syncPersonalCache(queryClient, null);
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch {
    // Ignore.
  }
  sessionRemove(REFRESH_KEY);
  sessionRemove(SIGNUP_NOTE_KEY);
}
