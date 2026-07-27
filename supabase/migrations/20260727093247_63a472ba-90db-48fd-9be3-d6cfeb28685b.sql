CREATE TABLE public.ai_scoring_settings (
  organization_id UUID NOT NULL PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  weights JSONB NOT NULL DEFAULT '{}'::jsonb,
  thresholds JSONB NOT NULL DEFAULT '{}'::jsonb,
  rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_scoring_settings TO authenticated;
GRANT ALL ON public.ai_scoring_settings TO service_role;

ALTER TABLE public.ai_scoring_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their org AI settings"
ON public.ai_scoring_settings FOR SELECT TO authenticated
USING (organization_id = public.current_org_id());

CREATE POLICY "Admins can manage AI settings"
ON public.ai_scoring_settings FOR ALL TO authenticated
USING (organization_id = public.current_org_id() AND public.is_org_admin(auth.uid()))
WITH CHECK (organization_id = public.current_org_id() AND public.is_org_admin(auth.uid()));

CREATE TRIGGER set_ai_scoring_settings_updated_at
BEFORE UPDATE ON public.ai_scoring_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();