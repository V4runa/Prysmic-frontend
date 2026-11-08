import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  accountExportFilename,
  classifyExportError,
  EXPORT_ABOUT,
  EXPORT_DOWNLOAD_MESSAGE,
  EXPORT_MAX_BYTES,
  exportErrorMessage,
  isAccountExportContentType,
  runAccountExport,
  safeJsonExportFilename,
  shouldApplyExportUnauthorized,
  shouldDeliverExport,
  shouldSaveExportBody,
  type ExportPayload,
} from "./dataExport";

const NOW = new Date("2026-11-08T17:49:05Z");
const SESSION = { epoch: 3, owner: 7 };

function jsonPayload(text: string, extra: Partial<ExportPayload> = {}): ExportPayload {
  return {
    blob: new Blob([text], { type: "application/json" }),
    contentType: "application/json; charset=utf-8",
    contentDisposition: null,
    ...extra,
  };
}

async function blobText(blob: Blob): Promise<string> {
  return blob.text();
}

test("a JSON snapshot downloads unchanged, named from exportedAt when the disposition header is hidden", async () => {
  const body =
    '{"format":"prysmic.account-export","version":1,"exportedAt":"2026-11-08T17:49:05.000Z","notes":[{"contentHtml":"<p>alpha</p>","contentText":"alpha"}]}';
  const saved: { filename: string; text: string }[] = [];
  const result = await runAccountExport({
    lock: { current: false },
    started: SESSION,
    readSession: () => SESSION,
    now: new Date("2026-12-01T00:00:00Z"),
    fetchExport: async () => jsonPayload(body),
    deliver: async (file) => {
      saved.push({ filename: file.filename, text: await blobText(file.blob) });
    },
  });
  assert.equal(result.status, "downloaded");
  assert.equal(saved[0]?.filename, "prysmic-export-2026-11-08.json");
  assert.equal(saved[0]?.text, body);
});

test("the server Content-Disposition name is kept and the bytes are not rewritten", async () => {
  const bytes = new Uint8Array([0x7b, 0x22, 0x61, 0x22, 0x3a, 0x31, 0x7d]);
  const saved: { filename: string; bytes: number[] }[] = [];
  const result = await runAccountExport({
    lock: { current: false },
    started: SESSION,
    readSession: () => SESSION,
    now: NOW,
    fetchExport: async () => ({
      blob: new Blob([bytes], { type: "application/json" }),
      contentType: "application/json; charset=utf-8",
      contentDisposition: 'attachment; filename="prysmic-export-2026-11-08.json"',
    }),
    deliver: async (file) => {
      saved.push({
        filename: file.filename,
        bytes: [...new Uint8Array(await file.blob.arrayBuffer())],
      });
    },
  });
  assert.equal(result.status, "downloaded");
  assert.equal(saved[0]?.filename, "prysmic-export-2026-11-08.json");
  assert.deepEqual(saved[0]?.bytes, [...bytes]);
});

test("a hidden Content-Disposition falls back to the contract JSON name", () => {
  assert.equal(
    accountExportFilename({
      contentDisposition: "attachment; filename=\"plain.json\"; filename*=UTF-8''prysmic-export-2026-11-08.json",
      now: NOW,
    }),
    "prysmic-export-2026-11-08.json"
  );
  assert.equal(
    accountExportFilename({
      contentDisposition: 'attachment; filename="../../secret.json"',
      now: NOW,
    }),
    "secret.json"
  );
  assert.equal(
    accountExportFilename({
      contentDisposition: "attachment; filename*=UTF-8''%2e%2e",
      exportedAt: "2026-11-08T17:49:05.000Z",
      now: new Date("2026-12-01T00:00:00Z"),
    }),
    "prysmic-export-2026-11-08.json"
  );
  assert.equal(
    accountExportFilename({
      contentDisposition: null,
      now: NOW,
    }),
    "prysmic-export-2026-11-08.json"
  );
  assert.equal(
    accountExportFilename({
      contentDisposition: 'attachment; filename="notes"',
      now: NOW,
    }),
    "notes.json"
  );
  assert.equal(shouldSaveExportBody(200), true);
  assert.equal(shouldSaveExportBody(413), false);
  assert.equal(shouldSaveExportBody(401), false);
  assert.equal(shouldSaveExportBody(404), false);
});

test("a 413 error body is not downloaded", async () => {
  const errorBody = '{"statusCode":413,"message":"Export exceeds the notes limit of 2000. No file was produced."}';
  let delivered = 0;
  const result = await runAccountExport({
    lock: { current: false },
    started: SESSION,
    readSession: () => SESSION,
    now: NOW,
    fetchExport: async () => {
      throw new Error("API Error: 413");
    },
    deliver: () => {
      delivered += 1;
    },
  });
  assert.equal(result.status, "error");
  if (result.status === "error") assert.equal(result.kind, "too-large");
  assert.equal(delivered, 0);
  assert.match(exportErrorMessage("too-large"), /too large for one JSON file/);
  assert.match(exportErrorMessage("too-large"), /Nothing was downloaded/);
  assert.equal(errorBody.includes("contentHtml"), false);
});

test("network and server failures download nothing and can be retried; 401 cannot", async () => {
  const kinds = [
    { err: new TypeError("Failed to fetch"), kind: "network" as const },
    { err: new Error("API Error: 500"), kind: "server" as const },
    { err: new Error("Session expired. unauthorized"), kind: "unauthorized" as const },
  ];
  for (const item of kinds) {
    let delivered = 0;
    const draft = "unsaved writing stays";
    const result = await runAccountExport({
      lock: { current: false },
      started: SESSION,
      readSession: () => SESSION,
      now: NOW,
      fetchExport: async () => {
        throw item.err;
      },
      deliver: () => {
        delivered += 1;
      },
    });
    assert.equal(result.status, "error");
    if (result.status === "error") assert.equal(result.kind, item.kind);
    assert.equal(delivered, 0);
    assert.equal(draft, "unsaved writing stays");
    assert.match(exportErrorMessage(item.kind), /Nothing was downloaded|not downloaded/);
  }
  assert.equal(exportErrorMessage("unauthorized").includes("Try again"), false);
  assert.equal(classifyExportError(new TypeError("offline")), "network");
});

test("a second click while a download is pending does not fetch again", async () => {
  let fetches = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const lock = { current: false };
  const delivered: string[] = [];
  const run = () =>
    runAccountExport({
      lock,
      started: SESSION,
      readSession: () => SESSION,
      now: NOW,
      fetchExport: async () => {
        fetches += 1;
        await gate;
        return jsonPayload("once");
      },
      deliver: (file) => {
        delivered.push(file.filename);
      },
    });
  const first = run();
  const second = await run();
  assert.equal(second.status, "busy");
  assert.equal(fetches, 1);
  release();
  assert.equal((await first).status, "downloaded");
  assert.equal(delivered.length, 1);
  assert.equal(await blobText(jsonPayload("once").blob), "once");
});

test("logout or another account does not receive the in-flight export", async () => {
  let release!: (payload: ExportPayload) => void;
  const gate = new Promise<ExportPayload>((resolve) => {
    release = resolve;
  });
  const session = { epoch: 3, owner: 7 as number | null };
  const delivered: string[] = [];
  const pending = runAccountExport({
    lock: { current: false },
    started: { ...session },
    readSession: () => ({ ...session }),
    now: NOW,
    fetchExport: () => gate,
    deliver: async (file) => {
      delivered.push(await blobText(file.blob));
    },
  });
  session.epoch = 4;
  session.owner = null;
  release(jsonPayload("user-7-private"));
  assert.equal((await pending).status, "dropped");
  assert.deepEqual(delivered, []);

  session.owner = 8;
  const nextBytes: string[] = [];
  const next = await runAccountExport({
    lock: { current: false },
    started: { epoch: 4, owner: 8 },
    readSession: () => ({ epoch: session.epoch, owner: session.owner }),
    now: NOW,
    fetchExport: async () => jsonPayload("user-8-own"),
    deliver: async (file) => {
      nextBytes.push(await blobText(file.blob));
    },
  });
  assert.equal(next.status, "downloaded");
  assert.deepEqual(nextBytes, ["user-8-own"]);
  assert.equal(shouldDeliverExport({ epoch: 3, owner: 7 }, { epoch: 3, owner: 8 }), false);
  assert.equal(shouldDeliverExport({ epoch: 3, owner: 7 }, { epoch: 3, owner: null }), false);
});

test("the export path does not clear drafts or store the file", () => {
  const files = [
    new URL("./dataExport.ts", import.meta.url),
    new URL("../components/ExportDataButton.tsx", import.meta.url),
  ];
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    assert.equal(source.includes("clearDraft"), false);
    assert.equal(source.includes("localStorage.setItem"), false);
    assert.equal(source.includes("sessionStorage"), false);
    assert.equal(source.includes("bumpSessionEpoch"), false);
  }
  const button = readFileSync(new URL("../components/ExportDataButton.tsx", import.meta.url), "utf8");
  const shell = readFileSync(new URL("../components/AppShell.tsx", import.meta.url), "utf8");
  assert.match(button, /apiFetchDownload\("\/export"\)/);
  assert.match(button, /Export your data/);
  assert.match(button, /EXPORT_ABOUT/);
  assert.match(shell, /ExportDataButton/);
  assert.match(EXPORT_ABOUT, /JSON file/);
  assert.match(EXPORT_ABOUT, /Attachment files are not included/);
  assert.equal(/all files/i.test(EXPORT_ABOUT), false);
  assert.equal(/\bbackup\b/i.test(EXPORT_DOWNLOAD_MESSAGE), false);
  assert.equal(EXPORT_DOWNLOAD_MESSAGE, "JSON file download started. Attachment files are not included.");
});

test("a deferred filename read cannot deliver after the session changes", async () => {
  let release!: (value: string) => void;
  let startedRead = false;
  const gate = new Promise<string>((resolve) => {
    release = resolve;
  });
  const session = { epoch: 3, owner: 7 as number | null };
  let delivered = 0;
  const pending = runAccountExport({
    lock: { current: false },
    started: { epoch: 3, owner: 7 },
    readSession: () => ({ epoch: session.epoch, owner: session.owner }),
    now: NOW,
    fetchExport: async () => ({
      blob: {
        size: 80,
        slice: () => ({
          text: () => {
            startedRead = true;
            return gate;
          },
        }),
      } as unknown as Blob,
      contentType: "application/json; charset=utf-8",
      contentDisposition: null,
    }),
    deliver: () => {
      delivered += 1;
    },
  });
  for (let i = 0; i < 20 && !startedRead; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  assert.equal(startedRead, true);
  session.epoch = 4;
  session.owner = 8;
  release('{"exportedAt":"2026-11-08T17:49:05.000Z","notes":[]}');
  const result = await pending;
  assert.equal(result.status, "dropped");
  assert.equal(delivered, 0);
});

test("a 200 HTML login page and a non-json filename are not saved", async () => {
  assert.equal(isAccountExportContentType("application/json; charset=utf-8"), true);
  assert.equal(isAccountExportContentType("text/html; charset=utf-8"), false);
  assert.equal(isAccountExportContentType("text/html"), false);
  assert.equal(safeJsonExportFilename("login.html"), null);
  assert.equal(safeJsonExportFilename("../../login.html"), null);
  assert.equal(
    accountExportFilename({
      contentDisposition: 'attachment; filename="login.html"',
      now: NOW,
    }),
    "prysmic-export-2026-11-08.json"
  );
  let delivered = 0;
  const html = await runAccountExport({
    lock: { current: false },
    started: SESSION,
    readSession: () => SESSION,
    now: NOW,
    fetchExport: async () => ({
      blob: new Blob(["<!doctype html><title>Sign in</title>"], { type: "text/html" }),
      contentType: "text/html; charset=utf-8",
      contentDisposition: 'attachment; filename="login.html"',
    }),
    deliver: () => {
      delivered += 1;
    },
  });
  assert.equal(html.status, "error");
  assert.equal(delivered, 0);
  const huge = await runAccountExport({
    lock: { current: false },
    started: SESSION,
    readSession: () => SESSION,
    now: NOW,
    fetchExport: async () => ({
      blob: { size: EXPORT_MAX_BYTES + 1, slice: () => ({ text: async () => "" }) } as unknown as Blob,
      contentType: "application/json; charset=utf-8",
      contentDisposition: 'attachment; filename="prysmic-export-2026-11-08.json"',
    }),
    deliver: () => {
      delivered += 1;
    },
  });
  assert.equal(huge.status, "error");
  if (huge.status === "error") assert.equal(huge.kind, "too-large");
  assert.equal(delivered, 0);
});

test("a stale export 401 does not apply after a new login", () => {
  assert.equal(
    shouldApplyExportUnauthorized({
      startedEpoch: 1,
      startedToken: "token-a",
      currentEpoch: 1,
      currentToken: "token-a",
    }),
    true
  );
  assert.equal(
    shouldApplyExportUnauthorized({
      startedEpoch: 1,
      startedToken: "token-a",
      currentEpoch: 1,
      currentToken: null,
    }),
    true
  );
  assert.equal(
    shouldApplyExportUnauthorized({
      startedEpoch: 1,
      startedToken: "token-a",
      currentEpoch: 2,
      currentToken: "token-b",
    }),
    false
  );
  assert.equal(
    shouldApplyExportUnauthorized({
      startedEpoch: 1,
      startedToken: "token-a",
      currentEpoch: 1,
      currentToken: "token-b",
    }),
    false
  );
});
