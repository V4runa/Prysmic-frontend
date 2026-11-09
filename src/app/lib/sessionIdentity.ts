import { jwtDecode } from "jwt-decode";
import { emitSessionChange, readRememberedEmailVerified } from "./storedSession";

interface JwtPayload {
  sub: number;
  username?: string;
  email?: string;
  iat?: number;
  exp?: number;
}

export interface SessionIdentity {
  email: string | null;
  username: string | null;
  userId: number | null;
  emailVerified: boolean | null;
}

export const EMPTY_IDENTITY: SessionIdentity = {
  email: null,
  username: null,
  userId: null,
  emailVerified: null,
};

export interface SessionProfile {
  userId: number;
  username: string;
  email: string;
  emailVerified: boolean | null;
}

let overlay: SessionProfile | null = null;
let identitySnapshot: SessionIdentity = EMPTY_IDENTITY;

export function getUserFromToken(): { userId: number } | null {
  const claims = readSessionClaims();
  return claims ? { userId: claims.userId } : null;
}

export function readSessionClaims(): {
  userId: number;
  username: string | null;
  email: string | null;
} | null {
  if (typeof window === "undefined") return null;
  let token: string | null = null;
  try {
    token = localStorage.getItem("token");
  } catch {
    return null;
  }
  if (!token) return null;
  try {
    const decoded = jwtDecode<JwtPayload>(token);
    if (typeof decoded.sub !== "number") return null;
    return {
      userId: decoded.sub,
      username: decoded.username ?? null,
      email: decoded.email ?? null,
    };
  } catch {
    return null;
  }
}

export function readIdentitySnapshot(): SessionIdentity {
  const claims = readSessionClaims();
  const profile = overlay && claims && overlay.userId === claims.userId ? overlay : null;
  const email = profile?.email ?? claims?.email ?? null;
  const username = profile?.username ?? claims?.username ?? null;
  const userId = claims?.userId ?? null;
  const emailVerified = profile?.emailVerified ?? (claims ? readRememberedEmailVerified() : null);
  if (
    identitySnapshot.email === email &&
    identitySnapshot.username === username &&
    identitySnapshot.userId === userId &&
    identitySnapshot.emailVerified === emailVerified
  ) {
    return identitySnapshot;
  }
  identitySnapshot = { email, username, userId, emailVerified };
  return identitySnapshot;
}

/** A profile response wins over a token that still carries the previous name or email. */
export function publishSessionProfile(profile: SessionProfile): void {
  overlay = profile;
  identitySnapshot = EMPTY_IDENTITY;
  emitSessionChange();
}

export function clearSessionProfile(): void {
  overlay = null;
  identitySnapshot = EMPTY_IDENTITY;
  emitSessionChange();
}

export function subscribeSessionIdentity(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onSession = () => listener();
  window.addEventListener("prysmic-session", onSession);
  return () => window.removeEventListener("prysmic-session", onSession);
}
