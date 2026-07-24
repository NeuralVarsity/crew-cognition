import { useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseDepartmentsFile, type ParsedDept } from "./export";
import { emptyDepartmentForm, type DepartmentFormValues } from "./types";

export function ImportDepartmentsDialog({
  open, onOpenChange, existingCodes, existingNames, onImport,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  existingCodes: Set<string>;
  existingNames: Set<string>;
  onImport: (rows: DepartmentFormValues[]) => Promise<void>;
}) {
  const [parsed, setParsed] = useState<ParsedDept[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [valid, setValid] = useState<DepartmentFormValues[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFile = async (f: File) => {
    try {
      const rows = await parseDepartmentsFile(f);
      setParsed(rows);
      const errs: string[] = [];
      const good: DepartmentFormValues[] = [];
      const seenCode = new Set<string>();
      const seenName = new Set<string>();
      rows.forEach((r, i) => {
        const label = `Row ${i + 1} (${r.name || "?"})`;
        if (!r.name) { errs.push(`${label}: missing name`); return; }
        if (existingNames.has(r.name.toLowerCase()) || seenName.has(r.name.toLowerCase())) {
          errs.push(`${label}: duplicate name`); return;
        }
        const code = (r.department_code || "").trim();
        if (code && (existingCodes.has(code.toLowerCase()) || seenCode.has(code.toLowerCase()))) {
          errs.push(`${label}: duplicate code "${code}"`); return;
        }
        seenName.add(r.name.toLowerCase());
        if (code) seenCode.add(code.toLowerCase());
        good.push({
          ...emptyDepartmentForm(),
          name: r.name,
          department_code: code,
          description: r.description ?? "",
          location: r.location ?? "",
          email: r.email ?? "",
          phone: r.phone ?? "",
          budget: r.budget ?? "",
          status: (r.status as DepartmentFormValues["status"]) || "active",
        });
      });
      setErrors(errs);
      setValid(good);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleImport = async () => {
    setLoading(true);
    try {
      await onImport(valid);
      toast.success(`Imported ${valid.length} departments`);
      onOpenChange(false);
      setParsed([]); setValid([]); setErrors([]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import departments</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file. Headers: <code>name, department_code, description, location, email, phone, budget, status</code>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          {parsed.length > 0 && (
            <div className="rounded-md border p-3 text-sm">
              <div className="mb-2 flex justify-between">
                <span>Parsed: <b>{parsed.length}</b></span>
                <span className="text-emerald-500">Valid: <b>{valid.length}</b></span>
                <span className="text-destructive">Errors: <b>{errors.length}</b></span>
              </div>
              {errors.length > 0 && (
                <ul className="max-h-40 space-y-0.5 overflow-y-auto text-xs text-destructive">
                  {errors.map((e, i) => <li key={i}>• {e}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!valid.length || loading} onClick={handleImport}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Import {valid.length ? `(${valid.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}