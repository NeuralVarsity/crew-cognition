import { createFileRoute } from "@tanstack/react-router";
import { Building2, Pencil, Plus, Trash2 } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/auth-provider";
import { formatDate } from "@/lib/format";

type Row = { id: string; name: string; description: string | null; created_at: string };

export const Route = createFileRoute("/departments")({
  head: () => ({
    meta: [
      { title: "Departments — TalentAI Enterprise" },
      { name: "description", content: "Departmental structure and aggregated metrics." },
      { property: "og:title", content: "Departments — TalentAI" },
      { property: "og:description", content: "Departmental structure and metrics." },
    ],
  }),
  component: DepartmentsPage,
});

function DepartmentsPage() {
  const { organizationId, canManageWorkforce } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Row | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });

  const q = useQuery({
    queryKey: ["departments-full", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name, description, created_at")
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Name is required");
      if (editing) {
        const { error } = await supabase
          .from("departments")
          .update({ name: form.name, description: form.description || null })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("departments").insert({
          name: form.name,
          description: form.description || null,
          organization_id: organizationId!,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Department updated" : "Department created");
      qc.invalidateQueries({ queryKey: ["departments"] });
      qc.invalidateQueries({ queryKey: ["departments-full"] });
      setOpen(false);
      setEditing(null);
      setForm({ name: "", description: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("departments")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Department deleted");
      qc.invalidateQueries({ queryKey: ["departments"] });
      qc.invalidateQueries({ queryKey: ["departments-full"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", description: "" });
    setOpen(true);
  };
  const openEdit = (r: Row) => {
    setEditing(r);
    setForm({ name: r.name, description: r.description ?? "" });
    setOpen(true);
  };

  const columns: Column<Row>[] = [
    { key: "name", header: "Name", sortValue: (r) => r.name, cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: "description", header: "Description", cell: (r) => <span className="text-muted-foreground">{r.description ?? "—"}</span> },
    { key: "created_at", header: "Created", sortValue: (r) => r.created_at, cell: (r) => formatDate(r.created_at) },
  ];

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title="Departments"
        description="Organize your company into departments."
        actions={
          canManageWorkforce && (
            <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />New department</Button>
          )
        }
      />
      <DataTable
        rows={q.data ?? []}
        columns={columns}
        loading={q.isLoading}
        emptyIcon={Building2}
        emptyTitle="No departments yet"
        emptyDescription="Create your first department to organize teams and employees."
        emptyAction={canManageWorkforce && <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />New department</Button>}
        rowActions={
          canManageWorkforce
            ? (r) => (
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                  <ConfirmDialog
                    trigger={<Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button>}
                    title={`Delete ${r.name}?`}
                    description="This department will be archived. Teams and employees will remain but lose this association."
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
        title={editing ? "Edit department" : "New department"}
        submitLabel={editing ? "Save changes" : "Create"}
        onSubmit={() => save.mutateAsync()}
      >
        <div className="space-y-1.5">
          <Label htmlFor="d-name">Name</Label>
          <Input id="d-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="d-desc">Description</Label>
          <Textarea id="d-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
        </div>
      </FormDialog>
    </div>
  );
}