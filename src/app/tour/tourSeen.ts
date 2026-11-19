/**
 * Whether the tour should start, and the local mirror of tourSeenAt.
 *
 * The server field is the source of truth once GET /users includes it:
 * an ISO string has been seen, null has not. While the field is absent
 * (the endpoint is not deployed yet), only a brand-new signup auto-plays.
 * localStorage mirrors a seen timestamp so the welcome does not flash
 * before /users answers. `?tour=1` always starts, seen or not.
 */

export const TOUR_SEEN_KEY = "prysmic_tour_seen";
export const TOUR_SIGNUP_KEY = "prysmic_tour_signup";

export type TourSeenValue = string | null | undefined;

export type TourStartReason =
  | "request"
  | "unseen"
  | "signup"
  | "seen"
  | "existing"
  | "wait";

export type TourStartDecision = {
  start: boolean;
  reason: TourStartReason;
};

export function decideTourStart(input: {
  /** `?tour=1`, or an explicit replay from Settings. */
  requested: boolean;
  /** GET /users has settled for this session. */
  userLoaded: boolean;
  /**
   * `undefined` — the profile has no tourSeenAt field yet.
   * `null` — the field is present and the tour has not been seen.
   * string — an ISO timestamp.
   */
  seenAt: TourSeenValue;
  /** This browser just finished signup for this account. */
  signupFresh: boolean;
  /** A seen timestamp is already mirrored for this account. */
  localSeen: boolean;
}): TourStartDecision {
  if (input.requested) return { start: true, reason: "request" };

  if (!input.userLoaded) {
    if (input.localSeen) return { start: false, reason: "seen" };
    if (input.signupFresh) return { start: true, reason: "signup" };
    return { start: false, reason: "wait" };
  }

  if (typeof input.seenAt === "string" && input.seenAt.trim()) {
    return { start: false, reason: "seen" };
  }

  if (input.seenAt === null) return { start: true, reason: "unseen" };

  // Field missing. Existing accounts must not auto-play.
  if (input.signupFresh && !input.localSeen) return { start: true, reason: "signup" };
  return { start: false, reason: "existing" };
}

/**
 * Read tourSeenAt for the signed-in user from GET /users.
 * A one-item array is the current shape. A bare object is accepted too.
 * Missing field and a missing user are both `undefined` (do not auto-play).
 */
export function readTourSeenAt(body: unknown, userId: number): TourSeenValue {
  const list = Array.isArray(body) ? body : [body];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    if (record.id !== userId) continue;
    if (!Object.prototype.hasOwnProperty.call(record, "tourSeenAt")) return undefined;
    const value = record.tourSeenAt;
    if (typeof value === "string" && value.trim()) return value;
    return null;
  }
  return undefined;
}

type SeenMap = Record<string, string>;

function readMap(storage: Storage): SeenMap {
  try {
    const raw = storage.getItem(TOUR_SEEN_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const map: SeenMap = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string" && value) map[key] = value;
    }
    return map;
  } catch {
    return {};
  }
}

function writeMap(storage: Storage, map: SeenMap): void {
  storage.setItem(TOUR_SEEN_KEY, JSON.stringify(map));
}

export function readLocalSeen(storage: Storage, userId: number | null): boolean {
  if (userId == null) return false;
  return Boolean(readMap(storage)[String(userId)]);
}

export function rememberTourSeen(
  storage: Storage,
  userId: number | null,
  at: string = new Date().toISOString()
): void {
  if (userId == null) return;
  const map = readMap(storage);
  map[String(userId)] = at;
  writeMap(storage, map);
  clearTourSignup(storage, userId);
}

export function forgetLocalSeen(storage: Storage, userId: number | null): void {
  if (userId == null) return;
  const map = readMap(storage);
  if (!(String(userId) in map)) return;
  delete map[String(userId)];
  writeMap(storage, map);
}

export function markTourSignup(storage: Storage, userId: number | null): void {
  if (userId == null) return;
  storage.setItem(TOUR_SIGNUP_KEY, String(userId));
}

export function readSignupFresh(storage: Storage, userId: number | null): boolean {
  if (userId == null) return false;
  try {
    return storage.getItem(TOUR_SIGNUP_KEY) === String(userId);
  } catch {
    return false;
  }
}

export function clearTourSignup(storage: Storage, userId: number | null): void {
  try {
    const current = storage.getItem(TOUR_SIGNUP_KEY);
    if (userId == null || current === String(userId)) storage.removeItem(TOUR_SIGNUP_KEY);
  } catch {
    // Ignore.
  }
}

/** Body for PATCH /users/me/tour. `{seen:true}` sets the timestamp. `{seen:false}` clears it. */
export function tourSeenRequestBody(seen: boolean): { seen: boolean } {
  return { seen };
}
