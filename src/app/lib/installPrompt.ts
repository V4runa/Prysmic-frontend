/**
 * Catches Chrome's install event before React hydrates, so the browser
 * mini-infobar does not pop up. The Settings hint reads the stashed event
 * and calls prompt() itself. This does not touch the access token or the
 * refresh cookie.
 */
export const INSTALL_PROMPT_BOOTSTRAP = `(function () {
  try {
    window.addEventListener("beforeinstallprompt", function (event) {
      event.preventDefault();
      window.__prysmicInstallPrompt = event;
      window.dispatchEvent(new Event("prysmic-install-prompt"));
    });
  } catch (err) {}
})();`;

export const INSTALL_HINT_DISMISSED_KEY = "prysmic.installHintDismissed";

export const INSTALL_PROMPT_EVENT = "prysmic-install-prompt";

export type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type InstallHintMode = "hidden" | "ios" | "install";

const IOS_BROWSER = /CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|YaBrowser|OPT\/|GSA\//;

/** iPhone and iPad Safari. Other iOS browsers do not use this Share-sheet line. */
export function detectIosSafari(ua: string, platform: string, maxTouchPoints: number): boolean {
  const ios =
    /iPhone|iPad|iPod/.test(ua) || (platform === "MacIntel" && maxTouchPoints > 1);
  if (!ios) return false;
  return !IOS_BROWSER.test(ua);
}

export function isInstalledDisplay(standaloneMedia: boolean, navigatorStandalone: boolean): boolean {
  return standaloneMedia || navigatorStandalone;
}

export function installHintMode(input: {
  installed: boolean;
  dismissed: boolean;
  iosSafari: boolean;
  canPrompt: boolean;
}): InstallHintMode {
  if (input.installed || input.dismissed) return "hidden";
  if (input.canPrompt) return "install";
  if (input.iosSafari) return "ios";
  return "hidden";
}

type PromptWindow = Window & { __prysmicInstallPrompt?: InstallPromptEvent };

function promptWindow(): PromptWindow | null {
  if (typeof window === "undefined") return null;
  return window as PromptWindow;
}

export function readInstallPrompt(): InstallPromptEvent | null {
  return promptWindow()?.__prysmicInstallPrompt ?? null;
}

export function hasInstallPrompt(): boolean {
  return readInstallPrompt() != null;
}

let prompting = false;

/** Shows the browser install sheet. The event can only be used once. */
export async function runInstallPrompt(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const win = promptWindow();
  const event = win?.__prysmicInstallPrompt;
  if (!win || !event || prompting) return "unavailable";
  prompting = true;
  win.__prysmicInstallPrompt = undefined;
  try {
    await event.prompt();
    const choice = await event.userChoice;
    return choice.outcome === "accepted" ? "accepted" : "dismissed";
  } catch {
    return "unavailable";
  } finally {
    prompting = false;
    notifyInstallHint();
  }
}

const listeners = new Set<() => void>();

export function subscribeInstallHint(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyInstallHint(): void {
  for (const listener of listeners) listener();
}

export function isInstallHintDismissed(): boolean {
  try {
    return localStorage.getItem(INSTALL_HINT_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissInstallHint(): void {
  try {
    localStorage.setItem(INSTALL_HINT_DISMISSED_KEY, "1");
  } catch {
    // Storage can be blocked. The hint stays for this visit.
  }
  notifyInstallHint();
}

export function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  return detectIosSafari(navigator.userAgent, navigator.platform, navigator.maxTouchPoints);
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  const media = window.matchMedia("(display-mode: standalone), (display-mode: fullscreen)").matches;
  return isInstalledDisplay(media, nav.standalone === true);
}

export function currentInstallHintMode(): InstallHintMode {
  return installHintMode({
    installed: isStandaloneDisplay(),
    dismissed: isInstallHintDismissed(),
    iosSafari: isIosSafari(),
    canPrompt: hasInstallPrompt(),
  });
}
