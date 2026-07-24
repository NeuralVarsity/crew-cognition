const BASE = "https://api.github.com";

export class GithubError extends Error {
  status: number;
  rateLimited: boolean;
  constructor(status: number, message: string, rateLimited = false) {
    super(message);
    this.status = status;
    this.rateLimited = rateLimited;
  }
}

export async function gh<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "TalentAI-Enterprise",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const remaining = res.headers.get("x-ratelimit-remaining");
    const rateLimited = res.status === 403 && remaining === "0";
    throw new GithubError(
      res.status,
      `GitHub ${res.status} ${path}: ${body.slice(0, 300)}`,
      rateLimited,
    );
  }
  return (await res.json()) as T;
}

export async function ghPaginate<T>(
  token: string,
  path: string,
  maxPages = 3,
  perPage = 100,
): Promise<T[]> {
  const results: T[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const sep = path.includes("?") ? "&" : "?";
    const chunk = await gh<T[]>(token, `${path}${sep}per_page=${perPage}&page=${page}`);
    if (!Array.isArray(chunk) || chunk.length === 0) break;
    results.push(...chunk);
    if (chunk.length < perPage) break;
  }
  return results;
}

export async function exchangeOAuthCode(code: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
}> {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("GitHub OAuth credentials not configured");
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
  });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(`Token exchange failed: ${json.error_description || json.error || res.status}`);
  }
  return json;
}

export function buildAuthorizeUrl(state: string, scope = "read:user user:email repo read:org") {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) throw new Error("GITHUB_CLIENT_ID not configured");
  const params = new URLSearchParams({
    client_id: clientId,
    scope,
    state,
    allow_signup: "false",
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}