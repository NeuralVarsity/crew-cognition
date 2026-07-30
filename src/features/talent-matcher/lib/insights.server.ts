import type { SupabaseClient } from "@supabase/supabase-js";
import type { EmployeeScore } from "@/features/ai-engine/types";
import { SUB_SCORE_LABELS } from "@/features/ai-engine/types";
import { buildTalentPool, type CandidateEvidence, type TalentPool } from "./pool.server";
import type {
  InsightBadge,
  InsightKind,
  InsightPerson,
  InsightResult,
} from "../insight-types";

/* ------------------------------------------------------------------ */
/* Intent classification                                               */
/* ------------------------------------------------------------------ */

type Metric = {
  key: string;
  label: string;
  unit: string;
  patterns: RegExp;
  read: (s: EmployeeScore) => number;
};

const METRICS: Metric[] = [
  {
    key: "commits",
    label: "Commits",
    unit: "commits",
    patterns: /\b(commit|commits|github contributor|contributor|contribution)\b/i,
    read: (s) => s.productivity.commitFrequency,
  },
  {
    key: "prs",
    label: "Merged pull requests",
    unit: "PRs",
    patterns: /\b(pull request|pull requests|prs?|merges?)\b/i,
    read: (s) => s.productivity.pullRequests,
  },
  {
    key: "reviews",
    label: "Code reviews",
    unit: "reviews",
    patterns: /\b(reviews?|reviewer|code review)\b/i,
    read: (s) => s.productivity.reviewActivity,
  },
  {
    key: "jira",
    label: "Jira issues resolved",
    unit: "issues",
    patterns: /\b(jira|issues? resolved|tickets?)\b/i,
    read: (s) => s.productivity.issueResolution,
  },
  {
    key: "points",
    label: "Story points",
    unit: "points",
    patterns: /\b(story points?|velocity)\b/i,
    read: (s) => s.productivity.storyPoints,
  },
  {
    key: "hours",
    label: "Tracked hours",
    unit: "hours",
    patterns: /\b(tracked hours?|hours logged|time tracked|logged hours?)\b/i,
    read: (s) => s.productivity.trackedHours,
  },
  {
    key: "completion",
    label: "Task completion rate",
    unit: "%",
    patterns: /\b(completion rate|clickup|tasks? completed)\b/i,
    read: (s) => s.productivity.taskCompletionRate,
  },
  {
    key: "overall",
    label: "Overall AI score",
    unit: "/100",
    patterns: /\b(ai score|overall|performer|performance|top talent)\b/i,
    read: (s) => s.overall,
  },
];

const SUPERLATIVE = /\b(top|highest|best|most|leaderboard|rank|ranking|leading|strongest)\b/i;

export type InsightIntent = { kind: InsightKind; metricKey?: string; names?: string[]; skills?: string[] };

const STOPWORDS = new Set([
  "show","me","find","list","who","has","have","with","experience","employees","people","engineers",
  "developers","devs","staff","team","members","and","the","in","on","of","a","an","all","our","using",
  "know","knows","skilled","expertise","skills","that","which","for","any","are","is","good","at",
]);

function extractSkills(query: string): string[] {
  const after = query.match(/\b(?:with|know|knows|knowing|using|in|skilled in|experience (?:with|in))\b(.+)$/i);
  const source = after ? after[1] : query;
  return source
    .toLowerCase()
    .replace(/[?.!]/g, " ")
    .split(/[,/]|\band\b|\bor\b/)
    .map((part) => part.trim())
    .map((part) =>
      part
        .split(/\s+/)
        .filter((w) => w && !STOPWORDS.has(w))
        .join(" "),
    )
    .filter((s) => s.length > 1)
    .slice(0, 6);
}

function extractNames(query: string): string[] {
  const cleaned = query.replace(/^\s*compare\s+/i, "").replace(/[?.!]/g, "");
  return cleaned
    .split(/\s+(?:and|vs\.?|versus|with|against)\s+/i)
    .map((part) => part.trim())
    .filter((part) => part.length > 1 && /[a-z]/i.test(part))
    .slice(0, 4);
}

/** Detects analytical questions that should NOT go through candidate ranking. */
export function classifyInsight(query: string): InsightIntent | null {
  const q = query.trim();
  if (q.length > 600) return null; // pasted JD / RFP → ranking

  if (/\b(compare|versus|vs\.?)\b/i.test(q)) {
    const names = extractNames(q);
    if (names.length >= 2) return { kind: "compare", names };
  }
  if (/\b(burn ?out|overload|overworked|exhaust)/i.test(q)) return { kind: "burnout" };
  if (/\b(attrition|flight risk|quit|leave the company|retention|at risk of leaving)\b/i.test(q))
    return { kind: "attrition" };
  if (/\b(promotion|promote|promotable|next level|raise candidates?)\b/i.test(q)) return { kind: "promotion" };
  if (/\b(available|availability|bench|free capacity|capacity|unassigned|next month|who is free)\b/i.test(q))
    return { kind: "availability" };

  if (SUPERLATIVE.test(q)) {
    const metric = METRICS.find((m) => m.patterns.test(q));
    if (metric) return { kind: "leaderboard", metricKey: metric.key };
  }

  if (/^\s*(show|list|which|who)\b/i.test(q) && /\b(with|know|knows|using|experience)\b/i.test(q)) {
    const skills = extractSkills(q);
    if (skills.length) return { kind: "skill", skills };
  }

  return null;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const round = (n: number, digits = 0) => {
  const f = 10 ** digits;
  return Math.round((Number.isFinite(n) ? n : 0) * f) / f;
};

function riskTone(level: string): InsightBadge["tone"] {
  if (level === "high") return "danger";
  if (level === "medium") return "warning";
  return "muted";
}

function coverageBadges(score: EmployeeScore): InsightBadge[] {
  const badges: InsightBadge[] = [];
  if (score.dataCoverage.github) badges.push({ label: "GitHub", tone: "muted" });
  if (score.dataCoverage.jira) badges.push({ label: "Jira", tone: "muted" });
  if (score.dataCoverage.clickup) badges.push({ label: "ClickUp", tone: "muted" });
  return badges;
}

function baseMetrics(score: EmployeeScore) {
  return [
    { label: "AI score", value: `${round(score.overall)}/100` },
    { label: "Commits", value: String(round(score.productivity.commitFrequency)) },
    { label: "Merged PRs", value: String(round(score.productivity.pullRequests)) },
    { label: "Jira resolved", value: String(round(score.productivity.issueResolution)) },
    { label: "Completion", value: `${round(score.productivity.taskCompletionRate)}%` },
  ];
}

function toPerson(
  score: EmployeeScore,
  rank: number,
  value: number,
  valueLabel: string,
  headline: string,
  badges: InsightBadge[],
  evidence: string[],
): InsightPerson {
  return {
    employeeId: score.id,
    name: score.name,
    designation: score.designation,
    department: score.departmentName,
    team: score.teamName,
    photo: score.photo,
    rank,
    value: round(value, 1),
    valueLabel,
    headline,
    badges: [...badges, ...coverageBadges(score)],
    metrics: baseMetrics(score),
    evidence,
  };
}

function allocationOf(evidence: CandidateEvidence | undefined) {
  if (!evidence) return { allocation: 0, projects: [] as string[] };
  const active = evidence.projects.filter((p) => p.status === "active" || p.status === "planning");
  return {
    allocation: active.reduce((sum, p) => sum + (p.allocation || 0), 0),
    projects: active.map((p) => p.name),
  };
}

function matchSkill(evidence: CandidateEvidence | undefined, skill: string) {
  if (!evidence) return null;
  const needle = skill.toLowerCase();
  const direct = evidence.skills.find((s) => s.name.toLowerCase().includes(needle));
  if (direct) return { source: "HR skill profile", strength: direct.years || 1, detail: `${direct.proficiency}${direct.years ? ` · ${direct.years} yrs` : ""}` };
  const lang = Object.entries(evidence.languages).find(([name]) => name.toLowerCase().includes(needle));
  if (lang) return { source: "GitHub language", strength: 1 + Math.log10(1 + lang[1]), detail: `${lang[0]} repositories` };
  if (evidence.repositories.some((r) => r.toLowerCase().includes(needle)))
    return { source: "GitHub repository", strength: 1, detail: "repository work" };
  if (evidence.issueText.toLowerCase().includes(needle))
    return { source: "Jira issues", strength: 0.8, detail: "delivery history" };
  if (evidence.taskText.toLowerCase().includes(needle))
    return { source: "ClickUp tasks", strength: 0.8, detail: "task history" };
  return null;
}

/* ------------------------------------------------------------------ */
/* Insight computation                                                 */
/* ------------------------------------------------------------------ */

function buildResult(partial: Omit<InsightResult, "generatedAt" | "chart"> & { chart?: InsightResult["chart"] }): InsightResult {
  return {
    generatedAt: new Date().toISOString(),
    chart: partial.chart ?? partial.people.slice(0, 8).map((p) => ({ label: p.name, value: p.value })),
    ...partial,
  };
}

export function computeInsight(pool: TalentPool, intent: InsightIntent, query: string): InsightResult {
  const scores = pool.scores;
  const poolSize = scores.length;

  if (intent.kind === "compare") {
    const picked = (intent.names ?? [])
      .map((name) => {
        const needle = name.toLowerCase();
        return (
          scores.find((s) => s.name.toLowerCase() === needle) ??
          scores.find((s) => s.name.toLowerCase().includes(needle)) ??
          scores.find((s) => needle.includes(s.name.toLowerCase().split(" ")[0]))
        );
      })
      .filter((s): s is EmployeeScore => !!s);

    const unique = picked.filter((s, i) => picked.findIndex((o) => o.id === s.id) === i);
    if (unique.length < 2) {
      return buildResult({
        kind: "compare",
        query,
        title: "Comparison unavailable",
        subtitle: `Could not resolve ${(intent.names ?? []).join(" and ")} to employees in your workspace.`,
        metricLabel: "AI score",
        metricUnit: "/100",
        poolSize,
        people: [],
        comparison: null,
        notes: ["Use full employee names as they appear in the directory."],
      });
    }

    const rows = [
      { label: "Overall AI score", values: unique.map((s) => round(s.overall)), max: 100 },
      ...Object.keys(SUB_SCORE_LABELS).map((key) => ({
        label: SUB_SCORE_LABELS[key as keyof typeof SUB_SCORE_LABELS],
        values: unique.map((s) => round(s.subScores[key as keyof typeof SUB_SCORE_LABELS] ?? 0)),
        max: 100,
      })),
      { label: "Promotion readiness", values: unique.map((s) => round(s.prediction.promotionReadiness)), max: 100 },
    ].filter((row) => row.values.some((v) => v > 0));

    return buildResult({
      kind: "compare",
      query,
      title: `${unique.map((s) => s.name).join(" vs ")}`,
      subtitle: "Side-by-side scorecard computed from synchronized GitHub, Jira, ClickUp and HR data.",
      metricLabel: "AI score",
      metricUnit: "/100",
      poolSize,
      people: unique.map((s, i) =>
        toPerson(s, i + 1, s.overall, "/100", s.insights[0] ?? `${s.designation ?? "Team member"} · rank #${s.orgRank} in the organization`, [
          { label: `Org rank #${s.orgRank}`, tone: "default" },
        ], s.achievements.slice(0, 3)),
      ),
      chart: unique.map((s) => ({ label: s.name, value: round(s.overall) })),
      comparison: { names: unique.map((s) => s.name), rows },
      notes: unique.flatMap((s) => s.recommendations.slice(0, 1)),
    });
  }

  if (intent.kind === "burnout" || intent.kind === "attrition") {
    const isBurnout = intent.kind === "burnout";
    const ranked = [...scores]
      .map((s) => ({
        s,
        value: isBurnout
          ? (s.workload.burnoutRisk === "high" ? 100 : s.workload.burnoutRisk === "medium" ? 60 : 20) +
            Math.min(30, s.workload.overdue * 3)
          : s.prediction.attritionRisk,
      }))
      .filter((r) => (isBurnout ? r.value >= 55 : r.value >= 40))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    return buildResult({
      kind: intent.kind,
      query,
      title: isBurnout ? "Employees at burnout risk" : "Employees at attrition risk",
      subtitle: isBurnout
        ? "Ranked by workload capacity, overdue work and delivery pressure over the last 90 days."
        : "Predicted attrition risk from activity decline, workload and engagement signals.",
      metricLabel: isBurnout ? "Burnout risk" : "Attrition risk",
      metricUnit: "%",
      poolSize,
      people: ranked.map(({ s, value }, i) =>
        toPerson(
          s,
          i + 1,
          Math.min(100, value),
          "%",
          s.risks[0]?.detail ?? `${round(s.workload.assigned)} assigned · ${round(s.workload.overdue)} overdue`,
          [
            { label: `Workload ${s.workload.burnoutRisk}`, tone: riskTone(s.workload.burnoutRisk) },
            { label: `Capacity ${round(s.workload.capacity)}%`, tone: s.workload.capacity > 90 ? "danger" : "muted" },
          ],
          s.risks.slice(0, 3).map((r) => `${r.label}: ${r.detail}`),
        ),
      ),
      comparison: null,
      notes: ranked.length
        ? ["Rebalance assignments or reduce overdue backlog for the highest-risk people first."]
        : ["No employees currently exceed the configured risk thresholds."],
    });
  }

  if (intent.kind === "promotion") {
    const ranked = [...scores]
      .sort((a, b) => b.prediction.promotionReadiness - a.prediction.promotionReadiness)
      .slice(0, 10);
    return buildResult({
      kind: "promotion",
      query,
      title: "Promotion candidates",
      subtitle: "Ranked by promotion readiness: sustained delivery, leadership signals and score trend.",
      metricLabel: "Promotion readiness",
      metricUnit: "%",
      poolSize,
      people: ranked.map((s, i) =>
        toPerson(
          s,
          i + 1,
          s.prediction.promotionReadiness,
          "%",
          s.achievements[0] ?? `AI score ${round(s.overall)}/100 · org rank #${s.orgRank}`,
          [
            { label: `AI ${round(s.overall)}/100`, tone: "success" },
            { label: `Trend ${s.consistency.trend >= 0 ? "+" : ""}${round(s.consistency.trend)}%`, tone: s.consistency.trend >= 0 ? "success" : "warning" },
          ],
          s.achievements.slice(0, 3),
        ),
      ),
      comparison: null,
      notes: ["Readiness blends delivery consistency, leadership evidence and quality — not tenure alone."],
    });
  }

  if (intent.kind === "availability") {
    const ranked = [...scores]
      .map((s) => {
        const { allocation, projects } = allocationOf(pool.evidence.get(s.id));
        return { s, free: Math.max(0, 100 - allocation), allocation, projects };
      })
      .filter((r) => r.free > 20)
      .sort((a, b) => b.free - a.free || b.s.overall - a.s.overall)
      .slice(0, 10);

    return buildResult({
      kind: "availability",
      query,
      title: "Available capacity",
      subtitle: "Employees with unallocated capacity across active and planned projects.",
      metricLabel: "Free capacity",
      metricUnit: "%",
      poolSize,
      people: ranked.map(({ s, free, allocation, projects }, i) =>
        toPerson(
          s,
          i + 1,
          free,
          "%",
          projects.length ? `Currently on ${projects.slice(0, 2).join(", ")}` : "No active project allocation",
          [
            { label: `${round(allocation)}% allocated`, tone: allocation > 80 ? "warning" : "success" },
            { label: `${projects.length} active projects`, tone: "muted" },
          ],
          projects.slice(0, 4),
        ),
      ),
      comparison: null,
      notes: ["Capacity is derived from project allocation percentages, not calendar leave."],
    });
  }

  if (intent.kind === "skill") {
    const skills = intent.skills ?? [];
    const ranked = scores
      .map((s) => {
        const evidence = pool.evidence.get(s.id);
        const hits = skills
          .map((skill) => ({ skill, hit: matchSkill(evidence, skill) }))
          .filter((h) => h.hit);
        return { s, hits, strength: hits.reduce((sum, h) => sum + (h.hit?.strength ?? 0), 0) };
      })
      .filter((r) => r.hits.length)
      .sort((a, b) => b.strength - a.strength || b.s.overall - a.s.overall)
      .slice(0, 12);

    return buildResult({
      kind: "skill",
      query,
      title: `Employees with ${skills.join(", ")} experience`,
      subtitle: "Matched against HR skill profiles, GitHub languages and Jira / ClickUp delivery history.",
      metricLabel: "AI score",
      metricUnit: "/100",
      poolSize,
      people: ranked.map(({ s, hits }, i) =>
        toPerson(
          s,
          i + 1,
          s.overall,
          "/100",
          hits.map((h) => `${h.skill} — ${h.hit?.detail}`).join(" · "),
          hits.map((h) => ({ label: h.skill, tone: "success" as const })),
          hits.map((h) => `${h.skill}: ${h.hit?.source}`),
        ),
      ),
      comparison: null,
      notes: ranked.length ? [] : ["No employee evidence matched those skills in the synchronized data."],
    });
  }

  const metric = METRICS.find((m) => m.key === intent.metricKey) ?? METRICS[METRICS.length - 1];
  const ranked = [...scores].sort((a, b) => metric.read(b) - metric.read(a)).slice(0, 10);
  return buildResult({
    kind: "leaderboard",
    query,
    title: `Top ${metric.label.toLowerCase()}`,
    subtitle: "Leaderboard computed from the synchronized delivery data of the last 90 days.",
    metricLabel: metric.label,
    metricUnit: metric.unit,
    poolSize,
    people: ranked.map((s, i) =>
      toPerson(
        s,
        i + 1,
        metric.read(s),
        metric.unit,
        `${s.designation ?? "Team member"}${s.departmentName ? ` · ${s.departmentName}` : ""}`,
        [{ label: `AI ${round(s.overall)}/100`, tone: "default" }],
        s.achievements.slice(0, 2),
      ),
    ),
    comparison: null,
    notes: [],
  });
}

export async function runInsight(
  supabase: SupabaseClient,
  userId: string,
  intent: InsightIntent,
  query: string,
): Promise<InsightResult> {
  const pool = await buildTalentPool(supabase, { userId, canManage: true });
  return computeInsight(pool, intent, query);
}
