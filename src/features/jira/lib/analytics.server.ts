import type { SupabaseClient } from "@supabase/supabase-js";

type IssueRow = {
  id: string;
  issue_kind: string;
  status: string | null;
  status_category: string;
  priority: string | null;
  story_points: number | null;
  assignee_name: string | null;
  assignee_account_id: string | null;
  blocked: boolean;
  sprint_id: string | null;
  project_id: string | null;
  issue_created_at: string;
  issue_updated_at: string | null;
  resolved_at: string | null;
  time_spent_seconds: number;
};

type SprintRow = {
  id: string;
  name: string;
  state: string;
  start_date: string | null;
  end_date: string | null;
  complete_date: string | null;
  completed_points: number;
  remaining_points: number;
  committed_points: number;
};

const HOUR = 3_600_000;

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

function countBy<T>(rows: T[], pick: (row: T) => string | null | undefined) {
  const map: Record<string, number> = {};
  for (const row of rows) {
    const key = pick(row) ?? "Unassigned";
    map[key] = (map[key] ?? 0) + 1;
  }
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function weekKey(iso: string): string {
  const d = new Date(iso);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

export async function computeJiraAnalytics(supabase: SupabaseClient) {
  const [projectsRes, sprintsRes, epicsRes, issuesRes, worklogsRes] = await Promise.all([
    supabase.from("jira_projects").select("id", { count: "exact", head: true }),
    supabase
      .from("jira_sprints")
      .select("id, name, state, start_date, end_date, complete_date, completed_points, remaining_points, committed_points")
      .order("start_date", { ascending: true, nullsFirst: false }),
    supabase.from("jira_epics").select("id", { count: "exact", head: true }),
    supabase
      .from("jira_issues")
      .select(
        "id, issue_kind, status, status_category, priority, story_points, assignee_name, assignee_account_id, blocked, sprint_id, project_id, issue_created_at, issue_updated_at, resolved_at, time_spent_seconds",
      )
      .order("issue_created_at", { ascending: false })
      .limit(5000),
    supabase.from("jira_worklogs").select("time_spent_seconds").limit(5000),
  ]);

  const sprints = (sprintsRes.data ?? []) as SprintRow[];
  const issues = (issuesRes.data ?? []) as IssueRow[];

  const closedIssues = issues.filter((i) => i.status_category === "done");
  const openIssues = issues.filter((i) => i.status_category !== "done");

  const totals = {
    projects: projectsRes.count ?? 0,
    epics: epicsRes.count ?? 0,
    sprints: sprints.length,
    active_sprints: sprints.filter((s) => s.state === "active").length,
    completed_sprints: sprints.filter((s) => s.state === "closed").length,
    issues: issues.length,
    open_issues: openIssues.length,
    closed_issues: closedIssues.length,
    bugs: issues.filter((i) => i.issue_kind === "bug").length,
    tasks: issues.filter((i) => i.issue_kind === "task").length,
    stories: issues.filter((i) => i.issue_kind === "story").length,
    subtasks: issues.filter((i) => i.issue_kind === "subtask").length,
    blocked: issues.filter((i) => i.blocked).length,
    logged_hours: Math.round(
      ((worklogsRes.data ?? []).reduce((n, w) => n + (w.time_spent_seconds ?? 0), 0) / HOUR) * 10,
    ) / 10,
  };

  // ---- Sprint analytics ----
  const velocity = sprints
    .filter((s) => s.state !== "future")
    .slice(-12)
    .map((s) => ({
      name: s.name,
      completed: Number(s.completed_points ?? 0),
      committed: Number(s.committed_points ?? 0),
      completion:
        Number(s.committed_points ?? 0) > 0
          ? Math.round((Number(s.completed_points ?? 0) / Number(s.committed_points)) * 100)
          : 0,
    }));

  const closedSprints = sprints.filter((s) => s.state === "closed");
  const sprintMetrics = {
    average_velocity: avg(closedSprints.map((s) => Number(s.completed_points ?? 0))),
    average_completion: avg(
      closedSprints.map((s) =>
        Number(s.committed_points ?? 0) > 0
          ? (Number(s.completed_points ?? 0) / Number(s.committed_points)) * 100
          : 0,
      ),
    ),
    average_story_points: avg(
      issues.filter((i) => i.story_points != null).map((i) => Number(i.story_points)),
    ),
  };

  // ---- Burndown / burnup for the current (or latest) sprint ----
  const focusSprint =
    sprints.find((s) => s.state === "active") ?? closedSprints[closedSprints.length - 1] ?? null;
  let burn: { date: string; remaining: number; completed: number; scope: number }[] = [];
  if (focusSprint?.start_date) {
    const start = new Date(focusSprint.start_date).getTime();
    const end = new Date(focusSprint.end_date ?? focusSprint.complete_date ?? Date.now()).getTime();
    const sprintIssues = issues.filter((i) => i.sprint_id === focusSprint.id);
    const scope = sprintIssues.reduce((n, i) => n + Number(i.story_points ?? 0), 0);
    const days = Math.max(1, Math.min(60, Math.ceil((end - start) / 864e5)));
    for (let d = 0; d <= days; d++) {
      const cutoff = start + d * 864e5;
      const completed = sprintIssues
        .filter((i) => i.resolved_at && new Date(i.resolved_at).getTime() <= cutoff)
        .reduce((n, i) => n + Number(i.story_points ?? 0), 0);
      burn.push({
        date: new Date(cutoff).toISOString().slice(0, 10),
        remaining: Math.max(0, scope - completed),
        completed,
        scope,
      });
    }
  }

  // ---- Issue trends ----
  const trendMap: Record<string, { week: string; created: number; resolved: number }> = {};
  for (const i of issues) {
    const created = weekKey(i.issue_created_at);
    trendMap[created] ??= { week: created, created: 0, resolved: 0 };
    trendMap[created].created += 1;
    if (i.resolved_at) {
      const resolved = weekKey(i.resolved_at);
      trendMap[resolved] ??= { week: resolved, created: 0, resolved: 0 };
      trendMap[resolved].resolved += 1;
    }
  }
  const trends = Object.values(trendMap).sort((a, b) => a.week.localeCompare(b.week)).slice(-16);

  // ---- Distributions ----
  const statusDistribution = countBy(issues, (i) => i.status);
  const priorityDistribution = countBy(issues, (i) => i.priority);
  const typeDistribution = countBy(issues, (i) => i.issue_kind);
  const pointBuckets: Record<string, number> = {};
  for (const i of issues) {
    if (i.story_points == null) continue;
    const key = String(Number(i.story_points));
    pointBuckets[key] = (pointBuckets[key] ?? 0) + 1;
  }
  const storyPointDistribution = Object.entries(pointBuckets)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => Number(a.name) - Number(b.name));

  // ---- Team analytics ----
  const byAssignee = new Map<
    string,
    { name: string; assigned: number; closed: number; blocked: number; points: number; resolutionHours: number[]; cycleHours: number[] }
  >();
  for (const i of issues) {
    const name = i.assignee_name ?? "Unassigned";
    const entry =
      byAssignee.get(name) ??
      { name, assigned: 0, closed: 0, blocked: 0, points: 0, resolutionHours: [], cycleHours: [] };
    entry.assigned += 1;
    entry.points += Number(i.story_points ?? 0);
    if (i.blocked) entry.blocked += 1;
    if (i.resolved_at) {
      entry.closed += 1;
      entry.resolutionHours.push(
        (new Date(i.resolved_at).getTime() - new Date(i.issue_created_at).getTime()) / HOUR,
      );
      if (i.issue_updated_at) {
        entry.cycleHours.push(
          Math.abs(new Date(i.resolved_at).getTime() - new Date(i.issue_updated_at).getTime()) / HOUR,
        );
      }
    }
    byAssignee.set(name, entry);
  }
  const team = [...byAssignee.values()]
    .map((e) => ({
      name: e.name,
      assigned: e.assigned,
      closed: e.closed,
      blocked: e.blocked,
      points: Math.round(e.points * 10) / 10,
      avg_resolution_hours: avg(e.resolutionHours),
      avg_cycle_hours: avg(e.cycleHours),
    }))
    .sort((a, b) => b.assigned - a.assigned)
    .slice(0, 20);

  const resolutionHours = closedIssues
    .filter((i) => i.resolved_at)
    .map((i) => (new Date(i.resolved_at!).getTime() - new Date(i.issue_created_at).getTime()) / HOUR);

  const delivery = {
    average_resolution_hours: avg(resolutionHours),
    average_lead_hours: avg(resolutionHours),
    average_cycle_hours: avg(team.flatMap((t) => (t.avg_cycle_hours ? [t.avg_cycle_hours] : []))),
    throughput_per_week: trends.length ? Math.round((totals.closed_issues / trends.length) * 10) / 10 : 0,
  };

  return {
    totals,
    sprintMetrics,
    delivery,
    velocity,
    burn,
    focusSprintName: focusSprint?.name ?? null,
    trends,
    statusDistribution,
    priorityDistribution,
    typeDistribution,
    storyPointDistribution,
    team,
  };
}

export type JiraAnalytics = Awaited<ReturnType<typeof computeJiraAnalytics>>;