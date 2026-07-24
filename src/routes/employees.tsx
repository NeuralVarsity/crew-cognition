import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Building2, Download, FileSpreadsheet, FileText, Plus, Upload, UserCheck, Users, UsersRound, X,
} from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { useAuth } from "@/providers/auth-provider";
import { useDepartments, useTeams } from "@/features/shared/hooks";
import { useEmployeesList, useEmployeeMutations } from "@/features/employees/api";
import { EmployeesTable } from "@/features/employees/employees-table";
import { EmployeeFormDialog } from "@/features/employees/employee-form";
import { ImportDialog } from "@/features/employees/import-dialog";
import { exportCSV, exportXLSX, exportPDF } from "@/features/employees/export";
import type { EmployeeRow } from "@/features/employees/types";

export const Route = createFileRoute("/employees")({
  head: () => ({
    meta: [
      { title: "Employees — TalentAI Enterprise" },
      { name: "description", content: "Enterprise HR directory: search, filter, import and manage your workforce." },
      { property: "og:title", content: "Employees — TalentAI" },
      { property: "og:description", content: "Enterprise HR directory with search, filters, imports and analytics." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EmployeesPage,
});

function EmployeesPage() {
  const { canManageWorkforce } = useAuth();
  const depts = useDepartments();
  const list = useEmployeesList();
  const m = useEmployeeMutations();

  const [selected, setSelected] = useState<string[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeeRow | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState<null | "department" | "team">(null);
  const [filterDept, setFilterDept] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");

  const rows = list.data ?? [];
  const stats = useMemo(() => {
    const deptIds = new Set<string>();
    const teamIds = new Set<string>();
    let active = 0, onLeave = 0;
    for (const r of rows) {
      if (r.department_id) deptIds.add(r.department_id);
      if (r.team_id) teamIds.add(r.team_id);
      if (r.status === "active") active++;
      if (r.status === "on_leave") onLeave++;
    }
    return { total: rows.length, active, onLeave, depts: deptIds.size, teams: teamIds.size };
  }, [rows]);

  const selectedRows = rows.filter((r) => selected.includes(r.id));
  const clearSel = () => setSelected([]);

  const handleSubmit = async (v: Parameters<typeof m.create.mutateAsync>[0]) => {
    if (editing) {
      await m.update.mutateAsync({ id: editing.id, values: v });
      toast.success("Employee updated");
    } else {
      await m.create.mutateAsync(v);
      toast.success("Employee added");
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title="Employees"
        description="Enterprise HR directory for your entire workforce."
        actions={
          canManageWorkforce && (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Upload className="mr-2 h-4 w-4" /> Import
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Export {rows.length} employees</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => exportCSV(rows)}><FileText className="mr-2 h-4 w-4" /> CSV</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportXLSX(rows)}><FileSpreadsheet className="mr-2 h-4 w-4" /> Excel</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportPDF(rows)}><FileText className="mr-2 h-4 w-4" /> PDF</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" /> Add employee
              </Button>
            </div>
          )
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard icon={Users} label="Total" value={stats.total} loading={list.isLoading} />
        <StatCard icon={UserCheck} label="Active" value={stats.active} tone="text-emerald-500" loading={list.isLoading} />
        <StatCard icon={UserCheck} label="On leave" value={stats.onLeave} tone="text-amber-500" loading={list.isLoading} />
        <StatCard icon={Building2} label="Departments" value={stats.depts} loading={list.isLoading} />
        <StatCard icon={UsersRound} label="Teams" value={stats.teams} loading={list.isLoading} />
      </div>

      {selected.length > 0 && canManageWorkforce && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border bg-accent/40 px-3 py-2 text-sm animate-in slide-in-from-top-2">
          <span className="font-medium">{selected.length} selected</span>
          <Button variant="ghost" size="sm" onClick={clearSel}><X className="mr-1 h-3 w-3" /> Clear</Button>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setBulkOpen("department")}>Change department</Button>
            <Button size="sm" variant="outline" onClick={() => setBulkOpen("team")}>Change team</Button>
            <Button size="sm" variant="outline" onClick={() => { exportCSV(selectedRows, "selected-employees.csv"); }}>
              <Download className="mr-1 h-3 w-3" /> Export
            </Button>
            <ConfirmDialog
              destructive={false}
              confirmLabel="Archive"
              title={`Archive ${selected.length} employees?`}
              description="They will be marked terminated but remain in the directory."
              onConfirm={async () => { await m.archive.mutateAsync(selected); toast.success("Archived"); clearSel(); }}
              trigger={<Button size="sm" variant="outline">Archive</Button>}
            />
            <ConfirmDialog
              title={`Delete ${selected.length} employees?`}
              description="They will be removed from the directory."
              onConfirm={async () => { await m.remove.mutateAsync(selected); toast.success("Deleted"); clearSel(); }}
              trigger={<Button size="sm" variant="destructive">Delete</Button>}
            />
          </div>
        </div>
      )}

      <EmployeesTable
        rows={rows}
        loading={list.isLoading}
        canManage={canManageWorkforce}
        selected={selected}
        onSelectedChange={setSelected}
        onEdit={(r) => { setEditing(r); setFormOpen(true); }}
        onDelete={async (r) => { await m.remove.mutateAsync([r.id]); toast.success("Deleted"); }}
        onArchive={async (r) => { await m.archive.mutateAsync([r.id]); toast.success("Archived"); }}
        filterDept={filterDept} setFilterDept={setFilterDept}
        filterStatus={filterStatus} setFilterStatus={setFilterStatus}
        filterType={filterType} setFilterType={setFilterType}
        departments={depts.data ?? []}
      />

      <EmployeeFormDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} onSubmit={handleSubmit} />
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        existing={rows}
        onImport={async (r) => { await m.bulkInsert.mutateAsync(r); }}
      />
      <BulkReassignDialog
        kind={bulkOpen}
        onClose={() => setBulkOpen(null)}
        onApply={async (id) => {
          if (bulkOpen === "department") await m.bulkUpdate.mutateAsync({ ids: selected, patch: { department_id: id, team_id: null } });
          else if (bulkOpen === "team") await m.bulkUpdate.mutateAsync({ ids: selected, patch: { team_id: id } });
          toast.success("Updated");
          setBulkOpen(null); clearSel();
        }}
      />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone, loading }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; tone?: string; loading?: boolean }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase text-muted-foreground">{label}</div>
        <Icon className={`h-4 w-4 ${tone ?? "text-muted-foreground"}`} />
      </div>
      <div className="mt-2 text-2xl font-semibold">
        {loading ? <Skeleton className="h-7 w-16" /> : value.toLocaleString()}
      </div>
    </Card>
  );
}

function BulkReassignDialog({
  kind, onClose, onApply,
}: {
  kind: "department" | "team" | null;
  onClose: () => void;
  onApply: (id: string) => Promise<void>;
}) {
  const [id, setId] = useState("");
  const depts = useDepartments();
  const teams = useTeams(null);
  const options = kind === "department" ? (depts.data ?? []) : (teams.data ?? []);
  return (
    <Dialog open={!!kind} onOpenChange={(o) => { if (!o) { setId(""); onClose(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change {kind}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label className="text-xs">Select {kind}</Label>
          <Select value={id} onValueChange={setId}>
            <SelectTrigger><SelectValue placeholder={`Choose ${kind}`} /></SelectTrigger>
            <SelectContent>
              {options.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!id} onClick={() => onApply(id)}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}