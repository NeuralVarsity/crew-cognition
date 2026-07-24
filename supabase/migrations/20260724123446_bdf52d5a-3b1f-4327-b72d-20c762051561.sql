
-- Extend departments with enterprise fields
ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS department_code text,
  ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS budget numeric,
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS icon text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.users(id) ON DELETE SET NULL;

-- Backfill nulls
UPDATE public.departments SET status = 'active' WHERE status IS NULL;

-- Uniqueness: department_code unique per org (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS departments_org_code_unique
  ON public.departments (organization_id, lower(department_code))
  WHERE department_code IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS departments_manager_idx ON public.departments (manager_id);
CREATE INDEX IF NOT EXISTS departments_status_idx ON public.departments (status);
CREATE INDEX IF NOT EXISTS departments_org_idx ON public.departments (organization_id);
