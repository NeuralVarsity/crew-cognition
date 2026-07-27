
CREATE POLICY "Org members can read import files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'imports' AND (storage.foldername(name))[1] = public.current_org_id()::text);

CREATE POLICY "Managers can upload import files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'imports' AND (storage.foldername(name))[1] = public.current_org_id()::text AND public.can_manage_workforce(auth.uid()));

CREATE POLICY "Managers can update import files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'imports' AND (storage.foldername(name))[1] = public.current_org_id()::text AND public.can_manage_workforce(auth.uid()));

CREATE POLICY "Managers can delete import files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'imports' AND (storage.foldername(name))[1] = public.current_org_id()::text AND public.can_manage_workforce(auth.uid()));
