"use client";

import { apiFetch } from "../hooks/useApi";
import { clearTourSignup, rememberTourSeen, tourSeenRequestBody } from "./tourSeen";

/**
 * Store the tour as seen. The local mirror is written first so a missing
 * endpoint (preview against production, before the backend ships) still
 * keeps this browser from auto-playing again.
 */
export async function saveTourSeen(userId: number | null): Promise<void> {
  try {
    rememberTourSeen(window.localStorage, userId);
    clearTourSignup(window.localStorage, userId);
  } catch {
    // Private mode can reject storage. The request below may still succeed.
  }

  try {
    await apiFetch("/users/me/tour", {
      method: "PATCH",
      body: JSON.stringify(tourSeenRequestBody(true)),
    });
  } catch {
    // 404 while the route is not deployed, or a network miss. The mirror holds.
  }
}
