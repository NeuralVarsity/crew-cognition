import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CalendarClock,
  Sparkle,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useSignedPhoto } from "@/features/employees/hooks";
import type { InsightBadge, InsightPerson, InsightResult } from "../insight-types";

const KIND_ICON = {
  leaderboard: Trophy,
  burnout: AlertTriangle,
  attrition: AlertTriangle,
  promotion: TrendingUp,
  availability: CalendarClock,
  skill: Sparkle,
  compare: Users,
} as const;

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

const TONE: Record<InsightBadge["tone"], string> = {
  default: "",
  muted: "text-muted-foreground",
  success: "border-emerald-500/40 text-emerald-600 dark:text-emerald-400",
  warning: "border-amber-500/40 text-amber-600 dark:text-amber-400",
  danger: "border-destructive/50 text-destructive",
};

function PersonRow({ person, metricUnit, max }: { person: InsightPerson; metricUnit: string; max: number }) {
  const photo = useSignedPhoto(person.photo);
  const pct = max > 0 ? Math.min(100, (person.value / max) * 100) : 0;

  return (
    <div className="rounded-xl border bg-card/60 p-3 transition hover:border-primary/40">
      <div className="flex items-start gap-3">
        <div className="grid size-6 shrink-0 place-items-center rounded-md bg-muted text-xs font-semibold">
          {person.rank}
        </div>
        <Avatar className="size-10 shrink-0">
          {photo ? <AvatarImage src={photo} alt={person.name} /> : null}
          <AvatarFallback className="text-xs">{initials(person.name)}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Link
              to="/employees/$id"
              params={{ id: person.employeeId }}
              className="truncate font-medium hover:underline"
            >
              {person.name}
            </Link>
            <span className="text-sm font-semibold tabular-nums">
              {person.value}
              <span className="ml-0.5 text-xs font-normal text-muted-foreground">
                {person.valueLabel || metricUnit}
              </span>
            </span>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {[person.designation, person.department, person.team].filter(Boolean).join(" · ")}
          </p>
          <Progress value={pct} className="mt-2 h-1.5" />
          <p className="mt-2 text-xs text-muted-foreground">{person.headline}</p>

          <div className="mt-2 flex flex-wrap gap-1">
            {person.badges.map((badge, i) => (
              <Badge key={`${badge.label}-${i}`} variant="outline" className={cn("text-[10px]", TONE[badge.tone])}>
                {badge.label}
              </Badge>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-5">
            {person.metrics.map((m) => (
              <div key={m.label} className="rounded-md border bg-muted/40 px-2 py-1">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{m.label}</div>
                <div className="text-xs font-semibold">{m.value}</div>
              </div>
            ))}
          </div>

          {person.evidence.length ? (
            <ul className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
              {person.evidence.map((e, i) => (
                <li key={`${e}-${i}`}>• {e}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function InsightView({ insight }: { insight: InsightResult }) {
  const Icon = KIND_ICON[insight.kind] ?? BarChart3;
  const max = Math.max(...insight.people.map((p) => p.value), 1);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <Icon className="mt-0.5 size-4 text-primary" />
              <div>
                <CardTitle className="text-base">{insight.title}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">{insight.subtitle}</p>
              </div>
            </div>
            <Badge variant="secondary" className="shrink-0">
              {insight.poolSize} employees analysed
            </Badge>
          </div>
        </CardHeader>

        {insight.chart.length ? (
          <CardContent className="space-y-2">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {insight.metricLabel}
            </div>
            {insight.chart.map((point) => (
              <div key={point.label} className="flex items-center gap-2">
                <span className="w-32 shrink-0 truncate text-xs text-muted-foreground">{point.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.max(2, Math.min(100, (point.value / max) * 100))}%` }}
                  />
                </div>
                <span className="w-14 shrink-0 text-right text-xs font-medium tabular-nums">
                  {point.value}
                  <span className="text-muted-foreground">{insight.metricUnit}</span>
                </span>
              </div>
            ))}
          </CardContent>
        ) : null}
      </Card>

      {insight.comparison ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Score comparison</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Dimension</th>
                  {insight.comparison.names.map((n) => (
                    <th key={n} className="py-2 pr-3 font-medium">
                      {n}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {insight.comparison.rows.map((row) => {
                  const best = Math.max(...row.values);
                  return (
                    <tr key={row.label} className="border-b last:border-0">
                      <td className="py-2 pr-3 text-muted-foreground">{row.label}</td>
                      {row.values.map((value, i) => (
                        <td key={i} className="py-2 pr-3">
                          <span
                            className={cn(
                              "font-medium tabular-nums",
                              value === best && best > 0 && "text-emerald-600 dark:text-emerald-400",
                            )}
                          >
                            {value}
                            {row.unit ?? ""}
                          </span>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}

      {insight.people.length ? (
        <div className="space-y-2">
          {insight.people.map((person) => (
            <PersonRow key={person.employeeId} person={person} metricUnit={insight.metricUnit} max={max} />
          ))}
        </div>
      ) : null}

      {insight.notes.length ? (
        <Card>
          <CardContent className="space-y-1 pt-4 text-sm text-muted-foreground">
            {insight.notes.map((note, i) => (
              <p key={i} className="flex gap-2">
                <ArrowUpRight className="mt-0.5 size-3.5 shrink-0" />
                {note}
              </p>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
