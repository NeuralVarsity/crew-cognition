import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { AlertTriangle, ArrowUpRight, Award, BrainCircuit, Network, ShieldAlert, TrendingUp, UsersRound } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAiIntelligence } from "@/features/ai-engine/hooks";
import type { EmployeeScore } from "@/features/ai-engine/types";

const panel = "intelligence-panel overflow-hidden rounded-lg";

export function TalentIntelligenceDashboard() {
  const { data, isLoading } = useAiIntelligence();
  const reduceMotion = useReducedMotion();
  const model = useMemo(() => {
    const people = data?.employees ?? [];
    return {
      top: [...people].sort((a,b) => b.overall-a.overall).slice(0,8),
      mobility: [...people].filter((e) => e.workload.capacity < 70).sort((a,b) => b.prediction.promotionReadiness-a.prediction.promotionReadiness).slice(0,6),
      flight: [...people].sort((a,b) => b.prediction.attritionRisk-a.prediction.attritionRisk).slice(0,6),
      promotion: [...people].sort((a,b) => b.prediction.promotionReadiness-a.prediction.promotionReadiness).slice(0,6),
    };
  }, [data]);
  if (isLoading || !data) return <div className="space-y-4"><Skeleton className="h-24"/><Skeleton className="h-96"/></div>;
  return <motion.div initial={reduceMotion ? false : { opacity:0, y:10 }} animate={{opacity:1,y:0}} className="space-y-4 pb-8">
    <header className="border-b border-border/70 pb-5"><div className="flex items-center gap-2 text-xs font-semibold uppercase text-primary"><BrainCircuit className="size-4"/> Talent intelligence</div><h1 className="mt-2 text-3xl font-semibold">See capability before the résumé.</h1><p className="mt-1 max-w-3xl text-sm text-muted-foreground">Evidence-backed performance, mobility, risk and readiness signals for every workforce decision.</p></header>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Signal icon={Award} label="High performers" value={data.totals.highPerformers} detail={`${data.totals.averageScore}% organization score`} />
      <Signal icon={TrendingUp} label="Promotion ready" value={data.totals.promotionCandidates} detail="Ready for expanded scope" />
      <Signal icon={UsersRound} label="Internal mobility" value={model.mobility.length} detail="High readiness with capacity" />
      <Signal icon={ShieldAlert} label="Flight risk" value={model.flight.filter((e)=>e.prediction.attritionRisk >= 50).length} detail="Requires manager attention" risk />
    </section>
    <section className="grid gap-4 xl:grid-cols-12">
      <Card className={`${panel} xl:col-span-7`}><CardHeader><CardTitle className="text-lg">Workforce strength map</CardTitle><p className="text-xs text-muted-foreground">Delivery strength and completion by department.</p></CardHeader><CardContent className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.departments.slice(0,10)} layout="vertical"><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)"/><XAxis type="number" hide/><YAxis dataKey="name" type="category" width={110} tick={{fill:"var(--muted-foreground)",fontSize:11}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:"var(--popover)",border:"1px solid var(--border)",borderRadius:6}}/><Bar dataKey="average" fill="var(--primary)" radius={[0,4,4,0]}/></BarChart></ResponsiveContainer></CardContent></Card>
      <Card className={`${panel} xl:col-span-5`}><CardHeader><CardTitle className="text-lg">Top performers</CardTitle></CardHeader><CardContent className="space-y-1">{model.top.map((person,index)=><PersonRow key={person.id} person={person} index={index} value={`${person.overall}`} />)}</CardContent></Card>
    </section>
    <section className="grid gap-4 lg:grid-cols-3">
      <ListPanel title="Internal mobility" icon={Network} people={model.mobility} metric={(e)=>`${100-e.workload.capacity}% free`} />
      <ListPanel title="Promotion readiness" icon={TrendingUp} people={model.promotion} metric={(e)=>`${e.prediction.promotionReadiness}%`} />
      <ListPanel title="Flight risk detection" icon={AlertTriangle} people={model.flight} metric={(e)=>`${e.prediction.attritionRisk}%`} risk />
    </section>
    <section className="grid gap-4 lg:grid-cols-2">
      <Card className={panel}><CardHeader><CardTitle className="text-base">Skill analysis</CardTitle></CardHeader><CardContent className="space-y-3">{data.leaderboards.slice(0,5).map((board)=><div key={board.key}><div className="mb-1 flex justify-between text-xs"><span>{board.title}</span><span className="text-muted-foreground">{board.entries[0]?.value ?? 0} peak</span></div><Progress value={Math.min(100,board.entries[0]?.value ?? 0)} className="h-1.5"/></div>)}</CardContent></Card>
      <Card className={panel}><CardHeader><CardTitle className="text-base">Talent intelligence brief</CardTitle></CardHeader><CardContent className="space-y-2">{data.insights.slice(0,5).map((item)=><div key={item.id} className="border-l-2 border-primary/50 px-3 py-2 text-xs leading-5 text-muted-foreground">{item.text}</div>)}</CardContent></Card>
    </section>
  </motion.div>;
}

function Signal({icon:Icon,label,value,detail,risk}:{icon:typeof Award;label:string;value:number;detail:string;risk?:boolean}){return <Card className={panel}><CardContent className="p-4"><div className="flex items-center justify-between"><Icon className={risk?"size-4 text-destructive":"size-4 text-primary"}/><ArrowUpRight className="size-3.5 text-muted-foreground"/></div><p className="mt-5 text-xs text-muted-foreground">{label}</p><p className="mt-1 font-display text-3xl font-semibold">{value}</p><p className="mt-2 text-[11px] text-muted-foreground">{detail}</p></CardContent></Card>}
function PersonRow({person,index,value}:{person:EmployeeScore;index:number;value:string}){return <Link to="/employees/$id" params={{id:person.id}} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent"><span className="w-5 text-xs text-muted-foreground">{String(index+1).padStart(2,"0")}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{person.name}</p><p className="truncate text-[11px] text-muted-foreground">{person.designation ?? person.departmentName ?? "Talent profile"}</p></div><Badge variant="secondary">{value}</Badge></Link>}
function ListPanel({title,icon:Icon,people,metric,risk}:{title:string;icon:typeof Network;people:EmployeeScore[];metric:(e:EmployeeScore)=>string;risk?:boolean}){return <Card className={panel}><CardHeader><div className="flex items-center justify-between"><CardTitle className="text-base">{title}</CardTitle><Icon className={risk?"size-4 text-destructive":"size-4 text-primary"}/></div></CardHeader><CardContent>{people.map((p,i)=><PersonRow key={p.id} person={p} index={i} value={metric(p)}/>)}</CardContent></Card>}