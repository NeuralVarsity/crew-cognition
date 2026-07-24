import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { DepartmentRow } from "./types";

const HEADERS = [
  "department_code", "name", "description", "manager", "email", "phone",
  "location", "budget", "status", "color", "icon", "notes",
];

function toRow(d: DepartmentRow): Record<string, string | number | null> {
  return {
    department_code: d.department_code ?? "",
    name: d.name,
    description: d.description ?? "",
    manager: d.manager?.full_name ?? d.manager?.email ?? "",
    email: d.email ?? "",
    phone: d.phone ?? "",
    location: d.location ?? "",
    budget: d.budget ?? "",
    status: d.status,
    color: d.color ?? "",
    icon: d.icon ?? "",
    notes: d.notes ?? "",
  };
}

export function exportCSV(rows: DepartmentRow[]) {
  const ws = XLSX.utils.json_to_sheet(rows.map(toRow), { header: HEADERS });
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  download(blob, "departments.csv");
}

export function exportXLSX(rows: DepartmentRow[]) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows.map(toRow), { header: HEADERS });
  XLSX.utils.book_append_sheet(wb, ws, "Departments");
  XLSX.writeFile(wb, "departments.xlsx");
}

export function exportPDF(rows: DepartmentRow[]) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.text("Departments", 14, 14);
  autoTable(doc, {
    startY: 20,
    head: [["Code", "Name", "Manager", "Location", "Budget", "Status"]],
    body: rows.map((d) => [
      d.department_code ?? "-",
      d.name,
      d.manager?.full_name ?? d.manager?.email ?? "-",
      d.location ?? "-",
      d.budget != null ? String(d.budget) : "-",
      d.status,
    ]),
    styles: { fontSize: 9 },
  });
  doc.save("departments.pdf");
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export type ParsedDept = { name: string; department_code?: string; description?: string; location?: string; email?: string; phone?: string; budget?: string; status?: string };

export async function parseDepartmentsFile(file: File): Promise<ParsedDept[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
  return rows.map((r) => {
    const norm: Record<string, string> = {};
    for (const k of Object.keys(r)) norm[k.trim().toLowerCase().replace(/\s+/g, "_")] = String(r[k] ?? "").trim();
    return {
      name: norm.name || norm.department || "",
      department_code: norm.department_code || norm.code,
      description: norm.description,
      location: norm.location,
      email: norm.email,
      phone: norm.phone,
      budget: norm.budget,
      status: norm.status,
    };
  }).filter((r) => r.name);
}