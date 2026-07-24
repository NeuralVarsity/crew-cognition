import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getGithubConnection = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("github_connections")
      .select("id, github_login, github_account_id, account_type, avatar, scope, auto_sync, last_sync_at, last_sync_status, connected_by, created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const startGithubOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("users")
      .select("organization_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (!profile?.organization_id) throw new Error("No organization");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { buildAuthorizeUrl } = await import("../lib/github-api.server");
    const { randomBytes } = await import("node:crypto");
    const state = randomBytes(24).toString("hex");
    const { error } = await supabaseAdmin.from("github_oauth_states").insert({
      state,
      organization_id: profile.organization_id,
      user_id: context.userId,
    });
    if (error) throw new Error(error.message);
    return { url: buildAuthorizeUrl(state) };
  });

export const disconnectGithub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { connectionId: string }) => z.object({ connectionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("github_connections")
      .delete()
      .eq("id", data.connectionId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setGithubAutoSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { connectionId: string; autoSync: boolean }) =>
    z.object({ connectionId: z.string().uuid(), autoSync: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("github_connections")
      .update({ auto_sync: data.autoSync })
      .eq("id", data.connectionId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const runGithubSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { connectionId: string; full?: boolean }) =>
    z.object({ connectionId: z.string().uuid(), full: z.boolean().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase
      .from("users")
      .select("organization_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (!profile?.organization_id) throw new Error("No organization");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { syncConnection } = await import("../lib/sync.server");

    const { data: logRow } = await supabaseAdmin
      .from("github_sync_logs")
      .insert({
        organization_id: profile.organization_id,
        connection_id: data.connectionId,
        kind: data.full ? "manual_full" : "manual_incremental",
        status: "running",
        triggered_by: context.userId,
      })
      .select("id")
      .single();

    const started = Date.now();
    try {
      const stats = await syncConnection(supabaseAdmin, data.connectionId, {
        maxRepos: data.full ? 50 : 25,
        commitsPerRepo: data.full ? 200 : 100,
      });
      const finalStatus = stats.errors.length === 0 ? "success" : stats.repositories > 0 ? "partial" : "failed";
      if (logRow) {
        await supabaseAdmin
          .from("github_sync_logs")
          .update({
            status: finalStatus,
            finished_at: new Date().toISOString(),
            duration_ms: Date.now() - started,
            stats,
            message: stats.errors.slice(0, 5).join("; ") || null,
          })
          .eq("id", logRow.id);
      }
      return { ok: true, stats };
    } catch (e) {
      const message = (e as Error).message;
      if (logRow) {
        await supabaseAdmin
          .from("github_sync_logs")
          .update({
            status: "failed",
            finished_at: new Date().toISOString(),
            duration_ms: Date.now() - started,
            message,
          })
          .eq("id", logRow.id);
      }
      throw new Error(message);
    }
  });

export const listRepositories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("github_repositories")
      .select("*")
      .order("pushed_at", { ascending: false, nullsFirst: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listContributors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("github_contributors")
      .select("*")
      .order("followers", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listCommits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("github_commits")
      .select("id, sha, message, author_login, committed_at, additions, deletions, changed_files, repository_id")
      .order("committed_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listPullRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("github_pull_requests")
      .select("*")
      .order("pr_created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listIssues = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("github_issues")
      .select("*")
      .order("issue_created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listSyncLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("github_sync_logs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getGithubStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const s = context.supabase;
    const [repos, commits, prs, issues, contribs] = await Promise.all([
      s.from("github_repositories").select("id, stars, forks, open_issues, language", { count: "exact" }),
      s.from("github_commits").select("id, committed_at", { count: "exact" }).gte("committed_at", new Date(Date.now() - 90 * 864e5).toISOString()),
      s.from("github_pull_requests").select("id, state, merged, pr_created_at", { count: "exact" }),
      s.from("github_issues").select("id, state", { count: "exact" }),
      s.from("github_contributors").select("id", { count: "exact", head: true }),
    ]);
    const repoRows = repos.data ?? [];
    const prRows = prs.data ?? [];
    const issueRows = issues.data ?? [];
    const commitRows = commits.data ?? [];
    const languages: Record<string, number> = {};
    for (const r of repoRows) {
      if (r.language) languages[r.language] = (languages[r.language] ?? 0) + 1;
    }
    const dailyCommits: Record<string, number> = {};
    for (const c of commitRows) {
      const day = c.committed_at.slice(0, 10);
      dailyCommits[day] = (dailyCommits[day] ?? 0) + 1;
    }
    return {
      totals: {
        repositories: repos.count ?? 0,
        contributors: contribs.count ?? 0,
        commits: commits.count ?? 0,
        pull_requests: prs.count ?? 0,
        merged_prs: prRows.filter((p) => p.merged).length,
        open_prs: prRows.filter((p) => p.state === "open").length,
        open_issues: issueRows.filter((i) => i.state === "open").length,
        closed_issues: issueRows.filter((i) => i.state === "closed").length,
        stars: repoRows.reduce((n, r) => n + (r.stars ?? 0), 0),
        forks: repoRows.reduce((n, r) => n + (r.forks ?? 0), 0),
      },
      languages: Object.entries(languages).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      dailyCommits: Object.entries(dailyCommits).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)),
    };
  });