/**
 * Account export is a click that downloads whatever file the server sends.
 * The bytes are not parsed, cached, or written to localStorage. A download
 * starts only while the same signed-in session is still current.
 */

export type ExportFailureKind = "unauthorized" | "network" | "server";

export interface ExportPayload {
  blob: Blob;
  contentType: string | null;
  contentDisposition: string | null;
  notice: string | null;
}

export interface PreparedExport {
  filename: string;
  blob: Blob;
  notice: string | null;
}

export type ExportResult =
  | { status: "downloaded"; filename: string; notice: string | null }
  | { status: "busy" }
  | { status: "dropped" }
  | { status: "error"; kind: ExportFailureKind };

export function classifyExportError(err: unknown): ExportFailureKind {
  if (err instanceof TypeError) return "network";
  const message = err instanceof Error ? err.message : "";
  if (message.startsWith("Session expired")) return "unauthorized";
  return "server";
}

export function exportErrorMessage(kind: ExportFailureKind): string {
  if (kind === "unauthorized") return "Your session expired. Nothing was downloaded.";
  if (kind === "network") return "Could not reach the server. Nothing was downloaded.";
  return "The export was not downloaded.";
}

/** Server-authored limitation text. Absent unless the response confirms one. */
export function sanitizeExportNotice(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  return cleaned.slice(0, 180);
}

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

function extensionForContentType(contentType: string | null | undefined): string {
  const mime = (contentType ?? "").split(";")[0].trim().toLowerCase();
  if (mime === "application/json" || mime.endsWith("+json")) return ".json";
  if (mime === "application/zip" || mime === "application/x-zip-compressed") return ".zip";
  if (mime === "application/gzip" || mime === "application/x-gzip") return ".gz";
  if (mime === "application/x-tar") return ".tar";
  if (mime === "text/csv" || mime === "application/csv") return ".csv";
  return "";
}

function utcStamp(now: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}` +
    `-${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`
  );
}

export function exportFilename(input: {
  contentType: string | null;
  contentDisposition: string | null;
  now: Date;
}): string {
  const ext = extensionForContentType(input.contentType);
  const fromServer = filenameFromContentDisposition(input.contentDisposition);
  if (fromServer) {
    if (ext && !/\.[A-Za-z0-9]{1,8}$/.test(fromServer)) return `${fromServer}${ext}`;
    return fromServer;
  }
  return `Prysmic-export-${utcStamp(input.now)}${ext}`;
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
    const filename = exportFilename({
      contentType: payload.contentType,
      contentDisposition: payload.contentDisposition,
      now: input.now,
    });
    const notice = sanitizeExportNotice(payload.notice);
    await input.deliver({ filename, blob: payload.blob, notice });
    return { status: "downloaded", filename, notice };
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
