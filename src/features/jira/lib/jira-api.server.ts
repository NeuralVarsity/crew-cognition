const AUTH_BASE = "https://auth.atlassian.com";
const API_BASE = "https://api.atlassian.com";

export const JIRA_SCOPES = [
  "read:jira-work",
  "read:jira-user",
  "offline_access",
].join(" ");

export class JiraError extends Error {
  status: number;
  rateLimited: boolean;
  constructor(status: number, message: string, rateLimited = false) {
    super(message);
    this.status = status;
    this.rateLimited = rateLimited;
  }
}

export type JiraTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
};

export function buildAuthorizeUrl(state: string, redirectUri: string) {
  const clientId = process.env.JIRA_CLIENT_ID;
  if (!clientId) throw new Error("JIRA_CLIENT_ID not configured");
  const params = new URLSearchParams({
    audience: "api.atlassian.com",
    client_id: clientId,
    scope: JIRA_SCOPES,
    redirect_uri: redirectUri,
    state,
    response_type: "code",
    prompt: "consent",
  });
  return `${AUTH_BASE}/authorize?${params.toString()}`;
}

async function tokenRequest(body: Record<string, string>): Promise<JiraTokenResponse> {
  const clientId = process.env.JIRA_CLIENT_ID;
  const clientSecret = process.env.JIRA_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Jira OAuth credentials not configured");
  const res = await fetch(`${AUTH_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, ...body }),
  });
  const json = (await res.json().catch(() => ({}))) as JiraTokenResponse & {
    error?: string;
    error_description?: string;
  };
  if (!res.ok || json.error) {
    throw new JiraError(res.status, `Jira token request failed: ${json.error_description || json.error || res.status}`);
  }
  return json;
}

export function exchangeOAuthCode(code: string, redirectUri: string) {
  return tokenRequest({ grant_type: "authorization_code", code, redirect_uri: redirectUri });
}

export function refreshAccessToken(refreshToken: string) {
  return tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken });
}

export type AccessibleResource = {
  id: string;
  name: string;
  url: string;
  avatarUrl?: string;
  scopes?: string[];
};

export async function getAccessibleResources(token: string): Promise<AccessibleResource[]> {
  const res = await fetch(`${API_BASE}/oauth/token/accessible-resources`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) throw new JiraError(res.status, `Unable to list Jira sites (${res.status})`);
  return (await res.json()) as AccessibleResource[];
}

export async function jira<T>(
  token: string,
  cloudId: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}/ex/jira/${cloudId}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new JiraError(res.status, `Jira ${res.status} ${path}: ${body.slice(0, 300)}`, res.status === 429);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Atlassian Document Format -> plain text. */
export function adfToText(node: unknown, depth = 0): string {
  if (node == null || depth > 12) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map((n) => adfToText(n, depth + 1)).join("");
  const obj = node as { type?: string; text?: string; content?: unknown[] };
  if (obj.text) return obj.text;
  const inner = obj.content ? adfToText(obj.content, depth + 1) : "";
  return obj.type === "paragraph" || obj.type === "heading" ? `${inner}\n` : inner;
}