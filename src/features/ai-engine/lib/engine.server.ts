import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_AI_SETTINGS,
  SUB_SCORE_KEYS,
  SUB_SCORE_LABELS,
  type AiIntelligence,
  type AiSettings,
  type EmployeeScore,
  type GroupScore,
  type Leaderboard,
  type LeaderboardEntry,
  type RiskLevel,
  type SubScoreKey,
} from "../types";

const HOUR = 3_600_000;
const DAY = 86_400_000;
const LIMIT = 5000;

type Any = Record<string, any>;

const num = (v: unknown) => (typeof v === "number" ? v : Number(v ?? 0) || 0);
const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v * 10) / 10));
const round = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

function percentile(values: number[], p: number): number {
  const arr = values.filter((v) => v > 0).sort((a, b) => a - b);
  if (arr.length === 0) return 0;
  const idx = Math.min(arr.length - 1, Math.floor((arr.length - 1) * p));
  return arr[idx];
}

/** Scale a raw metric against the cohort's 90th percentile — explainable, no randomness. */
function scaler(values: number[]) {
  const ref = percentile(values, 0.9);
  return (v: number) => (ref <= 0 ? 0 : clamp((v / ref) * 100));
}

function weekKey(ms: number): string {
  const d = new Date(ms);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

function monthKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 7);
}

function riskLevel(score: number): RiskLevel {
  return score >= 70 ? "high" : score >= 40 ? "medium" : "low";
}

function normalizeSettings(raw: Any | null | undefined): AiSettings {
  const weights = { ...DEFAULT_AI_SETTINGS.weights };
  for (const key of SUB_SCORE_KEYS) {
    const v = raw?.weights?.[key];
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) weights[key] = v;
  }
  return {
    weights,
    thresholds: { ...DEFAULT_AI_SETTINGS.thresholds, ...(raw?.thresholds ?? {}) },
    rules: { ...DEFAULT_AI_SETTINGS.rules, ...(raw?.rules ?? {}) },
  };
}

type Bucket = {
  events: number[];
  commits: number;
  additions: number;
  prs: number;
  mergedPrs: number;
  reviews: number;
  approvals: number;
  repos: Set<string>;
  ghIssuesClosed: number;
  jiraAssigned: number;
  jiraResolved: number;
  jiraBugs: number;
  jiraBugsResolved: number;
  jiraBlocked: number;
  storyPoints: number;
  sprints: Set<string>;
  epicsOwned: number;
  jiraComments: number;
  jiraResolutionHours: number[];
  worklogHours: number;
  cuAssigned: number;
  cuDone: number;
  cuOverdue: number;
  cuOnTime: number;
  cuHours: number;
  cuComments: number;
  cuSpaces: Set<string>;
  cuCompletionHours: number[];
};

const emptyBucket = (): Bucket => ({
  events: [],
  commits: 0,
  additions: 0,
  prs: 0,
  mergedPrs: 0,
  reviews: 0,
  approvals: 0,
  repos: new Set(),
  ghIssuesClosed: 0,
  jiraAssigned: 0,
  jiraResolved: 0,
  jiraBugs: 0,
  jiraBugsResolved: 0,
  jiraBlocked: 0,
  storyPoints: 0,
  sprints: new Set(),
  epicsOwned: 0,
  jiraComments: 0,
  jiraResolutionHours: [],
  worklogHours: 0,
  cuAssigned: 0,
  cuDone: 0,
  cuOverdue: 0,
  cuOnTime: 0,
  cuHours: 0,
  cuComments: 0,
  cuSpaces: new Set(),
  cuCompletionHours: [],
});

export async function computeAiIntelligence(
  supabase: SupabaseClient,
  opts: { userId: string; canManage: boolean },
): Promise<AiIntelligence> {
  const [
    settingsRes,
    employeesRes,
    departmentsRes,
    teamsRes,
    projectsRes,
    empProjectsRes,
    skillsRes,
    ghContribRes,
    commitsRes,
    prsRes,
    reviewsRes,
    ghIssuesRes,
    jiraAccountsRes,
    jiraIssuesRes,
    jiraWorklogsRes,
    jiraCommentsRes,
    jiraEpicsRes,
    cuMembersRes,
    cuTasksRes,
    cuTimeRes,
    cuCommentsRes,
  ] = await Promise.all([
    supabase.from("ai_scoring_settings").select("weights, thresholds, rules").maybeSingle(),
    supabase
      .from("employees")
      .select(
        "id, full_name, email, designation, profile_photo, department_id, team_id, manager_id, status, joining_date, user_id",
      )
      .is("deleted_at", null)
      .limit(LIMIT),
    supabase.from("departments").select("id, name").is("deleted_at", null),
    supabase.from("teams").select("id, name").is("deleted_at", null),
    supabase.from("projects").select("id, name, status, end_date").is("deleted_at", null),
    supabase.from("employee_projects").select("employee_id, project_id, allocation_percent, role"),
    supabase.from("employee_skills").select("employee_id, proficiency"),
    supabase.from("github_contributors").select("id, login, email, linked_employee_id"),
    supabase
      .from("github_commits")
      .select("author_contributor_id, committed_at, additions, deletions, repository_id")
      .order("committed_at", { ascending: false })
      .limit(LIMIT),
    supabase
      .from("github_pull_requests")
      .select("author_contributor_id, merged, state, pr_created_at, merged_at, repository_id, review_count")
      .order("pr_created_at", { ascending: false })
      .limit(LIMIT),
    supabase
      .from("github_reviews")
      .select("reviewer_contributor_id, state, submitted_at")
      .order("submitted_at", { ascending: false })
      .limit(LIMIT),
    supabase
      .from("github_issues")
      .select("assignee_contributor_id, state, closed_at")
      .order("issue_created_at", { ascending: false })
      .limit(LIMIT),
    supabase.from("jira_accounts").select("id, display_name, email, linked_employee_id"),
    supabase
      .from("jira_issues")
      .select(
        "assignee_account_id, status_category, issue_kind, story_points, blocked, sprint_id, resolved_at, issue_created_at, time_spent_seconds",
      )
      .order("issue_created_at", { ascending: false })
      .limit(LIMIT),
    supabase
      .from("jira_worklogs")
      .select("author_account_id, time_spent_seconds, started_at")
      .order("started_at", { ascending: false })
      .limit(LIMIT),
    supabase
      .from("jira_comments")
      .select("author_account_id, comment_created_at")
      .order("comment_created_at", { ascending: false })
      .limit(LIMIT),
    supabase.from("jira_epics").select("owner_account_id"),
    supabase.from("clickup_members").select("id, username, email, linked_employee_id"),
    supabase
      .from("clickup_tasks")
      .select(
        "primary_assignee_id, task_state, due_date, completed_at, task_created_at, time_spent_ms, space_id",
      )
      .order("task_created_at", { ascending: false })
      .limit(LIMIT),
    supabase
      .from("clickup_time_entries")
      .select("member_id, duration_ms, started_at")
      .order("started_at", { ascending: false })
      .limit(LIMIT),
    supabase
      .from("clickup_task_comments")
      .select("author_member_id, comment_created_at")
      .order("comment_created_at", { ascending: false })
      .limit(LIMIT),
  ]);

  const settings = normalizeSettings(settingsRes.data as Any);
  const { weights, thresholds, rules } = settings;
  const since = Date.now() - rules.lookbackDays * DAY;
  const inWindow = (v: string | null | undefined) => (v ? new Date(v).getTime() >= since : false);

  const employees = ((employeesRes.data ?? []) as Any[]).filter(
    (e) => rules.includeInactiveEmployees || e.status !== "terminated",
  );
  const deptName = new Map(((departmentsRes.data ?? []) as Any[]).map((d) => [d.id, d.name as string]));
  const teamName = new Map(((teamsRes.data ?? []) as Any[]).map((t) => [t.id, t.name as string]));
  const projectRows = (projectsRes.data ?? []) as Any[];
  const empName = new Map(employees.map((e) => [e.id as string, e.full_name as string]));
  const emailToEmployee = new Map(
    employees.filter((e) => e.email).map((e) => [String(e.email).toLowerCase(), e.id as string]),
  );

  const link = (row: Any): string | null => {
    if (row.linked_employee_id && empName.has(row.linked_employee_id)) return row.linked_employee_id;
    const email = row.email ? String(row.email).toLowerCase() : null;
    if (email && emailToEmployee.has(email)) return emailToEmployee.get(email)!;
    return null;
  };

  const contribToEmp = new Map<string, string>();
  for (const c of (ghContribRes.data ?? []) as Any[]) {
    const id = link(c);
    if (id) contribToEmp.set(c.id, id);
  }
  const jiraToEmp = new Map<string, string>();
  for (const a of (jiraAccountsRes.data ?? []) as Any[]) {
    const id = link(a);
    if (id) jiraToEmp.set(a.id, id);
  }
  const cuToEmp = new Map<string, string>();
  for (const m of (cuMembersRes.data ?? []) as Any[]) {
    const id = link({ ...m, email: m.email });
    if (id) cuToEmp.set(m.id, id);
  }

  const buckets = new Map<string, Bucket>();
  const b = (empId: string) => {
    let entry = buckets.get(empId);
    if (!entry) {
      entry = emptyBucket();
      buckets.set(empId, entry);
    }
    return entry;
  };
  const track = (bucket: Bucket, iso: string | null | undefined) => {
    if (!iso) return;
    const ms = new Date(iso).getTime();
    if (Number.isFinite(ms) && ms >= since) bucket.events.push(ms);
  };

  // ---- GitHub ----
  for (const c of (commitsRes.data ?? []) as Any[]) {
    const emp = contribToEmp.get(c.author_contributor_id);
    if (!emp || !inWindow(c.committed_at)) continue;
    const e = b(emp);
    e.commits += 1;
    e.additions += num(c.additions);
    if (c.repository_id) e.repos.add(c.repository_id);
    track(e, c.committed_at);
  }
  for (const p of (prsRes.data ?? []) as Any[]) {
    const emp = contribToEmp.get(p.author_contributor_id);
    if (!emp || !inWindow(p.pr_created_at)) continue;
    const e = b(emp);
    e.prs += 1;
    if (p.merged) e.mergedPrs += 1;
    if (p.repository_id) e.repos.add(p.repository_id);
    track(e, p.pr_created_at);
  }
  for (const r of (reviewsRes.data ?? []) as Any[]) {
    const emp = contribToEmp.get(r.reviewer_contributor_id);
    if (!emp || !inWindow(r.submitted_at)) continue;
    const e = b(emp);
    e.reviews += 1;
    if (r.state === "approved") e.approvals += 1;
    track(e, r.submitted_at);
  }
  for (const i of (ghIssuesRes.data ?? []) as Any[]) {
    const emp = contribToEmp.get(i.assignee_contributor_id);
    if (!emp || !inWindow(i.closed_at)) continue;
    const e = b(emp);
    if (i.state === "closed") e.ghIssuesClosed += 1;
    track(e, i.closed_at);
  }

  // ---- Jira ----
  for (const i of (jiraIssuesRes.data ?? []) as Any[]) {
    const emp = jiraToEmp.get(i.assignee_account_id);
    if (!emp) continue;
    const created = inWindow(i.issue_created_at);
    const resolved = inWindow(i.resolved_at);
    if (!created && !resolved) continue;
    const e = b(emp);
    e.jiraAssigned += 1;
    e.storyPoints += num(i.story_points);
    if (i.sprint_id) e.sprints.add(i.sprint_id);
    if (i.issue_kind === "bug") e.jiraBugs += 1;
    if (i.blocked) e.jiraBlocked += 1;
    if (i.status_category === "done" && i.resolved_at) {
      e.jiraResolved += 1;
      if (i.issue_kind === "bug") e.jiraBugsResolved += 1;
      e.jiraResolutionHours.push(
        (new Date(i.resolved_at).getTime() - new Date(i.issue_created_at).getTime()) / HOUR,
      );
      track(e, i.resolved_at);
    } else {
      track(e, i.issue_created_at);
    }
  }
  for (const w of (jiraWorklogsRes.data ?? []) as Any[]) {
    const emp = jiraToEmp.get(w.author_account_id);
    if (!emp || !inWindow(w.started_at)) continue;
    const e = b(emp);
    e.worklogHours += num(w.time_spent_seconds) / 3600;
    track(e, w.started_at);
  }
  for (const c of (jiraCommentsRes.data ?? []) as Any[]) {
    const emp = jiraToEmp.get(c.author_account_id);
    if (!emp || !inWindow(c.comment_created_at)) continue;
    const e = b(emp);
    e.jiraComments += 1;
    track(e, c.comment_created_at);
  }
  for (const ep of (jiraEpicsRes.data ?? []) as Any[]) {
    const emp = jiraToEmp.get(ep.owner_account_id);
    if (!emp) continue;
    b(emp).epicsOwned += 1;
  }

  // ---- ClickUp ----
  const now = Date.now();
  for (const t of (cuTasksRes.data ?? []) as Any[]) {
    const emp = cuToEmp.get(t.primary_assignee_id);
    if (!emp) continue;
    const created = inWindow(t.task_created_at);
    const done = inWindow(t.completed_at);
    if (!created && !done) continue;
    const e = b(emp);
    e.cuAssigned += 1;
    if (t.space_id) e.cuSpaces.add(t.space_id);
    e.cuHours += num(t.time_spent_ms) / HOUR;
    if (t.task_state === "done" && t.completed_at) {
      e.cuDone += 1;
      if (!t.due_date || new Date(t.completed_at).getTime() <= new Date(t.due_date).getTime())
        e.cuOnTime += 1;
      if (t.task_created_at)
        e.cuCompletionHours.push(
          (new Date(t.completed_at).getTime() - new Date(t.task_created_at).getTime()) / HOUR,
        );
      track(e, t.completed_at);
    } else {
      if (t.due_date && new Date(t.due_date).getTime() < now) e.cuOverdue += 1;
      track(e, t.task_created_at);
    }
  }
  for (const te of (cuTimeRes.data ?? []) as Any[]) {
    const emp = cuToEmp.get(te.member_id);
    if (!emp || !inWindow(te.started_at)) continue;
    const e = b(emp);
    e.cuHours += num(te.duration_ms) / HOUR;
    track(e, te.started_at);
  }
  for (const c of (cuCommentsRes.data ?? []) as Any[]) {
    const emp = cuToEmp.get(c.author_member_id);
    if (!emp || !inWindow(c.comment_created_at)) continue;
    const e = b(emp);
    e.cuComments += 1;
    track(e, c.comment_created_at);
  }

  // ---- Supporting workforce data ----
  const skillsByEmp = new Map<string, number[]>();
  const proficiencyValue: Record<string, number> = {
    beginner: 1,
    intermediate: 2,
    advanced: 3,
    expert: 4,
  };
  for (const s of (skillsRes.data ?? []) as Any[]) {
    const arr = skillsByEmp.get(s.employee_id) ?? [];
    arr.push(proficiencyValue[s.proficiency as string] ?? 1);
    skillsByEmp.set(s.employee_id, arr);
  }
  const projectsByEmp = new Map<string, Any[]>();
  for (const p of (empProjectsRes.data ?? []) as Any[]) {
    const arr = projectsByEmp.get(p.employee_id) ?? [];
    arr.push(p);
    projectsByEmp.set(p.employee_id, arr);
  }
  const reportsCount = new Map<string, number>();
  for (const e of employees) {
    if (e.manager_id) reportsCount.set(e.manager_id, (reportsCount.get(e.manager_id) ?? 0) + 1);
  }

  // ---- Cohort scalers ----
  const all = employees.map((e) => buckets.get(e.id) ?? emptyBucket());
  const sCommits = scaler(all.map((x) => x.commits));
  const sPrs = scaler(all.map((x) => x.prs));
  const sReviews = scaler(all.map((x) => x.reviews));
  const sJiraResolved = scaler(all.map((x) => x.jiraResolved));
  const sPoints = scaler(all.map((x) => x.storyPoints));
  const sCuDone = scaler(all.map((x) => x.cuDone));
  const sHours = scaler(all.map((x) => x.worklogHours + x.cuHours));
  const sComments = scaler(all.map((x) => x.jiraComments + x.cuComments));
  const sSkills = scaler(employees.map((e) => (skillsByEmp.get(e.id) ?? []).reduce((a, c) => a + c, 0)));
  const sRepos = scaler(all.map((x) => x.repos.size + x.cuSpaces.size));
  const sActiveDays = scaler(all.map((x) => new Set(x.events.map((m) => Math.floor(m / DAY))).size));
  const sReports = scaler(employees.map((e) => reportsCount.get(e.id) ?? 0));
  const sEpics = scaler(all.map((x) => x.epicsOwned));
  const resolutionRef = percentile(
    all.flatMap((x) => [...x.jiraResolutionHours, ...x.cuCompletionHours]),
    0.5,
  );

  const weekWindow = Math.max(1, Math.round(rules.lookbackDays / 7));
  const expectedDays = Math.max(1, Math.round((rules.lookbackDays / 7) * 5));

  const scored: EmployeeScore[] = employees.map((emp) => {
    const x = buckets.get(emp.id) ?? emptyBucket();
    const events = [...x.events].sort((a, c) => a - c);
    const dayKeys = new Set(events.map((m) => Math.floor(m / DAY)));
    const activeDays = dayKeys.size;

    const weeklyMap = new Map<string, number>();
    for (let i = weekWindow - 1; i >= 0; i--) weeklyMap.set(weekKey(now - i * 7 * DAY), 0);
    for (const ms of events) {
      const k = weekKey(ms);
      if (weeklyMap.has(k)) weeklyMap.set(k, (weeklyMap.get(k) ?? 0) + 1);
    }
    const weekly = [...weeklyMap.entries()].map(([week, count]) => ({ week, events: count }));
    const half = Math.max(1, Math.floor(weekly.length / 2));
    const firstHalf = weekly.slice(0, half).reduce((a, c) => a + c.events, 0) / half;
    const secondHalf = weekly.slice(-half).reduce((a, c) => a + c.events, 0) / half;
    const trend = firstHalf === 0 ? (secondHalf > 0 ? 100 : 0) : round(((secondHalf - firstHalf) / firstHalf) * 100);

    const months = new Map<string, number>();
    for (const ms of events) months.set(monthKey(ms), (months.get(monthKey(ms)) ?? 0) + 1);

    const activeWeeks = weekly.filter((w) => w.events > 0).length;
    const consistencyScore = clamp(
      0.6 * (activeWeeks / weekly.length) * 100 + 0.4 * (activeDays / expectedDays) * 100,
    );

    const totalAssigned = x.jiraAssigned + x.cuAssigned;
    const totalCompleted = x.jiraResolved + x.cuDone;
    const completionRate = totalAssigned > 0 ? (totalCompleted / totalAssigned) * 100 : 0;
    const resolutionHours = [...x.jiraResolutionHours, ...x.cuCompletionHours];
    const avgCompletionHours = resolutionHours.length
      ? round(resolutionHours.reduce((a, c) => a + c, 0) / resolutionHours.length)
      : 0;
    const trackedHours = round(x.worklogHours + x.cuHours);
    const onTimeRate = x.cuDone > 0 ? (x.cuOnTime / x.cuDone) * 100 : completionRate;
    const mergeRate = x.prs > 0 ? (x.mergedPrs / x.prs) * 100 : 0;
    const bugRatio = x.jiraAssigned > 0 ? x.jiraBugs / x.jiraAssigned : 0;
    const empProjects = projectsByEmp.get(emp.id) ?? [];
    const allocation = empProjects.reduce((a, c) => a + num(c.allocation_percent), 0);

    const speedScore =
      resolutionRef > 0 && avgCompletionHours > 0
        ? clamp((resolutionRef / avgCompletionHours) * 70)
        : completionRate > 0
          ? 50
          : 0;

    const subScores: Record<SubScoreKey, number> = {
      github: clamp(0.4 * sCommits(x.commits) + 0.35 * sPrs(x.prs) + 0.25 * sReviews(x.reviews)),
      jira: clamp(
        0.4 * sJiraResolved(x.jiraResolved) +
          0.3 * sPoints(x.storyPoints) +
          0.3 * (x.jiraAssigned > 0 ? (x.jiraResolved / x.jiraAssigned) * 100 : 0),
      ),
      clickup: clamp(
        0.45 * sCuDone(x.cuDone) +
          0.3 * (x.cuAssigned > 0 ? (x.cuDone / x.cuAssigned) * 100 : 0) +
          0.25 * onTimeRate,
      ),
      attendance: clamp((activeDays / expectedDays) * 100),
      project: clamp(
        0.5 * Math.min(100, allocation) + 0.5 * Math.min(100, empProjects.length * 34),
      ),
      collaboration: clamp(
        0.4 * sReviews(x.reviews) + 0.35 * sComments(x.jiraComments + x.cuComments) + 0.25 * sRepos(x.repos.size + x.cuSpaces.size),
      ),
      leadership: clamp(
        0.4 * sReports(reportsCount.get(emp.id) ?? 0) +
          0.3 * sEpics(x.epicsOwned) +
          0.3 * sReviews(x.reviews),
      ),
      learning: clamp(sSkills((skillsByEmp.get(emp.id) ?? []).reduce((a, c) => a + c, 0))),
      consistency: consistencyScore,
      innovation: clamp(0.5 * sRepos(x.repos.size + x.cuSpaces.size) + 0.5 * sPrs(x.prs)),
      communication: clamp(
        0.6 * sComments(x.jiraComments + x.cuComments) + 0.4 * sReviews(x.reviews),
      ),
      quality: clamp(
        0.4 * mergeRate +
          0.3 * (100 - Math.min(100, bugRatio * 200)) +
          0.3 * (x.jiraBugs > 0 ? (x.jiraBugsResolved / x.jiraBugs) * 100 : mergeRate || 60),
      ),
      delivery: clamp(0.5 * onTimeRate + 0.3 * speedScore + 0.2 * sHours(x.worklogHours + x.cuHours)),
    };

    const weightTotal = SUB_SCORE_KEYS.reduce((a, k) => a + (weights[k] || 0), 0) || 1;
    const overall = clamp(
      SUB_SCORE_KEYS.reduce((a, k) => a + subScores[k] * (weights[k] || 0), 0) / weightTotal,
    );

    const lastActiveAt = events.length ? new Date(events[events.length - 1]).toISOString() : null;
    const idleDays = events.length ? Math.floor((now - events[events.length - 1]) / DAY) : rules.lookbackDays;

    const burnoutScore = clamp(
      0.45 * Math.min(100, (trackedHours / Math.max(1, weekWindow) / thresholds.burnoutHours) * 100) +
        0.3 * Math.min(100, (x.cuOverdue / Math.max(1, thresholds.overdueRisk)) * 100) +
        0.25 * Math.min(100, ((totalAssigned - totalCompleted) / Math.max(1, totalAssigned || 1)) * 100),
    );
    const idleScore = clamp((idleDays / Math.max(1, thresholds.inactiveDays)) * 100);

    const risks: EmployeeScore["risks"] = [];
    if (burnoutScore >= 40)
      risks.push({
        key: "burnout",
        label: "Burnout risk",
        level: riskLevel(burnoutScore),
        detail: `${trackedHours}h tracked, ${x.cuOverdue} overdue tasks, ${Math.max(0, totalAssigned - totalCompleted)} open items.`,
      });
    if (overall < thresholds.needsSupport)
      risks.push({
        key: "low_productivity",
        label: "Low productivity",
        level: overall < thresholds.needsSupport / 2 ? "high" : "medium",
        detail: `Overall AI score ${overall} is below the ${thresholds.needsSupport} support threshold.`,
      });
    if (idleDays >= thresholds.inactiveDays)
      risks.push({
        key: "inactive",
        label: "Inactive",
        level: riskLevel(idleScore),
        detail: `No tracked activity for ${idleDays} days.`,
      });
    if (totalAssigned - totalCompleted > 15)
      risks.push({
        key: "high_workload",
        label: "High workload",
        level: "medium",
        detail: `${totalAssigned - totalCompleted} open items currently assigned.`,
      });
    if (subScores.collaboration < 30)
      risks.push({
        key: "low_collaboration",
        label: "Low collaboration",
        level: "medium",
        detail: `${x.reviews} reviews and ${x.jiraComments + x.cuComments} comments in the period.`,
      });
    if (x.cuOverdue >= thresholds.overdueRisk)
      risks.push({
        key: "deadline",
        label: "Deadline risk",
        level: riskLevel(Math.min(100, x.cuOverdue * 20)),
        detail: `${x.cuOverdue} tasks are past their due date.`,
      });

    const ranked = SUB_SCORE_KEYS.filter((k) => (weights[k] || 0) > 0 || subScores[k] > 0).sort(
      (a, c) => subScores[c] - subScores[a],
    );
    const achievements: string[] = [];
    for (const k of ranked.slice(0, 3)) {
      if (subScores[k] >= 70) achievements.push(`Strong ${SUB_SCORE_LABELS[k]} performance (${subScores[k]}/100)`);
    }
    if (completionRate >= 90 && totalAssigned >= 5)
      achievements.push(`Completed ${Math.round(completionRate)}% of assigned work`);
    if (mergeRate >= 80 && x.prs >= 3) achievements.push(`${Math.round(mergeRate)}% pull request merge rate`);

    const growthAreas = ranked
      .slice(-3)
      .filter((k) => subScores[k] < 50)
      .map((k) => `${SUB_SCORE_LABELS[k]} (${subScores[k]}/100)`);

    const insights: string[] = [];
    if (totalAssigned > 0)
      insights.push(
        `${emp.full_name} completed ${Math.round(completionRate)}% of ${totalAssigned} assigned items in the last ${rules.lookbackDays} days.`,
      );
    if (x.commits > 0)
      insights.push(
        `${x.commits} commits and ${x.prs} pull requests across ${x.repos.size} repositories.`,
      );
    if (trend > 15) insights.push(`Activity is trending up ${trend}% versus the previous period.`);
    if (trend < -15) insights.push(`Activity is trending down ${Math.abs(trend)}% versus the previous period.`);
    if (idleDays >= thresholds.inactiveDays)
      insights.push(`${emp.full_name} has been inactive for ${idleDays} days.`);

    const recommendations: string[] = [];
    if (overall >= thresholds.promotionReady && subScores.leadership >= 50)
      recommendations.push("Promotion candidate — sustained high performance with leadership signals.");
    if (overall < thresholds.needsSupport)
      recommendations.push("Schedule a support check-in and review workload distribution.");
    for (const g of growthAreas.slice(0, 2)) recommendations.push(`Training recommended to improve ${g}.`);
    if ((skillsByEmp.get(emp.id) ?? []).length < 3)
      recommendations.push("Skill profile is thin — capture current skills and set a learning plan.");
    if (empProjects.length === 0 && overall >= 50)
      recommendations.push("Available capacity — consider assigning to an active project.");

    const history = weekly.map((w) => ({
      period: w.week,
      score: clamp(weekly.length ? (w.events / Math.max(1, Math.max(...weekly.map((z) => z.events)))) * overall : 0),
    }));

    return {
      id: emp.id,
      name: emp.full_name,
      email: emp.email,
      designation: emp.designation ?? null,
      photo: emp.profile_photo ?? null,
      departmentId: emp.department_id ?? null,
      departmentName: emp.department_id ? (deptName.get(emp.department_id) ?? null) : null,
      teamId: emp.team_id ?? null,
      teamName: emp.team_id ? (teamName.get(emp.team_id) ?? null) : null,
      managerId: emp.manager_id ?? null,
      managerName: emp.manager_id ? (empName.get(emp.manager_id) ?? null) : null,
      status: emp.status,
      overall,
      subScores,
      productivity: {
        taskCompletionRate: round(completionRate),
        commitFrequency: round(x.commits / Math.max(1, weekWindow)),
        pullRequests: x.prs,
        issueResolution: x.jiraResolved + x.ghIssuesClosed,
        storyPoints: round(x.storyPoints),
        sprintContribution: x.sprints.size,
        trackedHours,
        avgCompletionHours,
        reviewActivity: x.reviews,
        repositoryContributions: x.repos.size,
      },
      consistency: {
        activeDays,
        dailyAverage: round(events.length / Math.max(1, rules.lookbackDays)),
        weeklyAverage: round(events.length / Math.max(1, weekWindow)),
        monthlyAverage: round(events.length / Math.max(1, months.size || 1)),
        trend,
        weekly,
      },
      workload: {
        assigned: totalAssigned,
        completed: totalCompleted,
        overdue: x.cuOverdue,
        capacity: clamp(100 - Math.min(100, ((totalAssigned - totalCompleted) / 20) * 100)),
        burnoutRisk: riskLevel(burnoutScore),
        idleRisk: riskLevel(idleScore),
      },
      prediction: {
        futureProductivity: clamp(overall * 0.75 + Math.max(-25, Math.min(25, trend / 4)) + consistencyScore * 0.15),
        promotionReadiness: clamp(
          overall * 0.55 + subScores.leadership * 0.2 + subScores.quality * 0.15 + consistencyScore * 0.1,
        ),
        attritionRisk: clamp(
          burnoutScore * 0.4 + idleScore * 0.35 + Math.max(0, 60 - overall) * 0.25,
        ),
        projectSuccess: clamp(subScores.delivery * 0.5 + subScores.quality * 0.3 + consistencyScore * 0.2),
      },
      risks,
      achievements,
      growthAreas,
      insights,
      recommendations,
      lastActiveAt,
      dataCoverage: {
        github: x.commits + x.prs + x.reviews > 0,
        jira: x.jiraAssigned > 0,
        clickup: x.cuAssigned > 0,
      },
      orgRank: 0,
      departmentRank: 0,
      teamRank: 0,
      history,
    };
  });

  // ---- Rankings ----
  const byOverall = [...scored].sort((a, c) => c.overall - a.overall);
  byOverall.forEach((e, i) => (e.orgRank = i + 1));
  const rankWithin = (key: "departmentId" | "teamId", target: "departmentRank" | "teamRank") => {
    const groups = new Map<string, EmployeeScore[]>();
    for (const e of scored) {
      const g = e[key] ?? "none";
      groups.set(g, [...(groups.get(g) ?? []), e]);
    }
    for (const list of groups.values()) {
      list.sort((a, c) => c.overall - a.overall).forEach((e, i) => (e[target] = i + 1));
    }
  };
  rankWithin("departmentId", "departmentRank");
  rankWithin("teamId", "teamRank");

  const groupScores = (
    items: { id: string; name: string }[],
    pick: (e: EmployeeScore) => string | null,
  ): GroupScore[] => {
    const rows = items
      .map((item) => {
        const members = scored.filter((e) => pick(e) === item.id);
        const scores = members.map((m) => m.overall);
        const assigned = members.reduce((a, m) => a + m.workload.assigned, 0);
        const completed = members.reduce((a, m) => a + m.workload.completed, 0);
        return {
          id: item.id,
          name: item.name,
          headcount: members.length,
          average: scores.length ? round(scores.reduce((a, c) => a + c, 0) / scores.length) : 0,
          top: scores.length ? Math.max(...scores) : 0,
          bottom: scores.length ? Math.min(...scores) : 0,
          completionRate: assigned ? round((completed / assigned) * 100) : 0,
          rank: 0,
        };
      })
      .filter((g) => g.headcount > 0)
      .sort((a, c) => c.average - a.average);
    rows.forEach((g, i) => (g.rank = i + 1));
    return rows;
  };

  const departments = groupScores(
    [...deptName.entries()].map(([id, name]) => ({ id, name })),
    (e) => e.departmentId,
  );
  const teams = groupScores(
    [...teamName.entries()].map(([id, name]) => ({ id, name })),
    (e) => e.teamId,
  );

  const projectMembers = new Map<string, string[]>();
  for (const p of (empProjectsRes.data ?? []) as Any[]) {
    projectMembers.set(p.project_id, [...(projectMembers.get(p.project_id) ?? []), p.employee_id]);
  }
  const projects: GroupScore[] = projectRows
    .map((p) => {
      const ids = projectMembers.get(p.id) ?? [];
      const members = scored.filter((e) => ids.includes(e.id));
      const scores = members.map((m) => m.overall);
      const assigned = members.reduce((a, m) => a + m.workload.assigned, 0);
      const completed = members.reduce((a, m) => a + m.workload.completed, 0);
      return {
        id: p.id as string,
        name: p.name as string,
        headcount: members.length,
        average: scores.length ? round(scores.reduce((a, c) => a + c, 0) / scores.length) : 0,
        top: scores.length ? Math.max(...scores) : 0,
        bottom: scores.length ? Math.min(...scores) : 0,
        completionRate: assigned ? round((completed / assigned) * 100) : 0,
        rank: 0,
      };
    })
    .filter((g) => g.headcount > 0)
    .sort((a, c) => c.average - a.average)
    .map((g, i) => ({ ...g, rank: i + 1 }));

  // ---- Leaderboards ----
  const board = (
    key: string,
    title: string,
    description: string,
    value: (e: EmployeeScore) => number,
    unit: string,
  ): Leaderboard => ({
    key,
    title,
    description,
    entries: [...scored]
      .map((e) => ({ employeeId: e.id, name: e.name, photo: e.photo, value: round(value(e)) }))
      .filter((e) => e.value > 0)
      .sort((a, c) => c.value - a.value)
      .slice(0, 10)
      .map((e) => ({ ...e, unit })),
  });

  const leaderboards: Leaderboard[] = [
    board("top_performer", "Top Performer", "Highest overall AI score", (e) => e.overall, "score"),
    board("top_developer", "Top Developer", "Strongest GitHub engineering score", (e) => e.subScores.github, "score"),
    board("top_contributor", "Top Contributor", "Most commits and pull requests", (e) => e.productivity.commitFrequency * 4 + e.productivity.pullRequests, "contributions"),
    board("top_reviewer", "Top Reviewer", "Most code reviews submitted", (e) => e.productivity.reviewActivity, "reviews"),
    board("top_collaborator", "Top Collaborator", "Highest collaboration score", (e) => e.subScores.collaboration, "score"),
    board("fastest_delivery", "Fastest Delivery", "Lowest average completion time", (e) =>
      e.productivity.avgCompletionHours > 0 ? round(1000 / e.productivity.avgCompletionHours) : 0, "index"),
    board("highest_productivity", "Highest Productivity", "Completed work volume", (e) => e.workload.completed, "items"),
    board("most_consistent", "Most Consistent", "Steadiest activity pattern", (e) => e.subScores.consistency, "score"),
    board("best_team_player", "Best Team Player", "Collaboration + communication", (e) =>
      round((e.subScores.collaboration + e.subScores.communication) / 2), "score"),
    board("most_improved", "Most Improved", "Largest positive activity trend", (e) => Math.max(0, e.consistency.trend), "% growth"),
  ];

  // ---- Org level aggregates ----
  const scoredWithData = scored.filter(
    (e) => e.workload.assigned + e.productivity.pullRequests + e.productivity.commitFrequency > 0,
  );
  const averageScore = scoredWithData.length
    ? round(scoredWithData.reduce((a, c) => a + c.overall, 0) / scoredWithData.length)
    : 0;
  const totalAssignedOrg = scored.reduce((a, c) => a + c.workload.assigned, 0);
  const totalCompletedOrg = scored.reduce((a, c) => a + c.workload.completed, 0);

  const distributionBuckets = ["0–20", "21–40", "41–60", "61–80", "81–100"];
  const distribution = distributionBuckets.map((bucket, i) => ({
    bucket,
    count: scored.filter((e) => e.overall > i * 20 && e.overall <= (i + 1) * 20).length,
  }));

  const trendMap = new Map<string, { events: number; actives: Set<string> }>();
  for (const e of scored) {
    for (const w of e.consistency.weekly) {
      const entry = trendMap.get(w.week) ?? { events: 0, actives: new Set<string>() };
      entry.events += w.events;
      if (w.events > 0) entry.actives.add(e.id);
      trendMap.set(w.week, entry);
    }
  }
  const trend = [...trendMap.entries()]
    .sort((a, c) => a[0].localeCompare(c[0]))
    .map(([week, v]) => ({ week, events: v.events, activeEmployees: v.actives.size }));

  const highPerformers = byOverall.filter((e) => e.overall >= thresholds.highPerformer);
  const needSupport = [...scored]
    .filter((e) => e.overall < thresholds.needsSupport)
    .sort((a, c) => a.overall - c.overall);
  const promotion = byOverall.filter(
    (e) => e.prediction.promotionReadiness >= thresholds.promotionReady,
  );
  const burnout = scored.filter((e) => e.workload.burnoutRisk === "high");
  const inactive = scored.filter((e) => e.risks.some((r) => r.key === "inactive"));

  const toEntry = (e: EmployeeScore, value: number, unit: string): LeaderboardEntry => ({
    employeeId: e.id,
    name: e.name,
    photo: e.photo,
    value: round(value),
    unit,
  });

  const orgInsights: AiIntelligence["insights"] = [];
  if (byOverall[0])
    orgInsights.push({
      id: "top",
      kind: "positive",
      text: `${byOverall[0].name} leads the organization with an AI score of ${byOverall[0].overall}.`,
    });
  const topJira = [...scored].sort((a, c) => c.productivity.issueResolution - a.productivity.issueResolution)[0];
  if (topJira?.productivity.issueResolution)
    orgInsights.push({
      id: "issues",
      kind: "positive",
      text: `${topJira.name} resolved the highest number of issues (${topJira.productivity.issueResolution}).`,
    });
  const topCommitter = [...scored].sort((a, c) => c.productivity.commitFrequency - a.productivity.commitFrequency)[0];
  if (topCommitter?.productivity.commitFrequency)
    orgInsights.push({
      id: "commits",
      kind: "positive",
      text: `${topCommitter.name} averages ${topCommitter.productivity.commitFrequency} commits per week.`,
    });
  for (const e of inactive.slice(0, 3)) {
    const days = e.lastActiveAt ? Math.floor((now - new Date(e.lastActiveAt).getTime()) / DAY) : rules.lookbackDays;
    orgInsights.push({ id: `inactive-${e.id}`, kind: "warning", text: `${e.name} has been inactive for ${days} days.` });
  }
  for (const e of burnout.slice(0, 3))
    orgInsights.push({
      id: `burnout-${e.id}`,
      kind: "warning",
      text: `${e.name} shows a high burnout risk with ${e.workload.assigned - e.workload.completed} open items.`,
    });
  if (departments[0])
    orgInsights.push({
      id: "dept",
      kind: "neutral",
      text: `${departments[0].name} is the top ranked department with an average score of ${departments[0].average}.`,
    });
  for (const e of scored.filter((x) => x.consistency.trend > 40).slice(0, 3))
    orgInsights.push({
      id: `improved-${e.id}`,
      kind: "positive",
      text: `${e.name} improved activity by ${e.consistency.trend}% versus the previous period.`,
    });

  const result: AiIntelligence = {
    generatedAt: new Date().toISOString(),
    settings,
    canManage: opts.canManage,
    selfEmployeeId: employees.find((e) => e.user_id === opts.userId)?.id ?? null,
    totals: {
      employees: employees.length,
      scored: scoredWithData.length,
      averageScore,
      overallProductivity: totalAssignedOrg ? round((totalCompletedOrg / totalAssignedOrg) * 100) : 0,
      highPerformers: highPerformers.length,
      needsSupport: needSupport.length,
      burnoutAlerts: burnout.length,
      inactive: inactive.length,
      promotionCandidates: promotion.length,
    },
    employees: byOverall,
    departments,
    teams,
    projects,
    leaderboards,
    distribution,
    trend,
    insights: orgInsights,
    recommendations: {
      promotion: promotion.slice(0, 10).map((e) => toEntry(e, e.prediction.promotionReadiness, "readiness")),
      highPerformers: highPerformers.slice(0, 10).map((e) => toEntry(e, e.overall, "score")),
      needSupport: needSupport.slice(0, 10).map((e) => toEntry(e, e.overall, "score")),
      training: scored
        .filter((e) => e.growthAreas.length > 0)
        .slice(0, 10)
        .map((e) => ({ employeeId: e.id, name: e.name, detail: `Focus on ${e.growthAreas.join(", ")}` })),
      skillGaps: scored
        .filter((e) => (skillsByEmp.get(e.id) ?? []).length < 3)
        .slice(0, 10)
        .map((e) => ({
          employeeId: e.id,
          name: e.name,
          detail: `${(skillsByEmp.get(e.id) ?? []).length} skills recorded — capture and close skill gaps.`,
        })),
      projectAssignments: scored
        .filter((e) => (projectsByEmp.get(e.id) ?? []).length === 0 && e.overall >= 40)
        .slice(0, 10)
        .map((e) => ({
          employeeId: e.id,
          name: e.name,
          detail: `Available capacity (${e.workload.capacity}%) with an AI score of ${e.overall}.`,
        })),
      potentialLeads: scored
        .filter((e) => e.subScores.leadership >= 55 && e.overall >= 60)
        .sort((a, c) => c.subScores.leadership - a.subScores.leadership)
        .slice(0, 10)
        .map((e) => toEntry(e, e.subScores.leadership, "leadership")),
    },
    risks: scored.flatMap((e) =>
      e.risks.map((r) => ({ employeeId: e.id, name: e.name, ...r })),
    ),
  };

  if (!opts.canManage) {
    const self = result.selfEmployeeId
      ? result.employees.find((e) => e.id === result.selfEmployeeId)
      : undefined;
    return {
      ...result,
      totals: { ...result.totals, employees: self ? 1 : 0, scored: self ? 1 : 0 },
      employees: self ? [self] : [],
      departments: [],
      teams: [],
      projects: [],
      leaderboards: [],
      distribution: [],
      trend: self ? self.consistency.weekly.map((w) => ({ week: w.week, events: w.events, activeEmployees: w.events > 0 ? 1 : 0 })) : [],
      insights: self ? self.insights.map((text, i) => ({ id: `self-${i}`, kind: "neutral" as const, text })) : [],
      recommendations: {
        promotion: [],
        highPerformers: [],
        needSupport: [],
        training: [],
        skillGaps: [],
        projectAssignments: [],
        potentialLeads: [],
      },
      risks: self ? self.risks.map((r) => ({ employeeId: self.id, name: self.name, ...r })) : [],
    };
  }

  return result;
}