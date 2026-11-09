import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  readSentryDsn,
  readSentryEnvironment,
  scrubBreadcrumb,
  scrubSentryEvent,
  SENTRY_TRACES_SAMPLE_RATE,
} from "./sentryScrub";

test("sentry stays off without a DSN and names the Vercel environment", () => {
  assert.equal(SENTRY_TRACES_SAMPLE_RATE, 0.1);
  assert.equal(readSentryDsn(undefined), undefined);
  assert.equal(readSentryDsn(null), undefined);
  assert.equal(readSentryDsn(""), undefined);
  assert.equal(readSentryDsn("   "), undefined);
  assert.equal(
    readSentryDsn(" https://public@o0.ingest.us.sentry.io/0 "),
    "https://public@o0.ingest.us.sentry.io/0",
  );

  assert.equal(readSentryEnvironment("preview", "production"), "preview");
  assert.equal(readSentryEnvironment("  ", "production"), "production");
  assert.equal(readSentryEnvironment(undefined, undefined), "development");

  const init = readFileSync(new URL("../../sentry/init.ts", import.meta.url), "utf8");
  assert.match(init, /sendDefaultPii:\s*false/);
  assert.match(init, /beforeSend\(event/);
  assert.match(init, /beforeSendTransaction\(event/);
  assert.match(init, /beforeBreadcrumb\(breadcrumb/);
  assert.match(init, /profileSessionSampleRate:\s*0/);
  assert.match(init, /if \(!dsn\) return/);
  assert.equal(init.includes("replayIntegration"), false);
  assert.equal(init.includes("feedbackIntegration"), false);

  const config = readFileSync(new URL("../../../next.config.ts", import.meta.url), "utf8");
  assert.match(config, /withSentryConfig/);
  assert.match(config, /disable:\s*!uploadSourceMaps/);
  assert.equal(config.includes("tunnelRoute"), false);

  const privacy = readFileSync(new URL("../(marketing)/privacy/page.tsx", import.meta.url), "utf8");
  assert.match(privacy, /Vercel Web Analytics/);
  assert.match(
    privacy,
    /Error reports are sent to Sentry for diagnostics only, and they do not include your notes, tasks, moods, email address, or password\./,
  );

  const globalError = readFileSync(new URL("../global-error.tsx", import.meta.url), "utf8");
  assert.match(globalError, /captureException/);
  assert.equal(globalError.includes("error.message"), false);
});

test("scrubbing strips bodies, cookies, auth, query strings, and journal text", () => {
  const event = {
    message: "failed for ada@example.com",
    transaction: "/reset-password?token=secret",
    request: {
      url: "https://www.prysmic.me/notes/1?token=secret&email=ada@example.com",
      method: "POST",
      query_string: "token=secret",
      data: { content: "dear diary", mood: "sad" },
      cookies: { session: "abc" },
      headers: {
        Authorization: "Bearer secret",
        cookie: "session=abc",
        "Content-Type": "application/json",
        "User-Agent": "test",
        "X-Forwarded-For": "1.2.3.4",
      },
      env: { REMOTE_ADDR: "1.2.3.4" },
    },
    user: {
      id: "42",
      email: "ada@example.com",
      ip_address: "1.2.3.4",
      username: "ada",
    },
    extra: {
      note: "secret note",
      noteBody: "more text",
      task: "buy milk",
      mood: "low",
      email: "ada@example.com",
      password: "hunter2",
      route: "/notes/1?x=1",
    },
    exception: {
      values: [
        {
          type: "Error",
          value: "save failed for ada@example.com",
          stacktrace: {
            frames: [{ filename: "app:///notes/page.tsx", function: "save", vars: { note: "diary" } }],
          },
        },
      ],
    },
    breadcrumbs: [
      { category: "ui.input", message: "dear diary", data: { value: "dear diary" } },
      { category: "console", level: "error", message: "note text", data: { arguments: ["note text"] } },
      {
        category: "navigation",
        message: "https://www.prysmic.me/notes?token=abc",
        data: { from: "/notes/1?token=abc", to: "https://www.prysmic.me/tasks?q=milk#top", title: "Morning pages" },
      },
      { category: "ui.click", message: "Morning pages", data: { node: "div" } },
      {
        category: "fetch",
        data: {
          url: "https://api.example/notes?q=diary",
          method: "POST",
          status_code: 500,
          request_body: { content: "diary" },
          "url.query": "q=diary",
          "url.fragment": "token",
        },
      },
    ],
    spans: [
      {
        description: "POST https://api.example/notes?q=diary",
        data: {
          url: "https://api.example/notes?q=diary",
          "http.query": "q=diary",
          method: "POST",
        },
      },
    ],
  };

  const scrubbed = scrubSentryEvent(event);

  assert.equal(scrubbed.message, "failed for [email]");
  assert.equal(scrubbed.transaction, "/reset-password");
  assert.equal(scrubbed.request.url, "https://www.prysmic.me/notes/1");
  assert.equal(scrubbed.request.method, "POST");
  assert.equal("query_string" in scrubbed.request, false);
  assert.equal("data" in scrubbed.request, false);
  assert.equal("cookies" in scrubbed.request, false);
  assert.equal("env" in scrubbed.request, false);
  assert.deepEqual(scrubbed.request.headers, {
    "Content-Type": "application/json",
    "User-Agent": "test",
  });
  assert.deepEqual(scrubbed.user, { id: "42", username: "ada" });
  assert.deepEqual(scrubbed.extra, { route: "/notes/1" });
  assert.equal(scrubbed.exception.values[0].value, "save failed for [email]");
  assert.equal(scrubbed.exception.values[0].stacktrace.frames[0].filename, "app:///notes/page.tsx");
  assert.equal("vars" in scrubbed.exception.values[0].stacktrace.frames[0], false);

  assert.equal(
    scrubbed.breadcrumbs.some((breadcrumb) => breadcrumb.category === "ui.input"),
    false,
  );
  const consoleCrumb = scrubbed.breadcrumbs.find((breadcrumb) => breadcrumb.category === "console");
  assert.equal(consoleCrumb?.level, "error");
  assert.equal(consoleCrumb?.message, undefined);
  assert.equal(consoleCrumb && "data" in consoleCrumb, false);
  const navigation = scrubbed.breadcrumbs.find((breadcrumb) => breadcrumb.category === "navigation");
  assert.equal(navigation?.message, "/notes");
  assert.deepEqual(navigation?.data, { from: "/notes/1", to: "/tasks" });
  const click = scrubbed.breadcrumbs.find((breadcrumb) => breadcrumb.category === "ui.click");
  assert.equal(click?.message, undefined);
  assert.equal(click?.data, undefined);
  const fetchCrumb = scrubbed.breadcrumbs.find((breadcrumb) => breadcrumb.category === "fetch");
  assert.deepEqual(fetchCrumb?.data, {
    url: "https://api.example/notes",
    method: "POST",
    status_code: 500,
  });

  assert.equal(scrubbed.spans[0].description, "POST https://api.example/notes");
  assert.deepEqual(scrubbed.spans[0].data, {
    url: "https://api.example/notes",
    method: "POST",
  });
});

test("an email-shaped username is removed and input breadcrumbs are dropped", () => {
  const event = scrubSentryEvent({
    user: { username: "ada@example.com", ip_address: "{{auto}}" },
    request: {
      headers: [["Authorization", "Bearer secret"], ["Accept", "application/json"]],
    },
  });
  assert.deepEqual(event.user, {});
  assert.deepEqual(event.request.headers, [["Accept", "application/json"]]);

  assert.equal(scrubBreadcrumb({ category: "ui.input", message: "a private note" }), null);
});
