import assert from "node:assert/strict";
import test from "node:test";
import {
  nextCacheOwner,
  resetPersonalCacheOwnerForTests,
  syncPersonalCache,
} from "./personalCache";

test("the personal cache clears only when the signed-in user changes", () => {
  assert.deepEqual(nextCacheOwner(undefined, 7), { owner: 7, clear: false });
  assert.deepEqual(nextCacheOwner(7, 7), { owner: 7, clear: false });
  assert.deepEqual(nextCacheOwner(7, null), { owner: null, clear: true });
  assert.deepEqual(nextCacheOwner(null, 8), { owner: 8, clear: true });
  assert.deepEqual(nextCacheOwner(8, 8), { owner: 8, clear: false });
});

test("syncPersonalCache clears the client once per account change", () => {
  resetPersonalCacheOwnerForTests();
  const clears: string[] = [];
  const client = { clear: () => clears.push("clear") };
  assert.equal(syncPersonalCache(client, 7), false);
  assert.deepEqual(clears, []);
  assert.equal(syncPersonalCache(client, 7), false);
  assert.equal(syncPersonalCache(client, null), true);
  assert.equal(syncPersonalCache(client, 8), true);
  assert.deepEqual(clears, ["clear", "clear"]);
  resetPersonalCacheOwnerForTests();
});
