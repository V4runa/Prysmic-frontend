/** A save that is still going after this is treated as a failure. */
export const SAVE_DEADLINE_MS = 10_000;

export function saveDeadline(ms = SAVE_DEADLINE_MS): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timer),
  };
}

export function saveGaveUp(err: unknown): boolean {
  return err instanceof DOMException
    ? err.name === "AbortError"
    : err instanceof Error && err.name === "AbortError";
}
