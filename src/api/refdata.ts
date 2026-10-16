import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./client";

/** Курс, по которому посчитаны суммы (CalcOut.refdata.fx, graphs.meta.fx). */
export interface FxQuote {
  currency: string;
  day: string;
  rate: string;
  /** nbkr_daily | nbkr_weekly | nbkr_archive | manual | kgs */
  source: string;
  effective_from?: string | null;
  fetched_at?: string | null;
  published_at?: string | null;
  /** manual: почему официальный курс не подтверждён */
  issue?: string | null;
}

/** Гарантия справочника на дату расчёта (eec — сверка с ЕЭК, attestation — подпись эксперта). */
export interface DatasetCheck {
  dataset: string;
  title: string;
  guarantee: string;
  checked_at: string | null;
  checked_by?: string | null;
  guaranteed_until: string | null;
  ok: boolean;
  message: string | null;
}

export interface Refdata {
  fx: FxQuote[];
  datasets: DatasetCheck[];
}

export interface DataStatusEntry {
  dataset: string;
  title: string;
  source: string;
  source_url: string | null;
  cadence: string;
  /** fx | eec | attestation | none */
  guarantee: string;
  /** ok | failing | unknown */
  status: string;
  last_attempt_at: string | null;
  last_success_at: string | null;
  last_change_at: string | null;
  last_error: string | null;
  publication_date: string | null;
  warning: string | null;
  /** Что сейчас загружено (редакция ЕТТ и т.п.). */
  detail?: string | null;
  attested_at: string | null;
  attested_by: string | null;
  attested_note: string | null;
  guaranteed_until: string | null;
  ok: boolean;
}

export interface DataStatus {
  today: string;
  datasets: DataStatusEntry[];
  pending_changes: number;
}

/** GET /api/v1/reference/data-status — источник и дата сверки справочников (без входа). */
export function useDataStatus() {
  return useQuery({
    queryKey: ["reference", "data-status"],
    queryFn: () => apiFetch<DataStatus>("/api/v1/reference/data-status"),
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

/** graphs.meta.fx (объект по валютам) → список в порядке валют. */
export function fxFromMeta(meta: Record<string, FxQuote> | undefined, currencies: string[]): FxQuote[] {
  if (!meta) return [];
  const order = [...new Set(currencies.map((c) => c.toUpperCase()))];
  return order.filter((c) => meta[c]).map((c) => meta[c]);
}

/** Дата-время ISO → «16.10 09:15» по Бишкеку (UTC+6), как в оповещениях и PDF. */
export function formatBishkek(iso: string | null | undefined, withYear = false): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const local = new Date(d.getTime() + 6 * 3600 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${pad(local.getUTCDate())}.${pad(local.getUTCMonth() + 1)}${withYear ? `.${local.getUTCFullYear()}` : ""}`;
  return `${date} ${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`;
}
