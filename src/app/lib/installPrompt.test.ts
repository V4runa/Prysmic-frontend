import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import manifest from "../manifest";
import { ACCESS_TOKEN_KEY } from "./storedSession";
import {
  INSTALL_HINT_DISMISSED_KEY,
  INSTALL_PROMPT_BOOTSTRAP,
  detectIosSafari,
  dismissInstallHint,
  installHintMode,
  isInstalledDisplay,
  isInstallHintDismissed,
} from "./installPrompt";

const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const IPHONE_CHROME =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.35 Mobile/15E148 Safari/604.1";
const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const DESKTOP_CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
    removeItem(key: string) {
      map.delete(key);
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
  };
}

test("the manifest is an installable standalone app rooted at home", () => {
  const body = manifest();
  assert.equal(body.id, "/");
  assert.equal(body.name, "Prysmic");
  assert.equal(body.short_name, "Prysmic");
  assert.equal(body.start_url, "/");
  assert.equal(body.scope, "/");
  assert.equal(body.display, "standalone");
  assert.equal(body.theme_color, "#0b0c0f");
  assert.equal(body.background_color, "#0b0c0f");
  const icons = body.icons ?? [];
  assert.deepEqual(
    icons.map((icon) => `${icon.sizes} ${icon.purpose}`),
    ["192x192 any", "512x512 any", "512x512 maskable"]
  );
  for (const icon of icons) {
    assert.equal(icon.type, "image/png");
    assert.match(icon.src, /^\/icons\/icon-/);
  }
});

test("home screen icons are the generated png sizes", () => {
  function size(path: string) {
    const buf = readFileSync(new URL(path, import.meta.url));
    assert.equal(buf.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(buf.subarray(12, 16).toString("ascii"), "IHDR");
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), bytes: buf.length };
  }

  const icon192 = size("../../../public/icons/icon-192.png");
  const icon512 = size("../../../public/icons/icon-512.png");
  const maskable = size("../../../public/icons/icon-512-maskable.png");
  const apple = size("../../../public/apple-touch-icon.png");
  assert.deepEqual(icon192, { width: 192, height: 192, bytes: icon192.bytes });
  assert.equal(icon512.width, 512);
  assert.equal(icon512.height, 512);
  assert.equal(maskable.width, 512);
  assert.equal(maskable.height, 512);
  assert.equal(apple.width, 180);
  assert.equal(apple.height, 180);
  assert.notEqual(maskable.bytes, icon512.bytes);
});

test("iPhone Safari is the only phone that gets the Share instruction", () => {
  assert.equal(detectIosSafari(IPHONE_SAFARI, "iPhone", 5), true);
  assert.equal(detectIosSafari(IPHONE_CHROME, "iPhone", 5), false);
  assert.equal(detectIosSafari(ANDROID_CHROME, "Linux armv8l", 5), false);
  assert.equal(detectIosSafari(DESKTOP_CHROME, "Win32", 0), false);
  assert.equal(
    detectIosSafari(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
      "MacIntel",
      5
    ),
    true
  );
  assert.equal(detectIosSafari(DESKTOP_CHROME, "MacIntel", 0), false);
});

test("the hint stays hidden once installed or dismissed", () => {
  assert.equal(isInstalledDisplay(true, false), true);
  assert.equal(isInstalledDisplay(false, true), true);
  assert.equal(isInstalledDisplay(false, false), false);
  assert.equal(
    installHintMode({ installed: true, dismissed: false, iosSafari: true, canPrompt: true }),
    "hidden"
  );
  assert.equal(
    installHintMode({ installed: false, dismissed: true, iosSafari: true, canPrompt: true }),
    "hidden"
  );
  assert.equal(
    installHintMode({ installed: false, dismissed: false, iosSafari: false, canPrompt: true }),
    "install"
  );
  assert.equal(
    installHintMode({ installed: false, dismissed: false, iosSafari: true, canPrompt: false }),
    "ios"
  );
  assert.equal(
    installHintMode({ installed: false, dismissed: false, iosSafari: false, canPrompt: false }),
    "hidden"
  );
});

test("dismissing the hint does not touch the access token", () => {
  const local = memoryStorage();
  local.setItem(ACCESS_TOKEN_KEY, "still-signed-in");
  const previous = globalThis.localStorage;
  Object.defineProperty(globalThis, "localStorage", { value: local, configurable: true });
  try {
    assert.equal(isInstallHintDismissed(), false);
    dismissInstallHint();
    assert.equal(local.getItem(INSTALL_HINT_DISMISSED_KEY), "1");
    assert.equal(local.getItem(ACCESS_TOKEN_KEY), "still-signed-in");
    assert.equal(isInstallHintDismissed(), true);
  } finally {
    Object.defineProperty(globalThis, "localStorage", { value: previous, configurable: true });
  }
});

test("the early install listener only stashes the browser event", () => {
  let prevented = false;
  const dispatched: string[] = [];
  const event = {
    preventDefault() {
      prevented = true;
    },
  };
  const windowObj = {
    __prysmicInstallPrompt: undefined as unknown,
    addEventListener(_type: string, listener: (next: { preventDefault: () => void }) => void) {
      listener(event);
    },
    dispatchEvent(next: { type: string }) {
      dispatched.push(next.type);
    },
  };
  vm.runInNewContext(INSTALL_PROMPT_BOOTSTRAP, { window: windowObj, Event: class Event {
    type: string;
    constructor(type: string) {
      this.type = type;
    }
  } });
  assert.equal(prevented, true);
  assert.equal(windowObj.__prysmicInstallPrompt, event);
  assert.deepEqual(dispatched, ["prysmic-install-prompt"]);
});

test("apple web app tags, safe areas, and the settings hint are wired", () => {
  const layout = readFileSync(new URL("../layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /appleWebApp:\s*\{[\s\S]*capable:\s*true/);
  assert.match(layout, /title:\s*"Prysmic"/);
  assert.match(layout, /statusBarStyle:\s*"black-translucent"/);
  assert.match(layout, /viewportFit:\s*"cover"/);
  assert.match(layout, /themeColor:\s*"#0b0c0f"/);
  assert.match(layout, /INSTALL_PROMPT_BOOTSTRAP/);
  assert.match(layout, /name="apple-mobile-web-app-capable" content="yes"/);
  assert.match(layout, /\/apple-touch-icon\.png/);

  const css = readFileSync(new URL("../globals.css", import.meta.url), "utf8");
  assert.match(css, /env\(safe-area-inset-top/);
  assert.match(css, /env\(safe-area-inset-bottom/);
  assert.match(css, /padding-left:\s*max\(1rem,\s*var\(--safe-left\)\)/);
  assert.match(css, /padding-bottom:\s*var\(--safe-bottom\)/);

  const settings = readFileSync(new URL("../settings/page.tsx", import.meta.url), "utf8");
  assert.match(settings, /<InstallHint \/>/);

  const api = readFileSync(new URL("../hooks/useApi.ts", import.meta.url), "utf8");
  assert.match(api, /localStorage\.getItem\("token"\)/);
  assert.equal(api.includes("caches."), false);

  const shell = readFileSync(new URL("../components/AppShell.tsx", import.meta.url), "utf8");
  assert.match(shell, /<h1[^>]*>\s*Prysmic\s*<\/h1>/);
  assert.equal(shell.includes(">Prysmic</Link>"), false);
  assert.match(shell, /Wandering as \$\{username\}/);
});
