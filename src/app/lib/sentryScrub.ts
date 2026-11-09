/**
 * Privacy scrubber for Sentry events.
 * Note text, task text, mood text, emails, passwords, request bodies,
 * cookies, auth headers, and query strings must not leave the browser.
 */

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

const SUBSTRING_KEYS = [
  "password",
  "passwd",
  "secret",
  "token",
  "authorization",
  "cookie",
  "email",
  "note",
  "mood",
  "task",
  "reflection",
  "query",
  "search",
  "journal",
  "markdown",
  "plaintext",
  "body",
  "fragment",
  "forwarded",
];

const EXACT_KEYS = new Set([
  "pwd",
  "ip",
  "text",
  "title",
  "html",
  "content",
  "message",
  "description",
  "input",
  "vars",
  "arguments",
  "session",
  "ipaddress",
  "clientip",
  "remoteip",
  "userip",
  "realip",
]);

const HTTP_METHOD = /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+/i;

export const SENTRY_TRACES_SAMPLE_RATE = 0.1;

export function readSentryDsn(value: string | undefined | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const dsn = value.trim();
  return dsn ? dsn : undefined;
}

export function readSentryEnvironment(
  vercelEnv: string | undefined | null,
  nodeEnv: string | undefined | null,
): string {
  if (typeof vercelEnv === "string" && vercelEnv.trim()) return vercelEnv.trim();
  if (typeof nodeEnv === "string" && nodeEnv.trim()) return nodeEnv.trim();
  return "development";
}

export function redactEmails(value: string): string {
  return value.replace(EMAIL, "[email]");
}

export function stripUrlQuery(value: string): string {
  const method = value.match(HTTP_METHOD);
  const prefix = method ? method[0] : "";
  const rest = method ? value.slice(prefix.length) : value;
  try {
    if (rest.startsWith("http://") || rest.startsWith("https://")) {
      const url = new URL(rest);
      url.search = "";
      url.hash = "";
      url.username = "";
      url.password = "";
      return prefix + url.toString();
    }
    if (rest.startsWith("/")) {
      const url = new URL(rest, "https://prysmic.local");
      url.search = "";
      url.hash = "";
      return prefix + url.pathname;
    }
  } catch {
    // Fall through to a plain cut.
  }
  const cut = rest.search(/[?#]/);
  return prefix + (cut === -1 ? rest : rest.slice(0, cut));
}

function navigationPath(value: string): string {
  const stripped = stripUrlQuery(value);
  try {
    if (stripped.startsWith("http://") || stripped.startsWith("https://")) {
      return redactEmails(new URL(stripped).pathname);
    }
  } catch {
    // Keep the stripped value.
  }
  return redactEmails(stripped);
}

function normalizedKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isUserContentKey(key: string): boolean {
  const normalized = normalizedKey(key);
  if (EXACT_KEYS.has(normalized)) return true;
  return SUBSTRING_KEYS.some((term) => normalized.includes(term));
}

function isUrlKey(key: string): boolean {
  const normalized = normalizedKey(key);
  return (
    normalized === "url" ||
    normalized === "from" ||
    normalized === "to" ||
    normalized === "location" ||
    normalized === "path" ||
    normalized.endsWith("url")
  );
}

function isSensitiveHeader(name: string): boolean {
  const normalized = normalizedKey(name);
  return (
    normalized === "cookie" ||
    normalized === "setcookie" ||
    normalized === "authorization" ||
    normalized === "proxyauthorization" ||
    normalized.includes("authorization") ||
    normalized.includes("cookie") ||
    normalized.includes("token") ||
    normalized.includes("password") ||
    normalized.includes("secret") ||
    normalized.includes("apikey") ||
    normalized.includes("forwarded") ||
    normalized.includes("realip") ||
    normalized.includes("email")
  );
}

function scrubPossibleUrl(value: string): string {
  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("/") ||
    HTTP_METHOD.test(value)
  ) {
    return redactEmails(stripUrlQuery(value));
  }
  return redactEmails(value);
}

function scrubHeaders(headers: unknown): void {
  if (Array.isArray(headers)) {
    for (let index = headers.length - 1; index >= 0; index -= 1) {
      const entry = headers[index];
      const name = Array.isArray(entry) ? entry[0] : undefined;
      if (typeof name === "string" && isSensitiveHeader(name)) headers.splice(index, 1);
    }
    return;
  }
  if (!headers || typeof headers !== "object") return;
  const record = headers as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (isSensitiveHeader(key)) delete record[key];
  }
}

function scrubRecord(record: Record<string, unknown>, depth = 0): void {
  if (depth > 8) return;
  const payloadLike =
    "url" in record ||
    "method" in record ||
    "headers" in record ||
    "cookies" in record ||
    "query_string" in record ||
    "status_code" in record;
  if (payloadLike) {
    delete record.data;
    delete record.body;
    delete record.cookies;
    delete record.query_string;
    delete record.queryString;
    delete record.env;
    delete record.fragment;
    if (typeof record.url === "string") record.url = scrubPossibleUrl(record.url);
    if (record.headers) scrubHeaders(record.headers);
  }

  for (const key of Object.keys(record)) {
    if (isUserContentKey(key)) {
      delete record[key];
      continue;
    }
    const value = record[key];
    if (normalizedKey(key) === "headers") {
      scrubHeaders(value);
      continue;
    }
    if (typeof value === "string") {
      record[key] = isUrlKey(key) ? redactEmails(stripUrlQuery(value)) : scrubPossibleUrl(value);
    } else if (Array.isArray(value)) {
      scrubArray(value, depth + 1);
    } else if (value && typeof value === "object") {
      scrubRecord(value as Record<string, unknown>, depth + 1);
    }
  }
}

function scrubArray(values: unknown[], depth: number): void {
  if (depth > 8) return;
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (typeof value === "string") values[index] = scrubPossibleUrl(value);
    else if (Array.isArray(value)) scrubArray(value, depth + 1);
    else if (value && typeof value === "object") scrubRecord(value as Record<string, unknown>, depth + 1);
  }
}

type BreadcrumbLike = {
  category?: string;
  type?: string;
  message?: string;
  data?: Record<string, unknown>;
  level?: string;
};

function isInputBreadcrumb(category: string, type: string): boolean {
  return category === "ui.input" || type === "ui.input" || category.startsWith("ui.input");
}

function isConsoleBreadcrumb(category: string, type: string): boolean {
  return category === "console" || type === "console";
}

function isNavigationBreadcrumb(category: string, type: string): boolean {
  return category === "navigation" || type === "navigation";
}

function isClickBreadcrumb(category: string, type: string): boolean {
  return category === "ui.click" || type === "ui.click";
}

export function scrubBreadcrumb<T extends BreadcrumbLike>(breadcrumb: T): T | null {
  const category = breadcrumb.category ?? "";
  const type = breadcrumb.type ?? "";
  if (isInputBreadcrumb(category, type)) return null;

  if (isConsoleBreadcrumb(category, type) || isClickBreadcrumb(category, type)) {
    const next = { ...breadcrumb };
    delete next.data;
    delete next.message;
    return next;
  }

  if (isNavigationBreadcrumb(category, type)) {
    const data: Record<string, unknown> = {};
    const source = breadcrumb.data ?? {};
    if (typeof source.from === "string") data.from = navigationPath(source.from);
    if (typeof source.to === "string") data.to = navigationPath(source.to);
    const next = { ...breadcrumb, data };
    if (typeof breadcrumb.message === "string") next.message = navigationPath(breadcrumb.message);
    else delete next.message;
    return next;
  }

  const next = { ...breadcrumb };
  if (next.data && typeof next.data === "object") {
    const data = { ...next.data };
    scrubRecord(data);
    next.data = data;
  }
  if (typeof next.message === "string") next.message = scrubPossibleUrl(next.message);
  return next;
}

type SpanLike = {
  description?: string;
  name?: string;
  data?: Record<string, unknown>;
  attributes?: Record<string, unknown>;
};

export function scrubSpan<T extends SpanLike>(span: T): T {
  if (typeof span.description === "string") span.description = scrubPossibleUrl(span.description);
  if (typeof span.name === "string") span.name = scrubPossibleUrl(span.name);
  if (span.data && typeof span.data === "object") scrubRecord(span.data);
  if (span.attributes && typeof span.attributes === "object") scrubRecord(span.attributes);
  return span;
}

function scrubUser(user: Record<string, unknown>): void {
  delete user.email;
  delete user.ip_address;
  delete user.ipAddress;
  delete user.geo;
  if (typeof user.username === "string" && user.username.includes("@")) delete user.username;
}

function scrubException(exception: unknown): void {
  if (!exception || typeof exception !== "object") return;
  const values = (exception as { values?: unknown }).values;
  if (!Array.isArray(values)) return;
  for (const item of values) {
    if (!item || typeof item !== "object") continue;
    const entry = item as { value?: unknown; stacktrace?: { frames?: unknown } };
    if (typeof entry.value === "string") entry.value = redactEmails(entry.value);
    const frames = entry.stacktrace?.frames;
    if (!Array.isArray(frames)) continue;
    for (const frame of frames) {
      if (frame && typeof frame === "object") delete (frame as { vars?: unknown }).vars;
    }
  }
}

export function scrubSentryEvent<T>(event: T): T {
  if (!event || typeof event !== "object") return event;
  const record = event as Record<string, unknown>;

  if (typeof record.message === "string") record.message = redactEmails(record.message);
  if (typeof record.transaction === "string") record.transaction = scrubPossibleUrl(record.transaction);
  if (record.logentry && typeof record.logentry === "object") {
    const logentry = record.logentry as { message?: unknown };
    if (typeof logentry.message === "string") logentry.message = redactEmails(logentry.message);
  }

  if (record.request && typeof record.request === "object") {
    scrubRecord(record.request as Record<string, unknown>);
  }
  if (record.user && typeof record.user === "object") scrubUser(record.user as Record<string, unknown>);
  if (record.extra && typeof record.extra === "object") scrubRecord(record.extra as Record<string, unknown>);
  if (record.contexts && typeof record.contexts === "object") {
    scrubRecord(record.contexts as Record<string, unknown>);
  }
  if (record.tags && typeof record.tags === "object") scrubRecord(record.tags as Record<string, unknown>);
  scrubException(record.exception);

  if (Array.isArray(record.breadcrumbs)) {
    record.breadcrumbs = record.breadcrumbs
      .map((breadcrumb) =>
        breadcrumb && typeof breadcrumb === "object"
          ? scrubBreadcrumb(breadcrumb as BreadcrumbLike)
          : null,
      )
      .filter((breadcrumb) => breadcrumb != null);
  }
  if (Array.isArray(record.spans)) {
    for (const span of record.spans) {
      if (span && typeof span === "object") scrubSpan(span as SpanLike);
    }
  }

  return event;
}
