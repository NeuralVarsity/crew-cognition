import { useMemo, useState } from "react";
import { Bug, CalendarRange, CircleDot, FolderKanban, Layers, ListChecks, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type Column } from "@/components/common/data-table";
import { formatDate } from "@/lib/format";
import {
  useJiraEpics,
  useJiraIssues,
  useJiraProjects,
  useJiraSprints,
  useJiraSyncLogs,
  useJiraWorklogs,
} from "../hooks";

const ALL = "__all__";

function statusTone(category: string) {
  if (category === "done") return "default" as const;
  if (category === "in_progress") return "secondary" as const;
  return "outline" as const;
}

function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-full sm:w-[160px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{placeholder}: All</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

type ProjectRow = { id: string; project_key: string; name: string; project_type: string | null; lead_name: string | null; status: string; archived: boolean; project_created_at: string | null; created_at: string };

export function JiraProjectsTab() {
  const q = useJiraProjects(true);
  const rows = (q.data ?? []) as ProjectRow[];
  const [type, setType] = useState(ALL);
  const [status, setStatus] = useState(ALL);

  const types = useMemo(() => [...new Set(rows.map((r) => r.project_type).filter(Boolean))] as string[], [rows]);
  const filtered = rows.filter(
    (r) => (type === ALL || r.project_type === type) && (status === ALL || r.status === status),
  );

  const columns: Column<ProjectRow>[] = [
    { key: "key", header: "Key", cell: (r) => <span className="font-mono text-xs font-semibold">{r.project_key}</span>, sortValue: (r) => r.project_key },
    { key: "name", header: "Name", cell: (r) => <span className="font-medium">{r.name}</span>, sortValue: (r) => r.name },
    { key: "type", header: "Type", cell: (r) => <span className="capitalize">{r.project_type ?? "—"}</span>, sortValue: (r) => r.project_type ?? "" },
    { key: "lead", header: "Lead", cell: (r) => r.lead_name ?? "—", sortValue: (r) => r.lead_name ?? "" },
    { key: "status", header: "Status", cell: (r) => <Badge variant={r.archived ? "outline" : "default"}>{r.status}</Badge>, sortValue: (r) => r.status },
    { key: "created", header: "Created", cell: (r) => formatDate(r.project_created_at ?? r.created_at), sortValue: (r) => r.project_created_at ?? r.created_at },
  ];

  return (
    <DataTable
      rows={filtered}
      columns={columns}
      loading={q.isLoading}
      searchPlaceholder="Search projects…"
      searchFn={(r, s) => `${r.name} ${r.project_key} ${r.lead_name ?? ""}`.toLowerCase().includes(s)}
      emptyIcon={FolderKanban}
      emptyTitle="No Jira projects"
      emptyDescription="Run a sync to import projects from your Jira site."
      toolbar={
        <div className="flex flex-wrap gap-2">
          <FilterSelect value={type} onChange={setType} options={types} placeholder="Type" />
          <FilterSelect value={status} onChange={setStatus} options={["active", "archived"]} placeholder="Status" />
        </div>
      }
    />
  );
}

type SprintRow = { id: string; name: string; goal: string | null; state: string; start_date: string | null; end_date: string | null; completed_points: number; remaining_points: number; committed_points: number };

export function JiraSprintsTab() {
  const q = useJiraSprints(true);
  const rows = (q.data ?? []) as SprintRow[];
  const [state, setState] = useState(ALL);
  const filtered = rows.filter((r) => state === ALL || r.state === state);

  const columns: Column<SprintRow>[] = [
    { key: "name", header: "Sprint", cell: (r) => <span className="font-medium">{r.name}</span>, sortValue: (r) => r.name },
    { key: "goal", header: "Goal", cell: (r) => <span className="line-clamp-1 text-muted-foreground">{r.goal || "—"}</span> },
    { key: "state", header: "State", cell: (r) => <Badge variant={r.state === "active" ? "default" : r.state === "closed" ? "secondary" : "outline"}>{r.state}</Badge>, sortValue: (r) => r.state },
    { key: "start", header: "Start", cell: (r) => formatDate(r.start_date), sortValue: (r) => r.start_date },
    { key: "end", header: "End", cell: (r) => formatDate(r.end_date), sortValue: (r) => r.end_date },
    { key: "done", header: "Completed pts", cell: (r) => <span className="tabular-nums">{Number(r.completed_points)}</span>, sortValue: (r) => Number(r.completed_points) },
    { key: "left", header: "Remaining pts", cell: (r) => <span className="tabular-nums">{Number(r.remaining_points)}</span>, sortValue: (r) => Number(r.remaining_points) },
  ];

  return (
    <DataTable
      rows={filtered}
      columns={columns}
      loading={q.isLoading}
      searchPlaceholder="Search sprints…"
      searchFn={(r, s) => `${r.name} ${r.goal ?? ""}`.toLowerCase().includes(s)}
      emptyIcon={CalendarRange}
      emptyTitle="No sprints"
      emptyDescription="Sprints appear after syncing Agile boards."
      toolbar={<FilterSelect value={state} onChange={setState} options={["future", "active", "closed"]} placeholder="State" />}
    />
  );
}

type EpicRow = { id: string; epic_key: string; name: string; status: string | null; status_category: string; progress: number; owner_name: string | null; description: string | null };

export function JiraEpicsTab() {
  const q = useJiraEpics(true);
  const rows = (q.data ?? []) as EpicRow[];

  const columns: Column<EpicRow>[] = [
    { key: "key", header: "Key", cell: (r) => <span className="font-mono text-xs font-semibold">{r.epic_key}</span>, sortValue: (r) => r.epic_key },
    { key: "name", header: "Epic", cell: (r) => <span className="font-medium">{r.name}</span>, sortValue: (r) => r.name },
    { key: "status", header: "Status", cell: (r) => <Badge variant={statusTone(r.status_category)}>{r.status ?? "—"}</Badge>, sortValue: (r) => r.status ?? "" },
    {
      key: "progress",
      header: "Progress",
      cell: (r) => (
        <div className="flex min-w-[120px] items-center gap-2">
          <Progress value={Number(r.progress)} className="h-2" />
          <span className="text-xs tabular-nums text-muted-foreground">{Number(r.progress)}%</span>
        </div>
      ),
      sortValue: (r) => Number(r.progress),
    },
    { key: "owner", header: "Owner", cell: (r) => r.owner_name ?? "—", sortValue: (r) => r.owner_name ?? "" },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      loading={q.isLoading}
      searchPlaceholder="Search epics…"
      searchFn={(r, s) => `${r.name} ${r.epic_key} ${r.owner_name ?? ""}`.toLowerCase().includes(s)}
      emptyIcon={Layers}
      emptyTitle="No epics"
    />
  );
}

type IssueRow = {
  id: string;
  issue_key: string;
  summary: string;
  issue_kind: string;
  issue_type: string | null;
  priority: string | null;
  status: string | null;
  status_category: string;
  assignee_name: string | null;
  reporter_name: string | null;
  story_points: number | null;
  labels: unknown;
  issue_created_at: string;
  issue_updated_at: string | null;
  resolved_at: string | null;
  time_spent_seconds: number;
};

export function JiraIssuesTab() {
  const q = useJiraIssues(true);
  const rows = (q.data ?? []) as IssueRow[];
  const [kind, setKind] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [priority, setPriority] = useState(ALL);
  const [assignee, setAssignee] = useState(ALL);

  const statuses = useMemo(() => [...new Set(rows.map((r) => r.status).filter(Boolean))] as string[], [rows]);
  const priorities = useMemo(() => [...new Set(rows.map((r) => r.priority).filter(Boolean))] as string[], [rows]);
  const assignees = useMemo(() => [...new Set(rows.map((r) => r.assignee_name).filter(Boolean))] as string[], [rows]);

  const filtered = rows.filter(
    (r) =>
      (kind === ALL || r.issue_kind === kind) &&
      (status === ALL || r.status === status) &&
      (priority === ALL || r.priority === priority) &&
      (assignee === ALL || r.assignee_name === assignee),
  );

  const columns: Column<IssueRow>[] = [
    { key: "key", header: "Key", cell: (r) => <span className="font-mono text-xs font-semibold">{r.issue_key}</span>, sortValue: (r) => r.issue_key },
    { key: "summary", header: "Summary", cell: (r) => <span className="line-clamp-1 font-medium">{r.summary}</span>, sortValue: (r) => r.summary },
    { key: "type", header: "Type", cell: (r) => <Badge variant="outline" className="capitalize">{r.issue_type ?? r.issue_kind}</Badge>, sortValue: (r) => r.issue_kind },
    { key: "priority", header: "Priority", cell: (r) => r.priority ?? "—", sortValue: (r) => r.priority ?? "" },
    { key: "status", header: "Status", cell: (r) => <Badge variant={statusTone(r.status_category)}>{r.status ?? "—"}</Badge>, sortValue: (r) => r.status ?? "" },
    { key: "assignee", header: "Assignee", cell: (r) => r.assignee_name ?? "Unassigned", sortValue: (r) => r.assignee_name ?? "" },
    { key: "points", header: "Pts", cell: (r) => <span className="tabular-nums">{r.story_points ?? "—"}</span>, sortValue: (r) => Number(r.story_points ?? 0) },
    { key: "updated", header: "Updated", cell: (r) => formatDate(r.issue_updated_at ?? r.issue_created_at), sortValue: (r) => r.issue_updated_at ?? r.issue_created_at },
  ];

  return (
    <DataTable
      rows={filtered}
      columns={columns}
      loading={q.isLoading}
      pageSize={15}
      searchPlaceholder="Search issues…"
      searchFn={(r, s) => `${r.issue_key} ${r.summary} ${r.assignee_name ?? ""} ${r.reporter_name ?? ""}`.toLowerCase().includes(s)}
      emptyIcon={CircleDot}
      emptyTitle="No issues"
      emptyDescription="Run a sync to import issues from Jira."
      toolbar={
        <div className="flex flex-wrap gap-2">
          <FilterSelect value={kind} onChange={setKind} options={["story", "task", "bug", "epic", "subtask", "other"]} placeholder="Type" />
          <FilterSelect value={status} onChange={setStatus} options={statuses} placeholder="Status" />
          <FilterSelect value={priority} onChange={setPriority} options={priorities} placeholder="Priority" />
          <FilterSelect value={assignee} onChange={setAssignee} options={assignees} placeholder="Assignee" />
        </div>
      }
    />
  );
}

type WorklogRow = { id: string; author_name: string | null; time_spent_seconds: number; started_at: string; description: string | null };

export function JiraWorklogsTab() {
  const q = useJiraWorklogs(true);
  const rows = (q.data ?? []) as WorklogRow[];

  const columns: Column<WorklogRow>[] = [
    { key: "author", header: "User", cell: (r) => r.author_name ?? "—", sortValue: (r) => r.author_name ?? "" },
    { key: "time", header: "Time logged", cell: (r) => `${Math.round((r.time_spent_seconds / 3600) * 10) / 10}h`, sortValue: (r) => r.time_spent_seconds },
    { key: "date", header: "Date", cell: (r) => formatDate(r.started_at), sortValue: (r) => r.started_at },
    { key: "desc", header: "Description", cell: (r) => <span className="line-clamp-1 text-muted-foreground">{r.description || "—"}</span> },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      loading={q.isLoading}
      searchPlaceholder="Search worklogs…"
      searchFn={(r, s) => `${r.author_name ?? ""} ${r.description ?? ""}`.toLowerCase().includes(s)}
      emptyIcon={Timer}
      emptyTitle="No worklogs"
    />
  );
}

type SyncLogRow = {
  id: string;
  kind: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  message: string | null;
  stats: Record<string, unknown> | null;
};

export function JiraSyncLogsTab() {
  const q = useJiraSyncLogs(true);
  const rows = (q.data ?? []) as SyncLogRow[];

  const columns: Column<SyncLogRow>[] = [
    {
      key: "started",
      header: "Started",
      cell: (r) => new Date(r.started_at).toLocaleString(),
      sortValue: (r) => r.started_at,
    },
    { key: "kind", header: "Type", cell: (r) => <Badge variant="outline">{r.kind.replace("_", " ")}</Badge>, sortValue: (r) => r.kind },
    {
      key: "status",
      header: "Status",
      cell: (r) => (
        <Badge variant={r.status === "success" ? "default" : r.status === "failed" ? "destructive" : "secondary"}>
          {r.status}
        </Badge>
      ),
      sortValue: (r) => r.status,
    },
    { key: "duration", header: "Duration", cell: (r) => (r.duration_ms ? `${Math.round(r.duration_ms / 100) / 10}s` : "—"), sortValue: (r) => r.duration_ms ?? 0 },
    {
      key: "stats",
      header: "Records",
      cell: (r) => {
        const s = (r.stats ?? {}) as Record<string, number>;
        return (
          <span className="text-xs text-muted-foreground">
            {s.projects ?? 0} projects · {s.sprints ?? 0} sprints · {s.issues ?? 0} issues
          </span>
        );
      },
    },
    { key: "message", header: "Message", cell: (r) => <span className="line-clamp-1 text-xs text-muted-foreground">{r.message || "—"}</span> },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      loading={q.isLoading}
      searchable={false}
      emptyIcon={ListChecks}
      emptyTitle="No sync history"
    />
  );
}

export const JiraIcons = { Bug };