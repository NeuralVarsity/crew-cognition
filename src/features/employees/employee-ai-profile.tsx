import { useQuery } from "@tanstack/react-query";
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, PolarAngleAxis, PolarGrid, Radar,
  RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Brain, Flame, GitBranch, ListChecks, Timer, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { supabase } from "@/integrations/supabase/client";
import { useAiIntelligence } from "@/features/ai-engine/hooks";
import { SUB_SCORE_LABELS, type SubScoreKey } from "@/features/ai-engine/types";

const RADAR_KEYS: SubScoreKey[] = ["github", "jira", "clickup", "quality", "delivery", "collaboration", "leadership", "consistency"];

export function EmployeeAiProfile({ employeeId }: { employeeId: string }) {
  const { data, isLoading } = useAiIntelligence();
  const score = data?.employees.find((e) => e.id === employeeId);

  const skills = useQuery({
    queryKey: ["employee-skills", employeeId],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("employee_skills")
        .select("proficiency, years_experience, skills(name, category)")
        .eq("employee_id", employeeId);
      if (error) throw error;
      return rows ?? [];
    },
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
      </div>
    );
  }

  if (!score) {
    return (
      <EmptyState
        icon={Brain}
        title="No AI profile yet"
        description="This employee has no synchronized delivery activity in the current scoring window. Connect an integration or enable demo mode to generate scores."
      />
    );
  }

  const p = score.productivity;
  const metricGroups = [
    {
      title: "GitHub metrics", icon: GitBranch,
      items: [
        ["Commits", p.commitFrequency], ["Pull requests", p.pullRequests],
        ["Reviews", p.reviewActivity], ["Repositories", p.repositoryContributions],
      ] as const,
    },
    {
      title: "Jira metrics", icon: ListChecks,
      items: [
        ["Issues resolved", p.issueResolution], ["Story points", p.storyPoints],
        ["Sprint contribution", p.sprintContribution], ["Completion rate", `${p.taskCompletionRate}%`],
      ] as const,
    },
    {
      title: "ClickUp metrics", icon: Timer,
      items: [
        ["Tracked hours", p.trackedHours], ["Avg completion (h)", p.avgCompletionHours],
        ["Assigned", score.workload.assigned], ["Overdue", score.workload.overdue],
      ] as const,
    },
  ];

  const radarData = RADAR_KEYS.map((k) => ({ dimension: SUB_SCORE_LABELS[k], value: score.subScores[k] ?? 0 }));

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="AI score" value={score.overall} hint={`Org rank #${score.orgRank}`} icon={Brain} />
        <StatCard label="Productivity" value={score.prediction.futureProductivity} hint="Projected next cycle" icon={TrendingUp} />
        <StatCard label="Promotion readiness" value={score.prediction.promotionReadiness} hint={score.prediction.promotionReadiness >= 80 ? "Ready" : "Developing"} icon={TrendingUp} />
        <StatCard
          label="Burnout risk"
          value={score.workload.burnoutRisk}
          hint={`${score.workload.capacity}% capacity · ${score.workload.overdue} overdue`}
          icon={Flame}
          tone={score.workload.burnoutRisk === "high" ? "destructive" : undefined}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {metricGroups.map((g) => (
          <Card key={g.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{g.title}</CardTitle>
              <g.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {g.items.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium">{value ?? 0}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Score breakdown</CardTitle>
            <CardDescription>Explainable dimensions behind the overall AI score.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid className="stroke-muted" />
                <PolarAngleAxis dataKey="dimension" fontSize={11} />
                <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance trend</CardTitle>
            <CardDescription>Score history and weekly activity.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {score.history.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={score.history}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="period" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={score.consistency.weekly}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="week" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="events" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Skill matrix</CardTitle>
            <CardDescription>Proficiency and experience per skill.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {skills.isLoading && <Skeleton className="h-20 w-full" />}
            {!skills.isLoading && !skills.data?.length && (
              <p className="text-sm text-muted-foreground">No skills recorded for this employee.</p>
            )}
            {skills.data?.map((row, i) => {
              const skill = Array.isArray(row.skills) ? row.skills[0] : row.skills;
              const level = { beginner: 25, intermediate: 50, advanced: 75, expert: 100 }[
                String(row.proficiency ?? "").toLowerCase()
              ] ?? 40;
              return (
                <div key={`${skill?.name ?? "skill"}-${i}`}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium">{skill?.name ?? "—"}</span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {row.proficiency ?? "—"} · {row.years_experience ?? 0}y
                    </span>
                  </div>
                  <Progress value={level} />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI reasoning</CardTitle>
            <CardDescription>Why this employee scores the way they do.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Section title="Strengths" items={score.achievements} />
            <Section title="Growth areas" items={score.growthAreas} />
            <Section title="Recommendations" items={score.recommendations} />
            {score.risks.length > 0 && (
              <div>
                <div className="mb-1 text-xs font-medium uppercase text-muted-foreground">Risks</div>
                <div className="space-y-1.5">
                  {score.risks.map((r) => (
                    <div key={r.key} className="flex items-start gap-2">
                      <Badge variant={r.level === "high" ? "destructive" : "secondary"} className="capitalize">{r.level}</Badge>
                      <span className="text-muted-foreground">{r.label} — {r.detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <div className="mb-1 text-xs font-medium uppercase text-muted-foreground">{title}</div>
      <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
        {items.slice(0, 5).map((i) => <li key={i}>{i}</li>)}
      </ul>
    </div>
  );
}

function StatCard({
  label, value, hint, icon: Icon, tone,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "destructive";
}) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-semibold capitalize tracking-tight ${tone === "destructive" ? "text-destructive" : ""}`}>
          {value}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
