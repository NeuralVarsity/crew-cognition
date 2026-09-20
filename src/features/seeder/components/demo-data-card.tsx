import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Database, Loader2, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { clearDemoData, seedDemoData } from "../api/seed.functions";

/** Keeps raw database errors out of the demo UI. */
function friendlyError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  if (/permission|forbidden|not authenticated|role required/i.test(raw))
    return "You need organization admin access to manage demo data.";
  if (/network|fetch|timeout|failed to fetch/i.test(raw))
    return "The demo workspace could not be reached. Please try again.";
  return "We could not finish updating the demo workspace. Please try again.";
}

export function DemoDataCard() {
  const queryClient = useQueryClient();
  const runSeed = useServerFn(seedDemoData);
  const runClear = useServerFn(clearDemoData);
  const inFlight = useRef(false);

  const seedMutation = useMutation({
    mutationFn: async (vars: { seed?: number } = {}) => {
      const seed = vars.seed ?? 20260101;
      let fromBatch = 0;
      let rows = 0;
      const startedAt = Date.now();
      toast.loading("Refreshing demo environment…", { id: "seed-progress" });
      // The dataset is large, so seeding streams through in stages.
      for (let stage = 0; stage < 40; stage++) {
        const res = await runSeed({ data: { reset: fromBatch === 0, seed, fromBatch } });
        rows += res.totalRows;
        toast.loading(`Refreshing demo environment… ${rows.toLocaleString()} records ready`, {
          id: "seed-progress",
        });
        if (res.done || res.nextBatch == null) break;
        fromBatch = res.nextBatch;
      }
      return { rows, durationMs: Date.now() - startedAt };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries();
      toast.success(
        `Demo workspace generated successfully — ${res.rows.toLocaleString()} records in ${(res.durationMs / 1000).toFixed(1)}s`,
        { id: "seed-progress" },
      );
    },
    onError: (e) => {
      console.error("[demo-data] seed failed", e);
      toast.error(friendlyError(e), { id: "seed-progress" });
    },
  });

  const clearMutation = useMutation({
    mutationFn: () => runClear({}),
    onSuccess: (res) => {
      queryClient.invalidateQueries();
      toast.success(`Demo workspace cleared — ${res.totalRows.toLocaleString()} records removed`);
    },
    onError: (e) => {
      console.error("[demo-data] clear failed", e);
      toast.error(friendlyError(e));
    },
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