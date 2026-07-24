// Base API client wrapper. Extended per-service in src/features/*/api.
export type ApiOptions = RequestInit & { baseUrl?: string };

export async function apiFetch<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { baseUrl = "", headers, ...rest } = opts;
  const res = await fetch(`${baseUrl}${path}`, {
    ...rest,
    headers: { "Content-Type": "application/json", ...headers },
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}