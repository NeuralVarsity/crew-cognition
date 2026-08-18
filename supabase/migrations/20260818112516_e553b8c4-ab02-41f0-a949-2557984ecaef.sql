DO $$
DECLARE
  _org uuid := '69e6aa33-f5f0-40c9-afb3-961d056cef66';
  _t text;
BEGIN
  DELETE FROM public.employee_skills es USING public.employees e
    WHERE es.employee_id = e.id AND e.organization_id = _org;
  DELETE FROM public.employee_projects ep USING public.projects p
    WHERE ep.project_id = p.id AND p.organization_id = _org;

  FOREACH _t IN ARRAY ARRAY[
    'audit_logs','activity_logs','data_imports','notifications','reports','project_proposals',
    'leaderboard_snapshots','ai_score_history','productivity_history','leave_records','attendance_records',
    'promotions','performance_reviews','training_records','employee_certifications',
    'clickup_task_comments','clickup_time_entries','clickup_tasks','clickup_lists','clickup_folders',
    'clickup_spaces','clickup_members','clickup_connections',
    'jira_worklogs','jira_comments','jira_issues','jira_epics','jira_sprints','jira_boards',
    'jira_projects','jira_accounts','jira_connections',
    'github_issues','github_reviews','github_pull_requests','github_commits','github_repo_contributors',
    'github_repositories','github_contributors','github_connections',
    'projects','employees','skills','teams','departments'
  ]
  LOOP
    EXECUTE format('DELETE FROM public.%I WHERE organization_id = $1', _t) USING _org;
  END LOOP;
END $$;