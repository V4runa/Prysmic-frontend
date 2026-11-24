/**
 * On an iPhone home-screen app, closing the keyboard after a mood note can
 * leave the layout about 70px short. The shell stops above the bottom of the
 * screen, the tab bar sits on that gap, and the page background shows through.
 * Client navigations keep the stuck height; a reload was the only way back.
 *
 * The tallest height seen while the keyboard is closed is remembered. Nothing
 * writes a height while a field is focused, so the keyboard size cannot stick.
 * When typing ends, the shell grows back to that height and any leftover
 * window scroll is cleared.
 */

export type ViewportRepairInput = {
  allowDocumentScroll: boolean;
  editing: boolean;
  keyboardOpen: boolean;
  /** Tallest screen height recorded with the keyboard closed. */
  stableHeight: number;
  visibleHeight: number;
  shellHeight: number;
  scrollY: number;
  offsetTop: number;
};

export type ViewportRepair = {
  stableHeight: number;
  /** Pixel height to apply. Null leaves 100dvh in charge. */
  lockHeight: number | null;
  resetScroll: boolean;
};

export function planViewportRepair(input: ViewportRepairInput): ViewportRepair {
  if (input.allowDocumentScroll) {
    return { stableHeight: input.stableHeight, lockHeight: null, resetScroll: false };
  }
  // A keyboard-sized measurement must never become the shell height.
  if (input.editing || input.keyboardOpen) {
    return { stableHeight: input.stableHeight, lockHeight: null, resetScroll: false };
  }
  const stable = Math.max(input.stableHeight, input.visibleHeight);
  const short = input.shellHeight + 1 < stable;
  const scrolled = input.scrollY !== 0 || input.offsetTop >= 1;
  return {
    stableHeight: stable,
    lockHeight: short ? stable : null,
    resetScroll: scrolled || short,
  };
}

export type WindowResizeInput = {
  allowDocumentScroll: boolean;
  editing: boolean;
  keyboardOpen: boolean;
  /** Ignore the resize that iOS fires as the keyboard finishes closing. */
  ignore: boolean;
  visibleHeight: number;
};

/** A real window resize replaces the remembered height. The keyboard must not. */
export function planWindowResize(input: WindowResizeInput): number | null {
  if (input.allowDocumentScroll || input.editing || input.keyboardOpen || input.ignore) return null;
  return input.visibleHeight;
}

const TEXT_INPUT_TYPES = new Set([
  "text",
  "search",
  "email",
  "password",
  "tel",
  "url",
  "number",
  "",
]);

export function isTextEditing(node: EventTarget | null): boolean {
  if (!(node instanceof HTMLElement)) return false;
  if (node.isContentEditable) return true;
  const tag = node.tagName;
  if (tag === "TEXTAREA") return true;
  if (tag !== "INPUT") return false;
  return TEXT_INPUT_TYPES.has((node as HTMLInputElement).type.toLowerCase());
}

function keyboardOpen(): boolean {
  const viewport = window.visualViewport;
  if (!viewport) return false;
  return window.innerHeight - viewport.height > 120;
}

function visibleHeight(): number {
  const viewport = window.visualViewport;
  if (!viewport) return Math.round(window.innerHeight);
  return Math.round(viewport.height + viewport.offsetTop);
}

function appShell(): HTMLElement | null {
  const node = document.querySelector(".app-shell");
  return node instanceof HTMLElement ? node : null;
}

let stableHeight = 0;
let ignoreWindowResizeUntil = 0;

export function repairViewport(): void {
  const shellNode = appShell();
  const viewport = window.visualViewport;
  const plan = planViewportRepair({
    allowDocumentScroll: document.querySelector(".marketing-root") != null,
    editing: isTextEditing(document.activeElement),
    keyboardOpen: keyboardOpen(),
    stableHeight,
    visibleHeight: visibleHeight(),
    shellHeight: shellNode ? Math.round(shellNode.getBoundingClientRect().height) : 0,
    scrollY: Math.round(window.scrollY),
    offsetTop: viewport?.offsetTop ?? 0,
  });
  stableHeight = plan.stableHeight;
  if (!plan.resetScroll && plan.lockHeight == null) return;
  if (plan.resetScroll) {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    if ((window.visualViewport?.offsetTop ?? 0) >= 1) {
      window.scrollTo(0, 1);
      window.scrollTo(0, 0);
    }
  }
  if (plan.lockHeight != null) {
    shellNode?.style.removeProperty("height");
    shellNode?.style.removeProperty("min-height");
    document.documentElement.style.setProperty("--app-height", `${plan.lockHeight}px`);
  }
}

function onWindowResize(): void {
  const next = planWindowResize({
    allowDocumentScroll: document.querySelector(".marketing-root") != null,
    editing: isTextEditing(document.activeElement),
    keyboardOpen: keyboardOpen(),
    ignore: Date.now() < ignoreWindowResizeUntil,
    visibleHeight: visibleHeight(),
  });
  if (next == null) return;
  stableHeight = next;
  document.documentElement.style.removeProperty("--app-height");
  repairViewport();
}

let frame = 0;
let timers: number[] = [];

export function cancelScheduledViewportPin(): void {
  if (typeof window === "undefined") return;
  if (frame) window.cancelAnimationFrame(frame);
  frame = 0;
  for (const id of timers) window.clearTimeout(id);
  timers = [];
}

/** Repair now, on the next frame, and again after the iOS keyboard animation. */
export function scheduleViewportPin(): void {
  if (typeof window === "undefined") return;
  cancelScheduledViewportPin();
  const run = () => {
    if (keyboardOpen() || isTextEditing(document.activeElement)) return;
    repairViewport();
  };
  run();
  frame = window.requestAnimationFrame(run);
  for (const delay of [80, 280, 600]) {
    timers.push(window.setTimeout(run, delay));
  }
}

function onFocusIn(event: FocusEvent): void {
  if (!isTextEditing(event.target)) return;
  // 100dvh may follow the keyboard. The pre-keyboard height stays remembered.
  document.documentElement.style.removeProperty("--app-height");
}

function onFocusOut(): void {
  ignoreWindowResizeUntil = Date.now() + 800;
  scheduleViewportPin();
}

function onOrientation(): void {
  stableHeight = 0;
  document.documentElement.style.removeProperty("--app-height");
  scheduleViewportPin();
}

/** Installed once for the life of the page. Marketing scroll is left alone. */
export function installViewportPin(): () => void {
  const onScroll = () => {
    if (keyboardOpen() || isTextEditing(document.activeElement)) return;
    repairViewport();
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onWindowResize);
  window.addEventListener("orientationchange", onOrientation);
  document.addEventListener("focusin", onFocusIn);
  document.addEventListener("focusout", onFocusOut);
  window.visualViewport?.addEventListener("scroll", onScroll);
  window.visualViewport?.addEventListener("resize", scheduleViewportPin);
  scheduleViewportPin();
  return () => {
    cancelScheduledViewportPin();
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onWindowResize);
    window.removeEventListener("orientationchange", onOrientation);
    document.removeEventListener("focusin", onFocusIn);
    document.removeEventListener("focusout", onFocusOut);
    window.visualViewport?.removeEventListener("scroll", onScroll);
    window.visualViewport?.removeEventListener("resize", scheduleViewportPin);
  };
}
