"use client";

import { useSyncExternalStore } from "react";
import {
  EMPTY_IDENTITY,
  readIdentitySnapshot,
  subscribeSessionIdentity,
} from "../lib/sessionIdentity";

export {
  clearSessionProfile,
  getUserFromToken,
  publishSessionProfile,
  readSessionClaims,
  type SessionIdentity,
} from "../lib/sessionIdentity";

/** Session claims for render. The server snapshot stays empty so hydration matches. */
export function useSessionIdentity() {
  return useSyncExternalStore(subscribeSessionIdentity, readIdentitySnapshot, () => EMPTY_IDENTITY);
}
