
-- ============ ENUMS ============
CREATE TYPE public.clickup_sync_status AS ENUM ('running','success','partial','failed');
CREATE TYPE public.clickup_sync_kind AS ENUM ('manual_full','manual_incremental','auto_incremental','background','retry');
CREATE TYPE public.clickup_task_state AS ENUM ('open','in_progress','blocked','done','cancelled','unknown');

-- ============ CONNECTIONS ============
CREATE TABLE public.clickup_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL,
  workspace_name TEXT NOT NULL,
  workspace_color TEXT,
  workspace_avatar TEXT,
  scope TEXT,
  access_token_ciphertext TEXT NOT NULL,
  refresh_token_ciphertext TEXT,
  token_expires_at TIMESTAMPTZ,
  connected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  connected_user_name TEXT,
  connected_user_email TEXT,
  auto_sync BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  last_sync_status public.clickup_sync_status,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, workspace_id)
);

CREATE TABLE public.clickup_oauth_states (
  state TEXT PRIMARY KEY,
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  redirect_to TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes')
);

-- ============ MEMBERS ============
CREATE TABLE public.clickup_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES public.clickup_connections(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL,
  username TEXT,
  email TEXT,
  color TEXT,
  profile_picture TEXT,
  role TEXT,
  role_key INTEGER,
  invited_by TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  linked_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, member_id)
);

-- ============ SPACES ============
CREATE TABLE public.clickup_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.clickup_connections(id) ON DELETE CASCADE,
  space_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  private BOOLEAN NOT NULL DEFAULT false,
  archived BOOLEAN NOT NULL DEFAULT false,
  color TEXT,
  avatar TEXT,
  statuses JSONB NOT NULL DEFAULT '[]'::jsonb,
  space_created_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, space_id)
);

-- ============ FOLDERS ============
CREATE TABLE public.clickup_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  space_id UUID REFERENCES public.clickup_spaces(id) ON DELETE CASCADE,
  folder_id TEXT NOT NULL,
  name TEXT NOT NULL,
  hidden BOOLEAN NOT NULL DEFAULT false,
  archived BOOLEAN NOT NULL DEFAULT false,
  task_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, folder_id)
);

-- ============ LISTS ============
CREATE TABLE public.clickup_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  space_id UUID REFERENCES public.clickup_spaces(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.clickup_folders(id) ON DELETE CASCADE,
  list_id TEXT NOT NULL,
  name TEXT NOT NULL,
  content TEXT,
  status TEXT,
  archived BOOLEAN NOT NULL DEFAULT false,
  task_count INTEGER NOT NULL DEFAULT 0,
  due_date TIMESTAMPTZ,
  start_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, list_id)
);

-- ============ TASKS ============
CREATE TABLE public.clickup_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  space_id UUID REFERENCES public.clickup_spaces(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.clickup_folders(id) ON DELETE SET NULL,
  list_id UUID REFERENCES public.clickup_lists(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL,
  custom_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  url TEXT,
  status TEXT,
  status_type TEXT,
  task_state public.clickup_task_state NOT NULL DEFAULT 'unknown',
  priority TEXT,
  priority_order INTEGER,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  assignees JSONB NOT NULL DEFAULT '[]'::jsonb,
  primary_assignee_id UUID REFERENCES public.clickup_members(id) ON DELETE SET NULL,
  primary_assignee_name TEXT,
  creator_member_id UUID REFERENCES public.clickup_members(id) ON DELETE SET NULL,
  creator_name TEXT,
  watchers JSONB NOT NULL DEFAULT '[]'::jsonb,
  parent_task_id TEXT,
  due_date TIMESTAMPTZ,
  start_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  time_estimate_ms BIGINT NOT NULL DEFAULT 0,
  time_spent_ms BIGINT NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  archived BOOLEAN NOT NULL DEFAULT false,
  task_created_at TIMESTAMPTZ,
  task_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, task_id)
);

-- ============ COMMENTS ============
CREATE TABLE public.clickup_task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.clickup_tasks(id) ON DELETE CASCADE,
  comment_id TEXT NOT NULL,
  author_member_id UUID REFERENCES public.clickup_members(id) ON DELETE SET NULL,
  author_name TEXT,
  body TEXT,
  resolved BOOLEAN NOT NULL DEFAULT false,
  comment_created_at TIMESTAMPTZ,
  comment_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, comment_id)
);

-- ============ CHECKLISTS ============
CREATE TABLE public.clickup_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.clickup_tasks(id) ON DELETE CASCADE,
  checklist_id TEXT NOT NULL,
  name TEXT NOT NULL,
  item_count INTEGER NOT NULL DEFAULT 0,
  resolved_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, checklist_id)
);

CREATE TABLE public.clickup_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  checklist_id UUID NOT NULL REFERENCES public.clickup_checklists(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  name TEXT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  assignee_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, item_id)
);

-- ============ TIME ENTRIES ============
CREATE TABLE public.clickup_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.clickup_tasks(id) ON DELETE CASCADE,
  entry_id TEXT NOT NULL,
  member_id UUID REFERENCES public.clickup_members(id) ON DELETE SET NULL,
  member_name TEXT,
  duration_ms BIGINT NOT NULL DEFAULT 0,
  billable BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, entry_id)
);

-- ============ ATTACHMENTS ============
CREATE TABLE public.clickup_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.clickup_tasks(id) ON DELETE CASCADE,
  attachment_id TEXT NOT NULL,
  title TEXT,
  extension TEXT,
  mime_type TEXT,
  kind TEXT NOT NULL DEFAULT 'file',
  size_bytes BIGINT NOT NULL DEFAULT 0,
  url TEXT,
  thumbnail_url TEXT,
  uploaded_by TEXT,
  attachment_created_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, attachment_id)
);

-- ============ SYNC LOGS ============
CREATE TABLE public.clickup_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES public.clickup_connections(id) ON DELETE CASCADE,
  kind public.clickup_sync_kind NOT NULL,
  status public.clickup_sync_status NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  api_calls INTEGER NOT NULL DEFAULT 0,
  message TEXT,
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  triggered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ INDEXES ============
CREATE INDEX idx_clickup_members_org ON public.clickup_members(organization_id);
CREATE INDEX idx_clickup_spaces_org ON public.clickup_spaces(organization_id);
CREATE INDEX idx_clickup_folders_space ON public.clickup_folders(space_id);
CREATE INDEX idx_clickup_lists_space ON public.clickup_lists(space_id);
CREATE INDEX idx_clickup_lists_folder ON public.clickup_lists(folder_id);
CREATE INDEX idx_clickup_tasks_org_updated ON public.clickup_tasks(organization_id, task_updated_at DESC);
CREATE INDEX idx_clickup_tasks_list ON public.clickup_tasks(list_id);
CREATE INDEX idx_clickup_tasks_space ON public.clickup_tasks(space_id);
CREATE INDEX idx_clickup_tasks_state ON public.clickup_tasks(organization_id, task_state);
CREATE INDEX idx_clickup_tasks_assignee ON public.clickup_tasks(primary_assignee_id);
CREATE INDEX idx_clickup_tasks_due ON public.clickup_tasks(organization_id, due_date);
CREATE INDEX idx_clickup_comments_task ON public.clickup_task_comments(task_id);
CREATE INDEX idx_clickup_checklists_task ON public.clickup_checklists(task_id);
CREATE INDEX idx_clickup_checklist_items_cl ON public.clickup_checklist_items(checklist_id);
CREATE INDEX idx_clickup_time_entries_task ON public.clickup_time_entries(task_id);
CREATE INDEX idx_clickup_time_entries_started ON public.clickup_time_entries(organization_id, started_at DESC);
CREATE INDEX idx_clickup_attachments_task ON public.clickup_attachments(task_id);
CREATE INDEX idx_clickup_sync_logs_org ON public.clickup_sync_logs(organization_id, started_at DESC);

-- ============ UPDATED_AT TRIGGERS ============
CREATE TRIGGER trg_clickup_connections_updated BEFORE UPDATE ON public.clickup_connections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_clickup_members_updated BEFORE UPDATE ON public.clickup_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_clickup_spaces_updated BEFORE UPDATE ON public.clickup_spaces FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_clickup_folders_updated BEFORE UPDATE ON public.clickup_folders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_clickup_lists_updated BEFORE UPDATE ON public.clickup_lists FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_clickup_tasks_updated BEFORE UPDATE ON public.clickup_tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_clickup_checklists_updated BEFORE UPDATE ON public.clickup_checklists FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ GRANTS ============
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clickup_connections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clickup_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clickup_spaces TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clickup_folders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clickup_lists TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clickup_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clickup_task_comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clickup_checklists TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clickup_checklist_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clickup_time_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clickup_attachments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clickup_sync_logs TO authenticated;
GRANT ALL ON public.clickup_connections TO service_role;
GRANT ALL ON public.clickup_oauth_states TO service_role;
GRANT ALL ON public.clickup_members TO service_role;
GRANT ALL ON public.clickup_spaces TO service_role;
GRANT ALL ON public.clickup_folders TO service_role;
GRANT ALL ON public.clickup_lists TO service_role;
GRANT ALL ON public.clickup_tasks TO service_role;
GRANT ALL ON public.clickup_task_comments TO service_role;
GRANT ALL ON public.clickup_checklists TO service_role;
GRANT ALL ON public.clickup_checklist_items TO service_role;
GRANT ALL ON public.clickup_time_entries TO service_role;
GRANT ALL ON public.clickup_attachments TO service_role;
GRANT ALL ON public.clickup_sync_logs TO service_role;

-- ============ RLS ============
ALTER TABLE public.clickup_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clickup_oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clickup_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clickup_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clickup_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clickup_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clickup_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clickup_task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clickup_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clickup_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clickup_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clickup_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clickup_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ClickUp connections readable in org" ON public.clickup_connections FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "ClickUp connections managed by managers" ON public.clickup_connections FOR ALL TO authenticated USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid())) WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));

CREATE POLICY "ClickUp members readable in org" ON public.clickup_members FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "ClickUp members managed by managers" ON public.clickup_members FOR ALL TO authenticated USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid())) WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));

CREATE POLICY "ClickUp spaces readable in org" ON public.clickup_spaces FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "ClickUp spaces managed by managers" ON public.clickup_spaces FOR ALL TO authenticated USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid())) WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));

CREATE POLICY "ClickUp folders readable in org" ON public.clickup_folders FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "ClickUp folders managed by managers" ON public.clickup_folders FOR ALL TO authenticated USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid())) WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));

CREATE POLICY "ClickUp lists readable in org" ON public.clickup_lists FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "ClickUp lists managed by managers" ON public.clickup_lists FOR ALL TO authenticated USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid())) WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));

CREATE POLICY "ClickUp tasks readable in org" ON public.clickup_tasks FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "ClickUp tasks managed by managers" ON public.clickup_tasks FOR ALL TO authenticated USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid())) WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));

CREATE POLICY "ClickUp comments readable in org" ON public.clickup_task_comments FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "ClickUp comments managed by managers" ON public.clickup_task_comments FOR ALL TO authenticated USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid())) WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));

CREATE POLICY "ClickUp checklists readable in org" ON public.clickup_checklists FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "ClickUp checklists managed by managers" ON public.clickup_checklists FOR ALL TO authenticated USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid())) WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));

CREATE POLICY "ClickUp checklist items readable in org" ON public.clickup_checklist_items FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "ClickUp checklist items managed by managers" ON public.clickup_checklist_items FOR ALL TO authenticated USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid())) WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));

CREATE POLICY "ClickUp time entries readable in org" ON public.clickup_time_entries FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "ClickUp time entries managed by managers" ON public.clickup_time_entries FOR ALL TO authenticated USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid())) WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));

CREATE POLICY "ClickUp attachments readable in org" ON public.clickup_attachments FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "ClickUp attachments managed by managers" ON public.clickup_attachments FOR ALL TO authenticated USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid())) WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));

CREATE POLICY "ClickUp sync logs readable in org" ON public.clickup_sync_logs FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "ClickUp sync logs managed by managers" ON public.clickup_sync_logs FOR ALL TO authenticated USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid())) WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));
