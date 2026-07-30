import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Database, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { clearDemoData, seedDemoData } from "../api/seed.functions";

export function DemoDataCard() {
  const queryClient = useQueryClient();
  const runSeed = useServerFn(seedDemoData);
  const runClear = useServerFn(clearDemoData);
  const [confirmSeed, setConfirmSeed] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const seedMutation = useMutation({
    mutationFn: () => runSeed({ data: { reset: true } }),
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="h-4 w-4" /> Demo data
        </CardTitle>
        <CardDescription>
          Generate a realistic, fully interconnected demo workspace — employees, departments, teams,
          projects, GitHub, Jira, ClickUp, AI scores, HR history, proposals and reports. Seeding
          replaces all existing records in this organization.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button size="sm" disabled={busy} onClick={() => setConfirmSeed(true)}>
          {seedMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Database className="mr-2 h-4 w-4" />
          )}
          Seed demo data
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => setConfirmClear(true)}>
          {clearMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="mr-2 h-4 w-4" />
          )}
          Clear demo data
        </Button>
      </CardContent>

      <ConfirmDialog
        open={confirmSeed}
        onOpenChange={setConfirmSeed}
        title="Seed demo data?"
        description="This deletes every existing record in this organization and replaces it with generated demo data. This cannot be undone."
        confirmLabel="Seed"
        onConfirm={() => seedMutation.mutate()}
      />
      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Clear all data?"
        description="This permanently deletes all workforce, integration and analytics records in this organization."
        confirmLabel="Clear"
        onConfirm={() => clearMutation.mutate()}
      />
    </Card>
  );
}