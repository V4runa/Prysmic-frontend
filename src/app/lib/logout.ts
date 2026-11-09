import type { QueryClient } from "@tanstack/react-query";
import { clearSessionProfile } from "./sessionIdentity";
import { syncPersonalCache } from "./personalCache";
import { bumpSessionEpoch } from "./sessionBoundary";
import { ACCESS_TOKEN_KEY, emitSessionChange } from "./storedSession";
import {
  clearDraft,
  draftHasWriting,
  noteDraftStorage,
  readDraft,
} from "../notes/noteDraft";

export const LOGOUT_CONFIRM = "Log out? Unsaved writing in this tab will be discarded.";

/**
 * The header and Settings share this. Unsaved writing in the tab is confirmed
 * before the token, the draft, and the query cache are cleared.
 */
export function requestLogout(input: {
  queryClient: QueryClient;
  navigate: (href: string) => void;
  confirm?: (message: string) => boolean;
}): boolean {
  const confirm = input.confirm ?? ((message: string) => window.confirm(message));
  const storage = noteDraftStorage();
  const draft = storage ? readDraft(storage) : null;
  if (draft && draftHasWriting(draft) && !confirm(LOGOUT_CONFIRM)) {
    return false;
  }
  bumpSessionEpoch();
  if (storage) clearDraft(storage);
  syncPersonalCache(input.queryClient, null);
  clearSessionProfile();
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch {
    // Ignore.
  }
  emitSessionChange();
  input.navigate("/login");
  return true;
}
