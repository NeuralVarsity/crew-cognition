import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  ListChecks,
  Loader2,
  Plug,
  RefreshCw,
  RotateCw,
  ShieldCheck,
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
import { EmptyState } from "@/components/common/empty-state";
import { useAuth } from "@/providers/auth-provider";
import { formatDate } from "@/lib/format";
import { useClickUpConnection } from "../hooks";
import {
  disconnectClickUp,
  runClickUpSync,
  setClickUpAutoSync,
  startClickUpOAuth,
  validateClickUpConnection,
} from "../api/clickup.functions";
import { ClickUpDashboard, ClickUpTeamAnalytics } from "./clickup-dashboard";
import {
  ClickUpFoldersTable,
  ClickUpListsTable,
  ClickUpMembersTable,
  ClickUpSpacesTable,
  ClickUpSyncLogsTable,
  ClickUpTasksTable,
  ClickUpTimeTable,
} from "./clickup-tables";

export function ClickUpModule() {
  const { canManageWorkforce } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();
  const search = useSearch({ strict: false }) as { connected?: string; error?: string };

  const connectionQ = useClickUpConnection();
  const connection = connectionQ.data;
  const connected = !!connection;

  useEffect(() => {
    if (search.connected) {
      toast.success(`Connected to ${search.connected}`);
      qc.invalidateQueries({ queryKey: ["clickup"] });
      nav({ to: "/clickup", search: () => ({}), replace: true });
    } else if (search.error) {
      toast.error(`ClickUp connect failed: ${search.error}`);
      nav({ to: "/clickup", search: () => ({}), replace: true });
    }
  }, [search.connected, search.error, qc, nav]);

  const startFn = useServerFn(startClickUpOAuth);
  const disconnectFn = useServerFn(disconnectClickUp);
  const syncFn = useServerFn(runClickUpSync);
  const autoSyncFn = useServerFn(setClickUpAutoSync);
  const validateFn = useServerFn(validateClickUpConnection);

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
      toast.success("ClickUp workspace disconnected");
      qc.invalidateQueries({ queryKey: ["clickup"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const syncM = useMutation({
    mutationFn: (opts: { full?: boolean; retryOf?: string }) =>
      syncFn({ data: { connectionId: connection!.id, ...opts } }),
    onSuccess: () => {
      toast.success("Sync completed");
      qc.invalidateQueries({ queryKey: ["clickup"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const autoSyncM = useMutation({
    mutationFn: (autoSync: boolean) => autoSyncFn({ data: { connectionId: connection!.id, autoSync } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clickup", "connection"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const validateM = useMutation({
    mutationFn: () => validateFn({ data: { connectionId: connection!.id } }),
    onSuccess: (res: { workspace: string }) => {
      toast.success(`Connection healthy — ${res.workspace}`);
      qc.invalidateQueries({ queryKey: ["clickup", "connection"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const syncing = syncM.isPending;

  if (connectionQ.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="ClickUp"
        description="Task execution, workload and productivity intelligence from your ClickUp workspace."
        actions={
          connected ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["clickup"] })}>
                <RefreshCw className="mr-2 h-4 w-4" /> Refresh
              </Button>
              {canManageWorkforce && (
                <>
                  <Button size="sm" disabled={syncing} onClick={() => syncM.mutate({})}>
                    {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCw className="mr-2 h-4 w-4" />}
                    Sync now
                  </Button>
                  <Button size="sm" variant="secondary" disabled={syncing} onClick={() => syncM.mutate({ full: true })}>
                    Full sync
                  </Button>
                </>
              )}
            </div>
          ) : canManageWorkforce ? (
            <Button size="sm" disabled={connectM.isPending} onClick={() => connectM.mutate()}>
              {connectM.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plug className="mr-2 h-4 w-4" />}
              Connect ClickUp
            </Button>
          ) : null
        }
      />

      {!connected ? (
        <EmptyState
          icon={ListChecks}
          title="ClickUp is not connected"
          description={
            canManageWorkforce
              ? "Connect your ClickUp workspace to sync spaces, folders, lists, tasks and time entries."
              : "Ask an administrator or manager to connect your organization's ClickUp workspace."
          }
          action={
            canManageWorkforce ? (
              <Button onClick={() => connectM.mutate()} disabled={connectM.isPending}>
                <Plug className="mr-2 h-4 w-4" /> Connect ClickUp
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="flex w-full flex-wrap justify-start">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="spaces">Spaces</TabsTrigger>
            <TabsTrigger value="folders">Folders</TabsTrigger>
            <TabsTrigger value="lists">Lists</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="time">Time</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <ClickUpDashboard />
          </TabsContent>
          <TabsContent value="tasks">
            <ClickUpTasksTable />
          </TabsContent>
          <TabsContent value="spaces">
            <ClickUpSpacesTable />
          </TabsContent>
          <TabsContent value="folders">
            <ClickUpFoldersTable />
          </TabsContent>
          <TabsContent value="lists">
            <ClickUpListsTable />
          </TabsContent>
          <TabsContent value="team">
            <ClickUpTeamAnalytics />
          </TabsContent>
          <TabsContent value="members">
            <ClickUpMembersTable />
          </TabsContent>
          <TabsContent value="time">
            <ClickUpTimeTable />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> Connection
                </CardTitle>
                <CardDescription>Workspace connection details and sync behaviour.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Workspace</div>
                    <div className="text-sm font-medium">{connection.workspace_name}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Connected by</div>
                    <div className="text-sm font-medium">{connection.connected_user_name ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Last sync</div>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      {formatDate(connection.last_sync_at)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Status</div>
                    <Badge variant={connection.last_sync_status === "failed" ? "destructive" : "default"}>
                      {connection.last_sync_status ?? "never synced"}
                    </Badge>
                  </div>
                </div>

                {!canManageWorkforce && (
                  <Alert>
                    <AlertTitle>Read-only access</AlertTitle>
                    <AlertDescription>
                      Only administrators and managers can sync, reconnect or disconnect ClickUp.
                    </AlertDescription>
                  </Alert>
                )}

                {canManageWorkforce && (
                  <>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <div className="text-sm font-medium">Automatic sync</div>
                        <div className="text-xs text-muted-foreground">
                          Keep tasks and time entries up to date in the background.
                        </div>
                      </div>
                      <Switch
                        checked={!!connection.auto_sync}
                        onCheckedChange={(v) => autoSyncM.mutate(v)}
                        disabled={autoSyncM.isPending}
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" disabled={validateM.isPending} onClick={() => validateM.mutate()}>
                        <ShieldCheck className="mr-2 h-4 w-4" /> Validate connection
                      </Button>
                      <Button variant="outline" size="sm" disabled={syncing} onClick={() => syncM.mutate({ full: true })}>
                        <RotateCw className="mr-2 h-4 w-4" /> Run full sync
                      </Button>
                      <ConfirmDialog
                        title="Disconnect ClickUp?"
                        description="Synced ClickUp data for this workspace will be removed. You can reconnect at any time."
                        confirmLabel="Disconnect"
                        onConfirm={() => disconnectM.mutate()}
                        trigger={
                          <Button variant="destructive" size="sm" disabled={disconnectM.isPending}>
                            <Trash2 className="mr-2 h-4 w-4" /> Disconnect
                          </Button>
                        }
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <ClickUpSyncLogsTable
              onRetry={canManageWorkforce ? (logId) => syncM.mutate({ retryOf: logId, full: true }) : undefined}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}