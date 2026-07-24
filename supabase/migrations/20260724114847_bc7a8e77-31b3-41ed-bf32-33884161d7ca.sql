
-- =====================================================================
-- ENTERPRISE FOUNDATION SCHEMA
-- =====================================================================

-- Enums --------------------------------------------------------------
CREATE TYPE public.app_role AS ENUM (
  'super_admin',
  'org_admin',
  'hr',
  'engineering_manager',
  'team_lead',
  'employee',
  'recruiter'
);

CREATE TYPE public.org_status AS ENUM ('active','trialing','suspended','archived');
CREATE TYPE public.subscription_plan AS ENUM ('free','starter','growth','enterprise');
CREATE TYPE public.user_status AS ENUM ('active','invited','suspended','disabled');
CREATE TYPE public.employment_type AS ENUM ('full_time','part_time','contract','intern','consultant');
CREATE TYPE public.employee_status AS ENUM ('active','on_leave','terminated','probation');
CREATE TYPE public.project_status AS ENUM ('planning','active','on_hold','completed','archived');
CREATE TYPE public.invitation_status AS ENUM ('pending','accepted','expired','revoked');
CREATE TYPE public.skill_category AS ENUM ('programming','cloud','database','ai','leadership','soft_skills','other');
CREATE TYPE public.proficiency_level AS ENUM ('beginner','intermediate','advanced','expert');

-- Shared updated_at trigger -----------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =====================================================================
-- ORGANIZATIONS
-- =====================================================================
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  logo TEXT,
  industry TEXT,
  website TEXT,
  country TEXT,
  timezone TEXT DEFAULT 'UTC',
  currency TEXT DEFAULT 'USD',
  subscription_plan public.subscription_plan NOT NULL DEFAULT 'free',
  status public.org_status NOT NULL DEFAULT 'trialing',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_orgs_status ON public.organizations(status);
CREATE INDEX idx_orgs_created ON public.organizations(created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_orgs_updated BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================================
-- USERS (profiles) - one row per auth user
-- =====================================================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar TEXT,
  phone TEXT,
  status public.user_status NOT NULL DEFAULT 'active',
  last_login TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_users_email_lower ON public.users(lower(email));
CREATE INDEX idx_users_org ON public.users(organization_id);
CREATE INDEX idx_users_status ON public.users(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================================
-- ROLES / PERMISSIONS / USER_ROLES
-- =====================================================================
CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name public.app_role NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.roles TO authenticated;
GRANT ALL ON public.roles TO service_role;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.permissions TO authenticated;
GRANT ALL ON public.permissions TO service_role;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.role_permissions (
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);
GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id, role)
);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_org ON public.user_roles(organization_id);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- Security definer helpers
-- =====================================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin','org_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_workforce(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin','org_admin','hr','engineering_manager','team_lead','recruiter')
  );
$$;

-- =====================================================================
-- RLS Policies: organizations & users
-- =====================================================================
CREATE POLICY "Members read own org" ON public.organizations
  FOR SELECT TO authenticated
  USING (id = public.current_org_id() OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "Super admins insert orgs" ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "Org admins update own org" ON public.organizations
  FOR UPDATE TO authenticated
  USING (id = public.current_org_id() AND public.is_org_admin(auth.uid()))
  WITH CHECK (id = public.current_org_id() AND public.is_org_admin(auth.uid()));

CREATE POLICY "Super admins delete orgs" ON public.organizations
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "Users read same org" ON public.users
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR organization_id = public.current_org_id()
    OR public.has_role(auth.uid(),'super_admin')
  );

CREATE POLICY "Users update self" ON public.users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins update org users" ON public.users
  FOR UPDATE TO authenticated
  USING (organization_id = public.current_org_id() AND public.is_org_admin(auth.uid()))
  WITH CHECK (organization_id = public.current_org_id() AND public.is_org_admin(auth.uid()));

CREATE POLICY "Users insert self on signup" ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Roles readable" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permissions readable" ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Role permissions readable" ON public.role_permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "User roles read same org" ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR organization_id = public.current_org_id()
    OR public.has_role(auth.uid(),'super_admin')
  );

CREATE POLICY "Admins manage user roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (organization_id = public.current_org_id() AND public.is_org_admin(auth.uid()))
  WITH CHECK (organization_id = public.current_org_id() AND public.is_org_admin(auth.uid()));

-- =====================================================================
-- DEPARTMENTS
-- =====================================================================
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  head_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);
CREATE INDEX idx_depts_org ON public.departments(organization_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_depts_updated BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Depts read own org" ON public.departments FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());
CREATE POLICY "Depts managed by workforce roles" ON public.departments FOR ALL TO authenticated
  USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()))
  WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));

-- =====================================================================
-- TEAMS
-- =====================================================================
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  lead_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (department_id, name)
);
CREATE INDEX idx_teams_org ON public.teams(organization_id);
CREATE INDEX idx_teams_dept ON public.teams(department_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_teams_updated BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Teams read own org" ON public.teams FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());
CREATE POLICY "Teams managed by workforce roles" ON public.teams FOR ALL TO authenticated
  USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()))
  WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));

-- =====================================================================
-- EMPLOYEES
-- =====================================================================
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  employee_code TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  designation TEXT,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  manager_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  joining_date DATE,
  employment_type public.employment_type NOT NULL DEFAULT 'full_time',
  status public.employee_status NOT NULL DEFAULT 'active',
  location TEXT,
  profile_photo TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, employee_code),
  UNIQUE (organization_id, email)
);
CREATE INDEX idx_emp_org ON public.employees(organization_id);
CREATE INDEX idx_emp_dept ON public.employees(department_id);
CREATE INDEX idx_emp_team ON public.employees(team_id);
CREATE INDEX idx_emp_status ON public.employees(status);
CREATE INDEX idx_emp_email_lower ON public.employees(lower(email));
CREATE INDEX idx_emp_created ON public.employees(created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_emp_updated BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Employees read own org" ON public.employees FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());
CREATE POLICY "Employees managed by workforce roles" ON public.employees FOR ALL TO authenticated
  USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()))
  WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));

-- =====================================================================
-- SKILLS
-- =====================================================================
CREATE TABLE public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category public.skill_category NOT NULL DEFAULT 'other',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);
CREATE INDEX idx_skills_org ON public.skills(organization_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.skills TO authenticated;
GRANT ALL ON public.skills TO service_role;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Skills read same or global" ON public.skills FOR SELECT TO authenticated
  USING (organization_id IS NULL OR organization_id = public.current_org_id());
CREATE POLICY "Skills managed by workforce roles" ON public.skills FOR ALL TO authenticated
  USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()))
  WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));

CREATE TABLE public.employee_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  proficiency public.proficiency_level NOT NULL DEFAULT 'intermediate',
  years_experience NUMERIC(4,1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, skill_id)
);
CREATE INDEX idx_emp_skills_emp ON public.employee_skills(employee_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_skills TO authenticated;
GRANT ALL ON public.employee_skills TO service_role;
ALTER TABLE public.employee_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Emp skills read own org" ON public.employee_skills FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND e.organization_id = public.current_org_id()));
CREATE POLICY "Emp skills managed by workforce" ON public.employee_skills FOR ALL TO authenticated
  USING (public.can_manage_workforce(auth.uid()) AND EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND e.organization_id = public.current_org_id()))
  WITH CHECK (public.can_manage_workforce(auth.uid()) AND EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND e.organization_id = public.current_org_id()));

-- =====================================================================
-- PROJECTS
-- =====================================================================
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  status public.project_status NOT NULL DEFAULT 'planning',
  start_date DATE,
  end_date DATE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);
CREATE INDEX idx_projects_org ON public.projects(organization_id);
CREATE INDEX idx_projects_status ON public.projects(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Projects read own org" ON public.projects FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());
CREATE POLICY "Projects managed by workforce" ON public.projects FOR ALL TO authenticated
  USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()))
  WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));

CREATE TABLE public.employee_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  role TEXT,
  allocation_percent NUMERIC(5,2),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, employee_id)
);
CREATE INDEX idx_ep_project ON public.employee_projects(project_id);
CREATE INDEX idx_ep_employee ON public.employee_projects(employee_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_projects TO authenticated;
GRANT ALL ON public.employee_projects TO service_role;
ALTER TABLE public.employee_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Emp projects read own org" ON public.employee_projects FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.organization_id = public.current_org_id()));
CREATE POLICY "Emp projects managed by workforce" ON public.employee_projects FOR ALL TO authenticated
  USING (public.can_manage_workforce(auth.uid()) AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.organization_id = public.current_org_id()))
  WITH CHECK (public.can_manage_workforce(auth.uid()) AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.organization_id = public.current_org_id()));

-- =====================================================================
-- INVITATIONS
-- =====================================================================
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.app_role NOT NULL DEFAULT 'employee',
  token TEXT NOT NULL UNIQUE,
  status public.invitation_status NOT NULL DEFAULT 'pending',
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_inv_org ON public.invitations(organization_id);
CREATE INDEX idx_inv_email ON public.invitations(lower(email));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitations TO authenticated;
GRANT ALL ON public.invitations TO service_role;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_inv_updated BEFORE UPDATE ON public.invitations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Invitations admins" ON public.invitations FOR ALL TO authenticated
  USING (organization_id = public.current_org_id() AND public.is_org_admin(auth.uid()))
  WITH CHECK (organization_id = public.current_org_id() AND public.is_org_admin(auth.uid()));

-- =====================================================================
-- SESSIONS (custom tracking, not auth.sessions)
-- =====================================================================
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);
CREATE INDEX idx_sessions_user ON public.sessions(user_id);
CREATE INDEX idx_sessions_org ON public.sessions(organization_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO authenticated;
GRANT ALL ON public.sessions TO service_role;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sessions self read" ON public.sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (organization_id = public.current_org_id() AND public.is_org_admin(auth.uid())));
CREATE POLICY "Sessions self insert" ON public.sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- =====================================================================
-- API KEYS
-- =====================================================================
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  label TEXT,
  encrypted_value TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, provider, label)
);
CREATE INDEX idx_api_keys_org ON public.api_keys(organization_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_api_keys_updated BEFORE UPDATE ON public.api_keys FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "API keys admin only" ON public.api_keys FOR ALL TO authenticated
  USING (organization_id = public.current_org_id() AND public.is_org_admin(auth.uid()))
  WITH CHECK (organization_id = public.current_org_id() AND public.is_org_admin(auth.uid()));

-- =====================================================================
-- ORGANIZATION SETTINGS
-- =====================================================================
CREATE TABLE public.organization_settings (
  organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'system',
  brand_color TEXT DEFAULT '#2563EB',
  logo TEXT,
  timezone TEXT DEFAULT 'UTC',
  notification_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_settings TO authenticated;
GRANT ALL ON public.organization_settings TO service_role;
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_orgset_updated BEFORE UPDATE ON public.organization_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Org settings members read" ON public.organization_settings FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());
CREATE POLICY "Org settings admin manage" ON public.organization_settings FOR ALL TO authenticated
  USING (organization_id = public.current_org_id() AND public.is_org_admin(auth.uid()))
  WITH CHECK (organization_id = public.current_org_id() AND public.is_org_admin(auth.uid()));

-- =====================================================================
-- USER PREFERENCES
-- =====================================================================
CREATE TABLE public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  language TEXT DEFAULT 'en',
  theme TEXT DEFAULT 'system',
  timezone TEXT DEFAULT 'UTC',
  dashboard_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;
GRANT ALL ON public.user_preferences TO service_role;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_userpref_updated BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "User prefs self" ON public.user_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =====================================================================
-- ACTIVITY LOGS
-- =====================================================================
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_activity_org ON public.activity_logs(organization_id);
CREATE INDEX idx_activity_user ON public.activity_logs(user_id);
CREATE INDEX idx_activity_created ON public.activity_logs(created_at DESC);
GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Activity read admin" ON public.activity_logs FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id() AND public.is_org_admin(auth.uid()));
CREATE POLICY "Activity insert self" ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- =====================================================================
-- AUDIT LOGS
-- =====================================================================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  before_state JSONB,
  after_state JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_org ON public.audit_logs(organization_id);
CREATE INDEX idx_audit_created ON public.audit_logs(created_at DESC);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Audit read admin" ON public.audit_logs FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id() AND public.is_org_admin(auth.uid()));
CREATE POLICY "Audit insert authenticated" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

-- =====================================================================
-- AUTO CREATE PROFILE ON SIGNUP
-- =====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_preferences (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================================
-- SEED default roles, permissions, and skills
-- =====================================================================
INSERT INTO public.roles (name, label, description) VALUES
  ('super_admin','Super Admin','Platform-level administrator with cross-org access'),
  ('org_admin','Organization Admin','Full control over their organization'),
  ('hr','HR','Manages employees, departments, and teams'),
  ('engineering_manager','Engineering Manager','Manages engineering teams and projects'),
  ('team_lead','Team Lead','Leads a specific team'),
  ('employee','Employee','Regular workspace member'),
  ('recruiter','Recruiter','Manages recruitment and invitations');

INSERT INTO public.permissions (key, description, category) VALUES
  ('employees.read','View employees','employees'),
  ('employees.write','Create or edit employees','employees'),
  ('employees.delete','Delete employees','employees'),
  ('departments.read','View departments','departments'),
  ('departments.write','Create or edit departments','departments'),
  ('departments.delete','Delete departments','departments'),
  ('teams.read','View teams','teams'),
  ('teams.write','Create or edit teams','teams'),
  ('teams.delete','Delete teams','teams'),
  ('projects.read','View projects','projects'),
  ('projects.write','Create or edit projects','projects'),
  ('projects.delete','Delete projects','projects'),
  ('github.read','Access GitHub integration','integrations'),
  ('jira.read','Access Jira integration','integrations'),
  ('clickup.read','Access ClickUp integration','integrations'),
  ('reports.export','Export reports','reports'),
  ('analytics.read','View analytics','analytics'),
  ('settings.manage','Manage workspace settings','settings'),
  ('users.invite','Invite users','users'),
  ('roles.manage','Manage roles and permissions','roles');

INSERT INTO public.skills (name, category, organization_id) VALUES
  ('TypeScript','programming',NULL),
  ('JavaScript','programming',NULL),
  ('Python','programming',NULL),
  ('Go','programming',NULL),
  ('Rust','programming',NULL),
  ('React','programming',NULL),
  ('Node.js','programming',NULL),
  ('AWS','cloud',NULL),
  ('Google Cloud','cloud',NULL),
  ('Azure','cloud',NULL),
  ('Kubernetes','cloud',NULL),
  ('PostgreSQL','database',NULL),
  ('MongoDB','database',NULL),
  ('Redis','database',NULL),
  ('LLM Engineering','ai',NULL),
  ('Prompt Design','ai',NULL),
  ('Data Science','ai',NULL),
  ('People Management','leadership',NULL),
  ('Strategic Planning','leadership',NULL),
  ('Communication','soft_skills',NULL),
  ('Problem Solving','soft_skills',NULL);
