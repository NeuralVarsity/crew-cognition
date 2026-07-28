CREATE TABLE public.talent_match_settings (
  organization_id UUID NOT NULL PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  weights JSONB NOT NULL DEFAULT '{}'::jsonb,
  rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  role_templates JSONB NOT NULL DEFAULT '[]'::jsonb,
  skill_categories JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.talent_match_settings TO authenticated;
GRANT ALL ON public.talent_match_settings TO service_role;
ALTER TABLE public.talent_match_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read talent settings" ON public.talent_match_settings FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "admins manage talent settings" ON public.talent_match_settings FOR ALL TO authenticated USING (organization_id = public.current_org_id() AND public.is_org_admin(auth.uid())) WITH CHECK (organization_id = public.current_org_id() AND public.is_org_admin(auth.uid()));
CREATE TRIGGER talent_match_settings_updated_at BEFORE UPDATE ON public.talent_match_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.talent_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New conversation',
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX talent_threads_user_idx ON public.talent_threads(user_id, updated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.talent_threads TO authenticated;
GRANT ALL ON public.talent_threads TO service_role;
ALTER TABLE public.talent_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own talent threads" ON public.talent_threads FOR ALL TO authenticated USING (user_id = auth.uid() AND organization_id = public.current_org_id()) WITH CHECK (user_id = auth.uid() AND organization_id = public.current_org_id());
CREATE TRIGGER talent_threads_updated_at BEFORE UPDATE ON public.talent_threads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.talent_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL REFERENCES public.talent_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  client_message_id TEXT,
  parts JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX talent_messages_thread_idx ON public.talent_messages(thread_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.talent_messages TO authenticated;
GRANT ALL ON public.talent_messages TO service_role;
ALTER TABLE public.talent_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own talent messages" ON public.talent_messages FOR ALL TO authenticated USING (user_id = auth.uid() AND organization_id = public.current_org_id()) WITH CHECK (user_id = auth.uid() AND organization_id = public.current_org_id());

CREATE TABLE public.talent_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  user_name TEXT,
  kind TEXT NOT NULL DEFAULT 'query',
  query TEXT NOT NULL,
  source_name TEXT,
  requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
  results JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  candidate_count INTEGER NOT NULL DEFAULT 0,
  top_score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX talent_recommendations_org_idx ON public.talent_recommendations(organization_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.talent_recommendations TO authenticated;
GRANT ALL ON public.talent_recommendations TO service_role;
ALTER TABLE public.talent_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "managers read recommendations" ON public.talent_recommendations FOR SELECT TO authenticated USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));
CREATE POLICY "managers write recommendations" ON public.talent_recommendations FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()) AND user_id = auth.uid());
CREATE POLICY "authors delete recommendations" ON public.talent_recommendations FOR DELETE TO authenticated USING (organization_id = public.current_org_id() AND user_id = auth.uid());