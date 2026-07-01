const getBaseUrl = () =>
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

const getToken = () =>
  typeof window !== "undefined" ? localStorage.getItem("token") : null;

// A 401 means the session is gone; clear it and let the app react globally.
function handleUnauthorized(msg: string): never {
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
    window.dispatchEvent(new Event("token-expired"));
  }
  throw new Error(`Session expired. ${msg}`);
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const headers = new Headers({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  });

  const res = await fetch(`${getBaseUrl()}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    handleUnauthorized(await res.text().catch(() => ""));
  }

  if (res.status === 204) {
    return null as unknown as T;
  }

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

/**
 * Upload multipart form data (e.g. file attachments). We deliberately do NOT
 * set Content-Type so the browser can add the correct multipart boundary.
 */
export async function apiUpload<T>(
  endpoint: string,
  formData: FormData,
  options: Omit<RequestInit, "body"> = {}
): Promise<T> {
  const token = getToken();

  const headers = new Headers({
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  });

  const res = await fetch(`${getBaseUrl()}${endpoint}`, {
    method: "POST",
    ...options,
    headers,
    body: formData,
  });

  if (res.status === 401) {
    handleUnauthorized(await res.text().catch(() => ""));
  }

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
  const token = getToken();

  const res = await fetch(`${getBaseUrl()}${endpoint}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (res.status === 401) {
    handleUnauthorized(await res.text().catch(() => ""));
  }

  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }

  return res.blob();
}
