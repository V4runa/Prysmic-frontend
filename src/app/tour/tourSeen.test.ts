import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  TOUR_SEEN_KEY,
  TOUR_SIGNUP_KEY,
  QUIET_CHROME_MEMORY,
  clearTourSignup,
  decideTourStart,
  nextChromeQuiet,
  takeTourRequest,
  forgetLocalSeen,
  markTourSignup,
  readLocalSeen,
  readSignupFresh,
  readTourSeenAt,
  rememberTourSeen,
  tourQuietsChrome,
  tourSeenRequestBody,
} from "./tourSeen";

function memory(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
    removeItem(key: string) {
      map.delete(key);
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
  };
}

test("a requested tour starts even when the account has already seen it", () => {
  assert.deepEqual(
    decideTourStart({
      requested: true,
      userLoaded: false,
      seenAt: undefined,
      signupFresh: false,
      localSeen: true,
    }),
    { start: true, reason: "request" }
  );
  assert.deepEqual(
    decideTourStart({
      requested: true,
      userLoaded: true,
      seenAt: "2026-11-19T17:43:00.000Z",
      signupFresh: false,
      localSeen: true,
    }),
    { start: true, reason: "request" }
  );
});

test("an explicit null plays, and any timestamp never auto-plays", () => {
  assert.deepEqual(
    decideTourStart({
      requested: false,
      userLoaded: true,
      seenAt: null,
      signupFresh: false,
      localSeen: true,
    }),
    { start: false, reason: "seen" }
  );
  assert.deepEqual(
    decideTourStart({
      requested: false,
      userLoaded: true,
      seenAt: null,
      signupFresh: false,
      localSeen: false,
    }),
    { start: true, reason: "unseen" }
  );
  assert.deepEqual(
    decideTourStart({
      requested: false,
      userLoaded: true,
      seenAt: "2026-11-19T17:43:00.000Z",
      signupFresh: true,
      localSeen: false,
    }),
    { start: false, reason: "seen" }
  );
});

test("a missing field plays only for a brand-new signup", () => {
  assert.deepEqual(
    decideTourStart({
      requested: false,
      userLoaded: true,
      seenAt: undefined,
      signupFresh: true,
      localSeen: false,
    }),
    { start: true, reason: "signup" }
  );
  assert.deepEqual(
    decideTourStart({
      requested: false,
      userLoaded: true,
      seenAt: undefined,
      signupFresh: false,
      localSeen: false,
    }),
    { start: false, reason: "existing" }
  );
  assert.deepEqual(
    decideTourStart({
      requested: false,
      userLoaded: true,
      seenAt: undefined,
      signupFresh: true,
      localSeen: true,
    }),
    { start: false, reason: "seen" }
  );
});

test("before /users answers, a local seen mirror stays quiet and a fresh signup may start", () => {
  assert.deepEqual(
    decideTourStart({
      requested: false,
      userLoaded: false,
      seenAt: undefined,
      signupFresh: false,
      localSeen: true,
    }),
    { start: false, reason: "seen" }
  );
  assert.deepEqual(
    decideTourStart({
      requested: false,
      userLoaded: false,
      seenAt: undefined,
      signupFresh: true,
      localSeen: false,
    }),
    { start: true, reason: "signup" }
  );
  assert.deepEqual(
    decideTourStart({
      requested: false,
      userLoaded: false,
      seenAt: undefined,
      signupFresh: false,
      localSeen: false,
    }),
    { start: false, reason: "wait" }
  );
});

test("tourSeenAt is read from the one-item profile and ignores other users", () => {
  const body = [
    { id: 4, username: "Bea", email: "bea@prysmic.test", tourSeenAt: "2026-11-01T00:00:00.000Z" },
    { id: 7, username: "Ada", email: "ada@prysmic.test", tourSeenAt: null },
  ];
  assert.equal(readTourSeenAt(body, 7), null);
  assert.equal(readTourSeenAt(body, 4), "2026-11-01T00:00:00.000Z");
  assert.equal(readTourSeenAt([{ id: 7, username: "Ada", email: "ada@prysmic.test" }], 7), undefined);
  assert.equal(readTourSeenAt({ id: 7, tourSeenAt: "2026-11-19T00:00:00.000Z" }, 7), "2026-11-19T00:00:00.000Z");
  assert.equal(readTourSeenAt([{ id: 7, tourSeenAt: "  " }], 7), null);
  assert.equal(readTourSeenAt([], 7), undefined);
  assert.equal(readTourSeenAt(null, 7), undefined);
});

test("the local mirror is per account and the signup flag clears when the tour is seen", () => {
  const storage = memory();
  markTourSignup(storage, 7);
  assert.equal(readSignupFresh(storage, 7), true);
  assert.equal(readSignupFresh(storage, 8), false);
  assert.equal(readLocalSeen(storage, 7), false);

  rememberTourSeen(storage, 7, "2026-11-19T17:43:00.000Z");
  assert.equal(readLocalSeen(storage, 7), true);
  assert.equal(readSignupFresh(storage, 7), false);
  const saved = JSON.parse(storage.getItem(TOUR_SEEN_KEY) ?? "{}") as Record<string, string>;
  assert.equal(saved["7"], "2026-11-19T17:43:00.000Z");

  markTourSignup(storage, 8);
  forgetLocalSeen(storage, 7);
  assert.equal(readLocalSeen(storage, 7), false);
  assert.equal(readSignupFresh(storage, 8), true);
  clearTourSignup(storage, 7);
  assert.equal(storage.getItem(TOUR_SIGNUP_KEY), "8");
  clearTourSignup(storage, 8);
  assert.equal(storage.getItem(TOUR_SIGNUP_KEY), null);
});

test("a direct tour link opens once and does not restart when the walk ends", () => {
  const first = takeTourRequest({ serial: 1, handled: 0, phase: "idle" });
  assert.deepEqual(first, { start: true, handled: 1 });
  const stillThere = takeTourRequest({ serial: 1, handled: first.handled, phase: "done" });
  assert.deepEqual(stillThere, { start: false, handled: 1 });
  const whileWalking = takeTourRequest({ serial: 2, handled: 1, phase: "active" });
  assert.deepEqual(whileWalking, { start: false, handled: 2 });
  const after = takeTourRequest({ serial: 2, handled: whileWalking.handled, phase: "done" });
  assert.deepEqual(after, { start: false, handled: 2 });
  const later = takeTourRequest({ serial: 3, handled: 2, phase: "done" });
  assert.deepEqual(later, { start: true, handled: 3 });
});

test("fresh-account chrome stays quiet until the tour ends and the route changes", () => {
  const fresh = {
    seenAt: null,
    userLoaded: true,
    phase: "idle" as const,
    pathname: "/notes",
    landing: QUIET_CHROME_MEMORY,
  };
  assert.equal(tourQuietsChrome(fresh), true);
  assert.equal(tourQuietsChrome({ ...fresh, phase: "active", pathname: "/moods" }), true);
  assert.equal(tourQuietsChrome({ ...fresh, userLoaded: false, seenAt: undefined }), true);

  const landed = nextChromeQuiet(QUIET_CHROME_MEMORY, "done", "/moods");
  assert.equal(landed.landingPath, "/moods");
  assert.equal(
    tourQuietsChrome({ ...fresh, phase: "done", pathname: "/moods", landing: landed }),
    false
  );
  const left = nextChromeQuiet(landed, "done", "/notes");
  assert.equal(left.released, true);
  assert.equal(left.landingPath, null);
  assert.equal(
    tourQuietsChrome({ ...fresh, phase: "done", pathname: "/notes", landing: left, seenAt: null }),
    false
  );
  assert.equal(nextChromeQuiet(left, "done", "/calendar").landingPath, null);

  const seen = tourQuietsChrome({
    seenAt: "2026-11-19T00:00:00.000Z",
    userLoaded: true,
    phase: "idle",
    pathname: "/moods",
    landing: QUIET_CHROME_MEMORY,
  });
  assert.equal(seen, false);
});

test("PATCH /users/me/tour is sent as {seen:true} and a failure still mirrors locally", () => {
  assert.deepEqual(tourSeenRequestBody(true), { seen: true });
  assert.deepEqual(tourSeenRequestBody(false), { seen: false });
  const source = readFileSync(new URL("./tourClient.ts", import.meta.url), "utf8");
  assert.match(source, /\/users\/me\/tour/);
  assert.match(source, /method:\s*"PATCH"/);
  assert.match(source, /tourSeenRequestBody\(true\)/);
  assert.match(source, /rememberTourSeen/);
});
