import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertOctagon,
  Bug,
  CheckCircle2,
  CircleDot,
  Clock,
  FolderKanban,
  Gauge,
  Layers,
  ListChecks,
  Timer,
  Users,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { useJiraAnalytics } from "../hooks";

export const JIRA_CHART_COLORS = [
  "hsl(var(--primary))",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

export function JiraStatCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
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

function hours(value: number) {
  if (!value) return "—";
  return value >= 48 ? `${Math.round(value / 24)}d` : `${Math.round(value)}h`;
}

export function JiraDashboard() {
  const analyticsQ = useJiraAnalytics(true);

  if (analyticsQ.isLoading) return <Skeleton className="h-[600px] w-full" />;
  if (!analyticsQ.data) return <EmptyState icon={FolderKanban} title="No Jira data yet" description="Run a sync to pull projects, sprints and issues." />;

  const {
    totals,
    sprintMetrics,
    delivery,
    velocity,
    burn,
    focusSprintName,
    trends,
    statusDistribution,
    priorityDistribution,
    storyPointDistribution,
    team,
  } = analyticsQ.data;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <JiraStatCard label="Projects" value={totals.projects} icon={FolderKanban} />
        <JiraStatCard label="Sprints" value={totals.sprints} icon={Layers} hint={`${totals.active_sprints} active · ${totals.completed_sprints} closed`} />
        <JiraStatCard label="Stories" value={totals.stories} icon={ListChecks} />
        <JiraStatCard label="Tasks" value={totals.tasks} icon={CheckCircle2} />
        <JiraStatCard label="Bugs" value={totals.bugs} icon={Bug} />
        <JiraStatCard label="Open issues" value={totals.open_issues} icon={CircleDot} hint={`${totals.closed_issues} closed`} />
        <JiraStatCard label="Velocity" value={sprintMetrics.average_velocity} icon={Zap} hint="avg pts / closed sprint" />
        <JiraStatCard label="Completion" value={`${Math.round(sprintMetrics.average_completion)}%`} icon={Gauge} hint="avg sprint completion" />
        <JiraStatCard label="Avg story points" value={sprintMetrics.average_story_points} icon={Layers} />
        <JiraStatCard label="Lead time" value={hours(delivery.average_lead_hours)} icon={Timer} />
        <JiraStatCard label="Cycle time" value={hours(delivery.average_cycle_hours)} icon={Clock} />
        <JiraStatCard label="Blocked" value={totals.blocked} icon={AlertOctagon} hint={`${totals.logged_hours}h logged`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sprint velocity</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {velocity.length === 0 ? (
              <EmptyState icon={Zap} title="No sprint data" description="Sync boards with sprints to see velocity." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={velocity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="committed" name="Committed" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Burndown {focusSprintName ? `— ${focusSprintName}` : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {burn.length === 0 ? (
              <EmptyState icon={Timer} title="No active sprint" description="Burndown appears once a sprint is running." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={burn}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d: string) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="remaining" name="Remaining" stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="scope" name="Scope" stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Burnup {focusSprintName ? `— ${focusSprintName}` : ""}</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {burn.length === 0 ? (
              <EmptyState icon={Timer} title="No sprint burnup" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={burn}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d: string) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="completed" name="Completed" stroke="#10b981" fill="#10b98133" strokeWidth={2} />
                  <Area type="monotone" dataKey="scope" name="Scope" stroke="#3b82f6" fill="#3b82f622" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Issue trends (created vs resolved)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {trends.length === 0 ? (
              <EmptyState icon={CircleDot} title="No issue history" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} tickFormatter={(d: string) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="created" name="Created" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="resolved" name="Resolved" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {statusDistribution.length === 0 ? (
              <EmptyState title="No statuses" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusDistribution} dataKey="value" nameKey="name" innerRadius={45} outerRadius={85}>
                    {statusDistribution.map((_, i) => (
                      <Cell key={i} fill={JIRA_CHART_COLORS[i % JIRA_CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Priority distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {priorityDistribution.length === 0 ? (
              <EmptyState title="No priorities" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" name="Issues" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Story point distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {storyPointDistribution.length === 0 ? (
              <EmptyState title="No estimated issues" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={storyPointDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" name="Issues" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Team workload</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {team.length === 0 ? (
              <EmptyState icon={Users} title="No assignees" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={team.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="assigned" name="Assigned" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="closed" name="Closed" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function JiraTeamAnalytics() {
  const analyticsQ = useJiraAnalytics(true);
  if (analyticsQ.isLoading) return <Skeleton className="h-96 w-full" />;
  const team = analyticsQ.data?.team ?? [];
  if (team.length === 0)
    return <EmptyState icon={Users} title="No team data" description="Assign issues in Jira and re-sync." />;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Average resolution time per engineer</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={team.slice(0, 12)}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={70} />
              <YAxis tick={{ fontSize: 11 }} unit="h" />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="avg_resolution_hours" name="Avg resolution (h)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left">Engineer</th>
              <th className="px-4 py-2 text-right">Assigned</th>
              <th className="px-4 py-2 text-right">Closed</th>
              <th className="px-4 py-2 text-right">Points</th>
              <th className="px-4 py-2 text-right">Blocked</th>
              <th className="px-4 py-2 text-right">Avg resolution</th>
              <th className="px-4 py-2 text-right">Avg cycle</th>
            </tr>
          </thead>
          <tbody>
            {team.map((t) => (
              <tr key={t.name} className="border-t">
                <td className="px-4 py-2 font-medium">{t.name}</td>
                <td className="px-4 py-2 text-right tabular-nums">{t.assigned}</td>
                <td className="px-4 py-2 text-right tabular-nums">{t.closed}</td>
                <td className="px-4 py-2 text-right tabular-nums">{t.points}</td>
                <td className="px-4 py-2 text-right tabular-nums">{t.blocked}</td>
                <td className="px-4 py-2 text-right tabular-nums">{hours(t.avg_resolution_hours)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{hours(t.avg_cycle_hours)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}