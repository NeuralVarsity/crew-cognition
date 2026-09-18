import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import {
  Activity, AlertTriangle, ArrowRight, ArrowUpRight, Award, Bot, BriefcaseBusiness,
  Building2, Flame, FolderKanban, Network, TrendingUp, UserPlus, Users,
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAiIntelligence } from "@/features/ai-engine/hooks";
import type { EmployeeScore, GroupScore } from "@/features/ai-engine/types";

const panel = "intelligence-panel overflow-hidden rounded-lg";

export function ExecutiveDashboard() {
  const { data, isLoading } = useAiIntelligence();
  const reduceMotion = useReducedMotion();
  const model = useMemo(() => {
    const employees = data?.employees ?? [];
    const top = [...employees].sort((a, b) => b.overall - a.overall);
    const promotions = [...employees].sort((a, b) => b.prediction.promotionReadiness - a.prediction.promotionReadiness);
    const risks = employees.filter((e) => e.workload.burnoutRisk !== "low").sort((a, b) => b.workload.capacity - a.workload.capacity);
    const utilization = employees.length ? Math.round(employees.reduce((sum, e) => sum + e.workload.capacity, 0) / employees.length) : 0;
    const hiringDemand = employees.filter((e) => e.workload.capacity >= 85).length;
    return { employees, top, promotions, risks, utilization, hiringDemand };
  }, [data]);

  if (isLoading || !data) return <DashboardSkeleton />;
  if (!model.employees.length) return <NoData />;

  const metrics = [
    { label: "Total employees", value: data.totals.employees, delta: "+4.8%", note: `${data.totals.scored} people have current intelligence coverage.`, icon: Users, points: [62, 66, 65, 72, 76, 81, 86] },
    { label: "Active projects", value: data.projects.length, delta: "+2.1%", note: `${data.projects.filter((p) => p.completionRate >= 70).length} projects are tracking above target.`, icon: FolderKanban, points: [54, 58, 61, 60, 66, 71, 74] },
    { label: "Promotion ready", value: data.totals.promotionCandidates, delta: "+12.4%", note: "Leadership and delivery signals indicate near-term mobility.", icon: Award, points: [38, 42, 48, 55, 54, 65, 72] },
    { label: "Burnout risk", value: data.totals.burnoutAlerts, delta: "-6.2%", note: `${model.risks.length} people need allocation review.`, icon: Flame, points: [76, 71, 74, 65, 62, 58, 54], risk: true },
    { label: "Hiring demand", value: Math.max(1, Math.ceil(model.hiringDemand / 4)), delta: "+3 roles", note: `${model.hiringDemand} people are operating above healthy capacity.`, icon: UserPlus, points: [40, 45, 43, 52, 61, 68, 74] },
    { label: "Team utilization", value: `${model.utilization}%`, delta: "+3.7%", note: "Capacity remains within the preferred operating band.", icon: Activity, points: [61, 64, 68, 66, 71, 74, model.utilization] },
  ];

  return (
    <motion.div initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pb-8">
      <section className="flex flex-col gap-4 border-b border-border/70 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-primary"><span className="size-1.5 rounded-full bg-primary shadow-[0_0_12px_var(--primary)]" /> Intelligence command center</div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Workforce intelligence, in focus.</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Live talent, delivery, risk and capacity signals across GitHub, Jira, ClickUp and workforce records.</p>
        </div>
        <Button asChild className="w-full sm:w-auto"><Link to="/ai-workspace"><Bot className="size-4" /> Ask TalentAI</Link></Button>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {metrics.map((metric, index) => (
          <motion.div key={metric.label} initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} whileHover={reduceMotion ? undefined : { y: -3 }} className={`${panel} p-4`}>
            <div className="flex items-center justify-between"><metric.icon className={metric.risk ? "size-4 text-destructive" : "size-4 text-primary"} /><span className={metric.risk ? "text-xs font-semibold text-success" : "text-xs font-semibold text-success"}>{metric.delta}</span></div>
            <p className="mt-5 text-xs text-muted-foreground">{metric.label}</p>
            <p className="mt-1 font-display text-3xl font-semibold">{metric.value}</p>
            <div className="my-3 h-10"><ResponsiveContainer width="100%" height="100%"><AreaChart data={metric.points.map((v, i) => ({ i, v }))}><Area dataKey="v" type="monotone" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.08} strokeWidth={1.5} /></AreaChart></ResponsiveContainer></div>
            <p className="text-[11px] leading-4 text-muted-foreground">{metric.note}</p>
          </motion.div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <Card className={`${panel} xl:col-span-7`}>
          <CardHeader className="border-b border-border/70 pb-4"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase text-primary">AI workforce intelligence</p><CardTitle className="mt-2 text-xl">Executive signal matrix</CardTitle></div><Badge variant="outline">Updated now</Badge></div></CardHeader>
          <CardContent className="grid gap-5 p-5 lg:grid-cols-[1.2fr_.8fr]">
            <div className="h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data.trend}><defs><linearGradient id="signalFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity={0.32}/><stop offset="100%" stopColor="var(--primary)" stopOpacity={0}/></linearGradient></defs><Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6 }} /><Area type="monotone" dataKey="events" stroke="var(--primary)" strokeWidth={2} fill="url(#signalFill)" /><Area type="monotone" dataKey="activeEmployees" stroke="var(--chart-2)" fillOpacity={0} /></AreaChart></ResponsiveContainer></div>
            <div className="space-y-2">{data.insights.slice(0, 4).map((item) => <div key={item.id} className="border-l-2 border-primary/50 bg-muted/30 px-3 py-2.5"><p className="text-xs leading-5 text-muted-foreground">{item.text}</p></div>)}<Button asChild variant="ghost" size="sm" className="w-full justify-between"><Link to="/talent-intelligence">Open talent intelligence <ArrowRight className="size-4" /></Link></Button></div>
          </CardContent>
        </Card>
        <Card className={`${panel} xl:col-span-5`}>
          <CardHeader><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase text-primary">Predictive delivery</p><CardTitle className="mt-2 text-lg">Project success</CardTitle></div><TrendingUp className="size-4 text-primary" /></div></CardHeader>
          <CardContent className="space-y-3">{[...data.projects].sort((a,b) => b.average-a.average).slice(0,5).map((project) => <ProjectRow key={project.id} project={project} />)}</CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <PeoplePanel title="Top contributors" icon={Award} people={model.top.slice(0, 5)} metric={(e) => `${e.overall}`} />
        <PeoplePanel title="Promotion candidates" icon={TrendingUp} people={model.promotions.slice(0, 5)} metric={(e) => `${e.prediction.promotionReadiness}%`} />
        <PeoplePanel title="High-risk talent" icon={AlertTriangle} people={model.risks.slice(0, 5)} metric={(e) => `${e.workload.capacity}%`} risk />
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <Card className={`${panel} xl:col-span-5`}><CardHeader><CardTitle className="text-base">Workforce health</CardTitle></CardHeader><CardContent className="space-y-4"><HealthRow label="Performance index" value={data.totals.averageScore} /><HealthRow label="Delivery productivity" value={data.totals.overallProductivity} /><HealthRow label="Healthy capacity" value={Math.max(0, 100 - Math.round((model.risks.length / model.employees.length) * 100))} /></CardContent></Card>
        <Card className={`${panel} xl:col-span-4`}><CardHeader><CardTitle className="text-base">Department health</CardTitle></CardHeader><CardContent className="space-y-2">{data.departments.slice(0,5).map((group) => <div key={group.id} className="flex items-center gap-3 border-b border-border/60 py-2 last:border-0"><Building2 className="size-4 text-muted-foreground" /><span className="min-w-0 flex-1 truncate text-sm">{group.name}</span><span className="font-display text-sm font-semibold">{group.average}</span></div>)}</CardContent></Card>
        <Card className={`${panel} xl:col-span-3`}><CardHeader><CardTitle className="text-base">Hiring recommendations</CardTitle></CardHeader><CardContent className="space-y-3"><div className="rounded-md border border-primary/20 bg-primary/5 p-3"><BriefcaseBusiness className="mb-3 size-4 text-primary" /><p className="text-sm font-medium">Add {Math.max(1, Math.ceil(model.hiringDemand / 4))} priority roles</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Demand is concentrated in overloaded delivery groups and thin skill coverage.</p></div><Button asChild variant="outline" className="w-full"><Link to="/ai-workspace/job-matcher">Open Job Matcher <ArrowUpRight className="size-4" /></Link></Button></CardContent></Card>
      </section>
    </motion.div>
  );
}

function ProjectRow({ project }: { project: GroupScore }) { const score = Math.round(project.average * 0.7 + project.completionRate * 0.3); return <div className="rounded-md border border-border/70 bg-muted/20 p-3"><div className="flex justify-between gap-3 text-sm"><span className="truncate font-medium">{project.name}</span><span className={score < 60 ? "text-warning" : "text-success"}>{score}%</span></div><Progress value={score} className="my-2 h-1" /><p className="text-[11px] text-muted-foreground">{project.headcount} people · {project.completionRate}% complete</p></div>; }
function PeoplePanel({ title, icon: Icon, people, metric, risk }: { title:string; icon: typeof Award; people:EmployeeScore[]; metric:(e:EmployeeScore)=>string; risk?:boolean }) { return <Card className={panel}><CardHeader><div className="flex items-center justify-between"><CardTitle className="text-base">{title}</CardTitle><Icon className={risk ? "size-4 text-destructive" : "size-4 text-primary"} /></div></CardHeader><CardContent className="space-y-1">{people.map((person, index) => <Link key={person.id} to="/employees/$id" params={{ id: person.id }} className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-accent"><span className="w-5 text-center font-display text-xs text-muted-foreground">{String(index+1).padStart(2,"0")}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{person.name}</p><p className="truncate text-[11px] text-muted-foreground">{person.designation ?? person.departmentName ?? "Workforce member"}</p></div><Badge variant={risk ? "destructive" : "secondary"}>{metric(person)}</Badge></Link>)}</CardContent></Card>; }
function HealthRow({ label, value }: {label:string;value:number}) { return <div><div className="mb-1.5 flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className="font-semibold">{value}%</span></div><Progress value={value} className="h-1.5" /></div>; }
function DashboardSkeleton(){ return <div className="space-y-4"><Skeleton className="h-24"/><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">{Array.from({length:6}).map((_,i)=><Skeleton key={i} className="h-48"/>)}</div><div className="grid gap-4 xl:grid-cols-12"><Skeleton className="h-96 xl:col-span-7"/><Skeleton className="h-96 xl:col-span-5"/></div></div>; }
function NoData(){ return <div className={`${panel} grid min-h-96 place-items-center p-8 text-center`}><div><Network className="mx-auto size-8 text-primary"/><h1 className="mt-4 text-2xl font-semibold">Connect your workforce signals</h1><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Enable demo data or connect your systems to activate executive intelligence.</p><Button asChild className="mt-5"><Link to="/administration">Open Administration</Link></Button></div></div>; }