import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const matchSchema = z.object({
  query: z.string().min(2),
  sourceName: z.string().nullable().optional(),
  kind: z.string().optional(),
  topN: z.number().min(1).max(50).optional(),
  departmentId: z.string().nullable().optional(),
  teamId: z.string().nullable().optional(),
  employeeIds: z.array(z.string()).optional(),
  persist: z.boolean().optional(),
});

export const getTalentContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { loadTalentContext } = await import("../lib/service.server");
    return loadTalentContext(context.supabase, context.userId);
  });

export const runTalentMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => matchSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { runMatch } = await import("../lib/service.server");
    return runMatch(context.supabase, context.userId, data);
  });

export const saveTalentSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        weights: z.record(z.string(), z.number().min(0).max(100)),
        rules: z.object({
          minScore: z.number().min(0).max(10),
          topN: z.number().min(1).max(50),
          formula: z.enum(["weighted_average", "skill_first", "balanced"]),
          includeInactive: z.boolean(),
          lookbackDays: z.number().min(7).max(365),
        }),
        roleTemplates: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            primarySkills: z.array(z.string()),
            secondarySkills: z.array(z.string()),
            minYears: z.number().min(0).max(40),
          }),
        ),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { persistSettings } = await import("../lib/service.server");
    return persistSettings(context.supabase, context.userId, data);
  });

export const listTalentRecommendations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { listRecommendations } = await import("../lib/service.server");
    return listRecommendations(context.supabase);
  });

export const deleteTalentRecommendation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("talent_recommendations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listTalentThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { listThreads } = await import("../lib/service.server");
    return listThreads(context.supabase);
  });

export const createTalentThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ title: z.string().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { createThread } = await import("../lib/service.server");
    return createThread(context.supabase, context.userId, data.title);
  });

export const renameTalentThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), title: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("talent_threads")
      .update({ title: data.title, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTalentThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("talent_threads").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getTalentThreadMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ threadId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { loadThreadMessages } = await import("../lib/service.server");
    return loadThreadMessages(context.supabase, data.threadId);
  });