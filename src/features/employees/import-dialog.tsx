import { useState } from "react";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { parseSpreadsheet } from "./export";
import { emptyEmployeeForm, type EmployeeFormValues, type EmployeeRow } from "./types";

type ParsedRow = { row: number; values: EmployeeFormValues; errors: string[] };

function normalize(raw: Record<string, unknown>, idx: number, existing: EmployeeRow[]): ParsedRow {
  const get = (...keys: string[]) => {
    for (const k of keys) {
      const v = raw[k] ?? raw[k.toLowerCase()] ?? raw[k.toUpperCase()];
      if (v != null && String(v).trim()) return String(v).trim();
    }
    return "";
  };
  const first = get("first_name", "First Name", "firstname");
  const last = get("last_name", "Last Name", "lastname");
  const email = get("email", "Email").toLowerCase();
  const code = get("employee_code", "Employee ID", "code", "employee_id");
  const type = get("employment_type", "Employment Type") || "full_time";
  const status = get("status", "Status") || "active";
  const values: EmployeeFormValues = {
    ...emptyEmployeeForm,
    first_name: first,
    last_name: last,
    email,
    employee_code: code,
    phone: get("phone", "Phone"),
    dob: get("dob", "Date of Birth"),
    joining_date: get("joining_date", "Joining Date"),
    designation: get("designation", "Designation"),
    work_location: get("work_location", "Work Location"),
    office_location: get("office_location", "Office Location"),
    salary: get("salary", "Salary"),
    notes: get("notes", "Notes"),
    employment_type: ["full_time", "part_time", "contract", "intern", "consultant"].includes(type)
      ? (type as EmployeeFormValues["employment_type"]) : "full_time",
    status: ["active", "on_leave", "probation", "terminated"].includes(status)
      ? (status as EmployeeFormValues["status"]) : "active",
  };
  const errors: string[] = [];
  if (!first) errors.push("Missing first name");
  if (!last) errors.push("Missing last name");
  if (!email) errors.push("Missing email");
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Invalid email");
  else if (existing.some((e) => e.email.toLowerCase() === email)) errors.push("Duplicate email");
  if (!code) errors.push("Missing employee ID");
  else if (existing.some((e) => e.employee_code === code)) errors.push("Duplicate employee ID");
  return { row: idx + 2, values, errors };
}

export function ImportDialog({
  open, onOpenChange, existing, onImport,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  existing: EmployeeRow[];
  onImport: (rows: EmployeeFormValues[]) => Promise<void>;
}) {
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string>("");

  const reset = () => { setParsed([]); setFileName(""); };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setFileName(file.name);
    try {
      const raw = await parseSpreadsheet(file);
      const seen = new Set<string>();
      const rows = raw.map((r, i) => normalize(r, i, existing)).map((r) => {
        const key = `${r.values.email}|${r.values.employee_code}`;
        if (seen.has(key)) r.errors.push("Duplicate row in file");
        seen.add(key);
        return r;
      });
      setParsed(rows);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to parse file");
    }
  };

  const valid = parsed.filter((r) => r.errors.length === 0);
  const invalid = parsed.filter((r) => r.errors.length > 0);

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Import employees</DialogTitle>
          <DialogDescription>Upload a CSV or Excel file. Required: first_name, last_name, email, employee_code.</DialogDescription>
        </DialogHeader>

        {!parsed.length ? (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed py-14 text-sm text-muted-foreground hover:border-primary hover:bg-accent/40">
            <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
            <FileSpreadsheet className="h-10 w-10 opacity-60" />
            <div className="text-center">
              <div className="font-medium text-foreground">Click to select a file</div>
              <div>CSV, XLSX or XLS</div>
            </div>
          </label>
        ) : (
          <div className="flex flex-1 flex-col gap-3 overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{fileName}</span>
              <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" />{valid.length} valid</Badge>
              {invalid.length > 0 && <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />{invalid.length} with errors</Badge>}
              <Button variant="ghost" size="sm" className="ml-auto" onClick={reset}>Choose another file</Button>
            </div>
            <ScrollArea className="h-[400px] rounded-md border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    <th className="p-2 text-left">Row</th>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">Email</th>
                    <th className="p-2 text-left">Code</th>
                    <th className="p-2 text-left">Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.map((r) => (
                    <tr key={r.row} className={r.errors.length ? "bg-destructive/10" : ""}>
                      <td className="p-2 font-mono">{r.row}</td>
                      <td className="p-2">{r.values.first_name} {r.values.last_name}</td>
                      <td className="p-2">{r.values.email}</td>
                      <td className="p-2 font-mono">{r.values.employee_code}</td>
                      <td className="p-2 text-destructive">{r.errors.join(", ") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button
            disabled={loading || !valid.length}
            onClick={async () => {
              setLoading(true);
              try {
                await onImport(valid.map((r) => r.values));
                toast.success(`Imported ${valid.length} employees`);
                onOpenChange(false); reset();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Import failed");
              } finally { setLoading(false); }
            }}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Import {valid.length || ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}