import { generateText } from "ai";
import { createLovableAiGatewayProvider, requireLovableApiKey, TALENT_MODEL } from "@/lib/ai-gateway.server";
import { extractMinYears, extractSkills } from "./skills";
import { detectRoleProfiles, roleSkillSets } from "./roles";
import type { RoleRequirement } from "../types";

const EMPTY: RoleRequirement = {
  title: "Role requirement",
  summary: "",
  seniority: null,
  minYears: null,
  primarySkills: [],
  secondarySkills: [],
  languages: [],
  frameworks: [],
  databases: [],
  cloud: [],
  devops: [],
  aiSkills: [],
  softSkills: [],
  certifications: [],
  domain: null,
  duration: null,
  employmentType: null,
  availability: null,
  leadershipRequired: false,
  department: null,
  team: null,
  teamRoles: [],
  roleKeys: [],
  preferredTitles: [],
  intent: "rank",
  extractedFrom: "query",
};

const SENIORITY = ["intern", "junior", "mid", "mid-level", "senior", "staff", "principal", "lead", "manager", "director"];

/** Deterministic baseline extraction — always runs, with or without the model. */
export function extractRequirementDeterministic(text: string, from: "query" | "document"): RoleRequirement {
  const lower = text.toLowerCase();
  const found = extractSkills(text);
  const byCategory = (category: string) => found.filter((s) => s.category === category).map((s) => s.canonical);

  const technical = found.filter((s) => s.category !== "soft").map((s) => s.canonical);
  const soft = byCategory("soft");

  // Role profiles carry the implied tech stack for asks like "best AI Engineer",
  // which mention no explicit skills at all.
  const profiles = detectRoleProfiles(text);
  const roleSkills = roleSkillSets(profiles);
  const primaryList = [...new Set([...technical, ...roleSkills.primary])];
  const secondaryList = [...new Set([...roleSkills.secondary, ...technical])].filter((s) => !primaryList.includes(s));

  const seniority = SENIORITY.find((s) => new RegExp(`\\b${s}\\b`, "i").test(lower)) ?? null;
  const teamRoleMatches = [...lower.matchAll(/(\d+)\s+([a-z][a-z\s/]{2,30}?)(?:s)?\s*(?:developer|engineer|designer|analyst|manager|lead|tester)/g)];

  return {
    ...EMPTY,
    title: text.trim().split(/\n|\./)[0]?.slice(0, 120) || "Role requirement",
    summary: text.trim().slice(0, 600),
    seniority,
    minYears: extractMinYears(text),
    primarySkills: primaryList.slice(0, 10),
    secondarySkills: [...primaryList.slice(10), ...secondaryList].slice(0, 12),
    roleKeys: profiles.map((p) => p.key),
    preferredTitles: profiles.flatMap((p) => p.titleTiers[0] ?? []),
    languages: byCategory("language"),
    frameworks: byCategory("framework"),
    databases: byCategory("database"),
    cloud: byCategory("cloud"),
    devops: byCategory("devops"),
    aiSkills: byCategory("ai"),
    softSkills: soft,
    leadershipRequired: /\b(lead|leadership|mentor|manage the team|tech lead)\b/i.test(lower),
    teamRoles: teamRoleMatches
      .map((m) => `${m[2].trim()} engineer`)
      .filter(Boolean)
      .slice(0, 8),
    intent: /\bcompare\b/i.test(lower)
      ? "compare"
      : /\bteam\b|\bsquad\b|\bstaff (a|the) project\b/i.test(lower)
        ? "team"
        : "rank",
    extractedFrom: from,
  };
}

type ModelRequirement = Partial<Record<keyof RoleRequirement, unknown>>;

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((v): v is string => typeof v === "string" && v.trim().length > 0).map((v) => v.trim().toLowerCase()))];
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Enriches the deterministic extraction with model-parsed structure.
 * The model can only add context; scoring stays deterministic.
 */
export async function extractRequirement(
  text: string,
  from: "query" | "document",
  context?: { departments: string[]; teams: string[] },
): Promise<RoleRequirement> {
  const base = extractRequirementDeterministic(text, from);
  if (!text.trim()) return base;

  try {
    const gateway = createLovableAiGatewayProvider(requireLovableApiKey());
    const { text: raw } = await generateText({
      model: gateway(TALENT_MODEL),
      temperature: 0,
      system:
        "You extract hiring/staffing requirements from text and reply with a single JSON object only, no prose and no code fences. " +
        "Never invent skills that are not implied by the text. Keys: title, summary, seniority, minYears, primarySkills, secondarySkills, " +
        "softSkills, certifications, domain, duration, employmentType, availability, leadershipRequired, department, team, teamRoles, intent. " +
        "intent is one of rank, compare, team, explain. Arrays contain lowercase short skill names.",
      prompt: [
        context?.departments.length ? `Known departments: ${context.departments.join(", ")}.` : "",
        context?.teams.length ? `Known teams: ${context.teams.join(", ")}.` : "",
        "Requirement text:",
        text.slice(0, 12000),
      ]
        .filter(Boolean)
        .join("\n"),
    });

    const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) return base;
    const parsed = JSON.parse(cleaned.slice(start, end + 1)) as ModelRequirement;

    const primary = [...new Set([...stringArray(parsed.primarySkills), ...base.primarySkills])].slice(0, 12);
    const secondary = [...new Set([...stringArray(parsed.secondarySkills), ...base.secondarySkills])]
      .filter((s) => !primary.includes(s))
      .slice(0, 12);

    const intent = typeof parsed.intent === "string" && ["rank", "compare", "team", "explain"].includes(parsed.intent)
      ? (parsed.intent as RoleRequirement["intent"])
      : base.intent;

    return {
      ...base,
      title: nullableString(parsed.title) ?? base.title,
      summary: nullableString(parsed.summary) ?? base.summary,
      seniority: nullableString(parsed.seniority) ?? base.seniority,
      minYears: typeof parsed.minYears === "number" && parsed.minYears > 0 ? parsed.minYears : base.minYears,
      primarySkills: primary,
      secondarySkills: secondary,
      softSkills: [...new Set([...stringArray(parsed.softSkills), ...base.softSkills])],
      certifications: stringArray(parsed.certifications),
      domain: nullableString(parsed.domain) ?? base.domain,
      duration: nullableString(parsed.duration),
      employmentType: nullableString(parsed.employmentType),
      availability: nullableString(parsed.availability),
      leadershipRequired: parsed.leadershipRequired === true || base.leadershipRequired,
      department: nullableString(parsed.department) ?? base.department,
      team: nullableString(parsed.team) ?? base.team,
      teamRoles: stringArray(parsed.teamRoles).length ? stringArray(parsed.teamRoles) : base.teamRoles,
      intent,
    };
  } catch {
    return base;
  }
}