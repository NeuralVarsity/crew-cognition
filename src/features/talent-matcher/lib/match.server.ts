import type { EmployeeScore } from "@/features/ai-engine/types";
import type { CandidateEvidence, TalentPool } from "./pool.server";
import { canonicalSkill, evidenceMatchesSkill, relatedSkills } from "./skills";
import { detectRoleProfiles, roleFit as computeRoleFit, ROLE_PROFILES, type RoleProfile } from "./roles";
import {
  DIMENSION_LABELS,
  MATCH_DIMENSIONS,
  fitLabel,
  recommendationLabel,
  type CandidateMatch,
  type DimensionScore,
  type MatchDimension,
  type MatchResult,
  type ProjectPrediction,
  type RoleRequirement,
  type SkillEvidence,
  type SkillGap,
  type TalentSettings,
  type TeamSlot,
} from "../types";

const PROFICIENCY_STRENGTH: Record<string, number> = {
  beginner: 0.45,
  intermediate: 0.7,
  advanced: 0.9,
  expert: 1,
};

const round1 = (n: number) => Math.round(n * 10) / 10;
const clamp10 = (n: number) => Math.max(0, Math.min(10, n));

type SkillHit = { strength: number; sources: string[] };

function skillStrength(skill: string, score: EmployeeScore, ev: CandidateEvidence): SkillHit {
  const related = relatedSkills(skill);
  // A skill is evidenced directly, or partially through a related capability
  // (e.g. "Application Development" is evidenced by React + Node.js delivery).
  const matches = (text: string): number => {
    if (!text) return 0;
    if (evidenceMatchesSkill(skill, text)) return 1;
    return related.some((alt) => evidenceMatchesSkill(alt, text)) ? 0.8 : 0;
  };
  const sources: string[] = [];
  let strength = 0;
  const bump = (value: number, source: string) => {
    if (value <= 0) return;
    sources.push(source);
    strength = Math.max(strength, value);
  };

  for (const owned of ev.skills) {
    const factor = matches(owned.name);
    if (factor) {
      const base = PROFICIENCY_STRENGTH[owned.proficiency] ?? 0.7;
      const yearsBoost = Math.min(0.1, owned.years * 0.02);
      bump(Math.min(1, base + yearsBoost) * factor, `Skill profile · ${owned.name} (${owned.proficiency})`);
    }
  }

  const totalContrib = Object.values(ev.languages).reduce((a, b) => a + b, 0);
  for (const [language, contributions] of Object.entries(ev.languages)) {
    const factor = matches(language);
    if (!factor) continue;
    const share = totalContrib > 0 ? contributions / totalContrib : 0;
    bump(
      Math.min(0.95, 0.6 + share * 0.35) * factor,
      `GitHub language · ${language} (${Math.round(share * 100)}% of contributions)`,
    );
  }

  const repoHit = ev.repositories.find((repo) => matches(repo) > 0);
  if (repoHit) bump(0.62 * matches(repoHit), `GitHub repository · ${repoHit.split(" — ")[0]}`);

  const projectHit = ev.projects.find(
    (project) => matches(`${project.name} ${project.role ?? ""} ${project.techStack.join(" ")}`) > 0,
  );
  if (projectHit) {
    const factor = matches(`${projectHit.name} ${projectHit.role ?? ""} ${projectHit.techStack.join(" ")}`);
    bump(0.6 * factor, `Project · ${projectHit.name.split(" — ")[0]}`);
  }

  if (ev.issueText) bump(0.5 * matches(ev.issueText), "Jira issue history");
  if (ev.taskText) bump(0.5 * matches(ev.taskText), "ClickUp task history");
  if (ev.commitText) bump(0.55 * matches(ev.commitText), "GitHub commit history");
  if (score.designation) bump(0.75 * matches(score.designation), `Role · ${score.designation}`);

  return { strength, sources: sources.slice(0, 4) };
}

function relevanceKeywords(req: RoleRequirement): string[] {
  const words = [
    ...req.primarySkills,
    ...req.secondarySkills,
    ...req.languages,
    ...req.frameworks,
    ...req.databases,
    ...req.cloud,
    ...req.devops,
    ...req.aiSkills,
  ];
  if (req.domain) words.push(req.domain);
  return [...new Set(words.map((w) => w.toLowerCase()).filter(Boolean))];
}

function experienceYears(score: EmployeeScore, ev: CandidateEvidence): number {
  const skillYears = ev.skills.reduce((max, s) => Math.max(max, s.years), 0);
  return round1(Math.max(ev.tenureYears, skillYears));
}

function availabilityOf(score: EmployeeScore, ev: CandidateEvidence) {
  const active = ev.projects.filter((p) => p.status === "active" || p.status === "planning");
  const allocation = Math.min(100, active.reduce((sum, p) => sum + (p.allocation || 0), 0));
  const label =
    allocation >= 90 || score.workload.burnoutRisk === "high"
      ? "Fully allocated"
      : allocation >= 60
        ? "Partially available"
        : "Available";
  return { label, allocation, activeProjects: active.length };
}

function riskOf(score: EmployeeScore): "low" | "medium" | "high" {
  const burnout = score.workload.burnoutRisk;
  const attrition = score.prediction.attritionRisk;
  if (burnout === "high" || attrition >= 70) return "high";
  if (burnout === "medium" || attrition >= 45) return "medium";
  return "low";
}

export type MatchOptions = {
  employeeIds?: string[];
  topN?: number;
  departmentId?: string | null;
  teamId?: string | null;
};

export function matchCandidates(
  pool: TalentPool,
  requirement: RoleRequirement,
  settings: TalentSettings,
  options: MatchOptions = {},
): MatchResult {
  const { weights, rules } = settings;
  const keywords = relevanceKeywords(requirement);
  const primary = [...new Set(requirement.primarySkills.map((s) => canonicalSkill(s)?.canonical ?? s.toLowerCase()))];
  const secondary = [
    ...new Set(
      requirement.secondarySkills
        .map((s) => canonicalSkill(s)?.canonical ?? s.toLowerCase())
        .filter((s) => !primary.includes(s)),
    ),
  ];

  const deptByName = new Map(pool.departments.map((d) => [d.name.toLowerCase(), d.id]));
  const profiles: RoleProfile[] = requirement.roleKeys?.length
    ? (requirement.roleKeys.map((k) => ROLE_PROFILES.find((p) => p.key === k)).filter(Boolean) as RoleProfile[])
    : detectRoleProfiles(`${requirement.title} ${requirement.summary}`);
  const teamByName = new Map(pool.teams.map((t) => [t.name.toLowerCase(), t.id]));
  const wantedDept = options.departmentId ?? (requirement.department ? deptByName.get(requirement.department.toLowerCase()) : undefined);
  const wantedTeam = options.teamId ?? (requirement.team ? teamByName.get(requirement.team.toLowerCase()) : undefined);

  let candidatePool = pool.scores;
  if (options.employeeIds?.length) {
    const wanted = new Set(options.employeeIds);
    candidatePool = candidatePool.filter((s) => wanted.has(s.id));
  } else {
    if (!rules.includeInactive) candidatePool = candidatePool.filter((s) => s.status === "active");
    if (wantedDept) candidatePool = candidatePool.filter((s) => s.departmentId === wantedDept);
    if (wantedTeam) candidatePool = candidatePool.filter((s) => s.teamId === wantedTeam);
  }

  const scored: CandidateMatch[] = candidatePool.map((score) => {
    const ev =
      pool.evidence.get(score.id) ??
      ({
        employeeId: score.id,
        tenureYears: 0,
        skills: [],
        languages: {},
        repositories: [],
        projects: [],
        issueText: "",
        taskText: "",
        commitText: "",
      } satisfies CandidateEvidence);

    const skillEvidence: SkillEvidence[] = [];
    let skillNumerator = 0;
    let skillDenominator = 0;
    let primaryHits = 0;

    for (const skill of primary) {
      const hit = skillStrength(skill, score, ev);
      skillEvidence.push({
        skill,
        matched: hit.strength >= 0.4,
        weight: "primary",
        sources: hit.sources,
        strength: round1(hit.strength * 10) / 10,
      });
      skillNumerator += hit.strength;
      skillDenominator += 1;
      if (hit.strength >= 0.4) primaryHits += 1;
    }
    for (const skill of secondary) {
      const hit = skillStrength(skill, score, ev);
      skillEvidence.push({
        skill,
        matched: hit.strength >= 0.4,
        weight: "secondary",
        sources: hit.sources,
        strength: round1(hit.strength * 10) / 10,
      });
      skillNumerator += hit.strength * 0.5;
      skillDenominator += 0.5;
    }

    const skillsScore = skillDenominator > 0 ? clamp10((skillNumerator / skillDenominator) * 10) : 0;
    const primaryCoverage = primary.length ? primaryHits / primary.length : 1;
    const fit = computeRoleFit(score.designation, profiles, score.departmentName);

    const relevanceText = [
      ...ev.projects.map((p) => `${p.name} ${p.role ?? ""} ${p.techStack.join(" ")}`),
      ...ev.repositories,
      ev.issueText,
      ev.taskText,
      ev.commitText,
      score.designation ?? "",
    ].join(" ");
    // Only score relevance when there is actual delivery history to read; a bare
    // designation is not evidence of domain work either way.
    const hasDeliveryHistory =
      ev.projects.length > 0 || ev.repositories.length > 0 || !!ev.issueText || !!ev.taskText || !!ev.commitText;
    // Fuzzy relevance: a keyword counts when the delivery history mentions it OR a
    // related technology (project tech stack, repo names/topics, Jira epics, ClickUp lists).
    const relevanceHits = keywords.filter(
      (k) => evidenceMatchesSkill(k, relevanceText) || relatedSkills(k).some((alt) => evidenceMatchesSkill(alt, relevanceText)),
    );
    // Saturates at ~35% coverage of the requested stack — real engineers rarely touch
    // every listed technology inside one lookback window.
    const coverageRatio = keywords.length ? relevanceHits.length / Math.max(1, keywords.length * 0.35) : 0;
    const deliveryBaseline = hasDeliveryHistory ? 3 : 0;
    const relevanceScore = keywords.length ? clamp10(Math.max(deliveryBaseline, coverageRatio * 10)) : deliveryBaseline;

    const availability = availabilityOf(score, ev);
    const availabilityScore = clamp10(10 - availability.allocation / 12 - (score.workload.burnoutRisk === "high" ? 2 : 0));

    const years = experienceYears(score, ev);
    const requiredYears = requirement.minYears ?? 0;
    const experienceScore =
      requiredYears > 0 ? clamp10((years / requiredYears) * 8 + (years >= requiredYears ? 2 : 0)) : clamp10(years * 1.4);

    const raw: Record<MatchDimension, { score: number; available: boolean; reasons: string[] }> = {
      skills: {
        score: skillsScore,
        available: skillDenominator > 0,
        reasons: [
          `${primaryHits}/${primary.length || 0} required skills evidenced`,
          ...skillEvidence
            .filter((s) => s.matched && s.sources.length)
            .slice(0, 3)
            .map((s) => `${s.skill}: ${s.sources[0]}`),
        ],
      },
      github: {
        score: score.subScores.github / 10,
        available: score.dataCoverage.github,
        reasons: [
          `${score.productivity.commitFrequency} commits, ${score.productivity.pullRequests} PRs, ${score.productivity.reviewActivity} reviews`,
          `${score.productivity.repositoryContributions} repositories contributed to`,
        ],
      },
      jira: {
        score: score.subScores.jira / 10,
        available: score.dataCoverage.jira,
        reasons: [
          `${score.productivity.issueResolution} issues resolved, ${score.productivity.storyPoints} story points`,
          `${score.productivity.sprintContribution} sprints contributed to`,
        ],
      },
      clickup: {
        score: score.subScores.clickup / 10,
        available: score.dataCoverage.clickup,
        reasons: [
          `${score.productivity.taskCompletionRate}% task completion rate`,
          `${score.productivity.trackedHours}h tracked`,
        ],
      },
      experience: {
        score: experienceScore,
        available: years > 0,
        reasons: [
          requiredYears
            ? `${years} yrs experience vs ${requiredYears} yrs required`
            : `${years} yrs of recorded experience`,
        ],
      },
      projectRelevance: {
        score: relevanceScore,
        available: keywords.length > 0 && hasDeliveryHistory,
        reasons: relevanceHits.length
          ? [`Domain overlap on ${relevanceHits.slice(0, 5).join(", ")}`]
          : ["No overlapping domain keywords in project or repository history"],
      },
      availability: {
        score: availabilityScore,
        available: true,
        reasons: [`${availability.label} — ${availability.allocation}% allocated across ${availability.activeProjects} active projects`],
      },
      roleFit: {
        score: fit.score,
        available: profiles.length > 0,
        reasons: [fit.reason],
      },
      collaboration: {
        score: score.subScores.collaboration / 10,
        available: true,
        reasons: [`Collaboration sub-score ${score.subScores.collaboration}/100`],
      },
      learning: {
        score: score.subScores.learning / 10,
        available: true,
        reasons: [`Learning sub-score ${score.subScores.learning}/100`],
      },
      communication: {
        score: score.subScores.communication / 10,
        available: true,
        reasons: [`Communication sub-score ${score.subScores.communication}/100`],
      },
      leadership: {
        score: score.subScores.leadership / 10,
        available: true,
        reasons: [`Leadership sub-score ${score.subScores.leadership}/100`],
      },
    };

    const dimensions: DimensionScore[] = MATCH_DIMENSIONS.map((key) => {
      let weight = weights[key] ?? 0;
      if (rules.formula === "skill_first" && key === "skills") weight *= 2;
      if (rules.formula === "balanced") weight = 10;
      if (key === "leadership" && requirement.leadershipRequired) weight *= 1.5;
      return {
        key,
        label: DIMENSION_LABELS[key],
        score: round1(clamp10(raw[key].score)),
        weight: Math.round(weight * 10) / 10,
        available: raw[key].available,
        reasons: raw[key].reasons.filter(Boolean),
      };
    });

    const usable = dimensions.filter((d) => d.available && d.weight > 0);
    const totalWeight = usable.reduce((sum, d) => sum + d.weight, 0);
    let overall = totalWeight > 0 ? usable.reduce((sum, d) => sum + d.score * d.weight, 0) / totalWeight : 0;
    if (rules.formula === "skill_first" && primary.length) overall *= 0.6 + 0.4 * primaryCoverage;

    // Role gate: a discipline mismatch (e.g. a PM for an engineering ask) can never
    // outrank a real engineer purely on delivery throughput.
    if (profiles.length) {
      const gate = 0.7 + 0.03 * fit.score; // 0.73 (discipline mismatch) … 1.0 (exact title)
      overall *= gate;
      if (primary.length && primaryCoverage === 0 && fit.score < 6.5) overall *= 0.75;
    }
    // A single missing keyword must never collapse an otherwise credible candidate:
    // anyone with role fit plus real delivery evidence keeps a 4/10 floor.
    const hasDeliverySignal =
      score.dataCoverage.github || score.dataCoverage.jira || score.dataCoverage.clickup || ev.projects.length > 0;
    if (hasDeliverySignal && (fit.score >= 6.5 || primaryCoverage > 0)) overall = Math.max(overall, 4);
    overall = round1(clamp10(overall));

    const ranked = [...usable].sort((a, b) => b.score - a.score);
    const strengths = ranked.slice(0, 3).filter((d) => d.score >= 6).map((d) => `${d.label} ${d.score}/10 — ${d.reasons[0] ?? ""}`.trim());
    const weaknesses = ranked
      .slice(-3)
      .filter((d) => d.score < 6)
      .map((d) => `${d.label} ${d.score}/10 — ${d.reasons[0] ?? ""}`.trim());

    const matchedSkills = skillEvidence.filter((s) => s.matched).map((s) => s.skill);
    const missingSkills = skillEvidence.filter((s) => !s.matched).map((s) => s.skill);
    const skillMatchPercent = primary.length
      ? Math.round(primaryCoverage * 100)
      : Math.round((skillEvidence.filter((s) => s.matched).length / Math.max(1, skillEvidence.length)) * 100);
    const projectRelevancePercent = Math.round(relevanceScore * 10);

    const evidenceBundle = {
      skills: skillEvidence
        .filter((s) => s.matched && s.sources.length)
        .slice(0, 6)
        .map((s) => `${s.skill} — ${s.sources[0]}`),
      projects: ev.projects
        .filter((p) => relevanceHits.some((k) => evidenceMatchesSkill(k, `${p.name} ${p.techStack.join(" ")}`)))
        .slice(0, 4)
        .map((p) => `${p.name.split(" — ")[0]}${p.techStack.length ? ` (${p.techStack.slice(0, 4).join(", ")})` : ""}`),
      github: score.dataCoverage.github
        ? [
            `${score.productivity.commitFrequency} commits · ${score.productivity.pullRequests} PRs · ${score.productivity.reviewActivity} reviews`,
            ...ev.repositories.slice(0, 3).map((r) => `Repo · ${r.split(" — ")[0]}`),
            ...Object.entries(ev.languages)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .map(([lang, n]) => `Language · ${lang} (${n} contributions)`),
          ]
        : ["No GitHub activity synced for this employee"],
      jira: score.dataCoverage.jira
        ? [`${score.productivity.issueResolution} issues resolved · ${score.productivity.storyPoints} story points · ${score.productivity.sprintContribution} sprints`]
        : ["No Jira activity synced for this employee"],
      clickup: score.dataCoverage.clickup
        ? [`${score.workload.completed} tasks completed · ${score.productivity.taskCompletionRate}% completion · ${score.productivity.trackedHours}h tracked`]
        : ["No ClickUp activity synced for this employee"],
    };

    const whySelected = [
      `${fit.reason}`,
      matchedSkills.length
        ? `Skill match ${skillMatchPercent}% — evidenced ${matchedSkills.slice(0, 5).join(", ")}.`
        : `Skill match ${skillMatchPercent}% — no required skill evidenced.`,
      `Project relevance ${projectRelevancePercent}%${relevanceHits.length ? ` via ${relevanceHits.slice(0, 4).join(", ")}` : " — no overlapping delivery history"}.`,
      `Delivery signal: GitHub ${round1(score.subScores.github / 10)}/10, Jira ${round1(score.subScores.jira / 10)}/10, ClickUp ${round1(score.subScores.clickup / 10)}/10.`,
    ].filter(Boolean);

    const whyNotSelected = [
      missingSkills.length ? `Missing skills: ${missingSkills.slice(0, 6).join(", ")}.` : null,
      profiles.length && fit.score < 6.5 ? `Role fit is limited — ${fit.label}.` : null,
      projectRelevancePercent < 40 ? "Thin project evidence in the requested domain." : null,
      availability.label === "Fully allocated" ? `${availability.allocation}% allocated — limited near-term capacity.` : null,
      !score.dataCoverage.github && !score.dataCoverage.jira && !score.dataCoverage.clickup
        ? "No delivery-tool data synced, so throughput could not be verified."
        : null,
    ].filter(Boolean) as string[];

    const reasons = [
      `Overall fit ${overall}/10 from ${usable.length} scored dimensions using the ${rules.formula.replace("_", " ")} formula.`,
      matchedSkills.length
        ? `Evidenced skills: ${matchedSkills.slice(0, 6).join(", ")}.`
        : "No required skill could be evidenced from synced data.",
      missingSkills.length ? `Gaps: ${missingSkills.slice(0, 6).join(", ")}.` : "No skill gaps against this requirement.",
      `Delivery signal: ${score.productivity.commitFrequency} commits, ${score.productivity.issueResolution} Jira issues, ${score.productivity.taskCompletionRate}% ClickUp completion.`,
      `Availability: ${availability.label} (${availability.allocation}% allocated across ${availability.activeProjects} active projects).`,
    ];

    const lifetimeCommits = Math.max(
      ev.contributions,
      Math.round(score.productivity.commitFrequency * 13),
    );
    const explanation =
      `${score.name} scores ${overall}/10 for "${requirement.title}": role fit ${round1(fit.score)}/10 (${fit.label}), ` +
      `skills ${skillMatchPercent}% (${matchedSkills.slice(0, 4).join(", ") || "no direct evidence"}), ` +
      `project relevance ${projectRelevancePercent}%, ${lifetimeCommits} commits · ${score.productivity.pullRequests} PRs, ` +
      `${score.productivity.issueResolution} Jira items, ${score.productivity.taskCompletionRate}% ClickUp completion, ` +
      `${years} yrs experience, ${availability.label.toLowerCase()} (${availability.allocation}% allocated).`;

    return {
      employeeId: score.id,
      name: score.name,
      email: score.email,
      photo: score.photo,
      designation: score.designation,
      department: score.departmentName,
      team: score.teamName,
      manager: score.managerName,
      status: score.status,
      availability,
      currentProjects: ev.projects.filter((p) => p.status === "active").map((p) => p.name.split(" — ")[0]),
      yearsExperience: years,
      rank: 0,
      overall,
      fit: fitLabel(overall),
      recommendation: "",
      dimensions,
      skillEvidence,
      matchedSkills,
      missingSkills,
      strengths,
      weaknesses,
      reasons,
      roleFit: { score: round1(fit.score), label: fit.label, reason: fit.reason },
      skillMatchPercent,
      projectRelevancePercent,
      evidence: evidenceBundle,
      whySelected,
      whyNotSelected: whyNotSelected.length ? whyNotSelected : ["No material gaps against this requirement."],
      dataCoverage: {
        github: score.dataCoverage.github,
        jira: score.dataCoverage.jira,
        clickup: score.dataCoverage.clickup,
        profile: ev.skills.length > 0,
      },
      riskLevel: riskOf(score),
      aiExplanation: explanation,
      metrics: {
        commits: lifetimeCommits,
        commitsPerWeek: score.productivity.commitFrequency,
        mergedPrs: score.productivity.pullRequests,
        reviews: score.productivity.reviewActivity,
        repositories: score.productivity.repositoryContributions,
        jiraResolved: score.productivity.issueResolution,
        storyPoints: score.productivity.storyPoints,
        sprints: score.productivity.sprintContribution,
        clickupDone: score.workload.completed,
        clickupCompletionRate: score.productivity.taskCompletionRate,
        trackedHours: score.productivity.trackedHours,
      },
    } satisfies CandidateMatch;
  });

  scored.sort((a, b) => b.overall - a.overall || a.name.localeCompare(b.name));
  const filtered = scored.filter((c) => c.overall >= rules.minScore);
  const topN = options.topN ?? rules.topN;
  const candidates = (options.employeeIds?.length ? scored : filtered).slice(0, Math.max(1, topN)).map((c, index) => ({
    ...c,
    rank: index + 1,
    recommendation: recommendationLabel(index + 1, c.overall),
  }));

  const skillGaps = buildSkillGaps([...primary, ...secondary], candidates);
  const team = buildTeam(requirement, scored);
  const prediction = buildPrediction(candidates, skillGaps, requirement);

  const executiveSummary = buildSummary(requirement, candidates, skillGaps, prediction, scored.length);

  return {
    generatedAt: new Date().toISOString(),
    query: requirement.summary || requirement.title,
    sourceName: null,
    requirement,
    settings,
    poolSize: scored.length,
    candidates,
    skillGaps,
    team,
    prediction,
    executiveSummary,
  };
}

function buildSkillGaps(skills: string[], candidates: CandidateMatch[]): SkillGap[] {
  if (!candidates.length) return [];
  return skills.map((skill) => {
    const withSkill = candidates.filter((c) => c.skillEvidence.some((s) => s.skill === skill && s.matched));
    const best = withSkill
      .map((c) => ({ c, strength: c.skillEvidence.find((s) => s.skill === skill)?.strength ?? 0 }))
      .sort((a, b) => b.strength - a.strength)[0];
    const coverage = Math.round((withSkill.length / candidates.length) * 100);
    return {
      skill,
      coverage,
      bestCandidate: best?.c.name ?? null,
      recommendation:
        coverage === 0
          ? `No shortlisted employee shows ${skill}. Hire externally or start a focused upskilling track.`
          : coverage < 40
            ? `Only ${coverage}% of the shortlist covers ${skill}. Pair juniors with ${best?.c.name} for knowledge transfer.`
            : `Healthy coverage (${coverage}%). ${best?.c.name} is the strongest reference for ${skill}.`,
    };
  });
}

function buildTeam(requirement: RoleRequirement, scored: CandidateMatch[]): TeamSlot[] {
  const roles = requirement.teamRoles.length ? requirement.teamRoles : [];
  if (!roles.length) return [];
  const taken = new Set<string>();
  return roles.map((role) => {
    const ranked = scored
      .filter((c) => !taken.has(c.employeeId))
      .map((c) => {
        const roleFit = evidenceMatchesSkill(role, `${c.designation ?? ""} ${c.matchedSkills.join(" ")}`) ? 1.5 : 0;
        return { c, value: c.overall + roleFit };
      })
      .sort((a, b) => b.value - a.value);
    const best = ranked[0];
    if (!best) return { role, employeeId: null, name: null, score: 0, reason: "No available candidate in the pool." };
    taken.add(best.c.employeeId);
    return {
      role,
      employeeId: best.c.employeeId,
      name: best.c.name,
      score: best.c.overall,
      reason: `${best.c.fit} · ${best.c.matchedSkills.slice(0, 3).join(", ") || "general delivery signal"} · ${best.c.availability.label}`,
    };
  });
}

function buildPrediction(
  candidates: CandidateMatch[],
  gaps: SkillGap[],
  requirement: RoleRequirement,
): ProjectPrediction {
  const top = candidates.slice(0, 5);
  const avg = top.length ? top.reduce((sum, c) => sum + c.overall, 0) / top.length : 0;
  const gapPercent = gaps.length ? Math.round((gaps.filter((g) => g.coverage < 40).length / gaps.length) * 100) : 0;
  const availabilityPenalty = top.filter((c) => c.availability.label === "Fully allocated").length * 5;
  const success = Math.max(5, Math.min(97, Math.round(avg * 10 - gapPercent * 0.35 - availabilityPenalty)));
  const risk = 100 - success;
  const notes: string[] = [];
  if (gapPercent > 40) notes.push(`${gapPercent}% of required skills are thinly covered in the shortlist.`);
  if (availabilityPenalty > 0) notes.push(`${availabilityPenalty / 5} of the top candidates are fully allocated.`);
  if (!candidates.length) notes.push("No candidate cleared the minimum score threshold.");
  if (requirement.minYears && top.some((c) => c.yearsExperience < requirement.minYears!)) {
    notes.push("Some shortlisted candidates are below the required experience bar.");
  }
  if (!notes.length) notes.push("Shortlist covers the requirement with healthy delivery signals.");
  return {
    successProbability: success,
    riskPercent: risk,
    deliveryConfidence: Math.round(Math.min(100, avg * 10)),
    resourceGap: Math.max(0, (requirement.teamRoles.length || 1) - candidates.length),
    skillGapPercent: gapPercent,
    budgetRisk: risk > 55 ? "high" : risk > 30 ? "medium" : "low",
    timelineRisk: availabilityPenalty >= 10 ? "high" : availabilityPenalty > 0 ? "medium" : "low",
    notes,
  };
}

function buildSummary(
  requirement: RoleRequirement,
  candidates: CandidateMatch[],
  gaps: SkillGap[],
  prediction: ProjectPrediction,
  poolSize: number,
): string[] {
  const lines: string[] = [];
  if (poolSize === 0) {
    lines.push(
      `No employee data is available yet, so no candidates could be evaluated for "${requirement.title}".`,
    );
    lines.push(
      "Sync GitHub, Jira or ClickUp, import employees from Excel, or enable Demo mode in Administration to generate a full sample workforce.",
    );
    return lines;
  }
  lines.push(
    `Evaluated ${poolSize} employees against "${requirement.title}" and shortlisted ${candidates.length} candidates.`,
  );
  if (candidates[0]) {
    lines.push(
      `${candidates[0].name} ranks #1 at ${candidates[0].overall}/10 (${candidates[0].fit}) with ${candidates[0].matchedSkills.length} evidenced skills.`,
    );
  }
  const weakest = gaps.filter((g) => g.coverage < 40).map((g) => g.skill);
  if (weakest.length) lines.push(`Weakest coverage: ${weakest.slice(0, 5).join(", ")}.`);
  lines.push(
    `Predicted delivery success ${prediction.successProbability}% with ${prediction.timelineRisk} timeline risk and ${prediction.budgetRisk} budget risk.`,
  );
  return lines;
}