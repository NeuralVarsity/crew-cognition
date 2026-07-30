import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Bell,
  FolderKanban,
  Sparkles,
  Users,
} from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/executive-dashboard")({
  head: () => ({
    meta: [
      { title: "Executive Dashboard — TalentAI Enterprise" },
      {
        name: "description",
        content:
          "Overview of workforce productivity, engineering performance, and project execution across your organization.",
      },
      { property: "og:title", content: "Executive Dashboard — TalentAI Enterprise" },
      {
        property: "og:description",
        content: "Workforce intelligence overview for your organization.",
      },
    ],
  }),
  component: DashboardPage,
});

const stats = [
  { label: "Employees", value: "—", icon: Users, hint: "Connect a source" },
  { label: "Active Projects", value: "—", icon: FolderKanban, hint: "Connect a source" },
  { label: "Productivity Index", value: "—", icon: Activity, hint: "AI engine pending" },
  { label: "Insights Generated", value: "—", icon: BarChart3, hint: "Analytics pending" },
];

function DashboardPage() {
  return (
    <div>
      <PageHeader
        title="Executive Dashboard"
        description="Organization-wide delivery, productivity and project health. For questions, use the AI Workspace."
        actions={
          <>
            <Button variant="outline" size="sm">
              <Bell className="mr-2 h-4 w-4" />
              What's new
            </Button>
            <Button size="sm">
              <Sparkles className="mr-2 h-4 w-4" />
              Connect source
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {s.label}
              </CardTitle>
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
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Engineering activity</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Commits, PRs, and reviews across integrated sources.
              </p>
            </div>
            <Badge variant="secondary">Awaiting data</Badge>
          </CardHeader>
          <CardContent>
            <div className="grid h-48 place-items-center rounded-lg border border-dashed text-sm text-muted-foreground">
              Charts appear once GitHub, Jira, or ClickUp is connected.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick start</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              "Invite your team",
              "Connect GitHub",
              "Connect Jira or ClickUp",
              "Upload an Excel snapshot",
            ].map((step, i) => (
              <div
                key={step}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-medium">
                    {i + 1}
                  </div>
                  <span className="truncate">{step}</span>
                </div>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
