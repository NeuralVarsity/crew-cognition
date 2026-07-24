import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpDown, ChevronLeft, ChevronRight, Eye, MoreHorizontal, Pencil, Search, Trash2, Archive,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/common/empty-state";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { initials, formatDate } from "@/lib/format";
import { useSignedPhoto } from "./hooks";
import type { EmployeeRow, EmployeeStatus, EmploymentType } from "./types";
import { EMPLOYEE_STATUSES, EMPLOYMENT_TYPES } from "./types";

const statusVariant: Record<EmployeeStatus, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default", on_leave: "secondary", probation: "outline", terminated: "destructive",
};

type SortKey = "full_name" | "employee_code" | "designation" | "department" | "team" | "joining_date" | "status";

export function EmployeesTable({
  rows, loading, canManage, selected, onSelectedChange,
  onEdit, onDelete, onArchive,
  filterDept, setFilterDept, filterStatus, setFilterStatus, filterType, setFilterType,
  departments,
}: {
  rows: EmployeeRow[];
  loading: boolean;
  canManage: boolean;
  selected: string[];
  onSelectedChange: (ids: string[]) => void;
  onEdit: (r: EmployeeRow) => void;
  onDelete: (r: EmployeeRow) => Promise<void>;
  onArchive: (r: EmployeeRow) => Promise<void>;
  filterDept: string; setFilterDept: (v: string) => void;
  filterStatus: string; setFilterStatus: (v: string) => void;
  filterType: string; setFilterType: (v: string) => void;
  departments: { id: string; name: string }[];
}) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "full_name", dir: "asc" });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterDept !== "all" && r.department_id !== filterDept) return false;
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (filterType !== "all" && r.employment_type !== filterType) return false;
      if (!term) return true;
      return [
        r.full_name, r.email, r.employee_code, r.designation ?? "",
        r.departments?.name ?? "", r.teams?.name ?? "",
      ].some((v) => v.toLowerCase().includes(term));
    });
  }, [rows, q, filterDept, filterStatus, filterType]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const get = (r: EmployeeRow): string => {
      switch (sort.key) {
        case "full_name": return r.full_name;
        case "employee_code": return r.employee_code;
        case "designation": return r.designation ?? "";
        case "department": return r.departments?.name ?? "";
        case "team": return r.teams?.name ?? "";
        case "joining_date": return r.joining_date ?? "";
        case "status": return r.status;
      }
    };
    arr.sort((a, b) => {
      const va = get(a).toLowerCase(); const vb = get(b).toLowerCase();
      if (va < vb) return sort.dir === "asc" ? -1 : 1;
      if (va > vb) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, totalPages - 1);
  const paged = sorted.slice(current * pageSize, current * pageSize + pageSize);

  const toggleSort = (key: SortKey) =>
    setSort((s) => s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" });

  const allChecked = paged.length > 0 && paged.every((r) => selected.includes(r.id));
  const someChecked = paged.some((r) => selected.includes(r.id));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search name, code, email…" className="h-9 pl-8" />
        </div>
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {EMPLOYEE_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {EMPLOYMENT_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-auto rounded-lg border bg-card max-h-[70vh]">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              {canManage && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={allChecked ? true : someChecked ? "indeterminate" : false}
                    onCheckedChange={(v) => {
                      const pageIds = paged.map((r) => r.id);
                      if (v) onSelectedChange(Array.from(new Set([...selected, ...pageIds])));
                      else onSelectedChange(selected.filter((id) => !pageIds.includes(id)));
                    }}
                  />
                </TableHead>
              )}
              <Th onClick={() => toggleSort("full_name")}>Employee</Th>
              <Th onClick={() => toggleSort("employee_code")}>ID</Th>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <Th onClick={() => toggleSort("designation")}>Designation</Th>
              <Th onClick={() => toggleSort("department")}>Department</Th>
              <Th onClick={() => toggleSort("team")}>Team</Th>
              <TableHead>Type</TableHead>
              <Th onClick={() => toggleSort("joining_date")}>Joined</Th>
              <TableHead>Manager</TableHead>
              <Th onClick={() => toggleSort("status")}>Status</Th>
              <TableHead className="w-[60px] text-right"><MoreHorizontal className="ml-auto h-4 w-4 opacity-60" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={`s${i}`}>
                  {canManage && <TableCell />}
                  {Array.from({ length: 12 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>)}
                </TableRow>
              ))
            ) : paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canManage ? 13 : 12} className="p-0">
                  <EmptyState title="No employees found" description="Adjust filters or add your first employee." />
                </TableCell>
              </TableRow>
            ) : (
              paged.map((r) => (
                <EmployeeRowView
                  key={r.id} row={r} canManage={canManage}
                  checked={selected.includes(r.id)}
                  onCheckedChange={(v) => onSelectedChange(v ? [...selected, r.id] : selected.filter((id) => id !== r.id))}
                  onEdit={() => onEdit(r)}
                  onDelete={() => onDelete(r)}
                  onArchive={() => onArchive(r)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>Rows per page</span>
          <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(0); }}>
            <SelectTrigger className="h-7 w-[70px]"><SelectValue /></SelectTrigger>
            <SelectContent>{[10, 25, 50, 100].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
          </Select>
          <span>{sorted.length} total</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-7 w-7" disabled={current === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-2">Page {current + 1} / {totalPages}</span>
          <Button variant="outline" size="icon" className="h-7 w-7" disabled={current >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function Th({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <TableHead>
      <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={onClick}>
        {children}<ArrowUpDown className="h-3 w-3 opacity-60" />
      </button>
    </TableHead>
  );
}

function EmployeeRowView({
  row, canManage, checked, onCheckedChange, onEdit, onDelete, onArchive,
}: {
  row: EmployeeRow; canManage: boolean; checked: boolean; onCheckedChange: (v: boolean) => void;
  onEdit: () => void; onDelete: () => Promise<void>; onArchive: () => Promise<void>;
}) {
  const photo = useSignedPhoto(row.profile_photo);
  return (
    <TableRow className="animate-in fade-in-50">
      {canManage && (
        <TableCell><Checkbox checked={checked} onCheckedChange={(v) => onCheckedChange(!!v)} /></TableCell>
      )}
      <TableCell>
        <Link to="/employees/$id" params={{ id: row.id }} className="flex items-center gap-2.5 hover:underline">
          <Avatar className="h-8 w-8">
            {photo && <AvatarImage src={photo} alt={row.full_name} />}
            <AvatarFallback className="text-xs">{initials(row.full_name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate font-medium">{row.full_name}</div>
            <div className="truncate text-xs text-muted-foreground">{row.designation ?? "—"}</div>
          </div>
        </Link>
      </TableCell>
      <TableCell className="font-mono text-xs">{row.employee_code}</TableCell>
      <TableCell className="text-xs">{row.email}</TableCell>
      <TableCell className="text-xs">{row.phone ?? "—"}</TableCell>
      <TableCell>{row.designation ?? "—"}</TableCell>
      <TableCell>{row.departments?.name ?? "—"}</TableCell>
      <TableCell>{row.teams?.name ?? "—"}</TableCell>
      <TableCell className="capitalize">{row.employment_type.replace("_", " ")}</TableCell>
      <TableCell className="text-xs">{formatDate(row.joining_date)}</TableCell>
      <TableCell>{row.manager?.full_name ?? "—"}</TableCell>
      <TableCell><Badge variant={statusVariant[row.status]} className="capitalize">{row.status.replace("_", " ")}</Badge></TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to="/employees/$id" params={{ id: row.id }}><Eye className="mr-2 h-4 w-4" /> View</Link>
            </DropdownMenuItem>
            {canManage && (
              <>
                <DropdownMenuItem onClick={onEdit}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                <DropdownMenuSeparator />
                <ConfirmDialog
                  destructive={false}
                  confirmLabel="Archive"
                  title={`Archive ${row.full_name}?`}
                  description="They will be marked terminated but remain in the directory."
                  onConfirm={onArchive}
                  trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Archive className="mr-2 h-4 w-4" /> Archive
                    </DropdownMenuItem>
                  }
                />
                <ConfirmDialog
                  title={`Delete ${row.full_name}?`}
                  description="This will remove them from the directory."
                  onConfirm={onDelete}
                  trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  }
                />
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}