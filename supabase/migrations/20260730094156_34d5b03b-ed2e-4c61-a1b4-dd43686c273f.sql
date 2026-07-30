-- ============ EMPLOYEE CERTIFICATIONS ============
CREATE TABLE public.employee_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  issuer TEXT,
  credential_id TEXT,
  issue_date DATE,
  expiry_date DATE,
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_certifications TO authenticated;
GRANT ALL ON public.employee_certifications TO service_role;
ALTER TABLE public.employee_certifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cert_select" ON public.employee_certifications FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "cert_manage" ON public.employee_certifications FOR ALL TO authenticated USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid())) WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));
CREATE TRIGGER trg_cert_updated BEFORE UPDATE ON public.employee_certifications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_cert_emp ON public.employee_certifications(organization_id, employee_id);

-- ============ TRAINING RECORDS ============
CREATE TABLE public.training_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  course_name TEXT NOT NULL,
  provider TEXT,
  category TEXT,
  hours NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  score NUMERIC,
  started_on DATE,
  completed_on DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_records TO authenticated;
GRANT ALL ON public.training_records TO service_role;
ALTER TABLE public.training_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "training_select" ON public.training_records FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "training_manage" ON public.training_records FOR ALL TO authenticated USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid())) WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));
CREATE TRIGGER trg_training_updated BEFORE UPDATE ON public.training_records FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_training_emp ON public.training_records(organization_id, employee_id);

-- ============ PERFORMANCE REVIEWS ============
CREATE TABLE public.performance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  reviewer_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  period_label TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  overall_rating NUMERIC NOT NULL DEFAULT 0,
  delivery_rating NUMERIC,
  collaboration_rating NUMERIC,
  leadership_rating NUMERIC,
  communication_rating NUMERIC,
  strengths TEXT,
  improvements TEXT,
  comments TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.performance_reviews TO authenticated;
GRANT ALL ON public.performance_reviews TO service_role;
ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "review_select" ON public.performance_reviews FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "review_manage" ON public.performance_reviews FOR ALL TO authenticated USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid())) WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));
CREATE TRIGGER trg_review_updated BEFORE UPDATE ON public.performance_reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_review_emp ON public.performance_reviews(organization_id, employee_id);

-- ============ PROMOTIONS ============
CREATE TABLE public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  previous_designation TEXT,
  new_designation TEXT NOT NULL,
  previous_level TEXT,
  new_level TEXT,
  previous_salary NUMERIC,
  new_salary NUMERIC,
  effective_date DATE NOT NULL,
  reason TEXT,
  approved_by_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promotions TO authenticated;
GRANT ALL ON public.promotions TO service_role;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "promo_select" ON public.promotions FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "promo_manage" ON public.promotions FOR ALL TO authenticated USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid())) WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));
CREATE TRIGGER trg_promo_updated BEFORE UPDATE ON public.promotions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_promo_emp ON public.promotions(organization_id, employee_id);

-- ============ ATTENDANCE ============
CREATE TABLE public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'present',
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  hours_worked NUMERIC NOT NULL DEFAULT 0,
  is_remote BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, work_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_records TO authenticated;
GRANT ALL ON public.attendance_records TO service_role;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "att_select" ON public.attendance_records FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "att_manage" ON public.attendance_records FOR ALL TO authenticated USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid())) WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));
CREATE INDEX idx_att_emp_date ON public.attendance_records(organization_id, employee_id, work_date);

-- ============ LEAVE ============
CREATE TABLE public.leave_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL DEFAULT 'annual',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days NUMERIC NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'approved',
  reason TEXT,
  approved_by_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leave_records TO authenticated;
GRANT ALL ON public.leave_records TO service_role;
ALTER TABLE public.leave_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leave_select" ON public.leave_records FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "leave_manage" ON public.leave_records FOR ALL TO authenticated USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid())) WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));
CREATE TRIGGER trg_leave_updated BEFORE UPDATE ON public.leave_records FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_leave_emp ON public.leave_records(organization_id, employee_id, start_date);

-- ============ PRODUCTIVITY HISTORY ============
CREATE TABLE public.productivity_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  period_month DATE NOT NULL,
  commits INTEGER NOT NULL DEFAULT 0,
  pull_requests INTEGER NOT NULL DEFAULT 0,
  reviews INTEGER NOT NULL DEFAULT 0,
  issues_closed INTEGER NOT NULL DEFAULT 0,
  story_points NUMERIC NOT NULL DEFAULT 0,
  tasks_completed INTEGER NOT NULL DEFAULT 0,
  hours_logged NUMERIC NOT NULL DEFAULT 0,
  productivity_score NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, period_month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.productivity_history TO authenticated;
GRANT ALL ON public.productivity_history TO service_role;
ALTER TABLE public.productivity_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prod_select" ON public.productivity_history FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "prod_manage" ON public.productivity_history FOR ALL TO authenticated USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid())) WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));
CREATE INDEX idx_prod_emp ON public.productivity_history(organization_id, employee_id, period_month);

-- ============ AI SCORE HISTORY ============
CREATE TABLE public.ai_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  period_month DATE NOT NULL,
  github_score NUMERIC NOT NULL DEFAULT 0,
  jira_score NUMERIC NOT NULL DEFAULT 0,
  clickup_score NUMERIC NOT NULL DEFAULT 0,
  productivity_score NUMERIC NOT NULL DEFAULT 0,
  collaboration_score NUMERIC NOT NULL DEFAULT 0,
  leadership_score NUMERIC NOT NULL DEFAULT 0,
  communication_score NUMERIC NOT NULL DEFAULT 0,
  innovation_score NUMERIC NOT NULL DEFAULT 0,
  learning_score NUMERIC NOT NULL DEFAULT 0,
  consistency_score NUMERIC NOT NULL DEFAULT 0,
  workload_score NUMERIC NOT NULL DEFAULT 0,
  quality_score NUMERIC NOT NULL DEFAULT 0,
  overall_score NUMERIC NOT NULL DEFAULT 0,
  risk_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, period_month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_score_history TO authenticated;
GRANT ALL ON public.ai_score_history TO service_role;
ALTER TABLE public.ai_score_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aisc_select" ON public.ai_score_history FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "aisc_manage" ON public.ai_score_history FOR ALL TO authenticated USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid())) WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));
CREATE INDEX idx_aisc_emp ON public.ai_score_history(organization_id, employee_id, period_month);

-- ============ LEADERBOARD SNAPSHOTS ============
CREATE TABLE public.leaderboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  period_label TEXT NOT NULL,
  period_month DATE,
  entries JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, category, period_label)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leaderboard_snapshots TO authenticated;
GRANT ALL ON public.leaderboard_snapshots TO service_role;
ALTER TABLE public.leaderboard_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lb_select" ON public.leaderboard_snapshots FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "lb_manage" ON public.leaderboard_snapshots FOR ALL TO authenticated USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid())) WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));

-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID,
  title TEXT NOT NULL,
  body TEXT,
  category TEXT NOT NULL DEFAULT 'system',
  severity TEXT NOT NULL DEFAULT 'info',
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_select" ON public.notifications FOR SELECT TO authenticated USING (organization_id = public.current_org_id() AND (user_id IS NULL OR user_id = auth.uid()));
CREATE POLICY "notif_update_own" ON public.notifications FOR UPDATE TO authenticated USING (organization_id = public.current_org_id() AND (user_id IS NULL OR user_id = auth.uid())) WITH CHECK (organization_id = public.current_org_id());
CREATE POLICY "notif_manage" ON public.notifications FOR ALL TO authenticated USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid())) WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));
CREATE INDEX idx_notif_org ON public.notifications(organization_id, created_at DESC);

-- ============ REPORTS ============
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'workforce',
  format TEXT NOT NULL DEFAULT 'pdf',
  period_label TEXT,
  status TEXT NOT NULL DEFAULT 'ready',
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  file_path TEXT,
  generated_by UUID,
  generated_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "report_select" ON public.reports FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "report_manage" ON public.reports FOR ALL TO authenticated USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid())) WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));
CREATE TRIGGER trg_report_updated BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PROJECT PROPOSALS ============
CREATE TABLE public.project_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  client_name TEXT NOT NULL,
  industry TEXT,
  summary TEXT,
  budget NUMERIC,
  currency TEXT NOT NULL DEFAULT 'USD',
  timeline_weeks INTEGER,
  start_date DATE,
  tech_stack JSONB NOT NULL DEFAULT '[]'::jsonb,
  required_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  suggested_employees JSONB NOT NULL DEFAULT '[]'::jsonb,
  suggested_team JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  win_probability NUMERIC,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_proposals TO authenticated;
GRANT ALL ON public.project_proposals TO service_role;
ALTER TABLE public.project_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "proposal_select" ON public.project_proposals FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "proposal_manage" ON public.project_proposals FOR ALL TO authenticated USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid())) WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));
CREATE TRIGGER trg_proposal_updated BEFORE UPDATE ON public.project_proposals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_proposal_org ON public.project_proposals(organization_id, created_at DESC);