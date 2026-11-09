import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import nextConfig from "../../../next.config";
import { PRIVATE_PATH_PREFIXES } from "./privatePaths";
import robots from "../robots";
import sitemap from "../sitemap";

test("robots.txt disallows signed-in routes and omits the nonstandard Host line", () => {
  const body = robots();
  assert.equal(body.host, undefined);
  const rules = Array.isArray(body.rules) ? body.rules : [body.rules];
  const disallow = rules.flatMap((rule) => {
    const value = rule.disallow ?? [];
    return Array.isArray(value) ? value : [value];
  });
  for (const path of PRIVATE_PATH_PREFIXES) {
    assert.ok(disallow.includes(path), path);
  }
});

test("draft privacy and terms stay noindex and out of the sitemap", () => {
  const urls = sitemap().map((entry) => entry.url);
  assert.ok(urls.includes("https://www.prysmic.me/"));
  assert.equal(urls.some((url) => url.includes("/privacy") || url.includes("/terms")), false);

  for (const file of ["../(marketing)/privacy/page.tsx", "../(marketing)/terms/page.tsx"]) {
    const page = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.match(page, /index:\s*false/);
  }
});

test("signed-in routes and forgot-password render noindex", async () => {
  for (const path of PRIVATE_PATH_PREFIXES) {
    const layout = readFileSync(new URL(`..${path}/layout.tsx`, import.meta.url), "utf8");
    assert.match(layout, /index:\s*false/);
    assert.match(layout, /follow:\s*false/);
  }
  const forgot = readFileSync(new URL("../forgot-password/layout.tsx", import.meta.url), "utf8");
  assert.match(forgot, /index:\s*false/);

  const headerRules = await nextConfig.headers!();
  const noindexSources = headerRules
    .filter((rule) =>
      rule.headers.some((header) => header.key === "X-Robots-Tag" && header.value.includes("noindex"))
    )
    .map((rule) => rule.source);
  for (const path of [...PRIVATE_PATH_PREFIXES, "/forgot-password", "/verify-email", "/reset-password"]) {
    assert.ok(noindexSources.includes(path), path);
  }
  for (const path of [...PRIVATE_PATH_PREFIXES, "/forgot-password"]) {
    assert.ok(noindexSources.includes(`${path}/:path*`), `${path} descendants`);
  }
});

test("the home page states og image, url, type, site name, and a matching twitter title", () => {
  const page = readFileSync(new URL("../(marketing)/page.tsx", import.meta.url), "utf8");
  assert.match(page, /ogImage/);
  assert.match(page, /url:\s*"\/"/);
  assert.match(page, /type:\s*"website"/);
  assert.match(page, /siteName:\s*SITE_NAME/);
  assert.match(page, /twitter:\s*\{[\s\S]*title:\s*SITE_TITLE/);
  assert.match(page, /openGraph:\s*\{[\s\S]*title:\s*SITE_TITLE/);
});
