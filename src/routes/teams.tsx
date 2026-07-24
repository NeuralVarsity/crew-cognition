import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Trash2, UsersRound } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/auth-provider";
import { useDepartments } from "@/features/shared/hooks";

type Row = {
  id: string;
  name: string;
  description: string | null;
  department_id: string;
  departments: { name: string } | null;
};

export const Route = createFileRoute("/teams")({
  head: () => ({
    meta: [
      { title: "Teams — TalentAI Enterprise" },
      { name: "description", content: "Team composition, ownership, and health metrics." },
      { property: "og:title", content: "Teams — TalentAI" },
      { property: "og:description", content: "Team composition and health." },
    ],
  }),
  component: TeamsPage,
});

function TeamsPage() {
  const { organizationId, canManageWorkforce } = useAuth();
  const qc = useQueryClient();
  const depts = useDepartments();
  const [editing, setEditing] = useState<Row | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", department_id: "" });

  const q = useQuery({
    queryKey: ["teams-full", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, description, department_id, departments(name)")
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name.trim() || !form.department_id) throw new Error("Name and department are required");
      if (editing) {
        const { error } = await supabase
          .from("teams")
          .update({ name: form.name, description: form.description || null, department_id: form.department_id })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("teams").insert({
          name: form.name,
          description: form.description || null,
          department_id: form.department_id,
          organization_id: organizationId!,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Team updated" : "Team created");
      qc.invalidateQueries({ queryKey: ["teams"] });
      qc.invalidateQueries({ queryKey: ["teams-full"] });
      setOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("teams")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Team deleted");
      qc.invalidateQueries({ queryKey: ["teams"] });
      qc.invalidateQueries({ queryKey: ["teams-full"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", description: "", department_id: depts.data?.[0]?.id ?? "" });
    setOpen(true);
  };
  const openEdit = (r: Row) => {
    setEditing(r);
    setForm({ name: r.name, description: r.description ?? "", department_id: r.department_id });
    setOpen(true);
  };

  const columns: Column<Row>[] = [
    { key: "name", header: "Team", sortValue: (r) => r.name, cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: "department", header: "Department", cell: (r) => r.departments?.name ?? "—" },
    { key: "description", header: "Description", cell: (r) => <span className="text-muted-foreground">{r.description ?? "—"}</span> },
  ];

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title="Teams"
        description="Group people into teams within departments."
        actions={
          canManageWorkforce && (
            <Button onClick={openCreate} disabled={!depts.data?.length}>
              <Plus className="mr-2 h-4 w-4" />New team
            </Button>
          )
        }
      />
      <DataTable
        rows={q.data ?? []}
        columns={columns}
        loading={q.isLoading}
        emptyIcon={UsersRound}
        emptyTitle="No teams yet"
        emptyDescription={depts.data?.length ? "Create a team inside one of your departments." : "Create a department first, then add teams to it."}
        emptyAction={canManageWorkforce && depts.data?.length ? <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />New team</Button> : null}
        rowActions={
          canManageWorkforce
            ? (r) => (
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                  <ConfirmDialog
                    trigger={<Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button>}
                    title={`Delete ${r.name}?`}
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
        title={editing ? "Edit team" : "New team"}
        submitLabel={editing ? "Save changes" : "Create"}
        onSubmit={() => save.mutateAsync()}
      >
        <div className="space-y-1.5">
          <Label htmlFor="t-name">Name</Label>
          <Input id="t-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
        </div>
        <div className="space-y-1.5">
          <Label>Department</Label>
          <Select value={form.department_id} onValueChange={(v) => setForm((f) => ({ ...f, department_id: v }))}>
            <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
            <SelectContent>
              {depts.data?.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="t-desc">Description</Label>
          <Textarea id="t-desc" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </div>
      </FormDialog>
    </div>
  );
}