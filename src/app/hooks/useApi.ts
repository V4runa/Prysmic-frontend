export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = "http://localhost:5000";

  const token = localStorage.getItem("token");

  const headers = new Headers({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  });

  const res = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers,
  });

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
