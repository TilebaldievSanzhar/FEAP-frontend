/**
 * Расчёт по товару без досье (POST /calc), паспорт PDF и ввод по фото.
 * Контракты — docs/frontend_spec_v3_1_calc.md в репо бэкенда. Деньги приходят
 * строками (Decimal) и только отображаются: всю арифметику делает бэкенд.
 */
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { getConfig } from "@/lib/config";
import { ApiError, apiFetch } from "./client";
import { getAuthToken } from "./auth";
import type { DraftStatus, Finding, Incoterms, PaymentLine, RemedyDecision } from "./dt-types";
import type { ClassificationChainStep } from "./types";
import type { Refdata } from "./refdata";

export type CostKind = "logistics" | "broker" | "warehouse" | "certification" | "bank" | "other";

export const COST_KINDS: CostKind[] = ["logistics", "broker", "warehouse", "certification", "bank", "other"];

export interface CostLine {
  kind: CostKind;
  label?: string | null;
  amount: string;
  /** KGS или валюта с курсом НБКР. */
  currency: string;
}

/** Параметры партии — то, что хранит паспорт товара (passport.calc). */
export interface CalcParams {
  origin_country?: string | null;
  manufacturer?: string | null;
  /** Стоимость партии по счёту; без неё бэкенд считает unit_price × qty. */
  price?: string | null;
  unit_price?: string | null;
  currency: string;
  incoterms: Incoterms;
  freight_to_border?: string;
  insurance?: string;
  other_charges?: string;
  freight_beyond_border?: string;
  qty?: string | null;
  qty_unit?: string | null;
  net_kg?: string | null;
  gross_kg?: string | null;
  supp_qty?: string | null;
  supp_unit?: string | null;
  preference?: string | null;
  preferential_duty_rate?: string | null;
  remedy_decisions?: Record<string, RemedyDecision>;
  vat_benefit?: string | null;
  costs?: CostLine[];
}

export interface CalcIn extends CalcParams {
  hs_code: string;
  description?: string | null;
  rate_date?: string | null;
}

export interface LandedCostLine {
  kind: string;
  label: string;
  amount: string;
  source_amount?: string | null;
  source_currency?: string | null;
  customs_payment: boolean;
}

export interface LandedCost {
  lines: LandedCostLine[];
  total: string;
  vat: string;
  total_without_vat: string;
  qty: string | null;
  qty_unit: string | null;
  per_unit: string | null;
  per_unit_without_vat: string | null;
}

export interface CalcOut {
  status: DraftStatus;
  hs_code: string;
  rate_date: string;
  currency: string;
  fx_rate: string | null;
  customs_value: string | null;
  payments: PaymentLine[];
  payments_total: string | null;
  vat_base_includes_remedies: boolean;
  tariff: Record<string, unknown>;
  landed_cost: LandedCost | null;
  findings: Finding[];
  missing_parameters: string[];
  /** Источник и дата сверки: курсы на день и гарантии справочников. */
  refdata?: Refdata;
}

export interface ClassificationNote {
  source: "cascade" | "manual" | "catalog";
  confidence?: number | null;
  steps: Array<{ level: string; code: string; name?: string | null; reasoning?: string | null }>;
}

export interface PassportIn {
  calc?: CalcParams | null;
  classification?: ClassificationNote | null;
}

/** Шаги каскада → обоснование для паспорта (поля обрезаны под лимиты бэкенда). */
export function classificationNote(
  chain: ClassificationChainStep[] | null | undefined,
  confidence?: number | null,
): ClassificationNote {
  if (!chain?.length) return { source: "manual", steps: [] };
  return {
    source: "cascade",
    confidence: confidence ?? null,
    steps: chain.slice(0, 8).map((s) => ({
      level: s.level.slice(0, 20),
      code: s.code.slice(0, 20),
      name: s.name ? s.name.slice(0, 1000) : null,
      reasoning: s.reasoning ? s.reasoning.slice(0, 4000) : null,
    })),
  };
}

/** Живой расчёт: пересчитывается при изменении тела (тело — уже после debounce). */
export function useCalc(body: CalcIn | null) {
  return useQuery({
    queryKey: ["calc", body],
    queryFn: () => apiFetch<CalcOut>("/api/v1/calc", { method: "POST", body }),
    enabled: body !== null,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    retry: false,
  });
}

// ── Ввод по фото / скриншоту ────────────────────────────────────────────────

export interface ImageProductCard {
  is_product: boolean;
  not_product_reason: string | null;
  product_identification: string;
  description_ru: string;
  title_original: string | null;
  material: string | null;
  function: string | null;
  intended_use: string | null;
  brand: string | null;
  model: string | null;
  manufacturer: string | null;
  origin_country: string | null;
  origin_evidence: string | null;
  price: { amount: string | null; currency: string | null; per: string | null; min_order_qty: string | null } | null;
  specs: Array<{ name: string; value: string }>;
  missing_info: string[];
  clarifying_questions: string[];
}

export interface ImageCardOut {
  card: ImageProductCard;
  classify_description: string;
  prefill: {
    origin_country: string | null;
    manufacturer: string | null;
    unit_price: string | null;
    currency: string | null;
    qty_unit: string | null;
    min_order_qty: string | null;
  };
  images: number;
}

export const IMAGE_MAX_FILES = 4;
export const IMAGE_MAX_MB = 8;

export function useImageCard() {
  return useMutation({
    mutationFn: ({ files, note }: { files: File[]; note?: string }) => {
      const form = new FormData();
      for (const f of files) form.append("files", f);
      if (note?.trim()) form.append("note", note.trim());
      return apiFetch<ImageCardOut>("/api/v1/calc/from-image", { method: "POST", body: form });
    },
  });
}

// ── PDF паспорта ────────────────────────────────────────────────────────────

async function downloadPdf(path: string, init: RequestInit, fallbackName: string): Promise<void> {
  const { apiBaseUrl } = getConfig();
  const headers = new Headers(init.headers);
  const token = getAuthToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${apiBaseUrl}${path}`, { ...init, headers });
  if (!res.ok) {
    let payload: unknown = null;
    try {
      payload = await res.json();
    } catch {
      payload = await res.text().catch(() => null);
    }
    throw new ApiError(res.status, payload);
  }
  const match = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "");
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = match?.[1] ?? fallbackName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** PDF паспорта прямо из расчёта (без входа). */
export function downloadCalcPassport(body: {
  calc: CalcIn;
  title?: string | null;
  sku?: string | null;
  classification?: ClassificationNote | null;
}): Promise<void> {
  return downloadPdf(
    "/api/v1/calc/passport.pdf",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    `passport_${body.calc.hs_code}.pdf`,
  );
}

/** PDF паспорта записи «Товары» (ставки на дату, сохранённые параметры партии). */
export function downloadCatalogPassport(itemId: string, sku: string): Promise<void> {
  return downloadPdf(
    `/api/v1/catalog/${encodeURIComponent(itemId)}/passport.pdf`,
    { method: "GET" },
    `passport_${sku}.pdf`,
  );
}
