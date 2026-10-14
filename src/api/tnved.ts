import { useQueries, useQuery } from "@tanstack/react-query";
import { apiFetch } from "./client";
import { adaptCodeLookup, adaptTreeNode } from "./adapters";
import type { components } from "./types.generated";
import type { TnvedCodeInfo, TnvedNode } from "./types";

type BackendTreeNode = components["schemas"]["TnvedNodeResponse"];
type BackendCodeLookup = components["schemas"]["CodeLookupResponse"];

export function useTreeNode(parentCode: string | null) {
  return useQuery({
    queryKey: ["tnved", "tree", parentCode ?? "root"],
    queryFn: async (): Promise<TnvedNode[]> => {
      const qs = parentCode
        ? `?parent_code=${encodeURIComponent(parentCode)}`
        : "";
      const raw = await apiFetch<BackendTreeNode[]>(`/api/v1/tnved/tree${qs}`);
      return raw.map(adaptTreeNode);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export interface LookupOptions {
  /** ISO alpha-2 — оставляет только меры защиты рынка этой страны. */
  origin?: string | null;
  /** YYYY-MM-DD — ставки на дату; по умолчанию сегодня. */
  onDate?: string | null;
}

export function normalizeOrigin(origin: string | null | undefined): string | null {
  const o = origin?.trim().toUpperCase() ?? "";
  return /^[A-Z]{2}$/.test(o) ? o : null;
}

function lookupQuery(code: string | null, opts: LookupOptions = {}) {
  const origin = normalizeOrigin(opts.origin);
  const onDate = opts.onDate || null;
  return {
    queryKey: ["tnved", "lookup", code, origin, onDate] as const,
    queryFn: async (): Promise<TnvedCodeInfo> => {
      const qs = new URLSearchParams();
      if (origin) qs.set("origin", origin);
      if (onDate) qs.set("on_date", onDate);
      const tail = qs.toString() ? `?${qs.toString()}` : "";
      const raw = await apiFetch<BackendCodeLookup>(
        `/api/v1/tnved/lookup/${encodeURIComponent(code ?? "")}${tail}`,
      );
      return adaptCodeLookup(raw);
    },
    staleTime: 5 * 60 * 1000,
  };
}

const isFullCode = (code: string | null | undefined): code is string =>
  Boolean(code && /^\d{10}$/.test(code));

/** Справка по коду; без 10 цифр запрос не отправляется (бэкенд ответит 400). */
export function useCodeLookup(code: string | null, opts: LookupOptions = {}) {
  return useQuery({
    ...lookupQuery(code, opts),
    enabled: isFullCode(code),
  });
}

function lookupKey(code: string, origin: string | null): string {
  return `${code}:${origin ?? ""}`;
}

/**
 * Справки для набора пар (код, страна) — позиции досье. Кэш общий с
 * useCodeLookup, так что повторные коды не дёргают бэкенд. onDate — дата
 * курса досье (rate_date): меры и льготы должны совпасть с проектом ДТ.
 */
export function useCodeLookups(
  pairs: Array<{ code: string | null | undefined; origin?: string | null }>,
  opts: { onDate?: string | null } = {},
) {
  const unique = new Map<string, { code: string; origin: string | null }>();
  for (const p of pairs) {
    if (!isFullCode(p.code)) continue;
    const origin = normalizeOrigin(p.origin);
    unique.set(lookupKey(p.code, origin), { code: p.code, origin });
  }
  const entries = [...unique.entries()];
  const results = useQueries({
    queries: entries.map(([, p]) => ({
      ...lookupQuery(p.code, { origin: p.origin, onDate: opts.onDate }),
      retry: false,
    })),
  });
  const byKey = new Map<string, TnvedCodeInfo>();
  entries.forEach(([key], i) => {
    const data = results[i]?.data;
    if (data) byKey.set(key, data);
  });
  return {
    get: (code: string | null | undefined, origin?: string | null): TnvedCodeInfo | undefined =>
      isFullCode(code) ? byKey.get(lookupKey(code, normalizeOrigin(origin))) : undefined,
    isLoading: results.some((r) => r.isLoading),
  };
}
