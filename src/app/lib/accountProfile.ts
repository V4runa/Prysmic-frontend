import {
  RATE_LIMIT_MESSAGE,
  formatWait,
  messageFromBody,
  parseRetryAfter,
} from "./authMessages";
import { utf8ByteLength } from "./passwordPolicy";

export interface PublicProfile {
  id: number;
  username: string;
  email: string;
  emailVerified: boolean | null;
}

export interface PasswordPolicyView {
  minLength: number;
  maxBytes: number;
}

export function passwordPolicyView(
  body: unknown,
  fallback: PasswordPolicyView
): PasswordPolicyView {
  if (!body || typeof body !== "object") return fallback;
  const record = body as Record<string, unknown>;
  const minLength =
    typeof record.minLength === "number" && Number.isFinite(record.minLength) && record.minLength > 0
      ? Math.floor(record.minLength)
      : fallback.minLength;
  const maxBytes =
    typeof record.maxBytes === "number" && Number.isFinite(record.maxBytes) && record.maxBytes > 0
      ? Math.floor(record.maxBytes)
      : fallback.maxBytes;
  return { minLength, maxBytes };
}

export function passwordPolicySentence(policy: PasswordPolicyView): string {
  return `At least ${policy.minLength} characters, at most ${policy.maxBytes} bytes, and not your username or email.`;
}

export function newPasswordIssue(input: {
  currentPassword: string;
  password: string;
  confirm: string;
  email?: string | null;
  username?: string | null;
  policy: PasswordPolicyView;
}): { field: "new" | "confirm"; message: string } | null {
  if (!input.password) return { field: "new", message: "Enter a new password." };
  if (input.password === input.currentPassword) {
    return { field: "new", message: "New password must be different from the current password." };
  }
  if (input.password.length < input.policy.minLength) {
    return { field: "new", message: `Password must be at least ${input.policy.minLength} characters.` };
  }
  if (utf8ByteLength(input.password) > input.policy.maxBytes) {
    return { field: "new", message: `Password must be at most ${input.policy.maxBytes} bytes.` };
  }
  const candidate = input.password.toLowerCase();
  const email = (input.email ?? "").trim().toLowerCase();
  const username = (input.username ?? "").toLowerCase();
  const at = email.indexOf("@");
  const local = at > 0 ? email.slice(0, at) : "";
  if (email && candidate === email) {
    return { field: "new", message: "Password cannot be your email address." };
  }
  if (local && candidate === local) {
    return { field: "new", message: "Password cannot be the part of your email before @." };
  }
  if (username && candidate === username) {
    return { field: "new", message: "Password cannot be your username." };
  }
  if (input.password !== input.confirm) {
    return { field: "confirm", message: "Those passwords don't match yet." };
  }
  return null;
}

export function readAccessToken(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  if (typeof record.access_token === "string" && record.access_token) return record.access_token;
  if (typeof record.accessToken === "string" && record.accessToken) return record.accessToken;
  return null;
}

export function readEmailVerifiedFlag(body: unknown): boolean | null {
  if (!body || typeof body !== "object") return null;
  const value = (body as { emailVerified?: unknown }).emailVerified;
  return typeof value === "boolean" ? value : null;
}

export function readPublicUser(body: unknown): PublicProfile | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const source =
    record.user && typeof record.user === "object"
      ? (record.user as Record<string, unknown>)
      : record;
  const id = typeof source.id === "number" ? source.id : null;
  const username = typeof source.username === "string" ? source.username : null;
  const email = typeof source.email === "string" ? source.email : null;
  if (id == null || !username || !email) return null;
  const emailVerified = typeof source.emailVerified === "boolean" ? source.emailVerified : null;
  return { id, username, email, emailVerified };
}

/** GET /users returns the caller as a one-item list. A single object is accepted too. */
export function readSelf(body: unknown, userId: number): PublicProfile | null {
  const list = Array.isArray(body) ? body : [body];
  for (const item of list) {
    const user = readPublicUser(item);
    if (user && user.id === userId) return user;
  }
  return null;
}

export type ProfileField = "username" | "email" | "currentPassword" | "form";

export type ProfileUpdatePlan =
  | { ok: false; field: ProfileField; message: string }
  | { ok: true; changed: false }
  | {
      ok: true;
      changed: true;
      emailChanged: boolean;
      body: { username?: string; email?: string; currentPassword?: string };
    };

export function buildProfileUpdate(input: {
  username: string;
  email: string;
  savedUsername: string;
  savedEmail: string;
  currentPassword: string;
}): ProfileUpdatePlan {
  const username = input.username.trim();
  const email = input.email.trim().toLowerCase();
  const savedUsername = input.savedUsername.trim();
  const savedEmail = input.savedEmail.trim().toLowerCase();
  if (!username) return { ok: false, field: "username", message: "Add a username." };
  if (!email) return { ok: false, field: "email", message: "Add the email on your account." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, field: "email", message: "That doesn't look like an email." };
  }
  const usernameChanged = username !== savedUsername;
  const emailChanged = email !== savedEmail;
  if (!usernameChanged && !emailChanged) return { ok: true, changed: false };
  if (emailChanged && input.currentPassword.length === 0) {
    return {
      ok: false,
      field: "currentPassword",
      message: "Enter your current password to change your email.",
    };
  }
  const body: { username?: string; email?: string; currentPassword?: string } = {};
  if (usernameChanged) body.username = username;
  if (emailChanged) {
    body.email = email;
    body.currentPassword = input.currentPassword;
  }
  return { ok: true, changed: true, emailChanged, body };
}

function conflictField(message: string): ProfileField {
  const lower = message.toLowerCase();
  const email = lower.includes("email");
  const username = lower.includes("username");
  if (email && !username) return "email";
  if (username && !email) return "username";
  return "form";
}

function shownMessage(body: unknown, fallback: string): string {
  const message = messageFromBody(body);
  if (message && message.length <= 400) return message;
  return fallback;
}

function waitMessage(body: unknown, retryAfter: string | null): string {
  const retryAfterSec = parseRetryAfter(retryAfter);
  const base = shownMessage(body, RATE_LIMIT_MESSAGE);
  if (retryAfterSec == null) return base;
  return `${base} You can try again in ${formatWait(retryAfterSec)}.`;
}

export type ProfileWriteResult =
  | { type: "saved"; user: PublicProfile | null }
  | { type: "conflict" | "rejected"; field: ProfileField; message: string }
  | { type: "wrong-password"; message: string }
  | { type: "wait"; message: string }
  | { type: "expired" }
  | { type: "failed"; message: string };

/**
 * PUT /users/:id returns the public user and does not reissue the JWT.
 * 401 "Invalid credentials" is a wrong current password. 401 "Unauthorized…"
 * is a dead session. 409 names the conflicting username or email.
 */
export function interpretProfileWrite(
  status: number,
  body: unknown,
  retryAfter: string | null = null
): ProfileWriteResult {
  if (status >= 200 && status < 300) {
    return { type: "saved", user: readPublicUser(body) };
  }
  if (status === 401) {
    const message = messageFromBody(body) ?? "";
    if (/^unauthorized\b/i.test(message)) return { type: "expired" };
    return { type: "wrong-password", message: message || "Invalid credentials" };
  }
  if (status === 409) {
    const message = shownMessage(body, "That change conflicts with another account.");
    return { type: "conflict", field: conflictField(message), message };
  }
  if (status === 400 || status === 422) {
    const message = shownMessage(body, "Check the username, email, and password.");
    const field: ProfileField = /enter your current password/i.test(message)
      ? "currentPassword"
      : conflictField(message);
    return { type: "rejected", field, message };
  }
  if (status === 404) {
    return { type: "rejected", field: "form", message: shownMessage(body, "User not found") };
  }
  if (status === 429) {
    return { type: "wait", message: waitMessage(body, retryAfter) };
  }
  return { type: "failed", message: "Something got in the way. Try again in a moment." };
}

export type PasswordChangeResult =
  | { type: "updated"; token: string; emailVerified: boolean | null }
  | { type: "missing-token" }
  | { type: "wrong-password"; message: string }
  | { type: "rejected"; message: string }
  | { type: "wait"; message: string }
  | { type: "expired" }
  | { type: "failed"; message: string };

/**
 * POST /auth/password/change returns the login body: { access_token, emailVerified }.
 * 401 "Invalid credentials" is the current password. 400 is the new password
 * (policy, or the same as the current one). 401 "Unauthorized…" ends the session.
 */
export function interpretPasswordChange(
  status: number,
  body: unknown,
  retryAfter: string | null = null
): PasswordChangeResult {
  if (status >= 200 && status < 300) {
    const token = readAccessToken(body);
    if (!token) return { type: "missing-token" };
    return { type: "updated", token, emailVerified: readEmailVerifiedFlag(body) };
  }
  if (status === 401) {
    const message = messageFromBody(body) ?? "";
    if (/^unauthorized\b/i.test(message)) return { type: "expired" };
    return { type: "wrong-password", message: message || "Invalid credentials" };
  }
  if (status === 400 || status === 422) {
    return { type: "rejected", message: shownMessage(body, "That password wasn't accepted.") };
  }
  if (status === 429) {
    return { type: "wait", message: waitMessage(body, retryAfter) };
  }
  return { type: "failed", message: "Something got in the way. Try again in a moment." };
}
