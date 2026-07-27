import type { SupabaseClient } from "@supabase/supabase-js";
import { adfToText, jira, refreshAccessToken } from "./jira-api.server";
import { decryptToken, encryptToken } from "./crypto.server";

export type JiraSyncStats = {
  projects: number;
  boards: number;
  sprints: number;
  epics: number;
  issues: number;
  comments: number;
  worklogs: number;
  accounts: number;
  errors: string[];
};

function emptyStats(): JiraSyncStats {
  return { projects: 0, boards: 0, sprints: 0, epics: 0, issues: 0, comments: 0, worklogs: 0, accounts: 0, errors: [] };
}

type JiraUser = {
  accountId?: string;
  displayName?: string;
  emailAddress?: string | null;
  active?: boolean;
  avatarUrls?: Record<string, string>;
};

type JiraIssue = {
  id: string;
  key: string;
  fields: Record<string, unknown>;
};

const STORY_POINT_FIELDS = [
  "customfield_10016",
  "customfield_10026",
  "customfield_10004",
  "customfield_10024",
  "customfield_10002",
];
const SPRINT_FIELDS = ["customfield_10020", "customfield_10010", "customfield_10007"];

export function classifyIssueKind(name: string | undefined): string {
  const n = (name ?? "").toLowerCase();
  if (n.includes("sub")) return "subtask";
  if (n.includes("bug") || n.includes("defect")) return "bug";
  if (n.includes("epic")) return "epic";
  if (n.includes("story")) return "story";
  if (n.includes("task")) return "task";
  return "other";
}

export function classifyStatusCategory(key: string | undefined): string {
  switch ((key ?? "").toLowerCase()) {
    case "new":
    case "undefined":
    case "to do":
    case "todo":
      return "todo";
    case "indeterminate":
      return "in_progress";
    case "done":
      return "done";
    default:
      return "unknown";
  }
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function pickStoryPoints(fields: Record<string, unknown>): number | null {
  for (const f of STORY_POINT_FIELDS) {
    const v = num(fields[f]);
    if (v != null) return v;
  }
  return null;
}

function pickSprintId(fields: Record<string, unknown>): number | null {
  for (const f of SPRINT_FIELDS) {
    const raw = fields[f];
    if (Array.isArray(raw) && raw.length > 0) {
      const last = raw[raw.length - 1] as { id?: number };
      if (typeof last?.id === "number") return last.id;
    }
  }
  return null;
}

/** Returns a valid access token, refreshing and persisting it when close to expiry. */
export async function ensureAccessToken(
  admin: SupabaseClient,
  connection: {
    id: string;
    access_token_ciphertext: string;
    refresh_token_ciphertext: string | null;
    token_expires_at: string | null;
  },
): Promise<string> {
  const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at).getTime() : 0;
  const stillValid = expiresAt - Date.now() > 120_000;
  if (stillValid || !connection.refresh_token_ciphertext) {
    return decryptToken(connection.access_token_ciphertext);
  }
  const refreshed = await refreshAccessToken(decryptToken(connection.refresh_token_ciphertext));
  await admin
    .from("jira_connections")
    .update({
      access_token_ciphertext: encryptToken(refreshed.access_token),
      refresh_token_ciphertext: refreshed.refresh_token
        ? encryptToken(refreshed.refresh_token)
        : connection.refresh_token_ciphertext,
      token_expires_at: refreshed.expires_in
        ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
        : null,
    })
    .eq("id", connection.id);
  return refreshed.access_token;
}

async function upsertAccount(
  admin: SupabaseClient,
  orgId: string,
  cache: Map<string, string>,
  user: JiraUser | null | undefined,
): Promise<string | null> {
  if (!user?.accountId) return null;
  const cached = cache.get(user.accountId);
  if (cached) return cached;
  const { data, error } = await admin
    .from("jira_accounts")
    .upsert(
      {
        organization_id: orgId,
        account_id: user.accountId,
        display_name: user.displayName ?? user.accountId,
        email: user.emailAddress ?? null,
        avatar: user.avatarUrls?.["48x48"] ?? null,
        active: user.active ?? true,
      },
      { onConflict: "organization_id,account_id" },
    )
    .select("id")
    .single();
  if (error || !data) return null;
  cache.set(user.accountId, data.id);
  return data.id;
}

async function searchIssues(
  token: string,
  cloudId: string,
  jql: string,
  maxIssues: number,
): Promise<JiraIssue[]> {
  const fields = [
    "summary", "description", "issuetype", "priority", "status", "resolution",
    "reporter", "assignee", "labels", "created", "updated", "resolutiondate",
    "timeoriginalestimate", "timeestimate", "timespent", "parent", "comment", "worklog",
    ...STORY_POINT_FIELDS, ...SPRINT_FIELDS,
  ];
  const out: JiraIssue[] = [];
  let nextPageToken: string | undefined;
  while (out.length < maxIssues) {
    const body: Record<string, unknown> = {
      jql,
      maxResults: Math.min(100, maxIssues - out.length),
      fields,
    };
    if (nextPageToken) body.nextPageToken = nextPageToken;
    const page = await jira<{ issues?: JiraIssue[]; nextPageToken?: string; isLast?: boolean }>(
      token,
      cloudId,
      "/rest/api/3/search/jql",
      { method: "POST", body: JSON.stringify(body) },
    );
    const issues = page.issues ?? [];
    out.push(...issues);
    nextPageToken = page.nextPageToken;
    if (!nextPageToken || issues.length === 0) break;
  }
  return out;
}

export async function syncConnection(
  admin: SupabaseClient,
  connectionId: string,
  opts: { full?: boolean; since?: string | null } = {},
): Promise<JiraSyncStats> {
  const stats = emptyStats();
  const { data: conn, error: connErr } = await admin
    .from("jira_connections")
    .select("id, organization_id, cloud_id, access_token_ciphertext, refresh_token_ciphertext, token_expires_at")
    .eq("id", connectionId)
    .single();
  if (connErr || !conn) throw new Error("Jira connection not found");

  const orgId = conn.organization_id as string;
  const cloudId = conn.cloud_id as string;
  const token = await ensureAccessToken(admin, conn);
  const accountCache = new Map<string, string>();
  const maxIssuesPerProject = opts.full ? 500 : 150;

  const projectPage = await jira<{ values?: Array<Record<string, unknown>> }>(
    token,
    cloudId,
    "/rest/api/3/project/search?maxResults=50&expand=lead,description,insight",
  );
  const projects = projectPage.values ?? [];

  for (const p of projects) {
    const projectKey = p.key as string;
    try {
      const leadId = await upsertAccount(admin, orgId, accountCache, p.lead as JiraUser);
      const { data: projRow, error: projErr } = await admin
        .from("jira_projects")
        .upsert(
          {
            organization_id: orgId,
            connection_id: connectionId,
            jira_id: String(p.id),
            project_key: projectKey,
            name: (p.name as string) ?? projectKey,
            project_type: (p.projectTypeKey as string) ?? null,
            project_category: ((p.projectCategory as { name?: string })?.name) ?? null,
            description: typeof p.description === "string" ? p.description : null,
            avatar: ((p.avatarUrls as Record<string, string>)?.["48x48"]) ?? null,
            lead_account_id: leadId,
            lead_name: ((p.lead as JiraUser)?.displayName) ?? null,
            archived: Boolean(p.archived),
            status: p.archived ? "archived" : "active",
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: "organization_id,jira_id" },
        )
        .select("id")
        .single();
      if (projErr || !projRow) throw new Error(projErr?.message ?? "project upsert failed");
      const projectId = projRow.id as string;
      stats.projects += 1;

      // ---- Boards + sprints (Agile API; not available on all project types) ----
      const sprintMap = new Map<number, string>();
      try {
        const boards = await jira<{ values?: Array<{ id: number; name: string; type?: string }> }>(
          token,
          cloudId,
          `/rest/agile/1.0/board?projectKeyOrId=${encodeURIComponent(projectKey)}&maxResults=50`,
        );
        for (const b of boards.values ?? []) {
          const { data: boardRow } = await admin
            .from("jira_boards")
            .upsert(
              {
                organization_id: orgId,
                project_id: projectId,
                jira_id: b.id,
                name: b.name,
                board_type: b.type ?? null,
              },
              { onConflict: "organization_id,jira_id" },
            )
            .select("id")
            .single();
          if (!boardRow) continue;
          stats.boards += 1;

          try {
            const sprints = await jira<{
              values?: Array<{
                id: number; name: string; goal?: string; state?: string;
                startDate?: string; endDate?: string; completeDate?: string;
              }>;
            }>(token, cloudId, `/rest/agile/1.0/board/${b.id}/sprint?maxResults=50`);
            for (const s of sprints.values ?? []) {
              const { data: sprintRow } = await admin
                .from("jira_sprints")
                .upsert(
                  {
                    organization_id: orgId,
                    board_id: boardRow.id,
                    project_id: projectId,
                    jira_id: s.id,
                    name: s.name,
                    goal: s.goal ?? null,
                    state: (["future", "active", "closed"].includes(s.state ?? "") ? s.state : "future") as string,
                    start_date: s.startDate ?? null,
                    end_date: s.endDate ?? null,
                    complete_date: s.completeDate ?? null,
                  },
                  { onConflict: "organization_id,jira_id" },
                )
                .select("id")
                .single();
              if (sprintRow) {
                sprintMap.set(s.id, sprintRow.id as string);
                stats.sprints += 1;
              }
            }
          } catch (e) {
            stats.errors.push(`sprints ${b.name}: ${(e as Error).message}`);
          }
        }
      } catch {
        // Boards unavailable for this project (e.g. team-managed without Agile access)
      }

      // ---- Issues ----
      const jqlParts = [`project = "${projectKey}"`];
      if (!opts.full && opts.since) jqlParts.push(`updated >= "${opts.since}"`);
      const jql = `${jqlParts.join(" AND ")} ORDER BY updated DESC`;
      const issues = await searchIssues(token, cloudId, jql, maxIssuesPerProject);

      // Epics first so issues can be linked to them.
      const epicMap = new Map<string, string>();
      for (const issue of issues) {
        const f = issue.fields;
        const kind = classifyIssueKind((f.issuetype as { name?: string })?.name);
        if (kind !== "epic") continue;
        const ownerId = await upsertAccount(admin, orgId, accountCache, f.assignee as JiraUser);
        const { data: epicRow } = await admin
          .from("jira_epics")
          .upsert(
            {
              organization_id: orgId,
              project_id: projectId,
              jira_id: issue.id,
              epic_key: issue.key,
              name: (f.summary as string) ?? issue.key,
              summary: (f.summary as string) ?? null,
              description: adfToText(f.description).slice(0, 8000) || null,
              status: ((f.status as { name?: string })?.name) ?? null,
              status_category: classifyStatusCategory(
                (f.status as { statusCategory?: { key?: string } })?.statusCategory?.key,
              ),
              owner_account_id: ownerId,
              owner_name: ((f.assignee as JiraUser)?.displayName) ?? null,
            },
            { onConflict: "organization_id,jira_id" },
          )
          .select("id")
          .single();
        if (epicRow) {
          epicMap.set(issue.key, epicRow.id as string);
          stats.epics += 1;
        }
      }

      for (const issue of issues) {
        const f = issue.fields;
        const kind = classifyIssueKind((f.issuetype as { name?: string })?.name);
        const reporterId = await upsertAccount(admin, orgId, accountCache, f.reporter as JiraUser);
        const assigneeId = await upsertAccount(admin, orgId, accountCache, f.assignee as JiraUser);
        const parentKey = ((f.parent as { key?: string })?.key) ?? null;
        const sprintJiraId = pickSprintId(f);
        const labels = Array.isArray(f.labels) ? (f.labels as string[]) : [];

        const { data: issueRow, error: issueErr } = await admin
          .from("jira_issues")
          .upsert(
            {
              organization_id: orgId,
              project_id: projectId,
              sprint_id: sprintJiraId ? (sprintMap.get(sprintJiraId) ?? null) : null,
              epic_id: parentKey ? (epicMap.get(parentKey) ?? null) : null,
              jira_id: issue.id,
              issue_key: issue.key,
              issue_type: ((f.issuetype as { name?: string })?.name) ?? null,
              issue_kind: kind,
              summary: (f.summary as string) ?? issue.key,
              description: adfToText(f.description).slice(0, 8000) || null,
              priority: ((f.priority as { name?: string })?.name) ?? null,
              status: ((f.status as { name?: string })?.name) ?? null,
              status_category: classifyStatusCategory(
                (f.status as { statusCategory?: { key?: string } })?.statusCategory?.key,
              ),
              resolution: ((f.resolution as { name?: string })?.name) ?? null,
              reporter_account_id: reporterId,
              reporter_name: ((f.reporter as JiraUser)?.displayName) ?? null,
              assignee_account_id: assigneeId,
              assignee_name: ((f.assignee as JiraUser)?.displayName) ?? null,
              parent_key: parentKey,
              labels,
              story_points: pickStoryPoints(f),
              original_estimate_seconds: num(f.timeoriginalestimate) ?? 0,
              remaining_estimate_seconds: num(f.timeestimate) ?? 0,
              time_spent_seconds: num(f.timespent) ?? 0,
              blocked: labels.some((l) => l.toLowerCase().includes("block")),
              comment_count: ((f.comment as { total?: number })?.total) ?? 0,
              issue_created_at: (f.created as string) ?? new Date().toISOString(),
              issue_updated_at: (f.updated as string) ?? null,
              resolved_at: (f.resolutiondate as string) ?? null,
            },
            { onConflict: "organization_id,jira_id" },
          )
          .select("id")
          .single();
        if (issueErr || !issueRow) {
          stats.errors.push(`issue ${issue.key}: ${issueErr?.message ?? "upsert failed"}`);
          continue;
        }
        stats.issues += 1;
        const issueId = issueRow.id as string;

        // ---- Comments ----
        const comments = ((f.comment as { comments?: Array<Record<string, unknown>> })?.comments) ?? [];
        for (const c of comments.slice(-20)) {
          const authorId = await upsertAccount(admin, orgId, accountCache, c.author as JiraUser);
          const { error } = await admin.from("jira_comments").upsert(
            {
              organization_id: orgId,
              issue_id: issueId,
              jira_id: `${issue.id}:${c.id}`,
              author_account_id: authorId,
              author_name: ((c.author as JiraUser)?.displayName) ?? null,
              body: adfToText(c.body).slice(0, 4000) || null,
              comment_created_at: (c.created as string) ?? new Date().toISOString(),
              comment_updated_at: (c.updated as string) ?? null,
            },
            { onConflict: "organization_id,jira_id" },
          );
          if (!error) stats.comments += 1;
        }

        // ---- Worklogs ----
        const worklogs = ((f.worklog as { worklogs?: Array<Record<string, unknown>> })?.worklogs) ?? [];
        for (const w of worklogs.slice(-20)) {
          const authorId = await upsertAccount(admin, orgId, accountCache, w.author as JiraUser);
          const { error } = await admin.from("jira_worklogs").upsert(
            {
              organization_id: orgId,
              issue_id: issueId,
              jira_id: `${issue.id}:${w.id}`,
              author_account_id: authorId,
              author_name: ((w.author as JiraUser)?.displayName) ?? null,
              time_spent_seconds: num(w.timeSpentSeconds) ?? 0,
              started_at: (w.started as string) ?? new Date().toISOString(),
              description: adfToText(w.comment).slice(0, 2000) || null,
            },
            { onConflict: "organization_id,jira_id" },
          );
          if (!error) stats.worklogs += 1;
        }
      }

      await rollupSprints(admin, orgId, projectId);
      await rollupEpics(admin, orgId, projectId);
    } catch (e) {
      stats.errors.push(`project ${projectKey}: ${(e as Error).message}`);
    }
  }

  stats.accounts = accountCache.size;

  await admin
    .from("jira_connections")
    .update({
      last_sync_at: new Date().toISOString(),
      last_sync_status: stats.errors.length === 0 ? "success" : stats.projects > 0 ? "partial" : "failed",
    })
    .eq("id", connectionId);

  return stats;
}

/** Recomputes completed/remaining/committed story points per sprint. */
async function rollupSprints(admin: SupabaseClient, orgId: string, projectId: string) {
  const { data: sprints } = await admin
    .from("jira_sprints")
    .select("id")
    .eq("organization_id", orgId)
    .eq("project_id", projectId);
  for (const s of sprints ?? []) {
    const { data: issues } = await admin
      .from("jira_issues")
      .select("story_points, status_category")
      .eq("sprint_id", s.id);
    let completed = 0;
    let remaining = 0;
    for (const i of issues ?? []) {
      const pts = Number(i.story_points ?? 0);
      if (i.status_category === "done") completed += pts;
      else remaining += pts;
    }
    await admin
      .from("jira_sprints")
      .update({ completed_points: completed, remaining_points: remaining, committed_points: completed + remaining })
      .eq("id", s.id);
  }
}

/** Recomputes epic completion percentage from child issues. */
async function rollupEpics(admin: SupabaseClient, orgId: string, projectId: string) {
  const { data: epics } = await admin
    .from("jira_epics")
    .select("id")
    .eq("organization_id", orgId)
    .eq("project_id", projectId);
  for (const e of epics ?? []) {
    const { data: children } = await admin.from("jira_issues").select("status_category").eq("epic_id", e.id);
    const total = children?.length ?? 0;
    const done = (children ?? []).filter((c) => c.status_category === "done").length;
    await admin
      .from("jira_epics")
      .update({ progress: total === 0 ? 0 : Math.round((done / total) * 100) })
      .eq("id", e.id);
  }
}