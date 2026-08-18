ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS seniority_level text,
  ADD COLUMN IF NOT EXISTS salary_band text,
  ADD COLUMN IF NOT EXISTS experience_years numeric(4,1);

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS budget numeric(14,2),
  ADD COLUMN IF NOT EXISTS complexity text,
  ADD COLUMN IF NOT EXISTS duration_weeks integer,
  ADD COLUMN IF NOT EXISTS tech_stack jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS delivery_status text;