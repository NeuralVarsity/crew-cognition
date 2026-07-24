import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { DataTable, type Column } from "@/components/common/data-table";
import { FormDialog } from "@/features/shared/form-dialog";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/auth-provider";
import { useDepartments, useTeams } from "@/features/shared/hooks";
import { initials } from "@/lib/format";
import type { Database } from "@/integrations/supabase/types";

type EmployeeStatus = Database["public"]["Enums"]["employee_status"];
type EmploymentType = Database["public"]["Enums"]["employment_type"];

const STATUS: EmployeeStatus[] = ["active", "on_leave", "probation", "terminated"];
const TYPES: EmploymentType[] = ["full_time", "part_time", "contract", "intern", "consultant"];

type Row = {
  id: string;
  full_name: string;
  email: string;
  employee_code: string;
  designation: string | null;
  status: EmployeeStatus;
  employment_type: EmploymentType;
  department_id: string | null;
  team_id: string | null;
  departments: { name: string } | null;
  teams: { name: string } | null;
};

const statusVariant: Record<EmployeeStatus, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  on_leave: "secondary",
  probation: "outline",
  terminated: "destructive",
};

export const Route = createFileRoute("/employees")({
  head: () => ({
    meta: [
      { title: "Employees — TalentAI Enterprise" },
      { name: "description", content: "Directory of employees, roles, and performance signals." },
      { property: "og:title", content: "Employees — TalentAI" },
      { property: "og:description", content: "Employee directory and performance signals." },
    ],
  }),
  component: EmployeesPage,
});

function EmployeesPage() {
  const { organizationId, canManageWorkforce } = useAuth();
  const qc = useQueryClient();
  const depts = useDepartments();
  const [editing, setEditing] = useState<Row | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    employee_code: "",
    designation: "",
    status: "active" as EmployeeStatus,
    employment_type: "full_time" as EmploymentType,
    department_id: "",
    team_id: "",
  });
  const teams = useTeams(form.department_id || null);

  const q = useQuery({
    queryKey: ["employees-full", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, full_name, email, employee_code, designation, status, employment_type, department_id, team_id, departments(name), teams(name)")
        .is("deleted_at", null)
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.full_name.trim() || !form.email.trim() || !form.employee_code.trim())
        throw new Error("Name, email and employee code are required");
      const payload = {
        full_name: form.full_name,
        email: form.email,
        employee_code: form.employee_code,
        designation: form.designation || null,
        status: form.status,
        employment_type: form.employment_type,
        department_id: form.department_id || null,
        team_id: form.team_id || null,
      };
      if (editing) {
        const { error } = await supabase.from("employees").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("employees")
          .insert({ ...payload, organization_id: organizationId! });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Employee updated" : "Employee created");
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["employees-full"] });
      setOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("employees")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Employee removed");
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["employees-full"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({
      full_name: "",
      email: "",
      employee_code: "",
      designation: "",
      status: "active",
      employment_type: "full_time",
      department_id: "",
      team_id: "",
    });
    setOpen(true);
  };
  const openEdit = (r: Row) => {
    setEditing(r);
    setForm({
      full_name: r.full_name,
      email: r.email,
      employee_code: r.employee_code,
      designation: r.designation ?? "",
      status: r.status,
      employment_type: r.employment_type,
      department_id: r.department_id ?? "",
      team_id: r.team_id ?? "",
    });
    setOpen(true);
  };

  const columns: Column<Row>[] = [
    {
      key: "name",
      header: "Employee",
      sortValue: (r) => r.full_name,
      cell: (r) => (
        <div className="flex items-center gap-2.5">
          <Avatar className="h-8 w-8"><AvatarFallback className="text-xs">{initials(r.full_name)}</AvatarFallback></Avatar>
          <div className="min-w-0">
            <div className="truncate font-medium">{r.full_name}</div>
            <div className="truncate text-xs text-muted-foreground">{r.email}</div>
          </div>
        </div>
      ),
    },
    { key: "code", header: "Code", cell: (r) => <span className="font-mono text-xs">{r.employee_code}</span> },
    { key: "designation", header: "Designation", cell: (r) => r.designation ?? "—" },
    { key: "department", header: "Department", cell: (r) => r.departments?.name ?? "—" },
    { key: "team", header: "Team", cell: (r) => r.teams?.name ?? "—" },
    { key: "type", header: "Type", cell: (r) => <span className="capitalize">{r.employment_type.replace("_", " ")}</span> },
    {
      key: "status",
      header: "Status",
      cell: (r) => <Badge variant={statusVariant[r.status]} className="capitalize">{r.status.replace("_", " ")}</Badge>,
    },
  ];

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title="Employees"
        description="Directory of everyone in your organization."
        actions={
          canManageWorkforce && (
            <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />New employee</Button>
          )
        }
      />
      <DataTable
        rows={q.data ?? []}
        columns={columns}
        loading={q.isLoading}
        emptyIcon={Users}
        emptyTitle="No employees yet"
        emptyDescription="Add your first employee to start building your workforce directory."
        emptyAction={canManageWorkforce && <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />New employee</Button>}
        rowActions={
          canManageWorkforce
            ? (r) => (
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                  <ConfirmDialog
                    trigger={<Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button>}
                    title={`Remove ${r.full_name}?`}
                    description="They will be archived and hidden from the directory."
                    onConfirm={() => del.mutateAsync(r.id)}
                  />
                </div>
              )
            : undefined
        }
      />
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit employee" : "New employee"}
        submitLabel={editing ? "Save changes" : "Create"}
        onSubmit={() => save.mutateAsync()}
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="e-name">Full name</Label>
            <Input id="e-name" required value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-email">Email</Label>
            <Input id="e-email" type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-code">Employee code</Label>
            <Input id="e-code" required value={form.employee_code} onChange={(e) => setForm((f) => ({ ...f, employee_code: e.target.value }))} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="e-desig">Designation</Label>
            <Input id="e-desig" value={form.designation} onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Department</Label>
            <Select value={form.department_id} onValueChange={(v) => setForm((f) => ({ ...f, department_id: v, team_id: "" }))}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                {depts.data?.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Team</Label>
            <Select
              value={form.team_id}
              onValueChange={(v) => setForm((f) => ({ ...f, team_id: v }))}
              disabled={!form.department_id || !teams.data?.length}
            >
              <SelectTrigger><SelectValue placeholder={form.department_id ? "None" : "Select department first"} /></SelectTrigger>
              <SelectContent>
                {teams.data?.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Employment type</Label>
            <Select value={form.employment_type} onValueChange={(v) => setForm((f) => ({ ...f, employment_type: v as EmploymentType }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t.replace("_", " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as EmployeeStatus }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormDialog>
    </div>
  );
}