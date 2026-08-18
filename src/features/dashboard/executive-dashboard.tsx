import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Activity, AlertTriangle, ArrowUpRight, Award, BarChart3, Brain, Download,
  FileSpreadsheet, FileText, Flame, Sparkles, TrendingUp, UserPlus, Users,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAiIntelligence } from "@/features/ai-engine/hooks";
import { exportExecutiveSummaryPdf, exportGroupsCsv, exportScoresCsv, exportScoresExcel } from "@/features/ai-engine/lib/export";
import type { EmployeeScore } from "@/features/ai-engine/types";

export function ExecutiveDashboard() {
  const { data, isLoading } = useAiIntelligence();

  const derived = useMemo(() => {
    const employees = data?.employees ?? [];
    const sorted = [...employees].sort((a, b) => b.overall - a.overall);
    const promotion = [...employees]
      .filter((e) => e.prediction.promotionReadiness >= 70)
      .sort((a, b) => b.prediction.promotionReadiness - a.prediction.promotionReadiness);
    const burnout = employees
      .filter((e) => e.workload.burnoutRisk !== "low")
      .sort((a, b) => b.workload.overdue - a.workload.overdue);
    const capacity = employees.length
      ? Math.round(employees.reduce((s, e) => s + e.workload.capacity, 0) / employees.length)
      : 0;
    const overloaded = employees.filter((e) => e.workload.capacity >= 85).length;
    const idle = employees.filter((e) => e.workload.idleRisk !== "low").length;
    return { employees, sorted, promotion, burnout, capacity, overloaded, idle };
  }, [data]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-72 w-full lg:col-span-2" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
  }

  if (!data || !data.employees.length) {
    return (
      <div>
        <PageHeader title="Executive Dashboard" description="Workforce intelligence across delivery, productivity and risk." />
        <EmptyState
          icon={BarChart3}
          title="No workforce data yet"
          description="Connect GitHub, Jira or ClickUp, upload an Excel snapshot, or enable demo mode from Administration to populate executive analytics."
          action={<Button asChild><Link to="/administration"><Sparkles className="mr-2 h-4 w-4" /> Go to Administration</Link></Button>}
        />
      </div>
    );
  }

  const { sorted, promotion, burnout, capacity, overloaded, idle } = derived;
  const t = data.totals;

  const stats = [
    { label: "Employees scored", value: `${t.scored}/${t.employees}`, icon: Users, hint: `Avg score ${t.averageScore}` },
    { label: "High performers", value: String(t.highPerformers), icon: Award, hint: `${t.promotionCandidates} promotion-ready` },
    { label: "Burnout alerts", value: String(t.burnoutAlerts), icon: Flame, hint: `${idle} under-utilised` },
    { label: "Workforce capacity", value: `${capacity}%`, icon: Activity, hint: `${overloaded} over 85%` },
  ];

  return (
    <div className="animate-in fade-in duration-300">
      <PageHeader
        title="Executive Dashboard"
        description="Top performers, promotion candidates, risk alerts and department productivity — computed from synchronized delivery data."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => exportScoresCsv(data.employees)}>
              <Download className="mr-2 h-4 w-4" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => void exportScoresExcel(data.employees)}>
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
            </Button>
            <Button size="sm" onClick={() => void exportExecutiveSummaryPdf(data)}>
              <FileText className="mr-2 h-4 w-4" /> Executive PDF
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight">{s.value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Team performance trend</CardTitle>
            <CardDescription>Weekly delivery events and active contributors.</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.trend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="week" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="events" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Events" />
                <Line type="monotone" dataKey="activeEmployees" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} name="Active people" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">AI executive insights</CardTitle>
              <CardDescription>Generated from the latest scoring run.</CardDescription>
            </div>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            {data.insights.slice(0, 6).map((i) => (
              <div key={i.id} className="rounded-lg border p-3 text-sm">
                <Badge
                  variant={i.kind === "warning" ? "destructive" : i.kind === "positive" ? "default" : "secondary"}
                  className="mb-1 text-[10px] capitalize"
                >
                  {i.kind}
                </Badge>
                <p className="text-muted-foreground">{i.text}</p>
              </div>
            ))}
            {!data.insights.length && <p className="text-sm text-muted-foreground">No insights yet.</p>}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <PeopleCard title="Top performers" icon={Award} description="Highest overall AI score." people={sorted.slice(0, 6)} metric={(e) => `${e.overall}`} />
        <PeopleCard
          title="Promotion candidates"
          icon={TrendingUp}
          description="Readiness above 70%."
          people={promotion.slice(0, 6)}
          metric={(e) => `${e.prediction.promotionReadiness}%`}
          empty="No promotion-ready employees in this cycle."
        />
        <PeopleCard
          title="Burnout risks"
          icon={Flame}
          description="Overload and overdue signals."
          people={burnout.slice(0, 6)}
          metric={(e) => e.workload.burnoutRisk}
          tone="destructive"
          empty="No burnout signals detected."
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Department productivity</CardTitle>
              <CardDescription>Average AI score by department.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => exportGroupsCsv(data.departments, "departments")}>
              <Download className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="h-64">
            {data.departments.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.departments.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="average" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Avg score" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">No departments yet.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workforce capacity</CardTitle>
            <CardDescription>Utilisation and allocation health.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-muted-foreground">Average utilisation</span>
                <span className="font-medium">{capacity}%</span>
              </div>
              <Progress value={capacity} />
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: "Overloaded", value: overloaded },
                { label: "Balanced", value: Math.max(0, derived.employees.length - overloaded - idle) },
                { label: "Available", value: idle },
              ].map((b) => (
                <div key={b.label} className="rounded-lg border p-3">
                  <div className="text-xl font-semibold">{b.value}</div>
                  <div className="text-xs text-muted-foreground">{b.label}</div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {data.teams.slice(0, 5).map((tm) => (
                <div key={tm.id} className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
                  <span className="truncate">{tm.name}</span>
                  <span className="text-muted-foreground">{tm.headcount} people · avg {tm.average}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Project risk alerts</CardTitle>
              <CardDescription>Lowest performing project cohorts.</CardDescription>
            </div>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            {[...data.projects].sort((a, b) => a.average - b.average).slice(0, 6).map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.headcount} allocated · {p.completionRate}% completion</div>
                </div>
                <Badge variant={p.average < 50 ? "destructive" : p.average < 70 ? "secondary" : "outline"}>{p.average}</Badge>
              </div>
            ))}
            {!data.projects.length && <p className="text-sm text-muted-foreground">No project data yet.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Hiring recommendations</CardTitle>
              <CardDescription>Skill gaps and coverage pressure.</CardDescription>
            </div>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            {(data.recommendations.skillGaps.length
              ? data.recommendations.skillGaps
              : data.recommendations.training
            )
              .slice(0, 6)
              .map((r) => (
                <div key={`${r.employeeId}-${r.detail}`} className="rounded-lg border p-3 text-sm">
                  <div className="font-medium">{r.name}</div>
                  <p className="text-xs text-muted-foreground">{r.detail}</p>
                </div>
              ))}
            {overloaded > 0 && (
              <div className="rounded-lg border border-dashed p-3 text-sm">
                <div className="font-medium">Add capacity</div>
                <p className="text-xs text-muted-foreground">
                  {overloaded} employees are running above 85% utilisation — consider {Math.max(1, Math.ceil(overloaded / 4))} additional hire(s).
                </p>
              </div>
            )}
            {!data.recommendations.skillGaps.length && !data.recommendations.training.length && overloaded === 0 && (
              <p className="text-sm text-muted-foreground">No hiring pressure detected.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PeopleCard({
  title, description, icon: Icon, people, metric, tone, empty,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  people: EmployeeScore[];
  metric: (e: EmployeeScore) => string;
  tone?: "destructive";
  empty?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-2">
        {people.map((e) => (
          <Link
            key={e.id}
            to="/employees/$id"
            params={{ id: e.id }}
            className="flex items-center justify-between rounded-lg border p-2.5 text-sm transition-colors hover:bg-accent"
          >
            <div className="min-w-0">
              <div className="truncate font-medium">{e.name}</div>
              <div className="truncate text-xs text-muted-foreground">{e.designation ?? e.departmentName ?? "—"}</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={tone === "destructive" ? "destructive" : "secondary"} className="capitalize">{metric(e)}</Badge>
              <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </Link>
        ))}
        {!people.length && <p className="text-sm text-muted-foreground">{empty ?? "Nothing to show yet."}</p>}
      </CardContent>
    </Card>
  );
}
