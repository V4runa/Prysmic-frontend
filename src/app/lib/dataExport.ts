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
  "JSON file download started. Attachment files are not included, and this file is not imported.";

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
  const fromServer = filenameFromContentDisposition(input.contentDisposition);
  if (fromServer) {
    if (/\.[A-Za-z0-9]{1,8}$/.test(fromServer)) return fromServer;
    return `${fromServer}.json`;
  }
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
    const fromHeader = filenameFromContentDisposition(payload.contentDisposition);
    const filename = accountExportFilename({
      contentDisposition: payload.contentDisposition,
      exportedAt: fromHeader ? null : await exportedAtFromBlob(payload.blob),
      now: input.now,
    });
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
