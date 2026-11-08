/**
 * Mounted check for Export your data.
 *
 * Clicks the header control, reads the file Chrome saved, refuses a second
 * request while one is pending, and checks that logout does not save the
 * previous account's bytes. A 401 leaves an unsaved note draft in place.
 *
 * Uses `next build` + `next start` unless ACCOUNT_EXPORT_URL is set.
 * Skips when Chrome is not installed.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const chrome =
  process.env.CHROME_PATH ||
  ["/usr/local/bin/google-chrome", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find(
    (path) => existsSync(path)
  );

if (!chrome) {
  console.log("account-export: Chrome not found, skipping mounted export check");
  process.exit(0);
}

const puppeteer = (await import("puppeteer-core")).default;
const shotDir = process.env.SHOT_DIR || "";
if (shotDir) mkdirSync(shotDir, { recursive: true });

function token(sub) {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      sub,
      username: sub === 8 ? "Other" : "AnuTest",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
  ).toString("base64url");
  return `${header}.${payload}.sig`;
}

function listen(port) {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(typeof address === "object" && address ? address.port : port));
    });
  });
}

async function waitForHttp(url) {
  for (let i = 0; i < 80; i += 1) {
    try {
      const response = await fetch(url);
      if (response.status < 500) return;
    } catch {
      // Still booting.
    }
    await delay(250);
  }
  throw new Error(`Server did not answer at ${url}`);
}

let appProcess = null;
let appUrl = process.env.ACCOUNT_EXPORT_URL || "";
if (!appUrl) {
  const port = await listen(0);
  const build = spawn("npx", ["next", "build"], { cwd: root, stdio: "inherit" });
  const buildCode = await new Promise((resolve) => build.on("exit", resolve));
  if (buildCode !== 0) process.exit(buildCode ?? 1);
  appProcess = spawn("npx", ["next", "start", "-H", "localhost", "-p", String(port)], {
    cwd: root,
    stdio: "inherit",
  });
  appUrl = `http://localhost:${port}`;
  await waitForHttp(`${appUrl}/login`);
}

const api = "http://localhost:3001";
const cors = {
  "Access-Control-Allow-Origin": appUrl,
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Expose-Headers": "Content-Disposition",
};

const downloadDir = mkdtempSync(join(tmpdir(), "prysmic-export-"));
const held = [];
let exportMode = "named";
let exportCount = 0;

function snapshot(marker, day) {
  return JSON.stringify({
    format: "prysmic.account-export",
    version: 1,
    exportedAt: `${day}T17:49:05.000Z`,
    marker,
  });
}

function exportBody() {
  if (exportMode === "user8") return snapshot("user-8-own", "2026-11-09");
  if (exportMode === "hidden") return snapshot("hidden-disposition-bytes", "2026-04-02");
  if (exportMode === "held") return snapshot("held-once", "2026-11-08");
  return snapshot("named-export-bytes", "2026-11-08");
}

function exportHeaders() {
  const headers = {
    ...cors,
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "private, no-store",
  };
  if (exportMode === "hidden") return headers;
  const day = exportMode === "user8" ? "2026-11-09" : "2026-11-08";
  headers["Content-Disposition"] = `attachment; filename="prysmic-export-${day}.json"`;
  return headers;
}

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
  defaultViewport: { width: 1280, height: 900 },
});

async function armDownloads(page) {
  const cdp = await page.createCDPSession();
  await cdp.send("Browser.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: downloadDir,
    eventsEnabled: true,
  });
}

async function filesWith(snippet) {
  const names = readdirSync(downloadDir).filter((name) => !name.endsWith(".crdownload"));
  const hits = [];
  for (const name of names) {
    const text = readFileSync(join(downloadDir, name), "utf8");
    if (text.includes(snippet)) hits.push({ name, text });
  }
  return hits;
}

async function waitForSnippet(snippet) {
  for (let i = 0; i < 40; i += 1) {
    const hits = await filesWith(snippet);
    if (hits.length) return hits;
    await delay(150);
  }
  return [];
}

try {
  const page = await browser.newPage();
  page.setDefaultTimeout(20000);
  page.on("dialog", (dialog) => dialog.accept());
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const url = req.url();
    if (!url.startsWith(api)) return req.continue();
    if (req.method() === "OPTIONS") return req.respond({ status: 204, headers: cors });
    const path = url.slice(api.length).split("?")[0];
    const json = (status, body) =>
      req.respond({
        status,
        headers: { ...cors, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    if (path === "/export" && req.method() === "GET") {
      exportCount += 1;
      if (exportMode === "hold") {
        held.push(req);
        return;
      }
      if (exportMode === "401") {
        return req.respond({ status: 401, headers: cors, body: "unauthorized" });
      }
      if (exportMode === "413") {
        return req.respond({
          status: 413,
          headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({
            statusCode: 413,
            message: "Export exceeds the notes limit of 2000. No file was produced.",
          }),
        });
      }
      return req.respond({
        status: 200,
        headers: exportHeaders(),
        body: exportBody(),
      });
    }
    if (path.startsWith("/tags")) return json(200, []);
    if (path.startsWith("/notes")) return json(200, []);
    return json(200, []);
  });

  await armDownloads(page);
  await page.goto(`${appUrl}/login`, { waitUntil: "domcontentloaded" });
  await page.evaluate((value) => localStorage.setItem("token", value), token(7));
  await page.goto(`${appUrl}/notes`, { waitUntil: "domcontentloaded" });
  const button = await page.waitForSelector('button[aria-label="Export your data"]');
  if (shotDir) await page.screenshot({ path: join(shotDir, "export-header.png") });

  const before = exportCount;
  await button.click();
  await page.waitForFunction(() => document.body.innerText.includes("JSON file download started."));
  await page.waitForFunction(() =>
    document.body.innerText.includes("Attachment files are not included")
  );
  const saved = await waitForSnippet("named-export-bytes");
  if (!saved.length || saved[0].name !== "prysmic-export-2026-11-08.json") {
    throw new Error(`expected prysmic-export-2026-11-08.json, got ${JSON.stringify(saved.map((file) => file.name))}`);
  }
  if (exportCount !== before + 1) throw new Error(`export requests ${exportCount}`);
  if (shotDir) await page.screenshot({ path: join(shotDir, "export-started.png") });

  exportMode = "hidden";
  await page.focus('button[aria-label="Export your data"]');
  await page.keyboard.press("Enter");
  const hidden = await waitForSnippet("hidden-disposition-bytes");
  if (hidden[0]?.name !== "prysmic-export-2026-04-02.json") {
    throw new Error(`hidden disposition name ${hidden[0]?.name}`);
  }

  exportMode = "hold";
  const countAtHold = exportCount;
  await page.evaluate(() => {
    const control = document.querySelector('button[aria-label="Export your data"]');
    control.click();
    control.click();
  });
  for (let i = 0; i < 30 && held.length < 1; i += 1) await delay(50);
  await delay(200);
  if (held.length !== 1 || exportCount !== countAtHold + 1) {
    throw new Error(`double click sent ${exportCount - countAtHold} requests, held ${held.length}`);
  }
  await page.waitForFunction(() => {
    const control = document.querySelector('button[aria-label="Export your data"]');
    return control instanceof HTMLButtonElement && control.disabled;
  });
  exportMode = "held";
  await held.shift().respond({
    status: 200,
    headers: exportHeaders(),
    body: exportBody(),
  });
  await waitForSnippet("held-once");
  await page.waitForFunction(() => {
    const control = document.querySelector('button[aria-label="Export your data"]');
    return control instanceof HTMLButtonElement && !control.disabled;
  });

  exportMode = "hold";
  await page.click('button[aria-label="Export your data"]');
  for (let i = 0; i < 30 && held.length < 1; i += 1) await delay(50);
  await page.click('button[aria-label="Log out"]');
  await page.waitForFunction(() => location.pathname === "/login");
  await held.shift().respond({
    status: 200,
    headers: {
      ...cors,
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="prysmic-export-2026-01-01.json"',
    },
    body: snapshot("user-7-private-should-not-download", "2026-01-01"),
  });
  await delay(800);
  const leaked = await filesWith("user-7-private-should-not-download");
  if (leaked.length) throw new Error("logout saved the previous account export");

  await page.evaluate((value) => localStorage.setItem("token", value), token(8));
  await page.goto(`${appUrl}/notes`, { waitUntil: "domcontentloaded" });
  await delay(400);
  const leakedAfterSwitch = await filesWith("user-7-private-should-not-download");
  if (leakedAfterSwitch.length) throw new Error("the next account received the previous export");
  exportMode = "user8";
  await page.click('button[aria-label="Export your data"]');
  const own = await waitForSnippet("user-8-own");
  if (own[0]?.name !== "prysmic-export-2026-11-09.json") {
    throw new Error(`next account file ${own[0]?.name}`);
  }

  await page.waitForFunction(() => {
    const control = document.querySelector('button[aria-label="Export your data"]');
    return control instanceof HTMLButtonElement && !control.disabled;
  });
  exportMode = "413";
  await page.click('button[aria-label="Export your data"]');
  await page.waitForFunction(() => document.body.innerText.includes("Nothing was downloaded."));
  await delay(400);
  const refused = await filesWith("No file was produced");
  if (refused.length) throw new Error("413 error body was saved as the export");

  const context = await browser.createBrowserContext();
  const expired = await context.newPage();
  expired.setDefaultTimeout(20000);
  await expired.setRequestInterception(true);
  expired.on("request", (req) => {
    const url = req.url();
    if (!url.startsWith(api)) return req.continue();
    if (req.method() === "OPTIONS") return req.respond({ status: 204, headers: cors });
    const path = url.slice(api.length).split("?")[0];
    if (path === "/export") {
      return req.respond({ status: 401, headers: cors, body: "unauthorized" });
    }
    return req.respond({
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
      body: "[]",
    });
  });
  await expired.goto(`${appUrl}/login`, { waitUntil: "domcontentloaded" });
  const draft = JSON.stringify({
    v: 1,
    userId: 7,
    noteKey: "new",
    title: "Keep this title",
    content: "<p>Keep this body.</p>",
    tagIds: [],
    createdId: null,
    baseUpdatedAt: null,
    serverCopy: null,
    savedAt: Date.now(),
  });
  await expired.evaluate(
    (value, stored) => {
      localStorage.setItem("token", value);
      sessionStorage.setItem("prysmic.noteDraft.v1", stored);
    },
    token(7),
    draft
  );
  await expired.goto(`${appUrl}/notes`, { waitUntil: "domcontentloaded" });
  await expired.click('button[aria-label="Export your data"]');
  await expired.waitForFunction(() => document.body.innerText.includes("Nothing was downloaded."));
  const retry = await expired.$("#export-data-status button");
  if (retry) throw new Error("401 offered a retry instead of reauth");
  const after401 = await expired.evaluate(() => ({
    token: localStorage.getItem("token"),
    draft: sessionStorage.getItem("prysmic.noteDraft.v1"),
  }));
  if (after401.token) throw new Error("401 left the token in place");
  if (after401.draft !== draft) throw new Error("401 cleared the unsaved draft");
  await context.close();

  console.log("account-export: download, single flight, session boundary, and 401 passed");
} finally {
  await browser.close();
  if (appProcess) appProcess.kill("SIGTERM");
  rmSync(downloadDir, { recursive: true, force: true });
}
