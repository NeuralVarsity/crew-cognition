import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Archive, Building2, Download, Eye, FileSpreadsheet, FileText, MoreHorizontal,
  Pencil, Plus, Trash2, Upload, Users, UsersRound, UserCog,
} from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { DataTable, type Column } from "@/components/common/data-table";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/providers/auth-provider";
import { useEmployees, useTeams } from "@/features/shared/hooks";
import { useDepartmentsList, useDepartmentMutations } from "@/features/departments/api";
import { DepartmentFormDialog } from "@/features/departments/department-form";
import { ImportDepartmentsDialog } from "@/features/departments/import-dialog";
import { exportCSV, exportPDF, exportXLSX } from "@/features/departments/export";
import type { DepartmentRow } from "@/features/departments/types";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/departments")({
  head: () => ({
    meta: [
      { title: "Departments — TalentAI Enterprise" },
      { name: "description", content: "Manage your organization's departments, managers, teams and budgets." },
      { property: "og:title", content: "Departments — TalentAI" },
      { property: "og:description", content: "Enterprise department directory with dashboards, filters, imports and exports." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DepartmentsPage,
});

function StatCard({ label, value, icon: Icon, loading, tone = "default" }: {
  label: string; value: number | string; icon: React.ElementType; loading?: boolean;
  tone?: "default" | "success" | "info" | "warning";
}) {
  const toneClass = {
    default: "text-foreground",
    success: "text-emerald-500",
    info: "text-sky-500",
    warning: "text-amber-500",
  }[tone];
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <Icon className={`h-4 w-4 ${toneClass}`} />
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">
        {loading ? <Skeleton className="h-7 w-16" /> : value}
      </div>
    </Card>
  );
}

function statusBadge(s: DepartmentRow["status"]) {
  const variants: Record<string, string> = {
    active: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
    inactive: "bg-muted text-muted-foreground border-muted",
    archived: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  };
  return <Badge variant="outline" className={`${variants[s]} capitalize`}>{s}</Badge>;
}

function DepartmentsPage() {
  const { canManageWorkforce } = useAuth();
  const list = useDepartmentsList();
  const emps = useEmployees();
  const teams = useTeams();
  const m = useDepartmentMutations();

  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<DepartmentRow | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [managerFilter, setManagerFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [sortMode, setSortMode] = useState<"newest" | "oldest" | "alpha">("newest");

  const rows = list.data ?? [];

  const employeeCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of emps.data ?? []) if (e.department_id) map.set(e.department_id, (map.get(e.department_id) ?? 0) + 1);
    return map;
  }, [emps.data]);

  const teamCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of teams.data ?? []) map.set(t.department_id, (map.get(t.department_id) ?? 0) + 1);
    return map;
  }, [teams.data]);

  const managers = useMemo(() => {
    const seen = new Map<string, string>();
    for (const d of rows) if (d.manager_id && d.manager) seen.set(d.manager_id, d.manager.full_name || d.manager.email);
    return Array.from(seen.entries());
  }, [rows]);

  const locations = useMemo(() => {
    const set = new Set<string>();
    for (const d of rows) if (d.location) set.add(d.location);
    return Array.from(set);
  }, [rows]);

  const filtered = useMemo(() => {
    let r = rows;
    if (statusFilter !== "all") r = r.filter((d) => d.status === statusFilter);
    if (managerFilter !== "all") r = r.filter((d) => d.manager_id === managerFilter);
    if (locationFilter !== "all") r = r.filter((d) => d.location === locationFilter);
    const sorted = [...r];
    if (sortMode === "alpha") sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortMode === "oldest") sorted.sort((a, b) => a.created_at.localeCompare(b.created_at));
    else sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return sorted;
  }, [rows, statusFilter, managerFilter, locationFilter, sortMode]);

  const stats = useMemo(() => {
    const active = rows.filter((d) => d.status === "active").length;
    const mgrs = new Set(rows.map((d) => d.manager_id).filter(Boolean)).size;
    return {
      total: rows.length,
      active,
      employees: (emps.data ?? []).length,
      teams: (teams.data ?? []).length,
      managers: mgrs,
    };
  }, [rows, emps.data, teams.data]);

  const existingCodes = useMemo(
    () => new Set(rows.map((d) => d.department_code?.toLowerCase()).filter(Boolean) as string[]),
    [rows],
  );
  const existingNames = useMemo(
    () => new Set(rows.map((d) => d.name.toLowerCase())),
    [rows],
  );

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (r: DepartmentRow) => { setEditing(r); setFormOpen(true); };

  const handleSubmit = async (v: Parameters<typeof m.create.mutateAsync>[0]) => {
    if (editing) {
      await m.update.mutateAsync({ id: editing.id, values: v });
      toast.success("Department updated");
    } else {
      await m.create.mutateAsync(v);
      toast.success("Department created");
    }
  };

  const columns: Column<DepartmentRow>[] = [
    {
      key: "name",
      header: "Department",
      sortValue: (r) => r.name.toLowerCase(),
      cell: (r) => (
        <div className="flex items-center gap-2">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-md text-xs font-semibold text-white"
            style={{ backgroundColor: r.color ?? "#6366f1" }}
          >
            {r.name.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <Link to="/departments/$id" params={{ id: r.id }} className="truncate font-medium hover:underline">
              {r.name}
            </Link>
            {r.description && <div className="truncate text-xs text-muted-foreground max-w-[240px]">{r.description}</div>}
          </div>
        </div>
      ),
    },
    { key: "code", header: "Code", sortValue: (r) => r.department_code ?? "", cell: (r) => <span className="font-mono text-xs">{r.department_code ?? "—"}</span> },
    { key: "manager", header: "Manager", sortValue: (r) => r.manager?.full_name ?? "", cell: (r) => r.manager?.full_name ?? r.manager?.email ?? <span className="text-muted-foreground">—</span> },
    { key: "emp", header: "Employees", sortValue: (r) => employeeCounts.get(r.id) ?? 0, cell: (r) => <span className="tabular-nums">{employeeCounts.get(r.id) ?? 0}</span> },
    { key: "teams", header: "Teams", sortValue: (r) => teamCounts.get(r.id) ?? 0, cell: (r) => <span className="tabular-nums">{teamCounts.get(r.id) ?? 0}</span> },
    { key: "location", header: "Location", sortValue: (r) => r.location ?? "", cell: (r) => r.location ?? <span className="text-muted-foreground">—</span> },
    { key: "budget", header: "Budget", sortValue: (r) => r.budget ?? 0, cell: (r) => r.budget != null ? <span className="tabular-nums">{r.budget.toLocaleString()}</span> : <span className="text-muted-foreground">—</span> },
    { key: "status", header: "Status", sortValue: (r) => r.status, cell: (r) => statusBadge(r.status) },
    { key: "created", header: "Created", sortValue: (r) => r.created_at, cell: (r) => <span className="text-xs text-muted-foreground">{formatDate(r.created_at)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Departments"
        description="Manage your organization's departments."
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" />Export</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportCSV(filtered)}><FileText className="mr-2 h-4 w-4" />CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportXLSX(filtered)}><FileSpreadsheet className="mr-2 h-4 w-4" />Excel</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportPDF(filtered)}><FileText className="mr-2 h-4 w-4" />PDF</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {canManageWorkforce && (
              <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />Import
              </Button>
            )}
            {canManageWorkforce && (
              <Button size="sm" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Department</Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total" value={stats.total} icon={Building2} loading={list.isLoading} />
        <StatCard label="Active" value={stats.active} icon={Building2} loading={list.isLoading} tone="success" />
        <StatCard label="Employees" value={stats.employees} icon={Users} loading={emps.isLoading} tone="info" />
        <StatCard label="Teams" value={stats.teams} icon={UsersRound} loading={teams.isLoading} tone="info" />
        <StatCard label="Managers" value={stats.managers} icon={UserCog} loading={list.isLoading} tone="warning" />
      </div>

      <div className="mt-6">
        <DataTable
          rows={filtered}
          columns={columns}
          loading={list.isLoading}
          searchPlaceholder="Search name, code, manager, location…"
          searchFn={(r, q) =>
            [r.name, r.department_code, r.manager?.full_name, r.manager?.email, r.location]
              .some((v) => v?.toLowerCase().includes(q))
          }
          emptyIcon={Building2}
          emptyTitle="No departments yet"
          emptyDescription={canManageWorkforce ? "Create your first department to organize teams and people." : "Ask an admin to add departments."}
          emptyAction={canManageWorkforce && <Button size="sm" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Department</Button>}
          toolbar={
            <>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <Select value={managerFilter} onValueChange={setManagerFilter}>
                <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Manager" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All managers</SelectItem>
                  {managers.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="Location" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All locations</SelectItem>
                  {locations.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={sortMode} onValueChange={(v) => setSortMode(v as typeof sortMode)}>
                <SelectTrigger className="h-9 w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="alpha">Alphabetical</SelectItem>
                </SelectContent>
              </Select>
            </>
          }
          rowActions={(r) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link to="/departments/$id" params={{ id: r.id }}><Eye className="mr-2 h-4 w-4" />View</Link>
                </DropdownMenuItem>
                {canManageWorkforce && (
                  <>
                    <DropdownMenuItem onClick={() => openEdit(r)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={async () => { await m.archive.mutateAsync(r.id); toast.success("Department archived"); }}
                    >
                      <Archive className="mr-2 h-4 w-4" />Archive
                    </DropdownMenuItem>
                    <ConfirmDialog
                      title={`Delete ${r.name}?`}
                      description="This will hide the department from lists. Employees and teams remain but lose their department link."
                      onConfirm={async () => { await m.remove.mutateAsync(r.id); toast.success("Department deleted"); }}
                      trigger={
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />Delete
                        </DropdownMenuItem>
                      }
                    />
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />
      </div>

      <DepartmentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        existingCodes={existingCodes}
        onSubmit={handleSubmit}
      />
      <ImportDepartmentsDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        existingCodes={existingCodes}
        existingNames={existingNames}
        onImport={async (rowsToImport) => { await m.bulkImport.mutateAsync(rowsToImport); }}
      />
    </div>
  );
}