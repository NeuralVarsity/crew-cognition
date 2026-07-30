import type { SupabaseClient } from "@supabase/supabase-js";
import { generateDemoData, SEEDED_TABLES } from "./generator";

type AnyClient = SupabaseClient<any, any, any>;

const CHUNK = 500;

async function insertRows(client: AnyClient, table: string, rows: Record<string, unknown>[]) {
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const { error } = await client.from(table).insert(slice as never);
    if (error) throw new Error(`[seed:${table}] ${error.message}`);
  }
}

/** Removes every demo-owned row for an organization, children first. */
export async function clearOrganizationData(client: AnyClient, organizationId: string) {
  const removed: Record<string, number> = {};

  const { data: employees } = await client.from("employees").select("id").eq("organization_id", organizationId);
  const { data: projects } = await client.from("projects").select("id").eq("organization_id", organizationId);
  const employeeIds = (employees ?? []).map((e: { id: string }) => e.id);
  const projectIds = (projects ?? []).map((p: { id: string }) => p.id);

  for (const table of SEEDED_TABLES) {
    let query = client.from(table).delete({ count: "exact" });
    if (table === "employee_skills") {
      if (!employeeIds.length) continue;
      query = query.in("employee_id", employeeIds);
    } else if (table === "employee_projects") {
      if (!projectIds.length) continue;
      query = query.in("project_id", projectIds);
    } else {
      query = query.eq("organization_id", organizationId);
    }
    const { error, count } = await query;
    if (error) throw new Error(`[clear:${table}] ${error.message}`);
    removed[table] = count ?? 0;
  }
  return removed;
}

/** Wipes the organization and regenerates the full demo dataset. */
export async function seedOrganization(
  client: AnyClient,
  organizationId: string,
  options: { reset?: boolean; seed?: number } = {},
) {
  const startedAt = Date.now();
  if (options.reset !== false) await clearOrganizationData(client, organizationId);

  const batches = generateDemoData(organizationId, options.seed ?? 20260101);
  const inserted: Record<string, number> = {};
  for (const batch of batches) {
    if (!batch.rows.length) continue;
    await insertRows(client, batch.table, batch.rows);
    inserted[batch.table] = (inserted[batch.table] ?? 0) + batch.rows.length;
  }

  return {
    inserted,
    totalRows: Object.values(inserted).reduce((a, b) => a + b, 0),
    durationMs: Date.now() - startedAt,
  };
}