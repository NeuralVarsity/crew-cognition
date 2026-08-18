import { useState } from "react";
import {
  ChevronDown,
  Github,
  ClipboardList,
  ListChecks,
  BrainCircuit,
  Briefcase,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useSignedPhoto } from "@/features/employees/hooks";
import type { CandidateMatch } from "../types";

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

function scoreTone(score: number) {
  if (score >= 8) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 6.5) return "text-primary";
  if (score >= 5) return "text-amber-600 dark:text-amber-400";
  return "text-destructive";
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon?: typeof Github }) {
  return (
    <div className="rounded-lg border bg-muted/40 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        {Icon ? <Icon className="size-3" /> : null}
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

export function CandidateCard({
  candidate,
  selectable,
  selected,
  onSelectChange,
}: {
  candidate: CandidateMatch;
  selectable?: boolean;
  selected?: boolean;
  onSelectChange?: (checked: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const photo = useSignedPhoto(candidate.photo);
  const dim = (key: string) => candidate.dimensions.find((d) => d.key === key);
  const skillMatchPct = candidate.skillMatchPercent;

  return (
    <Card className={cn("overflow-hidden border-border/70", candidate.rank === 1 && "border-primary/50 shadow-sm")}>
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start">
        {selectable ? (
          <Checkbox
            checked={!!selected}
            onCheckedChange={(v) => onSelectChange?.(v === true)}
            aria-label={`Select ${candidate.name}`}
            className="mt-1"
          />
        ) : null}
        <Avatar className="size-12 shrink-0">
          {photo ? <AvatarImage src={photo} alt={candidate.name} /> : null}
          <AvatarFallback>{initials(candidate.name)}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">#{candidate.rank}</span>
            <h3 className="truncate text-base font-semibold text-foreground">{candidate.name}</h3>
            <Badge variant={candidate.rank === 1 ? "default" : "secondary"}>{candidate.recommendation}</Badge>
            <Badge variant="outline">{candidate.fit}</Badge>
          </div>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {[candidate.designation, candidate.department, candidate.team].filter(Boolean).join(" · ") ||
              "No designation on file"}
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric label="Skills match" value={`${skillMatchPct}%`} icon={BrainCircuit} />
            <Metric label="Project relevance" value={`${candidate.projectRelevancePercent}%`} icon={Briefcase} />
            <Metric label="GitHub" value={`${dim("github")?.score.toFixed(1) ?? "—"}/10`} icon={Github} />
            <Metric label="Jira" value={`${dim("jira")?.score.toFixed(1) ?? "—"}/10`} icon={ClipboardList} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            {candidate.roleFit ? (
              <Badge variant="outline" className="gap-1">
                Role fit {(candidate.roleFit.score ?? 0).toFixed(1)}/10 · {candidate.roleFit.label}
              </Badge>
            ) : null}
            {candidate.availability ? (
              <Badge variant="outline" className="gap-1">
                <Briefcase className="size-3" />
                {candidate.availability.label} · {candidate.availability.allocation}% allocated
              </Badge>
            ) : null}
            <span className="text-muted-foreground">
              {(candidate.currentProjects?.length ?? 0)
                ? `Current: ${(candidate.currentProjects ?? []).slice(0, 2).join(", ")}`
                : "No active project"}
            </span>
            <span className="text-muted-foreground">{candidate.yearsExperience} yrs experience</span>
          </div>
        </div>

        <div className="flex shrink-0 flex-row items-center gap-4 sm:flex-col sm:items-end">
          <div className="text-right">
            <div className={cn("text-3xl font-bold leading-none", scoreTone(candidate.overall))}>
              {candidate.overall.toFixed(1)}
            </div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">out of 10</div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)}>
            {open ? "Less" : "Details"}
            <ChevronDown className={cn("ml-1 size-4 transition-transform", open && "rotate-180")} />
          </Button>
        </div>
      </div>

      <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2">
        <div>
          <p className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <TrendingUp className="size-3" /> Strengths
          </p>
          <ul className="space-y-0.5 text-sm text-foreground">
            {(candidate.strengths.length ? candidate.strengths : ["No standout strengths in synced data"]).map((s) => (
              <li key={s}>• {s}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <AlertTriangle className="size-3" /> Weaknesses
          </p>
          <ul className="space-y-0.5 text-sm text-foreground">
            {(candidate.weaknesses.length ? candidate.weaknesses : ["No blocking gaps detected"]).map((s) => (
              <li key={s}>• {s}</li>
            ))}
          </ul>
        </div>
      </div>

      {open ? (
        <div className="border-t bg-muted/30 p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <section>
              <h4 className="text-sm font-semibold">Score explanation</h4>
              <div className="mt-2 space-y-2">
                {candidate.dimensions.map((d) => (
                  <div key={d.key}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {d.label} · weight {d.weight}%{d.available ? "" : " · no data"}
                      </span>
                      <span className="font-medium">{d.score.toFixed(1)}/10</span>
                    </div>
                    <Progress value={d.score * 10} className="mt-1 h-1.5" />
                    {d.reasons.length ? (
                      <ul className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
                        {d.reasons.slice(0, 3).map((r) => (
                          <li key={r}>– {r}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold">Delivery evidence</h4>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Metric label="Commits" value={String(candidate.metrics.commits)} icon={Github} />
                  <Metric label="Merged PRs" value={String(candidate.metrics.mergedPrs)} icon={Github} />
                  <Metric label="Reviews" value={String(candidate.metrics.reviews)} icon={Github} />
                  <Metric label="Repositories" value={String(candidate.metrics.repositories)} icon={Github} />
                  <Metric label="Jira resolved" value={String(candidate.metrics.jiraResolved)} icon={ClipboardList} />
                  <Metric label="Story points" value={String(candidate.metrics.storyPoints)} icon={ClipboardList} />
                  <Metric label="Sprints" value={String(candidate.metrics.sprints)} icon={ClipboardList} />
                  <Metric label="ClickUp done" value={String(candidate.metrics.clickupDone)} icon={ListChecks} />
                  <Metric
                    label="ClickUp completion"
                    value={`${Math.round(candidate.metrics.clickupCompletionRate)}%`}
                    icon={ListChecks}
                  />
                  <Metric label="Tracked hours" value={`${Math.round(candidate.metrics.trackedHours)}h`} />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold">Skills &amp; evidence</h4>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(candidate.matchedSkills ?? []).map((s) => (
                    <Badge key={s} variant="secondary">
                      {s}
                    </Badge>
                  ))}
                  {(candidate.missingSkills ?? []).map((s) => (
                    <Badge key={s} variant="outline" className="text-muted-foreground line-through">
                      {s}
                    </Badge>
                  ))}
                </div>
                <ul className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                  {(candidate.skillEvidence ?? [])
                    .filter((e) => e.matched)
                    .slice(0, 6)
                    .map((e) => (
                      <li key={e.skill}>
                        <span className="font-medium text-foreground">{e.skill}</span> — {e.sources.slice(0, 2).join("; ")}
                      </li>
                    ))}
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-semibold">Project history</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  {(candidate.currentProjects?.length ?? 0) ? (candidate.currentProjects ?? []).join(", ") : "No project assignments synced"}
                </p>
                {(candidate.evidence?.projects?.length ?? 0) ? (
                  <ul className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
                    {(candidate.evidence?.projects ?? []).map((p) => (
                      <li key={p}>– Relevant: {p}</li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {(
                  [
                    ["GitHub evidence", candidate.evidence?.github ?? []],
                    ["Jira evidence", candidate.evidence?.jira ?? []],
                    ["ClickUp evidence", candidate.evidence?.clickup ?? []],
                  ] as const
                ).map(([label, items]) => (
                  <div key={label}>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</h4>
                    <ul className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
                      {items.map((i) => (
                        <li key={i}>– {i}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <Separator className="my-4" />
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Why selected</h4>
              <ul className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                {(candidate.whySelected ?? []).map((r) => (
                  <li key={r}>• {r}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-amber-600 dark:text-amber-400">Why not ranked higher</h4>
              <ul className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                {(candidate.whyNotSelected ?? []).map((r) => (
                  <li key={r}>• {r}</li>
                ))}
              </ul>
            </div>
          </div>

          <Separator className="my-4" />
          <div>
            <h4 className="text-sm font-semibold">AI recommendation</h4>
            <ul className="mt-1 space-y-0.5 text-sm text-muted-foreground">
              {candidate.reasons.slice(0, 6).map((r) => (
                <li key={r}>• {r}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </Card>
  );
}