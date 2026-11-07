/**
 * Intentional logout and account switch advance this counter. An in-flight
 * save captured the old value and must not touch the draft, cache, or router
 * afterwards. Session expiry does not advance it: the same person can still
 * recover the draft after they sign in again.
 *
 * A request already sent is not aborted. The server may have committed it.
 */
let epoch = 0;

export function currentSessionEpoch(): number {
  return epoch;
}

export function bumpSessionEpoch(): number {
  epoch += 1;
  return epoch;
}

export function resetSessionEpochForTests(): void {
  epoch = 0;
}

export type SaveAudience = "same" | "recoverable" | "abandoned";

export function saveAudience(
  startedEpoch: number,
  startedOwner: number | null,
  tokenOwner: number | null
): SaveAudience {
  if (startedEpoch !== epoch) return "abandoned";
  if (startedOwner != null && tokenOwner != null && tokenOwner !== startedOwner) {
    return "abandoned";
  }
  if (tokenOwner == null) return "recoverable";
  return "same";
}

/** Login after expiry (null → user) must not discard an in-flight recovery. */
export function accountChangeBumpsEpoch(
  previous: number | null | undefined,
  next: number | null
): boolean {
  if (previous == null) return false;
  return previous !== next;
}

export function clientEffectsForSave(audience: SaveAudience): {
  writeDraft: boolean;
  navigate: boolean;
  touchCache: boolean;
  upload: boolean;
} {
  if (audience === "abandoned") {
    return { writeDraft: false, navigate: false, touchCache: false, upload: false };
  }
  if (audience === "recoverable") {
    return { writeDraft: true, navigate: false, touchCache: false, upload: false };
  }
  return { writeDraft: true, navigate: true, touchCache: true, upload: true };
}
