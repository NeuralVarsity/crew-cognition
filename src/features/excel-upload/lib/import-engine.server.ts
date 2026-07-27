import type { SupabaseClient } from "@supabase/supabase-js";
import { DATASETS, type DatasetKey, type ImportMode } from "../types";
import { parseDateValue, parseNumberValue } from "./validation";

type Client = SupabaseClient<any, "public", any>;

export type BatchResult = {
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
  duplicates: number;
  errors: { row_number: number; column_name: string | null; error_type: string; message: string; raw_row: unknown }[];
};

const empty = (): BatchResult => ({ inserted: 0, updated: 0, skipped: 0, failed: 0, duplicates: 0, errors: [] });
const str = (v: unknown) => {
  const s = String(v ?? "").trim();
  return s ? s : null;
};
const lower = (v: unknown) => str(v)?.toLowerCase() ?? null;

const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "intern", "consultant"];
const EMPLOYEE_STATUS = ["active", "on_leave", "terminated", "probation"];
const PROJECT_STATUS = ["planning", "active", "on_hold", "completed", "archived"];
const SKILL_CATEGORIES = ["programming", "cloud", "database", "ai", "leadership", "soft_skills", "other"];

function enumValue(value: unknown, allowed: string[], fallback: string) {
  const raw = lower(value)?.replace(/[\s-]+/g, "_");
  return raw && allowed.includes(raw) ? raw : fallback;
}

async function lookupMap(client: Client, table: "departments" | "teams", orgId: string) {
  const { data } = await client.from(table).select("id, name").eq("organization_id", orgId).is("deleted_at", null);
  const map = new Map<string, string>();
  for (const row of (data ?? []) as { id: string; name: string }[]) map.set(row.name.trim().toLowerCase(), row.id);
  return map;
}

export async function processBatch(params: {
  client: Client;
  orgId: string;
  importId: string;
  dataset: DatasetKey;
  mode: ImportMode;
  rows: Record<string, unknown>[];
  startRow: number;
}): Promise<BatchResult> {
  const { client, orgId, dataset, mode, rows, startRow } = params;
  const def = DATASETS[dataset];
  const result = empty();
  const dryRun = mode === "dry_run";

  const rowNo = (i: number) => startRow + i + 2;
  const fail = (i: number, message: string, row: Record<string, unknown>, type = "import_error") =>
    result.errors.push({ row_number: rowNo(i), column_name: null, error_type: type, message, raw_row: row });

  if (def.target === "staging") {
    const payloads = rows.map((row, i) => ({
      organization_id: orgId,
      import_id: params.importId,
      dataset,
      row_number: rowNo(i),
      external_key: def.keyFields.length
        ? def.keyFields.map((k) => lower(row[k]) ?? "").filter(Boolean).join("|") || null
        : null,
      payload: row as Record<string, unknown>,
    }));
    if (dryRun) {
      result.inserted = payloads.length;
      return result;
    }
    const { error } = await client
      .from("data_import_records")
      .upsert(payloads, { onConflict: "organization_id,dataset,external_key", ignoreDuplicates: mode === "skip_duplicates" });
    if (error) {
      rows.forEach((row, i) => fail(i, error.message, row));
      result.failed = rows.length;
    } else {
      result.inserted = payloads.length;
    }
    return result;
  }

  if (dataset === "employees") {
    const [departments, teams] = await Promise.all([
      lookupMap(client, "departments", orgId),
      lookupMap(client, "teams", orgId),
    ]);
    const emails = rows.map((r) => lower(r.email)).filter(Boolean) as string[];
    const { data: existingRows } = await client
      .from("employees")
      .select("id, email, employee_code")
      .eq("organization_id", orgId)
      .in("email", emails.length ? emails : ["__none__"]);
    const existing = new Map<string, { id: string }>();
    for (const row of (existingRows ?? []) as { id: string; email: string }[]) {
      existing.set(row.email.trim().toLowerCase(), { id: row.id });
    }
    const { count } = await client
      .from("employees")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId);
    let sequence = (count ?? 0) + 1;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const email = lower(row.email);
      if (!email) {
        fail(i, "Email is required.", row, "missing_required");
        result.failed++;
        continue;
      }
      const match = existing.get(email);
      if (match && (mode === "insert" )) {
        result.duplicates++;
        fail(i, `An employee with email ${email} already exists.`, row, "duplicate_email");
        result.failed++;
        continue;
      }
      if (match && mode === "skip_duplicates") {
        result.duplicates++;
        result.skipped++;
        continue;
      }
      if (!match && mode === "update") {
        result.skipped++;
        continue;
      }

      const firstName = str(row.first_name);
      const lastName = str(row.last_name);
      const fullName =
        str(row.full_name) ?? ([firstName, lastName].filter(Boolean).join(" ") || email.split("@")[0]);
      const departmentId = row.department ? departments.get(lower(row.department)!) ?? null : null;
      const teamId = row.team ? teams.get(lower(row.team)!) ?? null : null;

      const payload: Record<string, unknown> = {
        organization_id: orgId,
        email,
        full_name: fullName,
        first_name: firstName,
        last_name: lastName,
        phone: str(row.phone),
        designation: str(row.designation),
        department_id: departmentId,
        team_id: teamId,
        location: str(row.location),
        work_location: str(row.location),
        notes: str(row.notes),
        joining_date: parseDateValue(row.joining_date),
        dob: parseDateValue(row.dob),
        salary: parseNumberValue(row.salary),
        employment_type: enumValue(row.employment_type, EMPLOYMENT_TYPES, "full_time"),
        status: enumValue(row.status, EMPLOYEE_STATUS, "active"),
      };
      for (const key of Object.keys(payload)) if (payload[key] === null && match && mode !== "replace") delete payload[key];

      if (dryRun) {
        if (match) result.updated++;
        else result.inserted++;
        continue;
      }

      if (match) {
        const { error } = await client.from("employees").update(payload).eq("id", match.id);
        if (error) {
          fail(i, error.message, row);
          result.failed++;
        } else result.updated++;
      } else {
        payload.employee_code = str(row.employee_code) ?? `EMP-${String(sequence++).padStart(4, "0")}`;
        const { error } = await client.from("employees").insert(payload);
        if (error) {
          fail(i, error.message, row);
          result.failed++;
        } else result.inserted++;
      }
    }
    return result;
  }

  if (dataset === "departments" || dataset === "teams" || dataset === "projects" || dataset === "skills") {
    const table = dataset;
    const names = rows.map((r) => lower(r.name)).filter(Boolean) as string[];
    const { data: existingRows } = await client
      .from(table)
      .select("id, name")
      .eq("organization_id", orgId)
      .in("name", rows.map((r) => str(r.name) ?? "").filter(Boolean));
    const existing = new Map<string, string>();
    for (const row of (existingRows ?? []) as { id: string; name: string }[]) {
      existing.set(row.name.trim().toLowerCase(), row.id);
    }
    void names;
    const departments = dataset === "teams" ? await lookupMap(client, "departments", orgId) : null;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = str(row.name);
      if (!name) {
        fail(i, "Name is required.", row, "missing_required");
        result.failed++;
        continue;
      }
      const matchId = existing.get(name.toLowerCase());
      if (matchId && mode === "insert") {
        result.duplicates++;
        fail(i, `${name} already exists.`, row, "duplicate_record");
        result.failed++;
        continue;
      }
      if (matchId && mode === "skip_duplicates") {
        result.duplicates++;
        result.skipped++;
        continue;
      }
      if (!matchId && mode === "update") {
        result.skipped++;
        continue;
      }

      let payload: Record<string, unknown> = { organization_id: orgId, name };
      if (dataset === "departments") {
        payload = {
          ...payload,
          department_code: str(row.department_code),
          description: str(row.description),
          email: str(row.email),
          phone: str(row.phone),
          location: str(row.location),
          budget: parseNumberValue(row.budget),
          status: lower(row.status) === "inactive" ? "inactive" : "active",
        };
      } else if (dataset === "teams") {
        const deptId = row.department ? departments?.get(lower(row.department)!) ?? null : null;
        if (!deptId) {
          fail(i, `Department "${str(row.department) ?? ""}" was not found.`, row, "missing_department");
          result.failed++;
          continue;
        }
        payload = { ...payload, department_id: deptId, description: str(row.description) };
      } else if (dataset === "projects") {
        const deptMap = await lookupMap(client, "departments", orgId);
        payload = {
          ...payload,
          description: str(row.description),
          department_id: row.department ? deptMap.get(lower(row.department)!) ?? null : null,
          status: enumValue(row.status, PROJECT_STATUS, "planning"),
          start_date: parseDateValue(row.start_date),
          end_date: parseDateValue(row.end_date),
        };
      } else {
        payload = { ...payload, category: enumValue(row.category, SKILL_CATEGORIES, "other") };
      }
      for (const key of Object.keys(payload)) if (payload[key] === null && matchId && mode !== "replace") delete payload[key];

      if (dryRun) {
        if (matchId) result.updated++;
        else result.inserted++;
        continue;
      }
      if (matchId) {
        const { error } = await client.from(table).update(payload).eq("id", matchId);
        if (error) {
          fail(i, error.message, row);
          result.failed++;
        } else result.updated++;
      } else {
        const { error } = await client.from(table).insert(payload);
        if (error) {
          fail(i, error.message, row);
          result.failed++;
        } else result.inserted++;
      }
    }
    return result;
  }

  return result;
}