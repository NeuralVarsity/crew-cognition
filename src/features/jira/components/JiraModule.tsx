import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Clock,
  Loader2,
  Plug,
  PlugZap,
  RefreshCw,
  RotateCw,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageHeader } from "@/components/common/page-header";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { useAuth } from "@/providers/auth-provider";
import { useJiraConnection } from "../hooks";
import {
  disconnectJira,
  refreshJiraConnection,
  runJiraSync,
  setJiraAutoSync,
  startJiraOAuth,
} from "../api/jira.functions";
import { JiraDashboard, JiraTeamAnalytics } from "./jira-dashboard";
import {
  JiraEpicsTab,
  JiraIssuesTab,
  JiraProjectsTab,
  JiraSprintsTab,
  JiraSyncLogsTab,
  JiraWorklogsTab,
} from "./jira-tables";

export function JiraModule() {
  const { canManageWorkforce } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();
  const search = useSearch({ strict: false }) as { connected?: string; error?: string };
  const connectionQ = useJiraConnection();
  const connection = connectionQ.data;
  const connected = !!connection;
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  useEffect(() => {
    if (search.connected) {
      toast.success(`Connected to ${search.connected}`);
      qc.invalidateQueries({ queryKey: ["jira"] });
      nav({ to: "/jira", search: {}, replace: true });
    } else if (search.error) {
      toast.error(`Jira connect failed: ${search.error}`);
      nav({ to: "/jira", search: {}, replace: true });
    }
  }, [search.connected, search.error, qc, nav]);

  const startFn = useServerFn(startJiraOAuth);
  const disconnectFn = useServerFn(disconnectJira);
  const syncFn = useServerFn(runJiraSync);
  const autoSyncFn = useServerFn(setJiraAutoSync);
  const refreshFn = useServerFn(refreshJiraConnection);

  const connectM = useMutation({
    mutationFn: () => startFn({}),
    onSuccess: (res: { url: string }) => {
      window.location.href = res.url;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const disconnectM = useMutation({
    mutationFn: () => disconnectFn({ data: { connectionId: connection!.id } }),
    onSuccess: () => {
      toast.success("Jira workspace disconnected");
      qc.invalidateQueries({ queryKey: ["jira"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const syncM = useMutation({
    mutationFn: (full: boolean) => syncFn({ data: { connectionId: connection!.id, full } }),
    onSuccess: () => {
      toast.success("Sync completed");
      qc.invalidateQueries({ queryKey: ["jira"] });
    },
    onError: (e: Error) => toast.error(`Sync failed: ${e.message}`),
  });

  const autoSyncM = useMutation({
    mutationFn: (autoSync: boolean) => autoSyncFn({ data: { connectionId: connection!.id, autoSync } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jira", "connection"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const refreshM = useMutation({
    mutationFn: () => refreshFn({ data: { connectionId: connection!.id } }),
    onSuccess: () => {
      toast.success("Connection refreshed");
      qc.invalidateQueries({ queryKey: ["jira", "connection"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const syncing = syncM.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jira"
        description="Project execution, sprint performance and delivery analytics from Jira Cloud."
        actions={
          connected && canManageWorkforce ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => syncM.mutate(false)} disabled={syncing}>
                {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Sync
              </Button>
              <Button size="sm" onClick={() => syncM.mutate(true)} disabled={syncing}>
                <RotateCw className="mr-2 h-4 w-4" />
                Full sync
              </Button>
            </div>
          ) : null
        }
      />

      {connectionQ.isLoading ? (
        <Skeleton className="h-56 w-full" />
      ) : !connected ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-5 w-5" /> Connect your Jira Cloud workspace
            </CardTitle>
            <CardDescription>
              Authorize Jira to sync projects, boards, sprints, epics, issues, comments and worklogs. Tokens are
              encrypted at rest and refreshed automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!canManageWorkforce && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Read-only access</AlertTitle>
                <AlertDescription>Ask an admin or engineering manager to connect Jira.</AlertDescription>
              </Alert>
            )}
            <Button onClick={() => connectM.mutate()} disabled={!canManageWorkforce || connectM.isPending}>
              {connectM.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plug className="mr-2 h-4 w-4" />}
              Connect Jira
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="dashboard" className="space-y-4">
          <div className="overflow-x-auto">
            <TabsList>
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="sprints">Sprints</TabsTrigger>
              <TabsTrigger value="epics">Epics</TabsTrigger>
              <TabsTrigger value="issues">Issues</TabsTrigger>
              <TabsTrigger value="team">Team</TabsTrigger>
              <TabsTrigger value="worklogs">Worklogs</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dashboard"><JiraDashboard /></TabsContent>
          <TabsContent value="projects"><JiraProjectsTab /></TabsContent>
          <TabsContent value="sprints"><JiraSprintsTab /></TabsContent>
          <TabsContent value="epics"><JiraEpicsTab /></TabsContent>
          <TabsContent value="issues"><JiraIssuesTab /></TabsContent>
          <TabsContent value="team"><JiraTeamAnalytics /></TabsContent>
          <TabsContent value="worklogs"><JiraWorklogsTab /></TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Connection</CardTitle>
                <CardDescription>Jira Cloud workspace linked to this organization.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <dt className="text-xs uppercase text-muted-foreground">Workspace</dt>
                    <dd className="mt-1 font-medium">{connection!.site_name || connection!.site_url}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-muted-foreground">Cloud ID</dt>
                    <dd className="mt-1 break-all font-mono text-xs">{connection!.cloud_id}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-muted-foreground">Status</dt>
                    <dd className="mt-1">
                      <Badge variant={connection!.last_sync_status === "failed" ? "destructive" : "default"}>
                        {connection!.last_sync_status ?? "connected"}
                      </Badge>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-muted-foreground">Last sync</dt>
                    <dd className="mt-1 flex items-center gap-1 text-sm">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      {connection!.last_sync_at ? new Date(connection!.last_sync_at).toLocaleString() : "Never"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-muted-foreground">Token expires</dt>
                    <dd className="mt-1 text-sm">
                      {connection!.token_expires_at
                        ? new Date(connection!.token_expires_at).toLocaleString()
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-muted-foreground">Scopes</dt>
                    <dd className="mt-1 line-clamp-2 text-xs text-muted-foreground">{connection!.scope ?? "—"}</dd>
                  </div>
                </dl>

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="text-sm font-medium">Automatic sync</div>
                    <p className="text-xs text-muted-foreground">
                      Keep Jira data fresh with scheduled incremental syncs.
                    </p>
                  </div>
                  <Switch
                    checked={!!connection!.auto_sync}
                    disabled={!canManageWorkforce || autoSyncM.isPending}
                    onCheckedChange={(v) => autoSyncM.mutate(v)}
                  />
                </div>

                {canManageWorkforce ? (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => syncM.mutate(false)} disabled={syncing}>
                      <RefreshCw className="mr-2 h-4 w-4" /> Incremental sync
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => syncM.mutate(true)} disabled={syncing}>
                      <RotateCw className="mr-2 h-4 w-4" /> Full sync
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => refreshM.mutate()} disabled={refreshM.isPending}>
                      <PlugZap className="mr-2 h-4 w-4" /> Refresh connection
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => connectM.mutate()} disabled={connectM.isPending}>
                      <Plug className="mr-2 h-4 w-4" /> Reconnect
                    </Button>
                    <ConfirmDialog
                      trigger={
                        <Button variant="destructive" size="sm">
                          <Trash2 className="mr-2 h-4 w-4" /> Disconnect
                        </Button>
                      }
                      title="Disconnect Jira?"
                      description="This removes the encrypted tokens and all synced Jira data for this organization."
                      confirmLabel="Disconnect"
                      destructive
                      onConfirm={() => disconnectM.mutate()}
                    />
                  </div>
                ) : (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>Read-only</AlertTitle>
                    <AlertDescription>Only admins and engineering managers can manage this connection.</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sync history</CardTitle>
              </CardHeader>
              <CardContent>
                <JiraSyncLogsTab />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

    </div>
  );
}