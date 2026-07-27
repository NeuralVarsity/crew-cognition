import { DATASETS, type DatasetKey, type FieldDef } from "../types";

export type ColumnMapping = Record<string, string>; // header -> field key ("" = ignore)

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

function candidates(field: FieldDef) {
  return [field.key, field.label, ...(field.aliases ?? [])].map(norm);
}

export function autoMapColumns(headers: string[], dataset: DatasetKey): ColumnMapping {
  const def = DATASETS[dataset];
  const mapping: ColumnMapping = {};
  if (!def.fields.length) {
    for (const h of headers) mapping[h] = "";
    return mapping;
  }
  const taken = new Set<string>();

  const assign = (header: string, key: string) => {
    mapping[header] = key;
    taken.add(key);
  };

  // pass 1 — exact matches
  for (const header of headers) {
    const h = norm(header);
    const exact = def.fields.find((f) => !taken.has(f.key) && candidates(f).includes(h));
    if (exact) assign(header, exact.key);
  }
  // pass 2 — fuzzy contains
  for (const header of headers) {
    if (mapping[header]) continue;
    const h = norm(header);
    const fuzzy = def.fields.find(
      (f) => !taken.has(f.key) && candidates(f).some((c) => c.length > 3 && (h.includes(c) || c.includes(h))),
    );
    if (fuzzy) assign(header, fuzzy.key);
    else mapping[header] = "";
  }
  return mapping;
}

export function mappedFieldKeys(mapping: ColumnMapping) {
  return Object.values(mapping).filter(Boolean);
}

export function missingRequiredFields(mapping: ColumnMapping, dataset: DatasetKey) {
  const mapped = new Set(mappedFieldKeys(mapping));
  return DATASETS[dataset].fields.filter((f) => f.required && !mapped.has(f.key));
}

/** Build normalized records keyed by field key (or raw header for custom datasets). */
export function applyMapping(
  rows: Record<string, unknown>[],
  mapping: ColumnMapping,
  options?: { trim?: boolean },
): Record<string, unknown>[] {
  const entries = Object.entries(mapping);
  const hasMapped = entries.some(([, key]) => key);
  return rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [header, key] of entries) {
      const target = key || (hasMapped ? null : header);
      if (!target) continue;
      let value = row[header];
      if (options?.trim !== false && typeof value === "string") value = value.trim();
      out[target] = value === "" ? null : value;
    }
    return out;
  });
}