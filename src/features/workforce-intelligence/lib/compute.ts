import type { AiIntelligence, EmployeeScore, GroupScore } from "@/features/ai-engine/types";

export type SkillRow = {
  employee_id: string;
  proficiency: string | null;
  years_experience: number | null;
  skillName: string;
  skillCategory: string;
};

export const PROFICIENCY_LEVEL: Record<string, number> = {
  beginner: 25,
  intermediate: 50,
  advanced: 75,
  expert: 100,
};

export function proficiencyValue(p?: string | null) {
  return PROFICIENCY_LEVEL[String(p ?? "").toLowerCase()] ?? 40;
}

export type CapacityBucket = "available" | "balanced" | "overallocated";

export function capacityBucket(e: EmployeeScore): CapacityBucket {
  if (e.workload.capacity >= 85) return "overallocated";
  if (e.workload.capacity <= 45) return "available";
  return "balanced";
}

export type CapacityPlan = {
  available: EmployeeScore[];
  balanced: EmployeeScore[];
  overallocated: EmployeeScore[];
  averageCapacity: number;
  groups: {
    id: string;
    name: string;
    headcount: number;
    avgCapacity: number;
    overallocated: number;
    available: number;
    avgScore: number;
  }[];
  transfers: { from: string; to: string; employee: string; employeeId: string; reason: string }[];
  hiring: { area: string; count: number; reason: string }[];
  shortages: { area: string; detail: string; severity: "high" | "medium" }[];
};

function groupKey(e: EmployeeScore, by: "department" | "team") {
  return by === "department"
    ? { id: e.departmentId ?? "none", name: e.departmentName ?? "Unassigned" }
    : { id: e.teamId ?? "none", name: e.teamName ?? "Unassigned" };
}

export function buildCapacityPlan(
  employees: EmployeeScore[],
  by: "department" | "team" = "department",
): CapacityPlan {
  const available: EmployeeScore[] = [];
  const balanced: EmployeeScore[] = [];
  const overallocated: EmployeeScore[] = [];
  for (const e of employees) {
    const b = capacityBucket(e);
    if (b === "available") available.push(e);
    else if (b === "overallocated") overallocated.push(e);
    else balanced.push(e);
  }

  const map = new Map<string, { id: string; name: string; members: EmployeeScore[] }>();
  for (const e of employees) {
    const k = groupKey(e, by);
    if (!map.has(k.id)) map.set(k.id, { id: k.id, name: k.name, members: [] });
    map.get(k.id)!.members.push(e);
  }

  const groups = [...map.values()]
    .map((g) => ({
      id: g.id,
      name: g.name,
      headcount: g.members.length,
      avgCapacity: Math.round(g.members.reduce((s, m) => s + m.workload.capacity, 0) / g.members.length),
      overallocated: g.members.filter((m) => capacityBucket(m) === "overallocated").length,
      available: g.members.filter((m) => capacityBucket(m) === "available").length,
      avgScore: Math.round(g.members.reduce((s, m) => s + m.overall, 0) / g.members.length),
    }))
    .sort((a, b) => b.avgCapacity - a.avgCapacity);

  const strained = groups.filter((g) => g.overallocated > 0 && g.available === 0);
  const slack = groups.filter((g) => g.available > 0).sort((a, b) => a.avgCapacity - b.avgCapacity);

  const transfers: CapacityPlan["transfers"] = [];
  for (const target of strained.slice(0, 5)) {
    for (const source of slack) {
      const candidate = available.find(
        (e) => (by === "department" ? e.departmentId ?? "none" : e.teamId ?? "none") === source.id &&
          !transfers.some((t) => t.employeeId === e.id),
      );
      if (candidate) {
        transfers.push({
          from: source.name,
          to: target.name,
          employee: candidate.name,
          employeeId: candidate.id,
          reason: `${candidate.name} runs at ${candidate.workload.capacity}% capacity with an AI score of ${candidate.overall}, while ${target.name} has ${target.overallocated} overloaded people.`,
        });
        break;
      }
    }
  }

  const hiring: CapacityPlan["hiring"] = groups
    .filter((g) => g.overallocated >= 2 && g.available === 0)
    .slice(0, 5)
    .map((g) => ({
      area: g.name,
      count: Math.max(1, Math.ceil(g.overallocated / 3)),
      reason: `${g.overallocated} of ${g.headcount} people above 85% utilisation with no internal slack.`,
    }));

  const shortages: CapacityPlan["shortages"] = groups
    .filter((g) => g.avgCapacity >= 80)
    .slice(0, 6)
    .map((g) => ({
      area: g.name,
      detail: `Average utilisation ${g.avgCapacity}% across ${g.headcount} people — capacity runs out within the next planning cycle.`,
      severity: g.avgCapacity >= 90 ? "high" : "medium",
    }));

  return {
    available,
    balanced,
    overallocated,
    averageCapacity: employees.length
      ? Math.round(employees.reduce((s, e) => s + e.workload.capacity, 0) / employees.length)
      : 0,
    groups,
    transfers,
    hiring,
    shortages,
  };
}

export type SkillCoverage = {
  skill: string;
  category: string;
  people: number;
  coverage: number;
  avgProficiency: number;
  experts: number;
  avgYears: number;
};

export function buildSkillCoverage(rows: SkillRow[], headcount: number): SkillCoverage[] {
  const map = new Map<string, { category: string; people: Set<string>; prof: number[]; years: number[]; experts: number }>();
  for (const r of rows) {
    if (!map.has(r.skillName)) {
      map.set(r.skillName, { category: r.skillCategory, people: new Set(), prof: [], years: [], experts: 0 });
    }
    const s = map.get(r.skillName)!;
    s.people.add(r.employee_id);
    s.prof.push(proficiencyValue(r.proficiency));
    s.years.push(r.years_experience ?? 0);
    if (String(r.proficiency ?? "").toLowerCase() === "expert") s.experts += 1;
  }
  const avg = (a: number[]) => (a.length ? Math.round(a.reduce((s, v) => s + v, 0) / a.length) : 0);
  return [...map.entries()]
    .map(([skill, s]) => ({
      skill,
      category: s.category,
      people: s.people.size,
      coverage: headcount ? Math.round((s.people.size / headcount) * 100) : 0,
      avgProficiency: avg(s.prof),
      experts: s.experts,
      avgYears: avg(s.years),
    }))
    .sort((a, b) => b.people - a.people);
}

export type SkillGap = SkillCoverage & { risk: "high" | "medium"; recommendation: string };

export function buildSkillGaps(coverage: SkillCoverage[]): SkillGap[] {
  return coverage
    .filter((c) => c.people <= 2 || c.experts === 0)
    .slice(0, 12)
    .map((c) => ({
      ...c,
      risk: c.people <= 1 ? "high" : "medium",
      recommendation:
        c.people <= 1
          ? `Single point of failure — cross-train a second engineer or hire for ${c.skill}.`
          : `No expert-level depth in ${c.skill} — sponsor certification or upskill the ${c.people} current holders.`,
    }));
}

export type BenchEntry = {
  employee: EmployeeScore;
  readiness: number;
  topSkills: string[];
};

export function buildBench(employees: EmployeeScore[], rows: SkillRow[]): BenchEntry[] {
  const bySkill = new Map<string, string[]>();
  for (const r of rows) {
    if (!bySkill.has(r.employee_id)) bySkill.set(r.employee_id, []);
    bySkill.get(r.employee_id)!.push(r.skillName);
  }
  return employees
    .filter((e) => capacityBucket(e) !== "overallocated")
    .map((e) => ({
      employee: e,
      readiness: Math.round(e.overall * 0.6 + (100 - e.workload.capacity) * 0.4),
      topSkills: (bySkill.get(e.id) ?? []).slice(0, 4),
    }))
    .sort((a, b) => b.readiness - a.readiness);
}

export type HeatCell = {
  groupId: string;
  groupName: string;
  headcount: number;
  score: number;
  capacity: number;
  burnout: number;
  delivery: number;
  quality: number;
};

export function buildHeatmap(employees: EmployeeScore[], by: "department" | "team"): HeatCell[] {
  const map = new Map<string, EmployeeScore[]>();
  const names = new Map<string, string>();
  for (const e of employees) {
    const k = groupKey(e, by);
    names.set(k.id, k.name);
    if (!map.has(k.id)) map.set(k.id, []);
    map.get(k.id)!.push(e);
  }
  const avg = (list: number[]) => (list.length ? Math.round(list.reduce((s, v) => s + v, 0) / list.length) : 0);
  return [...map.entries()]
    .map(([id, members]) => ({
      groupId: id,
      groupName: names.get(id) ?? "Unassigned",
      headcount: members.length,
      score: avg(members.map((m) => m.overall)),
      capacity: avg(members.map((m) => m.workload.capacity)),
      burnout: members.filter((m) => m.workload.burnoutRisk !== "low").length,
      delivery: avg(members.map((m) => m.subScores.delivery ?? m.subScores.jira ?? 0)),
      quality: avg(members.map((m) => m.subScores.quality ?? m.subScores.github ?? 0)),
    }))
    .sort((a, b) => b.score - a.score);
}

export type PromotionCandidate = {
  employee: EmployeeScore;
  promotionScore: number;
  leadership: number;
  delivery: number;
  contribution: number;
  learning: number;
  riskFactors: string[];
  recommendation: string;
};

export function buildPromotionEngine(employees: EmployeeScore[]): PromotionCandidate[] {
  return employees
    .map((e) => {
      const leadership = e.subScores.leadership ?? 0;
      const delivery = Math.round(((e.subScores.delivery ?? 0) + (e.subScores.jira ?? 0)) / 2);
      const contribution = Math.round(((e.subScores.collaboration ?? 0) + (e.subScores.communication ?? 0)) / 2);
      const learning = e.subScores.learning ?? 0;
      const promotionScore = Math.round(
        e.prediction.promotionReadiness * 0.4 +
          leadership * 0.2 +
          delivery * 0.2 +
          contribution * 0.1 +
          learning * 0.1,
      );
      const riskFactors: string[] = [];
      if (e.workload.burnoutRisk !== "low") riskFactors.push(`Burnout risk is ${e.workload.burnoutRisk}`);
      if (e.prediction.attritionRisk >= 60) riskFactors.push(`Attrition risk ${e.prediction.attritionRisk}%`);
      if (e.consistency.trend < 0) riskFactors.push("Declining activity trend");
      if (leadership < 40) riskFactors.push("Limited leadership signals so far");
      return {
        employee: e,
        promotionScore,
        leadership,
        delivery,
        contribution,
        learning,
        riskFactors,
        recommendation:
          promotionScore >= 80
            ? "Ready now — propose for the next promotion cycle with a lead-track scope."
            : promotionScore >= 65
              ? "Ready within 1-2 quarters — assign a stretch project with ownership."
              : "Keep developing — focus on the growth areas listed on the AI profile.",
      };
    })
    .sort((a, b) => b.promotionScore - a.promotionScore);
}

export type RiskAlert = {
  id: string;
  category: "Burnout" | "Attrition" | "Performance decline" | "Project dependency" | "Skill shortage";
  subject: string;
  level: "high" | "medium";
  detail: string;
  action: string;
};

export function buildRiskAlerts(data: AiIntelligence, gaps: SkillGap[]): RiskAlert[] {
  const alerts: RiskAlert[] = [];
  for (const e of data.employees) {
    if (e.workload.burnoutRisk !== "low") {
      alerts.push({
        id: `burnout-${e.id}`,
        category: "Burnout",
        subject: e.name,
        level: e.workload.burnoutRisk === "high" ? "high" : "medium",
        detail: `${e.workload.capacity}% utilisation with ${e.workload.overdue} overdue items.`,
        action: "Rebalance workload and move two in-flight items to an available teammate.",
      });
    }
    if (e.prediction.attritionRisk >= 60) {
      alerts.push({
        id: `attrition-${e.id}`,
        category: "Attrition",
        subject: e.name,
        level: e.prediction.attritionRisk >= 75 ? "high" : "medium",
        detail: `Attrition risk ${e.prediction.attritionRisk}% based on activity, workload and recognition signals.`,
        action: "Schedule a retention conversation and review scope, growth path and compensation.",
      });
    }
    if (e.consistency.trend < -10) {
      alerts.push({
        id: `decline-${e.id}`,
        category: "Performance decline",
        subject: e.name,
        level: e.consistency.trend < -25 ? "high" : "medium",
        detail: `Activity is down ${Math.abs(Math.round(e.consistency.trend))}% versus the prior period.`,
        action: "Run a 1:1 to identify blockers before the next delivery cycle.",
      });
    }
  }
  for (const p of [...data.projects].sort((a, b) => a.average - b.average).slice(0, 4)) {
    if (p.headcount <= 2) {
      alerts.push({
        id: `dependency-${p.id}`,
        category: "Project dependency",
        subject: p.name,
        level: p.headcount <= 1 ? "high" : "medium",
        detail: `Only ${p.headcount} allocated contributor(s) — key-person dependency on delivery.`,
        action: "Add a backup contributor and document handover for continuity.",
      });
    }
  }
  for (const g of gaps.slice(0, 6)) {
    alerts.push({
      id: `skill-${g.skill}`,
      category: "Skill shortage",
      subject: g.skill,
      level: g.risk,
      detail: `${g.people} people hold this skill (${g.coverage}% coverage, ${g.experts} experts).`,
      action: g.recommendation,
    });
  }
  const order = { high: 0, medium: 1 } as const;
  return alerts.sort((a, b) => order[a.level] - order[b.level]);
}

export function insightsFor(
  plan: CapacityPlan,
  coverage: SkillCoverage[],
  gaps: SkillGap[],
  departments: GroupScore[],
): string[] {
  const out: string[] = [];
  if (plan.overallocated.length)
    out.push(`${plan.overallocated.length} employees are above 85% utilisation while ${plan.available.length} sit below 45% — rebalancing recovers capacity without hiring.`);
  if (plan.hiring.length)
    out.push(`Hiring pressure concentrates in ${plan.hiring.map((h) => h.area).join(", ")}; ${plan.hiring.reduce((s, h) => s + h.count, 0)} additional hire(s) would restore headroom.`);
  if (gaps.length)
    out.push(`${gaps.length} skills lack depth — ${gaps.filter((g) => g.risk === "high").length} are single-person dependencies.`);
  if (coverage.length)
    out.push(`Strongest coverage: ${coverage.slice(0, 3).map((c) => `${c.skill} (${c.coverage}%)`).join(", ")}.`);
  const best = departments[0];
  const worst = departments[departments.length - 1];
  if (best && worst && best.id !== worst.id)
    out.push(`${best.name} leads productivity at ${best.average} while ${worst.name} trails at ${worst.average} — a ${best.average - worst.average} point spread.`);
  return out;
}
