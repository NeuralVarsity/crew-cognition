
-- ============ ENUMS ============
CREATE TYPE public.github_account_type AS ENUM ('user','organization');
CREATE TYPE public.github_repo_visibility AS ENUM ('public','private','internal');
CREATE TYPE public.github_pr_state AS ENUM ('open','closed','merged');
CREATE TYPE public.github_issue_state AS ENUM ('open','closed');
CREATE TYPE public.github_review_state AS ENUM ('approved','changes_requested','commented','dismissed','pending');
CREATE TYPE public.github_sync_kind AS ENUM ('manual_full','manual_incremental','auto_incremental','background');
CREATE TYPE public.github_sync_status AS ENUM ('running','success','partial','failed');

-- ============ CONNECTIONS ============
CREATE TABLE public.github_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  github_login text NOT NULL,
  github_account_id bigint,
  account_type public.github_account_type NOT NULL DEFAULT 'user',
  avatar text,
  scope text,
  access_token_ciphertext text NOT NULL,
  refresh_token_ciphertext text,
  token_expires_at timestamptz,
  connected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  auto_sync boolean NOT NULL DEFAULT false,
  last_sync_at timestamptz,
  last_sync_status public.github_sync_status,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, github_login)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.github_connections TO authenticated;
GRANT ALL ON public.github_connections TO service_role;
ALTER TABLE public.github_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gh_conn_read" ON public.github_connections FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());
CREATE POLICY "gh_conn_write" ON public.github_connections FOR ALL TO authenticated
  USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()))
  WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));
CREATE TRIGGER gh_conn_updated BEFORE UPDATE ON public.github_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ OAUTH STATES ============
CREATE TABLE public.github_oauth_states (
  state text PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redirect_to text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '15 minutes'
);
GRANT ALL ON public.github_oauth_states TO service_role;
ALTER TABLE public.github_oauth_states ENABLE ROW LEVEL SECURITY;
-- service-role only (no auth policies)

-- ============ REPOSITORIES ============
CREATE TABLE public.github_repositories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES public.github_connections(id) ON DELETE CASCADE,
  github_id bigint NOT NULL,
  owner text NOT NULL,
  name text NOT NULL,
  full_name text NOT NULL,
  description text,
  visibility public.github_repo_visibility NOT NULL DEFAULT 'public',
  language text,
  default_branch text,
  stars integer NOT NULL DEFAULT 0,
  forks integer NOT NULL DEFAULT 0,
  open_issues integer NOT NULL DEFAULT 0,
  watchers integer NOT NULL DEFAULT 0,
  size_kb integer NOT NULL DEFAULT 0,
  pushed_at timestamptz,
  repo_created_at timestamptz,
  archived boolean NOT NULL DEFAULT false,
  disabled boolean NOT NULL DEFAULT false,
  tracked boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, github_id)
);
CREATE INDEX gh_repo_org_idx ON public.github_repositories(organization_id);
CREATE INDEX gh_repo_conn_idx ON public.github_repositories(connection_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.github_repositories TO authenticated;
GRANT ALL ON public.github_repositories TO service_role;
ALTER TABLE public.github_repositories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gh_repo_read" ON public.github_repositories FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());
CREATE POLICY "gh_repo_write" ON public.github_repositories FOR ALL TO authenticated
  USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()))
  WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));
CREATE TRIGGER gh_repo_updated BEFORE UPDATE ON public.github_repositories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ CONTRIBUTORS ============
CREATE TABLE public.github_contributors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  github_id bigint NOT NULL,
  login text NOT NULL,
  name text,
  email text,
  avatar text,
  bio text,
  company text,
  location text,
  followers integer NOT NULL DEFAULT 0,
  following integer NOT NULL DEFAULT 0,
  public_repos integer NOT NULL DEFAULT 0,
  linked_employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, github_id)
);
CREATE INDEX gh_contrib_org_idx ON public.github_contributors(organization_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.github_contributors TO authenticated;
GRANT ALL ON public.github_contributors TO service_role;
ALTER TABLE public.github_contributors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gh_contrib_read" ON public.github_contributors FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());
CREATE POLICY "gh_contrib_write" ON public.github_contributors FOR ALL TO authenticated
  USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()))
  WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));
CREATE TRIGGER gh_contrib_updated BEFORE UPDATE ON public.github_contributors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ REPO <-> CONTRIBUTORS ============
CREATE TABLE public.github_repo_contributors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  repository_id uuid NOT NULL REFERENCES public.github_repositories(id) ON DELETE CASCADE,
  contributor_id uuid NOT NULL REFERENCES public.github_contributors(id) ON DELETE CASCADE,
  contributions integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (repository_id, contributor_id)
);
CREATE INDEX gh_repo_contrib_org_idx ON public.github_repo_contributors(organization_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.github_repo_contributors TO authenticated;
GRANT ALL ON public.github_repo_contributors TO service_role;
ALTER TABLE public.github_repo_contributors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gh_repo_contrib_read" ON public.github_repo_contributors FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());
CREATE POLICY "gh_repo_contrib_write" ON public.github_repo_contributors FOR ALL TO authenticated
  USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()))
  WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));

-- ============ COMMITS ============
CREATE TABLE public.github_commits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  repository_id uuid NOT NULL REFERENCES public.github_repositories(id) ON DELETE CASCADE,
  sha text NOT NULL,
  author_contributor_id uuid REFERENCES public.github_contributors(id) ON DELETE SET NULL,
  author_login text,
  author_email text,
  message text,
  branch text,
  committed_at timestamptz NOT NULL,
  additions integer NOT NULL DEFAULT 0,
  deletions integer NOT NULL DEFAULT 0,
  changed_files integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (repository_id, sha)
);
CREATE INDEX gh_commit_org_idx ON public.github_commits(organization_id);
CREATE INDEX gh_commit_repo_idx ON public.github_commits(repository_id);
CREATE INDEX gh_commit_author_idx ON public.github_commits(author_contributor_id);
CREATE INDEX gh_commit_date_idx ON public.github_commits(committed_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.github_commits TO authenticated;
GRANT ALL ON public.github_commits TO service_role;
ALTER TABLE public.github_commits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gh_commits_read" ON public.github_commits FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());
CREATE POLICY "gh_commits_write" ON public.github_commits FOR ALL TO authenticated
  USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()))
  WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));

-- ============ PULL REQUESTS ============
CREATE TABLE public.github_pull_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  repository_id uuid NOT NULL REFERENCES public.github_repositories(id) ON DELETE CASCADE,
  github_id bigint NOT NULL,
  number integer NOT NULL,
  title text NOT NULL,
  body text,
  state public.github_pr_state NOT NULL DEFAULT 'open',
  merged boolean NOT NULL DEFAULT false,
  draft boolean NOT NULL DEFAULT false,
  author_contributor_id uuid REFERENCES public.github_contributors(id) ON DELETE SET NULL,
  author_login text,
  base_branch text,
  head_branch text,
  additions integer NOT NULL DEFAULT 0,
  deletions integer NOT NULL DEFAULT 0,
  changed_files integer NOT NULL DEFAULT 0,
  review_count integer NOT NULL DEFAULT 0,
  comment_count integer NOT NULL DEFAULT 0,
  pr_created_at timestamptz NOT NULL,
  closed_at timestamptz,
  merged_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (repository_id, number)
);
CREATE INDEX gh_pr_org_idx ON public.github_pull_requests(organization_id);
CREATE INDEX gh_pr_repo_idx ON public.github_pull_requests(repository_id);
CREATE INDEX gh_pr_author_idx ON public.github_pull_requests(author_contributor_id);
CREATE INDEX gh_pr_state_idx ON public.github_pull_requests(state);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.github_pull_requests TO authenticated;
GRANT ALL ON public.github_pull_requests TO service_role;
ALTER TABLE public.github_pull_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gh_pr_read" ON public.github_pull_requests FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());
CREATE POLICY "gh_pr_write" ON public.github_pull_requests FOR ALL TO authenticated
  USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()))
  WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));
CREATE TRIGGER gh_pr_updated BEFORE UPDATE ON public.github_pull_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ ISSUES ============
CREATE TABLE public.github_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  repository_id uuid NOT NULL REFERENCES public.github_repositories(id) ON DELETE CASCADE,
  github_id bigint NOT NULL,
  number integer NOT NULL,
  title text NOT NULL,
  body text,
  state public.github_issue_state NOT NULL DEFAULT 'open',
  labels jsonb NOT NULL DEFAULT '[]'::jsonb,
  assignee_contributor_id uuid REFERENCES public.github_contributors(id) ON DELETE SET NULL,
  assignee_login text,
  author_contributor_id uuid REFERENCES public.github_contributors(id) ON DELETE SET NULL,
  author_login text,
  comment_count integer NOT NULL DEFAULT 0,
  issue_created_at timestamptz NOT NULL,
  closed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (repository_id, number)
);
CREATE INDEX gh_issue_org_idx ON public.github_issues(organization_id);
CREATE INDEX gh_issue_repo_idx ON public.github_issues(repository_id);
CREATE INDEX gh_issue_state_idx ON public.github_issues(state);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.github_issues TO authenticated;
GRANT ALL ON public.github_issues TO service_role;
ALTER TABLE public.github_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gh_issue_read" ON public.github_issues FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());
CREATE POLICY "gh_issue_write" ON public.github_issues FOR ALL TO authenticated
  USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()))
  WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));
CREATE TRIGGER gh_issue_updated BEFORE UPDATE ON public.github_issues
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ REVIEWS ============
CREATE TABLE public.github_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pull_request_id uuid NOT NULL REFERENCES public.github_pull_requests(id) ON DELETE CASCADE,
  github_id bigint NOT NULL,
  reviewer_contributor_id uuid REFERENCES public.github_contributors(id) ON DELETE SET NULL,
  reviewer_login text,
  state public.github_review_state NOT NULL,
  body text,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pull_request_id, github_id)
);
CREATE INDEX gh_review_org_idx ON public.github_reviews(organization_id);
CREATE INDEX gh_review_pr_idx ON public.github_reviews(pull_request_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.github_reviews TO authenticated;
GRANT ALL ON public.github_reviews TO service_role;
ALTER TABLE public.github_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gh_review_read" ON public.github_reviews FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());
CREATE POLICY "gh_review_write" ON public.github_reviews FOR ALL TO authenticated
  USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()))
  WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));

-- ============ SYNC LOGS ============
CREATE TABLE public.github_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES public.github_connections(id) ON DELETE CASCADE,
  repository_id uuid REFERENCES public.github_repositories(id) ON DELETE SET NULL,
  kind public.github_sync_kind NOT NULL,
  status public.github_sync_status NOT NULL DEFAULT 'running',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  duration_ms integer,
  message text,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  triggered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX gh_sync_org_idx ON public.github_sync_logs(organization_id);
CREATE INDEX gh_sync_conn_idx ON public.github_sync_logs(connection_id);
CREATE INDEX gh_sync_started_idx ON public.github_sync_logs(started_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.github_sync_logs TO authenticated;
GRANT ALL ON public.github_sync_logs TO service_role;
ALTER TABLE public.github_sync_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gh_sync_read" ON public.github_sync_logs FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());
CREATE POLICY "gh_sync_write" ON public.github_sync_logs FOR ALL TO authenticated
  USING (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()))
  WITH CHECK (organization_id = public.current_org_id() AND public.can_manage_workforce(auth.uid()));
