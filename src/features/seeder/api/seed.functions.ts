import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireAdminOrg(context: { supabase: any; userId: string }) {
  const { data: isAdmin, error } = await context.supabase.rpc("is_org_admin", { _user_id: context.userId });
  if (error) throw new Error(error.message);
  if (!isAdmin) throw new Error("Forbidden: organization admin role required");
  const { data: profile } = await context.supabase
    .from("users")
    .select("organization_id")
    .eq("id", context.userId)
    .maybeSingle();
  const organizationId = profile?.organization_id as string | undefined;
  if (!organizationId) throw new Error("No organization found for the current user");
  return organizationId;
}

export const seedDemoData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { reset?: boolean; seed?: number; fromBatch?: number; maxRows?: number } | undefined) => input ?? {},
  )
  .handler(async ({ data, context }) => {
    const organizationId = await requireAdminOrg(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { seedOrganization } = await import("../lib/seed-engine.server");
    return seedOrganization(supabaseAdmin as never, organizationId, {
      reset: data.reset ?? true,
      seed: data.seed,
      fromBatch: data.fromBatch ?? 0,
      maxRows: data.maxRows ?? 12000,
    });
  });

export const clearDemoData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const organizationId = await requireAdminOrg(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { clearOrganizationData } = await import("../lib/seed-engine.server");
    const removed = await clearOrganizationData(supabaseAdmin as never, organizationId);
    return { removed, totalRows: Object.values(removed).reduce((a, b) => a + b, 0) };
  });