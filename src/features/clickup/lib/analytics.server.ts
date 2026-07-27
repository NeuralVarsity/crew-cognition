import type { SupabaseClient } from "@supabase/supabase-js";

type TaskRow = {
  id: string;
  name: string;
  space_id: string | null;
  list_id: string | null;
  task_state: string;
  status: string | null;
  priority: string | null;
  primary_assignee_name: string | null;
  due_date: string | null;
  completed_at: string | null;
  task_created_at: string | null;
  time_estimate_ms: number | null;
  time_spent_ms: number | null;
  archived: boolean;
};

type EntryRow = {
  duration_ms: number | null;
  billable: boolean;
  member_name: string | null;
  started_at: string | null;
};

const DAY = 864e5;
const HOUR_MS = 36e5;

function dayKey(iso: string | null | undefined) {
  return iso ? iso.slice(0, 10) : null;
}

function lastDays(n: number) {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i -= 1) out.push(new Date(Date.now() - i * DAY).toISOString().slice(0, 10));
  return out;
}

function round(n: number, digits = 1) {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

export type ClickUpAnalytics = Awaited<ReturnType<typeof computeClickUpAnalytics>>;

export async function computeClickUpAnalytics(supabase: SupabaseClient) {
  const [tasksRes, entriesRes, membersRes, spacesRes, foldersRes, listsRes] = await Promise.all([
    supabase
      .from("clickup_tasks")
      .select(
        "id, name, space_id, list_id, task_state, status, priority, primary_assignee_name, due_date, completed_at, task_created_at, time_estimate_ms, time_spent_ms, archived",
      )
      .limit(5000),
    supabase.from("clickup_time_entries").select("duration_ms, billable, member_name, started_at").limit(5000),
    supabase.from("clickup_members").select("id, username, active").limit(1000),
    supabase.from("clickup_spaces").select("id, name, archived").limit(500),
    supabase.from("clickup_folders").select("id, space_id").limit(2000),
    supabase.from("clickup_lists").select("id, space_id").limit(2000),
  ]);

  const tasks = (tasksRes.data ?? []) as TaskRow[];
  const entries = (entriesRes.data ?? []) as EntryRow[];
  const members = (membersRes.data ?? []) as Array<{ id: string; username: string | null; active: boolean }>;
  const spaces = (spacesRes.data ?? []) as Array<{ id: string; name: string; archived: boolean }>;
  const folders = (foldersRes.data ?? []) as Array<{ id: string; space_id: string | null }>;
  const lists = (listsRes.data ?? []) as Array<{ id: string; space_id: string | null }>;

  const now = Date.now();
  const isDone = (t: TaskRow) => t.task_state === "done";
  const completed = tasks.filter(isDone);
  const cancelled = tasks.filter((t) => t.task_state === "cancelled");
  const blocked = tasks.filter((t) => t.task_state === "blocked");
  const inProgress = tasks.filter((t) => t.task_state === "in_progress");
  const pending = tasks.filter((t) => !isDone(t) && t.task_state !== "cancelled");
  const overdue = pending.filter((t) => t.due_date && new Date(t.due_date).getTime() < now);

  const totalLoggedMs = entries.reduce((sum, e) => sum + (e.duration_ms ?? 0), 0);
  const billableMs = entries.reduce((sum, e) => sum + (e.billable ? e.duration_ms ?? 0 : 0), 0);

  const totals = {
    tasks: tasks.length,
    completed: completed.length,
    pending: pending.length,
    in_progress: inProgress.length,
    blocked: blocked.length,
    cancelled: cancelled.length,
    overdue: overdue.length,
    spaces: spaces.length,
    folders: folders.length,
    lists: lists.length,
    members: members.length,
    hours_logged: round(totalLoggedMs / HOUR_MS),
    billable_hours: round(billableMs / HOUR_MS),
    completion_rate: tasks.length ? round((completed.length / tasks.length) * 100) : 0,
  };

  // ---------- Distributions ----------
  const statusCounts = new Map<string, number>();
  for (const t of tasks) {
    const key = t.status?.trim() || t.task_state;
    statusCounts.set(key, (statusCounts.get(key) ?? 0) + 1);
  }
  const statusDistribution = [...statusCounts.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const priorityCounts = new Map<string, number>();
  for (const t of tasks) priorityCounts.set(t.priority ?? "none", (priorityCounts.get(t.priority ?? "none") ?? 0) + 1);
  const priorityDistribution = [...priorityCounts.entries()].map(([name, value]) => ({ name, value }));

  const stateDistribution = [
    { name: "Open", value: tasks.filter((t) => t.task_state === "open" || t.task_state === "unknown").length },
    { name: "In progress", value: inProgress.length },
    { name: "Blocked", value: blocked.length },
    { name: "Completed", value: completed.length },
    { name: "Cancelled", value: cancelled.length },
  ];

  // ---------- Trends ----------
  const days = lastDays(30);
  const createdByDay = new Map<string, number>();
  const completedByDay = new Map<string, number>();
  for (const t of tasks) {
    const c = dayKey(t.task_created_at);
    if (c) createdByDay.set(c, (createdByDay.get(c) ?? 0) + 1);
    const d = dayKey(t.completed_at);
    if (d) completedByDay.set(d, (completedByDay.get(d) ?? 0) + 1);
  }
  const hoursByDay = new Map<string, number>();
  const billableByDay = new Map<string, number>();
  for (const e of entries) {
    const d = dayKey(e.started_at);
    if (!d) continue;
    const h = (e.duration_ms ?? 0) / HOUR_MS;
    hoursByDay.set(d, (hoursByDay.get(d) ?? 0) + h);
    if (e.billable) billableByDay.set(d, (billableByDay.get(d) ?? 0) + h);
  }

  const completionTrend = days.map((d) => ({
    date: d.slice(5),
    created: createdByDay.get(d) ?? 0,
    completed: completedByDay.get(d) ?? 0,
  }));

  const timeTrend = days.map((d) => ({
    date: d.slice(5),
    hours: round(hoursByDay.get(d) ?? 0),
    billable: round(billableByDay.get(d) ?? 0),
  }));

  let cumulative = 0;
  const productivityTrend = days.map((d) => {
    cumulative += completedByDay.get(d) ?? 0;
    const done = completedByDay.get(d) ?? 0;
    const created = createdByDay.get(d) ?? 0;
    return {
      date: d.slice(5),
      completed: done,
      cumulative,
      rate: created ? round((done / created) * 100) : done ? 100 : 0,
    };
  });

  // ---------- Per-member productivity ----------
  const hoursByMember = new Map<string, number>();
  const activeDaysByMember = new Map<string, Set<string>>();
  for (const e of entries) {
    const name = e.member_name ?? "Unassigned";
    hoursByMember.set(name, (hoursByMember.get(name) ?? 0) + (e.duration_ms ?? 0) / HOUR_MS);
    const d = dayKey(e.started_at);
    if (d) {
      const set = activeDaysByMember.get(name) ?? new Set<string>();
      set.add(d);
      activeDaysByMember.set(name, set);
    }
  }

  const byMember = new Map<
    string,
    { assigned: number; completed: number; open: number; overdue: number; cycleSum: number; cycleCount: number; estimateMs: number; spentMs: number }
  >();
  for (const t of tasks) {
    const name = t.primary_assignee_name ?? "Unassigned";
    const row =
      byMember.get(name) ??
      { assigned: 0, completed: 0, open: 0, overdue: 0, cycleSum: 0, cycleCount: 0, estimateMs: 0, spentMs: 0 };
    row.assigned += 1;
    row.estimateMs += t.time_estimate_ms ?? 0;
    row.spentMs += t.time_spent_ms ?? 0;
    if (isDone(t)) {
      row.completed += 1;
      if (t.completed_at && t.task_created_at) {
        const delta = new Date(t.completed_at).getTime() - new Date(t.task_created_at).getTime();
        if (delta > 0) {
          row.cycleSum += delta / HOUR_MS;
          row.cycleCount += 1;
        }
      }
    } else if (t.task_state !== "cancelled") {
      row.open += 1;
      if (t.due_date && new Date(t.due_date).getTime() < now) row.overdue += 1;
    }
    byMember.set(name, row);
  }

  const workload = [...byMember.entries()]
    .map(([member, r]) => {
      const completionRate = r.assigned ? (r.completed / r.assigned) * 100 : 0;
      const avgCompletionHours = r.cycleCount ? r.cycleSum / r.cycleCount : 0;
      const hours = hoursByMember.get(member) ?? 0;
      const efficiency = r.spentMs > 0 && r.estimateMs > 0 ? Math.min(200, (r.estimateMs / r.spentMs) * 100) : 0;
      const speedScore = avgCompletionHours ? Math.max(0, 100 - Math.min(100, avgCompletionHours / 2.4)) : 60;
      const overduePenalty = r.open ? (r.overdue / r.open) * 25 : 0;
      const productivity = Math.max(
        0,
        Math.min(100, round(completionRate * 0.5 + speedScore * 0.3 + Math.min(100, hours * 2) * 0.2 - overduePenalty)),
      );
      return {
        member,
        assigned: r.assigned,
        completed: r.completed,
        open: r.open,
        overdue: r.overdue,
        completion_rate: round(completionRate),
        avg_completion_hours: round(avgCompletionHours),
        hours_logged: round(hours),
        efficiency: round(efficiency),
        productivity,
        active_days: activeDaysByMember.get(member)?.size ?? 0,
      };
    })
    .sort((a, b) => b.assigned - a.assigned);

  const leaderboard = [...workload]
    .filter((w) => w.member !== "Unassigned")
    .sort((a, b) => b.productivity - a.productivity || b.completed - a.completed)
    .slice(0, 10);

  const contributing = workload.filter((w) => w.member !== "Unassigned");
  const activeMembers = contributing.filter((w) => w.open > 0 || w.hours_logged > 0).length;
  const cycleTasks = completed.filter((t) => t.completed_at && t.task_created_at);
  const avgCompletionHours = cycleTasks.length
    ? cycleTasks.reduce(
        (sum, t) => sum + (new Date(t.completed_at!).getTime() - new Date(t.task_created_at!).getTime()) / HOUR_MS,
        0,
      ) / cycleTasks.length
    : 0;

  const team = {
    active_members: activeMembers,
    inactive_members: Math.max(0, members.length - activeMembers),
    tasks_per_member: contributing.length ? round(tasks.length / contributing.length) : 0,
    avg_completion_hours: round(avgCompletionHours),
    productivity: contributing.length
      ? round(contributing.reduce((s, w) => s + w.productivity, 0) / contributing.length)
      : 0,
  };

  // ---------- Project (space) analytics ----------
  const projects = spaces
    .map((space) => {
      const spaceTasks = tasks.filter((t) => t.space_id === space.id);
      const done = spaceTasks.filter(isDone).length;
      const late = spaceTasks.filter(
        (t) => !isDone(t) && t.task_state !== "cancelled" && t.due_date && new Date(t.due_date).getTime() < now,
      ).length;
      const blockedCount = spaceTasks.filter((t) => t.task_state === "blocked").length;
      const completion = spaceTasks.length ? (done / spaceTasks.length) * 100 : 0;
      const risk = Math.min(
        100,
        round((spaceTasks.length ? (late / spaceTasks.length) * 70 : 0) + (spaceTasks.length ? (blockedCount / spaceTasks.length) * 30 : 0)),
      );
      return {
        id: space.id,
        name: space.name,
        folders: folders.filter((f) => f.space_id === space.id).length,
        lists: lists.filter((l) => l.space_id === space.id).length,
        tasks: spaceTasks.length,
        completed: done,
        overdue: late,
        blocked: blockedCount,
        completion_rate: round(completion),
        health: round(Math.max(0, Math.min(100, completion * 0.7 + (100 - risk) * 0.3))),
        risk,
      };
    })
    .sort((a, b) => b.tasks - a.tasks);

  // ---------- Deadlines ----------
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayTasks = pending
    .filter((t) => dayKey(t.due_date) === todayStr)
    .map((t) => ({ id: t.id, name: t.name, assignee: t.primary_assignee_name, status: t.status, due_date: t.due_date }))
    .slice(0, 12);

  const upcoming = pending
    .filter((t) => t.due_date && new Date(t.due_date).getTime() >= now && new Date(t.due_date).getTime() <= now + 14 * DAY)
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 12)
    .map((t) => ({ id: t.id, name: t.name, assignee: t.primary_assignee_name, status: t.status, due_date: t.due_date }));

  // ---------- Workload heatmap (member x weekday hours) ----------
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const heatmapMap = new Map<string, Map<string, number>>();
  for (const e of entries) {
    if (!e.started_at) continue;
    const name = e.member_name ?? "Unassigned";
    const day = weekdays[new Date(e.started_at).getUTCDay()];
    const row = heatmapMap.get(name) ?? new Map<string, number>();
    row.set(day, (row.get(day) ?? 0) + (e.duration_ms ?? 0) / HOUR_MS);
    heatmapMap.set(name, row);
  }
  const heatmap = [...heatmapMap.entries()]
    .slice(0, 12)
    .map(([member, row]) => ({
      member,
      cells: weekdays.map((d) => ({ day: d, hours: round(row.get(d) ?? 0) })),
    }));

  return {
    totals,
    statusDistribution,
    priorityDistribution,
    stateDistribution,
    completionTrend,
    productivityTrend,
    timeTrend,
    workload,
    leaderboard,
    team,
    projects,
    todayTasks,
    upcoming,
    heatmap,
    weekdays,
  };
}