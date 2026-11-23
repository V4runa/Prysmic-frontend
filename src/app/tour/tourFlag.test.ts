import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { tourEnabledFromEnv } from "./tourFlag";

test("local and preview builds keep the tour on", () => {
  assert.equal(tourEnabledFromEnv({}), true);
  assert.equal(tourEnabledFromEnv({ vercelEnv: undefined }), true);
  assert.equal(tourEnabledFromEnv({ vercelEnv: "" }), true);
  assert.equal(tourEnabledFromEnv({ vercelEnv: "preview" }), true);
  assert.equal(tourEnabledFromEnv({ vercelEnv: "development" }), true);
  assert.equal(tourEnabledFromEnv({ vercelEnv: "preview", tourFlag: "false" }), true);
});

test("production stays off unless the tour flag is exactly true", () => {
  assert.equal(tourEnabledFromEnv({ vercelEnv: "production" }), false);
  assert.equal(tourEnabledFromEnv({ vercelEnv: "production", tourFlag: "false" }), false);
  assert.equal(tourEnabledFromEnv({ vercelEnv: "production", tourFlag: "1" }), false);
  assert.equal(tourEnabledFromEnv({ vercelEnv: "production", tourFlag: "true" }), true);
});

test("the production env is inlined so a client bundle can read it", () => {
  const config = readFileSync(new URL("../../../next.config.ts", import.meta.url), "utf8");
  assert.match(config, /NEXT_PUBLIC_VERCEL_ENV/);
  assert.match(config, /VERCEL_ENV/);
  const flag = readFileSync(new URL("./tourFlag.ts", import.meta.url), "utf8");
  assert.match(flag, /NEXT_PUBLIC_VERCEL_ENV/);
  assert.match(flag, /NEXT_PUBLIC_TOUR_ENABLED/);
  assert.match(flag, /!== "production"/);
  assert.match(flag, /=== "true"/);
});
