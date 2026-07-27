import { useMemo, useState } from "react";
import { Download, Eye, FileDown, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/common/empty-state";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { useDeleteImport, useImportFileUrl, useImportIssues } from "../hooks";
import { exportRowsToCsv, exportRowsToExcel, exportRowsToPdf, importsToRows } from "../lib/reports";
import { formatBytes } from "../lib/parser";
import { DATASETS, DATASET_LIST, type ImportRecord } from "../types";

const STATUS_TONE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  completed: "default",
  dry_run: "secondary",
  partial: "outline",
  failed: "destructive",
  importing: "secondary",
  pending: "secondary",
};

export function ImportHistory({
  imports,
  loading,
  canManage,
}: {
  imports: ImportRecord[];
  loading: boolean;
  canManage: boolean;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [dataset, setDataset] = useState("all");
  const [range, setRange] = useState("all");
  const [user, setUser] = useState("all");
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<ImportRecord | null>(null);
  const deleteImport = useDeleteImport();
  const fileUrl = useImportFileUrl();
  const pageSize = 10;

  const users = useMemo(
    () => Array.from(new Set(imports.map((i) => i.created_by_name).filter(Boolean) as string[])),
    [imports],
  );

  const filtered = useMemo(() => {
    const since = range === "all" ? 0 : Date.now() - Number(range) * 86_400_000;
    return imports.filter((i) => {
      if (query && !`${i.file_name} ${i.created_by_name ?? ""}`.toLowerCase().includes(query.toLowerCase())) return false;
      if (status !== "all" && i.status !== status) return false;
      if (dataset !== "all" && i.dataset !== dataset) return false;
      if (user !== "all" && i.created_by_name !== user) return false;
      if (since && new Date(i.created_at).getTime() < since) return false;
      return true;
    });
  }, [imports, query, status, dataset, user, range]);

  const paged = filtered.slice(page * pageSize, page * pageSize + pageSize);

  const openFile = async (path: string | null) => {
    if (!path) return toast.error("The original file was not archived for this import.");
    try {
      const { url } = await fileUrl.mutateAsync(path);
      window.open(url, "_blank", "noopener");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Import history</CardTitle>
            <CardDescription>Every upload with row counts, status and downloadable reports.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" disabled={!filtered.length} onClick={() => exportRowsToExcel(importsToRows(filtered), "import-history")}>
              <FileDown className="mr-1.5 size-4" /> Excel
            </Button>
            <Button variant="outline" size="sm" disabled={!filtered.length} onClick={() => exportRowsToCsv(importsToRows(filtered), "import-history")}>
              <FileDown className="mr-1.5 size-4" /> CSV
            </Button>
            <Button variant="outline" size="sm" disabled={!filtered.length} onClick={() => exportRowsToPdf(importsToRows(filtered), "import-history", "Import history")}>
              <FileDown className="mr-1.5 size-4" /> PDF
            </Button>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} placeholder="Search uploads…" className="pl-8" />
          </div>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {["completed", "partial", "failed", "dry_run", "importing"].map((s) => (
                <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dataset} onValueChange={(v) => { setDataset(v); setPage(0); }}>
            <SelectTrigger><SelectValue placeholder="Dataset" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All datasets</SelectItem>
              {DATASET_LIST.map((d) => <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={user} onValueChange={(v) => { setUser(v); setPage(0); }}>
            <SelectTrigger><SelectValue placeholder="User" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All users</SelectItem>
              {users.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={range} onValueChange={(v) => { setRange(v); setPage(0); }}>
            <SelectTrigger><SelectValue placeholder="Date" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : !filtered.length ? (
          <EmptyState icon={Search} title="No uploads found" description="Adjust your filters or upload a new file to get started." />
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead>Dataset</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Rows</TableHead>
                    <TableHead className="text-right">Imported</TableHead>
                    <TableHead className="text-right">Failed</TableHead>
                    <TableHead>Uploaded by</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead className="w-28 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="max-w-[220px]">
                        <p className="truncate text-sm font-medium">{row.file_name}</p>
                        <p className="text-xs text-muted-foreground">{formatBytes(row.file_size)} · {row.mode.replace("_", " ")}</p>
                      </TableCell>
                      <TableCell className="text-sm">{DATASETS[row.dataset]?.label ?? row.dataset}</TableCell>
                      <TableCell><Badge variant={STATUS_TONE[row.status] ?? "secondary"}>{row.status.replace("_", " ")}</Badge></TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{row.total_rows.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{(row.imported_rows + row.updated_rows).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{row.failed_rows.toLocaleString()}</TableCell>
                      <TableCell className="text-sm">{row.created_by_name ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => setDetail(row)} title="View report">
                            <Eye className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => void openFile(row.file_path)} title="Download original file">
                            <Download className="size-4" />
                          </Button>
                          {canManage && (
                            <ConfirmDialog
                              title="Delete import record?"
                              description="This removes the import history entry, its validation report and the archived file. Imported records are not reverted."
                              confirmLabel="Delete"
                              onConfirm={async () => {
                                await deleteImport.mutateAsync(row.id);
                                toast.success("Import deleted");
                              }}
                              trigger={
                                <Button variant="ghost" size="icon" className="size-8 text-destructive" title="Delete">
                                  <Trash2 className="size-4" />
                                </Button>
                              }
                            />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>{filtered.length.toLocaleString()} uploads</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={(page + 1) * pageSize >= filtered.length} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          </>
        )}
      </CardContent>

      <ImportDetailDialog record={detail} onClose={() => setDetail(null)} />
    </Card>
  );
}

function ImportDetailDialog({ record, onClose }: { record: ImportRecord | null; onClose: () => void }) {
  const issues = useImportIssues(record?.id ?? null);
  const rows = (issues.data ?? []) as {
    id: string;
    row_number: number;
    column_name: string | null;
    severity: string;
    error_type: string;
    message: string;
  }[];

  const exportRows = rows.map((r) => ({
    Row: r.row_number,
    Column: r.column_name ?? "—",
    Severity: r.severity,
    Type: r.error_type,
    Message: r.message,
  }));

  return (
    <Dialog open={!!record} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate">{record?.file_name}</DialogTitle>
          <DialogDescription>
            {record && `${DATASETS[record.dataset]?.label ?? record.dataset} · ${record.status.replace("_", " ")} · ${record.total_rows.toLocaleString()} rows · ${record.duration_ms ? (record.duration_ms / 1000).toFixed(1) : "—"}s`}
          </DialogDescription>
        </DialogHeader>

        {record && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[
              ["Imported", record.imported_rows],
              ["Updated", record.updated_rows],
              ["Skipped", record.skipped_rows],
              ["Duplicates", record.duplicate_rows],
              ["Failed", record.failed_rows],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-lg border p-2.5">
                <p className="text-base font-semibold tabular-nums">{Number(value).toLocaleString()}</p>
                <p className="text-[11px] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={!rows.length} onClick={() => exportRowsToExcel(exportRows, "import-errors")}>
            <FileDown className="mr-1.5 size-4" /> Failed records (Excel)
          </Button>
          <Button variant="outline" size="sm" disabled={!rows.length} onClick={() => exportRowsToCsv(exportRows, "import-errors")}>
            <FileDown className="mr-1.5 size-4" /> CSV
          </Button>
          <Button variant="outline" size="sm" disabled={!rows.length} onClick={() => exportRowsToPdf(exportRows, "import-errors", "Import error report", record?.file_name)}>
            <FileDown className="mr-1.5 size-4" /> PDF
          </Button>
        </div>

        <ScrollArea className="h-[320px] rounded-lg border">
          {issues.isPending ? (
            <div className="space-y-2 p-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
          ) : !rows.length ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No validation or import errors were recorded.</p>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted">
                <TableRow>
                  <TableHead className="w-16">Row</TableHead>
                  <TableHead>Column</TableHead>
                  <TableHead className="w-24">Severity</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs tabular-nums">{r.row_number}</TableCell>
                    <TableCell className="text-xs">{r.column_name ?? "—"}</TableCell>
                    <TableCell><Badge variant={r.severity === "error" ? "destructive" : "secondary"} className="text-[10px]">{r.severity}</Badge></TableCell>
                    <TableCell className="text-xs">{r.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}