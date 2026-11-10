import type { ProductUpdate } from "../../content/updates";

/** Per-browser record of the last changelog entry this person viewed. */
export const UPDATES_SEEN_KEY = "prysmic_updates_seen";

export const UPDATES_SEEN_EVENT = "prysmic-updates-seen";

export type UpdatesSeenState = {
  v: 1;
  /** Id of the newest entry viewed in Updates. Null when the list was empty. */
  lastSeenId: string | null;
  /** Date of that entry, used if the id is later removed from the list. */
  lastSeenDate: string | null;
  /** Highlight cards dismissed without opening Updates. Shown once per id. */
  dismissedHighlightIds: string[];
};

/**
 * A first visit is caught up through the entry just before the newest
 * highlight, so that release can still announce itself. Older history does
 * not light the dot. With no highlight, the visit is caught up through now.
 */
export function baselineState(entries: readonly ProductUpdate[]): UpdatesSeenState {
  const highlightIndex = entries.findIndex((entry) => entry.highlight);
  const anchor =
    highlightIndex === -1 ? (entries[0] ?? null) : (entries[highlightIndex + 1] ?? null);
  return {
    v: 1,
    lastSeenId: anchor?.id ?? null,
    lastSeenDate: anchor?.date ?? null,
    dismissedHighlightIds: entries
      .filter((entry, index) => entry.highlight === true && index !== highlightIndex)
      .map((entry) => entry.id),
  };
}

export function parseUpdatesSeen(raw: string | null): UpdatesSeenState | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== "object") return null;
    const record = value as Record<string, unknown>;
    if (record.v !== 1) return null;
    if (record.lastSeenId !== null && typeof record.lastSeenId !== "string") return null;
    if (record.lastSeenDate !== null && typeof record.lastSeenDate !== "string") return null;
    if (!Array.isArray(record.dismissedHighlightIds)) return null;
    if (!record.dismissedHighlightIds.every((id) => typeof id === "string")) return null;
    return {
      v: 1,
      lastSeenId: record.lastSeenId,
      lastSeenDate: record.lastSeenDate,
      dismissedHighlightIds: record.dismissedHighlightIds,
    };
  } catch {
    return null;
  }
}

/** Writes a baseline when this browser has no valid record. Returns true if it wrote. */
export function ensureUpdatesBaseline(
  storage: Storage,
  entries: readonly ProductUpdate[]
): boolean {
  if (parseUpdatesSeen(storage.getItem(UPDATES_SEEN_KEY))) return false;
  storage.setItem(UPDATES_SEEN_KEY, JSON.stringify(baselineState(entries)));
  return true;
}

function readOrBaseline(storage: Storage, entries: readonly ProductUpdate[]): UpdatesSeenState {
  return parseUpdatesSeen(storage.getItem(UPDATES_SEEN_KEY)) ?? baselineState(entries);
}

/**
 * Entries are newest first. An entry is unread when it sits above the last
 * one this browser viewed. A missing id falls back to the stored date.
 */
export function isEntryUnread(
  entry: ProductUpdate,
  entries: readonly ProductUpdate[],
  state: UpdatesSeenState
): boolean {
  if (state.lastSeenId) {
    const seenIndex = entries.findIndex((item) => item.id === state.lastSeenId);
    const entryIndex = entries.findIndex((item) => item.id === entry.id);
    if (seenIndex !== -1 && entryIndex !== -1) return entryIndex < seenIndex;
  }
  if (state.lastSeenDate) return entry.date > state.lastSeenDate;
  return true;
}

export function hasUnread(entries: readonly ProductUpdate[], state: UpdatesSeenState): boolean {
  return entries.some((entry) => isEntryUnread(entry, entries, state));
}

/** Newest highlighted entry this browser has not viewed and has not dismissed. */
export function pendingHighlight(
  entries: readonly ProductUpdate[],
  state: UpdatesSeenState
): ProductUpdate | null {
  for (const entry of entries) {
    if (!entry.highlight) continue;
    if (state.dismissedHighlightIds.includes(entry.id)) continue;
    if (!isEntryUnread(entry, entries, state)) continue;
    return entry;
  }
  return null;
}

export function markUpdatesViewed(
  storage: Storage,
  entries: readonly ProductUpdate[]
): UpdatesSeenState {
  const current = readOrBaseline(storage, entries);
  const newest = entries[0] ?? null;
  const next: UpdatesSeenState = {
    v: 1,
    lastSeenId: newest?.id ?? null,
    lastSeenDate: newest?.date ?? null,
    dismissedHighlightIds: current.dismissedHighlightIds,
  };
  storage.setItem(UPDATES_SEEN_KEY, JSON.stringify(next));
  return next;
}

export function dismissUpdateHighlight(
  storage: Storage,
  entries: readonly ProductUpdate[],
  id: string
): UpdatesSeenState {
  const current = readOrBaseline(storage, entries);
  if (current.dismissedHighlightIds.includes(id)) return current;
  const next: UpdatesSeenState = {
    ...current,
    dismissedHighlightIds: [...current.dismissedHighlightIds, id],
  };
  storage.setItem(UPDATES_SEEN_KEY, JSON.stringify(next));
  return next;
}
