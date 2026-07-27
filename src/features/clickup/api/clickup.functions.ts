import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ClickUpTeam } from "../lib/clickup-api.server";

const CONNECTION_FIELDS =
  "id, workspace_id, workspace_name, workspace_color, workspace_avatar, scope, auto_sync, last_sync_at, last_sync_status, connected_by, connected_user_name, connected_user_email, created_at";

async function requireManager(supabase: unknown, userId: string) {
  const client = supabase as {
    rpc: (fn: "can_manage_workforce", args: { _user_id: string }) => Promise<{ data: unknown }>;
  };
  const { data } = await client.rpc("can_manage_workforce", { _user_id: userId });
  if (data !== true) throw new Error("You do not have permission to manage the ClickUp connection");
}

export const getClickUpConnection = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("clickup_connections")
      .select(CONNECTION_FIELDS)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const startClickUpOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireManager(context.supabase, context.userId);
    const { data: profile } = await context.supabase
      .from("users")
      .select("organization_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (!profile?.organization_id) throw new Error("No organization");

    const { getRequest } = await import("@tanstack/react-start/server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { buildAuthorizeUrl } = await import("../lib/clickup-api.server");
    const { randomBytes } = await import("node:crypto");

    const origin = new URL(getRequest().url).origin;
    const state = randomBytes(24).toString("hex");
    const { error } = await supabaseAdmin.from("clickup_oauth_states").insert({
      state,
      organization_id: profile.organization_id,
      user_id: context.userId,
      redirect_to: origin,
    });
    if (error) throw new Error(error.message);
    return { url: buildAuthorizeUrl(state, `${origin}/api/public/clickup/callback`) };
  });

export const disconnectClickUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { connectionId: string }) => z.object({ connectionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireManager(context.supabase, context.userId);
    const { error } = await context.supabase.from("clickup_connections").delete().eq("id", data.connectionId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setClickUpAutoSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { connectionId: string; autoSync: boolean }) =>
    z.object({ connectionId: z.string().uuid(), autoSync: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireManager(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("clickup_connections")
      .update({ auto_sync: data.autoSync })
      .eq("id", data.connectionId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const validateClickUpConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { connectionId: string }) => z.object({ connectionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: allowed } = await context.supabase
      .from("clickup_connections")
      .select("id")
      .eq("id", data.connectionId)
      .maybeSingle();
    if (!allowed) throw new Error("Connection not found");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { ensureAccessToken } = await import("../lib/sync.server");
    const { validateToken, clickup } = await import("../lib/clickup-api.server");

    const { conn, token } = await ensureAccessToken(supabaseAdmin, data.connectionId);
    try {
      const me = await validateToken(token);
      const teams = await clickup<{ teams: ClickUpTeam[] }>(token, "/team");
      const team = teams.teams?.find((t) => t.id === conn.workspace_id);
      if (!team) throw new Error("Workspace is no longer shared with this ClickUp app");
      await supabaseAdmin
        .from("clickup_connections")
        .update({
          workspace_name: team.name,
          workspace_color: team.color ?? null,
          workspace_avatar: team.avatar ?? null,
          connected_user_name: me.user?.username ?? null,
          connected_user_email: me.user?.email ?? null,
        })
        .eq("id", conn.id);
      return { ok: true, workspace: team.name, user: me.user?.username ?? null };
    } catch (e) {
      throw new Error(`ClickUp connection invalid: ${(e as Error).message}`);
    }
  });

export const runClickUpSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { connectionId: string; full?: boolean; retryOf?: string }) =>
    z
      .object({ connectionId: z.string().uuid(), full: z.boolean().optional(), retryOf: z.string().uuid().optional() })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireManager(context.supabase, context.userId);
    const { data: profile } = await context.supabase
      .from("users")
      .select("organization_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (!profile?.organization_id) throw new Error("No organization");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { syncConnection } = await import("../lib/sync.server");

    const { data: logRow } = await supabaseAdmin
      .from("clickup_sync_logs")
      .insert({
        organization_id: profile.organization_id,
        connection_id: data.connectionId,
        kind: data.retryOf ? "retry" : data.full ? "manual_full" : "manual_incremental",
        status: "running",
        triggered_by: context.userId,
      })
      .select("id")
      .single();

    const started = Date.now();
    try {
      const stats = await syncConnection(supabaseAdmin, data.connectionId, { full: data.full });
      const status = stats.errors.length === 0 ? "success" : stats.tasks > 0 || stats.spaces > 0 ? "partial" : "failed";
      if (logRow) {
        await supabaseAdmin
          .from("clickup_sync_logs")
          .update({
            status,
            finished_at: new Date().toISOString(),
            duration_ms: Date.now() - started,
            api_calls: stats.api_calls,
            stats,
            message: stats.errors.slice(0, 5).join("; ") || null,
          })
          .eq("id", logRow.id);
      }
      return { ok: status !== "failed", stats };
    } catch (e) {
      const message = (e as Error).message;
      if (logRow) {
        await supabaseAdmin
          .from("clickup_sync_logs")
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

export const listClickUpSpaces = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("clickup_spaces")
      .select("id, space_id, name, description, private, archived, color, space_created_at, last_synced_at, created_at")
      .order("name")
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listClickUpFolders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("clickup_folders")
      .select("id, folder_id, name, hidden, archived, task_count, space_id, clickup_spaces(name)")
      .order("name")
      .limit(1000);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listClickUpLists = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("clickup_lists")
      .select(
        "id, list_id, name, status, archived, task_count, due_date, space_id, folder_id, clickup_spaces(name), clickup_folders(name)",
      )
      .order("name")
      .limit(1000);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listClickUpTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("clickup_tasks")
      .select(
        "id, task_id, name, url, status, task_state, priority, tags, primary_assignee_name, creator_name, due_date, start_date, completed_at, time_estimate_ms, time_spent_ms, archived, task_created_at, task_updated_at, space_id, folder_id, list_id, clickup_spaces(name), clickup_lists(name)",
      )
      .order("task_updated_at", { ascending: false, nullsFirst: false })
      .limit(2000);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listClickUpMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("clickup_members")
      .select("id, member_id, username, email, role, role_key, profile_picture, active, created_at")
      .order("username")
      .limit(1000);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listClickUpTimeEntries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("clickup_time_entries")
      .select("id, entry_id, member_name, duration_ms, billable, description, started_at, task_id, clickup_tasks(name)")
      .order("started_at", { ascending: false, nullsFirst: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listClickUpSyncLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("clickup_sync_logs")
      .select("id, kind, status, started_at, finished_at, duration_ms, api_calls, message, stats")
      .order("started_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getClickUpAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { computeClickUpAnalytics } = await import("../lib/analytics.server");
    return computeClickUpAnalytics(context.supabase);
  });