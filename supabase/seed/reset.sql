-- Full reset: clear the organization, then reseed.
--
--   1. Run clear-demo-data.sql (set :org_id first), or
--   2. bun run reset-db     -- clears every seeded table for the organization
--   3. bun run seed         -- regenerates the full dataset
--
-- The Administration page's "Seed demo data" button performs both steps in
-- one action and is the recommended path on Lovable Cloud.

\i clear-demo-data.sql

SELECT 'Organization cleared. Run "bun run seed" to regenerate demo data.' AS next_step;