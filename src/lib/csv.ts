export type CsvRow = Record<string, string | number | null | undefined>;

function escapeCell(value: string | number | null | undefined): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(rows: CsvRow[], columns: string[], separator = ","): string {
  const header = columns.map(escapeCell).join(separator);
  const body = rows.map((row) => columns.map((c) => escapeCell(row[c])).join(separator));
  return [header, ...body].join("\r\n");
}

export function downloadCsv(filename: string, csv: string): void {
  // Prepend BOM so Excel opens UTF-8 Cyrillic correctly.
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
