import * as XLSX from "xlsx";
import {
  ALLOWED_EXTENSIONS,
  MAX_FILE_BYTES,
  type ColumnProfile,
  type FieldType,
  type ParsedSheet,
  type ParsedWorkbook,
} from "../types";

export class FileValidationError extends Error {}

export function getExtension(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export function validateFile(file: File) {
  const ext = getExtension(file.name);
  if (!ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])) {
    throw new FileValidationError(`Unsupported file type ".${ext}". Upload .xlsx, .xls or .csv.`);
  }
  if (file.size <= 0) throw new FileValidationError("The file is empty or corrupted.");
  if (file.size > MAX_FILE_BYTES) {
    throw new FileValidationError(`File is ${formatBytes(file.size)} — the maximum upload size is 100 MB.`);
  }
  // Virus-scan placeholder: hook an AV service here before the file is persisted.
  return { extension: ext, scanned: false as const };
}

export function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function normalizeCell(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string") return value.trim();
  return value;
}

export async function parseWorkbook(file: File): Promise<ParsedWorkbook> {
  validateFile(file);
  let workbook: XLSX.WorkBook;
  try {
    const buffer = await file.arrayBuffer();
    workbook = XLSX.read(buffer, { type: "array", cellDates: true, raw: false });
  } catch {
    throw new FileValidationError("The file could not be read — it may be corrupted or password protected.");
  }
  if (!workbook.SheetNames.length) throw new FileValidationError("No sheets were found in this workbook.");

  const sheets: ParsedSheet[] = workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
    const headers = Object.keys(json[0] ?? {}).filter((h) => h && !h.startsWith("__EMPTY"));
    const rows = json.map((row) => {
      const clean: Record<string, unknown> = {};
      for (const h of headers) clean[h] = normalizeCell(row[h]);
      return clean;
    });
    return { name, headers, rows, rowCount: rows.length };
  });

  const usable = sheets.filter((s) => s.headers.length > 0);
  if (!usable.length) throw new FileValidationError("No column headers were detected in this file.");

  return { fileName: file.name, fileSize: file.size, fileType: file.type || getExtension(file.name), sheets: usable };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}|^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function detectType(values: unknown[]): FieldType {
  const samples = values.map((v) => String(v ?? "").trim()).filter(Boolean).slice(0, 50);
  if (!samples.length) return "string";
  const all = (fn: (s: string) => boolean) => samples.every(fn);
  if (all((s) => EMAIL_RE.test(s))) return "email";
  if (all((s) => DATE_RE.test(s))) return "date";
  if (all((s) => /^-?[\d,.]+$/.test(s))) return "number";
  if (all((s) => /^[+\d][\d\s()+-]{6,}$/.test(s))) return "phone";
  if (all((s) => /^(true|false|yes|no|y|n)$/i.test(s))) return "boolean";
  return "string";
}

export function profileColumns(sheet: ParsedSheet): ColumnProfile[] {
  return sheet.headers.map((header) => {
    const values = sheet.rows.map((r) => r[header]);
    const filled = values.filter((v) => String(v ?? "").trim() !== "").length;
    return {
      header,
      detectedType: detectType(values),
      filled,
      empty: values.length - filled,
      sample: String(values.find((v) => String(v ?? "").trim() !== "") ?? ""),
    };
  });
}