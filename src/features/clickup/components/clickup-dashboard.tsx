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
  CalendarClock,
  CheckCircle2,
  CircleDot,
  Clock,
  Gauge,
  Layers,
  ListChecks,
  Timer,
  TrendingUp,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { formatDate } from "@/lib/format";
import { useClickUpAnalytics } from "../hooks";

export const CLICKUP_CHART_COLORS = [
  "hsl(var(--primary))",
  "#7b68ee",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#14b8a6",
];

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

export function ClickUpStatCard({
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

function ChartCard({
  title,
  description,
  children,
  height = 260,
}: {
  title: string;
  description?: string;
  children: React.ReactElement;
  height?: number;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        {description && <CardDescription className="text-xs">{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function ClickUpDashboard() {
  const q = useClickUpAnalytics(true);

  if (q.isLoading) return <Skeleton className="h-[600px] w-full" />;
  if (!q.data)
    return (
      <EmptyState
        icon={ListChecks}
        title="No ClickUp data yet"
        description="Run a sync to pull spaces, lists, tasks and time entries."
      />
    );

  const {
    totals,
    stateDistribution,
    statusDistribution,
    priorityDistribution,
    completionTrend,
    productivityTrend,
    timeTrend,
    projects,
    leaderboard,
    workload,
    team,
    todayTasks,
    upcoming,
  } = q.data;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <ClickUpStatCard label="Tasks" value={totals.tasks} icon={ListChecks} hint={`${totals.lists} lists`} />
        <ClickUpStatCard label="Completed" value={totals.completed} icon={CheckCircle2} hint={`${totals.completion_rate}% rate`} />
        <ClickUpStatCard label="In progress" value={totals.in_progress} icon={CircleDot} hint={`${totals.pending} pending`} />
        <ClickUpStatCard label="Overdue" value={totals.overdue} icon={AlertOctagon} hint={`${totals.blocked} blocked`} />
        <ClickUpStatCard label="Hours logged" value={totals.hours_logged} icon={Timer} hint={`${totals.billable_hours}h billable`} />
        <ClickUpStatCard label="Members" value={totals.members} icon={Users} hint={`${team.active_members} active`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Task status" description="Distribution across workflow states">
          <PieChart>
            <Pie data={stateDistribution} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
              {stateDistribution.map((_, i) => (
                <Cell key={i} fill={CLICKUP_CHART_COLORS[i % CLICKUP_CHART_COLORS.length]} />
              ))}
            </Pie>
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ChartCard>

        <ChartCard title="Task completion trend" description="Created vs completed, last 30 days">
          <AreaChart data={completionTrend}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="created" stroke={CLICKUP_CHART_COLORS[2]} fill={CLICKUP_CHART_COLORS[2]} fillOpacity={0.15} />
            <Area type="monotone" dataKey="completed" stroke={CLICKUP_CHART_COLORS[3]} fill={CLICKUP_CHART_COLORS[3]} fillOpacity={0.2} />
          </AreaChart>
        </ChartCard>

        <ChartCard title="Productivity trend" description="Daily completions and cumulative delivery">
          <LineChart data={productivityTrend}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="completed" stroke={CLICKUP_CHART_COLORS[1]} dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="cumulative" stroke={CLICKUP_CHART_COLORS[4]} dot={false} strokeWidth={2} />
          </LineChart>
        </ChartCard>

        <ChartCard title="Time tracking" description="Hours logged per day">
          <BarChart data={timeTrend}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="hours" fill={CLICKUP_CHART_COLORS[1]} radius={[3, 3, 0, 0]} />
            <Bar dataKey="billable" fill={CLICKUP_CHART_COLORS[3]} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Priority distribution" description="Open and closed tasks by priority">
          <BarChart data={priorityDistribution} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
            <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="value" radius={[0, 3, 3, 0]}>
              {priorityDistribution.map((_, i) => (
                <Cell key={i} fill={CLICKUP_CHART_COLORS[i % CLICKUP_CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard title="Workload distribution" description="Open tasks per assignee">
          <BarChart data={workload.slice(0, 10)}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="member" tick={{ fontSize: 10 }} interval={0} angle={-20} height={50} textAnchor="end" />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="open" stackId="a" fill={CLICKUP_CHART_COLORS[4]} radius={[0, 0, 0, 0]} />
            <Bar dataKey="completed" stackId="a" fill={CLICKUP_CHART_COLORS[3]} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <TrendingUp className="h-4 w-4" /> Productivity leaderboard
            </CardTitle>
            <CardDescription className="text-xs">Score blends completion rate, speed and logged effort.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {leaderboard.length === 0 && <p className="text-sm text-muted-foreground">No assignee activity yet.</p>}
            {leaderboard.map((m, i) => (
              <div key={m.member} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate font-medium">
                    {i + 1}. {m.member}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {m.completed}/{m.assigned} · {m.productivity}
                  </span>
                </div>
                <Progress value={m.productivity} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Gauge className="h-4 w-4" /> Project health
            </CardTitle>
            <CardDescription className="text-xs">Completion versus overdue and blocked risk per space.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {projects.length === 0 && <p className="text-sm text-muted-foreground">No spaces synced yet.</p>}
            {projects.slice(0, 8).map((p) => (
              <div key={p.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate font-medium">{p.name}</span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="tabular-nums">{p.completion_rate}%</span>
                    <Badge variant={p.risk > 50 ? "destructive" : p.risk > 20 ? "secondary" : "outline"}>
                      risk {p.risk}
                    </Badge>
                  </span>
                </div>
                <Progress value={p.health} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="h-4 w-4" /> Today&apos;s tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {todayTasks.length === 0 && <p className="text-sm text-muted-foreground">Nothing due today.</p>}
            {todayTasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 rounded-md border p-2 text-sm">
                <span className="line-clamp-1">{t.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{t.assignee ?? "Unassigned"}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <CalendarClock className="h-4 w-4" /> Upcoming deadlines
            </CardTitle>
            <CardDescription className="text-xs">Next 14 days</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcoming.length === 0 && <p className="text-sm text-muted-foreground">No upcoming due dates.</p>}
            {upcoming.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 rounded-md border p-2 text-sm">
                <span className="line-clamp-1">{t.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{formatDate(t.due_date)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <ClickUpStatCard label="Team productivity" value={team.productivity} icon={Gauge} />
        <ClickUpStatCard label="Tasks / member" value={team.tasks_per_member} icon={Layers} />
        <ClickUpStatCard
          label="Avg completion"
          value={team.avg_completion_hours ? `${team.avg_completion_hours}h` : "—"}
          icon={Timer}
        />
        <ClickUpStatCard
          label="Inactive members"
          value={team.inactive_members}
          icon={Users}
          hint={`${statusDistribution.length} distinct statuses`}
        />
      </div>
    </div>
  );
}

export function ClickUpTeamAnalytics() {
  const q = useClickUpAnalytics(true);
  if (q.isLoading) return <Skeleton className="h-[480px] w-full" />;
  if (!q.data) return <EmptyState icon={Users} title="No team data" description="Sync ClickUp to compute productivity." />;

  const { workload, team, heatmap, weekdays } = q.data;
  const maxHours = Math.max(1, ...heatmap.flatMap((r) => r.cells.map((c) => c.hours)));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <ClickUpStatCard label="Active members" value={team.active_members} icon={Users} />
        <ClickUpStatCard label="Inactive members" value={team.inactive_members} icon={Users} />
        <ClickUpStatCard label="Tasks / member" value={team.tasks_per_member} icon={ListChecks} />
        <ClickUpStatCard label="Team productivity" value={team.productivity} icon={Gauge} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Employee productivity</CardTitle>
          <CardDescription className="text-xs">
            Assignment, throughput, cycle time, effort and efficiency per member.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Member</th>
                <th className="py-2 pr-3 font-medium">Assigned</th>
                <th className="py-2 pr-3 font-medium">Completed</th>
                <th className="py-2 pr-3 font-medium">Completion %</th>
                <th className="py-2 pr-3 font-medium">Avg time</th>
                <th className="py-2 pr-3 font-medium">Hours</th>
                <th className="py-2 pr-3 font-medium">Workload</th>
                <th className="py-2 pr-3 font-medium">Efficiency</th>
                <th className="py-2 pr-3 font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {workload.map((m) => (
                <tr key={m.member} className="border-b last:border-0">
                  <td className="py-2 pr-3 font-medium">{m.member}</td>
                  <td className="py-2 pr-3 tabular-nums">{m.assigned}</td>
                  <td className="py-2 pr-3 tabular-nums">{m.completed}</td>
                  <td className="py-2 pr-3 tabular-nums">{m.completion_rate}%</td>
                  <td className="py-2 pr-3 tabular-nums">{m.avg_completion_hours ? `${m.avg_completion_hours}h` : "—"}</td>
                  <td className="py-2 pr-3 tabular-nums">{m.hours_logged}</td>
                  <td className="py-2 pr-3 tabular-nums">
                    {m.open} open{m.overdue ? ` · ${m.overdue} late` : ""}
                  </td>
                  <td className="py-2 pr-3 tabular-nums">{m.efficiency ? `${m.efficiency}%` : "—"}</td>
                  <td className="py-2 pr-3">
                    <Badge variant={m.productivity >= 70 ? "default" : m.productivity >= 40 ? "secondary" : "outline"}>
                      {m.productivity}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Workload heatmap</CardTitle>
          <CardDescription className="text-xs">Hours logged by weekday.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {heatmap.length === 0 ? (
            <p className="text-sm text-muted-foreground">No time entries synced yet.</p>
          ) : (
            <table className="min-w-[520px] text-xs">
              <thead>
                <tr>
                  <th className="py-1 pr-3 text-left font-medium text-muted-foreground">Member</th>
                  {weekdays.map((d) => (
                    <th key={d} className="px-1 py-1 text-center font-medium text-muted-foreground">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmap.map((row) => (
                  <tr key={row.member}>
                    <td className="py-1 pr-3 font-medium">{row.member}</td>
                    {row.cells.map((c) => (
                      <td key={c.day} className="px-1 py-1">
                        <div
                          className="flex h-8 w-12 items-center justify-center rounded text-[11px] tabular-nums"
                          style={{
                            backgroundColor: `color-mix(in srgb, hsl(var(--primary)) ${Math.round(
                              (c.hours / maxHours) * 85,
                            )}%, transparent)`,
                          }}
                          title={`${c.hours}h`}
                        >
                          {c.hours || ""}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}