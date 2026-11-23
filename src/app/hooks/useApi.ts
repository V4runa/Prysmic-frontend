import {
  EXPORT_MAX_BYTES,
  exportBodyWithinLimit,
  exportRequestStillCurrent,
  finishUnauthorizedExport,
  isAccountExportContentType,
  readBoundedExportBody,
  shouldSaveExportBody,
} from "../lib/dataExport";
import {
  apiBaseUrl,
  isCredentialRejection,
  isRefreshExemptPath,
  isSessionRefreshPaused,
  refreshAccessSession,
  requestNeedsSessionCookie,
} from "../lib/refreshSession";
import { currentSessionEpoch } from "../lib/sessionBoundary";
import { discardExpiredAccessToken } from "../lib/storedSession";

const getBaseUrl = () => apiBaseUrl();

const getToken = () =>
  typeof window !== "undefined" ? localStorage.getItem("token") : null;

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  readonly retryAfter: string | null;

  constructor(
    status: number,
    statusText: string,
    body: unknown,
    retryAfter: string | null
  ) {
    const detail = typeof body === "string" ? body : JSON.stringify(body);
    super(`API Error: ${status} ${statusText} - ${detail}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
    this.retryAfter = retryAfter;
  }
}

type ApiInit = RequestInit & {
  auth?: boolean;
  /** Account deletion uses 401 for a wrong password. Leave the session in place. */
  keepSessionOn401?: boolean;
};

function buildHeaders(token: string | null, headerInit?: HeadersInit): Headers {
  const headers = new Headers({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });
  if (headerInit) {
    new Headers(headerInit).forEach((value, key) => {
      headers.set(key, value);
    });
  }
  return headers;
}

function readBody(res: Response): Promise<unknown> {
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json")
    ? res.json().catch(() => null)
    : res.text().catch(() => "");
}

// A 401 that refresh could not repair. The draft stays; the shell sends them to sign in.
function handleUnauthorized(msg: string): never {
  discardExpiredAccessToken();
  throw new Error(`Session expired. ${msg}`);
}

async function peekBody(res: Response): Promise<unknown> {
  try {
    const clone = res.clone();
    const ct = clone.headers.get("content-type") || "";
    if (ct.includes("application/json")) return await clone.json().catch(() => null);
    const text = await clone.text().catch(() => "");
    if (!text) return null;
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  } catch {
    return null;
  }
}

type SendOpts = {
  endpoint: string;
  method: string;
  auth: boolean;
  keepSessionOn401: boolean;
  headers?: HeadersInit;
  body?: BodyInit | null;
  cache?: RequestCache;
  form?: boolean;
  signal?: AbortSignal | null;
  retried?: boolean;
};

/**
 * One 401 from a normal call refreshes once and retries. A second 401, or a
 * refresh that fails, uses the existing sign-in redirect. Wrong-password 401s
 * stay on the form. Login and other credential posts are not retried.
 */
async function send(opts: SendOpts): Promise<Response> {
  const token = opts.auth ? getToken() : null;
  const headers = opts.form
    ? new Headers(opts.headers)
    : buildHeaders(token, opts.headers);
  if (opts.form && token) headers.set("Authorization", `Bearer ${token}`);

  const init: RequestInit = {
    method: opts.method,
    headers,
    body: opts.body ?? undefined,
    cache: opts.cache,
    signal: opts.signal ?? undefined,
  };
  if (requestNeedsSessionCookie(opts.endpoint, opts.method)) {
    init.credentials = "include";
  }

  const res = await fetch(`${getBaseUrl()}${opts.endpoint}`, init);
  if (res.status !== 401) return res;

  if (isSessionRefreshPaused()) {
    throw new Error("Session expired.");
  }

  const recoverable =
    opts.auth && !opts.retried && !isRefreshExemptPath(opts.endpoint);

  if (recoverable) {
    if (opts.keepSessionOn401 && isCredentialRejection(await peekBody(res))) {
      return res;
    }
    const refreshed = await refreshAccessSession(token);
    if (!refreshed.ok && (refreshed.reason === "paused" || isSessionRefreshPaused())) {
      throw new Error("Session expired.");
    }
    if (isSessionRefreshPaused()) {
      throw new Error("Session expired.");
    }
    if (refreshed.ok) {
      return send({ ...opts, retried: true });
    }
    if (opts.keepSessionOn401) return res;
  }

  if (opts.keepSessionOn401) return res;

  handleUnauthorized(await res.text().catch(() => ""));
}

export async function apiFetch<T>(
  endpoint: string,
  options: ApiInit = {}
): Promise<T> {
  const { auth = true, keepSessionOn401 = false, headers: headerInit, method, body, cache, signal } = options;

  const res = await send({
    endpoint,
    method: method ?? "GET",
    auth,
    keepSessionOn401,
    headers: headerInit,
    body: body ?? null,
    cache,
    signal,
  });

  if (res.status === 204) {
    return null as unknown as T;
  }

  const responseBody = await readBody(res);

  if (!res.ok) {
    throw new ApiError(
      res.status,
      res.statusText,
      responseBody,
      res.headers.get("retry-after")
    );
  }

  return responseBody as T;
}

/**
 * Upload multipart form data (e.g. file attachments). We deliberately do NOT
 * set Content-Type so the browser can add the correct multipart boundary.
 */
export async function apiUpload<T>(
  endpoint: string,
  formData: FormData,
  options: Omit<RequestInit, "body"> = {}
): Promise<T> {
  const res = await send({
    endpoint,
    method: options.method ?? "POST",
    auth: true,
    keepSessionOn401: false,
    headers: options.headers,
    body: formData,
    cache: options.cache,
    form: true,
  });

  const ct = res.headers.get("content-type") || "";
  const body = ct.includes("application/json")
    ? await res.json().catch(() => null)
    : await res.text().catch(() => "");

  if (!res.ok) {
    throw new Error(
      `API Error: ${res.status} ${res.statusText} - ${
        typeof body === "string" ? body : JSON.stringify(body)
      }`
    );
  }

  return body as T;
}

/** Fetch a binary resource (e.g. an attachment) as a Blob, with auth. */
export async function apiFetchBlob(endpoint: string): Promise<Blob> {
  const res = await send({
    endpoint,
    method: "GET",
    auth: true,
    keepSessionOn401: false,
  });

  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }

  return res.blob();
}

/**
 * Authenticated JSON download. Only application/json is saved.
 * A 401 clears the session only when this request's token and epoch are still current.
 */
export async function apiFetchDownload(endpoint: string): Promise<{
  blob: Blob;
  contentType: string | null;
  contentDisposition: string | null;
}> {
  let startedToken = getToken();
  const startedEpoch = currentSessionEpoch();

  const load = (token: string | null) =>
    fetch(`${getBaseUrl()}${endpoint}`, {
      method: "GET",
      cache: "no-store",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

  let res = await load(startedToken);

  if (
    res.status === 401 &&
    currentSessionEpoch() === startedEpoch &&
    !isSessionRefreshPaused()
  ) {
    await res.body?.cancel().catch(() => undefined);
    const refreshed = await refreshAccessSession(startedToken);
    if (currentSessionEpoch() !== startedEpoch || isSessionRefreshPaused()) {
      throw new Error("Session expired.");
    }
    if (refreshed.ok) {
      startedToken = refreshed.accessToken;
      res = await load(startedToken);
    }
  }

  if (res.status === 401) {
    await finishUnauthorizedExport({
      body: res.body,
      startedEpoch,
      startedToken,
      readAuth: () => ({ epoch: currentSessionEpoch(), token: getToken() }),
      onUnauthorized: (message) => handleUnauthorized(message),
    });
    throw new Error("Session expired.");
  }

  if (!shouldSaveExportBody(res.status)) {
    await res.body?.cancel().catch(() => undefined);
    throw new Error(`API Error: ${res.status}`);
  }

  const contentType = res.headers.get("content-type");
  if (!isAccountExportContentType(contentType)) {
    await res.body?.cancel().catch(() => undefined);
    throw new Error("API Error: 200");
  }

  const lengthHeader = res.headers.get("content-length");
  if (lengthHeader != null && !exportBodyWithinLimit(Number(lengthHeader))) {
    await res.body?.cancel().catch(() => undefined);
    throw new Error("API Error: 413");
  }

  const blob = await readBoundedExportBody(res.body, EXPORT_MAX_BYTES, () =>
    exportRequestStillCurrent({
      startedEpoch,
      startedToken,
      currentEpoch: currentSessionEpoch(),
      currentToken: getToken(),
    }),
  );

  return {
    blob,
    contentType,
    contentDisposition: res.headers.get("content-disposition"),
  };
}
