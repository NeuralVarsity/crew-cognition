import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getAiIntelligence = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: canManage } = await context.supabase.rpc("can_manage_workforce", {
      _user_id: context.userId,
    });
    const { computeAiIntelligence } = await import("../lib/engine.server");
    return computeAiIntelligence(context.supabase, {
      userId: context.userId,
      canManage: canManage === true,
    });
  });

const settingsSchema = z.object({
  weights: z.record(z.string(), z.number().min(0).max(100)),
  thresholds: z.record(z.string(), z.number()),
  rules: z.object({
    lookbackDays: z.number().min(7).max(365),
    minActivityForRanking: z.number().min(0).max(100),
    includeInactiveEmployees: z.boolean(),
  }),
});

export const saveAiSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => settingsSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_org_admin", { _user_id: context.userId });
    if (isAdmin !== true) throw new Error("Only administrators can change AI scoring settings");

    const { data: profile } = await context.supabase
      .from("users")
      .select("organization_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (!profile?.organization_id) throw new Error("No organization");

    const { error } = await context.supabase.from("ai_scoring_settings").upsert(
      {
        organization_id: profile.organization_id,
        weights: data.weights,
        thresholds: data.thresholds,
        rules: data.rules,
        updated_by: context.userId,
      },
      { onConflict: "organization_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });