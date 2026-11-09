/** Same sentence the API returns for forgot-password and resend. */
export const GENERIC_EMAIL_MESSAGE =
  "If an account exists for that email, a message is on its way.";

export const EMAIL_UNAVAILABLE_MESSAGE =
  "Email can't be sent right now. Try again later.";

export const INVALID_LINK_MESSAGE = "This link is invalid or has expired.";

export const RATE_LIMIT_MESSAGE =
  "Too many requests. Wait a little, then try again.";

export const PASSWORD_UPDATED_NOTICE =
  "Your password is updated. Sign in with the new one.";

export const SIGNUP_EMAIL_NOTE =
  "A confirmation email is on its way. You can wander in the meantime.";

export const UNVERIFIED_PROMPT =
  "Your email isn't confirmed yet. A quiet link in your inbox will finish it.";

export function verificationPromptCopy(justSignedUp: boolean): string {
  return justSignedUp ? SIGNUP_EMAIL_NOTE : UNVERIFIED_PROMPT;
}

export function shouldShowVerificationPrompt(input: {
  hasSession: boolean;
  emailVerified: boolean | null;
  dismissed: boolean;
}): boolean {
  return input.hasSession && input.emailVerified === false && !input.dismissed;
}

export function messageFromBody(body: unknown): string | null {
  if (typeof body === "string") {
    const trimmed = body.trim();
    if (!trimmed) return null;
    try {
      return messageFromBody(JSON.parse(trimmed) as unknown);
    } catch {
      return trimmed;
    }
  }
  if (!body || typeof body !== "object") return null;
  const message = (body as { message?: unknown }).message;
  if (typeof message === "string" && message.trim()) return message.trim();
  if (Array.isArray(message)) {
    const parts = message.filter((part) => typeof part === "string" && part.trim());
    return parts.length > 0 ? parts.join(" ") : null;
  }
  return null;
}

export function validateEmail(email: string): string | null {
  if (!email) return "Add the email on your account.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "That doesn't look like an email.";
  }
  return null;
}

export function parseRetryAfter(header: string | null, now = Date.now()): number | null {
  if (!header) return null;
  const trimmed = header.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const when = Date.parse(trimmed);
  if (Number.isNaN(when)) return null;
  return Math.max(0, Math.ceil((when - now) / 1000));
}

export function formatWait(seconds: number): string {
  const whole = Math.max(0, Math.ceil(seconds));
  if (whole < 60) return whole === 1 ? "1 second" : `${whole} seconds`;
  const minutes = Math.ceil(whole / 60);
  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
}

export type EmailRequestOutcome =
  | { type: "accepted"; message: string }
  | { type: "wait"; message: string; retryAfterSec: number | null }
  | { type: "unavailable"; message: string }
  | { type: "invalid"; message: string }
  | { type: "failed"; message: string };

/**
 * A 200 always becomes the generic sentence, even if a body names an address.
 * 429 and 503 use the API's own wording.
 */
export function interpretEmailRequest(input: {
  status: number;
  body: unknown;
  retryAfter: string | null;
  now?: number;
}): EmailRequestOutcome {
  if (input.status >= 200 && input.status < 300) {
    return { type: "accepted", message: GENERIC_EMAIL_MESSAGE };
  }
  if (input.status === 429) {
    const retryAfterSec = parseRetryAfter(input.retryAfter, input.now);
    const wait =
      retryAfterSec == null ? "" : ` You can try again in ${formatWait(retryAfterSec)}.`;
    return {
      type: "wait",
      message: `${RATE_LIMIT_MESSAGE}${wait}`,
      retryAfterSec,
    };
  }
  if (input.status === 503) {
    return { type: "unavailable", message: EMAIL_UNAVAILABLE_MESSAGE };
  }
  if (input.status === 400) {
    return { type: "invalid", message: "That doesn't look like an email." };
  }
  return { type: "failed", message: "Something got in the way. Try again in a moment." };
}

export function interpretVerify(status: number): "success" | "invalid" | "failed" {
  if (status >= 200 && status < 300) return "success";
  if (status === 400) return "invalid";
  return "failed";
}

export type ResetDecision =
  | { ok: true; body: { token: string; password: string } }
  | { ok: false; reason: "invalid-link" | "short" | "mismatch"; message: string };

/** Client-side gate. This does not call the API — submit does, and only when ok. */
export function preparePasswordReset(input: {
  token: string | null;
  password: string;
  confirm: string;
}): ResetDecision {
  if (!input.token) {
    return { ok: false, reason: "invalid-link", message: INVALID_LINK_MESSAGE };
  }
  if (input.password.length < 6) {
    return { ok: false, reason: "short", message: "Use at least 6 characters." };
  }
  if (input.password !== input.confirm) {
    return { ok: false, reason: "mismatch", message: "Those passwords don't match yet." };
  }
  return { ok: true, body: { token: input.token, password: input.password } };
}

export type PasswordResetOutcome =
  | { type: "updated" }
  | { type: "invalid-link" }
  | { type: "rejected"; message: string }
  | { type: "failed"; message: string };

export function interpretPasswordReset(status: number, body: unknown): PasswordResetOutcome {
  if (status >= 200 && status < 300) return { type: "updated" };
  if (status === 400) {
    const message = messageFromBody(body) ?? "";
    if (message.includes("invalid or has expired")) {
      return { type: "invalid-link" };
    }
    if (/password/i.test(message) && /6|short|longer/i.test(message)) {
      return { type: "rejected", message: "Use at least 6 characters." };
    }
    return {
      type: "rejected",
      message: message || "That password wasn't accepted.",
    };
  }
  return { type: "failed", message: "Something got in the way. Try again in a moment." };
}

export function interpretSignupError(status: number, body: unknown): string {
  const message = messageFromBody(body);
  if (message === "Username already taken!") return "That username is already taken.";
  if (message === "Email already in use!") return "That email is already in use.";
  if (status === 400) return "Check the username, email, and a password of at least 6 characters.";
  return "Signup couldn't finish. Please try again.";
}
