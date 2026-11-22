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
export const TOUR_REPLAY_KEY = "prysmic_tour_replay";

/** Settings and Updates set this before navigating to `?tour=1`. */
export function armTourReplay(): void {
  try {
    sessionStorage.setItem(TOUR_REPLAY_KEY, "1");
  } catch {
    // Private mode can reject storage. The query string may still open it.
  }
}

/** Read and clear a replay the user just asked for. */
export function takeTourReplay(): boolean {
  try {
    if (sessionStorage.getItem(TOUR_REPLAY_KEY) !== "1") return false;
    sessionStorage.removeItem(TOUR_REPLAY_KEY);
    return true;
  } catch {
    return false;
  }
}

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

  // A Done or Skip writes this mirror before the server answers. A reload
  // or a hard navigation in that window must not start the walk again.
  if (input.localSeen) return { start: false, reason: "seen" };

  if (!input.userLoaded) {
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

/** ISO timestamp mirrored for this account, if one is stored. */
export function readLocalSeenAt(storage: Storage, userId: number | null): string | null {
  if (userId == null) return null;
  return readMap(storage)[String(userId)] ?? null;
}

/**
 * True when this browser marked the tour seen moments ago.
 * A GET /users that still says "unseen" must not wipe that and restart the walk.
 */
export function localSeenRecently(
  storage: Storage,
  userId: number | null,
  withinMs = 30000
): boolean {
  const at = readLocalSeenAt(storage, userId);
  if (!at) return false;
  const time = Date.parse(at);
  if (Number.isNaN(time)) return false;
  return Date.now() - time >= 0 && Date.now() - time < withinMs;
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

/**
 * A direct load of `?tour=1` must open once. The same serial must not open
 * again when the walk ends, even if the query string is still there.
 * A later visit (Settings, Updates) is a new serial and may open.
 */
export function takeTourRequest(input: {
  serial: number;
  handled: number;
  /** idle and done can open. Anything else is a walk already on screen. */
  phase: "idle" | "done" | "active";
}): { start: boolean; handled: number } {
  if (input.serial <= input.handled) return { start: false, handled: input.handled };
  // A param that appears during a walk must not open again when the walk ends.
  if (input.phase === "active") return { start: false, handled: input.serial };
  return { start: true, handled: input.serial };
}

/** Body for PATCH /users/me/tour. `{seen:true}` sets the timestamp. `{seen:false}` clears it. */
export function tourSeenRequestBody(seen: boolean): { seen: boolean } {
  return { seen };
}

export type ChromeQuietMemory = {
  /** Route the tour landed on when it ended this session. */
  landingPath: string | null;
  /** The person already left that landing, so chrome may return. */
  released: boolean;
};

export const QUIET_CHROME_MEMORY: ChromeQuietMemory = {
  landingPath: null,
  released: false,
};

/**
 * Remember the post-tour landing until the route changes.
 * A later navigation does not capture a new landing while the phase stays done.
 */
export function nextChromeQuiet(
  memory: ChromeQuietMemory,
  phase: "idle" | "active" | "done",
  pathname: string
): ChromeQuietMemory {
  if (phase !== "done") return QUIET_CHROME_MEMORY;
  if (!memory.released && memory.landingPath === null) {
    return { landingPath: pathname, released: false };
  }
  if (memory.landingPath && pathname !== memory.landingPath) {
    return { landingPath: null, released: true };
  }
  return memory;
}

/**
 * Email confirmation and Updates highlight cards stay out:
 * before a fresh account's tour starts, throughout the tour, and on the
 * landing screen until the route changes. A reload starts idle again and
 * is not this landing.
 */
export function tourQuietsChrome(input: {
  seenAt: TourSeenValue;
  userLoaded: boolean;
  /** idle before and after, done once the walk has finished, otherwise active. */
  phase: "idle" | "active" | "done";
  pathname: string;
  landing: ChromeQuietMemory;
}): boolean {
  if (input.phase === "active") return true;
  // Once the walk is done the confirmation banner may enter. The prompt
  // itself eases its height in, after the card has faded.
  if (input.phase === "done") return false;
  if (!input.userLoaded && input.phase === "idle") return true;
  if (input.seenAt === null) return true;
  return false;
}
