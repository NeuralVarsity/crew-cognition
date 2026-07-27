
-- ============ ENUMS ============
CREATE TYPE public.jira_sync_status AS ENUM ('running','success','partial','failed');
CREATE TYPE public.jira_sync_kind AS ENUM ('manual_full','manual_incremental','auto_incremental','background');
CREATE TYPE public.jira_sprint_state AS ENUM ('future','active','closed');
CREATE TYPE public.jira_issue_kind AS ENUM ('story','task','bug','epic','subtask','other');
CREATE TYPE public.jira_status_category AS ENUM ('todo','in_progress','done','unknown');

-- ============ CONNECTIONS ============
CREATE TABLE public.jira_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cloud_id TEXT NOT NULL,
  site_name TEXT NOT NULL,
  site_url TEXT NOT NULL,
  avatar TEXT,
  scope TEXT,
  access_token_ciphertext TEXT NOT NULL,
  refresh_token_ciphertext TEXT,
  token_expires_at TIMESTAMPTZ,
  connected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  auto_sync BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  last_sync_status public.jira_sync_status,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, cloud_id)
);

CREATE TABLE public.jira_oauth_states (
  state TEXT PRIMARY KEY,
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  redirect_to TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes')
);

-- ============ ACCOUNTS ============
CREATE TABLE public.jira_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT,
  avatar TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  linked_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, account_id)
);

-- ============ PROJECTS ============
CREATE TABLE public.jira_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.jira_connections(id) ON DELETE CASCADE,
  jira_id TEXT NOT NULL,
  project_key TEXT NOT NULL,
  name TEXT NOT NULL,
  project_type TEXT,
  project_category TEXT,
  description TEXT,
  avatar TEXT,
  lead_account_id UUID REFERENCES public.jira_accounts(id) ON DELETE SET NULL,
  lead_name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  archived BOOLEAN NOT NULL DEFAULT false,
  tracked BOOLEAN NOT NULL DEFAULT true,
  project_created_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, jira_id)
);

-- ============ BOARDS ============
CREATE TABLE public.jira_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.jira_projects(id) ON DELETE CASCADE,
  jira_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  board_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, jira_id)
);

-- ============ SPRINTS ============
CREATE TABLE public.jira_sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  board_id UUID REFERENCES public.jira_boards(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.jira_projects(id) ON DELETE CASCADE,
  jira_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  goal TEXT,
  state public.jira_sprint_state NOT NULL DEFAULT 'future',
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  complete_date TIMESTAMPTZ,
  completed_points NUMERIC NOT NULL DEFAULT 0,
  remaining_points NUMERIC NOT NULL DEFAULT 0,
  committed_points NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, jira_id)
);

-- ============ EPICS ============
CREATE TABLE public.jira_epics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.jira_projects(id) ON DELETE CASCADE,
  jira_id TEXT NOT NULL,
  epic_key TEXT NOT NULL,
  name TEXT NOT NULL,
  summary TEXT,
  description TEXT,
  status TEXT,
  status_category public.jira_status_category NOT NULL DEFAULT 'unknown',
  progress NUMERIC NOT NULL DEFAULT 0,
  owner_account_id UUID REFERENCES public.jira_accounts(id) ON DELETE SET NULL,
  owner_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, jira_id)
);

-- ============ ISSUES ============
CREATE TABLE public.jira_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.jira_projects(id) ON DELETE CASCADE,
  sprint_id UUID REFERENCES public.jira_sprints(id) ON DELETE SET NULL,
  epic_id UUID REFERENCES public.jira_epics(id) ON DELETE SET NULL,
  jira_id TEXT NOT NULL,
  issue_key TEXT NOT NULL,
  issue_type TEXT,
  issue_kind public.jira_issue_kind NOT NULL DEFAULT 'other',
  summary TEXT NOT NULL,
  description TEXT,
  priority TEXT,
  status TEXT,
  status_category public.jira_status_category NOT NULL DEFAULT 'unknown',
  resolution TEXT,
  reporter_account_id UUID REFERENCES public.jira_accounts(id) ON DELETE SET NULL,
  reporter_name TEXT,
  assignee_account_id UUID REFERENCES public.jira_accounts(id) ON DELETE SET NULL,
  assignee_name TEXT,
  parent_key TEXT,
  labels JSONB NOT NULL DEFAULT '[]'::jsonb,
  story_points NUMERIC,
  original_estimate_seconds INTEGER NOT NULL DEFAULT 0,
  remaining_estimate_seconds INTEGER NOT NULL DEFAULT 0,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  blocked BOOLEAN NOT NULL DEFAULT false,
  comment_count INTEGER NOT NULL DEFAULT 0,
  issue_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  issue_updated_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, jira_id)
);

-- ============ COMMENTS ============
CREATE TABLE public.jira_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  issue_id UUID NOT NULL REFERENCES public.jira_issues(id) ON DELETE CASCADE,
  jira_id TEXT NOT NULL,
  author_account_id UUID REFERENCES public.jira_accounts(id) ON DELETE SET NULL,
  author_name TEXT,
  body TEXT,
  comment_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  comment_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, jira_id)
);

-- ============ WORKLOGS ============
CREATE TABLE public.jira_worklogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  issue_id UUID NOT NULL REFERENCES public.jira_issues(id) ON DELETE CASCADE,
  jira_id TEXT NOT NULL,
  author_account_id UUID REFERENCES public.jira_accounts(id) ON DELETE SET NULL,
  author_name TEXT,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, jira_id)
);

-- ============ SYNC LOGS ============
CREATE TABLE public.jira_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES public.jira_connections(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.jira_projects(id) ON DELETE SET NULL,
  kind public.jira_sync_kind NOT NULL,
  status public.jira_sync_status NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  message TEXT,
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  triggered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ INDEXES ============
CREATE INDEX idx_jira_projects_org ON public.jira_projects(organization_id);
CREATE INDEX idx_jira_boards_project ON public.jira_boards(project_id);
CREATE INDEX idx_jira_sprints_project ON public.jira_sprints(project_id);
CREATE INDEX idx_jira_sprints_state ON public.jira_sprints(organization_id, state);
CREATE INDEX idx_jira_epics_project ON public.jira_epics(project_id);
CREATE INDEX idx_jira_issues_project ON public.jira_issues(project_id);
CREATE INDEX idx_jira_issues_sprint ON public.jira_issues(sprint_id);
CREATE INDEX idx_jira_issues_assignee ON public.jira_issues(assignee_account_id);
CREATE INDEX idx_jira_issues_created ON public.jira_issues(organization_id, issue_created_at DESC);
CREATE INDEX idx_jira_issues_kind ON public.jira_issues(organization_id, issue_kind);
CREATE INDEX idx_jira_comments_issue ON public.jira_comments(issue_id);
CREATE INDEX idx_jira_worklogs_issue ON public.jira_worklogs(issue_id);
CREATE INDEX idx_jira_worklogs_started ON public.jira_worklogs(organization_id, started_at DESC);
CREATE INDEX idx_jira_sync_logs_org ON public.jira_sync_logs(organization_id, started_at DESC);

-- ============ UPDATED_AT TRIGGERS ============
CREATE TRIGGER trg_jira_connections_updated BEFORE UPDATE ON public.jira_connections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_jira_accounts_updated BEFORE UPDATE ON public.jira_accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_jira_projects_updated BEFORE UPDATE ON public.jira_projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_jira_boards_updated BEFORE UPDATE ON public.jira_boards FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_jira_sprints_updated BEFORE UPDATE ON public.jira_sprints FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_jira_epics_updated BEFORE UPDATE ON public.jira_epics FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_jira_issues_updated BEFORE UPDATE ON public.jira_issues FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ GRANTS ============
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jira_connections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jira_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jira_projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jira_boards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jira_sprints TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jira_epics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jira_issues TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jira_comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jira_worklogs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jira_sync_logs TO authenticated;
GRANT ALL ON public.jira_connections TO service_role;
GRANT ALL ON public.jira_oauth_states TO service_role;
GRANT ALL ON public.jira_accounts TO service_role;
GRANT ALL ON public.jira_projects TO service_role;
GRANT ALL ON public.jira_boards TO service_role;
GRANT ALL ON public.jira_sprints TO service_role;
GRANT ALL ON public.jira_epics TO service_role;
GRANT ALL ON public.jira_issues TO service_role;
GRANT ALL ON public.jira_comments TO service_role;
GRANT ALL ON public.jira_worklogs TO service_role;
GRANT ALL ON public.jira_sync_logs TO service_role;

-- ============ RLS ============
ALTER TABLE public.jira_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jira_oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jira_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jira_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jira_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jira_sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jira_epics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jira_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jira_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jira_worklogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jira_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Jira connections readable in org" ON public.jira_connections FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "Jira connections managed by managers" ON public.jira_connections FOR ALL TO authenticated USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid())) WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));

CREATE POLICY "Jira accounts readable in org" ON public.jira_accounts FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "Jira accounts managed by managers" ON public.jira_accounts FOR ALL TO authenticated USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid())) WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));

CREATE POLICY "Jira projects readable in org" ON public.jira_projects FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "Jira projects managed by managers" ON public.jira_projects FOR ALL TO authenticated USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid())) WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));

CREATE POLICY "Jira boards readable in org" ON public.jira_boards FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "Jira boards managed by managers" ON public.jira_boards FOR ALL TO authenticated USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid())) WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));

CREATE POLICY "Jira sprints readable in org" ON public.jira_sprints FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "Jira sprints managed by managers" ON public.jira_sprints FOR ALL TO authenticated USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid())) WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));

CREATE POLICY "Jira epics readable in org" ON public.jira_epics FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "Jira epics managed by managers" ON public.jira_epics FOR ALL TO authenticated USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid())) WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));

CREATE POLICY "Jira issues readable in org" ON public.jira_issues FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "Jira issues managed by managers" ON public.jira_issues FOR ALL TO authenticated USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid())) WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));

CREATE POLICY "Jira comments readable in org" ON public.jira_comments FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "Jira comments managed by managers" ON public.jira_comments FOR ALL TO authenticated USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid())) WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));

CREATE POLICY "Jira worklogs readable in org" ON public.jira_worklogs FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "Jira worklogs managed by managers" ON public.jira_worklogs FOR ALL TO authenticated USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid())) WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));

CREATE POLICY "Jira sync logs readable in org" ON public.jira_sync_logs FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "Jira sync logs managed by managers" ON public.jira_sync_logs FOR ALL TO authenticated USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid())) WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));
