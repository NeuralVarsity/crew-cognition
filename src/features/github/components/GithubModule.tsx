import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useSearch, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Github,
  Loader2,
  Plug,
  PlugZap,
  RefreshCw,
  GitCommit,
  GitPullRequest,
  CircleDot,
  Users,
  Star,
  GitFork,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Trash2,
  ExternalLink,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageHeader } from "@/components/common/page-header";
import { DataTable, type Column } from "@/components/common/data-table";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { formatDate, initials } from "@/lib/format";
import { useAuth } from "@/providers/auth-provider";
import {
  useGithubCommits,
  useGithubConnection,
  useGithubContributors,
  useGithubIssues,
  useGithubPullRequests,
  useGithubRepositories,
  useGithubStats,
  useGithubSyncLogs,
} from "../hooks";
import {
  disconnectGithub,
  runGithubSync,
  setGithubAutoSync,
  startGithubOAuth,
} from "../api/github.functions";

const CHART_COLORS = ["hsl(var(--primary))", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

export function GithubModule() {
  const { canManageWorkforce } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();
  const search = useSearch({ strict: false }) as { connected?: string; error?: string };
  const connectionQ = useGithubConnection();
  const connected = !!connectionQ.data;

  useEffect(() => {
    if (search.connected) {
      toast.success(`Connected as @${search.connected}`);
      qc.invalidateQueries({ queryKey: ["gh"] });
      nav({ to: "/github", search: {}, replace: true });
    } else if (search.error) {
      toast.error(`GitHub connect failed: ${search.error}`);
      nav({ to: "/github", search: {}, replace: true });
    }
  }, [search.connected, search.error, qc, nav]);

  const startFn = useServerFn(startGithubOAuth);
  const connectMut = useMutation({
    mutationFn: () => startFn(),
    onSuccess: (r) => {
      window.location.href = r.url;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const disconnectFn = useServerFn(disconnectGithub);
  const disconnectMut = useMutation({
    mutationFn: () => disconnectFn({ data: { connectionId: connectionQ.data!.id } }),
    onSuccess: () => {
      toast.success("GitHub disconnected");
      qc.invalidateQueries({ queryKey: ["gh"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const syncFn = useServerFn(runGithubSync);
  const syncMut = useMutation({
    mutationFn: (full: boolean) => syncFn({ data: { connectionId: connectionQ.data!.id, full } }),
    onSuccess: (r) => {
      toast.success(
        `Sync complete — ${r.stats.repositories} repos, ${r.stats.commits} commits, ${r.stats.pull_requests} PRs`,
      );
      qc.invalidateQueries({ queryKey: ["gh"] });
    },
    onError: (e: Error) => toast.error(`Sync failed: ${e.message}`),
  });

  const autoSyncFn = useServerFn(setGithubAutoSync);
  const autoSyncMut = useMutation({
    mutationFn: (autoSync: boolean) =>
      autoSyncFn({ data: { connectionId: connectionQ.data!.id, autoSync } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gh", "connection"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="GitHub"
        description="Engineering intelligence from your connected repositories."
        actions={
          connected && canManageWorkforce ? (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={syncMut.isPending}
                onClick={() => syncMut.mutate(false)}
              >
                {syncMut.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Sync
              </Button>
            </>
          ) : null
        }
      />

      {connectionQ.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !connected ? (
        <ConnectCard
          canConnect={canManageWorkforce}
          connecting={connectMut.isPending}
          onConnect={() => connectMut.mutate()}
        />
      ) : (
        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="flex w-full flex-wrap gap-1 sm:w-auto">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="repos">Repositories</TabsTrigger>
            <TabsTrigger value="contributors">Contributors</TabsTrigger>
            <TabsTrigger value="commits">Commits</TabsTrigger>
            <TabsTrigger value="prs">Pull Requests</TabsTrigger>
            <TabsTrigger value="issues">Issues</TabsTrigger>
            <TabsTrigger value="logs">Sync Logs</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <DashboardTab />
          </TabsContent>
          <TabsContent value="repos">
            <RepositoriesTab />
          </TabsContent>
          <TabsContent value="contributors">
            <ContributorsTab />
          </TabsContent>
          <TabsContent value="commits">
            <CommitsTab />
          </TabsContent>
          <TabsContent value="prs">
            <PullRequestsTab />
          </TabsContent>
          <TabsContent value="issues">
            <IssuesTab />
          </TabsContent>
          <TabsContent value="logs">
            <SyncLogsTab />
          </TabsContent>
          <TabsContent value="settings">
            <SettingsTab
              canManage={canManageWorkforce}
              onDisconnect={() => disconnectMut.mutate()}
              onSync={(full) => syncMut.mutate(full)}
              onAutoSyncToggle={(v) => autoSyncMut.mutate(v)}
              syncing={syncMut.isPending}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function ConnectCard({
  canConnect,
  connecting,
  onConnect,
}: {
  canConnect: boolean;
  connecting: boolean;
  onConnect: () => void;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="rounded-full bg-muted p-4">
          <Github className="h-8 w-8" />
        </div>
        <div>
          <h3 className="text-xl font-semibold">Connect GitHub</h3>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Analyze commits, pull requests, code reviews, and engineering velocity across all your repositories.
          </p>
        </div>
        {canConnect ? (
          <Button size="lg" onClick={onConnect} disabled={connecting}>
            {connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plug className="mr-2 h-4 w-4" />}
            Connect GitHub
          </Button>
        ) : (
          <Alert className="max-w-md text-left">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Admin required</AlertTitle>
            <AlertDescription>
              Only organization admins and engineering managers can connect GitHub.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string | number;
  icon: typeof Github;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
        {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function DashboardTab() {
  const statsQ = useGithubStats(true);
  if (statsQ.isLoading) return <Skeleton className="h-96 w-full" />;
  if (!statsQ.data) return null;
  const { totals, languages, dailyCommits } = statsQ.data;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Repositories" value={totals.repositories} icon={Github} />
        <StatCard label="Contributors" value={totals.contributors} icon={Users} />
        <StatCard label="Commits (90d)" value={totals.commits} icon={GitCommit} />
        <StatCard label="Pull Requests" value={totals.pull_requests} icon={GitPullRequest} />
        <StatCard label="Merged PRs" value={totals.merged_prs} icon={CheckCircle2} />
        <StatCard label="Open PRs" value={totals.open_prs} icon={Clock} />
        <StatCard label="Open Issues" value={totals.open_issues} icon={CircleDot} />
        <StatCard label="Stars" value={totals.stars} icon={Star} hint={`${totals.forks} forks`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Commits — last 90 days</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {dailyCommits.length === 0 ? (
              <EmptyState icon={GitCommit} title="No commit activity yet" description="Run a sync to fetch commits." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyCommits}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Languages</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {languages.length === 0 ? (
              <EmptyState title="No language data" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={languages} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>
                    {languages.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <TopContributorsCard />
    </div>
  );
}

function TopContributorsCard() {
  const commitsQ = useGithubCommits(true);
  const top = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of commitsQ.data ?? []) {
      const k = c.author_login ?? "unknown";
      counts[k] = (counts[k] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([name, commits]) => ({ name, commits }))
      .sort((a, b) => b.commits - a.commits)
      .slice(0, 10);
  }, [commitsQ.data]);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top contributors by commits</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        {top.length === 0 ? (
          <EmptyState title="No commits yet" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={top} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Bar dataKey="commits" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

type RepoRow = NonNullable<ReturnType<typeof useGithubRepositories>["data"]>[number];
function RepositoriesTab() {
  const q = useGithubRepositories(true);
  const rows = q.data ?? [];
  const columns: Column<RepoRow>[] = [
    {
      key: "name",
      header: "Repository",
      sortValue: (r) => r.full_name,
      cell: (r) => (
        <div className="flex flex-col">
          <a
            href={`https://github.com/${r.full_name}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-medium hover:underline"
          >
            {r.full_name}
            <ExternalLink className="h-3 w-3 opacity-60" />
          </a>
          {r.description && <span className="max-w-md truncate text-xs text-muted-foreground">{r.description}</span>}
        </div>
      ),
    },
    {
      key: "visibility",
      header: "Visibility",
      cell: (r) => (
        <Badge variant={r.visibility === "public" ? "secondary" : "outline"} className="capitalize">
          {r.visibility}
        </Badge>
      ),
    },
    { key: "language", header: "Language", cell: (r) => r.language ?? "—", sortValue: (r) => r.language ?? "" },
    { key: "stars", header: "Stars", cell: (r) => r.stars, sortValue: (r) => r.stars, className: "text-right tabular-nums" },
    { key: "forks", header: "Forks", cell: (r) => r.forks, sortValue: (r) => r.forks, className: "text-right tabular-nums" },
    { key: "issues", header: "Open Issues", cell: (r) => r.open_issues, sortValue: (r) => r.open_issues, className: "text-right tabular-nums" },
    {
      key: "pushed",
      header: "Last Commit",
      cell: (r) => formatDate(r.pushed_at),
      sortValue: (r) => r.pushed_at ?? "",
    },
    {
      key: "status",
      header: "Status",
      cell: (r) =>
        r.archived ? (
          <Badge variant="outline">Archived</Badge>
        ) : r.disabled ? (
          <Badge variant="destructive">Disabled</Badge>
        ) : (
          <Badge variant="secondary">Active</Badge>
        ),
    },
  ];
  return (
    <DataTable
      rows={rows}
      columns={columns}
      loading={q.isLoading}
      searchPlaceholder="Search repositories…"
      emptyIcon={Github}
      emptyTitle="No repositories yet"
      emptyDescription="Run a sync to import your GitHub repositories."
    />
  );
}

type ContribRow = NonNullable<ReturnType<typeof useGithubContributors>["data"]>[number];
function ContributorsTab() {
  const q = useGithubContributors(true);
  const columns: Column<ContribRow>[] = [
    {
      key: "user",
      header: "Contributor",
      sortValue: (r) => r.login,
      cell: (r) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            {r.avatar && <AvatarImage src={r.avatar} alt={r.login} />}
            <AvatarFallback>{initials(r.name || r.login)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate font-medium">{r.name || r.login}</div>
            <div className="truncate text-xs text-muted-foreground">@{r.login}</div>
          </div>
        </div>
      ),
    },
    { key: "email", header: "Email", cell: (r) => r.email || "—" },
    { key: "followers", header: "Followers", cell: (r) => r.followers, sortValue: (r) => r.followers, className: "text-right tabular-nums" },
    { key: "public_repos", header: "Public Repos", cell: (r) => r.public_repos, sortValue: (r) => r.public_repos, className: "text-right tabular-nums" },
  ];
  return (
    <DataTable
      rows={q.data ?? []}
      columns={columns}
      loading={q.isLoading}
      searchPlaceholder="Search contributors…"
      emptyIcon={Users}
      emptyTitle="No contributors yet"
    />
  );
}

type CommitRow = NonNullable<ReturnType<typeof useGithubCommits>["data"]>[number];
function CommitsTab() {
  const q = useGithubCommits(true);
  const reposQ = useGithubRepositories(true);
  const repoMap = useMemo(() => new Map((reposQ.data ?? []).map((r) => [r.id, r.full_name])), [reposQ.data]);
  const columns: Column<CommitRow>[] = [
    {
      key: "sha",
      header: "SHA",
      cell: (r) => <code className="text-xs">{r.sha.slice(0, 7)}</code>,
    },
    {
      key: "message",
      header: "Message",
      cell: (r) => <div className="max-w-md truncate">{r.message?.split("\n")[0] ?? "—"}</div>,
    },
    { key: "author", header: "Author", cell: (r) => r.author_login ?? "—" },
    { key: "repo", header: "Repository", cell: (r) => repoMap.get(r.repository_id) ?? "—" },
    {
      key: "date",
      header: "Date",
      cell: (r) => formatDate(r.committed_at),
      sortValue: (r) => r.committed_at,
    },
  ];
  return (
    <DataTable
      rows={q.data ?? []}
      columns={columns}
      loading={q.isLoading}
      searchPlaceholder="Search commits…"
      emptyIcon={GitCommit}
      emptyTitle="No commits yet"
    />
  );
}

type PrRow = NonNullable<ReturnType<typeof useGithubPullRequests>["data"]>[number];
function PullRequestsTab() {
  const q = useGithubPullRequests(true);
  const reposQ = useGithubRepositories(true);
  const repoMap = useMemo(() => new Map((reposQ.data ?? []).map((r) => [r.id, r.full_name])), [reposQ.data]);
  const columns: Column<PrRow>[] = [
    {
      key: "title",
      header: "Title",
      sortValue: (r) => r.title,
      cell: (r) => (
        <div className="flex flex-col">
          <span className="truncate font-medium">#{r.number} {r.title}</span>
          <span className="text-xs text-muted-foreground">{repoMap.get(r.repository_id) ?? ""}</span>
        </div>
      ),
    },
    { key: "author", header: "Author", cell: (r) => r.author_login ?? "—" },
    {
      key: "state",
      header: "State",
      cell: (r) => (
        <Badge
          variant={r.state === "merged" ? "default" : r.state === "open" ? "secondary" : "outline"}
          className="capitalize"
        >
          {r.state}
        </Badge>
      ),
    },
    { key: "reviews", header: "Reviews", cell: (r) => r.review_count, sortValue: (r) => r.review_count, className: "text-right tabular-nums" },
    { key: "comments", header: "Comments", cell: (r) => r.comment_count, sortValue: (r) => r.comment_count, className: "text-right tabular-nums" },
    { key: "created", header: "Created", cell: (r) => formatDate(r.pr_created_at), sortValue: (r) => r.pr_created_at },
    { key: "closed", header: "Closed", cell: (r) => formatDate(r.closed_at), sortValue: (r) => r.closed_at ?? "" },
  ];
  return (
    <DataTable
      rows={q.data ?? []}
      columns={columns}
      loading={q.isLoading}
      searchPlaceholder="Search pull requests…"
      emptyIcon={GitPullRequest}
      emptyTitle="No pull requests yet"
    />
  );
}

type IssueRow = NonNullable<ReturnType<typeof useGithubIssues>["data"]>[number];
function IssuesTab() {
  const q = useGithubIssues(true);
  const reposQ = useGithubRepositories(true);
  const repoMap = useMemo(() => new Map((reposQ.data ?? []).map((r) => [r.id, r.full_name])), [reposQ.data]);
  const columns: Column<IssueRow>[] = [
    {
      key: "title",
      header: "Title",
      sortValue: (r) => r.title,
      cell: (r) => (
        <div className="flex flex-col">
          <span className="truncate font-medium">#{r.number} {r.title}</span>
          <span className="text-xs text-muted-foreground">{repoMap.get(r.repository_id) ?? ""}</span>
        </div>
      ),
    },
    {
      key: "state",
      header: "State",
      cell: (r) => (
        <Badge variant={r.state === "open" ? "secondary" : "outline"} className="capitalize">
          {r.state}
        </Badge>
      ),
    },
    {
      key: "labels",
      header: "Labels",
      cell: (r) => (
        <div className="flex flex-wrap gap-1">
          {((Array.isArray(r.labels) ? r.labels : []) as Array<{ name?: string }>)
            .slice(0, 3)
            .map((l, i) => (
              <Badge key={i} variant="outline" className="text-[10px]">
                {l?.name ?? ""}
              </Badge>
            ))}
        </div>
      ),
    },
    { key: "assignee", header: "Assignee", cell: (r) => r.assignee_login ?? "—" },
    { key: "created", header: "Created", cell: (r) => formatDate(r.issue_created_at), sortValue: (r) => r.issue_created_at },
    { key: "closed", header: "Closed", cell: (r) => formatDate(r.closed_at), sortValue: (r) => r.closed_at ?? "" },
  ];
  return (
    <DataTable
      rows={q.data ?? []}
      columns={columns}
      loading={q.isLoading}
      searchPlaceholder="Search issues…"
      emptyIcon={CircleDot}
      emptyTitle="No issues yet"
    />
  );
}

type LogRow = NonNullable<ReturnType<typeof useGithubSyncLogs>["data"]>[number];
function SyncLogsTab() {
  const q = useGithubSyncLogs(true);
  const columns: Column<LogRow>[] = [
    { key: "kind", header: "Kind", cell: (r) => <span className="capitalize">{r.kind.replace(/_/g, " ")}</span> },
    {
      key: "status",
      header: "Status",
      cell: (r) => (
        <Badge
          variant={r.status === "success" ? "secondary" : r.status === "failed" ? "destructive" : "outline"}
          className="capitalize"
        >
          {r.status}
        </Badge>
      ),
    },
    { key: "started", header: "Started", cell: (r) => formatDate(r.started_at), sortValue: (r) => r.started_at },
    {
      key: "duration",
      header: "Duration",
      cell: (r) => (r.duration_ms ? `${(r.duration_ms / 1000).toFixed(1)}s` : "—"),
    },
    {
      key: "stats",
      header: "Stats",
      cell: (r) => {
        const s = (r.stats ?? {}) as { repositories?: number; commits?: number; pull_requests?: number };
        return (
          <span className="text-xs text-muted-foreground">
            {s.repositories ?? 0} repos · {s.commits ?? 0} commits · {s.pull_requests ?? 0} PRs
          </span>
        );
      },
    },
    { key: "message", header: "Message", cell: (r) => <span className="text-xs">{r.message ?? "—"}</span> },
  ];
  return (
    <DataTable
      rows={q.data ?? []}
      columns={columns}
      loading={q.isLoading}
      searchable={false}
      emptyIcon={Clock}
      emptyTitle="No sync activity yet"
    />
  );
}

function SettingsTab({
  canManage,
  onDisconnect,
  onSync,
  onAutoSyncToggle,
  syncing,
}: {
  canManage: boolean;
  onDisconnect: () => void;
  onSync: (full: boolean) => void;
  onAutoSyncToggle: (v: boolean) => void;
  syncing: boolean;
}) {
  const connectionQ = useGithubConnection();
  const reposQ = useGithubRepositories(true);
  const c = connectionQ.data;
  const [autoSync, setAutoSync] = useState<boolean>(!!c?.auto_sync);
  useEffect(() => setAutoSync(!!c?.auto_sync), [c?.auto_sync]);
  if (!c) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              {c.avatar && <AvatarImage src={c.avatar} alt={c.github_login} />}
              <AvatarFallback>{initials(c.github_login)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="font-medium">@{c.github_login}</div>
              <div className="text-xs capitalize text-muted-foreground">{c.account_type} account</div>
            </div>
            <Badge variant="secondary" className="ml-auto gap-1">
              <PlugZap className="h-3 w-3" /> Connected
            </Badge>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Repositories</dt>
              <dd className="mt-0.5 font-medium">{reposQ.data?.length ?? 0}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Last sync</dt>
              <dd className="mt-0.5 font-medium">{c.last_sync_at ? formatDate(c.last_sync_at) : "Never"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Scope</dt>
              <dd className="mt-0.5 truncate text-xs">{c.scope || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Status</dt>
              <dd className="mt-0.5 capitalize">{c.last_sync_status ?? "—"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sync</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Auto sync</div>
              <div className="text-xs text-muted-foreground">Periodically pull new commits, PRs, and issues.</div>
            </div>
            <Switch
              disabled={!canManage}
              checked={autoSync}
              onCheckedChange={(v) => {
                setAutoSync(v);
                onAutoSyncToggle(v);
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => onSync(false)} disabled={!canManage || syncing}>
              {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Incremental sync
            </Button>
            <Button size="sm" variant="outline" onClick={() => onSync(true)} disabled={!canManage || syncing}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Full sync
            </Button>
          </div>
          <div className="border-t pt-4">
            <div className="mb-2 text-sm font-medium">Danger zone</div>
            <ConfirmDialog
              trigger={
                <Button size="sm" variant="destructive" disabled={!canManage}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Disconnect GitHub
                </Button>
              }
              title="Disconnect GitHub?"
              description="This will remove the connection and all synced data (repositories, commits, PRs, issues, reviews) for this GitHub account."
              confirmLabel="Disconnect"
              onConfirm={onDisconnect}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Suppress unused-import warnings for icons re-exported through this module.
void GitFork;