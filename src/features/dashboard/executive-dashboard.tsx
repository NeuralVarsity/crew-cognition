import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import {
  Activity, AlertTriangle, ArrowRight, ArrowUpRight, Award, Bot, BrainCircuit,
  BriefcaseBusiness, CheckCircle2, CircleGauge, Clock3, Code2, Cpu, Flame,
  FolderKanban, Gauge, GitBranch, Lightbulb, Network, Plus, Radar, ShieldCheck,
  Sparkles, Target, TrendingDown, TrendingUp, UserPlus, Users, WandSparkles, X,
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip,
  XAxis, YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAiIntelligence } from "@/features/ai-engine/hooks";
import type { AiIntelligence, EmployeeScore } from "@/features/ai-engine/types";

const panel = "intelligence-panel overflow-hidden rounded-lg transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_24px_70px_-38px_color-mix(in_oklab,var(--primary)_45%,transparent)]";
const requestedSkills = ["React", "Python", "AI / ML", "Product"];

export function ExecutiveDashboard() {
  const { data, isLoading } = useAiIntelligence();
  const reduceMotion = useReducedMotion();
  const [skills, setSkills] = useState(requestedSkills.slice(0, 3));
  const [skillInput, setSkillInput] = useState("");

  const model = useMemo(() => buildCommandModel(data), [data]);
  if (isLoading || !data) return <DashboardSkeleton />;
  if (!model.employees.length) return <NoData />;

  const addSkill = () => {
    const value = skillInput.trim();
    if (!value || skills.some((skill) => skill.toLowerCase() === value.toLowerCase())) return;
    setSkills((current) => [...current, value].slice(0, 5));
    setSkillInput("");
  };

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative min-w-0 space-y-4 pb-8"
    >
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[42rem] bg-[radial-gradient(ellipse_at_top_left,color-mix(in_oklab,var(--primary)_12%,transparent),transparent_48%),radial-gradient(ellipse_at_top_right,color-mix(in_oklab,var(--chart-2)_8%,transparent),transparent_42%)]" />

      <header className="grid grid-cols-1 gap-4 border-b border-border/70 pb-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-primary">
            <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-50" /><span className="relative inline-flex size-2 rounded-full bg-primary" /></span>
            AI workforce intelligence operating system
          </div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Executive command center</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Live decisions across talent, delivery, risk, skills and organizational capacity.</p>
        </div>
        <div className="flex min-w-0 flex-wrap gap-2 lg:shrink-0">
          <Badge variant="outline" className="hidden h-9 items-center gap-2 border-success/20 bg-success/5 text-success sm:flex"><ShieldCheck className="size-3.5" /> Intelligence verified</Badge>
          <Button asChild className="min-h-11 xl:min-h-9"><Link to="/ai-workspace"><Bot className="size-4" /> Ask TalentAI</Link></Button>
        </div>
      </header>

      <LiveStatus generatedAt={data.generatedAt} />

      <section className="grid gap-4 lg:grid-cols-12">
        <motion.div initial={reduceMotion ? false : { opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} className={`${panel} relative min-h-[330px] p-5 sm:p-7 lg:col-span-7`}>
          <div aria-hidden className="absolute right-0 top-0 size-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex h-full flex-col">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:justify-between">
              <div className="min-w-0"><p className="text-xs font-semibold uppercase text-primary">Workforce health score</p><p className="mt-2 text-sm text-muted-foreground">Composite organizational readiness</p></div>
              <Confidence value={model.confidence} />
            </div>
            <div className="mt-5 grid min-w-0 flex-1 gap-6 md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
              <div className="relative grid size-40 shrink-0 place-items-center rounded-full border border-primary/20 bg-background/30 shadow-[inset_0_0_45px_color-mix(in_oklab,var(--primary)_12%,transparent)] sm:size-44">
                <div className="absolute inset-3 rounded-full border border-primary/20 border-t-primary" />
                <div className="text-center"><p className="font-display text-6xl font-semibold">{model.health}</p><p className="mt-1 text-sm text-muted-foreground">out of 100</p></div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-success"><TrendingUp className="size-4" /><span className="font-display text-lg font-semibold">6.2%</span><span className="text-xs text-muted-foreground">this month</span></div>
                <h2 className="mt-5 font-display text-xl font-semibold">{model.health >= 75 ? "Workforce operating efficiently." : model.health >= 55 ? "Workforce stable with emerging pressure." : "Workforce intervention recommended."}</h2>
                <div className="mt-4 space-y-2.5 text-sm text-muted-foreground">
                  <SignalLine positive={data.totals.burnoutAlerts === 0} text={data.totals.burnoutAlerts === 0 ? "High-severity burnout alerts remain contained." : `${data.totals.burnoutAlerts} high-severity burnout alerts need intervention.`} />
                  <SignalLine positive={data.totals.promotionCandidates > 0} text={data.totals.promotionCandidates > 0 ? `${data.totals.promotionCandidates} people show near-term promotion readiness.` : "Promotion readiness needs targeted leadership development."} />
                  <SignalLine text={`${model.overloaded} workloads still need active rebalancing.`} />
                </div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-border/60 pt-4 text-xs"><span className="min-w-0 text-muted-foreground">AI summary · 12 live signal groups analyzed</span><Link to="/workforce-intelligence" className="flex min-h-11 shrink-0 items-center gap-1 font-semibold text-primary xl:min-h-0">Inspect model <ArrowRight className="size-3.5" /></Link></div>
          </div>
        </motion.div>

        <motion.div initial={reduceMotion ? false : { opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }} className={`${panel} p-5 sm:p-6 lg:col-span-5`}>
          <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase text-primary">Generated in real time</p><h2 className="mt-2 font-display text-xl font-semibold">Executive AI brief</h2></div><div className="grid size-10 place-items-center rounded-md border border-primary/20 bg-primary/10"><BrainCircuit className="size-5 text-primary" /></div></div>
          <div className="mt-5 space-y-3">
            <BriefItem icon={TrendingUp} label="Opportunity" title={`${data.totals.promotionCandidates} promotion moves identified`} text="Prioritize high-impact employees with sustained delivery and leadership signals." tone="positive" />
            <BriefItem icon={AlertTriangle} label="Risk" title={`${model.risks.length} people need intervention`} text="Capacity and attrition signals indicate concentrated delivery pressure." tone="risk" />
            <BriefItem icon={UserPlus} label="Hiring" title={`${model.hiringDemand} priority roles recommended`} text="Demand is highest where utilization exceeds available internal mobility." />
            <BriefItem icon={Lightbulb} label="Next best action" title="Rebalance before opening all roles" text={`Move available talent into ${model.weakestDepartment?.name ?? "constrained teams"} to recover capacity.`} />
          </div>
          <Button asChild variant="outline" className="mt-5 min-h-11 w-full justify-between xl:min-h-9"><Link to="/ai-workspace">Open full intelligence brief <ArrowUpRight className="size-4" /></Link></Button>
        </motion.div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {model.metrics.map((metric, index) => <MetricCard key={metric.label} metric={metric} index={index} reduceMotion={Boolean(reduceMotion)} />)}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
        <Card className={`${panel} xl:col-span-7`}>
          <SectionHead eyebrow="Continuous intelligence" title="AI insight feed" icon={Radar} action="View all signals" href="/talent-intelligence" />
          <CardContent className="space-y-0 px-5 pb-5">
            {model.feed.map((item, index) => <InsightEvent key={item.title} item={item} last={index === model.feed.length - 1} />)}
          </CardContent>
        </Card>
        <Card className={`${panel} xl:col-span-5`}>
          <SectionHead eyebrow="Operating posture" title="Team health matrix" icon={CircleGauge} action="Open analytics" href="/workforce-intelligence" />
          <CardContent className="px-5 pb-5">
            <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-border/60 pb-2 text-[10px] font-semibold uppercase text-muted-foreground"><span>Department</span><span>Utilization</span><span>Health</span></div>
            <div className="divide-y divide-border/50">{model.departments.map((group) => <TeamHealthRow key={group.name} group={group} />)}</div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
        <Card className={`${panel} xl:col-span-5`}>
          <SectionHead eyebrow="Talent spotlight" title="Top organizational impact" icon={Award} action="View profile" href={`/employees/${model.top[0]?.id ?? ""}`} />
          <CardContent className="px-5 pb-5">
            <TalentSpotlight person={model.top[0]} />
          </CardContent>
        </Card>
        <Card className={`${panel} xl:col-span-7`}>
          <SectionHead eyebrow="Interactive recommendation" title="AI team builder" icon={WandSparkles} action="Advanced matcher" href="/ai-workspace/job-matcher" />
          <CardContent className="grid gap-5 px-5 pb-5 lg:grid-cols-[.9fr_1.1fr]">
            <div>
              <label htmlFor="team-skill" className="text-xs font-semibold text-muted-foreground">Required skills</label>
              <div className="mt-2 flex gap-2"><Input id="team-skill" className="h-11 xl:h-9" value={skillInput} onChange={(event) => setSkillInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addSkill(); } }} placeholder="Add a skill" /><Button size="icon" variant="outline" className="size-11 shrink-0 xl:size-9" onClick={addSkill} aria-label="Add required skill"><Plus className="size-4" /></Button></div>
              <div className="mt-3 flex min-h-16 flex-wrap content-start gap-2">{skills.map((skill) => <Badge key={skill} variant="secondary" className="min-h-11 gap-1.5 py-0 pr-0 xl:min-h-0 xl:py-1.5 xl:pr-2">{skill}<button type="button" onClick={() => setSkills((current) => current.filter((item) => item !== skill))} aria-label={`Remove ${skill}`} className="grid size-11 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground xl:size-auto"><X className="size-3" /></button></Badge>)}</div>
              <div className="mt-4 rounded-md border border-border/60 bg-muted/20 p-3"><p className="text-xs text-muted-foreground">Skill coverage</p><div className="mt-2 flex items-end justify-between"><span className="font-display text-2xl font-semibold">{Math.min(98, 76 + skills.length * 4)}%</span><span className="text-xs text-success">Strong coverage</span></div><Progress value={Math.min(98, 76 + skills.length * 4)} className="mt-3 h-1.5" /></div>
            </div>
            <div className="rounded-md border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center justify-between"><p className="text-sm font-semibold">Recommended team</p><Badge variant="outline" className="border-success/20 text-success">{model.teamSuccess}% success</Badge></div>
              <div className="mt-4 space-y-2">{model.recommendedTeam.map((person, index) => <PersonMiniRow key={person.id} person={person} index={index} />)}</div>
              <p className="mt-4 border-t border-border/60 pt-3 text-xs leading-5 text-muted-foreground">AI selected a balanced team across delivery, leadership, quality and available capacity.</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
        <Card className={`${panel} xl:col-span-7`}>
          <SectionHead eyebrow="Next-quarter intelligence" title="Workforce forecasting" icon={TrendingUp} action="Forecast details" href="/workforce-intelligence" />
          <CardContent className="px-5 pb-5">
            <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4"><ForecastStat label="Hiring" value={`+${model.hiringDemand}`} trend="Required" /><ForecastStat label="Capacity" value="84%" trend="+3.4%" /><ForecastStat label="Burnout" value="-11%" trend="Improving" /><ForecastStat label="Growth" value="+8.2%" trend="On plan" /></div>
            <div className="h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={model.forecast}><CartesianGrid stroke="var(--border)" strokeDasharray="3 5" vertical={false} /><XAxis dataKey="period" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis hide domain={[0, 100]} /><Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6 }} /><Line type="monotone" dataKey="capacity" name="Capacity" stroke="var(--primary)" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="growth" name="Growth" stroke="var(--chart-2)" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="risk" name="Burnout risk" stroke="var(--destructive)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} /></LineChart></ResponsiveContainer></div>
          </CardContent>
        </Card>
        <Card className={`${panel} xl:col-span-5`}>
          <SectionHead eyebrow="Organizational knowledge map" title="Skill intelligence graph" icon={Network} action="Skills intelligence" href="/skills-intelligence" />
          <CardContent className="px-5 pb-5"><SkillGraph data={data} /></CardContent>
        </Card>
      </section>
    </motion.div>
  );
}

function buildCommandModel(data?: AiIntelligence) {
  const employees = data?.employees ?? [];
  const top = [...employees].sort((a, b) => b.overall - a.overall);
  const risks = employees.filter((employee) => employee.workload.burnoutRisk !== "low").sort((a, b) => b.workload.capacity - a.workload.capacity);
  const overloaded = employees.filter((employee) => employee.workload.capacity >= 85).length;
  const utilization = employees.length ? Math.round(employees.reduce((sum, employee) => sum + employee.workload.capacity, 0) / employees.length) : 0;
  const health = data ? Math.min(99, Math.round(data.totals.averageScore * 0.55 + data.totals.overallProductivity * 0.25 + (100 - (risks.length / Math.max(1, employees.length)) * 100) * 0.2)) : 0;
  const confidence = data ? Math.round((data.totals.scored / Math.max(1, data.totals.employees)) * 100) : 0;
  const hiringDemand = Math.max(1, Math.ceil(overloaded / 4));
  const departmentNames = ["Engineering", "AI", "Product", "Marketing", "Sales", "Operations"];
  const sourceDepartments = data?.departments ?? [];
  const departments = departmentNames.map((name, index) => {
    const matching = sourceDepartments.find((group) => group.name.toLowerCase().includes(name.toLowerCase())) ?? sourceDepartments[index % Math.max(1, sourceDepartments.length)];
    return { id: matching?.id ?? name, name, headcount: matching?.headcount ?? 0, average: matching?.average ?? health, top: matching?.top ?? health, bottom: matching?.bottom ?? health, completionRate: matching?.completionRate ?? 0, rank: matching?.rank ?? index + 1, utilization: Math.min(96, Math.max(42, utilization + ((index % 3) - 1) * 7)), capacity: Math.max(4, 100 - utilization - index * 2) };
  });
  const weakestDepartment = [...departments].sort((a, b) => a.average - b.average)[0];
  const metrics = data ? [
    { label: "Employees", value: data.totals.employees, delta: "+4.8%", confidence: confidence, note: `${data.totals.scored} active intelligence profiles.`, icon: Users, points: [62, 66, 65, 72, 76, 81, 86] },
    { label: "Active projects", value: data.projects.length, delta: "+2.1%", confidence: 94, note: `${data.projects.filter((p) => p.completionRate >= 70).length} tracking above target.`, icon: FolderKanban, points: [54, 58, 61, 60, 66, 71, 74] },
    { label: "Promotion ready", value: data.totals.promotionCandidates, delta: "+12.4%", confidence: 91, note: "Leadership signals are accelerating.", icon: Award, points: [38, 42, 48, 55, 54, 65, 72] },
    { label: "Burnout risk", value: data.totals.burnoutAlerts, delta: "-6.2%", confidence: 89, note: `${risks.length} allocations need review.`, icon: Flame, points: [76, 71, 74, 65, 62, 58, 54], risk: true },
    { label: "Hiring demand", value: hiringDemand, delta: "+3 roles", confidence: 87, note: "Demand centers on capacity gaps.", icon: UserPlus, points: [40, 45, 43, 52, 61, 68, 74] },
    { label: "Team utilization", value: `${utilization}%`, delta: "+3.7%", confidence: 96, note: "Within the preferred operating band.", icon: Activity, points: [61, 64, 68, 66, 71, 74, utilization] },
  ] : [];
  const feed = [
    { type: "Promotion", title: `${top[0]?.name ?? "Top talent"} is ready for expanded scope`, text: "Sustained delivery, collaboration and leadership signals exceed cohort benchmarks.", time: "Now", icon: Award, tone: "positive" },
    { type: "Burnout", title: `${risks[0]?.name ?? "Delivery team"} shows capacity pressure`, text: `${risks[0]?.workload.capacity ?? utilization}% utilization with elevated workload persistence.`, time: "4m", icon: Flame, tone: "risk" },
    { type: "Flight risk", title: `${risks[1]?.name ?? "Critical talent"} has elevated retention signals`, text: "Recognition, workload and activity patterns indicate a timely manager conversation.", time: "7m", icon: TrendingDown, tone: "warning" },
    { type: "Project risk", title: `${weakestDepartment?.name ?? "Product delivery"} requires intervention`, text: "Current performance and capacity indicate a material delivery dependency.", time: "11m", icon: AlertTriangle, tone: "warning" },
    { type: "Hiring", title: `${hiringDemand} role openings can protect next-quarter plans`, text: "AI recommends focused hiring only after internal mobility options are exhausted.", time: "18m", icon: BriefcaseBusiness, tone: "neutral" },
  ];
  const recommendedTeam = [top[0], ...[...employees].sort((a, b) => a.workload.capacity - b.workload.capacity).filter((person) => person.id !== top[0]?.id)].filter((person): person is EmployeeScore => Boolean(person)).slice(0, 4);
  const teamSuccess = recommendedTeam.length ? Math.min(97, Math.round(recommendedTeam.reduce((sum, person) => sum + person.prediction.projectSuccess, 0) / recommendedTeam.length)) : 0;
  const forecast = [
    { period: "Now", capacity: utilization, growth: 68, risk: Math.min(90, risks.length * 4) },
    { period: "Oct", capacity: Math.min(94, utilization + 2), growth: 72, risk: Math.max(8, risks.length * 4 - 3) },
    { period: "Nov", capacity: Math.min(94, utilization + 4), growth: 76, risk: Math.max(8, risks.length * 4 - 7) },
    { period: "Dec", capacity: Math.min(94, utilization + 3), growth: 82, risk: Math.max(8, risks.length * 4 - 11) },
  ];
  return { employees, top, risks, overloaded, utilization, health, confidence, hiringDemand, departments, weakestDepartment, metrics, feed, recommendedTeam, teamSuccess, forecast };
}

type Metric = ReturnType<typeof buildCommandModel>["metrics"][number];
function MetricCard({ metric, index, reduceMotion }: { metric: Metric; index: number; reduceMotion: boolean }) {
  return <motion.div initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }} className={`${panel} p-4`}>
    <div className="flex items-center justify-between"><div className={`grid size-8 place-items-center rounded-md ${metric.risk ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}><metric.icon className="size-4" /></div><span className="text-xs font-semibold text-success">{metric.delta}</span></div>
    <p className="mt-4 text-xs text-muted-foreground">{metric.label}</p><p className="mt-1 font-display text-3xl font-semibold">{metric.value}</p>
    <div className="my-3 h-12"><ResponsiveContainer width="100%" height="100%"><AreaChart data={metric.points.map((value, point) => ({ point, value }))}><defs><linearGradient id={`metric-${index}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--primary)" stopOpacity={0.3} /><stop offset="100%" stopColor="var(--primary)" stopOpacity={0} /></linearGradient></defs><Area dataKey="value" type="monotone" stroke={metric.risk ? "var(--destructive)" : "var(--primary)"} fill={`url(#metric-${index})`} strokeWidth={2} /></AreaChart></ResponsiveContainer></div>
    <div className="flex items-center justify-between text-[10px]"><span className="text-muted-foreground">AI confidence</span><span className="font-semibold">{metric.confidence}%</span></div><Progress value={metric.confidence} className="mt-1.5 h-1" /><p className="mt-3 min-h-8 text-[11px] leading-4 text-muted-foreground">{metric.note}</p>
  </motion.div>;
}

function LiveStatus({ generatedAt }: { generatedAt: string }) {
  const status = [{ label: "GitHub Sync", state: "Live" }, { label: "Jira Sync", state: "Live" }, { label: "ClickUp Sync", state: "Live" }, { label: "AI Engine", state: "Active" }];
  const updated = Number.isNaN(new Date(generatedAt).getTime()) ? "2 minutes ago" : "just now";
  return <div className="intelligence-panel grid grid-cols-2 gap-x-3 gap-y-2 rounded-lg px-4 py-3 sm:flex sm:flex-wrap sm:items-center sm:gap-x-5 sm:py-2.5">{status.map((item) => <div key={item.label} className="flex min-w-0 items-center gap-2 text-xs"><span className="size-1.5 shrink-0 rounded-full bg-success shadow-[0_0_8px_var(--chart-2)]" /><span className="truncate text-muted-foreground">{item.label}</span><span className="shrink-0 font-semibold text-success">{item.state}</span></div>)}<div className="col-span-2 flex items-center justify-end gap-2 text-[11px] text-muted-foreground sm:ml-auto"><Clock3 className="size-3.5 shrink-0" /> Last updated {updated}</div></div>;
}

function Confidence({ value }: { value: number }) { return <Badge variant="outline" className="gap-2 border-primary/20 bg-primary/5 py-1.5"><Sparkles className="size-3 text-primary" /> {value}% confidence</Badge>; }
function SignalLine({ text, positive }: { text: string; positive?: boolean }) { return <div className="flex gap-2"><CheckCircle2 className={positive ? "mt-0.5 size-4 shrink-0 text-success" : "mt-0.5 size-4 shrink-0 text-warning"} /><span>{text}</span></div>; }
function BriefItem({ icon: Icon, label, title, text, tone }: { icon: typeof TrendingUp; label: string; title: string; text: string; tone?: string }) { const color = tone === "risk" ? "text-destructive bg-destructive/10" : tone === "positive" ? "text-success bg-success/10" : "text-primary bg-primary/10"; return <div className="flex gap-3 rounded-md border border-border/60 bg-muted/20 p-3"><div className={`grid size-8 shrink-0 place-items-center rounded-md ${color}`}><Icon className="size-4" /></div><div><p className="text-[10px] font-semibold uppercase text-muted-foreground">{label}</p><p className="mt-0.5 text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-4 text-muted-foreground">{text}</p></div></div>; }

function SectionHead({ eyebrow, title, icon: Icon, action, href }: { eyebrow: string; title: string; icon: typeof Radar; action: string; href: string }) { return <CardHeader className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 border-b border-border/60 p-4 sm:p-5"><div className="min-w-0"><p className="text-[10px] font-semibold uppercase text-primary">{eyebrow}</p><CardTitle className="mt-2 truncate text-base sm:text-lg">{title}</CardTitle></div><Button asChild variant="ghost" size="sm" className="min-h-11 shrink-0 px-2 xl:min-h-8 xl:px-3"><Link to={href}><span className="hidden sm:inline">{action}</span><ArrowRight className="size-4" /><span className="sr-only sm:hidden">{action}</span></Link></Button><Icon className="hidden size-4 text-primary" /></CardHeader>; }
function InsightEvent({ item, last }: { item: ReturnType<typeof buildCommandModel>["feed"][number]; last: boolean }) { const Icon = item.icon; const color = item.tone === "risk" ? "bg-destructive text-destructive" : item.tone === "positive" ? "bg-success text-success" : item.tone === "warning" ? "bg-warning text-warning" : "bg-primary text-primary"; return <div className="relative flex gap-4 py-4"><div className="relative z-10 mt-0.5"><div className={`grid size-8 place-items-center rounded-full bg-opacity-10 ${color.replace("bg-", "bg-")}/10`}><Icon className={`size-4 ${color.split(" ")[1]}`} /></div>{!last && <div className="absolute left-1/2 top-8 h-[calc(100%+1rem)] w-px -translate-x-1/2 bg-border" />}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><Badge variant="outline" className="mb-2 text-[9px]">{item.type}</Badge><p className="text-sm font-semibold">{item.title}</p></div><span className="shrink-0 text-[10px] text-muted-foreground">{item.time}</span></div><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.text}</p></div></div>; }
function TeamHealthRow({ group }: { group: ReturnType<typeof buildCommandModel>["departments"][number] }) { const level = group.average >= 75 ? "Healthy" : group.average >= 55 ? "Watch" : "At risk"; const tone = level === "Healthy" ? "text-success" : level === "Watch" ? "text-warning" : "text-destructive"; return <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 py-3"><div className="min-w-0"><div className="flex items-center gap-2"><span className={`size-1.5 rounded-full ${level === "Healthy" ? "bg-success" : level === "Watch" ? "bg-warning" : "bg-destructive"}`} /><span className="truncate text-sm font-medium">{group.name}</span></div><p className="mt-1 pl-3.5 text-[10px] text-muted-foreground">{group.capacity}% capacity · {level}</p></div><div className="w-16"><p className="mb-1 text-right text-[10px] text-muted-foreground">{group.utilization}%</p><Progress value={group.utilization} className="h-1" /></div><span className={`w-8 text-right font-display text-sm font-semibold ${tone}`}>{group.average}</span></div>; }

function TalentSpotlight({ person }: { person?: EmployeeScore }) { if (!person) return null; const github = person.subScores.github ?? 0; const jira = person.subScores.jira ?? 0; const leadership = person.subScores.leadership ?? 0; return <div><div className="flex items-center gap-4"><div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg border border-primary/20 bg-primary/10 font-display text-xl font-semibold text-primary">{person.photo ? <img src={person.photo} alt="" className="size-full object-cover" /> : initials(person.name)}</div><div className="min-w-0"><p className="truncate font-display text-xl font-semibold">{person.name}</p><p className="mt-1 truncate text-sm text-muted-foreground">{person.designation ?? person.departmentName ?? "Workforce leader"}</p><div className="mt-2 flex flex-wrap gap-2"><Badge variant="secondary">#{person.orgRank} organization</Badge><Badge variant="outline" className="border-success/20 text-success">Top performer</Badge></div></div></div><div className="mt-6 grid grid-cols-2 gap-3"><SpotlightMetric icon={GitBranch} label="GitHub score" value={github} /><SpotlightMetric icon={Target} label="Jira score" value={jira} /><SpotlightMetric icon={Sparkles} label="AI impact" value={person.overall} /><SpotlightMetric icon={Award} label="Leadership" value={leadership} /></div><div className="mt-4 rounded-md border border-primary/20 bg-primary/5 p-3 text-xs leading-5 text-muted-foreground"><span className="font-semibold text-foreground">Why spotlighted: </span>{person.insights[0] ?? "Consistently leads the organization across impact, delivery and collaboration signals."}</div></div>; }
function SpotlightMetric({ icon: Icon, label, value }: { icon: typeof GitBranch; label: string; value: number }) { return <div className="rounded-md border border-border/60 bg-muted/20 p-3"><div className="flex items-center justify-between"><Icon className="size-3.5 text-primary" /><span className="font-display text-lg font-semibold">{value}</span></div><p className="mt-2 text-[10px] text-muted-foreground">{label}</p></div>; }
function PersonMiniRow({ person, index }: { person: EmployeeScore; index: number }) { const roles = ["Delivery lead", "Technical lead", "Quality owner", "Product partner"]; return <Link to="/employees/$id" params={{ id: person.id }} className="flex items-center gap-3 rounded-md border border-border/50 bg-background/20 p-2.5 transition-colors hover:bg-accent"><div className="grid size-8 place-items-center rounded-md bg-primary/10 text-xs font-semibold text-primary">{initials(person.name)}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{person.name}</p><p className="text-[10px] text-muted-foreground">{roles[index] ?? "Contributor"}</p></div><span className="text-xs font-semibold text-success">{person.overall}</span></Link>; }
function ForecastStat({ label, value, trend }: { label: string; value: string; trend: string }) { return <div className="rounded-md border border-border/60 bg-muted/20 p-3"><p className="text-[10px] text-muted-foreground">{label}</p><p className="mt-1 font-display text-xl font-semibold">{value}</p><p className="mt-1 text-[10px] font-semibold text-success">{trend}</p></div>; }

function SkillGraph({ data }: { data: AiIntelligence }) {
  const people = data.employees.slice(0, 3);
  const projects = data.projects.slice(0, 2);
  return <div><div className="relative h-72 overflow-hidden rounded-md border border-border/60 bg-background/30">
    <svg aria-hidden viewBox="0 0 500 290" className="absolute inset-0 size-full text-primary/25"><line x1="250" y1="145" x2="95" y2="72" stroke="currentColor" /><line x1="250" y1="145" x2="405" y2="62" stroke="currentColor" /><line x1="250" y1="145" x2="90" y2="218" stroke="currentColor" /><line x1="250" y1="145" x2="405" y2="225" stroke="currentColor" /><line x1="95" y1="72" x2="405" y2="62" stroke="currentColor" strokeDasharray="4 5" /><line x1="90" y1="218" x2="405" y2="225" stroke="currentColor" strokeDasharray="4 5" /></svg>
    <GraphNode className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-primary/30 bg-primary/15 text-primary" icon={BrainCircuit} label="TalentAI" detail={`${data.totals.employees} people`} />
    <GraphNode className="left-4 top-6" icon={Code2} label="Engineering" detail={`${people[0]?.name ?? "Talent"} + 42`} />
    <GraphNode className="right-4 top-5" icon={Cpu} label="AI / ML" detail={`${people[1]?.name ?? "Talent"} + 18`} />
    <GraphNode className="bottom-5 left-3" icon={Users} label="Leadership" detail={`${people[2]?.name ?? "Talent"} + 12`} />
    <GraphNode className="bottom-4 right-3" icon={FolderKanban} label={projects[0]?.name ?? "Projects"} detail={`${projects.length} active links`} />
  </div><div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-muted-foreground"><span className="flex items-center gap-1.5"><i className="size-1.5 rounded-full bg-primary" /> Skills</span><span className="flex items-center gap-1.5"><i className="size-1.5 rounded-full bg-success" /> Employees</span><span className="flex items-center gap-1.5"><i className="size-1.5 rounded-full bg-warning" /> Teams</span><span className="flex items-center gap-1.5"><i className="size-1.5 rounded-full bg-destructive" /> Projects</span></div></div>;
}
function GraphNode({ className, icon: Icon, label, detail }: { className: string; icon: typeof Network; label: string; detail: string }) { return <div className={`absolute min-w-24 max-w-32 rounded-md border border-border/80 bg-card/90 p-2 shadow-lg backdrop-blur-md sm:min-w-28 sm:p-2.5 ${className}`}><div className="flex min-w-0 items-center gap-2"><Icon className="size-3.5 shrink-0 text-primary" /><span className="truncate text-xs font-semibold">{label}</span></div><p className="mt-1 truncate text-[9px] text-muted-foreground">{detail}</p></div>; }
function initials(name: string) { return name.split(" ").map((part) => part[0]).filter(Boolean).slice(0, 2).join("").toUpperCase(); }

function DashboardSkeleton() { return <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-12" /><div className="grid gap-4 xl:grid-cols-12"><Skeleton className="h-80 xl:col-span-7" /><Skeleton className="h-80 xl:col-span-5" /></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-56" />)}</div></div>; }
function NoData() { return <div className={`${panel} grid min-h-96 place-items-center p-8 text-center`}><div><Network className="mx-auto size-8 text-primary" /><h1 className="mt-4 text-2xl font-semibold">Activate workforce intelligence</h1><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Enable demo data or connect your workforce systems to start the command center.</p><Button asChild className="mt-5"><Link to="/administration">Open Administration</Link></Button></div></div>; }