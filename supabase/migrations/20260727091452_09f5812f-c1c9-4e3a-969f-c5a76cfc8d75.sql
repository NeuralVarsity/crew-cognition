
CREATE TYPE public.data_import_status AS ENUM ('pending','uploading','validating','ready','importing','completed','partial','failed','cancelled','dry_run');
CREATE TYPE public.data_import_mode AS ENUM ('insert','update','upsert','skip_duplicates','replace','dry_run');
CREATE TYPE public.data_import_dataset AS ENUM ('employees','departments','teams','projects','skills','attendance','leaves','payroll','performance_reviews','training_records','assets','github','jira','clickup','custom');
CREATE TYPE public.data_import_severity AS ENUM ('error','warning');

CREATE TABLE public.data_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name text,
  file_name text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  file_type text,
  file_path text,
  dataset public.data_import_dataset NOT NULL DEFAULT 'custom',
  sheet_name text,
  sheet_names jsonb NOT NULL DEFAULT '[]'::jsonb,
  mode public.data_import_mode NOT NULL DEFAULT 'insert',
  status public.data_import_status NOT NULL DEFAULT 'pending',
  column_mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  options jsonb NOT NULL DEFAULT '{}'::jsonb,
  detected_columns jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_rows integer NOT NULL DEFAULT 0,
  imported_rows integer NOT NULL DEFAULT 0,
  updated_rows integer NOT NULL DEFAULT 0,
  skipped_rows integer NOT NULL DEFAULT 0,
  failed_rows integer NOT NULL DEFAULT 0,
  duplicate_rows integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  warning_count integer NOT NULL DEFAULT 0,
  duration_ms integer,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_data_imports_org_created ON public.data_imports (organization_id, created_at DESC);
CREATE INDEX idx_data_imports_status ON public.data_imports (organization_id, status);
CREATE INDEX idx_data_imports_dataset ON public.data_imports (organization_id, dataset);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_imports TO authenticated;
GRANT ALL ON public.data_imports TO service_role;
ALTER TABLE public.data_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view imports" ON public.data_imports
  FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "Managers can manage imports" ON public.data_imports
  FOR ALL TO authenticated
  USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()))
  WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));

CREATE TRIGGER trg_data_imports_updated_at BEFORE UPDATE ON public.data_imports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.data_import_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  import_id uuid NOT NULL REFERENCES public.data_imports(id) ON DELETE CASCADE,
  row_number integer NOT NULL DEFAULT 0,
  column_name text,
  error_type text NOT NULL,
  severity public.data_import_severity NOT NULL DEFAULT 'error',
  message text NOT NULL,
  raw_row jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_data_import_errors_import ON public.data_import_errors (import_id, row_number);
CREATE INDEX idx_data_import_errors_org ON public.data_import_errors (organization_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_import_errors TO authenticated;
GRANT ALL ON public.data_import_errors TO service_role;
ALTER TABLE public.data_import_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view import errors" ON public.data_import_errors
  FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "Managers can manage import errors" ON public.data_import_errors
  FOR ALL TO authenticated
  USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()))
  WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));

CREATE TABLE public.data_import_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  import_id uuid NOT NULL REFERENCES public.data_imports(id) ON DELETE CASCADE,
  dataset public.data_import_dataset NOT NULL,
  row_number integer NOT NULL DEFAULT 0,
  external_key text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_data_import_records_import ON public.data_import_records (import_id, row_number);
CREATE INDEX idx_data_import_records_dataset ON public.data_import_records (organization_id, dataset);
CREATE UNIQUE INDEX uq_data_import_records_key ON public.data_import_records (organization_id, dataset, external_key) WHERE external_key IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_import_records TO authenticated;
GRANT ALL ON public.data_import_records TO service_role;
ALTER TABLE public.data_import_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view import records" ON public.data_import_records
  FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "Managers can manage import records" ON public.data_import_records
  FOR ALL TO authenticated
  USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()))
  WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));
