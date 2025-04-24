export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = "http://localhost:5000";

  const headers = new Headers({
    "Content-Type": "application/json",
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

  return res.json();
}
