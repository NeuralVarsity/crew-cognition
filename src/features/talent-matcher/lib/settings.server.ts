import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_MATCH_RULES,
  DEFAULT_MATCH_WEIGHTS,
  DEFAULT_ROLE_TEMPLATES,
  MATCH_DIMENSIONS,
  type MatchRules,
  type MatchWeights,
  type RoleTemplate,
  type TalentSettings,
} from "../types";

type Raw = Record<string, unknown> | null | undefined;

export function normalizeTalentSettings(raw: Raw): TalentSettings {
  const weightsRaw = (raw?.weights ?? {}) as Record<string, unknown>;
  const weights = { ...DEFAULT_MATCH_WEIGHTS } as MatchWeights;
  for (const key of MATCH_DIMENSIONS) {
    const value = Number(weightsRaw[key]);
    if (Number.isFinite(value) && value >= 0) weights[key] = value;
  }

  const rulesRaw = (raw?.rules ?? {}) as Record<string, unknown>;
  const formula = ["weighted_average", "skill_first", "balanced"].includes(String(rulesRaw.formula))
    ? (rulesRaw.formula as MatchRules["formula"])
    : DEFAULT_MATCH_RULES.formula;
  const rules: MatchRules = {
    minScore: Number.isFinite(Number(rulesRaw.minScore)) ? Number(rulesRaw.minScore) : DEFAULT_MATCH_RULES.minScore,
    topN: Number.isFinite(Number(rulesRaw.topN)) ? Math.max(1, Number(rulesRaw.topN)) : DEFAULT_MATCH_RULES.topN,
    formula,
    includeInactive: rulesRaw.includeInactive === true,
    lookbackDays: Number.isFinite(Number(rulesRaw.lookbackDays))
      ? Number(rulesRaw.lookbackDays)
      : DEFAULT_MATCH_RULES.lookbackDays,
  };

  const templatesRaw = raw?.role_templates ?? raw?.roleTemplates;
  const roleTemplates: RoleTemplate[] = Array.isArray(templatesRaw) && templatesRaw.length
    ? (templatesRaw as Record<string, unknown>[]).map((t, index) => ({
        id: String(t.id ?? `template-${index}`),
        name: String(t.name ?? "Role"),
        primarySkills: Array.isArray(t.primarySkills) ? (t.primarySkills as string[]) : [],
        secondarySkills: Array.isArray(t.secondarySkills) ? (t.secondarySkills as string[]) : [],
        minYears: Number(t.minYears ?? 0) || 0,
      }))
    : DEFAULT_ROLE_TEMPLATES;

  const skillCategories = (raw?.skill_categories ?? raw?.skillCategories ?? {}) as Record<string, string[]>;

  return { weights, rules, roleTemplates, skillCategories };
}

export async function loadTalentSettings(supabase: SupabaseClient): Promise<TalentSettings> {
  const { data } = await supabase
    .from("talent_match_settings")
    .select("weights, rules, role_templates, skill_categories")
    .maybeSingle();
  return normalizeTalentSettings(data as Raw);
}

export async function currentOrganizationId(supabase: SupabaseClient, userId: string): Promise<string> {
  const { data } = await supabase.from("users").select("organization_id").eq("id", userId).maybeSingle();
  const orgId = (data as { organization_id: string | null } | null)?.organization_id;
  if (!orgId) throw new Error("No organization found for the current user");
  return orgId;
}