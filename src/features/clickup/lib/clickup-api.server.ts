const AUTH_BASE = "https://app.clickup.com/api";
const API_BASE = "https://api.clickup.com/api/v2";

export class ClickUpError extends Error {
  status: number;
  rateLimited: boolean;
  constructor(status: number, message: string, rateLimited = false) {
    super(message);
    this.status = status;
    this.rateLimited = rateLimited;
  }
}

export type ClickUpTokenResponse = { access_token: string; token_type?: string };

export function buildAuthorizeUrl(state: string, redirectUri: string) {
  const clientId = process.env.CLICKUP_CLIENT_ID;
  if (!clientId) throw new Error("CLICKUP_CLIENT_ID not configured");
  const params = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, state });
  return `${AUTH_BASE}?${params.toString()}`;
}

export async function exchangeOAuthCode(code: string, redirectUri: string): Promise<ClickUpTokenResponse> {
  const clientId = process.env.CLICKUP_CLIENT_ID;
  const clientSecret = process.env.CLICKUP_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("ClickUp OAuth credentials not configured");
  const res = await fetch(`${API_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri }),
  });
  const json = (await res.json().catch(() => ({}))) as ClickUpTokenResponse & { err?: string; ECODE?: string };
  if (!res.ok || !json.access_token) {
    throw new ClickUpError(res.status, `ClickUp token exchange failed: ${json.err ?? res.status}`);
  }
  return json;
}

/** ClickUp personal/OAuth tokens do not expire; validating is the refresh equivalent. */
export async function validateToken(token: string) {
  return clickup<{ user: ClickUpUser }>(token, "/user");
}

export type RateCounter = { calls: number };

export async function clickup<T>(
  token: string,
  path: string,
  init?: RequestInit & { counter?: RateCounter; retries?: number },
): Promise<T> {
  const retries = init?.retries ?? 3;
  let attempt = 0;
  // Retry on rate limits and transient network/server failures.
  for (;;) {
    attempt += 1;
    if (init?.counter) init.counter.calls += 1;
    let res: Response;
    try {
      res = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: token,
          ...(init?.headers ?? {}),
        },
      });
    } catch (e) {
      if (attempt > retries) throw new ClickUpError(0, `ClickUp network error on ${path}: ${(e as Error).message}`);
      await sleep(500 * attempt);
      continue;
    }

    if (res.status === 429) {
      if (attempt > retries) throw new ClickUpError(429, `ClickUp rate limit exceeded on ${path}`, true);
      const reset = Number(res.headers.get("x-ratelimit-reset"));
      const waitMs = Number.isFinite(reset) && reset > 0 ? Math.min(30_000, reset * 1000) : 1500 * attempt;
      await sleep(waitMs);
      continue;
    }

    if (res.status >= 500 && attempt <= retries) {
      await sleep(600 * attempt);
      continue;
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new ClickUpError(res.status, `ClickUp ${res.status} ${path}: ${body.slice(0, 300)}`);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------- API shapes ----------
export type ClickUpUser = {
  id: number | string;
  username?: string;
  email?: string;
  color?: string;
  profilePicture?: string | null;
  initials?: string;
};

export type ClickUpTeam = {
  id: string;
  name: string;
  color?: string;
  avatar?: string | null;
  members?: Array<{ user: ClickUpUser & { role?: number; role_key?: string }; invited_by?: ClickUpUser }>;
};

export type ClickUpSpace = {
  id: string;
  name: string;
  private?: boolean;
  archived?: boolean;
  color?: string | null;
  avatar?: string | null;
  statuses?: Array<{ status: string; type: string }>;
};

export type ClickUpFolder = {
  id: string;
  name: string;
  hidden?: boolean;
  archived?: boolean;
  task_count?: string | number;
};

export type ClickUpList = {
  id: string;
  name: string;
  content?: string;
  archived?: boolean;
  task_count?: number;
  due_date?: string | null;
  start_date?: string | null;
  status?: { status?: string } | null;
  folder?: { id: string; hidden?: boolean } | null;
  space?: { id: string } | null;
};

export type ClickUpTask = {
  id: string;
  custom_id?: string | null;
  name: string;
  text_content?: string | null;
  description?: string | null;
  url?: string;
  archived?: boolean;
  status?: { status?: string; type?: string } | null;
  priority?: { priority?: string; orderindex?: string | number } | null;
  tags?: Array<{ name: string }>;
  assignees?: ClickUpUser[];
  watchers?: ClickUpUser[];
  creator?: ClickUpUser | null;
  parent?: string | null;
  due_date?: string | null;
  start_date?: string | null;
  date_created?: string | null;
  date_updated?: string | null;
  date_closed?: string | null;
  date_done?: string | null;
  time_estimate?: number | null;
  time_spent?: number | null;
  list?: { id: string } | null;
  folder?: { id: string } | null;
  space?: { id: string } | null;
  checklists?: Array<{
    id: string;
    name: string;
    resolved?: number;
    unresolved?: number;
    items?: Array<{ id: string; name: string; resolved?: boolean; assignee?: ClickUpUser | null }>;
  }>;
  attachments?: Array<{
    id: string;
    title?: string;
    extension?: string;
    mimetype?: string;
    size?: number | string;
    url?: string;
    thumbnail_small?: string | null;
    date?: string | null;
    user?: ClickUpUser | null;
  }>;
};

export type ClickUpComment = {
  id: string;
  comment_text?: string;
  user?: ClickUpUser | null;
  resolved?: boolean;
  date?: string | null;
};

export type ClickUpTimeEntry = {
  id: string;
  task?: { id: string } | null;
  user?: ClickUpUser | null;
  billable?: boolean;
  duration?: string | number;
  description?: string;
  start?: string | number | null;
  end?: string | number | null;
};

/** ClickUp returns epoch-millisecond strings; normalize to ISO. */
export function epochToIso(value: unknown): string | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(n).toISOString();
}

export function toMs(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

export function classifyTaskState(statusType?: string | null, status?: string | null): string {
  const type = (statusType ?? "").toLowerCase();
  const label = (status ?? "").toLowerCase();
  if (label.includes("cancel") || label.includes("won't") || label.includes("wont")) return "cancelled";
  if (label.includes("block")) return "blocked";
  if (type === "closed" || type === "done") return "done";
  if (type === "custom" || type === "open") {
    if (label.includes("progress") || label.includes("review") || label.includes("doing")) return "in_progress";
    return type === "open" ? "open" : "in_progress";
  }
  if (label.includes("progress")) return "in_progress";
  if (label.includes("complete") || label.includes("done")) return "done";
  return "unknown";
}

export function attachmentKind(mime?: string | null, ext?: string | null, url?: string | null): string {
  const m = (mime ?? "").toLowerCase();
  const e = (ext ?? "").toLowerCase();
  if (m.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(e)) return "image";
  if (["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "md"].includes(e)) return "document";
  if (!e && url) return "link";
  return "file";
}