/** Signup and password reset share these rules. A common password is the server's to reject. */

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES = 72;

export type PasswordRuleId = "length" | "bytes" | "identity";
export type PasswordRuleState = "idle" | "met" | "unmet";
export type PasswordStrength = "empty" | "weak" | "fair" | "strong";

export interface PasswordIdentity {
  email?: string | null;
  username?: string | null;
}

export const PASSWORD_REQUIREMENTS: { id: PasswordRuleId; label: string }[] = [
  { id: "length", label: "At least 8 characters" },
  { id: "bytes", label: "No more than 72 bytes" },
  { id: "identity", label: "Not your email, the part before @, or your username" },
];

export const PASSWORD_STRENGTH_HINT: Record<Exclude<PasswordStrength, "empty">, string> = {
  weak: "A light password. More length or a mix of characters would make it stronger.",
  fair: "A fair password. A little more length would go further.",
  strong: "A strong password.",
};

export interface PasswordAssessment {
  rules: Record<PasswordRuleId, PasswordRuleState>;
  strength: PasswordStrength;
  /** False until an email or username is available to compare. */
  identityKnown: boolean;
}

export function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function comparable(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function identityKnown(identity: PasswordIdentity = {}): boolean {
  return comparable(identity.email).length > 0 || comparable(identity.username).length > 0;
}

/** Case-insensitive match against the email, its local part, or the username. */
export function passwordMatchesIdentity(password: string, identity: PasswordIdentity = {}): boolean {
  const candidate = comparable(password);
  if (!candidate) return false;
  const email = comparable(identity.email);
  const username = comparable(identity.username);
  const at = email.indexOf("@");
  const local = at > 0 ? email.slice(0, at) : "";
  if (email && candidate === email) return true;
  if (local && candidate === local) return true;
  if (username && candidate === username) return true;
  return false;
}

export function passwordStrength(password: string): PasswordStrength {
  if (!password) return "empty";
  let score = 0;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^\da-zA-Z]/.test(password)) score += 1;
  if (score <= 1) return "weak";
  if (score <= 3) return "fair";
  return "strong";
}

export function assessPassword(password: string, identity: PasswordIdentity = {}): PasswordAssessment {
  const known = identityKnown(identity);
  if (!password) {
    return {
      rules: { length: "idle", bytes: "idle", identity: "idle" },
      strength: "empty",
      identityKnown: known,
    };
  }
  const identityState: PasswordRuleState = !known
    ? "idle"
    : passwordMatchesIdentity(password, identity)
      ? "unmet"
      : "met";
  return {
    rules: {
      length: password.length >= PASSWORD_MIN_LENGTH ? "met" : "unmet",
      bytes: utf8ByteLength(password) <= PASSWORD_MAX_BYTES ? "met" : "unmet",
      identity: identityState,
    },
    strength: passwordStrength(password),
    identityKnown: known,
  };
}

/**
 * Hard rules only. A weak strength hint is not a reason to refuse the submit.
 * Returns every failing rule so one message can name them all.
 */
export function passwordBlockMessage(password: string, identity: PasswordIdentity = {}): string | null {
  const parts: string[] = [];
  if (password.length < PASSWORD_MIN_LENGTH) parts.push("Use at least 8 characters.");
  if (utf8ByteLength(password) > PASSWORD_MAX_BYTES) {
    parts.push("That password is past 72 bytes.");
  }
  if (passwordMatchesIdentity(password, identity)) {
    parts.push("Choose a password that isn't your email or username.");
  }
  return parts.length > 0 ? parts.join(" ") : null;
}
