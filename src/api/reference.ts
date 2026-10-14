import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./client";
import type { TradeAgreement, TradeRemedyRegistryItem } from "./types";
import { todayIso } from "@/lib/tariff";

/** Реестр мер защиты рынка ЕАЭС; code — префикс 2–10 цифр, origin — ISO-2. */
export function useTradeRemedies(filters: { code?: string | null; origin?: string | null } = {}) {
  const code = filters.code && /^\d{2,10}$/.test(filters.code) ? filters.code : null;
  const origin = filters.origin && /^[A-Z]{2}$/.test(filters.origin) ? filters.origin : null;
  return useQuery({
    queryKey: ["reference", "trade-remedies", code, origin],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (code) qs.set("code", code);
      if (origin) qs.set("origin", origin);
      const tail = qs.toString() ? `?${qs.toString()}` : "";
      return apiFetch<TradeRemedyRegistryItem[]>(`/api/v1/reference/trade-remedies${tail}`);
    },
    staleTime: 30 * 60 * 1000,
  });
}

/** Торговые режимы ЕАЭС по странам происхождения (ЗСТ). Члены ЕАЭС не перечисляются. */
export function useTradeAgreements() {
  return useQuery({
    queryKey: ["reference", "trade-agreements"],
    queryFn: () => apiFetch<TradeAgreement[]>("/api/v1/reference/trade-agreements"),
    staleTime: 30 * 60 * 1000,
  });
}

/**
 * Соглашение, действующее для страны происхождения на дату (YYYY-MM-DD,
 * по умолчанию сегодня) — то же правило, что regime_for_origin на бэкенде.
 */
export function activeAgreementFor(
  list: TradeAgreement[] | undefined,
  country: string | null | undefined,
  onDate?: string | null,
): TradeAgreement | null {
  if (!list || !country) return null;
  const c = country.toUpperCase();
  const day = onDate || todayIso();
  const active = list.filter(
    (a) => a.country === c && a.status === "in_force" && (!a.in_force_from || a.in_force_from <= day),
  );
  // A full FTA wins over an interim agreement, as on the backend.
  return active.find((a) => a.regime === "fta") ?? active[0] ?? null;
}
