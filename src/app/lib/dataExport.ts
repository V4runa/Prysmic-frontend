/**
 * Account export is a click that downloads whatever file the server sends.
 * The bytes are not parsed, cached, or written to localStorage. A download
 * starts only while the same signed-in session is still current.
 */

export type ExportFailureKind = "unauthorized" | "network" | "too-large" | "server";

export interface ExportPayload {
  blob: Blob;
  contentType: string | null;
  contentDisposition: string | null;
}

export interface PreparedExport {
  filename: string;
  blob: Blob;
}

export type ExportResult =
  | { status: "downloaded"; filename: string }
  | { status: "busy" }
  | { status: "dropped" }
  | { status: "error"; kind: ExportFailureKind };

/** A non-2xx body is an error, not a partial snapshot. Never save it. */
export function shouldSaveExportBody(status: number): boolean {
  return status >= 200 && status < 300;
}

export function classifyExportError(err: unknown): ExportFailureKind {
  if (err instanceof TypeError) return "network";
  const message = err instanceof Error ? err.message : "";
  if (message.startsWith("Session expired")) return "unauthorized";
  if (/\b413\b/.test(message)) return "too-large";
  return "server";
}

export function exportErrorMessage(kind: ExportFailureKind): string {
  if (kind === "unauthorized") return "Your session expired. Nothing was downloaded.";
  if (kind === "network") return "Could not reach the server. Nothing was downloaded.";
  if (kind === "too-large") {
    return "This account is too large for one JSON file. Nothing was downloaded.";
  }
  return "The JSON file was not downloaded.";
}

export const EXPORT_ABOUT =
  "Downloads a JSON file of this account: writing, tags, tasks, habits, moods, and calendar events. Attachment files are not included. This is not a backup of those files, and Prysmic does not import it.";

export const EXPORT_DOWNLOAD_MESSAGE =
  "JSON file download started. Attachment files are not included.";

/** Client delivery rail. Collection ceilings stay on the server. */
export const EXPORT_MAX_BYTES = 64 * 1024 * 1024;

export function sanitizeExportFilename(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/^["']|["']$/g, "");
  const base = trimmed.replace(/\\/g, "/").split("/").pop()?.trim() ?? "";
  if (!base || base === "." || base === "..") return null;
  if (base.length > 160) return null;
  if (/[\u0000-\u001f\u007f]/.test(base)) return null;
  if (/^[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}$/.test(base)) return null;
  return base;
}

/**
 * A download name may only be a JSON file. `login.html` and any other
 * extension are discarded so a 200 HTML body cannot be saved under that name.
 */
export function safeJsonExportFilename(raw: string | null | undefined): string | null {
  const base = sanitizeExportFilename(raw);
  if (!base) return null;
  if (/\.[A-Za-z0-9]{1,8}$/.test(base)) {
    if (!/\.json$/i.test(base)) return null;
    const stem = base.slice(0, -5);
    if (!stem || stem === "." || stem === "..") return null;
    return `${stem}.json`;
  }
  return `${base}.json`;
}

export function isAccountExportContentType(header: string | null | undefined): boolean {
  if (!header) return false;
  const parts = header.split(";").map((part) => part.trim()).filter(Boolean);
  if (parts[0]?.toLowerCase() !== "application/json") return false;
  for (const part of parts.slice(1)) {
    const [key, value = ""] = part.split("=");
    if (key.trim().toLowerCase() !== "charset") continue;
    if (value.trim().toLowerCase().replace(/^"|"$/g, "") !== "utf-8") return false;
  }
  return true;
}

export function exportBodyWithinLimit(size: number | null | undefined): boolean {
  if (size == null || !Number.isFinite(size)) return true;
  return size >= 0 && size <= EXPORT_MAX_BYTES;
}

/** The request's own token is still the one in storage. Logout and a new login are not. */
export function exportRequestStillCurrent(input: {
  startedEpoch: number;
  startedToken: string | null;
  currentEpoch: number;
  currentToken: string | null;
}): boolean {
  if (input.currentEpoch !== input.startedEpoch) return false;
  if (input.startedToken == null) return false;
  return input.currentToken === input.startedToken;
}

/**
 * Count decoded bytes and cancel the stream as soon as the cap is crossed.
 * Chunks already queued are dropped, and nothing past the cap is kept.
 * `stillCurrent` is read after every chunk so a logout stops the read.
 */
export async function readBoundedExportBody(
  stream: ReadableStream<Uint8Array> | null,
  maxBytes: number,
  stillCurrent: () => boolean = () => true,
): Promise<Blob> {
  if (!stream) return new Blob([]);
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  const discard = () => {
    chunks.length = 0;
  };
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (!stillCurrent()) {
        discard();
        await reader.cancel().catch(() => undefined);
        throw new Error("Export dropped.");
      }
      if (done) break;
      const bytes = value?.byteLength ?? 0;
      if (bytes === 0) continue;
      if (total + bytes > maxBytes) {
        discard();
        await reader.cancel().catch(() => undefined);
        throw new Error("API Error: 413");
      }
      chunks.push(value);
      total += bytes;
    }
    return new Blob(chunks as BlobPart[]);
  } catch (error) {
    discard();
    await reader.cancel().catch(() => undefined);
    throw error;
  }
}

/**
 * Read a 401 body first, then decide. The session can change while the body
 * is still arriving, so the token and epoch are read again immediately
 * before any sign-out side effect.
 */
export async function finishUnauthorizedExport(input: {
  body: ReadableStream<Uint8Array> | null;
  startedEpoch: number;
  startedToken: string | null;
  readAuth: () => { epoch: number; token: string | null };
  onUnauthorized: (message: string) => void;
}): Promise<void> {
  let message = "";
  try {
    const blob = await readBoundedExportBody(input.body, 8192);
    message = (await blob.text()).slice(0, 300);
  } catch {
    message = "";
  }
  const auth = input.readAuth();
  if (
    shouldApplyExportUnauthorized({
      startedEpoch: input.startedEpoch,
      startedToken: input.startedToken,
      currentEpoch: auth.epoch,
      currentToken: auth.token,
    })
  ) {
    input.onUnauthorized(message);
  }
}

/**
 * A 401 may clear the token only for the session that sent the request.
 * Logout or a later login must not be signed out by the old response.
 */
export function shouldApplyExportUnauthorized(input: {
  startedEpoch: number;
  startedToken: string | null;
  currentEpoch: number;
  currentToken: string | null;
}): boolean {
  if (input.currentEpoch !== input.startedEpoch) return false;
  if (input.startedToken == null) return false;
  return input.currentToken == null || input.currentToken === input.startedToken;
}

/** Prefer RFC 5987 filename* over filename. Unsafe names are discarded. */
export function filenameFromContentDisposition(header: string | null | undefined): string | null {
  if (!header) return null;
  const star = /filename\*\s*=\s*(?:UTF-8''|utf-8'')([^;]+)/i.exec(header);
  if (star) {
    const encoded = star[1].trim().replace(/^["']|["']$/g, "");
    try {
      return sanitizeExportFilename(decodeURIComponent(encoded));
    } catch {
      return null;
    }
  }
  const quoted = /filename\s*=\s*"([^"]*)"/i.exec(header);
  if (quoted) return sanitizeExportFilename(quoted[1]);
  const plain = /filename\s*=\s*([^;]+)/i.exec(header);
  if (plain) return sanitizeExportFilename(plain[1]);
  return null;
}

function utcDay(now: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}`;
}

/** `exportedAt` is an ISO instant. Only its UTC calendar day is used in the name. */
export function exportDay(exportedAt: string | null | undefined): string | null {
  if (!exportedAt) return null;
  const match = /^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}:\d{2}/.exec(exportedAt);
  return match ? match[1] : null;
}

/**
 * Content-Disposition is not a CORS-safelisted header. When api.prysmic.me
 * does not expose it, the name is rebuilt as prysmic-export-YYYY-MM-DD.json.
 */
export function accountExportFilename(input: {
  contentDisposition: string | null;
  exportedAt?: string | null;
  now: Date;
}): string {
  const fromServer = safeJsonExportFilename(filenameFromContentDisposition(input.contentDisposition));
  if (fromServer) return fromServer;
  return `prysmic-export-${exportDay(input.exportedAt) ?? utcDay(input.now)}.json`;
}

/** Read only the opening of a successful JSON blob. Failure leaves the name to the clock. */
export async function exportedAtFromBlob(blob: Blob): Promise<string | null> {
  try {
    const head = await blob.slice(0, 480).text();
    const match = /"exportedAt"\s*:\s*"([^"]+)"/.exec(head);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export type ExportSession = { epoch: number; owner: number | null };

/** A file is offered only to the session that asked for it. */
export function shouldDeliverExport(started: ExportSession, current: ExportSession): boolean {
  if (started.epoch !== current.epoch) return false;
  if (started.owner == null || current.owner == null) return false;
  return started.owner === current.owner;
}

/**
 * One export at a time. The blob is handed to `deliver` only when the session
 * that started the request is still the signed-in account.
 */
export async function runAccountExport(input: {
  lock: { current: boolean };
  started: ExportSession;
  readSession: () => ExportSession;
  now: Date;
  fetchExport: () => Promise<ExportPayload>;
  deliver: (file: PreparedExport) => void | Promise<void>;
}): Promise<ExportResult> {
  if (input.lock.current) return { status: "busy" };
  input.lock.current = true;
  try {
    const payload = await input.fetchExport();
    if (!shouldDeliverExport(input.started, input.readSession())) {
      return { status: "dropped" };
    }
    if (!isAccountExportContentType(payload.contentType)) {
      return { status: "error", kind: "server" };
    }
    if (!exportBodyWithinLimit(payload.blob.size)) {
      return { status: "error", kind: "too-large" };
    }
    let filename = safeJsonExportFilename(filenameFromContentDisposition(payload.contentDisposition));
    if (!filename) {
      const exportedAt = await exportedAtFromBlob(payload.blob);
      if (!shouldDeliverExport(input.started, input.readSession())) {
        return { status: "dropped" };
      }
      filename = accountExportFilename({
        contentDisposition: null,
        exportedAt,
        now: input.now,
      });
    }
    if (!shouldDeliverExport(input.started, input.readSession())) {
      return { status: "dropped" };
    }
    await input.deliver({ filename, blob: payload.blob });
    return { status: "downloaded", filename };
  } catch (err) {
    return { status: "error", kind: classifyExportError(err) };
  } finally {
    input.lock.current = false;
  }
}

/** Start a browser download without putting the file or the token in storage. */
export function deliverExportFile(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
