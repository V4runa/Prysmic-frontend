export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = "http://localhost:3000";
  const token = localStorage.getItem("token");

  const headers = new Headers({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  });

  const res = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (res.status === 401) {
    const errorText = await res.text();
    console.warn("🔒 401 Unauthorized:", errorText);

    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      window.dispatchEvent(new Event("token-expired")); // triggers toast
    }

    throw new Error("Session expired. Redirecting...");
  }

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`API Error: ${res.status} ${res.statusText} - ${error}`);
  }

  const contentLength = res.headers.get("content-length");
  if (contentLength && parseInt(contentLength) > 0) {
    return res.json();
  }

  return null as unknown as T;
}
