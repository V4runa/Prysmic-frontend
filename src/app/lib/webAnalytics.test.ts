import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { prepareAnalyticsEvent } from "./webAnalytics";

test("analytics counts public pages and drops query tokens", () => {
  assert.deepEqual(
    prepareAnalyticsEvent({ type: "pageview", url: "https://www.prysmic.me/?utm=newsletter" }),
    { type: "pageview", url: "https://www.prysmic.me/" }
  );
  assert.deepEqual(
    prepareAnalyticsEvent({
      type: "pageview",
      url: "https://www.prysmic.me/reset-password?token=secret-token#fragment",
    }),
    { type: "pageview", url: "https://www.prysmic.me/reset-password" }
  );
  assert.deepEqual(
    prepareAnalyticsEvent({
      type: "pageview",
      url: "https://www.prysmic.me/verify-email?token=abc&email=person@example.com",
    }),
    { type: "pageview", url: "https://www.prysmic.me/verify-email" }
  );
  assert.deepEqual(
    prepareAnalyticsEvent({ type: "event", url: "https://www.prysmic.me/signup?email=person@example.com" }),
    { type: "event", url: "https://www.prysmic.me/signup" }
  );

  for (const path of ["/", "/login", "/signup", "/forgot-password", "/privacy", "/terms"]) {
    const event = prepareAnalyticsEvent({ type: "pageview", url: `https://www.prysmic.me${path}` });
    assert.equal(event?.url, path === "/" ? "https://www.prysmic.me/" : `https://www.prysmic.me${path}`);
  }
});

test("analytics drops signed-in app routes, including nested ones", () => {
  for (const path of [
    "/notes",
    "/notes/12",
    "/notes/new",
    "/habits",
    "/habits/3",
    "/habits/new",
    "/moods",
    "/tasks",
    "/calendar",
    "/account",
    "/tags",
    "/test",
  ]) {
    assert.equal(
      prepareAnalyticsEvent({ type: "pageview", url: `https://www.prysmic.me${path}?token=secret` }),
      null
    );
  }
});

test("signup records a conversion with no properties, and the root layout mounts analytics", () => {
  const signup = readFileSync(new URL("../signup/page.tsx", import.meta.url), "utf8");
  assert.match(signup, /track\("signup"\)/);
  assert.equal(signup.includes('track("signup",'), false);

  const layout = readFileSync(new URL("../layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /WebAnalytics/);
  const analytics = readFileSync(new URL("../components/WebAnalytics.tsx", import.meta.url), "utf8");
  assert.match(analytics, /<Analytics/);
  assert.match(analytics, /beforeSend=\{prepareAnalyticsEvent\}/);

  const privacy = readFileSync(new URL("../(marketing)/privacy/page.tsx", import.meta.url), "utf8");
  assert.match(privacy, /Vercel Web Analytics/);
  assert.match(
    privacy,
    /the home page, sign-in, sign-up, password reset and email confirmation pages, and the privacy and terms pages/,
  );
  assert.match(privacy, /uses no cookies/);
  assert.match(privacy, /never runs inside the app where you write/);
  assert.equal(privacy.includes("No analytics tool is running"), false);
});
