"use client";

import { useSyncExternalStore } from "react";
import { jwtDecode } from "jwt-decode";

interface JwtPayload {
  sub: number;
  username: string;
  email: string;
  iat: number;
  exp: number;
}

export function getUserFromToken(): { userId: number } | null {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const decoded = jwtDecode<JwtPayload>(token);
    return { userId: decoded.sub };
  } catch (err) {
    console.error("Failed to decode token", err);
    return null;
  }
}

export function readSessionClaims(): {
  userId: number;
  username: string | null;
  email: string | null;
} | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("token");
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

export interface SessionIdentity {
  email: string | null;
  username: string | null;
}

const EMPTY_IDENTITY: SessionIdentity = { email: null, username: null };

let identitySnapshot: SessionIdentity = EMPTY_IDENTITY;

function readIdentitySnapshot(): SessionIdentity {
  const claims = readSessionClaims();
  const email = claims?.email ?? null;
  const username = claims?.username ?? null;
  if (identitySnapshot.email === email && identitySnapshot.username === username) {
    return identitySnapshot;
  }
  identitySnapshot = { email, username };
  return identitySnapshot;
}

/** Session claims for render. The server snapshot stays empty so hydration matches. */
export function useSessionIdentity(): SessionIdentity {
  return useSyncExternalStore(
    () => () => {},
    readIdentitySnapshot,
    () => EMPTY_IDENTITY
  );
}
