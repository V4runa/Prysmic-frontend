import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  classifyExportError,
  exportErrorMessage,
  exportFilename,
  runAccountExport,
  sanitizeExportNotice,
  shouldDeliverExport,
  type ExportPayload,
} from "./dataExport";

const NOW = new Date("2026-11-08T17:49:05Z");
const SESSION = { epoch: 3, owner: 7 };

function jsonPayload(text: string, extra: Partial<ExportPayload> = {}): ExportPayload {
  return {
    blob: new Blob([text], { type: "application/json" }),
    contentType: "application/json",
    contentDisposition: null,
    notice: null,
    ...extra,
  };
}

async function blobText(blob: Blob): Promise<string> {
  return blob.text();
}

test("a JSON response downloads those bytes with a timestamped .json name", async () => {
  const body = '{"kept":"alpha beta","not":"parsed"}';
  const saved: { filename: string; text: string }[] = [];
  const result = await runAccountExport({
    lock: { current: false },
    started: SESSION,
    readSession: () => SESSION,
    now: NOW,
    fetchExport: async () => jsonPayload(body),
    deliver: async (file) => {
      saved.push({ filename: file.filename, text: await blobText(file.blob) });
    },
  });
  assert.equal(result.status, "downloaded");
  assert.equal(saved[0]?.filename, "Prysmic-export-20261108-174905.json");
  assert.equal(saved[0]?.text, body);
});

test("a server filename is kept, including a packaged download", async () => {
  const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 9, 8, 7]);
  const saved: { filename: string; bytes: number[] }[] = [];
  const result = await runAccountExport({
    lock: { current: false },
    started: SESSION,
    readSession: () => SESSION,
    now: NOW,
    fetchExport: async () => ({
      blob: new Blob([bytes], { type: "application/zip" }),
      contentType: "application/zip",
      contentDisposition: "attachment; filename=\"Account-snapshot.zip\"",
      notice: null,
    }),
    deliver: async (file) => {
      saved.push({
        filename: file.filename,
        bytes: [...new Uint8Array(await file.blob.arrayBuffer())],
      });
    },
  });
  assert.equal(result.status, "downloaded");
  assert.equal(saved[0]?.filename, "Account-snapshot.zip");
  assert.deepEqual(saved[0]?.bytes, [...bytes]);
});

test("filename* wins, and an unsafe path falls back without leaving the extension off JSON", () => {
  assert.equal(
    exportFilename({
      contentType: "application/zip",
      contentDisposition: "attachment; filename=\"plain.json\"; filename*=UTF-8''Prysmic%20export.zip",
      now: NOW,
    }),
    "Prysmic export.zip"
  );
  assert.equal(
    exportFilename({
      contentType: "application/json; charset=utf-8",
      contentDisposition: 'attachment; filename="../../secret.json"',
      now: NOW,
    }),
    "secret.json"
  );
  assert.equal(
    exportFilename({
      contentType: "application/json",
      contentDisposition: "attachment; filename*=UTF-8''%2e%2e",
      now: NOW,
    }),
    "Prysmic-export-20261108-174905.json"
  );
  assert.equal(
    exportFilename({
      contentType: "application/json",
      contentDisposition: "attachment; filename=\"bad\nname.json\"",
      now: NOW,
    }),
    "Prysmic-export-20261108-174905.json"
  );
  assert.equal(
    exportFilename({
      contentType: "application/octet-stream",
      contentDisposition: null,
      now: NOW,
    }),
    "Prysmic-export-20261108-174905"
  );
  assert.equal(
    exportFilename({
      contentType: "application/json",
      contentDisposition: 'attachment; filename="notes"',
      now: NOW,
    }),
    "notes.json"
  );
});

test("a limitation is shown only from a server notice, and it is one short line", async () => {
  let notice: string | null = "unset";
  await runAccountExport({
    lock: { current: false },
    started: SESSION,
    readSession: () => SESSION,
    now: NOW,
    fetchExport: async () =>
      jsonPayload("{}", {
        notice: " Notes and tags are included.\nAttachment files are not.\r\n<script> ",
      }),
    deliver: (file) => {
      notice = file.notice;
    },
  });
  assert.equal(notice, "Notes and tags are included. Attachment files are not. <script>");
  assert.equal(sanitizeExportNotice("   \n\t  "), null);
  assert.equal(sanitizeExportNotice(null), null);
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
  assert.match(shell, /ExportDataButton/);
});
