import { matchCandidates } from "../src/features/talent-matcher/lib/match.server";
import { extractRequirementDeterministic } from "../src/features/talent-matcher/lib/requirements.server";
import { DEFAULT_MATCH_WEIGHTS } from "../src/features/talent-matcher/types";
import { execSync } from "child_process";

const q = (sql: string) =>
  JSON.parse(execSync(`psql -tAc ${JSON.stringify(`select coalesce(json_agg(t),'[]') from (${sql}) t`)}`, { encoding: "utf8" }));

const org = execSync(`psql -tAc "select organization_id from employees where deleted_at is null group by 1 order by count(*) desc limit 1"`, { encoding: "utf8" }).trim();
const emps = q(`select e.id, e.first_name||' '||e.last_name as name, e.designation, d.name as dept from employees e left join departments d on d.id=e.department_id where e.deleted_at is null and e.organization_id='${org}' limit 500`);
const skills = q(`select es.employee_id, s.name, s.category::text, es.proficiency::text from employee_skills es join skills s on s.id=es.skill_id where es.employee_id in (select id from employees where organization_id='${org}')`);

const skillsBy = new Map<string, any[]>();
for (const s of skills) {
  if (!skillsBy.has(s.employee_id)) skillsBy.set(s.employee_id, []);
  skillsBy.get(s.employee_id)!.push({ name: s.name, category: s.category, proficiency: s.proficiency, years: 3 });
}

const mkScore = (e: any, boost: number) => ({
  id: e.id, name: e.name, email: "x@y.z", photo: null, designation: e.designation,
  departmentId: null, departmentName: e.dept, teamId: null, teamName: null, managerName: null, status: "active",
  overall: 70, fit: "", dataCoverage: { github: true, jira: true, clickup: true },
  subScores: { github: boost, jira: boost, clickup: boost, collaboration: 70, learning: 70, communication: 70, leadership: 70 },
  productivity: { commitFrequency: 100, pullRequests: 20, reviewActivity: 15, repositoryContributions: 4, issueResolution: 40, storyPoints: 90, sprintContribution: 6, taskCompletionRate: 85, trackedHours: 300 },
  workload: { burnoutRisk: "low", completed: 50 },
} as any);

// PMs and QAs get MAX delivery scores to prove the gate works.
const scores = emps.map((e: any) => mkScore(e, /Product Manager|QA/i.test(e.designation ?? "") ? 100 : 55));
const evidence = new Map(emps.map((e: any) => [e.id, {
  employeeId: e.id, tenureYears: 4, skills: skillsBy.get(e.id) ?? [], languages: {}, repositories: [], projects: [],
  issueText: "", taskText: "", commitText: "",
}]));

const settings = { weights: DEFAULT_MATCH_WEIGHTS, rules: { formula: "skill_first", minScore: 0, topN: 10, includeInactive: false }, roleTemplates: [], skillCategories: [] } as any;
const pool = { scores, evidence, departments: [], teams: [] } as any;

for (const query of ["Recommend the best AI Engineer", "Recommend the best Application Developer"]) {
  const req = extractRequirementDeterministic(query);
  const res = matchCandidates(pool, req, settings, { topN: 10 });
  console.log(`\n=== ${query}`);
  console.log("required:", req.primarySkills.join(", "), "| roles:", req.roleKeys.join(","));
  for (const c of res.candidates) console.log(` #${c.rank} ${c.overall.toFixed(1)} ${String(c.designation).padEnd(28)} skill ${c.skillMatchPercent}% rel ${c.projectRelevancePercent}% roleFit ${c.roleFit.score}`);
  const titles = res.candidates.map((c) => c.designation ?? "");
  console.log("PM/QA in top10:", titles.filter((t) => /Product Manager|QA/i.test(t)).length);
}
