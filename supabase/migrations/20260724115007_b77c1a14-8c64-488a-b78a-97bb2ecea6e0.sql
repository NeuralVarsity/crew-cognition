
CREATE OR REPLACE FUNCTION public.create_organization_and_join(
  _name TEXT,
  _industry TEXT DEFAULT NULL,
  _country TEXT DEFAULT NULL,
  _timezone TEXT DEFAULT 'UTC',
  _currency TEXT DEFAULT 'USD'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _existing UUID;
  _org_id UUID;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT organization_id INTO _existing FROM public.users WHERE id = _uid;
  IF _existing IS NOT NULL THEN
    RAISE EXCEPTION 'User already belongs to an organization';
  END IF;

  INSERT INTO public.organizations (name, industry, country, timezone, currency, status)
  VALUES (_name, _industry, _country, _timezone, _currency, 'active')
  RETURNING id INTO _org_id;

  UPDATE public.users SET organization_id = _org_id WHERE id = _uid;

  INSERT INTO public.user_roles (user_id, organization_id, role)
  VALUES (_uid, _org_id, 'org_admin');

  INSERT INTO public.organization_settings (organization_id) VALUES (_org_id)
  ON CONFLICT (organization_id) DO NOTHING;

  RETURN _org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_organization_and_join(TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_organization_and_join(TEXT,TEXT,TEXT,TEXT,TEXT) TO authenticated;
