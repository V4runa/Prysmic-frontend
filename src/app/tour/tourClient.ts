"use client";

import { apiFetch } from "../hooks/useApi";
import { clearTourSignup, rememberTourSeen, tourSeenRequestBody } from "./tourSeen";

/**
 * Store the tour as seen. The local mirror is written first so a missing
 * endpoint (preview against production, before the backend ships) still
 * keeps this browser from auto-playing again.
 */
export function saveTourSeen(userId: number | null): string | null {
  const at = new Date().toISOString();
  try {
    rememberTourSeen(window.localStorage, userId, at);
    clearTourSignup(window.localStorage, userId);
  } catch {
    // Private mode can reject storage. The request below may still succeed.
  }

  void apiFetch("/users/me/tour", {
    method: "PATCH",
    body: JSON.stringify(tourSeenRequestBody(true)),
  }).catch(() => {
    // 404 while the route is not deployed, or a network miss. The mirror holds.
  });
  return userId == null ? null : at;
}
