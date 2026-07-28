import type { SupabaseClient } from "@supabase/supabase-js";
import { buildTalentPool } from "./pool.server";
import { matchCandidates } from "./match.server";
import { extractRequirement } from "./requirements.server";
import { currentOrganizationId, loadTalentSettings } from "./settings.server";
import type { MatchResult, RecommendationRecord, TalentSettings, TalentThread } from "../types";

export type TalentContext = {
  canManage: boolean;
  isAdmin: boolean;
  selfEmployeeId: string | null;
  settings: TalentSettings;
  departments: { id: string; name: string }[];
  teams: { id: string; name: string }[];
  employees: { id: string; name: string; designation: string | null; department: string | null; photo: string | null }[];
};

async function permissions(supabase: SupabaseClient, userId: string) {
  const [{ data: canManage }, { data: isAdmin }] = await Promise.all([
    supabase.rpc("can_manage_workforce", { _user_id: userId }),
    supabase.rpc("is_org_admin", { _user_id: userId }),
  ]);
  return { canManage: canManage === true, isAdmin: isAdmin === true };
}

export async function loadTalentContext(supabase: SupabaseClient, userId: string): Promise<TalentContext> {
  const [{ canManage, isAdmin }, settings, departmentsRes, teamsRes, employeesRes, selfRes] = await Promise.all([
    permissions(supabase, userId),
    loadTalentSettings(supabase),
    supabase.from("departments").select("id, name").is("deleted_at", null).order("name"),
    supabase.from("teams").select("id, name").is("deleted_at", null).order("name"),
    supabase
      .from("employees")
      .select("id, full_name, designation, profile_photo, departments(name)")
      .is("deleted_at", null)
      .order("full_name")
      .limit(5000),
    supabase.from("employees").select("id").eq("user_id", userId).maybeSingle(),
  ]);

  return {
    canManage,
    isAdmin,
    selfEmployeeId: (selfRes.data as { id: string } | null)?.id ?? null,
    settings,
    departments: (departmentsRes.data ?? []) as { id: string; name: string }[],
    teams: (teamsRes.data ?? []) as { id: string; name: string }[],
    employees: ((employeesRes.data ?? []) as Record<string, unknown>[]).map((row) => {
      const dept = row.departments as { name: string } | { name: string }[] | null;
      return {
        id: String(row.id),
        name: String(row.full_name ?? ""),
        designation: (row.designation as string | null) ?? null,
        department: (Array.isArray(dept) ? dept[0]?.name : dept?.name) ?? null,
        photo: (row.profile_photo as string | null) ?? null,
      };
    }),
  };
}

export type RunMatchInput = {
  query: string;
  sourceName?: string | null;
  kind?: string;
  topN?: number;
  departmentId?: string | null;
  teamId?: string | null;
  employeeIds?: string[];
  persist?: boolean;
};

export async function runMatch(
  supabase: SupabaseClient,
  userId: string,
  input: RunMatchInput,
): Promise<MatchResult> {
  const { canManage } = await permissions(supabase, userId);
  if (!canManage) throw new Error("You do not have permission to run talent matching");

  const [settings, pool] = await Promise.all([
    loadTalentSettings(supabase),
    buildTalentPool(supabase, { userId, canManage: true }),
  ]);

  const requirement = await extractRequirement(input.query, input.sourceName ? "document" : "query", {
    departments: pool.departments.map((d) => d.name),
    teams: pool.teams.map((t) => t.name),
  });

  const result = matchCandidates(pool, requirement, settings, {
    employeeIds: input.employeeIds,
    topN: input.topN,
    departmentId: input.departmentId ?? null,
    teamId: input.teamId ?? null,
  });
  result.query = input.query;
  result.sourceName = input.sourceName ?? null;

  if (input.persist !== false) {
    const organizationId = await currentOrganizationId(supabase, userId);
    const { data: profile } = await supabase.from("users").select("full_name").eq("id", userId).maybeSingle();
    const { error } = await supabase.from("talent_recommendations").insert({
      organization_id: organizationId,
      user_id: userId,
      user_name: (profile as { full_name: string | null } | null)?.full_name ?? null,
      kind: input.kind ?? "role",
      query: input.query.slice(0, 4000),
      source_name: input.sourceName ?? null,
      requirements: requirement,
      results: result.candidates,
      summary: {
        executiveSummary: result.executiveSummary,
        skillGaps: result.skillGaps,
        prediction: result.prediction,
        team: result.team,
      },
      candidate_count: result.candidates.length,
      top_score: result.candidates[0]?.overall ?? null,
    });
    if (error) console.error("[talent] failed to persist recommendation", error.message);
  }

  return result;
}

export async function persistSettings(
  supabase: SupabaseClient,
  userId: string,
  data: { weights: Record<string, number>; rules: TalentSettings["rules"]; roleTemplates: TalentSettings["roleTemplates"] },
) {
  const { isAdmin } = await permissions(supabase, userId);
  if (!isAdmin) throw new Error("Only administrators can change matching configuration");
  const organizationId = await currentOrganizationId(supabase, userId);
  const { error } = await supabase.from("talent_match_settings").upsert(
    {
      organization_id: organizationId,
      weights: data.weights,
      rules: data.rules,
      role_templates: data.roleTemplates,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id" },
  );
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function listRecommendations(supabase: SupabaseClient): Promise<RecommendationRecord[]> {
  const { data, error } = await supabase
    .from("talent_recommendations")
    .select("id, kind, query, source_name, requirements, results, summary, candidate_count, top_score, user_name, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    kind: String(row.kind ?? "role"),
    query: String(row.query ?? ""),
    sourceName: (row.source_name as string | null) ?? null,
    requirements: row.requirements as RecommendationRecord["requirements"],
    results: (row.results ?? []) as RecommendationRecord["results"],
    summary: (row.summary ?? {}) as Record<string, unknown>,
    candidateCount: Number(row.candidate_count ?? 0),
    topScore: row.top_score == null ? null : Number(row.top_score),
    userName: (row.user_name as string | null) ?? null,
    createdAt: String(row.created_at),
  }));
}

export async function listThreads(supabase: SupabaseClient): Promise<TalentThread[]> {
  const { data, error } = await supabase
    .from("talent_threads")
    .select("id, title, created_at, updated_at")
    .eq("archived", false)
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    title: String(row.title ?? "New conversation"),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));
}

export async function createThread(supabase: SupabaseClient, userId: string, title?: string): Promise<TalentThread> {
  const organizationId = await currentOrganizationId(supabase, userId);
  const { data, error } = await supabase
    .from("talent_threads")
    .insert({ organization_id: organizationId, user_id: userId, title: title?.slice(0, 120) || "New conversation" })
    .select("id, title, created_at, updated_at")
    .single();
  if (error) throw new Error(error.message);
  const row = data as Record<string, unknown>;
  return {
    id: String(row.id),
    title: String(row.title),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function loadThreadMessages(supabase: SupabaseClient, threadId: string) {
  const { data, error } = await supabase
    .from("talent_messages")
    .select("id, role, parts, client_message_id, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.client_message_id ?? row.id),
    role: (row.role === "user" ? "user" : "assistant") as "user" | "assistant",
    parts: Array.isArray(row.parts) ? (row.parts as unknown[]) : [],
  }));
}