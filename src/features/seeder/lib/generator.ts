import { chance, float, int, iso, isoDate, makeRng, monthStart, pick, pickMany, type Rng } from "./random";

export type SeedBatch = { table: string; rows: Record<string, unknown>[] };

const uuid = () => crypto.randomUUID();

const FIRST = ["Aarav","Priya","Liam","Sofia","Noah","Mia","Ethan","Ava","Kabir","Isha","Lucas","Emma","Rohan","Nina","Diego","Yuki","Omar","Zara","Elena","Marcus","Chloe","Arjun","Hana","Tomas","Layla","Felix","Anika","Jonas","Maya","Ravi","Clara","Dmitri","Farah","Leo","Sana","Victor","Amara","Kenji","Julia","Samir"];
const LAST = ["Sharma","Nguyen","Okafor","Rossi","Kim","Silva","Novak","Haddad","Fischer","Costa","Patel","Larsen","Moreau","Tanaka","Duarte","Ivanov","Mensah","Klein","Bianchi","Reyes","Petrov","Ahmed","Weber","Santos","Cohen","Dubois","Lindqvist","Mbeki","Kowalski","Ferrari"];
const DEPARTMENTS = [
  ["Engineering","ENG","#6366f1"],["Product","PRD","#0ea5e9"],["Design","DSN","#ec4899"],
  ["Quality Assurance","QAA","#f59e0b"],["Data & AI","DAI","#8b5cf6"],["DevOps","OPS","#10b981"],
  ["Human Resources","HRD","#f43f5e"],["Sales","SLS","#22c55e"],["Marketing","MKT","#eab308"],
  ["Finance","FIN","#64748b"],
] as const;
const DESIGNATIONS = ["Software Engineer","Senior Software Engineer","Staff Engineer","Engineering Manager","Product Manager","Product Designer","QA Engineer","Data Scientist","ML Engineer","DevOps Engineer","Site Reliability Engineer","Technical Lead","Business Analyst","Scrum Master","HR Business Partner","Account Executive","Marketing Specialist","Financial Analyst"];
const LOCATIONS = ["Bengaluru, IN","Austin, TX","Berlin, DE","London, UK","Toronto, CA","Singapore, SG","Lisbon, PT","Remote"];
const SKILLS: [string, string][] = [
  ["TypeScript","programming"],["JavaScript","programming"],["React","programming"],["Next.js","programming"],["Node.js","programming"],["Python","programming"],["FastAPI","programming"],["Django","programming"],["Go","programming"],["Rust","programming"],["Java","programming"],["Kotlin","programming"],["Swift","programming"],["GraphQL","programming"],["REST API Design","programming"],["Tailwind CSS","programming"],
  ["AWS","cloud"],["Azure","cloud"],["GCP","cloud"],["Kubernetes","cloud"],["Terraform","cloud"],["Docker","cloud"],["CI/CD","cloud"],["Jenkins","cloud"],["GitHub Actions","cloud"],["Observability","cloud"],["Linux Administration","cloud"],
  ["PostgreSQL","database"],["MongoDB","database"],["Redis","database"],["Snowflake","database"],["ClickHouse","database"],["Airflow","database"],["dbt","database"],["Spark","database"],["SQL Analytics","database"],
  ["LLM Fine-tuning","ai"],["PyTorch","ai"],["TensorFlow","ai"],["scikit-learn","ai"],["LangChain","ai"],["RAG Pipelines","ai"],["Vector Search","ai"],["Computer Vision","ai"],["NLP","ai"],["MLOps","ai"],["Prompt Engineering","ai"],["Model Deployment","ai"],["Pandas","ai"],["Statistics","ai"],["Deep Learning","ai"],
  ["Team Leadership","leadership"],["Mentoring","leadership"],["Stakeholder Management","leadership"],["Hiring","leadership"],["Roadmap Planning","leadership"],
  ["Communication","soft_skills"],["Problem Solving","soft_skills"],["Ownership","soft_skills"],["Collaboration","soft_skills"],
  ["Figma","other"],["Design Systems","other"],["User Research","other"],["Prototyping","other"],["Cypress","other"],["Playwright","other"],["Selenium","other"],["Test Automation","other"],["Performance Testing","other"],["Jira Administration","other"],["Technical Writing","other"],["Agile Delivery","other"],["Product Analytics","other"],
];

/** Role archetypes drive department, skills, salary band and seniority mix. */
type RoleArchetype = {
  title: string;
  department: string;
  primary: string[];
  secondary: string[];
  base: number;
};
const ROLES: RoleArchetype[] = [
  { title: "AI Engineer", department: "Data & AI", base: 118, primary: ["LLM Fine-tuning","LangChain","RAG Pipelines","Python","Prompt Engineering"], secondary: ["PyTorch","MLOps","Model Deployment","AWS","Vector Search" ] },
  { title: "Python Developer", department: "Engineering", base: 96, primary: ["Python","FastAPI","PostgreSQL","REST API Design"], secondary: ["Django","Redis","Docker","AWS"] },
  { title: "Data Scientist", department: "Data & AI", base: 110, primary: ["Python","Pandas","Statistics","scikit-learn","SQL Analytics"], secondary: ["Snowflake","dbt","Deep Learning","Spark"] },
  { title: "ML Engineer", department: "Data & AI", base: 122, primary: ["PyTorch","TensorFlow","MLOps","Python","Model Deployment"], secondary: ["Kubernetes","Airflow","Computer Vision","NLP"] },
  { title: "Full Stack Developer", department: "Engineering", base: 102, primary: ["TypeScript","React","Node.js","PostgreSQL"], secondary: ["GraphQL","Next.js","AWS","Docker"] },
  { title: "React Developer", department: "Engineering", base: 94, primary: ["React","TypeScript","Next.js","Tailwind CSS"], secondary: ["JavaScript","GraphQL","Design Systems","Playwright"] },
  { title: "DevOps Engineer", department: "DevOps", base: 108, primary: ["Kubernetes","Terraform","CI/CD","AWS","Docker"], secondary: ["Observability","Linux Administration","GitHub Actions","Jenkins"] },
  { title: "Product Manager", department: "Product", base: 116, primary: ["Roadmap Planning","Stakeholder Management","Product Analytics","Agile Delivery"], secondary: ["Communication","User Research","SQL Analytics"] },
  { title: "QA Engineer", department: "Quality Assurance", base: 82, primary: ["Test Automation","Cypress","Selenium","Playwright"], secondary: ["Performance Testing","CI/CD","Jira Administration"] },
  { title: "UI/UX Designer", department: "Design", base: 88, primary: ["Figma","Design Systems","User Research","Prototyping"], secondary: ["Communication","Tailwind CSS","Product Analytics"] },
];
const SENIORITY = [
  { level: "Junior", prefix: "Junior ", band: "B1", minYears: 0.5, maxYears: 2.5, mult: 0.7, weight: 0.2 },
  { level: "Mid", prefix: "", band: "B2", minYears: 2.5, maxYears: 5, mult: 0.95, weight: 0.35 },
  { level: "Senior", prefix: "Senior ", band: "B3", minYears: 5, maxYears: 9, mult: 1.25, weight: 0.28 },
  { level: "Lead", prefix: "Lead ", band: "B4", minYears: 8, maxYears: 13, mult: 1.5, weight: 0.12 },
  { level: "Principal", prefix: "Principal ", band: "B5", minYears: 11, maxYears: 18, mult: 1.85, weight: 0.05 },
] as const;
const PROJECT_NAMES = ["Atlas Platform","Orion Billing","Nimbus Data Lake","Helios CRM","Vertex Mobile App","Quantum Search","Beacon Analytics","Falcon Payments","Aurora Design System","Pulse Monitoring","Comet Onboarding","Zenith Marketplace","Nova Identity","Titan Warehouse","Echo Support Bot","Lumen Reporting","Cobalt Gateway","Delta Migration","Sierra Compliance","Kestrel Insights"];
const LANGS = ["TypeScript","Python","Go","Java","Rust","Kotlin","Ruby"];
const COMMIT_MSGS = ["fix: handle null response from billing API","feat: add candidate ranking endpoint","chore: bump dependencies","refactor: extract sync engine","perf: batch database writes","test: cover edge cases in mapper","docs: update integration guide","fix: race condition in token refresh","feat: streaming chat responses","style: align table spacing"];
const PR_TITLES = ["Add explainable score breakdown","Migrate sync engine to batched writes","Improve OAuth token refresh","Introduce workload heuristics","Fix pagination on employees table","Add PDF export for reports","Harden RLS policies","Cache leaderboard queries"];
const ISSUE_TITLES = ["Dashboard charts flicker on refresh","Sync fails for archived repositories","Slow query on employee search","Timezone mismatch in attendance","Duplicate rows after import","Add filter by department","Improve error toast copy","Support incremental Jira sync"];
const TASK_NAMES = ["Design onboarding flow","Write API contract","Implement retry logic","Prepare sprint demo","Review security checklist","Update customer docs","Refine dashboard layout","Automate release notes","Investigate flaky test","Plan data migration"];
const CERTS = [["AWS Solutions Architect","Amazon"],["CKA","CNCF"],["Google Professional Data Engineer","Google"],["Azure DevOps Engineer","Microsoft"],["Certified ScrumMaster","Scrum Alliance"],["TensorFlow Developer","Google"],["PMP","PMI"],["Security+","CompTIA"]];
const COURSES = [["Advanced React Patterns","Frontend Masters","engineering"],["Distributed Systems","Coursera","engineering"],["Leadership Essentials","LinkedIn Learning","leadership"],["Applied Machine Learning","Udacity","ai"],["Secure Coding","Pluralsight","security"],["Effective Communication","Internal Academy","soft_skills"]];
const INDUSTRIES = ["Fintech","Healthcare","Retail","Logistics","Telecom","Energy","EdTech","Insurance"];
const CLIENTS = ["Northwind Bank","Helia Health","Marlow Retail","TransGrid","Orbit Telecom","Brightpath Energy","Scholaris","Anvil Insurance"];

/** Row volumes for the enterprise demo dataset. */
export const DEMO_VOLUME = {
  teams: 40,
  employees: 500,
  projects: 100,
  repos: 140,
  commits: 12000,
  pullRequests: 2600,
  reviews: 2000,
  githubIssues: 1600,
  jiraProjects: 20,
  sprintsPerBoard: 10,
  epics: 400,
  jiraIssues: 5000,
  jiraComments: 2500,
  jiraWorklogs: 3500,
  clickupSpaces: 12,
  clickupFolders: 36,
  clickupLists: 150,
  clickupTasks: 7000,
  clickupTimeEntries: 4000,
  clickupComments: 2000,
  proposals: 60,
} as const;
const V = DEMO_VOLUME;

export type SeedSummary = Record<string, number>;

/** Builds the full interconnected demo dataset for one organization. */
export function generateDemoData(organizationId: string, seed = 20260101): SeedBatch[] {
  const r: Rng = makeRng(seed);
  const org = organizationId;
  const batches: SeedBatch[] = [];
  const push = (table: string, rows: Record<string, unknown>[]) => batches.push({ table, rows });

  // ---------- Departments ----------
  const departments = DEPARTMENTS.map(([name, code, color], i) => ({
    id: uuid(), organization_id: org, name, department_code: `${code}`, color,
    description: `${name} organisation unit`, status: "active",
    email: `${code.toLowerCase()}@demo-corp.io`, phone: `+1 555 01${(10 + i).toString()}`,
    location: LOCATIONS[i % LOCATIONS.length], budget: int(r, 250, 4000) * 1000,
  }));
  push("departments", departments);

  // ---------- Teams ----------
  const teams = Array.from({ length: V.teams }, (_, i) => {
    const dept = departments[i % departments.length];
    return {
      id: uuid(), organization_id: org, department_id: dept.id,
      name: `${dept.name.split(" ")[0]} Squad ${String.fromCharCode(65 + Math.floor(i / departments.length))}${(i % departments.length) + 1}`,
      description: `Cross-functional squad inside ${dept.name}`,
    };
  });
  push("teams", teams);

  // ---------- Skills ----------
  const skills = SKILLS.map(([name, category]) => ({ id: uuid(), organization_id: org, name, category }));
  push("skills", skills);

  // ---------- Employees ----------
  const skillByName = new Map(skills.map((s) => [s.name, s]));
  const deptByName = new Map<string, (typeof departments)[number]>(departments.map((d) => [d.name as string, d]));
  const teamsByDept = new Map(departments.map((d) => [d.id, teams.filter((t) => t.department_id === d.id)]));

  const pickSeniority = () => {
    const roll = r();
    let acc = 0;
    for (const s of SENIORITY) {
      acc += s.weight;
      if (roll <= acc) return s;
    }
    return SENIORITY[1];
  };

  const employeeRole = new Map<string, RoleArchetype>();
  const employees = Array.from({ length: V.employees }, (_, i) => {
    const role = ROLES[i % ROLES.length];
    const seniority = pickSeniority();
    const first = FIRST[(i * 3) % FIRST.length];
    const last = LAST[(i * 7 + Math.floor(i / LAST.length)) % LAST.length];
    const dept = deptByName.get(role.department) ?? departments[i % departments.length];
    const deptTeams = teamsByDept.get(dept.id) ?? teams;
    const team = deptTeams[i % deptTeams.length];
    const experience = float(r, seniority.minYears, seniority.maxYears, 1);
    const tenureDays = Math.min(2600, Math.max(60, Math.round(experience * 200) + int(r, 30, 400)));
    const joined = new Date(Date.now() - tenureDays * 86400000);
    const salary = Math.round((role.base * seniority.mult * 1000 + int(r, -6, 9) * 1000) / 500) * 500;
    const emp = {
      id: uuid(), organization_id: org, employee_code: `EMP-${String(1001 + i)}`,
      full_name: `${first} ${last}`, first_name: first, last_name: last,
      email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@demo-corp.io`,
      phone: `+1 555 ${int(r, 1000, 9999)}`,
      dob: isoDate(new Date(Date.now() - int(r, 8500, 16000) * 86400000)),
      designation: `${seniority.prefix}${role.title}`,
      seniority_level: seniority.level as string, salary_band: seniority.band as string,
      experience_years: experience,
      department_id: dept.id, team_id: team.id, manager_id: null as string | null,
      joining_date: isoDate(joined),
      employment_type: chance(r, 0.86) ? "full_time" : pick(r, ["contract", "part_time", "intern", "consultant"]),
      status: chance(r, 0.9) ? "active" : pick(r, ["on_leave", "probation", "terminated"]),
      location: pick(r, LOCATIONS), work_location: chance(r, 0.5) ? "remote" : "onsite",
      office_location: pick(r, LOCATIONS), salary,
      notes: `${seniority.level} ${role.title} — ${experience} yrs experience, band ${seniority.band}.`,
    };
    employeeRole.set(emp.id, role);
    return emp;
  });
  // managers: the most senior person per team leads it, department heads lead the leads
  for (const team of teams) {
    const members = employees.filter((e) => e.team_id === team.id);
    if (members.length < 2) continue;
    const lead = [...members].sort((a, b) => Number(b.experience_years) - Number(a.experience_years))[0];
    for (const m of members) if (m.id !== lead.id) m.manager_id = lead.id;
  }
  for (const dept of departments) {
    const leads = employees.filter((e) => e.department_id === dept.id && !e.manager_id);
    if (leads.length < 2) continue;
    const head = [...leads].sort((a, b) => Number(b.experience_years) - Number(a.experience_years))[0];
    head.designation = `Head of ${dept.name}`;
    head.seniority_level = "Executive";
    for (const l of leads) if (l.id !== head.id) l.manager_id = head.id;
  }
  push("employees", employees);

  // ---------- Employee skills (role-aligned) ----------
  const proficiencyFor = (years: number) =>
    years >= 8 ? "expert" : years >= 5 ? "advanced" : years >= 2.5 ? "intermediate" : "beginner";
  const employeeSkills = employees.flatMap((e) => {
    const role = employeeRole.get(e.id)!;
    const exp = Number(e.experience_years);
    const names = new Set<string>([
      ...role.primary,
      ...pickMany(r, role.secondary, int(r, 2, role.secondary.length)),
      ...pickMany(r, ["Communication", "Problem Solving", "Ownership", "Collaboration", "Agile Delivery"], 2),
    ]);
    if (exp >= 7) names.add("Mentoring");
    if (exp >= 9) names.add("Team Leadership");
    return [...names]
      .map((n) => skillByName.get(n))
      .filter((s): s is (typeof skills)[number] => Boolean(s))
      .map((s) => {
        const years = Math.max(0.5, Math.round(Math.min(exp, exp * float(r, 0.4, 1, 2)) * 10) / 10);
        return {
          id: uuid(), employee_id: e.id, skill_id: s.id,
          proficiency: proficiencyFor(years), years_experience: years,
        };
      });
  });
  push("employee_skills", employeeSkills);

  // ---------- Projects: 50 active, 30 completed, 20 upcoming ----------
  const STACKS: string[][] = [
    ["Python", "FastAPI", "PyTorch", "AWS"],
    ["React", "TypeScript", "Node.js", "PostgreSQL"],
    ["Next.js", "GraphQL", "Redis", "GCP"],
    ["Python", "LangChain", "Vector Search", "Kubernetes"],
    ["Java", "Kafka", "Snowflake", "dbt"],
    ["Go", "Terraform", "Kubernetes", "Observability"],
  ];
  const projectPlan = [
    ...Array.from({ length: 50 }, () => "active" as const),
    ...Array.from({ length: 30 }, () => "completed" as const),
    ...Array.from({ length: 20 }, () => "planning" as const),
  ].slice(0, V.projects);
  const projects = projectPlan.map((phase, i) => {
    const dept = departments[i % departments.length];
    const suffix = i >= PROJECT_NAMES.length
      ? ` ${["II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"][Math.floor(i / PROJECT_NAMES.length) - 1] ?? `v${Math.floor(i / PROJECT_NAMES.length) + 1}`}`
      : "";
    const durationWeeks = int(r, 8, 52);
    const start =
      phase === "planning"
        ? new Date(Date.now() + int(r, 14, 120) * 86400000)
        : new Date(Date.now() - int(r, 30, 900) * 86400000);
    const complexity = pick(r, ["low", "medium", "medium", "high", "critical"]);
    return {
      id: uuid(), organization_id: org, department_id: dept.id,
      name: `${PROJECT_NAMES[i % PROJECT_NAMES.length]}${suffix}`,
      description: `Strategic initiative owned by ${dept.name}.`,
      status: phase,
      start_date: isoDate(start),
      end_date: isoDate(new Date(start.getTime() + durationWeeks * 7 * 86400000)),
      budget: int(r, 80, 2400) * 1000,
      complexity, duration_weeks: durationWeeks,
      tech_stack: pick(r, STACKS),
      delivery_status:
        phase === "completed"
          ? pick(r, ["delivered", "delivered", "delivered_late"])
          : phase === "active"
            ? pick(r, ["on_track", "on_track", "at_risk", "delayed"])
            : "not_started",
    };
  });
  push("projects", projects);

  const employeeProjects = projects.flatMap((p) =>
    pickMany(r, employees, int(r, 4, 9)).map((e, idx) => ({
      id: uuid(), project_id: p.id, employee_id: e.id,
      role: idx === 0 ? "Tech Lead" : pick(r, ["Contributor", "Contributor", "Reviewer", "QA", "Analyst"]),
      allocation_percent: pick(r, [20, 30, 50, 60, 80, 100]),
    })),
  );
  push("employee_projects", employeeProjects);

  // ---------- GitHub ----------
  const ghConnection = {
    id: uuid(), organization_id: org, github_login: "demo-corp", github_account_id: 90000001,
    account_type: "organization", avatar: null, scope: "repo,read:org",
    access_token_ciphertext: "demo-seeded", auto_sync: true,
    last_sync_at: iso(new Date()), last_sync_status: "success",
  };
  push("github_connections", [ghConnection]);

  const contributors = employees.map((e, i) => ({
    id: uuid(), organization_id: org, github_id: 5000000 + i,
    login: e.email.split("@")[0].replace(".", "-"), name: e.full_name, email: e.email,
    followers: int(r, 0, 400), following: int(r, 0, 200), public_repos: int(r, 0, 40),
    location: e.location, company: "Demo Corp", linked_employee_id: e.id,
  }));
  push("github_contributors", contributors);

  const repos = Array.from({ length: V.repos }, (_, i) => {
    const name = `${pick(r, ["atlas", "orion", "nimbus", "helios", "vertex", "pulse", "nova", "cobalt"])}-${pick(r, ["api", "web", "worker", "infra", "sdk", "docs"])}-${i}`;
    return {
      id: uuid(), organization_id: org, connection_id: ghConnection.id, github_id: 7000000 + i,
      owner: "demo-corp", name, full_name: `demo-corp/${name}`,
      description: "Demo repository generated for the seeded workspace.",
      visibility: chance(r, 0.7) ? "private" : "public", language: pick(r, LANGS),
      default_branch: "main", stars: int(r, 0, 900), forks: int(r, 0, 120),
      open_issues: int(r, 0, 40), watchers: int(r, 0, 300), size_kb: int(r, 200, 90000),
      pushed_at: iso(new Date(Date.now() - int(r, 0, 40) * 86400000)),
      repo_created_at: iso(new Date(Date.now() - int(r, 200, 2000) * 86400000)),
      archived: chance(r, 0.08), disabled: false, tracked: true,
      last_synced_at: iso(new Date()),
    };
  });
  push("github_repositories", repos);

  push("github_repo_contributors", repos.flatMap((repo) =>
    pickMany(r, contributors, int(r, 3, 8)).map((c) => ({
      id: uuid(), organization_id: org, repository_id: repo.id, contributor_id: c.id,
      contributions: int(r, 5, 800),
    })),
  ));

  const commits = Array.from({ length: V.commits }, (_, i) => {
    const repo = pick(r, repos);
    const c = pick(r, contributors);
    return {
      id: uuid(), organization_id: org, repository_id: repo.id, sha: `${(i + 1).toString(16).padStart(8, "0")}${uuid().replace(/-/g, "").slice(0, 32)}`,
      author_contributor_id: c.id, author_login: c.login, author_email: c.email,
      message: pick(r, COMMIT_MSGS), branch: chance(r, 0.6) ? "main" : `feature/${pick(r, ["auth", "sync", "ui", "perf"])}-${int(r, 10, 99)}`,
      committed_at: iso(new Date(Date.now() - int(r, 0, 180) * 86400000 - int(r, 0, 86400) * 1000)),
      additions: int(r, 1, 700), deletions: int(r, 0, 400), changed_files: int(r, 1, 25),
    };
  });
  push("github_commits", commits);

  const prs = Array.from({ length: V.pullRequests }, (_, i) => {
    const repo = pick(r, repos);
    const c = pick(r, contributors);
    const created = new Date(Date.now() - int(r, 1, 180) * 86400000);
    const merged = chance(r, 0.68);
    const closed = merged || chance(r, 0.15);
    return {
      id: uuid(), organization_id: org, repository_id: repo.id, github_id: 8000000 + i,
      number: i + 1, title: pick(r, PR_TITLES), body: "Seeded pull request for the demo workspace.",
      state: merged ? "merged" : closed ? "closed" : "open", merged, draft: !closed && chance(r, 0.12),
      author_contributor_id: c.id, author_login: c.login,
      base_branch: "main", head_branch: `feature/${int(r, 100, 999)}`,
      additions: int(r, 5, 900), deletions: int(r, 0, 500), changed_files: int(r, 1, 30),
      review_count: int(r, 0, 5), comment_count: int(r, 0, 12),
      pr_created_at: iso(created),
      merged_at: merged ? iso(new Date(created.getTime() + int(r, 1, 96) * 3600000)) : null,
      closed_at: closed ? iso(new Date(created.getTime() + int(r, 1, 120) * 3600000)) : null,
    };
  });
  push("github_pull_requests", prs);

  push("github_reviews", Array.from({ length: V.reviews }, (_, i) => {
    const pr = pick(r, prs);
    const c = pick(r, contributors);
    return {
      id: uuid(), organization_id: org, pull_request_id: pr.id, github_id: 8500000 + i,
      reviewer_contributor_id: c.id, reviewer_login: c.login,
      state: pick(r, ["approved", "approved", "changes_requested", "commented", "dismissed"]),
      body: "Looks good overall, minor comments inline.",
      submitted_at: iso(new Date(Date.now() - int(r, 0, 170) * 86400000)),
    };
  }));

  push("github_issues", Array.from({ length: V.githubIssues }, (_, i) => {
    const repo = pick(r, repos);
    const author = pick(r, contributors);
    const assignee = pick(r, contributors);
    const created = new Date(Date.now() - int(r, 1, 200) * 86400000);
    const closed = chance(r, 0.6);
    return {
      id: uuid(), organization_id: org, repository_id: repo.id, github_id: 9000000 + i,
      number: i + 1, title: pick(r, ISSUE_TITLES), body: "Seeded issue for the demo workspace.",
      state: closed ? "closed" : "open",
      labels: pickMany(r, ["bug", "enhancement", "docs", "p1", "p2", "tech-debt"], int(r, 1, 3)),
      author_contributor_id: author.id, author_login: author.login,
      assignee_contributor_id: assignee.id, assignee_login: assignee.login,
      comment_count: int(r, 0, 15), issue_created_at: iso(created),
      closed_at: closed ? iso(new Date(created.getTime() + int(r, 1, 40) * 86400000)) : null,
    };
  }));

  // ---------- Jira ----------
  const jiraConnection = {
    id: uuid(), organization_id: org, cloud_id: "demo-cloud-id", site_name: "Demo Corp",
    site_url: "https://demo-corp.atlassian.net", scope: "read:jira-work",
    access_token_ciphertext: "demo-seeded", auto_sync: true,
    last_sync_at: iso(new Date()), last_sync_status: "success",
  };
  push("jira_connections", [jiraConnection]);

  const jiraAccounts = employees.map((e, i) => ({
    id: uuid(), organization_id: org, account_id: `acc-${1000 + i}`, display_name: e.full_name,
    email: e.email, active: true, linked_employee_id: e.id,
  }));
  push("jira_accounts", jiraAccounts);

  const jiraProjects = Array.from({ length: V.jiraProjects }, (_, i) => {
    const lead = pick(r, jiraAccounts);
    return {
      id: uuid(), organization_id: org, connection_id: jiraConnection.id, jira_id: `10${i}`,
      project_key: `PRJ${i + 1}`, name: PROJECT_NAMES[i % PROJECT_NAMES.length], project_type: "software",
      project_category: pick(r, ["Platform", "Growth", "Internal"]),
      description: "Seeded Jira project.", lead_account_id: lead.id, lead_name: lead.display_name,
      status: "active", archived: false, tracked: true, last_synced_at: iso(new Date()),
    };
  });
  push("jira_projects", jiraProjects);

  const boards = jiraProjects.map((p, i) => ({
    id: uuid(), organization_id: org, project_id: p.id, jira_id: 200 + i,
    name: `${p.name} Board`, board_type: "scrum",
  }));
  push("jira_boards", boards);

  const sprints = boards.flatMap((b, bi) =>
    Array.from({ length: V.sprintsPerBoard }, (_, si) => {
      const start = new Date(Date.now() - (V.sprintsPerBoard - si) * 14 * 86400000);
      const state = si === V.sprintsPerBoard - 1 ? "active" : "closed";
      const committed = int(r, 20, 60);
      const completed = state === "closed" ? int(r, 12, committed) : int(r, 3, committed - 5);
      return {
        id: uuid(), organization_id: org, board_id: b.id, project_id: b.project_id,
        jira_id: 3000 + bi * 100 + si, name: `${b.name.split(" ")[0]} Sprint ${si + 1}`,
        goal: "Deliver committed scope and reduce defect backlog.",
        state, start_date: iso(start), end_date: iso(new Date(start.getTime() + 14 * 86400000)),
        complete_date: state === "closed" ? iso(new Date(start.getTime() + 14 * 86400000)) : null,
        committed_points: committed, completed_points: completed,
        remaining_points: Math.max(0, committed - completed),
      };
    }),
  );
  push("jira_sprints", sprints);

  const epics = Array.from({ length: V.epics }, (_, i) => {
    const p = pick(r, jiraProjects);
    const owner = pick(r, jiraAccounts);
    return {
      id: uuid(), organization_id: org, project_id: p.id, jira_id: `40${i}`,
      epic_key: `${p.project_key}-E${i + 1}`, name: `${pick(r, ["Onboarding", "Billing", "Search", "Reporting", "Mobile", "Security"])} Epic ${i + 1}`,
      summary: "Seeded epic covering a slice of the roadmap.",
      status: pick(r, ["To Do", "In Progress", "Done"]),
      status_category: pick(r, ["todo", "in_progress", "done"]),
      progress: float(r, 0, 100, 0), owner_account_id: owner.id, owner_name: owner.display_name,
    };
  });
  push("jira_epics", epics);

  const jiraIssues = Array.from({ length: V.jiraIssues }, (_, i) => {
    const p = pick(r, jiraProjects);
    const sprint = pick(r, sprints.filter((s) => s.project_id === p.id));
    const epic = pick(r, epics.filter((e) => e.project_id === p.id));
    const assignee = pick(r, jiraAccounts);
    const reporter = pick(r, jiraAccounts);
    const cat = pick(r, ["todo", "in_progress", "done", "done"]);
    const created = new Date(Date.now() - int(r, 1, 180) * 86400000);
    return {
      id: uuid(), organization_id: org, project_id: p.id, sprint_id: sprint?.id ?? null,
      epic_id: epic?.id ?? null, jira_id: `50${i}`, issue_key: `${p.project_key}-${i + 1}`,
      issue_type: pick(r, ["Story", "Task", "Bug", "Sub-task"]),
      issue_kind: pick(r, ["story", "task", "bug", "subtask"]),
      summary: pick(r, ISSUE_TITLES), description: "Seeded Jira issue.",
      priority: pick(r, ["Highest", "High", "Medium", "Low"]),
      status: cat === "done" ? "Done" : cat === "in_progress" ? "In Progress" : "To Do",
      status_category: cat, resolution: cat === "done" ? "Done" : null,
      reporter_account_id: reporter.id, reporter_name: reporter.display_name,
      assignee_account_id: assignee.id, assignee_name: assignee.display_name,
      labels: pickMany(r, ["frontend", "backend", "infra", "ux", "urgent"], int(r, 0, 2)),
      story_points: pick(r, [1, 2, 3, 5, 8, 13]),
      original_estimate_seconds: int(r, 2, 40) * 3600,
      remaining_estimate_seconds: cat === "done" ? 0 : int(r, 0, 20) * 3600,
      time_spent_seconds: int(r, 1, 36) * 3600,
      blocked: chance(r, 0.08), comment_count: int(r, 0, 8),
      issue_created_at: iso(created),
      issue_updated_at: iso(new Date(created.getTime() + int(r, 1, 30) * 86400000)),
      resolved_at: cat === "done" ? iso(new Date(created.getTime() + int(r, 1, 25) * 86400000)) : null,
    };
  });
  push("jira_issues", jiraIssues);

  push("jira_comments", Array.from({ length: V.jiraComments }, (_, i) => {
    const issue = pick(r, jiraIssues);
    const a = pick(r, jiraAccounts);
    return {
      id: uuid(), organization_id: org, issue_id: issue.id, jira_id: `c${i}`,
      author_account_id: a.id, author_name: a.display_name,
      body: pick(r, ["Picked this up today.", "Blocked on the API contract.", "Deployed to staging.", "Needs one more review.", "Reproduced on the latest build."]),
      comment_created_at: iso(new Date(Date.now() - int(r, 0, 120) * 86400000)),
    };
  }));

  push("jira_worklogs", Array.from({ length: V.jiraWorklogs }, (_, i) => {
    const issue = pick(r, jiraIssues);
    const a = pick(r, jiraAccounts);
    return {
      id: uuid(), organization_id: org, issue_id: issue.id, jira_id: `w${i}`,
      author_account_id: a.id, author_name: a.display_name,
      time_spent_seconds: int(r, 1, 8) * 3600,
      started_at: iso(new Date(Date.now() - int(r, 0, 120) * 86400000)),
      description: "Implementation and testing.",
    };
  }));

  // ---------- ClickUp ----------
  const cuConnection = {
    id: uuid(), organization_id: org, workspace_id: "ws-demo", workspace_name: "Demo Corp Workspace",
    workspace_color: "#7b68ee", scope: "read", access_token_ciphertext: "demo-seeded",
    auto_sync: true, connected_user_name: "Demo Admin", last_sync_at: iso(new Date()),
    last_sync_status: "success",
  };
  push("clickup_connections", [cuConnection]);

  const cuMembers = employees.map((e, i) => ({
    id: uuid(), organization_id: org, connection_id: cuConnection.id, member_id: `m${1000 + i}`,
    username: e.full_name, email: e.email, role: chance(r, 0.15) ? "admin" : "member",
    role_key: 3, active: true, linked_employee_id: e.id,
  }));
  push("clickup_members", cuMembers);

  const spaces = Array.from({ length: V.clickupSpaces }, (_, i) => ({
    id: uuid(), organization_id: org, connection_id: cuConnection.id, space_id: `s${i}`,
    name: pick(r, ["Delivery", "Platform", "Growth", "Support", "Design"]) + ` ${i + 1}`,
    description: "Seeded ClickUp space.", private: false, archived: false,
    color: "#7b68ee", statuses: [], last_synced_at: iso(new Date()),
  }));
  push("clickup_spaces", spaces);

  const folders = Array.from({ length: V.clickupFolders }, (_, i) => ({
    id: uuid(), organization_id: org, space_id: spaces[i % spaces.length].id, folder_id: `f${i}`,
    name: `Folder ${i + 1}`, hidden: false, archived: false, task_count: int(r, 10, 120),
  }));
  push("clickup_folders", folders);

  const lists = Array.from({ length: V.clickupLists }, (_, i) => {
    const folder = folders[i % folders.length];
    return {
      id: uuid(), organization_id: org, space_id: folder.space_id, folder_id: folder.id,
      list_id: `l${i}`, name: `${pick(r, ["Backlog", "Sprint", "Bugs", "Discovery", "Ops"])} ${i + 1}`,
      content: "Seeded list.", status: "active", archived: false, task_count: int(r, 5, 90),
    };
  });
  push("clickup_lists", lists);

  const cuTasks = Array.from({ length: V.clickupTasks }, (_, i) => {
    const list = pick(r, lists);
    const assignee = pick(r, cuMembers);
    const creator = pick(r, cuMembers);
    const state = pick(r, ["open", "in_progress", "done", "done", "blocked", "cancelled"]);
    const created = new Date(Date.now() - int(r, 1, 180) * 86400000);
    return {
      id: uuid(), organization_id: org, space_id: list.space_id, folder_id: list.folder_id,
      list_id: list.id, task_id: `t${i}`, name: pick(r, TASK_NAMES),
      description: "Seeded ClickUp task.", url: `https://app.clickup.com/t/t${i}`,
      status: state === "done" ? "complete" : state === "in_progress" ? "in progress" : "to do",
      status_type: state === "done" ? "closed" : "custom", task_state: state,
      priority: pick(r, ["urgent", "high", "normal", "low"]), priority_order: int(r, 1, 4),
      tags: pickMany(r, ["frontend", "backend", "design", "ops"], int(r, 0, 2)),
      assignees: [{ id: assignee.member_id, username: assignee.username }],
      primary_assignee_id: assignee.id, primary_assignee_name: assignee.username,
      creator_member_id: creator.id, creator_name: creator.username, watchers: [],
      due_date: iso(new Date(created.getTime() + int(r, 3, 45) * 86400000)),
      start_date: iso(created),
      completed_at: state === "done" ? iso(new Date(created.getTime() + int(r, 1, 30) * 86400000)) : null,
      time_estimate_ms: int(r, 1, 16) * 3600000, time_spent_ms: int(r, 0, 14) * 3600000,
      comment_count: int(r, 0, 6), archived: false,
      task_created_at: iso(created),
      task_updated_at: iso(new Date(created.getTime() + int(r, 1, 40) * 86400000)),
    };
  });
  push("clickup_tasks", cuTasks);

  push("clickup_time_entries", Array.from({ length: V.clickupTimeEntries }, (_, i) => {
    const task = pick(r, cuTasks);
    const m = pick(r, cuMembers);
    const started = new Date(Date.now() - int(r, 0, 120) * 86400000);
    const duration = int(r, 1, 7) * 3600000;
    return {
      id: uuid(), organization_id: org, task_id: task.id, entry_id: `te${i}`,
      member_id: m.id, member_name: m.username, duration_ms: duration,
      billable: chance(r, 0.7), description: "Focused work session.",
      started_at: iso(started), ended_at: iso(new Date(started.getTime() + duration)),
    };
  }));

  push("clickup_task_comments", Array.from({ length: V.clickupComments }, (_, i) => {
    const task = pick(r, cuTasks);
    const m = pick(r, cuMembers);
    return {
      id: uuid(), organization_id: org, task_id: task.id, comment_id: `cc${i}`,
      author_member_id: m.id, author_name: m.username,
      body: pick(r, ["Started on this.", "Waiting on design.", "Ready for QA.", "Shipped."]),
      resolved: chance(r, 0.4),
      comment_created_at: iso(new Date(Date.now() - int(r, 0, 120) * 86400000)),
    };
  }));

  // ---------- HR history ----------
  push("employee_certifications", Array.from({ length: 150 }, () => {
    const e = pick(r, employees);
    const [name, issuer] = pick(r, CERTS);
    const issued = new Date(Date.now() - int(r, 60, 1400) * 86400000);
    return {
      id: uuid(), organization_id: org, employee_id: e.id, name, issuer,
      credential_id: `CRED-${int(r, 100000, 999999)}`, issue_date: isoDate(issued),
      expiry_date: isoDate(new Date(issued.getTime() + 730 * 86400000)),
    };
  }));

  push("training_records", Array.from({ length: 250 }, () => {
    const e = pick(r, employees);
    const [course, provider, category] = pick(r, COURSES);
    const started = new Date(Date.now() - int(r, 30, 700) * 86400000);
    const done = chance(r, 0.75);
    return {
      id: uuid(), organization_id: org, employee_id: e.id, course_name: course, provider, category,
      hours: int(r, 4, 40), status: done ? "completed" : pick(r, ["in_progress", "enrolled"]),
      score: done ? int(r, 60, 100) : null, started_on: isoDate(started),
      completed_on: done ? isoDate(new Date(started.getTime() + int(r, 5, 90) * 86400000)) : null,
    };
  }));

  push("performance_reviews", Array.from({ length: 200 }, () => {
    const e = pick(r, employees);
    const reviewer = employees.find((x) => x.id === e.manager_id) ?? pick(r, employees);
    const cycle = pick(r, ["H1 2025", "H2 2025", "H1 2026"]);
    return {
      id: uuid(), organization_id: org, employee_id: e.id, reviewer_employee_id: reviewer.id,
      period_label: cycle, overall_rating: float(r, 2.5, 5, 1),
      delivery_rating: float(r, 2, 5, 1), collaboration_rating: float(r, 2, 5, 1),
      leadership_rating: float(r, 1.5, 5, 1), communication_rating: float(r, 2, 5, 1),
      strengths: "Strong ownership and consistent delivery.",
      improvements: "Could share context earlier with stakeholders.",
      comments: "Solid cycle overall.", status: "submitted",
    };
  }));

  push("promotions", Array.from({ length: 60 }, () => {
    const e = pick(r, employees);
    const salary = Number(e.salary);
    return {
      id: uuid(), organization_id: org, employee_id: e.id,
      previous_designation: "Software Engineer", new_designation: e.designation,
      previous_level: pick(r, ["L2", "L3", "L4"]), new_level: pick(r, ["L3", "L4", "L5"]),
      previous_salary: Math.round(salary * 0.85), new_salary: salary,
      effective_date: isoDate(new Date(Date.now() - int(r, 30, 900) * 86400000)),
      reason: "Sustained impact and scope growth.",
      approved_by_employee_id: e.manager_id,
    };
  }));

  const attendance: Record<string, unknown>[] = [];
  for (const e of employees) {
    for (let d = 1; d <= 20; d++) {
      const day = new Date(Date.now() - d * 86400000);
      if (day.getUTCDay() === 0 || day.getUTCDay() === 6) continue;
      const status = chance(r, 0.9) ? "present" : pick(r, ["leave", "absent", "holiday"]);
      const checkIn = new Date(day); checkIn.setUTCHours(9, int(r, 0, 50), 0, 0);
      const hours = status === "present" ? float(r, 6.5, 9.5, 1) : 0;
      attendance.push({
        id: uuid(), organization_id: org, employee_id: e.id, work_date: isoDate(day), status,
        check_in: status === "present" ? iso(checkIn) : null,
        check_out: status === "present" ? iso(new Date(checkIn.getTime() + hours * 3600000)) : null,
        hours_worked: hours, is_remote: chance(r, 0.45),
      });
    }
  }
  push("attendance_records", attendance);

  push("leave_records", Array.from({ length: 200 }, () => {
    const e = pick(r, employees);
    const start = new Date(Date.now() - int(r, -30, 300) * 86400000);
    const days = int(r, 1, 8);
    return {
      id: uuid(), organization_id: org, employee_id: e.id,
      leave_type: pick(r, ["annual", "sick", "parental", "unpaid", "comp_off"]),
      start_date: isoDate(start), end_date: isoDate(new Date(start.getTime() + days * 86400000)),
      days, status: pick(r, ["approved", "approved", "pending", "rejected"]),
      reason: "Planned time off.", approved_by_employee_id: e.manager_id,
    };
  }));

  const productivity: Record<string, unknown>[] = [];
  const aiScores: Record<string, unknown>[] = [];
  for (const e of employees) {
    const base = int(r, 45, 92);
    for (let m = 5; m >= 0; m--) {
      const month = isoDate(monthStart(m));
      const drift = int(r, -8, 8);
      const score = Math.max(20, Math.min(99, base + drift));
      productivity.push({
        id: uuid(), organization_id: org, employee_id: e.id, period_month: month,
        commits: int(r, 5, 90), pull_requests: int(r, 0, 18), reviews: int(r, 0, 25),
        issues_closed: int(r, 0, 20), story_points: int(r, 5, 45), tasks_completed: int(r, 3, 40),
        hours_logged: int(r, 90, 180), productivity_score: score,
      });
      const flags: string[] = [];
      if (score < 45) flags.push("attrition_risk");
      if (chance(r, 0.08)) flags.push("burnout_risk");
      aiScores.push({
        id: uuid(), organization_id: org, employee_id: e.id, period_month: month,
        github_score: Math.min(99, score + int(r, -10, 10)),
        jira_score: Math.min(99, score + int(r, -12, 12)),
        clickup_score: Math.min(99, score + int(r, -12, 12)),
        productivity_score: score,
        collaboration_score: Math.min(99, score + int(r, -15, 12)),
        leadership_score: Math.min(99, score + int(r, -20, 10)),
        communication_score: Math.min(99, score + int(r, -14, 12)),
        innovation_score: Math.min(99, score + int(r, -18, 14)),
        learning_score: Math.min(99, score + int(r, -16, 16)),
        consistency_score: Math.min(99, score + int(r, -10, 8)),
        workload_score: int(r, 35, 98), quality_score: Math.min(99, score + int(r, -8, 10)),
        overall_score: score, risk_flags: flags,
      });
    }
  }
  push("productivity_history", productivity);
  push("ai_score_history", aiScores);

  const latest = aiScores.filter((s) => s.period_month === isoDate(monthStart(0)));
  const board = (category: string, key: string) => ({
    id: uuid(), organization_id: org, category, period_label: "Last 30 days",
    period_month: isoDate(monthStart(0)),
    entries: [...latest]
      .sort((a, b) => Number(b[key]) - Number(a[key]))
      .slice(0, 10)
      .map((s, i) => {
        const e = employees.find((x) => x.id === s.employee_id)!;
        return { rank: i + 1, employee_id: e.id, name: e.full_name, designation: e.designation, score: s[key] };
      }),
  });
  push("leaderboard_snapshots", [
    board("overall", "overall_score"), board("productivity", "productivity_score"),
    board("quality", "quality_score"), board("collaboration", "collaboration_score"),
    board("innovation", "innovation_score"), board("learning", "learning_score"),
  ]);

  // ---------- Workspace activity ----------
  push("project_proposals", Array.from({ length: V.proposals }, (_, i) => {
    const stack = pickMany(r, ["React", "Node.js", "PostgreSQL", "AWS", "Kubernetes", "Python", "Kafka"], int(r, 3, 5));
    const team = pickMany(r, employees, int(r, 3, 6));
    return {
      id: uuid(), organization_id: org,
      title: `${pick(r, ["Platform Modernisation", "Data Migration", "Mobile Revamp", "AI Assistant", "Compliance Portal"])} — Phase ${int(r, 1, 3)}`,
      client_name: CLIENTS[i % CLIENTS.length], industry: pick(r, INDUSTRIES),
      summary: "Seeded proposal generated from workforce capability data.",
      budget: int(r, 60, 900) * 1000, timeline_weeks: int(r, 6, 40),
      start_date: isoDate(new Date(Date.now() + int(r, 10, 120) * 86400000)),
      tech_stack: stack, required_skills: pickMany(r, SKILLS.map((s) => s[0]), int(r, 4, 7)),
      suggested_employees: team.map((e) => ({ id: e.id, name: e.full_name, designation: e.designation, fit: int(r, 62, 98) })),
      suggested_team: { size: team.length, lead: team[0]?.full_name ?? null },
      status: pick(r, ["draft", "submitted", "won", "lost", "in_review"]),
      win_probability: int(r, 20, 95),
    };
  }));

  push("reports", Array.from({ length: 20 }, (_, i) => ({
    id: uuid(), organization_id: org,
    name: `${pick(r, ["Workforce Summary", "Engineering Velocity", "AI Scorecard", "Attrition Risk", "Utilisation"])} — ${pick(r, ["Jan", "Feb", "Mar", "Apr", "May"])} 2026`,
    report_type: pick(r, ["workforce", "engineering", "ai", "risk", "utilisation"]),
    format: pick(r, ["pdf", "xlsx", "csv"]), period_label: "Monthly", status: "ready",
    summary: { employees: 100, avg_score: int(r, 60, 85), generated_index: i },
    generated_by_name: "Demo Admin",
  })));

  push("notifications", Array.from({ length: 60 }, () => ({
    id: uuid(), organization_id: org, user_id: null,
    title: pick(r, ["Sync completed", "New high-risk signal", "Monthly report ready", "New employee onboarded", "Sprint closed"]),
    body: "Generated as part of the demo workspace dataset.",
    category: pick(r, ["system", "integration", "ai", "hr"]),
    severity: pick(r, ["info", "info", "warning", "success"]),
    read_at: chance(r, 0.4) ? iso(new Date()) : null,
    created_at: iso(new Date(Date.now() - int(r, 0, 40) * 86400000)),
  })));

  push("data_imports", Array.from({ length: 15 }, (_, i) => {
    const total = int(r, 50, 1200);
    const failed = int(r, 0, 30);
    return {
      id: uuid(), organization_id: org, created_by_name: "Demo Admin",
      file_name: `${pick(r, ["employees", "payroll", "attendance", "projects"])}-${i + 1}.xlsx`,
      file_size: int(r, 20, 4000) * 1024, file_type: "xlsx",
      dataset: pick(r, ["employees", "departments", "projects", "attendance", "payroll"]),
      mode: pick(r, ["upsert", "insert", "skip_duplicates"]),
      status: failed > 20 ? "partial" : "completed",
      total_rows: total, imported_rows: total - failed, failed_rows: failed,
      error_count: failed, duration_ms: int(r, 800, 45000),
      finished_at: iso(new Date(Date.now() - int(r, 0, 60) * 86400000)),
    };
  }));

  push("activity_logs", Array.from({ length: 80 }, () => ({
    id: uuid(), organization_id: org,
    action: pick(r, ["employee.created", "project.updated", "github.sync", "jira.sync", "report.generated", "department.updated"]),
    entity_type: pick(r, ["employee", "project", "integration", "report"]),
    metadata: { source: "seed" },
    created_at: iso(new Date(Date.now() - int(r, 0, 60) * 86400000)),
  })));

  push("audit_logs", Array.from({ length: 60 }, () => ({
    id: uuid(), organization_id: org,
    action: pick(r, ["update", "create", "delete"]),
    entity_type: pick(r, ["employee", "department", "project", "settings"]),
    before_state: { seeded: true }, after_state: { seeded: true },
    created_at: iso(new Date(Date.now() - int(r, 0, 60) * 86400000)),
  })));

  return batches;
}

export const SEEDED_TABLES = [
  "audit_logs","activity_logs","data_imports","notifications","reports","project_proposals",
  "leaderboard_snapshots","ai_score_history","productivity_history","leave_records","attendance_records",
  "promotions","performance_reviews","training_records","employee_certifications",
  "clickup_task_comments","clickup_time_entries","clickup_tasks","clickup_lists","clickup_folders",
  "clickup_spaces","clickup_members","clickup_connections",
  "jira_worklogs","jira_comments","jira_issues","jira_epics","jira_sprints","jira_boards",
  "jira_projects","jira_accounts","jira_connections",
  "github_issues","github_reviews","github_pull_requests","github_commits","github_repo_contributors",
  "github_repositories","github_contributors","github_connections",
  "employee_projects","projects","employee_skills","employees","skills","teams","departments",
] as const;