import { useMemo, useState } from "react";
import { Brain, Download, FileSpreadsheet, FileText, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/common/page-header";
import { DataTable, type Column } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAiIntelligence, useSaveAiSettings } from "../hooks";
import { exportExecutiveSummaryPdf, exportGroupsCsv, exportScoresCsv, exportScoresExcel } from "../lib/export";
import {
  SUB_SCORE_KEYS,
  SUB_SCORE_LABELS,
  type AiSettings,
  type EmployeeScore,
  type GroupScore,
} from "../types";

const ALL = "__all__";

function scoreTone(v: number) {
  return v >= 75 ? "text-emerald-600" : v >= 50 ? "text-amber-600" : "text-destructive";
}

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function GroupTable({ rows, title }: { rows: GroupScore[]; title: string }) {
  const columns: Column<GroupScore>[] = [
    { key: "rank", header: "#", cell: (r) => r.rank, sortValue: (r) => r.rank },
    { key: "name", header: title, cell: (r) => <span className="font-medium">{r.name}</span>, sortValue: (r) => r.name },
    { key: "headcount", header: "People", cell: (r) => r.headcount, sortValue: (r) => r.headcount },
    {
      key: "average",
      header: "Avg score",
      cell: (r) => <span className={scoreTone(r.average)}>{r.average}</span>,
      sortValue: (r) => r.average,
    },
    { key: "completion", header: "Completion", cell: (r) => `${r.completionRate}%`, sortValue: (r) => r.completionRate },
  ];
  return <DataTable rows={rows} columns={columns} searchPlaceholder={`Search ${title.toLowerCase()}…`} pageSize={8} />;
}

export function AiIntelligenceModule() {
  const { data, isPending } = useAiIntelligence();
  const save = useSaveAiSettings();
  const [dept, setDept] = useState(ALL);
  const [team, setTeam] = useState(ALL);
  const [manager, setManager] = useState(ALL);
  const [selected, setSelected] = useState<EmployeeScore | null>(null);
  const [draft, setDraft] = useState<AiSettings | null>(null);

  const employees = useMemo(() => {
    const list = data?.employees ?? [];
    return list.filter(
      (e) =>
        (dept === ALL || e.departmentId === dept) &&
        (team === ALL || e.teamId === team) &&
        (manager === ALL || e.managerId === manager),
    );
  }, [data, dept, team, manager]);

  const managers = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of data?.employees ?? []) if (e.managerId && e.managerName) map.set(e.managerId, e.managerName);
    return [...map.entries()];
  }, [data]);

  const settings = draft ?? data?.settings ?? null;

  if (isPending || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  const scoreColumns: Column<EmployeeScore>[] = [
    { key: "rank", header: "#", cell: (r) => r.orgRank, sortValue: (r) => r.orgRank },
    {
      key: "name",
      header: "Employee",
      cell: (r) => (
        <button type="button" className="text-left hover:underline" onClick={() => setSelected(r)}>
          <span className="font-medium">{r.name}</span>
          <span className="block text-xs text-muted-foreground">{r.designation ?? r.email}</span>
        </button>
      ),
      sortValue: (r) => r.name,
    },
    { key: "dept", header: "Department", cell: (r) => r.departmentName ?? "—", sortValue: (r) => r.departmentName ?? "" },
    { key: "team", header: "Team", cell: (r) => r.teamName ?? "—", sortValue: (r) => r.teamName ?? "" },
    {
      key: "overall",
      header: "AI score",
      cell: (r) => <span className={`font-semibold ${scoreTone(r.overall)}`}>{r.overall}</span>,
      sortValue: (r) => r.overall,
    },
    { key: "github", header: "GitHub", cell: (r) => r.subScores.github, sortValue: (r) => r.subScores.github },
    { key: "jira", header: "Jira", cell: (r) => r.subScores.jira, sortValue: (r) => r.subScores.jira },
    { key: "clickup", header: "ClickUp", cell: (r) => r.subScores.clickup, sortValue: (r) => r.subScores.clickup },
    {
      key: "completion",
      header: "Completion",
      cell: (r) => `${r.productivity.taskCompletionRate}%`,
      sortValue: (r) => r.productivity.taskCompletionRate,
    },
    {
      key: "risk",
      header: "Risk",
      cell: (r) =>
        r.workload.burnoutRisk === "high" ? (
          <Badge variant="destructive">Burnout</Badge>
        ) : r.risks.length ? (
          <Badge variant="secondary">{r.risks.length}</Badge>
        ) : (
          <Badge variant="outline">None</Badge>
        ),
      sortValue: (r) => r.risks.length,
    },
  ];

  return (
    <div>
      <PageHeader
        title="AI Intelligence"
        description={`Explainable workforce scores computed from GitHub, Jira, ClickUp and imported data — updated ${new Date(data.generatedAt).toLocaleString()}.`}
        actions={
          data.canManage ? (
            <>
              <Button variant="outline" size="sm" onClick={() => exportScoresCsv(employees)}>
                <Download className="mr-1.5 h-4 w-4" /> CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportScoresExcel(employees)}>
                <FileSpreadsheet className="mr-1.5 h-4 w-4" /> Excel
              </Button>
              <Button size="sm" onClick={() => exportExecutiveSummaryPdf(data)}>
                <FileText className="mr-1.5 h-4 w-4" /> Summary PDF
              </Button>
            </>
          ) : undefined
        }
      />

      {!data.canManage && data.employees.length === 0 ? (
        <EmptyState
          icon={Brain}
          title="No AI profile yet"
          description="Your account is not linked to an employee record with synchronized activity."
        />
      ) : (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="flex w-full flex-wrap justify-start">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="scores">Employee Scores</TabsTrigger>
            {data.canManage && <TabsTrigger value="leaderboards">Leaderboards</TabsTrigger>}
            <TabsTrigger value="predictions">Predictions</TabsTrigger>
            {data.canManage && <TabsTrigger value="recommendations">Recommendations</TabsTrigger>}
            <TabsTrigger value="insights">Insights</TabsTrigger>
            {data.canManage && <TabsTrigger value="settings">Admin Settings</TabsTrigger>}
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Average AI score" value={data.totals.averageScore} hint={`${data.totals.scored} employees with activity`} />
              <StatCard label="Overall productivity" value={`${data.totals.overallProductivity}%`} hint="Completed vs assigned work" />
              <StatCard label="High performers" value={data.totals.highPerformers} hint={`${data.totals.needsSupport} need support`} />
              <StatCard label="Burnout alerts" value={data.totals.burnoutAlerts} hint={`${data.totals.inactive} inactive employees`} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Score distribution</CardTitle>
                  <CardDescription>How AI scores spread across the workforce</CardDescription>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.distribution}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="bucket" fontSize={11} />
                      <YAxis allowDecimals={false} fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Activity trend</CardTitle>
                  <CardDescription>Weekly tracked events and active employees</CardDescription>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.trend}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="week" fontSize={11} />
                      <YAxis fontSize={11} />
                      <Tooltip />
                      <Line type="monotone" dataKey="events" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="activeEmployees" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {data.canManage && (
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle className="text-base">Department ranking</CardTitle>
                      <CardDescription>Average score per department</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => exportGroupsCsv(data.departments)}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <GroupTable rows={data.departments} title="Department" />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Team ranking</CardTitle>
                    <CardDescription>Average score per team</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <GroupTable rows={data.teams} title="Team" />
                  </CardContent>
                </Card>
              </div>
            )}

            {data.canManage && (
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Top 10 employees</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {data.employees.slice(0, 10).map((e) => (
                      <div key={e.id} className="flex items-center gap-3 text-sm">
                        <span className="w-5 text-muted-foreground">{e.orgRank}</span>
                        <span className="min-w-0 flex-1 truncate">{e.name}</span>
                        <Progress value={e.overall} className="h-1.5 w-24" />
                        <span className={`w-10 text-right font-medium ${scoreTone(e.overall)}`}>{e.overall}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Bottom 10 employees</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {[...data.employees].slice(-10).reverse().map((e) => (
                      <div key={e.id} className="flex items-center gap-3 text-sm">
                        <span className="w-5 text-muted-foreground">{e.orgRank}</span>
                        <span className="min-w-0 flex-1 truncate">{e.name}</span>
                        <Progress value={e.overall} className="h-1.5 w-24" />
                        <span className={`w-10 text-right font-medium ${scoreTone(e.overall)}`}>{e.overall}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="scores" className="space-y-4">
            {data.canManage && (
              <div className="flex flex-wrap gap-2">
                <Select value={dept} onValueChange={setDept}>
                  <SelectTrigger className="h-9 w-44"><SelectValue placeholder="Department" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All departments</SelectItem>
                    {data.departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={team} onValueChange={setTeam}>
                  <SelectTrigger className="h-9 w-40"><SelectValue placeholder="Team" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All teams</SelectItem>
                    {data.teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={manager} onValueChange={setManager}>
                  <SelectTrigger className="h-9 w-44"><SelectValue placeholder="Manager" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All managers</SelectItem>
                    {managers.map(([id, name]) => (
                      <SelectItem key={id} value={id}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <DataTable
              rows={employees}
              columns={scoreColumns}
              searchPlaceholder="Search employee, department, team…"
              searchFn={(r, q) =>
                [r.name, r.email, r.departmentName, r.teamName, r.designation]
                  .filter(Boolean)
                  .some((v) => String(v).toLowerCase().includes(q))
              }
              emptyIcon={Brain}
              emptyTitle="No scored employees"
              emptyDescription="Sync GitHub, Jira or ClickUp — or import data — to generate AI scores."
              pageSize={12}
            />
          </TabsContent>

          {data.canManage && (
            <TabsContent value="leaderboards">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {data.leaderboards.map((b) => (
                  <Card key={b.key}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{b.title}</CardTitle>
                      <CardDescription>{b.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-1.5">
                      {b.entries.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No data yet.</p>
                      ) : (
                        b.entries.map((e, i) => (
                          <div key={e.employeeId} className="flex items-center gap-2 text-sm">
                            <span className="w-4 text-muted-foreground">{i + 1}</span>
                            <span className="min-w-0 flex-1 truncate">{e.name}</span>
                            <span className="font-medium">{e.value}</span>
                            <span className="text-xs text-muted-foreground">{e.unit}</span>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          )}

          <TabsContent value="predictions" className="space-y-4">
            <DataTable
              rows={employees}
              columns={[
                { key: "name", header: "Employee", cell: (r) => r.name, sortValue: (r) => r.name },
                { key: "future", header: "Future productivity", cell: (r) => r.prediction.futureProductivity, sortValue: (r) => r.prediction.futureProductivity },
                { key: "promo", header: "Promotion readiness", cell: (r) => r.prediction.promotionReadiness, sortValue: (r) => r.prediction.promotionReadiness },
                {
                  key: "attrition",
                  header: "Attrition risk",
                  cell: (r) => (
                    <span className={r.prediction.attritionRisk >= 60 ? "text-destructive" : ""}>
                      {r.prediction.attritionRisk}
                    </span>
                  ),
                  sortValue: (r) => r.prediction.attritionRisk,
                },
                { key: "project", header: "Project success", cell: (r) => r.prediction.projectSuccess, sortValue: (r) => r.prediction.projectSuccess },
                { key: "trend", header: "Trend", cell: (r) => `${r.consistency.trend > 0 ? "+" : ""}${r.consistency.trend}%`, sortValue: (r) => r.consistency.trend },
              ]}
              pageSize={12}
              emptyIcon={TrendingUp}
              emptyTitle="No predictions available"
            />
            {data.canManage && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Team performance outlook</CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.teams}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="average" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {data.canManage && (
            <TabsContent value="recommendations">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {[
                  { title: "Promotion candidates", items: data.recommendations.promotion.map((e) => `${e.name} — readiness ${e.value}`) },
                  { title: "High performers", items: data.recommendations.highPerformers.map((e) => `${e.name} — score ${e.value}`) },
                  { title: "Needing support", items: data.recommendations.needSupport.map((e) => `${e.name} — score ${e.value}`) },
                  { title: "Training recommendations", items: data.recommendations.training.map((e) => `${e.name} — ${e.detail}`) },
                  { title: "Skill gaps", items: data.recommendations.skillGaps.map((e) => `${e.name} — ${e.detail}`) },
                  { title: "Project assignments", items: data.recommendations.projectAssignments.map((e) => `${e.name} — ${e.detail}`) },
                  { title: "Potential team leads", items: data.recommendations.potentialLeads.map((e) => `${e.name} — leadership ${e.value}`) },
                ].map((group) => (
                  <Card key={group.title}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{group.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1.5 text-sm">
                      {group.items.length === 0 ? (
                        <p className="text-muted-foreground">Nothing flagged.</p>
                      ) : (
                        group.items.map((t) => <p key={t}>• {t}</p>)
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          )}

          <TabsContent value="insights" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">AI insights</CardTitle>
                <CardDescription>Generated from synchronized activity data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {data.insights.length === 0 ? (
                  <p className="text-muted-foreground">No insights yet — run a sync or import data.</p>
                ) : (
                  data.insights.map((i) => (
                    <div key={i.id} className="flex items-start gap-2">
                      <Badge variant={i.kind === "warning" ? "destructive" : i.kind === "positive" ? "default" : "secondary"}>
                        {i.kind}
                      </Badge>
                      <p className="pt-0.5">{i.text}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Risk detection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {data.risks.length === 0 ? (
                  <p className="text-muted-foreground">No risks detected.</p>
                ) : (
                  data.risks.slice(0, 40).map((r, i) => (
                    <div key={`${r.employeeId}-${r.key}-${i}`} className="flex flex-wrap items-center gap-2">
                      <Badge variant={r.level === "high" ? "destructive" : "secondary"}>{r.label}</Badge>
                      <span className="font-medium">{r.name}</span>
                      <span className="text-muted-foreground">{r.detail}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {data.canManage && settings && (
            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Score weights</CardTitle>
                  <CardDescription>
                    Weights are normalized automatically. Current total:{" "}
                    {SUB_SCORE_KEYS.reduce((a, k) => a + (settings.weights[k] || 0), 0)}%
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {SUB_SCORE_KEYS.map((k) => (
                    <div key={k} className="space-y-1">
                      <Label htmlFor={`w-${k}`}>{SUB_SCORE_LABELS[k]} (%)</Label>
                      <Input
                        id={`w-${k}`}
                        type="number"
                        min={0}
                        max={100}
                        value={settings.weights[k]}
                        onChange={(e) =>
                          setDraft({
                            ...settings,
                            weights: { ...settings.weights, [k]: Number(e.target.value) || 0 },
                          })
                        }
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Thresholds & AI rules</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(Object.keys(settings.thresholds) as (keyof typeof settings.thresholds)[]).map((k) => (
                    <div key={k} className="space-y-1">
                      <Label htmlFor={`t-${k}`}>{k}</Label>
                      <Input
                        id={`t-${k}`}
                        type="number"
                        value={settings.thresholds[k]}
                        onChange={(e) =>
                          setDraft({
                            ...settings,
                            thresholds: { ...settings.thresholds, [k]: Number(e.target.value) || 0 },
                          })
                        }
                      />
                    </div>
                  ))}
                  <div className="space-y-1">
                    <Label htmlFor="lookback">Lookback window (days)</Label>
                    <Input
                      id="lookback"
                      type="number"
                      min={7}
                      max={365}
                      value={settings.rules.lookbackDays}
                      onChange={(e) =>
                        setDraft({
                          ...settings,
                          rules: { ...settings.rules, lookbackDays: Number(e.target.value) || 90 },
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-md border p-3 sm:col-span-2">
                    <div>
                      <Label>Include terminated employees</Label>
                      <p className="text-xs text-muted-foreground">Ranking rule for inactive records</p>
                    </div>
                    <Switch
                      checked={settings.rules.includeInactiveEmployees}
                      onCheckedChange={(v) =>
                        setDraft({ ...settings, rules: { ...settings.rules, includeInactiveEmployees: v } })
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button onClick={() => save.mutate(settings)} disabled={save.isPending}>
                  {save.isPending ? "Saving…" : "Save & recalculate"}
                </Button>
                <Button variant="outline" onClick={() => setDraft(null)} disabled={!draft}>
                  Reset changes
                </Button>
              </div>
            </TabsContent>
          )}
        </Tabs>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.name} — AI profile</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-4">
                <StatCard label="Overall score" value={selected.overall} />
                <StatCard label="Org rank" value={`#${selected.orgRank}`} />
                <StatCard label="Department rank" value={`#${selected.departmentRank}`} />
                <StatCard label="Team rank" value={`#${selected.teamRank}`} />
              </div>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Sub scores</CardTitle>
                </CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={SUB_SCORE_KEYS.map((k) => ({ key: SUB_SCORE_LABELS[k], value: selected.subScores[k] }))}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="key" fontSize={10} />
                      <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Historical trend</CardTitle>
                </CardHeader>
                <CardContent className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={selected.history}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="period" fontSize={10} />
                      <YAxis fontSize={10} />
                      <Tooltip />
                      <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <div className="grid gap-3 sm:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Achievements</CardTitle></CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    {selected.achievements.length ? selected.achievements.map((a) => <p key={a}>• {a}</p>) : <p className="text-muted-foreground">None yet.</p>}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Growth areas</CardTitle></CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    {selected.growthAreas.length ? selected.growthAreas.map((a) => <p key={a}>• {a}</p>) : <p className="text-muted-foreground">Balanced profile.</p>}
                  </CardContent>
                </Card>
                <Card className="sm:col-span-2">
                  <CardHeader className="pb-2"><CardTitle className="text-base">Recommendations</CardTitle></CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    {selected.recommendations.length ? selected.recommendations.map((a) => <p key={a}>• {a}</p>) : <p className="text-muted-foreground">No actions required.</p>}
                  </CardContent>
                </Card>
              </div>
              <Button variant="outline" size="sm" onClick={() => exportScoresCsv([selected], `scorecard-${selected.name}`)}>
                <Download className="mr-1.5 h-4 w-4" /> Export scorecard
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}