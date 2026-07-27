import { useMemo, useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import {
  useClickUpFolders,
  useClickUpLists,
  useClickUpMembers,
  useClickUpSpaces,
  useClickUpSyncLogs,
  useClickUpTasks,
  useClickUpTimeEntries,
} from "../hooks";

const PAGE_SIZE = 25;

function hours(ms?: number | null) {
  if (!ms) return "—";
  return `${Math.round((ms / 36e5) * 10) / 10}h`;
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">{children}</th>;
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 align-middle ${className}`}>{children}</td>;
}

function TableShell({
  headers,
  rows,
  total,
  page,
  setPage,
  loading,
  toolbar,
}: {
  headers: string[];
  rows: React.ReactNode;
  total: number;
  page: number;
  setPage: (p: number) => void;
  loading?: boolean;
  toolbar?: React.ReactNode;
}) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (loading) return <Skeleton className="h-72 w-full" />;
  return (
    <Card>
      {toolbar && <CardContent className="flex flex-wrap items-center gap-2 border-b p-3">{toolbar}</CardContent>}
      <CardContent className="p-0">
        <div className="max-h-[600px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-card shadow-[inset_0_-1px_0_hsl(var(--border))]">
              <tr>
                {headers.map((h) => (
                  <Th key={h}>{h}</Th>
                ))}
              </tr>
            </thead>
            <tbody>{rows}</tbody>
          </table>
          {total === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No records found.</div>}
        </div>
      </CardContent>
      <CardContent className="flex items-center justify-between border-t p-3 text-xs text-muted-foreground">
        <span>
          {total} records · page {page + 1} of {pages}
        </span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <Button size="sm" variant="outline" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function useSearchPage<T>(items: T[], match: (item: T, q: string) => boolean) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((i) => match(i, q)) : items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, query]);
  const paged = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  return { query, setQuery: (v: string) => { setQuery(v); setPage(0); }, page, setPage, filtered, paged };
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative w-full max-w-xs">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pl-8" />
    </div>
  );
}

const stateVariant = (s: string) =>
  s === "done" ? "default" : s === "blocked" || s === "cancelled" ? "destructive" : "secondary";

export function ClickUpSpacesTable() {
  const q = useClickUpSpaces(true);
  const items = q.data ?? [];
  const s = useSearchPage(items, (i, term) => (i.name ?? "").toLowerCase().includes(term));
  return (
    <TableShell
      loading={q.isLoading}
      headers={["Space", "Visibility", "Archived", "Created", "Last synced"]}
      total={s.filtered.length}
      page={s.page}
      setPage={s.setPage}
      toolbar={<SearchBox value={s.query} onChange={s.setQuery} placeholder="Search spaces…" />}
      rows={s.paged.map((row) => (
        <tr key={row.id} className="border-b last:border-0">
          <Td className="font-medium">{row.name}</Td>
          <Td>{row.private ? "Private" : "Public"}</Td>
          <Td>{row.archived ? "Yes" : "No"}</Td>
          <Td>{formatDate(row.space_created_at)}</Td>
          <Td>{formatDate(row.last_synced_at)}</Td>
        </tr>
      ))}
    />
  );
}

export function ClickUpFoldersTable() {
  const q = useClickUpFolders(true);
  const items = q.data ?? [];
  const s = useSearchPage(items, (i, term) => (i.name ?? "").toLowerCase().includes(term));
  return (
    <TableShell
      loading={q.isLoading}
      headers={["Folder", "Space", "Tasks", "Hidden", "Archived"]}
      total={s.filtered.length}
      page={s.page}
      setPage={s.setPage}
      toolbar={<SearchBox value={s.query} onChange={s.setQuery} placeholder="Search folders…" />}
      rows={s.paged.map((row) => (
        <tr key={row.id} className="border-b last:border-0">
          <Td className="font-medium">{row.name}</Td>
          <Td>{(row.clickup_spaces as { name?: string } | null)?.name ?? "—"}</Td>
          <Td className="tabular-nums">{row.task_count ?? 0}</Td>
          <Td>{row.hidden ? "Yes" : "No"}</Td>
          <Td>{row.archived ? "Yes" : "No"}</Td>
        </tr>
      ))}
    />
  );
}

export function ClickUpListsTable() {
  const q = useClickUpLists(true);
  const items = q.data ?? [];
  const s = useSearchPage(items, (i, term) => (i.name ?? "").toLowerCase().includes(term));
  return (
    <TableShell
      loading={q.isLoading}
      headers={["List", "Space", "Folder", "Status", "Tasks", "Due"]}
      total={s.filtered.length}
      page={s.page}
      setPage={s.setPage}
      toolbar={<SearchBox value={s.query} onChange={s.setQuery} placeholder="Search lists…" />}
      rows={s.paged.map((row) => (
        <tr key={row.id} className="border-b last:border-0">
          <Td className="font-medium">{row.name}</Td>
          <Td>{(row.clickup_spaces as { name?: string } | null)?.name ?? "—"}</Td>
          <Td>{(row.clickup_folders as { name?: string } | null)?.name ?? "—"}</Td>
          <Td>{row.status ?? "—"}</Td>
          <Td className="tabular-nums">{row.task_count ?? 0}</Td>
          <Td>{formatDate(row.due_date)}</Td>
        </tr>
      ))}
    />
  );
}

export function ClickUpTasksTable() {
  const q = useClickUpTasks(true);
  const items = q.data ?? [];
  const [state, setState] = useState("all");
  const [priority, setPriority] = useState("all");
  const [assignee, setAssignee] = useState("all");

  const assignees = useMemo(
    () => [...new Set(items.map((i) => i.primary_assignee_name).filter(Boolean))].sort() as string[],
    [items],
  );
  const priorities = useMemo(() => [...new Set(items.map((i) => i.priority ?? "none"))].sort(), [items]);

  const scoped = useMemo(
    () =>
      items.filter(
        (i) =>
          (state === "all" || i.task_state === state) &&
          (priority === "all" || (i.priority ?? "none") === priority) &&
          (assignee === "all" || i.primary_assignee_name === assignee),
      ),
    [items, state, priority, assignee],
  );
  const s = useSearchPage(scoped, (i, term) => (i.name ?? "").toLowerCase().includes(term));

  return (
    <TableShell
      loading={q.isLoading}
      headers={["Task", "List", "Status", "Priority", "Assignee", "Due", "Estimate", "Logged", ""]}
      total={s.filtered.length}
      page={s.page}
      setPage={s.setPage}
      toolbar={
        <>
          <SearchBox value={s.query} onChange={s.setQuery} placeholder="Search tasks…" />
          <Select value={state} onValueChange={setState}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All states</SelectItem>
              {["open", "in_progress", "blocked", "done", "cancelled", "unknown"].map((v) => (
                <SelectItem key={v} value={v}>
                  {v.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              {priorities.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={assignee} onValueChange={setAssignee}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All assignees</SelectItem>
              {assignees.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      }
      rows={s.paged.map((row) => (
        <tr key={row.id} className="border-b last:border-0">
          <Td className="max-w-[320px] font-medium"><span className="line-clamp-1">{row.name}</span></Td>
          <Td>{(row.clickup_lists as { name?: string } | null)?.name ?? "—"}</Td>
          <Td>
            <Badge variant={stateVariant(row.task_state)}>{row.status ?? row.task_state}</Badge>
          </Td>
          <Td>{row.priority ?? "none"}</Td>
          <Td>{row.primary_assignee_name ?? "Unassigned"}</Td>
          <Td>{formatDate(row.due_date)}</Td>
          <Td className="tabular-nums">{hours(row.time_estimate_ms)}</Td>
          <Td className="tabular-nums">{hours(row.time_spent_ms)}</Td>
          <Td>
            {row.url && (
              <a href={row.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                <ArrowUpRight className="h-4 w-4" />
              </a>
            )}
          </Td>
        </tr>
      ))}
    />
  );
}

export function ClickUpMembersTable() {
  const q = useClickUpMembers(true);
  const items = q.data ?? [];
  const s = useSearchPage(items, (i, term) =>
    `${i.username ?? ""} ${i.email ?? ""}`.toLowerCase().includes(term),
  );
  return (
    <TableShell
      loading={q.isLoading}
      headers={["Member", "Email", "Role", "Status"]}
      total={s.filtered.length}
      page={s.page}
      setPage={s.setPage}
      toolbar={<SearchBox value={s.query} onChange={s.setQuery} placeholder="Search members…" />}
      rows={s.paged.map((row) => (
        <tr key={row.id} className="border-b last:border-0">
          <Td className="font-medium">{row.username ?? "—"}</Td>
          <Td>{row.email ?? "—"}</Td>
          <Td>{row.role ?? "—"}</Td>
          <Td>
            <Badge variant={row.active ? "default" : "outline"}>{row.active ? "Active" : "Inactive"}</Badge>
          </Td>
        </tr>
      ))}
    />
  );
}

export function ClickUpTimeTable() {
  const q = useClickUpTimeEntries(true);
  const items = q.data ?? [];
  const s = useSearchPage(items, (i, term) =>
    `${i.member_name ?? ""} ${i.description ?? ""}`.toLowerCase().includes(term),
  );
  return (
    <TableShell
      loading={q.isLoading}
      headers={["Member", "Task", "Duration", "Billable", "Started", "Description"]}
      total={s.filtered.length}
      page={s.page}
      setPage={s.setPage}
      toolbar={<SearchBox value={s.query} onChange={s.setQuery} placeholder="Search time entries…" />}
      rows={s.paged.map((row) => (
        <tr key={row.id} className="border-b last:border-0">
          <Td className="font-medium">{row.member_name ?? "—"}</Td>
          <Td className="max-w-[260px]"><span className="line-clamp-1">{(row.clickup_tasks as { name?: string } | null)?.name ?? "—"}</span></Td>
          <Td className="tabular-nums">{hours(row.duration_ms)}</Td>
          <Td>{row.billable ? "Yes" : "No"}</Td>
          <Td>{formatDate(row.started_at)}</Td>
          <Td className="max-w-[280px]"><span className="line-clamp-1">{row.description ?? "—"}</span></Td>
        </tr>
      ))}
    />
  );
}

export function ClickUpSyncLogsTable({ onRetry }: { onRetry?: (logId: string) => void }) {
  const q = useClickUpSyncLogs(true);
  const items = q.data ?? [];
  const [page, setPage] = useState(0);
  const paged = items.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  return (
    <TableShell
      loading={q.isLoading}
      headers={["Kind", "Status", "Started", "Duration", "API calls", "Message", ""]}
      total={items.length}
      page={page}
      setPage={setPage}
      rows={paged.map((row) => (
        <tr key={row.id} className="border-b last:border-0">
          <Td className="font-medium">{row.kind}</Td>
          <Td>
            <Badge
              variant={row.status === "success" ? "default" : row.status === "failed" ? "destructive" : "secondary"}
            >
              {row.status}
            </Badge>
          </Td>
          <Td>{formatDate(row.started_at)}</Td>
          <Td className="tabular-nums">{row.duration_ms ? `${Math.round(row.duration_ms / 1000)}s` : "—"}</Td>
          <Td className="tabular-nums">{row.api_calls ?? 0}</Td>
          <Td className="max-w-[320px]"><span className="line-clamp-1">{row.message ?? "—"}</span></Td>
          <Td>
            {row.status === "failed" && onRetry && (
              <Button size="sm" variant="outline" onClick={() => onRetry(row.id)}>
                Retry
              </Button>
            )}
          </Td>
        </tr>
      ))}
    />
  );
}