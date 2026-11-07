/**
 * Mounted restore regression for the note editor.
 *
 * Types into the real TipTap field on the new-note page, leaves for the list,
 * and comes back through Continue. The body, word count, title, and tag must
 * all still be there, and the tab draft must still hold the HTML. Repeats the
 * path for an unsaved edit of an existing note.
 *
 * Uses the production server (`next build` + `next start`) and a mocked API.
 * Set NOTE_RESTORE_URL to point at an already running server instead.
 * Skips with a message when Chrome is not installed.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
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
  console.log("note-body-restore: Chrome not found, skipping mounted editor regression");
  process.exit(0);
}

const puppeteer = (await import("puppeteer-core")).default;

const TITLE = "Test — recovery before-after check";
const BODY = "Synthetic recovery check alpha beta gamma.";
const EDITED = "Edited recovery delta epsilon.";
const shotDir = process.env.SHOT_DIR || "";
if (shotDir) mkdirSync(shotDir, { recursive: true });

const note = {
  id: 109,
  title: "Server note",
  content: "<p>Server body stays.</p>",
  createdAt: "2026-11-07T03:00:00.000Z",
  updatedAt: "2026-11-07T03:00:00.000Z",
  tags: [{ id: 1, name: "Ideas", color: "cyan" }],
  attachmentCount: 0,
};

function token(sub) {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      sub,
      username: "AnuTest",
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
      if (response.ok || response.status < 500) return;
    } catch {
      // Server is still booting.
    }
    await delay(250);
  }
  throw new Error(`Server did not answer at ${url}`);
}

let appProcess = null;
let appUrl = process.env.NOTE_RESTORE_URL || "";

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
};

function installApi(page) {
  return page.setRequestInterception(true).then(() => {
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
      if (path.startsWith("/tags")) return json(200, [{ id: 1, name: "Ideas", color: "cyan" }]);
      if (path.startsWith("/notes/user/")) return json(200, [note]);
      if (path === "/notes/109") return json(200, note);
      if (path.startsWith("/notes/109/")) return json(200, []);
      return json(200, []);
    });
  });
}

async function shot(page, name) {
  if (!shotDir) return;
  await page.screenshot({ path: join(shotDir, `${name}.png`), fullPage: true });
}

async function readEditor(page) {
  return page.evaluate(() => {
    const prose = document.querySelector(".ProseMirror");
    const words = document.body.innerText.match(/\d+ words/)?.[0] ?? "";
    const draft = sessionStorage.getItem("prysmic.noteDraft.v1");
    const ideas = [...document.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Ideas");
    return {
      prose: prose?.innerText ?? "",
      words,
      title: document.querySelector('input[type="text"]')?.value ?? "",
      restored: document.body.innerText.includes("Restored unsaved writing from this tab."),
      ideasSelected: Boolean(ideas?.className.includes("ring-1")),
      draft,
    };
  });
}

async function signIn(page) {
  await page.goto(`${appUrl}/login`, { waitUntil: "domcontentloaded" });
  await page.evaluate((value) => localStorage.setItem("token", value), token(7));
}

async function typeBody(page, text) {
  const editor = await page.waitForSelector(".ProseMirror[contenteditable='true']");
  await editor.click();
  await page.keyboard.type(text, { delay: 5 });
}

async function replaceBody(page, text) {
  await page.waitForSelector(".ProseMirror[contenteditable='true']");
  await page.evaluate(() => {
    const el = document.querySelector(".ProseMirror");
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await page.keyboard.type(text, { delay: 5 });
}

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
  defaultViewport: { width: 1280, height: 900 },
});

let failed = false;

try {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  await installApi(page);
  await signIn(page);
  await page.goto(`${appUrl}/notes/new`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('input[placeholder="Title your thought..."]');
  await page.type('input[placeholder="Title your thought..."]', TITLE);
  await typeBody(page, BODY);
  await page.waitForFunction(
    (sentence) => document.body.innerText.includes(sentence) && document.body.innerText.includes("6 words"),
    {},
    BODY
  );
  await page.waitForFunction(() =>
    [...document.querySelectorAll("button")].some((button) => button.textContent?.trim() === "Ideas")
  );
  await page.evaluate(() => {
    const button = [...document.querySelectorAll("button")].find((el) => el.textContent?.trim() === "Ideas");
    button.click();
  });
  await delay(300);
  const before = await readEditor(page);
  await shot(page, "new-before-nav");
  if (!before.prose.includes("alpha beta gamma") || before.words !== "6 words" || !before.ideasSelected) {
    throw new Error(`new note did not accept typing: ${JSON.stringify(before)}`);
  }

  await page.evaluate(() => window.next.router.push("/notes"));
  await page.waitForFunction(() => document.body.innerText.includes("Unsaved writing is still in this tab."));
  const listText = await page.evaluate(() => document.body.innerText);
  await shot(page, "new-list-notice");
  if (listText.includes("alpha beta gamma") || listText.includes(TITLE)) {
    throw new Error("notes list revealed the unsaved title or body");
  }

  await page.evaluate(() => {
    const link = [...document.querySelectorAll("a")].find((anchor) => anchor.textContent?.trim() === "Continue");
    link.click();
  });
  await page.waitForFunction(() => document.body.innerText.includes("Restored unsaved writing from this tab."));
  await delay(600);
  const after = await readEditor(page);
  await shot(page, "new-after-continue");
  console.log("new-after", JSON.stringify({ ...after, draft: undefined }));
  const stored = after.draft ? JSON.parse(after.draft) : null;
  if (
    !after.prose.includes("alpha beta gamma") ||
    after.words !== "6 words" ||
    after.title !== TITLE ||
    !after.restored ||
    !after.ideasSelected ||
    !stored?.content?.includes("alpha beta gamma") ||
    stored.title !== TITLE ||
    !stored.tagIds?.includes(1)
  ) {
    console.error("NEW_NOTE_RESTORE_FAILED", after);
    failed = true;
  } else {
    const editor = await page.waitForSelector(".ProseMirror[contenteditable='true']");
    await editor.click();
    await page.keyboard.type(" More.");
    await page.waitForFunction(() => document.body.innerText.includes("7 words"));
    const typed = await readEditor(page);
    await shot(page, "new-after-more-typing");
    if (!typed.prose.includes("More.") || !typed.draft?.includes("More.")) {
      console.error("NEW_NOTE_STILL_EDITABLE_FAILED", typed);
      failed = true;
    }
  }
  await context.close();

  const editContext = await browser.createBrowserContext();
  const editPage = await editContext.newPage();
  editPage.setDefaultTimeout(20000);
  await installApi(editPage);
  await signIn(editPage);
  await editPage.goto(`${appUrl}/notes/109`, { waitUntil: "domcontentloaded" });
  await editPage.waitForSelector('button[title="Edit"]');
  await editPage.click('button[title="Edit"]');
  await editPage.waitForFunction(() => document.body.innerText.includes("Editing Note"));
  await replaceBody(editPage, EDITED);
  await editPage.waitForFunction(
    (sentence) => document.body.innerText.includes(sentence) && document.body.innerText.includes("4 words"),
    {},
    EDITED
  );
  await delay(300);
  const editBefore = await readEditor(editPage);
  await shot(editPage, "edit-before-nav");
  if (!editBefore.prose.includes("delta epsilon") || editBefore.prose.includes("Server body")) {
    throw new Error(`edit did not replace the server body: ${JSON.stringify(editBefore)}`);
  }
  await editPage.evaluate(() => window.next.router.push("/notes"));
  await editPage.waitForFunction(() => document.body.innerText.includes("Continue"));
  await editPage.evaluate(() => {
    const link = [...document.querySelectorAll("a")].find((anchor) => anchor.textContent?.trim() === "Continue");
    link.click();
  });
  await editPage.waitForFunction(() => location.pathname === "/notes/109");
  await editPage.waitForFunction(() => document.body.innerText.includes("Restored unsaved writing from this tab."));
  await delay(600);
  const editAfter = await readEditor(editPage);
  await shot(editPage, "edit-after-continue");
  console.log("edit-after", JSON.stringify({ ...editAfter, draft: undefined }));
  const editStored = editAfter.draft ? JSON.parse(editAfter.draft) : null;
  if (
    !editAfter.prose.includes("delta epsilon") ||
    editAfter.prose.includes("Server body") ||
    editAfter.words !== "4 words" ||
    editAfter.title !== "Server note" ||
    !editStored?.content?.includes("delta epsilon")
  ) {
    console.error("EDIT_RESTORE_FAILED", editAfter);
    failed = true;
  }
  await editContext.close();
} finally {
  await browser.close();
  if (appProcess) appProcess.kill("SIGTERM");
}

if (failed) process.exit(1);
console.log("note-body-restore: title, body, and tags survived Continue");
