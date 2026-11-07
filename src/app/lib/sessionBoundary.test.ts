import assert from "node:assert/strict";
import test from "node:test";
import {
  accountChangeBumpsEpoch,
  bumpSessionEpoch,
  clientEffectsForSave,
  currentSessionEpoch,
  resetSessionEpochForTests,
  saveAudience,
} from "./sessionBoundary";

test("logout abandons client side effects; expiry only keeps the draft", () => {
  resetSessionEpochForTests();
  const started = currentSessionEpoch();
  assert.deepEqual(clientEffectsForSave(saveAudience(started, 7, 7)), {
    writeDraft: true,
    navigate: true,
    touchCache: true,
    upload: true,
  });
  assert.equal(saveAudience(started, 7, null), "recoverable");
  assert.deepEqual(clientEffectsForSave("recoverable"), {
    writeDraft: true,
    navigate: false,
    touchCache: false,
    upload: false,
  });

  bumpSessionEpoch();
  assert.equal(saveAudience(started, 7, null), "abandoned");
  assert.deepEqual(clientEffectsForSave("abandoned"), {
    writeDraft: false,
    navigate: false,
    touchCache: false,
    upload: false,
  });
  assert.equal(saveAudience(currentSessionEpoch(), 7, 8), "abandoned");
  assert.equal(accountChangeBumpsEpoch(undefined, 7), false);
  assert.equal(accountChangeBumpsEpoch(null, 7), false);
  assert.equal(accountChangeBumpsEpoch(7, null), true);
  assert.equal(accountChangeBumpsEpoch(7, 8), true);
  resetSessionEpochForTests();
});
