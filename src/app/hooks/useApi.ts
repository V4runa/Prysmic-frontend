export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = new Headers({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  });

  const res = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    const msg = await res.text().catch(() => "");
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      window.dispatchEvent(new Event("token-expired"));
    }
    throw new Error(`Session expired. ${msg}`);
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
