import { clearSessionProfile } from "./sessionIdentity";
import { syncPersonalCache } from "./personalCache";
import { bumpSessionEpoch } from "./sessionBoundary";
import { apiBaseUrl, pauseSessionRefresh } from "./refreshSession";
import {
  ACCESS_TOKEN_KEY,
  emitSessionChange,
  suppressSessionRestore,
} from "./storedSession";
import {
  clearDraft,
  draftHasWriting,
  noteDraftStorage,
  readDraft,
} from "../notes/noteDraft";

export const LOGOUT_CONFIRM = "Log out? Unsaved writing in this tab will be discarded.";

type QueryClientLike = {
  clear: () => void;
  cancelQueries?: () => Promise<unknown>;
};

/**
 * The header and Settings share this. Unsaved writing in the tab is confirmed
 * before the refresh cookie is revoked and the local session is cleared.
 * The network call can fail; the tab still signs out.
 */
export function requestLogout(input: {
  queryClient: QueryClientLike;
  navigate: (href: string) => void;
  confirm?: (message: string) => boolean;
  logout?: () => Promise<void>;
}): boolean {
  const confirm = input.confirm ?? ((message: string) => window.confirm(message));
  const storage = noteDraftStorage();
  const draft = storage ? readDraft(storage) : null;
  if (draft && draftHasWriting(draft) && !confirm(LOGOUT_CONFIRM)) {
    return false;
  }
  void completeLogout(input);
  return true;
}

export async function completeLogout(input: {
  queryClient: QueryClientLike;
  navigate: (href: string) => void;
  logout?: () => Promise<void>;
}): Promise<void> {
  pauseSessionRefresh(true);
  suppressSessionRestore();
  try {
    if (input.logout) {
      await input.logout();
    } else {
      await fetch(`${apiBaseUrl()}/auth/logout`, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        keepalive: true,
      });
    }
  } catch {
    // The cookie may still be there. This tab will not silently refresh it back.
  }
  bumpSessionEpoch();
  const storage = noteDraftStorage();
  if (storage) clearDraft(storage);
  syncPersonalCache(input.queryClient, null);
  clearSessionProfile();
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch {
    // Ignore.
  }
  emitSessionChange();
  pauseSessionRefresh(false);
  input.navigate("/login");
}
