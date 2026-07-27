import { useCallback, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import {
  createImportJob,
  finalizeImportJob,
  runImportBatch,
  saveValidationIssues,
} from "../api/imports.functions";
import { uploadSourceFile, useImportContext } from "../hooks";
import { applyMapping, autoMapColumns, missingRequiredFields, type ColumnMapping } from "../lib/mapping";
import { FileValidationError, formatBytes, parseWorkbook, profileColumns } from "../lib/parser";
import { exportRowsToCsv, exportRowsToExcel, exportRowsToPdf, issuesToRows } from "../lib/reports";
import { validateRows } from "../lib/validation";
import {
  DATASETS,
  DATASET_LIST,
  IMPORT_MODES,
  type ColumnProfile,
  type DatasetKey,
  type ImportMode,
  type ParsedWorkbook,
  type RowIssue,
  type ValidationResult,
} from "../types";

const STEPS = [
  "Upload file",
  "Sheet",
  "Preview",
  "Mapping",
  "Validation",
  "Options",
  "Progress",
  "Completed",
];

type Totals = { inserted: number; updated: number; skipped: number; failed: number; duplicates: number };

export function UploadWizard({ onFinished }: { onFinished?: () => void }) {
  const { organizationId } = useAuth();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const contextQuery = useImportContext();
  const canManage = contextQuery.data?.canManage ?? false;

  const [step, setStep] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [queue, setQueue] = useState<File[]>([]);
  const [parsing, setParsing] = useState(false);
  const [workbook, setWorkbook] = useState<ParsedWorkbook | null>(null);
  const [sheetName, setSheetName] = useState("");
  const [dataset, setDataset] = useState<DatasetKey>("employees");
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [mode, setMode] = useState<ImportMode>("upsert");
  const [dryRun, setDryRun] = useState(false);
  const [skipInvalid, setSkipInvalid] = useState(true);
  const [storeFile, setStoreFile] = useState(true);
  const [batchSize, setBatchSize] = useState(500);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [totals, setTotals] = useState<Totals | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const sheet = useMemo(
    () => workbook?.sheets.find((s) => s.name === sheetName) ?? workbook?.sheets[0] ?? null,
    [workbook, sheetName],
  );

  const columns: ColumnProfile[] = useMemo(() => (sheet ? profileColumns(sheet) : []), [sheet]);

  const mappedRows = useMemo(
    () => (sheet ? applyMapping(sheet.rows, mapping) : []),
    [sheet, mapping],
  );

  const validation: ValidationResult = useMemo(() => {
    if (!sheet) return { issues: [], invalidRows: new Set(), warningRows: new Set(), duplicateRows: new Set(), errorCount: 0, warningCount: 0 };
    const ctx = contextQuery.data;
    const set = (values?: string[]) => new Set((values ?? []).map((v) => v.trim().toLowerCase()));
    return validateRows(mappedRows, dataset, {
      departments: set(ctx?.departments),
      teams: set(ctx?.teams),
      emails: dataset === "employees" ? set(ctx?.emails) : undefined,
      employeeCodes: dataset === "employees" ? set(ctx?.employeeCodes) : undefined,
      githubUsers: set(ctx?.githubUsers),
      jiraUsers: set(ctx?.jiraUsers),
      clickupUsers: set(ctx?.clickupUsers),
    });
  }, [sheet, mappedRows, dataset, contextQuery.data]);

  const missingFields = useMemo(() => missingRequiredFields(mapping, dataset), [mapping, dataset]);

  const reset = useCallback(() => {
    setStep(0);
    setQueue([]);
    setWorkbook(null);
    setSheetName("");
    setMapping({});
    setTotals(null);
    setFailure(null);
    setProgress(0);
    setStage("");
  }, []);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (!list.length) return;
      setQueue(list);
      setParsing(true);
      setFailure(null);
      try {
        const parsed = await parseWorkbook(list[0]);
        setWorkbook(parsed);
        setSheetName(parsed.sheets[0].name);
        setMapping(autoMapColumns(parsed.sheets[0].headers, dataset));
        setStep(1);
      } catch (error) {
        const message = error instanceof FileValidationError ? error.message : (error as Error).message;
        setFailure(message);
        toast.error(message);
      } finally {
        setParsing(false);
      }
    },
    [dataset],
  );

  const changeDataset = (value: DatasetKey) => {
    setDataset(value);
    if (sheet) setMapping(autoMapColumns(sheet.headers, value));
  };

  const runImport = async () => {
    if (!sheet || !organizationId) return;
    setRunning(true);
    setStep(6);
    setProgress(0);
    setFailure(null);
    const started = Date.now();
    const effectiveMode: ImportMode = dryRun ? "dry_run" : mode;
    const rowsToImport = mappedRows
      .map((row, index) => ({ row, rowNo: index + 2 }))
      .filter(({ row, rowNo }) => {
        if (Object.values(row).every((v) => v === null || String(v ?? "").trim() === "")) return false;
        return skipInvalid ? !validation.invalidRows.has(rowNo) : true;
      })
      .map((r) => r.row);

    let jobId: string | null = null;
    try {
      let filePath: string | null = null;
      if (storeFile && queue[0]) {
        setStage("Uploading source file to secure storage…");
        filePath = await uploadSourceFile(queue[0], organizationId);
      }

      setStage("Creating import job…");
      const job = (await createImportJob({
        data: {
          fileName: workbook!.fileName,
          fileSize: workbook!.fileSize,
          fileType: workbook!.fileType,
          filePath,
          dataset,
          sheetName: sheet.name,
          sheetNames: workbook!.sheets.map((s) => s.name),
          mode: effectiveMode,
          columnMapping: mapping,
          detectedColumns: columns as unknown as Record<string, unknown>[],
          options: { dryRun, skipInvalid, storeFile, batchSize },
          totalRows: sheet.rowCount,
          errorCount: validation.errorCount,
          warningCount: validation.warningCount,
          duplicateRows: validation.duplicateRows.size,
        },
      })) as { id: string };
      jobId = job.id;

      if (validation.issues.length) {
        setStage("Recording validation report…");
        for (let i = 0; i < Math.min(validation.issues.length, 4000); i += 1000) {
          await saveValidationIssues({
            data: { importId: jobId, issues: validation.issues.slice(i, i + 1000).map((x) => ({ ...x, column: x.column ?? null })) },
          });
        }
      }

      const agg: Totals = { inserted: 0, updated: 0, skipped: 0, failed: 0, duplicates: 0 };
      for (let start = 0; start < rowsToImport.length; start += batchSize) {
        const chunk = rowsToImport.slice(start, start + batchSize);
        setStage(`Processing rows ${start + 1}–${Math.min(start + chunk.length, rowsToImport.length)} of ${rowsToImport.length}…`);
        const res = await runImportBatch({
          data: { importId: jobId, dataset, mode: effectiveMode, startRow: start, rows: chunk },
        });
        agg.inserted += res.inserted;
        agg.updated += res.updated;
        agg.skipped += res.skipped;
        agg.failed += res.failed;
        agg.duplicates += res.duplicates;
        setTotals({ ...agg });
        setProgress(Math.round(((start + chunk.length) / Math.max(rowsToImport.length, 1)) * 100));
      }

      const status = dryRun ? "dry_run" : agg.failed === 0 ? "completed" : agg.failed === rowsToImport.length ? "failed" : "partial";
      await finalizeImportJob({ data: { importId: jobId, status, durationMs: Date.now() - started } });
      setProgress(100);
      setStage("Import completed");
      setStep(7);
      toast.success(dryRun ? "Dry run finished — no data was written" : "Import completed");
    } catch (error) {
      const message = (error as Error).message ?? "Import failed";
      setFailure(message);
      if (jobId) {
        await finalizeImportJob({
          data: { importId: jobId, status: "failed", durationMs: Date.now() - started, errorMessage: message.slice(0, 2000) },
        }).catch(() => undefined);
      }
      setStep(7);
      toast.error(message);
    } finally {
      setRunning(false);
      qc.invalidateQueries({ queryKey: ["imports"] });
      qc.invalidateQueries({ queryKey: ["employees-list"] });
    }
  };

  const previewRows = useMemo(() => (sheet ? sheet.rows.slice(0, 100) : []), [sheet]);

  if (!canManage && !contextQuery.isPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Read-only access</CardTitle>
          <CardDescription>
            Only administrators and managers can upload data. You can still browse import history and reports.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Import wizard</CardTitle>
            <CardDescription>Step {step + 1} of 8 — {STEPS[step]}</CardDescription>
          </div>
          {step > 0 && (
            <Button variant="ghost" size="sm" onClick={reset} disabled={running}>
              <X className="mr-1.5 size-4" /> Start over
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STEPS.map((label, index) => (
            <span
              key={label}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                index === step
                  ? "border-primary bg-primary text-primary-foreground"
                  : index < step
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground",
              )}
            >
              {index + 1}. {label}
            </span>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {failure && step !== 7 && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>{failure}</span>
          </div>
        )}

        {step === 0 && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Dataset</Label>
                <Select value={dataset} onValueChange={(v) => changeDataset(v as DatasetKey)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DATASET_LIST.map((d) => (
                      <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{DATASETS[dataset].description}</p>
              </div>
              <div className="space-y-1.5">
                <Label>Import mode</Label>
                <Select value={mode} onValueChange={(v) => setMode(v as ImportMode)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {IMPORT_MODES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{IMPORT_MODES.find((m) => m.value === mode)?.description}</p>
              </div>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); void handleFiles(e.dataTransfer.files); }}
              onClick={() => inputRef.current?.click()}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
                dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/40",
              )}
            >
              {parsing ? <Loader2 className="size-7 animate-spin text-primary" /> : <UploadCloud className="size-7 text-muted-foreground" />}
              <p className="text-sm font-medium">{parsing ? "Reading workbook…" : "Drag & drop files here, or click to browse"}</p>
              <p className="text-xs text-muted-foreground">.xlsx, .xls and .csv — up to 100 MB per file</p>
              <input
                ref={inputRef}
                type="file"
                multiple
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => e.target.files && void handleFiles(e.target.files)}
              />
            </div>

            {queue.length > 1 && (
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Queued files ({queue.length})</p>
                {queue.map((f, i) => (
                  <div key={f.name} className="flex items-center justify-between rounded-md border px-2.5 py-1.5">
                    <span className="truncate">{f.name} · {formatBytes(f.size)}</span>
                    <Badge variant={i === 0 ? "default" : "secondary"}>{i === 0 ? "Processing" : "Queued"}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 1 && workbook && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Detected {workbook.sheets.length} sheet{workbook.sheets.length === 1 ? "" : "s"} in{" "}
              <span className="font-medium text-foreground">{workbook.fileName}</span> ({formatBytes(workbook.fileSize)}).
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {workbook.sheets.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => { setSheetName(s.name); setMapping(autoMapColumns(s.headers, dataset)); }}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-colors",
                    s.name === sheetName ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                  )}
                >
                  <p className="flex items-center gap-2 text-sm font-medium"><FileSpreadsheet className="size-4" />{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.rowCount.toLocaleString()} rows · {s.headers.length} columns</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && sheet && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="secondary">{sheet.rowCount.toLocaleString()} rows</Badge>
              <Badge variant="secondary">{sheet.headers.length} columns</Badge>
              <Badge variant="secondary">Showing first {Math.min(100, sheet.rowCount)}</Badge>
            </div>
            <ScrollArea className="h-[380px] rounded-lg border">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-muted">
                  <TableRow>
                    <TableHead className="w-14">#</TableHead>
                    {columns.map((c) => (
                      <TableHead key={c.header} className="whitespace-nowrap">
                        <span className="block">{c.header}</span>
                        <span className="text-[10px] font-normal text-muted-foreground">{c.detectedType} · {c.empty} empty</span>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row, i) => {
                    const rowNo = i + 2;
                    const invalid = validation.invalidRows.has(rowNo);
                    return (
                      <TableRow key={rowNo} className={invalid ? "bg-destructive/5" : undefined}>
                        <TableCell className="text-xs text-muted-foreground">{rowNo}</TableCell>
                        {columns.map((c) => (
                          <TableCell key={c.header} className="max-w-[220px] truncate text-xs">{String(row[c.header] ?? "")}</TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}

        {step === 3 && sheet && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Columns were matched automatically. Remap anything that looks wrong, or set it to <em>Ignore</em>.
            </p>
            {missingFields.length > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                <span>Required fields not mapped: {missingFields.map((f) => f.label).join(", ")}</span>
              </div>
            )}
            <ScrollArea className="h-[380px] rounded-lg border p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                {columns.map((c) => (
                  <div key={c.header} className="rounded-lg border p-3">
                    <p className="truncate text-sm font-medium">{c.header}</p>
                    <p className="mb-2 truncate text-[11px] text-muted-foreground">{c.detectedType} · e.g. {c.sample || "—"}</p>
                    <Select
                      value={mapping[c.header] || "__ignore__"}
                      onValueChange={(v) => setMapping((m) => ({ ...m, [c.header]: v === "__ignore__" ? "" : v }))}
                    >
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__ignore__">Ignore column</SelectItem>
                        {DATASETS[dataset].fields.map((f) => (
                          <SelectItem key={f.key} value={f.key}>{f.label}{f.required ? " *" : ""}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {step === 4 && (
          <ValidationStep validation={validation} totalRows={sheet?.rowCount ?? 0} fileName={workbook?.fileName ?? "import"} />
        )}

        {step === 5 && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Import mode</Label>
                <Select value={mode} onValueChange={(v) => setMode(v as ImportMode)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {IMPORT_MODES.filter((m) => m.value !== "dry_run").map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{IMPORT_MODES.find((m) => m.value === mode)?.description}</p>
              </div>
              <div className="space-y-1.5">
                <Label>Batch size</Label>
                <Select value={String(batchSize)} onValueChange={(v) => setBatchSize(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[100, 250, 500, 1000].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n} rows per batch</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Large files are streamed in chunks to keep the UI responsive.</p>
              </div>
            </div>
            <Separator />
            <ToggleRow label="Dry run" description="Simulate the import without writing any data." checked={dryRun} onChange={setDryRun} />
            <ToggleRow label="Skip invalid rows" description="Rows with blocking errors are excluded instead of failing the import." checked={skipInvalid} onChange={setSkipInvalid} />
            <ToggleRow label="Archive original file" description="Store the uploaded file securely for audit and re-download." checked={storeFile} onChange={setStoreFile} />
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <p className="font-medium">Ready to import</p>
              <p className="text-muted-foreground">
                {(sheet?.rowCount ?? 0).toLocaleString()} rows · {validation.errorCount} errors · {validation.warningCount} warnings ·{" "}
                {skipInvalid ? `${validation.invalidRows.size} rows will be skipped` : "all rows will be attempted"}
              </p>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3">
              <Loader2 className="size-5 animate-spin text-primary" />
              <div>
                <p className="text-sm font-medium">Importing…</p>
                <p className="text-xs text-muted-foreground">{stage}</p>
              </div>
            </div>
            <Progress value={progress} />
            {totals && <TotalsGrid totals={totals} />}
          </div>
        )}

        {step === 7 && (
          <div className="space-y-4 py-2">
            {failure ? (
              <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4">
                <AlertTriangle className="mt-0.5 size-5 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">Import failed</p>
                  <p className="text-sm text-destructive/90">{failure}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4">
                <CheckCircle2 className="mt-0.5 size-5 text-emerald-600" />
                <div>
                  <p className="font-medium">{dryRun ? "Dry run completed" : "Import completed"}</p>
                  <p className="text-sm text-muted-foreground">
                    {workbook?.fileName} · {DATASETS[dataset].label}
                  </p>
                </div>
              </div>
            )}
            {totals && <TotalsGrid totals={totals} />}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => exportRowsToExcel(issuesToRows(validation.issues), "validation-report")} disabled={!validation.issues.length}>
                <Download className="mr-1.5 size-4" /> Validation report
              </Button>
              <Button variant="outline" size="sm" onClick={() => { reset(); onFinished?.(); }}>
                <UploadCloud className="mr-1.5 size-4" /> Import another file
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {step < 6 && (
        <div className="flex items-center justify-between gap-2 border-t p-4">
          <Button variant="ghost" size="sm" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            <ArrowLeft className="mr-1.5 size-4" /> Back
          </Button>
          <div className="flex items-center gap-2">
            {step === 4 && validation.errorCount > 0 && (
              <span className="text-xs text-muted-foreground">{validation.invalidRows.size} rows have blocking errors</span>
            )}
            {step < 5 ? (
              <Button size="sm" onClick={() => setStep((s) => s + 1)} disabled={!workbook || (step === 3 && missingFields.length > 0)}>
                Continue <ArrowRight className="ml-1.5 size-4" />
              </Button>
            ) : (
              <Button size="sm" onClick={() => void runImport()} disabled={running || !sheet}>
                {dryRun ? "Run dry run" : "Start import"} <ArrowRight className="ml-1.5 size-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function TotalsGrid({ totals }: { totals: Totals }) {
  const items = [
    { label: "Inserted", value: totals.inserted },
    { label: "Updated", value: totals.updated },
    { label: "Skipped", value: totals.skipped },
    { label: "Duplicates", value: totals.duplicates },
    { label: "Failed", value: totals.failed },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {items.map((i) => (
        <div key={i.label} className="rounded-lg border p-3">
          <p className="text-lg font-semibold tabular-nums">{i.value.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">{i.label}</p>
        </div>
      ))}
    </div>
  );
}

function ValidationStep({
  validation,
  totalRows,
  fileName,
}: {
  validation: ValidationResult;
  totalRows: number;
  fileName: string;
}) {
  const rows = issuesToRows(validation.issues);
  const base = fileName.replace(/\.[^.]+$/, "") || "validation";
  const grouped = validation.issues.reduce<Record<string, number>>((acc, issue: RowIssue) => {
    acc[issue.type] = (acc[issue.type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Total rows" value={totalRows} />
        <Stat label="Errors" value={validation.errorCount} tone="destructive" />
        <Stat label="Warnings" value={validation.warningCount} tone="warning" />
        <Stat label="Duplicates" value={validation.duplicateRows.size} />
      </div>

      {Object.keys(grouped).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(grouped).map(([type, count]) => (
            <Badge key={type} variant="secondary" className="text-[11px]">{type.replace(/_/g, " ")}: {count}</Badge>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" disabled={!rows.length} onClick={() => exportRowsToExcel(rows, `${base}-validation`)}>
          <Download className="mr-1.5 size-4" /> Excel
        </Button>
        <Button variant="outline" size="sm" disabled={!rows.length} onClick={() => exportRowsToCsv(rows, `${base}-validation`)}>
          <Download className="mr-1.5 size-4" /> CSV
        </Button>
        <Button variant="outline" size="sm" disabled={!rows.length} onClick={() => exportRowsToPdf(rows, `${base}-validation`, "Validation report", fileName)}>
          <Download className="mr-1.5 size-4" /> PDF
        </Button>
      </div>

      {validation.issues.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm">
          <CheckCircle2 className="size-4 text-emerald-600" /> No validation problems found.
        </div>
      ) : (
        <ScrollArea className="h-[300px] rounded-lg border">
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
              {validation.issues.slice(0, 500).map((issue, i) => (
                <TableRow key={`${issue.row}-${issue.type}-${i}`}>
                  <TableCell className="text-xs tabular-nums">{issue.row}</TableCell>
                  <TableCell className="text-xs">{issue.column ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={issue.severity === "error" ? "destructive" : "secondary"} className="text-[10px]">
                      {issue.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{issue.message}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "destructive" | "warning" }) {
  return (
    <div className="rounded-lg border p-3">
      <p
        className={cn(
          "text-lg font-semibold tabular-nums",
          tone === "destructive" && value > 0 && "text-destructive",
          tone === "warning" && value > 0 && "text-amber-600",
        )}
      >
        {value.toLocaleString()}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
