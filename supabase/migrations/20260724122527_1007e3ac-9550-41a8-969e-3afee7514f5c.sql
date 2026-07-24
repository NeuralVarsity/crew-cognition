
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS dob date,
  ADD COLUMN IF NOT EXISTS work_location text,
  ADD COLUMN IF NOT EXISTS office_location text,
  ADD COLUMN IF NOT EXISTS salary numeric(14,2),
  ADD COLUMN IF NOT EXISTS notes text;

CREATE INDEX IF NOT EXISTS idx_emp_code ON public.employees (employee_code);
CREATE INDEX IF NOT EXISTS idx_emp_manager ON public.employees (manager_id);

-- Storage policies for avatars bucket (private) — authenticated users in same org
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='avatars_org_read') THEN
    CREATE POLICY "avatars_org_read" ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = public.current_org_id()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='avatars_org_write') THEN
    CREATE POLICY "avatars_org_write" ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = public.current_org_id()::text AND public.can_manage_workforce(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='avatars_org_update') THEN
    CREATE POLICY "avatars_org_update" ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = public.current_org_id()::text AND public.can_manage_workforce(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='avatars_org_delete') THEN
    CREATE POLICY "avatars_org_delete" ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = public.current_org_id()::text AND public.can_manage_workforce(auth.uid()));
  END IF;
END $$;
