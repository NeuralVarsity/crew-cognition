import { DATASETS, type DatasetKey, type RowIssue, type ValidationResult } from "../types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+]?[\d][\d\s()./-]{5,19}$/;
const USERNAME_RE = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;

export function parseDateValue(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/.exec(raw);
  if (dmy) {
    let [, d, m, y] = dmy;
    if (y.length === 2) y = `20${y}`;
    if (Number(m) > 12) [d, m] = [m, d];
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    if (Number.isNaN(date.getTime())) return null;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

export function parseNumberValue(value: unknown): number | null {
  const raw = String(value ?? "").trim().replace(/[,\s]/g, "").replace(/^[^0-9.+-]+/, "");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export type ReferenceSets = {
  departments?: Set<string>;
  teams?: Set<string>;
  emails?: Set<string>;
  employeeCodes?: Set<string>;
  githubUsers?: Set<string>;
  jiraUsers?: Set<string>;
  clickupUsers?: Set<string>;
};

const lower = (v: unknown) => String(v ?? "").trim().toLowerCase();

export function validateRows(
  rows: Record<string, unknown>[],
  dataset: DatasetKey,
  refs: ReferenceSets = {},
): ValidationResult {
  const def = DATASETS[dataset];
  const issues: RowIssue[] = [];
  const invalidRows = new Set<number>();
  const warningRows = new Set<number>();
  const duplicateRows = new Set<number>();
  const seen = new Map<string, number>();

  const push = (row: number, column: string | null, type: string, severity: "error" | "warning", message: string) => {
    issues.push({ row, column, type, severity, message });
    if (severity === "error") invalidRows.add(row);
    else warningRows.add(row);
  };

  rows.forEach((row, index) => {
    const rowNo = index + 2; // +1 header, +1 one-based
    const allEmpty = Object.values(row).every((v) => v === null || String(v ?? "").trim() === "");
    if (allEmpty) {
      push(rowNo, null, "empty_row", "warning", "Row is empty and will be skipped.");
      return;
    }

    for (const field of def.fields) {
      const value = row[field.key];
      const str = String(value ?? "").trim();

      if (field.required && !str) {
        push(rowNo, field.label, "missing_required", "error", `${field.label} is required.`);
        continue;
      }
      if (!str) continue;

      if (field.type === "email" && !EMAIL_RE.test(str)) {
        push(rowNo, field.label, "invalid_email", "error", `"${str}" is not a valid email address.`);
      }
      if (field.type === "date" && !parseDateValue(str)) {
        push(rowNo, field.label, "invalid_date", "error", `"${str}" is not a recognisable date.`);
      }
      if (field.type === "number" && parseNumberValue(str) === null) {
        push(rowNo, field.label, "invalid_number", "error", `"${str}" is not a valid number.`);
      }
      if (field.type === "phone" && !PHONE_RE.test(str)) {
        push(rowNo, field.label, "invalid_phone", "warning", `"${str}" does not look like a valid phone number.`);
      }
      if (field.type === "username" && !USERNAME_RE.test(str)) {
        push(rowNo, field.label, "invalid_username", "warning", `"${str}" is not a valid GitHub username.`);
      }

      if (field.key === "department" && refs.departments && !refs.departments.has(lower(str))) {
        push(rowNo, field.label, "missing_department", "warning", `Department "${str}" does not exist yet.`);
      }
      if (field.key === "team" && refs.teams && !refs.teams.has(lower(str))) {
        push(rowNo, field.label, "missing_team", "warning", `Team "${str}" does not exist yet.`);
      }
      if (field.key === "github_username" && refs.githubUsers && refs.githubUsers.size && !refs.githubUsers.has(lower(str))) {
        push(rowNo, field.label, "unknown_github_user", "warning", `GitHub user "${str}" is not in the synced contributors.`);
      }
      if (field.key === "jira_user" && refs.jiraUsers && refs.jiraUsers.size && !refs.jiraUsers.has(lower(str))) {
        push(rowNo, field.label, "unknown_jira_user", "warning", `Jira user "${str}" is not in the synced accounts.`);
      }
      if (field.key === "clickup_user" && refs.clickupUsers && refs.clickupUsers.size && !refs.clickupUsers.has(lower(str))) {
        push(rowNo, field.label, "unknown_clickup_user", "warning", `ClickUp user "${str}" is not in the synced members.`);
      }
    }

    // in-file duplicates on key fields
    for (const key of def.keyFields) {
      const value = lower(row[key]);
      if (!value) continue;
      const composite = `${key}:${value}`;
      const previous = seen.get(composite);
      if (previous !== undefined) {
        duplicateRows.add(rowNo);
        const label = def.fields.find((f) => f.key === key)?.label ?? key;
        push(rowNo, label, `duplicate_${key}`, "error", `Duplicate ${label} "${row[key]}" (also on row ${previous}).`);
      } else {
        seen.set(composite, rowNo);
      }
      break;
    }

    // duplicates against existing database records
    const email = lower(row.email);
    if (email && refs.emails?.has(email)) {
      duplicateRows.add(rowNo);
      push(rowNo, "Email", "duplicate_email", "warning", `An employee with email "${email}" already exists.`);
    }
    const code = lower(row.employee_code);
    if (code && refs.employeeCodes?.has(code)) {
      duplicateRows.add(rowNo);
      push(rowNo, "Employee ID", "duplicate_employee_id", "warning", `Employee ID "${row.employee_code}" already exists.`);
    }
  });

  return {
    issues,
    invalidRows,
    warningRows,
    duplicateRows,
    errorCount: issues.filter((i) => i.severity === "error").length,
    warningCount: issues.filter((i) => i.severity === "warning").length,
  };
}