/**
 * Enterprise demo data seeder.
 *
 *   bun run seed          # wipe + reseed the organization
 *   bun run reset-db      # wipe only
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.
 * Optional: SEED_ORG_ID (defaults to the first organization), SEED_RANDOM_SEED.
 *
 * In Lovable Cloud the service role key is not exposed locally — use the
 * "Seed demo data" button on the Administration page instead.
 */
import { createClient } from "@supabase/supabase-js";
import { clearOrganizationData, seedOrganization } from "../src/features/seeder/lib/seed-engine.server";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const clearOnly = process.argv.includes("--clear");

if (!url || !key) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Use the Administration page instead.");
  process.exit(1);
}

const client = createClient(url, key, { auth: { persistSession: false } });

const orgId =
  process.env.SEED_ORG_ID ??
  (await client.from("organizations").select("id").order("created_at").limit(1).single()).data?.id;

if (!orgId) {
  console.error("No organization found. Create a workspace first.");
  process.exit(1);
}

if (clearOnly) {
  const removed = await clearOrganizationData(client as never, orgId);
  const total = Object.values(removed).reduce((a, b) => a + b, 0);
  console.log(`Cleared ${total} rows from organization ${orgId}`);
} else {
  const result = await seedOrganization(client as never, orgId, {
    reset: true,
    seed: process.env.SEED_RANDOM_SEED ? Number(process.env.SEED_RANDOM_SEED) : undefined,
  });
  console.table(result.inserted);
  console.log(`Seeded ${result.totalRows} rows in ${(result.durationMs / 1000).toFixed(1)}s`);
}