import {
  ACCOUNT_DELETED_NOTICE,
  RATE_LIMIT_MESSAGE,
  formatWait,
  messageFromBody,
  parseRetryAfter,
} from "./authMessages";
import { clearDraft, noteDraftStorage, type DraftStorage } from "../notes/noteDraft";
import {
  clearStoredSession,
  clearUserAuthMemory,
  readStoredUserId,
  setLoginNotice,
} from "./storedSession";

export const DELETE_CONFIRM_TEXT = "DELETE";

export type DeleteAccountOutcome =
  | { type: "deleted" }
  | { type: "rejected"; message: string }
  | { type: "wait"; message: string }
  | { type: "failed"; message: string };

type QueryClientLike = {
  clear: () => void;
  cancelQueries?: () => Promise<unknown>;
};

/** Both gates the dialog asks for. DELETE must be exact, aside from surrounding space. */
export function deleteConfirmationReady(confirmation: string, password: string): boolean {
  return confirmation.trim() === DELETE_CONFIRM_TEXT && password.length > 0;
}

/**
 * 204 deletes the account. 401 is a wrong password and must stay on this screen.
 * 429 is a wait, not a failure of the password.
 */
export function interpretDeleteAccount(
  status: number,
  body: unknown,
  retryAfter: string | null
): DeleteAccountOutcome {
  if (status === 204 || (status >= 200 && status < 300)) return { type: "deleted" };
  if (status === 401) {
    const message = messageFromBody(body);
    if (message && !/^unauthorized$/i.test(message)) {
      return { type: "rejected", message };
    }
    return { type: "rejected", message: "That password doesn't match." };
  }
  if (status === 429) {
    const retryAfterSec = parseRetryAfter(retryAfter);
    const wait =
      retryAfterSec == null ? "" : ` You can try again in ${formatWait(retryAfterSec)}.`;
    return { type: "wait", message: `${RATE_LIMIT_MESSAGE}${wait}` };
  }
  const fallback =
    status === 400
      ? "The account is still here."
      : "The account is still here. Try again in a moment.";
  const message = messageFromBody(body);
  if (message && message.length <= 240) return { type: "failed", message };
  return { type: "failed", message: fallback };
}

export function deletionFailureMessage(err: {
  status?: number;
  body?: unknown;
  retryAfter?: string | null;
  network?: boolean;
}): string {
  if (err.network) return "Could not reach the server. The account is still here.";
  if (err.status == null) return "The account is still here. Try again in a moment.";
  const outcome = interpretDeleteAccount(err.status, err.body, err.retryAfter ?? null);
  if (outcome.type === "deleted") return "";
  return outcome.message;
}

/**
 * The account is gone, so this tab must not offer the writing back, and this
 * user's email reminder must not linger. Other people on this browser keep
 * their own reminder snooze. The sign-in screen reads the notice.
 */
export function clearDeletedAccount(input: {
  queryClient?: QueryClientLike;
  draftStorage?: DraftStorage | null;
} = {}): void {
  const userId = readStoredUserId();
  clearUserAuthMemory(userId);
  clearStoredSession(input.queryClient);
  const storage = input.draftStorage === undefined ? noteDraftStorage() : input.draftStorage;
  if (storage) clearDraft(storage);
  setLoginNotice(ACCOUNT_DELETED_NOTICE);
}
