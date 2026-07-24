import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, Building2, DollarSign, MapPin, Pencil, Plus, Trash2, UserCog, Users, UsersRound,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { FormDialog } from "@/features/shared/form-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { useAuth } from "@/providers/auth-provider";
import {
  useDepartment, useDepartmentEmployees, useDepartmentMutations, useDepartmentsList,
  transferEmployees,
} from "@/features/departments/api";
import { DepartmentFormDialog } from "@/features/departments/department-form";
import { useDepartments } from "@/features/shared/hooks";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/departments/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Department — TalentAI Enterprise` },
      { name: "description", content: `Department profile, teams, employees and activity for ${params.id}.` },
      { property: "og:title", content: "Department — TalentAI" },
      { property: "og:description", content: "Department overview, employees, teams and activity." },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DepartmentDetailPage,
});

function DepartmentDetailPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { canManageWorkforce } = useAuth();
  const dept = useDepartment(id);
  const emps = useDepartmentEmployees(id);
  const list = useDepartmentsList();
  const m = useDepartmentMutations();
  const [editOpen, setEditOpen] = useState(false);

  const teamsQ = useQuery({
    queryKey: ["dept-teams-full", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, description, department_id, deleted_at, created_at")
        .eq("department_id", id)
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const auditQ = useQuery({
    queryKey: ["dept-audit", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, action, entity_type, before_state, after_state, created_at")
        .eq("entity_type", "department")
        .eq("entity_id", id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const d = dept.data;

  if (dept.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  if (!d) {
    return (
      <EmptyState icon={Building2} title="Department not found" description="It may have been deleted or you don't have access." />
    );
  }

  const existingCodes = new Set((list.data ?? []).map((x) => x.department_code?.toLowerCase()).filter(Boolean) as string[]);
  const employeesCount = (emps.data ?? []).length;
  const teamsCount = (teamsQ.data ?? []).length;

  return (
    <div>
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/departments"><ArrowLeft className="mr-2 h-4 w-4" />Back to departments</Link>
        </Button>
      </div>
      <PageHeader
        title={d.name}
        description={d.description ?? "Department profile"}
        actions={
          canManageWorkforce && (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" />Edit
              </Button>
              <ConfirmDialog
                title={`Delete ${d.name}?`}
                onConfirm={async () => { await m.remove.mutateAsync(d.id); toast.success("Deleted"); nav({ to: "/departments" }); }}
                trigger={<Button variant="outline" size="sm" className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</Button>}
              />
            </>
          )
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-start gap-4">
            <span
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg text-lg font-semibold text-white"
              style={{ backgroundColor: d.color ?? "#6366f1" }}
            >
              {d.name.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-semibold">{d.name}</h2>
                <Badge variant="outline" className="capitalize">{d.status}</Badge>
                {d.department_code && <span className="font-mono text-xs text-muted-foreground">{d.department_code}</span>}
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <Info label="Manager" value={d.manager?.full_name ?? d.manager?.email ?? "—"} icon={UserCog} />
                <Info label="Location" value={d.location ?? "—"} icon={MapPin} />
                <Info label="Budget" value={d.budget != null ? d.budget.toLocaleString() : "—"} icon={DollarSign} />
                <Info label="Email" value={d.email ?? "—"} />
                <Info label="Phone" value={d.phone ?? "—"} />
                <Info label="Created" value={formatDate(d.created_at)} />
              </dl>
            </div>
          </div>
        </Card>
        <div className="grid grid-cols-2 gap-3">
          <MiniStat label="Employees" value={employeesCount} icon={Users} loading={emps.isLoading} />
          <MiniStat label="Teams" value={teamsCount} icon={UsersRound} loading={teamsQ.isLoading} />
        </div>
      </div>

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card className="p-5">
            <h3 className="mb-2 text-sm font-medium">Description</h3>
            <p className="text-sm text-muted-foreground">{d.description || "No description provided."}</p>
            {d.notes && (
              <>
                <h3 className="mb-2 mt-5 text-sm font-medium">Notes</h3>
                <p className="whitespace-pre-line text-sm text-muted-foreground">{d.notes}</p>
              </>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="employees" className="mt-4">
          <DepartmentEmployeesTab
            departmentId={d.id}
            canManage={canManageWorkforce}
            onChanged={() => {
              qc.invalidateQueries({ queryKey: ["department-employees", d.id] });
              qc.invalidateQueries({ queryKey: ["employees"] });
            }}
          />
        </TabsContent>

        <TabsContent value="teams" className="mt-4">
          <DepartmentTeamsTab
            departmentId={d.id}
            canManage={canManageWorkforce}
            teams={teamsQ.data ?? []}
            loading={teamsQ.isLoading}
            onChanged={() => qc.invalidateQueries({ queryKey: ["dept-teams-full", d.id] })}
          />
        </TabsContent>

        <TabsContent value="projects" className="mt-4">
          <EmptyState icon={Building2} title="Projects coming soon" description="Assign projects to this department once the projects module is expanded." />
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card className="divide-y">
            {auditQ.isLoading ? (
              <div className="p-4"><Skeleton className="h-4 w-40" /></div>
            ) : (auditQ.data ?? []).length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No recent activity for this department.
              </div>
            ) : (
              (auditQ.data ?? []).map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 text-sm">
                  <span className="capitalize">{a.action.replace(/_/g, " ")}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(a.created_at)}</span>
                </div>
              ))
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <DepartmentFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        initial={d}
        existingCodes={existingCodes}
        onSubmit={async (v) => { await m.update.mutateAsync({ id: d.id, values: v }); toast.success("Updated"); }}
      />
    </div>
  );
}

function Info({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ElementType }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />}{label}
      </dt>
      <dd className="mt-0.5 truncate font-medium">{value}</dd>
    </div>
  );
}

function MiniStat({ label, value, icon: Icon, loading }: { label: string; value: number; icon: React.ElementType; loading?: boolean }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">
        {loading ? <Skeleton className="h-7 w-10" /> : value}
      </div>
    </Card>
  );
}

function DepartmentEmployeesTab({ departmentId, canManage, onChanged }: { departmentId: string; canManage: boolean; onChanged: () => void }) {
  const emps = useDepartmentEmployees(departmentId);
  const depts = useDepartments();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [transferTo, setTransferTo] = useState<string>("");
  const [transferOpen, setTransferOpen] = useState(false);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const arr = emps.data ?? [];
    if (!t) return arr;
    return arr.filter((e) =>
      [e.full_name, e.email, e.employee_code, e.designation].some((x) => x?.toLowerCase().includes(t)),
    );
  }, [emps.data, q]);

  const removeFromDept = async (id: string) => {
    await transferEmployees([id], null);
    toast.success("Employee removed from department");
    setSelected((s) => s.filter((x) => x !== id));
    onChanged();
  };

  const doTransfer = async () => {
    const ids = selected.length ? selected : [];
    if (!ids.length) return;
    await transferEmployees(ids, transferTo || null);
    toast.success(`Transferred ${ids.length} employees`);
    setSelected([]);
    onChanged();
  };

  const deptOptions = (depts.data ?? []).filter((x) => x.id !== departmentId);

  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input placeholder="Search employees…" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 max-w-xs" />
        {canManage && selected.length > 0 && (
          <>
            <span className="text-xs text-muted-foreground">{selected.length} selected</span>
            <FormDialog
              open={transferOpen}
              onOpenChange={setTransferOpen}
              title="Bulk transfer"
              description="Move selected employees to another department."
              onSubmit={async () => { await doTransfer(); setTransferOpen(false); }}
              trigger={<Button size="sm" variant="outline">Transfer selected</Button>}
            >
              <div>
                <Label>Target department</Label>
                <Select value={transferTo} onValueChange={setTransferTo}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {deptOptions.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </FormDialog>
          </>
        )}
      </div>

      {emps.isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title="No employees in this department" />
      ) : (
        <div className="divide-y">
          {filtered.map((e) => (
            <div key={e.id} className="flex items-center gap-3 py-2">
              {canManage && (
                <Checkbox
                  checked={selected.includes(e.id)}
                  onCheckedChange={(c) => setSelected((s) => c ? [...s, e.id] : s.filter((x) => x !== e.id))}
                />
              )}
              <div className="min-w-0 flex-1">
                <Link to="/employees/$id" params={{ id: e.id }} className="truncate font-medium hover:underline">
                  {e.full_name}
                </Link>
                <div className="truncate text-xs text-muted-foreground">
                  {e.designation ?? "—"} · {e.email}
                </div>
              </div>
              {canManage && (
                <ConfirmDialog
                  title={`Remove ${e.full_name}?`}
                  description="This unassigns the employee from this department."
                  confirmLabel="Remove"
                  onConfirm={() => removeFromDept(e.id)}
                  trigger={<Button variant="ghost" size="sm" className="text-destructive">Remove</Button>}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function DepartmentTeamsTab({
  departmentId, canManage, teams, loading, onChanged,
}: {
  departmentId: string; canManage: boolean;
  teams: Array<{ id: string; name: string; description: string | null; department_id: string }>;
  loading: boolean;
  onChanged: () => void;
}) {
  const depts = useDepartments();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { organizationId } = useAuth();

  const createTeam = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("Not signed in");
      if (!name.trim()) throw new Error("Name required");
      const { error } = await supabase.from("teams").insert({
        name: name.trim(),
        description: description.trim() || null,
        department_id: departmentId,
        organization_id: organizationId,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Team created"); setName(""); setDescription(""); onChanged(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const moveTeam = useMutation({
    mutationFn: async ({ id, to }: { id: string; to: string }) => {
      const { error } = await supabase.from("teams").update({ department_id: to }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Team moved"); onChanged(); },
  });

  const deleteTeam = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("teams").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Team deleted"); onChanged(); },
  });

  const otherDepts = (depts.data ?? []).filter((d) => d.id !== departmentId);

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{teams.length} teams</div>
        {canManage && (
          <FormDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            title="Create team"
            onSubmit={async () => { await createTeam.mutateAsync(); setCreateOpen(false); }}
            trigger={<Button size="sm"><Plus className="mr-2 h-4 w-4" />Create team</Button>}
          >
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div><Label>Description</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
            </div>
          </FormDialog>
        )}
      </div>
      {loading ? (
        <Skeleton className="h-24 w-full" />
      ) : teams.length === 0 ? (
        <EmptyState icon={UsersRound} title="No teams yet" />
      ) : (
        <div className="divide-y">
          {teams.map((t) => (
            <div key={t.id} className="flex items-center gap-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{t.name}</div>
                {t.description && <div className="truncate text-xs text-muted-foreground">{t.description}</div>}
              </div>
              {canManage && otherDepts.length > 0 && (
                <Select onValueChange={(to) => moveTeam.mutate({ id: t.id, to })}>
                  <SelectTrigger className="h-8 w-[160px]"><SelectValue placeholder="Move to…" /></SelectTrigger>
                  <SelectContent>
                    {otherDepts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {canManage && (
                <ConfirmDialog
                  title={`Delete team ${t.name}?`}
                  onConfirm={() => deleteTeam.mutateAsync(t.id)}
                  trigger={<Button variant="ghost" size="sm" className="text-destructive">Delete</Button>}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}