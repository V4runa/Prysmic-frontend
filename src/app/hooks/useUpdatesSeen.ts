"use client";

import { useEffect, useSyncExternalStore } from "react";
import { publishedUpdates, type ProductUpdate } from "../../content/updates";
import {
  UPDATES_SEEN_EVENT,
  UPDATES_SEEN_KEY,
  dismissUpdateHighlight,
  ensureUpdatesBaseline,
  hasUnread,
  markUpdatesViewed,
  parseUpdatesSeen,
  pendingHighlight,
  baselineState,
} from "../lib/updatesSeen";

type UpdatesSnapshot = {
  unread: boolean;
  highlightId: string | null;
};

const HIDDEN: UpdatesSnapshot = { unread: false, highlightId: null };
let current: UpdatesSnapshot = HIDDEN;

function readSnapshot(): UpdatesSnapshot {
  const entries = publishedUpdates();
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(UPDATES_SEEN_KEY);
  } catch {
    raw = null;
  }
  const resolved = (raw ? parseUpdatesSeen(raw) : null) ?? baselineState(entries);
  const highlight = pendingHighlight(entries, resolved);
  const next: UpdatesSnapshot = {
    unread: hasUnread(entries, resolved),
    highlightId: highlight?.id ?? null,
  };
  if (current.unread === next.unread && current.highlightId === next.highlightId) return current;
  current = next;
  return current;
}

function subscribe(listener: () => void): () => void {
  window.addEventListener(UPDATES_SEEN_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(UPDATES_SEEN_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

function notify(): void {
  window.dispatchEvent(new Event(UPDATES_SEEN_EVENT));
}

export function viewProductUpdates(): void {
  try {
    markUpdatesViewed(localStorage, publishedUpdates());
  } catch {
    // Storage can be blocked. Opening Updates still shows the list.
  }
  notify();
}

export function dismissProductHighlight(id: string): void {
  try {
    dismissUpdateHighlight(localStorage, publishedUpdates(), id);
  } catch {
    // Without storage the card can return next visit. Nothing else to do.
  }
  notify();
}

export function useUpdatesSeen(): { unread: boolean; highlight: ProductUpdate | null } {
  const snapshot = useSyncExternalStore(subscribe, readSnapshot, () => HIDDEN);

  useEffect(() => {
    try {
      if (ensureUpdatesBaseline(localStorage, publishedUpdates())) notify();
    } catch {
      // A blocked store already reads as caught up, so history stays quiet.
    }
  }, []);

  const highlight = snapshot.highlightId
    ? (publishedUpdates().find((entry) => entry.id === snapshot.highlightId) ?? null)
    : null;

  return { unread: snapshot.unread, highlight };
}
