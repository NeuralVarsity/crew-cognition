import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const datasetEnum = z.enum([
  "employees",
  "departments",
  "teams",
  "projects",
  "skills",
  "attendance",
  "leaves",
  "payroll",
  "performance_reviews",
  "training_records",
  "assets",
  "github",
  "jira",
  "clickup",
  "custom",
]);

const modeEnum = z.enum(["insert", "update", "upsert", "skip_duplicates", "replace", "dry_run"]);

const statusEnum = z.enum([
  "pending",
  "uploading",
  "validating",
  "ready",
  "importing",
  "completed",
  "partial",
  "failed",
  "cancelled",
  "dry_run",
]);

export const getImportContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { helpers } = await import("../lib/server-helpers.server");
    return helpers.loadContext(context.supabase as never, context.userId);
  });

export const createImportJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        fileName: z.string().min(1).max(300),
        fileSize: z.number().int().min(0).max(100 * 1024 * 1024),
        fileType: z.string().max(200).nullish(),
        filePath: z.string().max(500).nullish(),
        dataset: datasetEnum,
        sheetName: z.string().max(200).nullish(),
        sheetNames: z.array(z.string().max(200)).max(100).default([]),
        mode: modeEnum,
        columnMapping: z.record(z.string(), z.string()).default({}),
        detectedColumns: z.array(z.record(z.string(), z.unknown())).max(500).default([]),
        options: z.record(z.string(), z.unknown()).default({}),
        totalRows: z.number().int().min(0),
        errorCount: z.number().int().min(0).default(0),
        warningCount: z.number().int().min(0).default(0),
        duplicateRows: z.number().int().min(0).default(0),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { helpers } = await import("../lib/server-helpers.server");
    return helpers.createJob(context.supabase as never, context.userId, data);
  });

export const runImportBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        importId: z.string().uuid(),
        dataset: datasetEnum,
        mode: modeEnum,
        startRow: z.number().int().min(0),
        rows: z.array(z.record(z.string(), z.unknown())).max(1000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { helpers } = await import("../lib/server-helpers.server");
    return helpers.runBatch(context.supabase as never, context.userId, data);
  });

export const finalizeImportJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        importId: z.string().uuid(),
        status: statusEnum,
        durationMs: z.number().int().min(0),
        errorMessage: z.string().max(2000).nullish(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { helpers } = await import("../lib/server-helpers.server");
    return helpers.finalize(context.supabase as never, context.userId, data);
  });

export const saveValidationIssues = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        importId: z.string().uuid(),
        issues: z
          .array(
            z.object({
              row: z.number().int(),
              column: z.string().nullish(),
              type: z.string().max(80),
              severity: z.enum(["error", "warning"]),
              message: z.string().max(600),
            }),
          )
          .max(2000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { helpers } = await import("../lib/server-helpers.server");
    return helpers.saveIssues(context.supabase as never, context.userId, data);
  });

export const listImportJobs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { helpers } = await import("../lib/server-helpers.server");
    return helpers.listJobs(context.supabase as never);
  });

export const listImportIssues = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ importId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { helpers } = await import("../lib/server-helpers.server");
    return helpers.listIssues(context.supabase as never, data.importId);
  });

export const deleteImportJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ importId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { helpers } = await import("../lib/server-helpers.server");
    return helpers.deleteJob(context.supabase as never, context.userId, data.importId);
  });

export const getImportFileUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ path: z.string().min(1).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    const { helpers } = await import("../lib/server-helpers.server");
    return helpers.signFile(context.supabase as never, data.path);
  });