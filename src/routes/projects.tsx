import { createFileRoute } from "@tanstack/react-router";
import { FolderKanban, Pencil, Plus, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/auth-provider";
import { useDepartments } from "@/features/shared/hooks";
import { formatDate } from "@/lib/format";
import type { Database } from "@/integrations/supabase/types";

type Status = Database["public"]["Enums"]["project_status"];
const STATUSES: Status[] = ["planning", "active", "on_hold", "completed", "archived"];
const statusVariant: Record<Status, "default" | "secondary" | "outline" | "destructive"> = {
  planning: "outline",
  active: "default",
  on_hold: "secondary",
  completed: "secondary",
  archived: "destructive",
};

type Row = {
  id: string;
  name: string;
  description: string | null;
  status: Status;
  start_date: string | null;
  end_date: string | null;
  department_id: string | null;
  departments: { name: string } | null;
};

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Projects — TalentAI Enterprise" },
      { name: "description", content: "Project portfolio, execution metrics, and delivery risk." },
      { property: "og:title", content: "Projects — TalentAI" },
      { property: "og:description", content: "Project portfolio and delivery risk." },
    ],
  }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const { organizationId, canManageWorkforce } = useAuth();
  const qc = useQueryClient();
  const depts = useDepartments();
  const [editing, setEditing] = useState<Row | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    status: "planning" as Status,
    start_date: "",
    end_date: "",
    department_id: "",
  });

  const q = useQuery({
    queryKey: ["projects-full", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, description, status, start_date, end_date, department_id, departments(name)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Name is required");
      const payload = {
        name: form.name,
        description: form.description || null,
        status: form.status,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        department_id: form.department_id || null,
      };
      if (editing) {
        const { error } = await supabase.from("projects").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("projects").insert({ ...payload, organization_id: organizationId! });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Project updated" : "Project created");
      qc.invalidateQueries({ queryKey: ["projects-full"] });
      setOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("projects")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Project archived");
      qc.invalidateQueries({ queryKey: ["projects-full"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", description: "", status: "planning", start_date: "", end_date: "", department_id: "" });
    setOpen(true);
  };
  const openEdit = (r: Row) => {
    setEditing(r);
    setForm({
      name: r.name,
      description: r.description ?? "",
      status: r.status,
      start_date: r.start_date ?? "",
      end_date: r.end_date ?? "",
      department_id: r.department_id ?? "",
    });
    setOpen(true);
  };

  const columns: Column<Row>[] = [
    { key: "name", header: "Project", sortValue: (r) => r.name, cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: "department", header: "Department", cell: (r) => r.departments?.name ?? "—" },
    { key: "status", header: "Status", cell: (r) => <Badge variant={statusVariant[r.status]} className="capitalize">{r.status.replace("_", " ")}</Badge> },
    { key: "start", header: "Start", sortValue: (r) => r.start_date ?? "", cell: (r) => formatDate(r.start_date) },
    { key: "end", header: "End", sortValue: (r) => r.end_date ?? "", cell: (r) => formatDate(r.end_date) },
  ];

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title="Projects"
        description="Track initiatives across departments and teams."
        actions={canManageWorkforce && <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />New project</Button>}
      />
      <DataTable
        rows={q.data ?? []}
        columns={columns}
        loading={q.isLoading}
        emptyIcon={FolderKanban}
        emptyTitle="No projects yet"
        emptyDescription="Create a project to assign employees and track delivery."
        emptyAction={canManageWorkforce && <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />New project</Button>}
        rowActions={
          canManageWorkforce
            ? (r) => (
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                  <ConfirmDialog
                    trigger={<Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button>}
                    title={`Archive ${r.name}?`}
                    onConfirm={() => del.mutateAsync(r.id)}
                    confirmLabel="Archive"
                  />
                </div>
              )
            : undefined
        }
      />
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit project" : "New project"}
        submitLabel={editing ? "Save changes" : "Create"}
        onSubmit={() => save.mutateAsync()}
      >
        <div className="space-y-1.5">
          <Label htmlFor="p-name">Name</Label>
          <Input id="p-name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="p-desc">Description</Label>
          <Textarea id="p-desc" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Department</Label>
            <Select value={form.department_id} onValueChange={(v) => setForm((f) => ({ ...f, department_id: v }))}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                {depts.data?.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as Status }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-start">Start date</Label>
            <Input id="p-start" type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-end">End date</Label>
            <Input id="p-end" type="date" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} />
          </div>
        </div>
      </FormDialog>
    </div>
  );
}