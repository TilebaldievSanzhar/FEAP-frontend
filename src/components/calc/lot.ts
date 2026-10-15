/**
 * Lot parameters as the user edits them (strings, as typed) ⇄ CalcIn / passport.
 * No money arithmetic here: «цена × количество» is sent as unit_price + qty and
 * the backend computes the lot value.
 */
import type { CalcIn, CalcParams, CostLine } from "@/api/calc";
import type { Incoterms, RemedyDecision } from "@/api/dt-types";

export type PriceMode = "lot" | "unit";

/** Currencies with a daily NBKR rate (the calc needs one for the lot and costs). */
export const CALC_CURRENCIES = ["USD", "CNY", "EUR", "RUB", "KZT", "KGS"];

export const SELECT_CLS =
  "h-[34px] rounded-[var(--r-md)] border border-[var(--border)] bg-[hsl(var(--card))] px-2 text-[12.5px] disabled:opacity-60";

export interface LotState {
  priceMode: PriceMode;
  /** Стоимость партии по счёту (priceMode = lot). */
  price: string;
  /** Цена за единицу (priceMode = unit). */
  unitPrice: string;
  qty: string;
  qtyUnit: string;
  currency: string;
  incoterms: Incoterms;
  freightToBorder: string;
  manufacturer: string;
  remedyDecisions: Record<string, RemedyDecision>;
  vatBenefit: string | null;
  costs: CostLine[];
}

const DECIMAL = /^\d+(\.\d+)?$/;

/** «12,5» → "12.5"; drops everything that is not a digit or the first dot. */
export function cleanDecimal(raw: string): string {
  const [int, ...frac] = raw.replace(/,/g, ".").replace(/[^\d.]/g, "").split(".");
  return frac.length ? `${int}.${frac.join("")}` : int;
}

export function isPositive(value: string | null | undefined): boolean {
  return Boolean(value && DECIMAL.test(value) && /[1-9]/.test(value));
}

export function emptyLot(over: Partial<LotState> = {}): LotState {
  return {
    priceMode: "lot",
    price: "",
    unitPrice: "",
    qty: "",
    qtyUnit: "шт",
    currency: "USD",
    incoterms: "FOB",
    freightToBorder: "",
    manufacturer: "",
    remedyDecisions: {},
    vatBenefit: null,
    costs: [],
    ...over,
  };
}

export function hasLotPrice(lot: LotState): boolean {
  return lot.priceMode === "lot" ? isPositive(lot.price) : isPositive(lot.unitPrice) && isPositive(lot.qty);
}

/** Lot → passport.calc / CalcIn parameters (only filled fields are sent). */
export function lotToParams(lot: LotState, origin: string | null): CalcParams {
  const unit = lot.priceMode === "unit";
  return {
    origin_country: origin,
    manufacturer: lot.manufacturer.trim() || null,
    price: !unit && isPositive(lot.price) ? lot.price : null,
    unit_price: unit && isPositive(lot.unitPrice) ? lot.unitPrice : null,
    currency: lot.currency,
    incoterms: lot.incoterms,
    freight_to_border: isPositive(lot.freightToBorder) ? lot.freightToBorder : "0",
    qty: isPositive(lot.qty) ? lot.qty : null,
    qty_unit: lot.qtyUnit.trim() || null,
    remedy_decisions: lot.remedyDecisions,
    vat_benefit: lot.vatBenefit,
    costs: lot.costs.filter((c) => isPositive(c.amount)),
  };
}

export function toCalcIn(
  lot: LotState,
  ctx: { code: string; description?: string | null; origin: string | null; date?: string | null },
): CalcIn | null {
  if (!hasLotPrice(lot)) return null;
  return {
    hs_code: ctx.code,
    description: ctx.description?.slice(0, 2000) || null,
    rate_date: ctx.date || null,
    ...lotToParams(lot, ctx.origin),
  };
}

/** Saved passport.calc → editable lot (strings as the backend stored them). */
export function lotFromParams(p: CalcParams | null | undefined): LotState {
  if (!p) return emptyLot();
  const unit = !p.price && Boolean(p.unit_price);
  return emptyLot({
    priceMode: unit ? "unit" : "lot",
    price: p.price ?? "",
    unitPrice: p.unit_price ?? "",
    qty: p.qty ?? "",
    qtyUnit: p.qty_unit ?? "шт",
    currency: p.currency || "USD",
    incoterms: p.incoterms || "FOB",
    freightToBorder: p.freight_to_border && p.freight_to_border !== "0" ? p.freight_to_border : "",
    manufacturer: p.manufacturer ?? "",
    remedyDecisions: p.remedy_decisions ?? {},
    vatBenefit: p.vat_benefit ?? null,
    costs: p.costs ?? [],
  });
}
