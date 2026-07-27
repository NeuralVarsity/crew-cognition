import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ImportRecord, RowIssue } from "../types";

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportRowsToCsv(rows: Record<string, unknown>[], fileName: string) {
  const sheet = XLSX.utils.json_to_sheet(rows);
  download(new Blob([XLSX.utils.sheet_to_csv(sheet)], { type: "text/csv;charset=utf-8" }), `${fileName}.csv`);
}

export function exportRowsToExcel(rows: Record<string, unknown>[], fileName: string, sheetName = "Report") {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows), sheetName.slice(0, 31));
  const out = XLSX.write(book, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  download(new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${fileName}.xlsx`);
}

export function exportRowsToPdf(
  rows: Record<string, unknown>[],
  fileName: string,
  title: string,
  subtitle?: string,
) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text(title, 14, 16);
  if (subtitle) {
    doc.setFontSize(9);
    doc.text(subtitle, 14, 22);
  }
  const head = Object.keys(rows[0] ?? { Info: "" });
  autoTable(doc, {
    startY: subtitle ? 28 : 22,
    head: [head],
    body: rows.map((r) => head.map((k) => String(r[k] ?? ""))),
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [37, 99, 235] },
  });
  doc.save(`${fileName}.pdf`);
}

export function issuesToRows(issues: RowIssue[]) {
  return issues.map((i) => ({
    Row: i.row,
    Column: i.column ?? "—",
    Severity: i.severity,
    Type: i.type,
    Message: i.message,
  }));
}

export function importsToRows(imports: ImportRecord[]) {
  return imports.map((i) => ({
    File: i.file_name,
    Dataset: i.dataset,
    Mode: i.mode,
    Status: i.status,
    "Total rows": i.total_rows,
    Imported: i.imported_rows,
    Updated: i.updated_rows,
    Skipped: i.skipped_rows,
    Failed: i.failed_rows,
    Duplicates: i.duplicate_rows,
    Errors: i.error_count,
    Warnings: i.warning_count,
    "Uploaded by": i.created_by_name ?? "—",
    "Uploaded at": new Date(i.created_at).toLocaleString(),
    "Duration (s)": i.duration_ms ? (i.duration_ms / 1000).toFixed(1) : "—",
  }));
}

export function downloadTemplate(datasetLabel: string, headers: string[]) {
  const book = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([headers, headers.map(() => "")]);
  XLSX.utils.book_append_sheet(book, sheet, datasetLabel.slice(0, 31));
  const out = XLSX.write(book, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  download(
    new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `${datasetLabel.toLowerCase().replace(/\s+/g, "-")}-template.xlsx`,
  );
}