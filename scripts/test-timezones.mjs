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

process.exit(failed === 0 ? 0 : 1);
