/**
 * Wire types for the DT module (feap.dt) and auth (Track B1).
 * Hand-written from backend Pydantic schemas (src/feap/dt/schemas.py,
 * src/feap/auth/schemas.py) — the shapes are already UI-friendly, so unlike
 * classify/jobs there is no adapter layer.
 *
 * Money/weights are Decimal on the backend and serialize as STRINGS —
 * render them as-is (mono), never parse to float for display.
 */

import type { PassportIn } from "./calc";
import type { DatasetCheck, FxQuote } from "./refdata";

// ────────────────────────────────────────────────────────────────────────────
// Auth
// ────────────────────────────────────────────────────────────────────────────

export type OrgRole = "owner" | "declarant" | "viewer";

export interface AccountOut {
  id: string;
  email: string;
  name: string | null;
}

export interface OrgBrief {
  id: string;
  name: string;
  role: OrgRole;
}

export interface TokenOut {
  access_token: string;
  expires_in: number;
  account: AccountOut;
  org: OrgBrief;
}

export interface MeOut {
  account: AccountOut;
  org: OrgBrief;
  orgs: OrgBrief[];
}

export interface RegisterIn {
  email: string;
  password: string;
  name?: string | null;
  org_name?: string | null;
}

export interface LoginIn {
  email: string;
  password: string;
  org_id?: string | null;
}

// ────────────────────────────────────────────────────────────────────────────
// Shipments (досье поставки)
// ────────────────────────────────────────────────────────────────────────────

export type Incoterms =
  | "EXW"
  | "FCA"
  | "FAS"
  | "FOB"
  | "CFR"
  | "CIF"
  | "CPT"
  | "CIP"
  | "DAP"
  | "DPU"
  | "DDP";

export const INCOTERMS: Incoterms[] = [
  "EXW",
  "FCA",
  "FAS",
  "FOB",
  "CFR",
  "CIF",
  "CPT",
  "CIP",
  "DAP",
  "DPU",
  "DDP",
];

export type AllocationMethod = "gross_weight" | "value";

export type ShipmentStatus = "draft" | "classifying" | "review" | "ready" | string;

export interface PartyIn {
  name: string;
  country?: string | null;
  address?: string | null;
  inn?: string | null;
}

export type RemedyDecisionKind = "applies" | "not_applicable" | "exempt";

/** Решение декларанта по мере защиты рынка ЕАЭС (v3 §4.1). */
export interface RemedyDecision {
  decision: RemedyDecisionKind;
  variant?: string | null;
  /** Ставка вручную, % — только для мер с неразобранной ставкой. */
  rate_pct?: string | null;
  note?: string | null;
}

export interface ShipmentItemIn {
  description: string;
  hs_code?: string | null;
  origin_country?: string | null;
  qty?: string | null;
  qty_unit?: string | null;
  price: string;
  net_kg?: string | null;
  gross_kg?: string | null;
  packages?: number | null;
  supp_qty?: string | null;
  supp_unit?: string | null;
  preference?: string | null;
  /** Ставка по графику ЗСТ в формате ЕТТ ('0%', '5%'); работает только с кодом гр. 36. */
  preferential_duty_rate?: string | null;
  /** Производитель (гр. 31) — для индивидуальных ставок мер защиты рынка. */
  manufacturer?: string | null;
  remedy_decisions?: Record<string, RemedyDecision>;
  /** source условной льготы НДС из справки по коду; null = общая ставка. */
  vat_benefit?: string | null;
  sku?: string | null;
  classification_ref?: string | null;
  extra?: Record<string, unknown>;
}

export interface ShipmentIn {
  procedure: "IM40";
  seller: PartyIn;
  buyer: PartyIn;
  declarant?: PartyIn | null;
  trading_country?: string | null;
  dispatch_country?: string | null;
  destination_country: string;
  incoterms: Incoterms;
  incoterms_place?: string | null;
  deal_nature?: string | null;
  contract_currency: string;
  freight_to_border: string;
  freight_beyond_border: string;
  insurance: string;
  other_charges: string;
  allocation_method: AllocationMethod;
  rate_date?: string | null;
  /** Курс вручную (сом за единицу) — только если НБКР не подтвердил курс на дату ДТ. */
  manual_fx_rates?: Record<string, string>;
  transport_at_border_type?: string | null;
  transport_ids?: string | null;
  container?: boolean | null;
  places_total?: number | null;
  items: ShipmentItemIn[];
}

export interface ShipmentOut {
  id: string;
  org_id: string | null;
  status: ShipmentStatus;
  data: ShipmentIn;
  created_at: string;
  updated_at: string;
  latest_draft_id?: string | null;
  latest_draft_version?: number | null;
}

export interface ShipmentListEntry {
  id: string;
  status: ShipmentStatus;
  procedure: string;
  buyer_name: string | null;
  items_count: number;
  items_without_code: number;
  created_at: string;
  updated_at: string;
}

export interface ShipmentListOut {
  items: ShipmentListEntry[];
  total: number;
}

export interface ShipmentClassifyOut {
  job_id: string;
  status: string;
  enqueued: number;
  skipped: number;
  poll_url: string;
  items_url: string;
  events_url: string;
}

// ────────────────────────────────────────────────────────────────────────────
// DT draft (проект ДТ)
// ────────────────────────────────────────────────────────────────────────────

export type Severity = "error" | "warning" | "info";
export type DraftStatus = "ready" | "has_errors" | "needs_input";

export interface Finding {
  rule: string;
  severity: Severity;
  graph: string | null;
  message: string;
  details: Record<string, string>;
}

export type RemedyKind = "special" | "antidumping" | "countervailing";
export type PaymentKind = "fee" | "duty" | RemedyKind | "excise" | "vat";

export const REMEDY_KINDS: readonly RemedyKind[] = ["special", "antidumping", "countervailing"];

export function isRemedyKind(kind: string): kind is RemedyKind {
  return (REMEDY_KINDS as readonly string[]).includes(kind);
}

export interface PaymentLine {
  kind: PaymentKind;
  code: string;
  basis: string | null;
  rate: string;
  amount: string | null;
  missing: string[];
  note?: string | null;
  /** Мера/льгота, на которой основана строка (AD-32, pkm816_a2). */
  ref?: string | null;
}

/** items[i].tariff — след тарифных проверок; не графа, в печатную форму не идёт. */
export interface ItemTariff {
  origin_regime: {
    country: string;
    regime: string;
    agreement: string;
    in_force_from: string | null;
    origin_proof: string | null;
  } | null;
  preferential_duty_rate: string | null;
  preferential_rate_applied: boolean;
  remedies: Array<{
    measure_no: string;
    kind: string;
    title: string;
    decision: RemedyDecisionKind | null;
    notes: string | null;
    rate?: string;
  }>;
  vat_options: Array<{ source: string; rate: string; condition: string; legal_ref: string }>;
  vat_benefit: string | null;
  vat_benefit_applied: boolean;
}

export interface GraphParty {
  name: string;
  country: string | null;
  address: string | null;
  inn: string | null;
}

export interface G44Doc {
  code: string | null;
  kind: string;
  number: string | null;
  date: string | null;
  permit_status?: string | null;
}

export interface GraphItem {
  g32: number;
  g31: {
    description: string;
    qty: string | null;
    qty_unit: string | null;
    packages: number | null;
    sku: string | null;
    manufacturer?: string | null;
  };
  g33: string | null;
  g34: string | null;
  g35: string | null;
  g36: string | null;
  g38: string | null;
  g41: { qty: string | null; unit: string | null; required_unit: string | null };
  g42: string | null;
  g43: string;
  g44: G44Doc[];
  g45: string | null;
  g46: string | null;
  g47: PaymentLine[];
  /** Есть в проектах, собранных бэкендом v3; в старых версиях отсутствует. */
  tariff?: ItemTariff;
}

export interface Graphs {
  meta: {
    procedure: string;
    structure_version: string;
    rate_date: string;
    generated_at: string;
    vat_base_includes_remedies?: boolean;
    fee_mode?: "percent" | "fixed" | "off";
    /** Курсы на день: валюта → источник и когда получен (refsync). */
    fx?: Record<string, FxQuote>;
    refdata?: {
      datasets?: DatasetCheck[];
      blocking?: string[];
      attestation_warning?: string | null;
      guard_mode?: "enforce" | "warn";
    };
  };
  header: {
    g01: { direction: string; procedure: string; form: string };
    g02: GraphParty | null;
    g03: { sheets: number };
    g05: number;
    g06: number | null;
    g07: string | null;
    g08: GraphParty | null;
    g09: GraphParty | null;
    g11: string | null;
    g12: string | null;
    g14: GraphParty | null;
    g15: string | null;
    g17: string | null;
    g18: string | null;
    g19: string | null;
    g20: { incoterms: string; place: string | null };
    g21: string | null;
    g22: { currency: string; amount: string | null };
    g23: { rate: string | null; date: string };
    g24: string | null;
    g25: string | null;
    g37: { requested: string; previous: string; feature: string };
  };
  items: GraphItem[];
  totals: {
    g05: number;
    g03_sheets: number;
    g12: string | null;
    invoice_total: string | null;
    additions_total: string | null;
    /** Ключи динамические (duty, antidumping, fee…) — рендерить все пришедшие. */
    payments: Record<string, string | null>;
    fee_line: PaymentLine | null;
  };
}

export interface DtDraftOut {
  id: string;
  shipment_id: string;
  version: number;
  status: DraftStatus;
  structure_version: string;
  graphs: Graphs;
  findings: Finding[];
  missing_parameters: string[];
  created_at: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Catalog (золотые записи организации)
// ────────────────────────────────────────────────────────────────────────────

export interface CatalogItemIn {
  sku: string;
  description: string;
  hs_code?: string | null;
  attributes?: Record<string, unknown>;
  approved_by?: string | null;
  /** Паспорт товара: параметры партии + обоснование кода; null/нет — не менять. */
  passport?: PassportIn | null;
}

export interface CatalogItemOut {
  id: string;
  org_id: string;
  sku: string;
  description: string;
  hs_code: string | null;
  attributes: Record<string, unknown>;
  /** {} у записей без паспорта. */
  passport: PassportIn;
  usage_count: number;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CatalogListOut {
  items: CatalogItemOut[];
  total: number;
}

export interface CatalogImportOut {
  imported: number;
  updated: number;
  skipped: number;
}

// ────────────────────────────────────────────────────────────────────────────
// Shipment documents (Фаза 2, SGR-слой)
// ────────────────────────────────────────────────────────────────────────────

export type DocumentKind =
  | "auto"
  | "invoice"
  | "packing"
  | "cmr"
  | "awb"
  | "rail"
  | "contract"
  | "cert_origin"
  | "permit"
  | "other";

/** Kinds the backend has an extractor for (extract?kind= accepts only these). */
export const EXTRACTABLE_KINDS = [
  "invoice",
  "packing",
  "cmr",
  "contract",
  "cert_origin",
] as const;

export type DocumentStatus = "attached" | "extracted" | "needs_kind" | string;

export interface DocumentIn {
  kind?: DocumentKind;
  number?: string | null;
  doc_date?: string | null;
  text?: string | null;
  ocr_job_id?: string | null;
  file_index?: number;
}

export interface DocCheck {
  check: string;
  status: "ok" | "mismatch" | "skipped";
  message: string;
  expected: string | null;
  actual: string | null;
}

export interface DocTypeResult {
  content_summary: string;
  type_markers: string[];
  kind: string;
  confidence: number;
  language: string | null;
}

export interface DocumentOut {
  id: string;
  shipment_id: string;
  kind: string;
  number: string | null;
  doc_date: string | null;
  source_origin: string | null;
  ocr_job_id: string | null;
  text_chars: number;
  status: DocumentStatus;
  doc_type: DocTypeResult | null;
  doc: Record<string, unknown> | null;
  checks: DocCheck[];
  sensor_warnings: string[];
  extracted_at: string | null;
  created_at: string;
}

export interface DocumentListOut {
  items: DocumentOut[];
  total: number;
}

export type PermitStatus =
  | "format_invalid"
  | "format_ok"
  | "found"
  | "not_found"
  | "status_mismatch"
  | "code_mismatch"
  | "unavailable";

export interface PermitCheckOut {
  document_id: string;
  status: PermitStatus;
  detail: string;
  source: "format" | "registry";
  checked_at: string;
  cached: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// Crosscheck / G31 / Advisor / Fixer (Фаза 2, LLM по краям)
// ────────────────────────────────────────────────────────────────────────────

export type MatchVerdict = "match" | "mismatch" | "uncertain";

export interface PartyMatchOut {
  pair_id: string;
  entity: string;
  doc_label: string;
  doc_value: string;
  shipment_value: string;
  verdict: MatchVerdict;
  match_confidence: number;
  reasoning: string;
}

export interface LineMatchOut {
  doc_line_no: number;
  shipment_position: number | null;
  match_confidence: number;
  reasoning: string;
}

export interface CrosscheckOut {
  findings: Finding[];
  parties: PartyMatchOut[];
  invoice_lines: LineMatchOut[];
  dropped: string[];
  llm_used: boolean;
}

export interface G31Fact {
  id: string;
  label: string;
  value: string;
  source: string;
}

export interface G31Out {
  accepted: boolean;
  text_ru: string | null;
  facts: G31Fact[];
  facts_used: string[];
  missing_attributes: string[];
  rejection_reasons: string[];
  attempts: number;
}

export interface RiskSignal {
  id: string;
  kind: string;
  severity: "warning" | "info";
  message: string;
  data: Record<string, string>;
}

export interface RiskAdvice {
  signal_id: string;
  explanation: string;
  evidence: Array<{ source: string; detail: string }>;
  recommendation: string;
}

export type CodeCheckVerdict = "consistent" | "questionable" | "mismatch";

export interface CodeCheck {
  position: number;
  verdict: CodeCheckVerdict;
  reasoning: string;
}

export interface AdviseOut {
  signals: RiskSignal[];
  advices: RiskAdvice[];
  code_checks: CodeCheck[];
  dropped: string[];
  llm_used: boolean;
}

export type FixAction = "propose_value" | "ask_user" | "cannot_fix";

export interface FixVerification {
  applied: boolean;
  verified: boolean | null;
  target_gone?: boolean;
  errors_before?: number;
  errors_after?: number;
  status_after?: string;
  note?: string | null;
}

export interface FixSuggestionOut {
  finding_rule: string;
  finding_graph: string | null;
  action: FixAction;
  field_path: string | null;
  proposed_value: string | null;
  question: string | null;
  why: string;
  evidence: string[];
  verification: FixVerification;
}

export interface FixOut {
  suggestions: FixSuggestionOut[];
  analysis: string | null;
  llm_used: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// UI helpers
// ────────────────────────────────────────────────────────────────────────────

export type CodeSource = "cascade" | "catalog" | "manual";

/** Derive the source-of-code badge from classification_ref. */
export function codeSourceOf(item: ShipmentItemIn): CodeSource | null {
  if (!item.hs_code) return null;
  const ref = item.classification_ref ?? "";
  if (ref.startsWith("job_item:")) return "cascade";
  if (ref.startsWith("catalog:")) return "catalog";
  return "manual";
}

/** Confidence saved by the classify write-back, if present. */
export function itemConfidence(item: ShipmentItemIn): number | null {
  const cls = (item.extra?.classification ?? null) as { confidence?: unknown } | null;
  const conf = cls?.confidence;
  return typeof conf === "number" ? conf : null;
}

/** Format a 10-digit code as «8509 80 000 0». */
export function formatHsCode(code: string | null | undefined): string {
  if (!code) return "";
  const c = code.replace(/\s/g, "");
  if (c.length !== 10) return code;
  return `${c.slice(0, 4)} ${c.slice(4, 6)} ${c.slice(6, 9)} ${c.slice(9)}`;
}

export function emptyParty(): PartyIn {
  return { name: "", country: null, address: null, inn: null };
}

export function emptyShipment(): ShipmentIn {
  return {
    procedure: "IM40",
    seller: emptyParty(),
    buyer: emptyParty(),
    declarant: null,
    trading_country: null,
    dispatch_country: null,
    destination_country: "KG",
    incoterms: "FOB",
    incoterms_place: null,
    deal_nature: null,
    contract_currency: "USD",
    freight_to_border: "0",
    freight_beyond_border: "0",
    insurance: "0",
    other_charges: "0",
    allocation_method: "gross_weight",
    rate_date: null,
    transport_at_border_type: null,
    transport_ids: null,
    container: null,
    places_total: null,
    items: [],
  };
}

export function emptyItem(): ShipmentItemIn {
  return {
    description: "",
    hs_code: null,
    origin_country: null,
    qty: null,
    qty_unit: null,
    price: "0",
    net_kg: null,
    gross_kg: null,
    packages: null,
    supp_qty: null,
    supp_unit: null,
    preference: null,
    preferential_duty_rate: null,
    manufacturer: null,
    remedy_decisions: {},
    vat_benefit: null,
    sku: null,
    classification_ref: null,
    extra: {},
  };
}
