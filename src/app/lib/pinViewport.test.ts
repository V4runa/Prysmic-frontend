import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { planViewportRepair, planWindowResize, type ViewportRepairInput } from "./pinViewport";

const full: ViewportRepairInput = {
  allowDocumentScroll: false,
  editing: false,
  keyboardOpen: false,
  stableHeight: 844,
  visibleHeight: 844,
  shellHeight: 844,
  scrollY: 0,
  offsetTop: 0,
};

test("the keyboard height is not stored, and a short shell grows back after it closes", () => {
  const during = planViewportRepair({
    ...full,
    editing: true,
    keyboardOpen: true,
    visibleHeight: 520,
    shellHeight: 520,
  });
  assert.equal(during.stableHeight, 844);
  assert.equal(during.lockHeight, null);
  assert.equal(during.resetScroll, false);

  const after = planViewportRepair({
    ...full,
    visibleHeight: 774,
    shellHeight: 774,
  });
  assert.equal(after.stableHeight, 844);
  assert.equal(after.lockHeight, 844);
  assert.equal(after.resetScroll, true);
});

test("a leftover scroll is cleared, and a healthy shell is left on 100dvh", () => {
  const scrolled = planViewportRepair({ ...full, scrollY: 70, offsetTop: 70 });
  assert.equal(scrolled.resetScroll, true);
  assert.equal(scrolled.lockHeight, null);

  const healthy = planViewportRepair(full);
  assert.equal(healthy.lockHeight, null);
  assert.equal(healthy.resetScroll, false);
  assert.deepEqual(
    planViewportRepair({ ...full, allowDocumentScroll: true, scrollY: 400, shellHeight: 400 }),
    { stableHeight: 844, lockHeight: null, resetScroll: false }
  );
});

test("a real resize can shrink the remembered height, and the keyboard's resize cannot", () => {
  assert.equal(
    planWindowResize({
      allowDocumentScroll: false,
      editing: false,
      keyboardOpen: false,
      ignore: false,
      visibleHeight: 700,
    }),
    700
  );
  assert.equal(
    planWindowResize({
      allowDocumentScroll: false,
      editing: false,
      keyboardOpen: true,
      ignore: false,
      visibleHeight: 520,
    }),
    null
  );
  assert.equal(
    planWindowResize({
      allowDocumentScroll: false,
      editing: false,
      keyboardOpen: false,
      ignore: true,
      visibleHeight: 774,
    }),
    null
  );
});

test("the shell uses 100dvh, the canvas stays dark, and the flame and mood color stay", () => {
  const css = readFileSync(new URL("../globals.css", import.meta.url), "utf8");
  const layout = readFileSync(new URL("../layout.tsx", import.meta.url), "utf8");
  const shell = readFileSync(new URL("../components/AppShell.tsx", import.meta.url), "utf8");
  const reflection = readFileSync(new URL("../components/MoodReflection.tsx", import.meta.url), "utf8");
  const timeline = readFileSync(new URL("../components/MoodTimeline.tsx", import.meta.url), "utf8");
  const client = readFileSync(new URL("../components/ClientShellWrapper.tsx", import.meta.url), "utf8");

  assert.match(css, /background:\s*#0b0c0f/);
  assert.match(css, /color-scheme:\s*dark/);
  assert.match(css, /position:\s*fixed/);
  assert.match(css, /height:\s*var\(--app-height,\s*100dvh\)/);
  assert.match(css, /min-height:\s*100dvh/);
  assert.match(css, /html:has\(\.marketing-root\)[\s\S]*overflow:\s*auto/);
  assert.equal(/html\s*\{[^}]*height:\s*100%/.test(css), false);
  assert.match(layout, /themeColor:\s*"#0b0c0f"/);
  assert.match(layout, /interactiveWidget:\s*"overlays-content"/);
  assert.match(shell, /data-mood-lit/);
  assert.equal(shell.includes("h-full"), false);
  assert.match(reflection, /scheduleViewportPin/);
  assert.match(client, /installViewportPin/);
  assert.match(client, /scheduleViewportPin/);
  assert.match(timeline, /scale: \[1, 1\.08, 1\]/);
  assert.equal(timeline.includes(".scrollIntoView"), false);
  assert.match(css, /--mood-room-veil/);
});
