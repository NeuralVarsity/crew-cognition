import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CandidateCard } from "./candidate-card";
import type { MatchResult } from "../types";

export function MatchResultView({
  result,
  selectedIds,
  onToggleSelect,
}: {
  result: MatchResult;
  selectedIds?: string[];
  onToggleSelect?: (id: string, checked: boolean) => void;
}) {
  const req = result.requirement;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{req.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {req.summary ? <p className="text-sm text-muted-foreground">{req.summary}</p> : null}
          <div className="flex flex-wrap gap-1">
            {req.primarySkills.map((s) => (
              <Badge key={s}>{s}</Badge>
            ))}
            {req.secondarySkills.map((s) => (
              <Badge key={s} variant="secondary">
                {s}
              </Badge>
            ))}
            {req.minYears ? <Badge variant="outline">{req.minYears}+ yrs</Badge> : null}
            {req.seniority ? <Badge variant="outline">{req.seniority}</Badge> : null}
          </div>
          <ul className="space-y-1 text-sm">
            {result.executiveSummary.map((line) => (
              <li key={line}>• {line}</li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Ranked {result.candidates.length} of {result.poolSize} employees using synchronized GitHub, Jira, ClickUp and HR
            data.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {result.candidates.map((candidate) => (
          <CandidateCard
            key={candidate.employeeId}
            candidate={candidate}
            selectable={!!onToggleSelect}
            selected={selectedIds?.includes(candidate.employeeId)}
            onSelectChange={(checked) => onToggleSelect?.(candidate.employeeId, checked)}
          />
        ))}
        {!result.candidates.length ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No employee in the synced pool meets this requirement. Lower the minimum score in matching settings or sync more
              data.
            </CardContent>
          </Card>
        ) : null}
      </div>

      {result.skillGaps.length ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Skill gaps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.skillGaps.map((gap) => (
              <div key={gap.skill}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{gap.skill}</span>
                  <span className="text-muted-foreground">{Math.round(gap.coverage)}% coverage</span>
                </div>
                <Progress value={gap.coverage} className="mt-1 h-1.5" />
                <p className="mt-1 text-xs text-muted-foreground">{gap.recommendation}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {result.team.length ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Suggested team</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {result.team.map((slot) => (
              <div key={slot.role} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-medium">{slot.role}</span>
                <span className="text-muted-foreground">
                  {slot.name ?? "Unfilled"} {slot.name ? `· ${slot.score.toFixed(1)}/10` : ""} — {slot.reason}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Delivery prediction</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          {[
            { label: "Success probability", value: `${result.prediction.successProbability}%` },
            { label: "Delivery confidence", value: `${result.prediction.deliveryConfidence}%` },
            { label: "Risk", value: `${result.prediction.riskPercent}%` },
            { label: "Skill gap", value: `${result.prediction.skillGapPercent}%` },
            { label: "Budget confidence", value: budgetConfidence },
            { label: "Timeline risk", value: result.prediction.timelineRisk },
            { label: "Team readiness", value: `${teamReadiness}%` },
            { label: "Resource gap", value: `${result.prediction.resourceGap}` },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border bg-muted/40 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{item.label}</div>
              <div className="text-lg font-semibold capitalize">{item.value}</div>
            </div>
          ))}
          {result.prediction.notes.length ? (
            <ul className="sm:col-span-4 space-y-0.5 text-xs text-muted-foreground">
              {result.prediction.notes.map((n) => (
                <li key={n}>• {n}</li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}