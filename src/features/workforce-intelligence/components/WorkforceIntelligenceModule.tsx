import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  AlertTriangle, ArrowLeftRight, Brain, Download, FileSpreadsheet, FileText, Gauge,
  LayoutGrid, Layers, Sparkles, TrendingUp, UserPlus, Users,
} from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAiIntelligence } from "@/features/ai-engine/hooks";
import {
  buildBench, buildCapacityPlan, buildHeatmap, buildPromotionEngine, buildRiskAlerts,
  buildSkillCoverage, buildSkillGaps, insightsFor, type SkillRow,
} from "../lib/compute";
import { exportRowsCsv, exportRowsExcel, exportSectionsPdf } from "../lib/export";

function useOrgSkills() {
  return useQuery({
    queryKey: ["workforce", "skills"],
    staleTime: 60_000,
    queryFn: async (): Promise<SkillRow[]> => {
      const { data, error } = await supabase
        .from("employee_skills")
        .select("employee_id, proficiency, years_experience, skills(name, category)");
      if (error) throw error;
      return (data ?? []).map((r) => {
        const s = Array.isArray(r.skills) ? r.skills[0] : r.skills;
        return {
          employee_id: r.employee_id as string,
          proficiency: r.proficiency as string | null,
          years_experience: r.years_experience as number | null,
          skillName: s?.name ?? "Unknown",
          skillCategory: s?.category ?? "General",
        };
      });
    },
  });
}

function heatClass(value: number) {
  if (value >= 80) return "bg-primary text-primary-foreground";
  if (value >= 65) return "bg-primary/70 text-primary-foreground";
  if (value >= 50) return "bg-primary/40";
  if (value >= 35) return "bg-muted";
  return "bg-destructive/20";
}

export function WorkforceIntelligenceModule() {
  const { data, isLoading } = useAiIntelligence();
  const skills = useOrgSkills();
  const [groupBy, setGroupBy] = useState<"department" | "team">("department");

  const model = useMemo(() => {
    if (!data) return null;
    const employees = data.employees;
    const rows = skills.data ?? [];
    const plan = buildCapacityPlan(employees, groupBy);
    const coverage = buildSkillCoverage(rows, employees.length);
    const gaps = buildSkillGaps(coverage);
    return {
      plan,
      coverage,
      gaps,
      bench: buildBench(employees, rows),
      heatmap: buildHeatmap(employees, groupBy),
      promotions: buildPromotionEngine(employees),
      alerts: buildRiskAlerts(data, gaps),
      insights: insightsFor(plan, coverage, gaps, data.departments),
    };
  }, [data, skills.data, groupBy]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (!data || !model || !data.employees.length) {
    return (
      <div>
        <PageHeader title="Workforce Intelligence" description="Heatmaps, capacity planning, skills coverage and workforce risk." />
        <EmptyState
          icon={LayoutGrid}
          title="No workforce signals yet"
          description="Connect GitHub, Jira or ClickUp, import an Excel snapshot, or enable demo mode from Administration to unlock workforce intelligence."
          action={<Button asChild><Link to="/administration"><Sparkles className="mr-2 h-4 w-4" /> Go to Administration</Link></Button>}
        />
      </div>
    );
  }

  const { plan, coverage, gaps, bench, heatmap, promotions, alerts, insights } = model;

  const exportWorkforcePdf = () =>
    exportSectionsPdf(
      "Workforce Intelligence Report",
      [
        { heading: "AI insights", lines: insights },
        { heading: "Capacity", lines: [
          `Average utilisation ${plan.averageCapacity}%`,
          `${plan.overallocated.length} overallocated · ${plan.balanced.length} balanced · ${plan.available.length} available`,
          ...plan.shortages.map((s) => `${s.area}: ${s.detail}`),
        ] },
        { heading: "Recommended transfers", lines: plan.transfers.map((t) => `${t.employee}: ${t.from} → ${t.to}. ${t.reason}`) },
        { heading: "Hiring recommendations", lines: plan.hiring.map((h) => `${h.area}: ${h.count} hire(s). ${h.reason}`) },
        { heading: "Skill gaps", lines: gaps.map((g) => `${g.skill} (${g.coverage}% coverage): ${g.recommendation}`) },
        { heading: "Promotion candidates", lines: promotions.slice(0, 10).map((p) => `${p.employee.name} — score ${p.promotionScore}. ${p.recommendation}`) },
        { heading: "Risk alerts", lines: alerts.slice(0, 20).map((a) => `[${a.level}] ${a.category} — ${a.subject}: ${a.detail}`) },
      ],
      "workforce-intelligence-report",
    );

  const capacityRows = plan.groups.map((g) => ({
    Group: g.name, Headcount: g.headcount, "Avg capacity %": g.avgCapacity,
    Overallocated: g.overallocated, Available: g.available, "Avg AI score": g.avgScore,
  }));

  return (
    <div className="animate-in fade-in duration-300">
      <PageHeader
        title="Workforce Intelligence"
        description="Heatmaps, capacity planning, skills coverage, promotion readiness and workforce risk — computed from synchronized delivery data."
        actions={
          <>
            <Select value={groupBy} onValueChange={(v) => setGroupBy(v as "department" | "team")}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="department">By department</SelectItem>
                <SelectItem value="team">By team</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => exportRowsCsv(capacityRows, "workforce-capacity")}>
              <Download className="mr-2 h-4 w-4" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => void exportRowsExcel(capacityRows, "workforce-capacity", "Capacity")}>
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
            </Button>
            <Button size="sm" onClick={() => void exportWorkforcePdf()}>
              <FileText className="mr-2 h-4 w-4" /> PDF report
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Avg utilisation" value={`${plan.averageCapacity}%`} hint={`${plan.overallocated.length} overallocated`} icon={Gauge} />
        <Stat label="Bench strength" value={String(plan.available.length)} hint="Available for new work" icon={Users} />
        <Stat label="Skills tracked" value={String(coverage.length)} hint={`${gaps.length} with thin coverage`} icon={Layers} />
        <Stat label="Open risks" value={String(alerts.length)} hint={`${alerts.filter((a) => a.level === "high").length} high severity`} icon={AlertTriangle} />
      </div>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">AI-generated executive insights</CardTitle>
            <CardDescription>Derived from the latest scoring run across every connected source.</CardDescription>
          </div>
          <Brain className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2">
          {insights.map((i) => (
            <div key={i} className="rounded-lg border p-3 text-sm text-muted-foreground">{i}</div>
          ))}
          {!insights.length && <p className="text-sm text-muted-foreground">No insights available yet.</p>}
        </CardContent>
      </Card>

      <Tabs defaultValue="heatmap" className="mt-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
          <TabsTrigger value="capacity">Capacity planning</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="bench">Bench strength</TabsTrigger>
          <TabsTrigger value="promotion">Promotion engine</TabsTrigger>
          <TabsTrigger value="risk">Risk analysis</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="heatmap" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Workforce heatmap</CardTitle>
              <CardDescription>Performance, utilisation and risk per {groupBy}.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-muted-foreground">
                    <th className="pb-2 font-medium">{groupBy === "department" ? "Department" : "Team"}</th>
                    <th className="pb-2 font-medium">People</th>
                    <th className="pb-2 font-medium">AI score</th>
                    <th className="pb-2 font-medium">Delivery</th>
                    <th className="pb-2 font-medium">Quality</th>
                    <th className="pb-2 font-medium">Utilisation</th>
                    <th className="pb-2 font-medium">Burnout</th>
                  </tr>
                </thead>
                <tbody>
                  {heatmap.map((c) => (
                    <tr key={c.groupId} className="border-t">
                      <td className="py-2 pr-3 font-medium">{c.groupName}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{c.headcount}</td>
                      <td className="py-2 pr-3"><HeatCellBox value={c.score} /></td>
                      <td className="py-2 pr-3"><HeatCellBox value={c.delivery} /></td>
                      <td className="py-2 pr-3"><HeatCellBox value={c.quality} /></td>
                      <td className="py-2 pr-3"><HeatCellBox value={c.capacity} /></td>
                      <td className="py-2">
                        <Badge variant={c.burnout ? "destructive" : "secondary"}>{c.burnout}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{groupBy === "department" ? "Department" : "Team"} productivity</CardTitle>
              <CardDescription>Average AI score and utilisation side by side.</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={plan.groups.slice(0, 12)}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="avgScore" name="AI score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="avgCapacity" name="Utilisation %" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="capacity" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <BucketCard title="Available" people={plan.available} hint="Under 45% utilisation" />
            <BucketCard title="Balanced" people={plan.balanced} hint="45–85% utilisation" />
            <BucketCard title="Overallocated" people={plan.overallocated} hint="Above 85% utilisation" tone="destructive" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Recommended internal transfers</CardTitle>
                  <CardDescription>Rebalance before spending on hiring.</CardDescription>
                </div>
                <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-2">
                {plan.transfers.map((t) => (
                  <div key={t.employeeId} className="rounded-lg border p-3 text-sm">
                    <div className="font-medium">{t.employee}: {t.from} → {t.to}</div>
                    <p className="mt-1 text-xs text-muted-foreground">{t.reason}</p>
                  </div>
                ))}
                {!plan.transfers.length && <p className="text-sm text-muted-foreground">Allocation is balanced — no transfers needed.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Hiring & future shortages</CardTitle>
                  <CardDescription>Where capacity runs out next.</CardDescription>
                </div>
                <UserPlus className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-2">
                {plan.hiring.map((h) => (
                  <div key={h.area} className="rounded-lg border p-3 text-sm">
                    <div className="font-medium">{h.area} · {h.count} hire(s)</div>
                    <p className="mt-1 text-xs text-muted-foreground">{h.reason}</p>
                  </div>
                ))}
                {plan.shortages.map((s) => (
                  <div key={s.area} className="rounded-lg border border-dashed p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant={s.severity === "high" ? "destructive" : "secondary"} className="capitalize">{s.severity}</Badge>
                      <span className="font-medium">{s.area}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{s.detail}</p>
                  </div>
                ))}
                {!plan.hiring.length && !plan.shortages.length && (
                  <p className="text-sm text-muted-foreground">No shortages projected for the current cycle.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{groupBy === "department" ? "Department" : "Team"} workload</CardTitle>
              <CardDescription>Utilisation and internal slack per group.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {plan.groups.map((g) => (
                <div key={g.id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium">{g.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {g.headcount} people · {g.overallocated} overloaded · {g.available} available
                    </span>
                  </div>
                  <Progress value={g.avgCapacity} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Skills coverage</CardTitle>
                <CardDescription>Share of the workforce holding each skill.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {skills.isLoading && <Skeleton className="h-40 w-full" />}
                {coverage.slice(0, 12).map((c) => (
                  <div key={c.skill}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium">{c.skill}</span>
                      <span className="text-xs text-muted-foreground">
                        {c.people} people · {c.experts} experts · {c.avgYears}y avg
                      </span>
                    </div>
                    <Progress value={c.coverage} />
                  </div>
                ))}
                {!skills.isLoading && !coverage.length && (
                  <p className="text-sm text-muted-foreground">No skills recorded yet.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Skill gap analysis</CardTitle>
                  <CardDescription>Thin coverage and single points of failure.</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => exportRowsCsv(gaps.map((g) => ({
                    Skill: g.skill, Category: g.category, People: g.people,
                    "Coverage %": g.coverage, Experts: g.experts, Risk: g.risk, Action: g.recommendation,
                  })), "skill-gaps")}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {gaps.map((g) => (
                  <div key={g.skill} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant={g.risk === "high" ? "destructive" : "secondary"} className="capitalize">{g.risk}</Badge>
                      <span className="font-medium">{g.skill}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{g.coverage}% coverage</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{g.recommendation}</p>
                  </div>
                ))}
                {!gaps.length && <p className="text-sm text-muted-foreground">No critical skill gaps detected.</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bench">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bench strength</CardTitle>
              <CardDescription>People ready to be allocated, ranked by readiness (performance + free capacity).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {bench.slice(0, 15).map((b) => (
                <Link
                  key={b.employee.id}
                  to="/employees/$id"
                  params={{ id: b.employee.id }}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-accent"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{b.employee.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {b.employee.designation ?? b.employee.departmentName ?? "—"}
                      {b.topSkills.length ? ` · ${b.topSkills.join(", ")}` : ""}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-muted-foreground">{b.employee.workload.capacity}% used</span>
                    <Badge>{b.readiness}</Badge>
                  </div>
                </Link>
              ))}
              {!bench.length && <p className="text-sm text-muted-foreground">Everyone is fully allocated.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="promotion">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Promotion readiness engine</CardTitle>
                <CardDescription>Weighted from readiness, leadership, delivery, contribution and learning.</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void exportRowsExcel(promotions.slice(0, 50).map((p) => ({
                  Name: p.employee.name, "Promotion score": p.promotionScore, Leadership: p.leadership,
                  Delivery: p.delivery, Contribution: p.contribution, Learning: p.learning,
                  Risks: p.riskFactors.join("; "), Recommendation: p.recommendation,
                })), "promotion-readiness", "Promotions")}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Export
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {promotions.slice(0, 12).map((p) => (
                <div key={p.employee.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link to="/employees/$id" params={{ id: p.employee.id }} className="font-medium hover:underline">
                      {p.employee.name}
                    </Link>
                    <Badge variant={p.promotionScore >= 80 ? "default" : "secondary"}>Score {p.promotionScore}</Badge>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-4">
                    {[
                      ["Leadership", p.leadership], ["Delivery", p.delivery],
                      ["Contribution", p.contribution], ["Learning", p.learning],
                    ].map(([label, value]) => (
                      <div key={String(label)}>
                        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                          <span>{label}</span><span>{value}</span>
                        </div>
                        <Progress value={Number(value)} />
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{p.recommendation}</p>
                  {p.riskFactors.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {p.riskFactors.map((r) => (
                        <Badge key={r} variant="outline" className="text-[10px]">{r}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Workforce risk analysis</CardTitle>
                <CardDescription>Burnout, attrition, performance decline, project dependency and skill shortage.</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportRowsCsv(alerts.map((a) => ({
                  Category: a.category, Subject: a.subject, Level: a.level, Detail: a.detail, Action: a.action,
                })), "workforce-risks")}
              >
                <Download className="mr-2 h-4 w-4" /> CSV
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {alerts.slice(0, 30).map((a) => (
                <div key={a.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={a.level === "high" ? "destructive" : "secondary"} className="capitalize">{a.level}</Badge>
                    <span className="font-medium">{a.category}</span>
                    <span className="text-muted-foreground">· {a.subject}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{a.detail}</p>
                  <p className="mt-1 text-xs"><span className="font-medium">Action:</span> {a.action}</p>
                </div>
              ))}
              {!alerts.length && <p className="text-sm text-muted-foreground">No workforce risks detected.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Workforce trends</CardTitle>
                <CardDescription>Weekly delivery events and active contributors.</CardDescription>
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.trend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="week" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="events" name="Events" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="activeEmployees" name="Active people" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Score distribution</CardTitle>
              <CardDescription>How performance is spread across the workforce.</CardDescription>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.distribution}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="bucket" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function HeatCellBox({ value }: { value: number }) {
  return (
    <span className={`inline-block min-w-10 rounded-md px-2 py-1 text-center text-xs font-medium ${heatClass(value)}`}>
      {value}
    </span>
  );
}

function Stat({
  label, value, hint, icon: Icon,
}: { label: string; value: string; hint: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function BucketCard({
  title, people, hint, tone,
}: {
  title: string;
  people: { id: string; name: string; workload: { capacity: number }; departmentName: string | null }[];
  hint: string;
  tone?: "destructive";
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title} · {people.length}</CardTitle>
        <CardDescription>{hint}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {people.slice(0, 8).map((p) => (
          <Link
            key={p.id}
            to="/employees/$id"
            params={{ id: p.id }}
            className="flex items-center justify-between rounded-lg border p-2 text-sm transition-colors hover:bg-accent"
          >
            <div className="min-w-0">
              <div className="truncate font-medium">{p.name}</div>
              <div className="truncate text-xs text-muted-foreground">{p.departmentName ?? "—"}</div>
            </div>
            <Badge variant={tone === "destructive" ? "destructive" : "secondary"}>{p.workload.capacity}%</Badge>
          </Link>
        ))}
        {!people.length && <p className="text-sm text-muted-foreground">Nobody in this bucket.</p>}
      </CardContent>
    </Card>
  );
}
