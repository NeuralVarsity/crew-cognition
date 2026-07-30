-- Removes every seeded record for one organization (children first).
-- Usage: set :org_id, then run.
\set org_id '00000000-0000-0000-0000-000000000000'

BEGIN;

DELETE FROM public.audit_logs               WHERE organization_id = :'org_id';
DELETE FROM public.activity_logs            WHERE organization_id = :'org_id';
DELETE FROM public.data_import_errors       WHERE organization_id = :'org_id';
DELETE FROM public.data_import_records      WHERE organization_id = :'org_id';
DELETE FROM public.data_imports             WHERE organization_id = :'org_id';
DELETE FROM public.notifications            WHERE organization_id = :'org_id';
DELETE FROM public.reports                  WHERE organization_id = :'org_id';
DELETE FROM public.project_proposals        WHERE organization_id = :'org_id';
DELETE FROM public.leaderboard_snapshots    WHERE organization_id = :'org_id';
DELETE FROM public.ai_score_history         WHERE organization_id = :'org_id';
DELETE FROM public.productivity_history     WHERE organization_id = :'org_id';
DELETE FROM public.leave_records            WHERE organization_id = :'org_id';
DELETE FROM public.attendance_records       WHERE organization_id = :'org_id';
DELETE FROM public.promotions               WHERE organization_id = :'org_id';
DELETE FROM public.performance_reviews      WHERE organization_id = :'org_id';
DELETE FROM public.training_records         WHERE organization_id = :'org_id';
DELETE FROM public.employee_certifications  WHERE organization_id = :'org_id';

DELETE FROM public.clickup_task_comments    WHERE organization_id = :'org_id';
DELETE FROM public.clickup_time_entries     WHERE organization_id = :'org_id';
DELETE FROM public.clickup_checklist_items  WHERE organization_id = :'org_id';
DELETE FROM public.clickup_checklists       WHERE organization_id = :'org_id';
DELETE FROM public.clickup_attachments      WHERE organization_id = :'org_id';
DELETE FROM public.clickup_tasks            WHERE organization_id = :'org_id';
DELETE FROM public.clickup_lists            WHERE organization_id = :'org_id';
DELETE FROM public.clickup_folders          WHERE organization_id = :'org_id';
DELETE FROM public.clickup_spaces           WHERE organization_id = :'org_id';
DELETE FROM public.clickup_members          WHERE organization_id = :'org_id';
DELETE FROM public.clickup_sync_logs        WHERE organization_id = :'org_id';
DELETE FROM public.clickup_connections      WHERE organization_id = :'org_id';

DELETE FROM public.jira_worklogs            WHERE organization_id = :'org_id';
DELETE FROM public.jira_comments            WHERE organization_id = :'org_id';
DELETE FROM public.jira_issues              WHERE organization_id = :'org_id';
DELETE FROM public.jira_epics               WHERE organization_id = :'org_id';
DELETE FROM public.jira_sprints             WHERE organization_id = :'org_id';
DELETE FROM public.jira_boards              WHERE organization_id = :'org_id';
DELETE FROM public.jira_projects            WHERE organization_id = :'org_id';
DELETE FROM public.jira_accounts            WHERE organization_id = :'org_id';
DELETE FROM public.jira_sync_logs           WHERE organization_id = :'org_id';
DELETE FROM public.jira_connections         WHERE organization_id = :'org_id';

DELETE FROM public.github_issues            WHERE organization_id = :'org_id';
DELETE FROM public.github_reviews           WHERE organization_id = :'org_id';
DELETE FROM public.github_pull_requests     WHERE organization_id = :'org_id';
DELETE FROM public.github_commits           WHERE organization_id = :'org_id';
DELETE FROM public.github_repo_contributors WHERE organization_id = :'org_id';
DELETE FROM public.github_repositories      WHERE organization_id = :'org_id';
DELETE FROM public.github_contributors      WHERE organization_id = :'org_id';
DELETE FROM public.github_sync_logs         WHERE organization_id = :'org_id';
DELETE FROM public.github_connections       WHERE organization_id = :'org_id';

DELETE FROM public.employee_projects WHERE project_id IN (SELECT id FROM public.projects WHERE organization_id = :'org_id');
DELETE FROM public.employee_skills   WHERE employee_id IN (SELECT id FROM public.employees WHERE organization_id = :'org_id');
DELETE FROM public.projects          WHERE organization_id = :'org_id';
DELETE FROM public.employees         WHERE organization_id = :'org_id';
DELETE FROM public.skills            WHERE organization_id = :'org_id';
DELETE FROM public.teams             WHERE organization_id = :'org_id';
DELETE FROM public.departments       WHERE organization_id = :'org_id';

COMMIT;