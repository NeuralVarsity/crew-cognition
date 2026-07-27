import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getJiraConnection = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("jira_connections")
      .select(
        "id, cloud_id, site_name, site_url, avatar, scope, auto_sync, last_sync_at, last_sync_status, token_expires_at, connected_by, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const startJiraOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("users")
      .select("organization_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (!profile?.organization_id) throw new Error("No organization");

    const { getRequest } = await import("@tanstack/react-start/server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { buildAuthorizeUrl } = await import("../lib/jira-api.server");
    const { randomBytes } = await import("node:crypto");

    const origin = new URL(getRequest().url).origin;
    const state = randomBytes(24).toString("hex");
    const { error } = await supabaseAdmin.from("jira_oauth_states").insert({
      state,
      organization_id: profile.organization_id,
      user_id: context.userId,
      redirect_to: origin,
    });
    if (error) throw new Error(error.message);
    return { url: buildAuthorizeUrl(state, `${origin}/api/public/jira/callback`) };
  });

export const disconnectJira = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { connectionId: string }) => z.object({ connectionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("jira_connections").delete().eq("id", data.connectionId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setJiraAutoSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { connectionId: string; autoSync: boolean }) =>
    z.object({ connectionId: z.string().uuid(), autoSync: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("jira_connections")
      .update({ auto_sync: data.autoSync })
      .eq("id", data.connectionId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const refreshJiraConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { connectionId: string }) => z.object({ connectionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: allowed } = await context.supabase
      .from("jira_connections")
      .select("id")
      .eq("id", data.connectionId)
      .maybeSingle();
    if (!allowed) throw new Error("Connection not found");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { ensureAccessToken } = await import("../lib/sync.server");
    const { getAccessibleResources } = await import("../lib/jira-api.server");

    const { data: conn, error } = await supabaseAdmin
      .from("jira_connections")
      .select("id, cloud_id, access_token_ciphertext, refresh_token_ciphertext, token_expires_at")
      .eq("id", data.connectionId)
      .single();
    if (error || !conn) throw new Error("Connection not found");

    const token = await ensureAccessToken(supabaseAdmin, conn);
    const sites = await getAccessibleResources(token);
    const site = sites.find((s) => s.id === conn.cloud_id);
    if (site) {
      await supabaseAdmin
        .from("jira_connections")
        .update({ site_name: site.name, site_url: site.url, avatar: site.avatarUrl ?? null })
        .eq("id", conn.id);
    }
    return { ok: true, site: site?.name ?? null };
  });

export const runJiraSync = createServerFn({ method: "POST" })
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
      .from("jira_sync_logs")
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
    const since = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    try {
      const stats = await syncConnection(supabaseAdmin, data.connectionId, {
        full: data.full,
        since,
      });
      const status = stats.errors.length === 0 ? "success" : stats.projects > 0 ? "partial" : "failed";
      if (logRow) {
        await supabaseAdmin
          .from("jira_sync_logs")
          .update({
            status,
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
          .from("jira_sync_logs")
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

export const listJiraProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("jira_projects")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listJiraSprints = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("jira_sprints")
      .select("*")
      .order("start_date", { ascending: false, nullsFirst: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listJiraEpics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("jira_epics")
      .select("*")
      .order("epic_key", { ascending: true })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listJiraIssues = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("jira_issues")
      .select("*")
      .order("issue_updated_at", { ascending: false, nullsFirst: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listJiraWorklogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("jira_worklogs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listJiraSyncLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("jira_sync_logs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getJiraAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { computeJiraAnalytics } = await import("../lib/analytics.server");
    return computeJiraAnalytics(context.supabase);
  });