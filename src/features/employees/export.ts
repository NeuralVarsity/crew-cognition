import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { EmployeeRow } from "./types";

const HEADERS = [
  "employee_code", "first_name", "last_name", "full_name", "email", "phone",
  "designation", "department", "team", "manager", "employment_type", "status",
  "joining_date", "dob", "work_location", "office_location", "salary", "notes",
];

function toRow(e: EmployeeRow): Record<string, string | number | null> {
  return {
    employee_code: e.employee_code,
    first_name: e.first_name ?? "",
    last_name: e.last_name ?? "",
    full_name: e.full_name,
    email: e.email,
    phone: e.phone ?? "",
    designation: e.designation ?? "",
    department: e.departments?.name ?? "",
    team: e.teams?.name ?? "",
    manager: e.manager?.full_name ?? "",
    employment_type: e.employment_type,
    status: e.status,
    joining_date: e.joining_date ?? "",
    dob: e.dob ?? "",
    work_location: e.work_location ?? "",
    office_location: e.office_location ?? "",
    salary: e.salary ?? "",
    notes: e.notes ?? "",
  };
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function exportCSV(rows: EmployeeRow[], filename = "employees.csv") {
  const data = rows.map(toRow);
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [HEADERS.join(","), ...data.map((r) => HEADERS.map((h) => esc(r[h])).join(","))].join("\n");
  download(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename);
}

export function exportXLSX(rows: EmployeeRow[], filename = "employees.xlsx") {
  const ws = XLSX.utils.json_to_sheet(rows.map(toRow), { header: HEADERS });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Employees");
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  download(new Blob([buf], { type: "application/octet-stream" }), filename);
}

export function exportPDF(rows: EmployeeRow[], filename = "employees.pdf") {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text("Employee Directory", 14, 14);
  const cols = ["Code", "Name", "Email", "Designation", "Department", "Team", "Type", "Status"];
  const body = rows.map((e) => [
    e.employee_code, e.full_name, e.email, e.designation ?? "-",
    e.departments?.name ?? "-", e.teams?.name ?? "-",
    e.employment_type.replace("_", " "), e.status.replace("_", " "),
  ]);
  autoTable(doc, { head: [cols], body, startY: 20, styles: { fontSize: 8 } });
  doc.save(filename);
}

export function parseSpreadsheet(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        resolve(XLSX.utils.sheet_to_json(ws, { defval: "" }));
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}