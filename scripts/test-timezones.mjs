import { spawnSync } from "node:child_process";

const zones = ["America/New_York", "UTC", "Asia/Tokyo"];
const files = [
  "src/app/lib/date.test.ts",
  "src/app/calendar/lib/calendarPlacement.test.ts",
];

let failed = 0;
for (const TZ of zones) {
  console.log(`\n=== TZ=${TZ} ===\n`);
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "--test", ...files],
    { stdio: "inherit", env: { ...process.env, TZ } }
  );
  if (result.status !== 0) failed += 1;
}

console.log("\n=== note writing safety ===\n");
const notes = spawnSync(
  process.execPath,
  [
    "--import",
    "tsx",
    "--test",
    "src/app/notes/noteDraft.test.ts",
    "src/app/notes/noteSave.test.ts",
    "src/app/notes/bindNewNoteCreate.test.ts",
    "src/app/lib/personalCache.test.ts",
    "src/app/lib/sessionBoundary.test.ts",
    "src/app/lib/dataExport.test.ts",
  ],
  { stdio: "inherit", env: process.env }
);
if (notes.status !== 0) failed += 1;

console.log("\n=== note body restore (mounted) ===\n");
const restore = spawnSync(process.execPath, ["scripts/note-body-restore.mjs"], {
  stdio: "inherit",
  env: process.env,
});
if (restore.status !== 0) failed += 1;

console.log("\n=== account export (mounted) ===\n");
const accountExport = spawnSync(process.execPath, ["scripts/account-export-browser.mjs"], {
  stdio: "inherit",
  env: process.env,
});
if (accountExport.status !== 0) failed += 1;

process.exit(failed === 0 ? 0 : 1);
