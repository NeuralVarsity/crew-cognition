import type { SupabaseClient } from "@supabase/supabase-js";
import type { DatasetKey, ImportMode } from "../types";
import { processBatch } from "./import-engine.server";

type Client = SupabaseClient<any, "public", any>;

const IMPORT_FIELDS =
  "id, organization_id, created_by, created_by_name, file_name, file_size, file_type, file_path, dataset, sheet_name, mode, status, total_rows, imported_rows, updated_rows, skipped_rows, failed_rows, duplicate_rows, error_count, warning_count, duration_ms, error_message, column_mapping, created_at, finished_at";

async function requireManager(client: Client, userId: string) {
  const { data } = await client.rpc("can_manage_workforce", { _user_id: userId });
  if (data !== true) throw new Error("You do not have permission to import data");
}

async function profile(client: Client, userId: string) {
  const { data } = await client.from("users").select("organization_id, full_name, email").eq("id", userId).maybeSingle();
  if (!data?.organization_id) throw new Error("No organization found for this user");
  return data as { organization_id: string; full_name: string | null; email: string };
}

async function loadContext(client: Client, userId: string) {
  const [{ data: departments }, { data: teams }, { data: employees }, { data: github }, { data: jira }, { data: clickup }] =
    await Promise.all([
      client.from("departments").select("name").is("deleted_at", null),
      client.from("teams").select("name").is("deleted_at", null),
      client.from("employees").select("email, employee_code").is("deleted_at", null).limit(20000),
      client.from("github_contributors").select("login").limit(5000),
      client.from("jira_accounts").select("display_name, email").limit(5000),
      client.from("clickup_members").select("username, email").limit(5000),
    ]);
  const { data: canManage } = await client.rpc("can_manage_workforce", { _user_id: userId });
  return {
    canManage: canManage === true,
    departments: (departments ?? []).map((d: { name: string }) => d.name),
    teams: (teams ?? []).map((t: { name: string }) => t.name),
    emails: (employees ?? []).map((e: { email: string }) => e.email),
    employeeCodes: (employees ?? []).map((e: { employee_code: string }) => e.employee_code),
    githubUsers: (github ?? []).map((g: { login: string }) => g.login),
    jiraUsers: (jira ?? []).flatMap((j: { display_name: string | null; email: string | null }) =>
      [j.display_name, j.email].filter(Boolean) as string[],
    ),
    clickupUsers: (clickup ?? []).flatMap((c: { username: string | null; email: string | null }) =>
      [c.username, c.email].filter(Boolean) as string[],
    ),
  };
}

async function createJob(
  client: Client,
  userId: string,
  input: {
    fileName: string;
    fileSize: number;
    fileType?: string | null;
    filePath?: string | null;
    dataset: DatasetKey;
    sheetName?: string | null;
    sheetNames: string[];
    mode: ImportMode;
    columnMapping: Record<string, string>;
    detectedColumns: Record<string, unknown>[];
    options: Record<string, unknown>;
    totalRows: number;
    errorCount: number;
    warningCount: number;
    duplicateRows: number;
  },
) {
  await requireManager(client, userId);
  const me = await profile(client, userId);
  const { data, error } = await client
    .from("data_imports")
    .insert({
      organization_id: me.organization_id,
      created_by: userId,
      created_by_name: me.full_name ?? me.email,
      file_name: input.fileName,
      file_size: input.fileSize,
      file_type: input.fileType ?? null,
      file_path: input.filePath ?? null,
      dataset: input.dataset,
      sheet_name: input.sheetName ?? null,
      sheet_names: input.sheetNames,
      mode: input.mode,
      status: "importing",
      column_mapping: input.columnMapping,
      detected_columns: input.detectedColumns,
      options: input.options,
      total_rows: input.totalRows,
      error_count: input.errorCount,
      warning_count: input.warningCount,
      duplicate_rows: input.duplicateRows,
      started_at: new Date().toISOString(),
    })
    .select(IMPORT_FIELDS)
    .single();
  if (error) throw new Error(error.message);
  await client.from("audit_logs").insert({
    organization_id: me.organization_id,
    actor_id: userId,
    action: "data_import.upload",
    entity_type: "data_import",
    entity_id: data.id,
    after_state: { file_name: input.fileName, dataset: input.dataset, mode: input.mode, rows: input.totalRows },
  });
  return data;
}

async function runBatch(
  client: Client,
  userId: string,
  input: { importId: string; dataset: DatasetKey; mode: ImportMode; startRow: number; rows: Record<string, unknown>[] },
) {
  await requireManager(client, userId);
  const me = await profile(client, userId);
  const result = await processBatch({
    client,
    orgId: me.organization_id,
    importId: input.importId,
    dataset: input.dataset,
    mode: input.mode,
    rows: input.rows,
    startRow: input.startRow,
  });

  if (result.errors.length) {
    await client.from("data_import_errors").insert(
      result.errors.slice(0, 500).map((e) => ({
        organization_id: me.organization_id,
        import_id: input.importId,
        row_number: e.row_number,
        column_name: e.column_name,
        error_type: e.error_type,
        severity: "error" as const,
        message: e.message,
        raw_row: e.raw_row as Record<string, unknown>,
      })),
    );
  }

  const { data: current } = await client
    .from("data_imports")
    .select("imported_rows, updated_rows, skipped_rows, failed_rows, duplicate_rows")
    .eq("id", input.importId)
    .single();

  await client
    .from("data_imports")
    .update({
      imported_rows: (current?.imported_rows ?? 0) + result.inserted,
      updated_rows: (current?.updated_rows ?? 0) + result.updated,
      skipped_rows: (current?.skipped_rows ?? 0) + result.skipped,
      failed_rows: (current?.failed_rows ?? 0) + result.failed,
      duplicate_rows: (current?.duplicate_rows ?? 0) + result.duplicates,
    })
    .eq("id", input.importId);

  return {
    inserted: result.inserted,
    updated: result.updated,
    skipped: result.skipped,
    failed: result.failed,
    duplicates: result.duplicates,
    errors: result.errors.map((e) => ({ row: e.row_number, message: e.message })),
  };
}

async function finalize(
  client: Client,
  userId: string,
  input: { importId: string; status: string; durationMs: number; errorMessage?: string | null },
) {
  await requireManager(client, userId);
  const me = await profile(client, userId);
  const { data, error } = await client
    .from("data_imports")
    .update({
      status: input.status,
      duration_ms: input.durationMs,
      error_message: input.errorMessage ?? null,
      finished_at: new Date().toISOString(),
    })
    .eq("id", input.importId)
    .select(IMPORT_FIELDS)
    .single();
  if (error) throw new Error(error.message);
  await client.from("audit_logs").insert({
    organization_id: me.organization_id,
    actor_id: userId,
    action: "data_import.complete",
    entity_type: "data_import",
    entity_id: input.importId,
    after_state: { status: input.status, duration_ms: input.durationMs },
  });
  return data;
}

async function saveIssues(
  client: Client,
  userId: string,
  input: {
    importId: string;
    issues: { row: number; column?: string | null; type: string; severity: "error" | "warning"; message: string }[];
  },
) {
  await requireManager(client, userId);
  const me = await profile(client, userId);
  if (!input.issues.length) return { ok: true };
  const { error } = await client.from("data_import_errors").insert(
    input.issues.map((i) => ({
      organization_id: me.organization_id,
      import_id: input.importId,
      row_number: i.row,
      column_name: i.column ?? null,
      error_type: i.type,
      severity: i.severity,
      message: i.message,
    })),
  );
  if (error) throw new Error(error.message);
  return { ok: true };
}

async function listJobs(client: Client) {
  const { data, error } = await client
    .from("data_imports")
    .select(IMPORT_FIELDS)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function listIssues(client: Client, importId: string) {
  const { data, error } = await client
    .from("data_import_errors")
    .select("id, row_number, column_name, error_type, severity, message, raw_row, created_at")
    .eq("import_id", importId)
    .order("row_number")
    .limit(5000);
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function deleteJob(client: Client, userId: string, importId: string) {
  await requireManager(client, userId);
  const me = await profile(client, userId);
  const { data: job } = await client.from("data_imports").select("file_path").eq("id", importId).maybeSingle();
  if (job?.file_path) await client.storage.from("imports").remove([job.file_path]);
  const { error } = await client.from("data_imports").delete().eq("id", importId);
  if (error) throw new Error(error.message);
  await client.from("audit_logs").insert({
    organization_id: me.organization_id,
    actor_id: userId,
    action: "data_import.delete",
    entity_type: "data_import",
    entity_id: importId,
  });
  return { ok: true };
}

async function signFile(client: Client, path: string) {
  const { data, error } = await client.storage.from("imports").createSignedUrl(path, 300);
  if (error) throw new Error(error.message);
  return { url: data.signedUrl };
}

export const helpers = {
  loadContext,
  createJob,
  runBatch,
  finalize,
  saveIssues,
  listJobs,
  listIssues,
  deleteJob,
  signFile,
};