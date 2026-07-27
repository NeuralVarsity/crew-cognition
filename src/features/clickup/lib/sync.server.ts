import type { SupabaseClient } from "@supabase/supabase-js";
import {
  attachmentKind,
  classifyTaskState,
  clickup,
  epochToIso,
  toMs,
  type ClickUpComment,
  type ClickUpFolder,
  type ClickUpList,
  type ClickUpSpace,
  type ClickUpTask,
  type ClickUpTeam,
  type ClickUpTimeEntry,
  type ClickUpUser,
  type RateCounter,
} from "./clickup-api.server";
import { decryptToken } from "./crypto.server";

export type ClickUpSyncStats = {
  members: number;
  spaces: number;
  folders: number;
  lists: number;
  tasks: number;
  comments: number;
  checklists: number;
  checklist_items: number;
  time_entries: number;
  attachments: number;
  api_calls: number;
  errors: string[];
};

function emptyStats(): ClickUpSyncStats {
  return {
    members: 0,
    spaces: 0,
    folders: 0,
    lists: 0,
    tasks: 0,
    comments: 0,
    checklists: 0,
    checklist_items: 0,
    time_entries: 0,
    attachments: 0,
    api_calls: 0,
    errors: [],
  };
}

type ConnectionRow = {
  id: string;
  organization_id: string;
  workspace_id: string;
  access_token_ciphertext: string;
};

/** Decrypts the stored token and verifies it is still usable. */
export async function ensureAccessToken(admin: SupabaseClient, connectionId: string) {
  const { data, error } = await admin
    .from("clickup_connections")
    .select("id, organization_id, workspace_id, access_token_ciphertext")
    .eq("id", connectionId)
    .single();
  if (error || !data) throw new Error("ClickUp connection not found");
  const conn = data as ConnectionRow;
  const token = decryptToken(conn.access_token_ciphertext);
  return { conn, token };
}

export type SyncOptions = { full?: boolean; counter?: RateCounter };

export async function syncConnection(
  admin: SupabaseClient,
  connectionId: string,
  options: SyncOptions = {},
): Promise<ClickUpSyncStats> {
  const stats = emptyStats();
  const counter: RateCounter = options.counter ?? { calls: 0 };
  const full = options.full === true;
  const { conn, token } = await ensureAccessToken(admin, connectionId);
  const orgId = conn.organization_id;

  const memberMap = new Map<string, string>();
  const taskMap = new Map<string, string>();

  const call = <T,>(path: string) => clickup<T>(token, path, { counter });

  try {
    // ---------- Workspace + members ----------
    const teams = await call<{ teams: ClickUpTeam[] }>("/team");
    const team = teams.teams?.find((t) => t.id === conn.workspace_id) ?? teams.teams?.[0];
    if (!team) throw new Error("Workspace no longer accessible from ClickUp");

    await admin
      .from("clickup_connections")
      .update({ workspace_name: team.name, workspace_color: team.color ?? null, workspace_avatar: team.avatar ?? null })
      .eq("id", connectionId);

    for (const m of team.members ?? []) {
      const id = await upsertMember(admin, orgId, connectionId, memberMap, m.user, {
        role: m.user.role_key ?? null,
        roleKey: typeof m.user.role === "number" ? m.user.role : null,
        invitedBy: m.invited_by?.username ?? null,
      });
      if (id) stats.members += 1;
    }

    // ---------- Spaces ----------
    const spacesRes = await call<{ spaces: ClickUpSpace[] }>(`/team/${team.id}/space?archived=false`);
    for (const space of spacesRes.spaces ?? []) {
      try {
        const { data: spaceRow, error: spaceErr } = await admin
          .from("clickup_spaces")
          .upsert(
            {
              organization_id: orgId,
              connection_id: connectionId,
              space_id: space.id,
              name: space.name,
              private: space.private ?? false,
              archived: space.archived ?? false,
              color: space.color ?? null,
              avatar: space.avatar ?? null,
              statuses: (space.statuses ?? []).map((s) => ({ status: s.status, type: s.type })),
              last_synced_at: new Date().toISOString(),
            },
            { onConflict: "organization_id,space_id" },
          )
          .select("id")
          .single();
        if (spaceErr || !spaceRow) {
          stats.errors.push(`space ${space.name}: ${spaceErr?.message ?? "upsert failed"}`);
          continue;
        }
        stats.spaces += 1;
        const spaceUuid = spaceRow.id as string;

        // ---------- Folders + lists ----------
        const listTargets: Array<{ list: ClickUpList; folderUuid: string | null }> = [];

        const foldersRes = await call<{ folders: ClickUpFolder[] }>(`/space/${space.id}/folder?archived=false`);
        for (const folder of foldersRes.folders ?? []) {
          const { data: folderRow, error: folderErr } = await admin
            .from("clickup_folders")
            .upsert(
              {
                organization_id: orgId,
                space_id: spaceUuid,
                folder_id: folder.id,
                name: folder.name,
                hidden: folder.hidden ?? false,
                archived: folder.archived ?? false,
                task_count: Number(folder.task_count ?? 0) || 0,
              },
              { onConflict: "organization_id,folder_id" },
            )
            .select("id")
            .single();
          if (folderErr || !folderRow) {
            stats.errors.push(`folder ${folder.name}: ${folderErr?.message ?? "upsert failed"}`);
            continue;
          }
          stats.folders += 1;
          const folderLists = await call<{ lists: ClickUpList[] }>(`/folder/${folder.id}/list?archived=false`);
          for (const list of folderLists.lists ?? []) {
            listTargets.push({ list, folderUuid: folderRow.id as string });
          }
        }

        const folderless = await call<{ lists: ClickUpList[] }>(`/space/${space.id}/list?archived=false`);
        for (const list of folderless.lists ?? []) listTargets.push({ list, folderUuid: null });

        for (const { list, folderUuid } of listTargets) {
          const { data: listRow, error: listErr } = await admin
            .from("clickup_lists")
            .upsert(
              {
                organization_id: orgId,
                space_id: spaceUuid,
                folder_id: folderUuid,
                list_id: list.id,
                name: list.name,
                content: list.content ?? null,
                status: list.status?.status ?? null,
                archived: list.archived ?? false,
                task_count: Number(list.task_count ?? 0) || 0,
                due_date: epochToIso(list.due_date),
                start_date: epochToIso(list.start_date),
              },
              { onConflict: "organization_id,list_id" },
            )
            .select("id")
            .single();
          if (listErr || !listRow) {
            stats.errors.push(`list ${list.name}: ${listErr?.message ?? "upsert failed"}`);
            continue;
          }
          stats.lists += 1;

          await syncListTasks(admin, {
            call,
            orgId,
            spaceUuid,
            folderUuid,
            listUuid: listRow.id as string,
            listId: list.id,
            full,
            memberMap,
            taskMap,
            stats,
            connectionId,
          });
        }
      } catch (e) {
        stats.errors.push(`space ${space.name}: ${(e as Error).message}`);
      }
    }

    // ---------- Time entries ----------
    try {
      const windowDays = full ? 90 : 14;
      const start = Date.now() - windowDays * 864e5;
      const entries = await call<{ data: ClickUpTimeEntry[] }>(
        `/team/${team.id}/time_entries?start_date=${start}&end_date=${Date.now()}`,
      );
      for (const entry of entries.data ?? []) {
        const memberUuid = entry.user ? await upsertMember(admin, orgId, connectionId, memberMap, entry.user) : null;
        const taskUuid = entry.task?.id ? taskMap.get(entry.task.id) ?? (await findTask(admin, orgId, entry.task.id)) : null;
        const { error } = await admin.from("clickup_time_entries").upsert(
          {
            organization_id: orgId,
            task_id: taskUuid,
            entry_id: entry.id,
            member_id: memberUuid,
            member_name: entry.user?.username ?? null,
            duration_ms: Math.max(0, toMs(entry.duration)),
            billable: entry.billable ?? false,
            description: entry.description ?? null,
            started_at: epochToIso(entry.start),
            ended_at: epochToIso(entry.end),
          },
          { onConflict: "organization_id,entry_id" },
        );
        if (!error) stats.time_entries += 1;
      }
    } catch (e) {
      stats.errors.push(`time entries: ${(e as Error).message}`);
    }
  } catch (e) {
    stats.errors.push((e as Error).message);
  }

  stats.api_calls = counter.calls;

  await admin
    .from("clickup_connections")
    .update({
      last_sync_at: new Date().toISOString(),
      last_sync_status: stats.errors.length === 0 ? "success" : stats.tasks > 0 || stats.spaces > 0 ? "partial" : "failed",
    })
    .eq("id", connectionId);

  return stats;
}

type ListCtx = {
  call: <T>(path: string) => Promise<T>;
  orgId: string;
  connectionId: string;
  spaceUuid: string;
  folderUuid: string | null;
  listUuid: string;
  listId: string;
  full: boolean;
  memberMap: Map<string, string>;
  taskMap: Map<string, string>;
  stats: ClickUpSyncStats;
};

async function syncListTasks(admin: SupabaseClient, ctx: ListCtx) {
  const { call, orgId, listId, full, stats } = ctx;
  const maxPages = full ? 10 : 3;
  const since = full ? null : Date.now() - 30 * 864e5;
  const enrichLimit = full ? 40 : 15;
  let enriched = 0;

  for (let page = 0; page < maxPages; page += 1) {
    const params = new URLSearchParams({
      page: String(page),
      subtasks: "true",
      include_closed: "true",
      order_by: "updated",
      reverse: "true",
    });
    if (since) params.set("date_updated_gt", String(since));

    let res: { tasks: ClickUpTask[]; last_page?: boolean };
    try {
      res = await call<{ tasks: ClickUpTask[]; last_page?: boolean }>(`/list/${listId}/task?${params.toString()}`);
    } catch (e) {
      stats.errors.push(`list ${listId} tasks: ${(e as Error).message}`);
      return;
    }

    const tasks = res.tasks ?? [];
    for (const task of tasks) {
      const taskUuid = await upsertTask(admin, ctx, task);
      if (!taskUuid) continue;
      if (enriched < enrichLimit) {
        enriched += 1;
        await enrichTask(admin, ctx, task, taskUuid);
      }
    }

    if (tasks.length === 0 || res.last_page) break;
  }
}

async function upsertTask(admin: SupabaseClient, ctx: ListCtx, task: ClickUpTask): Promise<string | null> {
  const { orgId, connectionId, spaceUuid, folderUuid, listUuid, memberMap, taskMap, stats } = ctx;

  const assignee = task.assignees?.[0] ?? null;
  const assigneeUuid = assignee ? await upsertMember(admin, orgId, connectionId, memberMap, assignee) : null;
  const creatorUuid = task.creator ? await upsertMember(admin, orgId, connectionId, memberMap, task.creator) : null;
  const statusLabel = task.status?.status ?? null;
  const statusType = task.status?.type ?? null;

  const { data, error } = await admin
    .from("clickup_tasks")
    .upsert(
      {
        organization_id: orgId,
        space_id: spaceUuid,
        folder_id: folderUuid,
        list_id: listUuid,
        task_id: task.id,
        custom_id: task.custom_id ?? null,
        name: task.name,
        description: (task.text_content ?? task.description ?? "")?.slice(0, 8000) || null,
        url: task.url ?? null,
        status: statusLabel,
        status_type: statusType,
        task_state: classifyTaskState(statusType, statusLabel),
        priority: task.priority?.priority ?? null,
        priority_order: task.priority?.orderindex != null ? Number(task.priority.orderindex) || null : null,
        tags: (task.tags ?? []).map((t) => t.name),
        assignees: (task.assignees ?? []).map((a) => ({ id: String(a.id), name: a.username ?? null })),
        primary_assignee_id: assigneeUuid,
        primary_assignee_name: assignee?.username ?? null,
        creator_member_id: creatorUuid,
        creator_name: task.creator?.username ?? null,
        watchers: (task.watchers ?? []).map((w) => ({ id: String(w.id), name: w.username ?? null })),
        parent_task_id: task.parent ?? null,
        due_date: epochToIso(task.due_date),
        start_date: epochToIso(task.start_date),
        completed_at: epochToIso(task.date_done ?? task.date_closed),
        time_estimate_ms: toMs(task.time_estimate),
        time_spent_ms: toMs(task.time_spent),
        archived: task.archived ?? false,
        task_created_at: epochToIso(task.date_created),
        task_updated_at: epochToIso(task.date_updated),
      },
      { onConflict: "organization_id,task_id" },
    )
    .select("id")
    .single();

  if (error || !data) {
    stats.errors.push(`task ${task.id}: ${error?.message ?? "upsert failed"}`);
    return null;
  }
  stats.tasks += 1;
  taskMap.set(task.id, data.id as string);
  return data.id as string;
}

/** Pulls comments, checklists and attachments for a bounded set of recent tasks. */
async function enrichTask(admin: SupabaseClient, ctx: ListCtx, task: ClickUpTask, taskUuid: string) {
  const { call, orgId, connectionId, memberMap, stats } = ctx;

  let detail: ClickUpTask | null = null;
  try {
    detail = await call<ClickUpTask>(`/task/${task.id}?include_subtasks=false`);
  } catch (e) {
    stats.errors.push(`task ${task.id} detail: ${(e as Error).message}`);
  }

  // ---- Checklists ----
  for (const cl of detail?.checklists ?? []) {
    const items = cl.items ?? [];
    const { data: clRow, error } = await admin
      .from("clickup_checklists")
      .upsert(
        {
          organization_id: orgId,
          task_id: taskUuid,
          checklist_id: cl.id,
          name: cl.name,
          item_count: items.length || (cl.resolved ?? 0) + (cl.unresolved ?? 0),
          resolved_count: cl.resolved ?? items.filter((i) => i.resolved).length,
        },
        { onConflict: "organization_id,checklist_id" },
      )
      .select("id")
      .single();
    if (error || !clRow) continue;
    stats.checklists += 1;
    for (const item of items) {
      const { error: itemErr } = await admin.from("clickup_checklist_items").upsert(
        {
          organization_id: orgId,
          checklist_id: clRow.id as string,
          item_id: item.id,
          name: item.name,
          resolved: item.resolved ?? false,
          assignee_name: item.assignee?.username ?? null,
        },
        { onConflict: "organization_id,item_id" },
      );
      if (!itemErr) stats.checklist_items += 1;
    }
  }

  // ---- Attachments ----
  for (const att of detail?.attachments ?? []) {
    const { error } = await admin.from("clickup_attachments").upsert(
      {
        organization_id: orgId,
        task_id: taskUuid,
        attachment_id: att.id,
        title: att.title ?? null,
        extension: att.extension ?? null,
        mime_type: att.mimetype ?? null,
        kind: attachmentKind(att.mimetype, att.extension, att.url),
        size_bytes: Number(att.size ?? 0) || 0,
        url: att.url ?? null,
        thumbnail_url: att.thumbnail_small ?? null,
        uploaded_by: att.user?.username ?? null,
        attachment_created_at: epochToIso(att.date),
      },
      { onConflict: "organization_id,attachment_id" },
    );
    if (!error) stats.attachments += 1;
  }

  // ---- Comments ----
  try {
    const res = await call<{ comments: ClickUpComment[] }>(`/task/${task.id}/comment`);
    for (const c of (res.comments ?? []).slice(0, 30)) {
      const authorUuid = c.user ? await upsertMember(admin, orgId, connectionId, memberMap, c.user) : null;
      const { error } = await admin.from("clickup_task_comments").upsert(
        {
          organization_id: orgId,
          task_id: taskUuid,
          comment_id: c.id,
          author_member_id: authorUuid,
          author_name: c.user?.username ?? null,
          body: (c.comment_text ?? "").slice(0, 4000) || null,
          resolved: c.resolved ?? false,
          comment_created_at: epochToIso(c.date),
          comment_updated_at: epochToIso(c.date),
        },
        { onConflict: "organization_id,comment_id" },
      );
      if (!error) stats.comments += 1;
    }
    await admin
      .from("clickup_tasks")
      .update({ comment_count: (res.comments ?? []).length })
      .eq("id", taskUuid);
  } catch (e) {
    stats.errors.push(`task ${task.id} comments: ${(e as Error).message}`);
  }
}

async function upsertMember(
  admin: SupabaseClient,
  orgId: string,
  connectionId: string,
  cache: Map<string, string>,
  user: ClickUpUser | null | undefined,
  extra?: { role?: string | null; roleKey?: number | null; invitedBy?: string | null },
): Promise<string | null> {
  if (!user?.id) return null;
  const memberId = String(user.id);
  const cached = cache.get(memberId);
  if (cached && !extra) return cached;

  const { data, error } = await admin
    .from("clickup_members")
    .upsert(
      {
        organization_id: orgId,
        connection_id: connectionId,
        member_id: memberId,
        username: user.username ?? null,
        email: user.email ?? null,
        color: user.color ?? null,
        profile_picture: user.profilePicture ?? null,
        ...(extra ? { role: extra.role ?? null, role_key: extra.roleKey ?? null, invited_by: extra.invitedBy ?? null } : {}),
      },
      { onConflict: "organization_id,member_id" },
    )
    .select("id")
    .single();
  if (error || !data) return cached ?? null;
  cache.set(memberId, data.id as string);
  return data.id as string;
}

async function findTask(admin: SupabaseClient, orgId: string, taskId: string): Promise<string | null> {
  const { data } = await admin
    .from("clickup_tasks")
    .select("id")
    .eq("organization_id", orgId)
    .eq("task_id", taskId)
    .maybeSingle();
  return (data?.id as string) ?? null;
}