import type { SupabaseClient } from "@supabase/supabase-js";
import { computeAiIntelligence } from "@/features/ai-engine/lib/engine.server";
import type { EmployeeScore } from "@/features/ai-engine/types";

const LIMIT = 20000;
const TEXT_CAP = 6000;

export type CandidateEvidence = {
  employeeId: string;
  tenureYears: number;
  /** Lifetime GitHub contributions across all tracked repositories. */
  contributions: number;
  skills: { name: string; category: string; proficiency: string; years: number }[];
  languages: Record<string, number>;
  repositories: string[];
  projects: { name: string; role: string | null; status: string; allocation: number; techStack: string[] }[];
  issueText: string;
  taskText: string;
  commitText: string;
};

export type TalentPool = {
  scores: EmployeeScore[];
  evidence: Map<string, CandidateEvidence>;
  departments: { id: string; name: string }[];
  teams: { id: string; name: string }[];
};

function cap(text: string) {
  return text.length > TEXT_CAP ? text.slice(0, TEXT_CAP) : text;
}

export async function buildTalentPool(
  supabase: SupabaseClient,
  opts: { userId: string; canManage: boolean },
): Promise<TalentPool> {
  const intelligence = await computeAiIntelligence(supabase, opts);

  const [
    skillsRes,
    employeesRes,
    empProjectsRes,
    projectsRes,
    ghContribRes,
    repoContribRes,
    reposRes,
    jiraAccountsRes,
    jiraIssuesRes,
    cuMembersRes,
    cuTasksRes,
    departmentsRes,
    teamsRes,
    commitsRes,
  ] = await Promise.all([
    supabase
      .from("employee_skills")
      .select("employee_id, proficiency, years_experience, skills(name, category)")
      .limit(LIMIT),
    supabase.from("employees").select("id, joining_date").is("deleted_at", null).limit(LIMIT),
    supabase.from("employee_projects").select("employee_id, project_id, role, allocation_percent").limit(LIMIT),
    supabase.from("projects").select("id, name, description, status, tech_stack").is("deleted_at", null).limit(LIMIT),
    supabase.from("github_contributors").select("id, linked_employee_id").limit(LIMIT),
    supabase.from("github_repo_contributors").select("repository_id, contributor_id, contributions").limit(LIMIT),
    supabase.from("github_repositories").select("id, name, description, language").limit(LIMIT),
    supabase.from("jira_accounts").select("id, linked_employee_id").limit(LIMIT),
    supabase
      .from("jira_issues")
      .select("assignee_account_id, summary, labels")
      .order("issue_created_at", { ascending: false })
      .limit(LIMIT),
    supabase.from("clickup_members").select("id, linked_employee_id").limit(LIMIT),
    supabase
      .from("clickup_tasks")
      .select("primary_assignee_id, name, tags")
      .order("task_updated_at", { ascending: false })
      .limit(LIMIT),
    supabase.from("departments").select("id, name").is("deleted_at", null),
    supabase.from("teams").select("id, name").is("deleted_at", null),
    supabase
      .from("github_commits")
      .select("author_contributor_id, message")
      .order("committed_at", { ascending: false })
      .limit(LIMIT),
  ]);

  const evidence = new Map<string, CandidateEvidence>();
  const ensure = (id: string): CandidateEvidence => {
    let entry = evidence.get(id);
    if (!entry) {
      entry = {
        employeeId: id,
        tenureYears: 0,
        contributions: 0,
        skills: [],
        languages: {},
        repositories: [],
        projects: [],
        issueText: "",
        taskText: "",
        commitText: "",
      };
      evidence.set(id, entry);
    }
    return entry;
  };
  for (const score of intelligence.employees) ensure(score.id);

  for (const row of employeesRes.data ?? []) {
    const r = row as { id: string; joining_date: string | null };
    if (!evidence.has(r.id) || !r.joining_date) continue;
    const ms = Date.now() - new Date(r.joining_date).getTime();
    if (ms > 0) ensure(r.id).tenureYears = Math.round((ms / (365.25 * 24 * 3600 * 1000)) * 10) / 10;
  }

  for (const row of skillsRes.data ?? []) {
    const r = row as {
      employee_id: string;
      proficiency: string;
      years_experience: number | null;
      skills: { name: string; category: string } | { name: string; category: string }[] | null;
    };
    if (!evidence.has(r.employee_id)) continue;
    const skill = Array.isArray(r.skills) ? r.skills[0] : r.skills;
    if (!skill?.name) continue;
    ensure(r.employee_id).skills.push({
      name: skill.name,
      category: skill.category ?? "other",
      proficiency: r.proficiency ?? "intermediate",
      years: Number(r.years_experience ?? 0) || 0,
    });
  }

  const projectById = new Map(
    (projectsRes.data ?? []).map((p) => [
      (p as { id: string }).id,
      p as { id: string; name: string; description: string | null; status: string; tech_stack: unknown },
    ]),
  );
  for (const row of empProjectsRes.data ?? []) {
    const r = row as {
      employee_id: string;
      project_id: string;
      role: string | null;
      allocation_percent: number | null;
    };
    if (!evidence.has(r.employee_id)) continue;
    const project = projectById.get(r.project_id);
    if (!project) continue;
    ensure(r.employee_id).projects.push({
      name: `${project.name}${project.description ? ` — ${project.description}` : ""}`,
      role: r.role,
      status: project.status,
      allocation: Number(r.allocation_percent ?? 0) || 0,
      techStack: Array.isArray(project.tech_stack) ? (project.tech_stack as unknown[]).map(String) : [],
    });
  }

  const contributorToEmployee = new Map<string, string>();
  for (const row of ghContribRes.data ?? []) {
    const r = row as { id: string; linked_employee_id: string | null };
    if (r.linked_employee_id) contributorToEmployee.set(r.id, r.linked_employee_id);
  }
  const repoById = new Map(
    (reposRes.data ?? []).map((r) => [
      (r as { id: string }).id,
      r as { id: string; name: string; description: string | null; language: string | null },
    ]),
  );
  for (const row of repoContribRes.data ?? []) {
    const r = row as { repository_id: string; contributor_id: string; contributions: number };
    const employeeId = contributorToEmployee.get(r.contributor_id);
    if (!employeeId || !evidence.has(employeeId)) continue;
    const repo = repoById.get(r.repository_id);
    if (!repo) continue;
    const entry = ensure(employeeId);
    entry.contributions += Number(r.contributions) || 0;
    const label = `${repo.name}${repo.description ? ` — ${repo.description}` : ""}`;
    if (!entry.repositories.includes(label)) entry.repositories.push(label);
    if (repo.language) {
      entry.languages[repo.language] = (entry.languages[repo.language] ?? 0) + (Number(r.contributions) || 1);
    }
  }

  for (const row of commitsRes.data ?? []) {
    const r = row as { author_contributor_id: string | null; message: string | null };
    if (!r.author_contributor_id || !r.message) continue;
    const employeeId = contributorToEmployee.get(r.author_contributor_id);
    if (!employeeId || !evidence.has(employeeId)) continue;
    const entry = ensure(employeeId);
    if (entry.commitText.length > TEXT_CAP) continue;
    entry.commitText += ` ${r.message}`;
  }

  const jiraAccountToEmployee = new Map<string, string>();
  for (const row of jiraAccountsRes.data ?? []) {
    const r = row as { id: string; linked_employee_id: string | null };
    if (r.linked_employee_id) jiraAccountToEmployee.set(r.id, r.linked_employee_id);
  }
  for (const row of jiraIssuesRes.data ?? []) {
    const r = row as { assignee_account_id: string | null; summary: string | null; labels: unknown };
    if (!r.assignee_account_id) continue;
    const employeeId = jiraAccountToEmployee.get(r.assignee_account_id);
    if (!employeeId || !evidence.has(employeeId)) continue;
    const entry = ensure(employeeId);
    if (entry.issueText.length > TEXT_CAP) continue;
    const labels = Array.isArray(r.labels) ? (r.labels as unknown[]).join(" ") : "";
    entry.issueText += ` ${r.summary ?? ""} ${labels}`;
  }

  const cuMemberToEmployee = new Map<string, string>();
  for (const row of cuMembersRes.data ?? []) {
    const r = row as { id: string; linked_employee_id: string | null };
    if (r.linked_employee_id) cuMemberToEmployee.set(r.id, r.linked_employee_id);
  }
  for (const row of cuTasksRes.data ?? []) {
    const r = row as { primary_assignee_id: string | null; name: string | null; tags: unknown };
    if (!r.primary_assignee_id) continue;
    const employeeId = cuMemberToEmployee.get(r.primary_assignee_id);
    if (!employeeId || !evidence.has(employeeId)) continue;
    const entry = ensure(employeeId);
    if (entry.taskText.length > TEXT_CAP) continue;
    const tags = Array.isArray(r.tags) ? (r.tags as unknown[]).join(" ") : "";
    entry.taskText += ` ${r.name ?? ""} ${tags}`;
  }

  for (const entry of evidence.values()) {
    entry.issueText = cap(entry.issueText);
    entry.taskText = cap(entry.taskText);
  }

  return {
    scores: intelligence.employees,
    evidence,
    departments: (departmentsRes.data ?? []) as { id: string; name: string }[],
    teams: (teamsRes.data ?? []) as { id: string; name: string }[],
  };
}