import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Database, Loader2, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { clearDemoData, seedDemoData } from "../api/seed.functions";

export function DemoDataCard() {
  const queryClient = useQueryClient();
  const runSeed = useServerFn(seedDemoData);
  const runClear = useServerFn(clearDemoData);
  const seedMutation = useMutation({
    mutationFn: (vars: { seed?: number } = {}) => runSeed({ data: { reset: true, seed: vars.seed } }),
    onSuccess: (res) => {
      queryClient.invalidateQueries();
      toast.success(`Seeded ${res.totalRows.toLocaleString()} demo rows in ${(res.durationMs / 1000).toFixed(1)}s`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clearMutation = useMutation({
    mutationFn: () => runClear({}),
    onSuccess: (res) => {
      queryClient.invalidateQueries();
      toast.success(`Removed ${res.totalRows.toLocaleString()} rows`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const busy = seedMutation.isPending || clearMutation.isPending;

  const refreshScores = () => {
    queryClient.invalidateQueries();
    toast.success("AI scores and analytics refreshed from the latest data");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="h-4 w-4" /> Demo mode
        </CardTitle>
        <CardDescription>
          Generate a realistic, fully interconnected demo workspace — employees, departments, teams,
          projects, GitHub, Jira, ClickUp, AI scores, HR history, proposals and reports. Seeding
          replaces all existing records in this organization.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <ConfirmDialog
          title="Seed demo data?"
          description="This deletes every existing record in this organization and replaces it with generated demo data. This cannot be undone."
          confirmLabel="Seed"
          destructive
          onConfirm={() => seedMutation.mutate({})}
          trigger={
            <Button size="sm" disabled={busy}>
              {seedMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Database className="mr-2 h-4 w-4" />
              )}
              Generate demo data
            </Button>
          }
        />
        <ConfirmDialog
          title="Reset demo data?"
          description="Clears the organization and regenerates a brand new randomized demo dataset."
          confirmLabel="Reset"
          destructive
          onConfirm={() => seedMutation.mutate({ seed: Math.floor(Math.random() * 1_000_000) })}
          trigger={
            <Button size="sm" variant="secondary" disabled={busy}>
              <RotateCcw className="mr-2 h-4 w-4" /> Reset demo data
            </Button>
          }
        />
        <ConfirmDialog
          title="Clear all data?"
          description="This permanently deletes all workforce, integration and analytics records in this organization."
          confirmLabel="Clear"
          destructive
          onConfirm={() => clearMutation.mutate()}
          trigger={
            <Button size="sm" variant="outline" disabled={busy}>
              {clearMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Clear demo data
            </Button>
          }
        />
        <Button size="sm" variant="ghost" disabled={busy} onClick={refreshScores}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh AI scores
        </Button>
      </CardContent>
    </Card>
  );
}