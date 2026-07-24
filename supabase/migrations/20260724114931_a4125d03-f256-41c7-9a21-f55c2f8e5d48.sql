
-- Read: any signed-in user in the org for org-scoped buckets; users read own avatars
CREATE POLICY "storage_read_own_org" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id IN ('avatars','organization-logos','documents')
  AND (
    (storage.foldername(name))[1] = public.current_org_id()::text
    OR (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  )
);

-- Avatars: users manage their own avatar folder (avatars/<user_id>/...)
CREATE POLICY "storage_avatars_write_self" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
);
CREATE POLICY "storage_avatars_update_self" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "storage_avatars_delete_self" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Org logos + documents: admins manage under <org_id>/...
CREATE POLICY "storage_org_write_admin" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id IN ('organization-logos','documents')
  AND (storage.foldername(name))[1] = public.current_org_id()::text
  AND public.is_org_admin(auth.uid())
);
CREATE POLICY "storage_org_update_admin" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id IN ('organization-logos','documents')
  AND (storage.foldername(name))[1] = public.current_org_id()::text
  AND public.is_org_admin(auth.uid())
)
WITH CHECK (
  bucket_id IN ('organization-logos','documents')
  AND (storage.foldername(name))[1] = public.current_org_id()::text
  AND public.is_org_admin(auth.uid())
);
CREATE POLICY "storage_org_delete_admin" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id IN ('organization-logos','documents')
  AND (storage.foldername(name))[1] = public.current_org_id()::text
  AND public.is_org_admin(auth.uid())
);
