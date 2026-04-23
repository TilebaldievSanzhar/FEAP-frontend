export function formatCode(code: string | null | undefined): string {
  if (!code) return "";
  const digits = code.replace(/\D/g, "");
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  if (digits.length <= 8) return `${digits.slice(0, 4)} ${digits.slice(4, 6)} ${digits.slice(6)}`;
  return `${digits.slice(0, 4)} ${digits.slice(4, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
}

export function formatPercent(value: number | null | undefined, fractionDigits = 1): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(fractionDigits)}%`;
}

export function formatRate(value: number | string | null | undefined): string {
  if (value == null) return "—";
  if (typeof value === "string") return value;
  return `${value}%`;
}

const UNITS = ["Б", "КБ", "МБ", "ГБ"] as const;

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} ${UNITS[0]}`;
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < UNITS.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${UNITS[unitIndex]}`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}
