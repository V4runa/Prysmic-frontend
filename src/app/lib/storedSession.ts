import { syncPersonalCache } from "./personalCache";
import { bumpSessionEpoch } from "./sessionBoundary";

/** Existing session key. Login, signup, and logout already use this name. */
export const ACCESS_TOKEN_KEY = "token";

const VERIFIED_KEY = "prysmic.emailVerified";
const DISMISS_KEY = "prysmic.verifyPromptDismissed";
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
 * emailVerified lives in sessionStorage so a later profile read can refresh it.
 */
export function applyAuthSession(input: {
  token: string;
  emailVerified?: boolean;
  signedUp?: boolean;
}): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, input.token);
  sessionRemove(DISMISS_KEY);
  sessionRemove(LOGIN_NOTICE_KEY);
  if (typeof input.emailVerified === "boolean") {
    sessionSet(VERIFIED_KEY, input.emailVerified ? "1" : "0");
  } else {
    sessionRemove(VERIFIED_KEY);
  }
  if (input.signedUp) sessionSet(SIGNUP_NOTE_KEY, "1");
  else sessionRemove(SIGNUP_NOTE_KEY);
}

export function rememberEmailVerified(verified: boolean): void {
  sessionSet(VERIFIED_KEY, verified ? "1" : "0");
  if (verified) sessionRemove(SIGNUP_NOTE_KEY);
}

export function readRememberedEmailVerified(): boolean | null {
  const value = sessionGet(VERIFIED_KEY);
  if (value === "1") return true;
  if (value === "0") return false;
  return null;
}

export function readSignupEmailNote(): boolean {
  return sessionGet(SIGNUP_NOTE_KEY) === "1";
}

export function clearSignupEmailNote(): void {
  sessionRemove(SIGNUP_NOTE_KEY);
}

export function dismissVerifyPrompt(): void {
  sessionSet(DISMISS_KEY, "1");
}

export function isVerifyPromptDismissed(): boolean {
  return sessionGet(DISMISS_KEY) === "1";
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
  sessionRemove(VERIFIED_KEY);
  sessionRemove(DISMISS_KEY);
  sessionRemove(SIGNUP_NOTE_KEY);
}
