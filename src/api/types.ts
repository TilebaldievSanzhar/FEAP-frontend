/**
 * Internal, UI-facing normalized model.
 * The live backend shapes live in `types.generated.ts` (openapi-typescript output).
 * Adapters in `./classify.ts`, `./tnved.ts`, `./ntm.ts`, `./ocr.ts`, `./jobs.ts`
 * translate between the two so components stay decoupled from wire changes.
 */

// ────────────────────────────────────────────────────────────────────────────
// Classification — single product
// ────────────────────────────────────────────────────────────────────────────

export type ClassificationStatus = "completed" | "needs_input" | "error";

/** One step in the decision chain (section → group → position → subposition → code_10). */
export interface ClassificationChainStep {
  /** UI-friendly tag: "section" | "group" | "position" | "subposition" | "code_10" or free-form. */
  level: string;
  code: string;
  name?: string;
  reasoning?: string | null;
  confidence?: number | null;
}

export interface ClassificationResult {
  final_code: string;
  code_formatted: string;
  code_description: string;
  classification_chain: ClassificationChainStep[];
  duty_rate?: number | string | null;
  vat_rate?: number | string | null;
  excise_rate?: number | string | null;
  confidence: number;
  risk_flags: string[];
  requires_human_review: boolean;
  opi_applied: string[];
  precedent_match?: boolean;
  precedent_codes?: string[];
}

export interface PartialResult {
  partial_code: string | null;
  missing_parameters: string[];
  questions: string[];
  classification_chain_so_far: ClassificationChainStep[];
}

export interface ClassifyRequest {
  description: string;
  additional_info?: Record<string, string>;
}

export interface ClassifyCompleted {
  status: "completed";
  session_id?: string | null;
  result: ClassificationResult;
}

export interface ClassifyNeedsInput {
  status: "needs_input";
  session_id: string;
  partial: PartialResult;
  answers_used: number;
  answers_limit: number;
}

export interface ClassifyError {
  status: "error";
  error: string;
}

export type ClassifyResponse = ClassifyCompleted | ClassifyNeedsInput | ClassifyError;

export interface AnswerRequest {
  answers: Record<string, string>;
}

// ────────────────────────────────────────────────────────────────────────────
// TNVED
// ────────────────────────────────────────────────────────────────────────────

export interface TnvedNode {
  code: string;
  code_formatted?: string;
  name: string;
  /** UI tag derived from numeric backend level. */
  level: string;
  has_children: boolean;
  parent_code?: string | null;
  duty_rate?: string | null;
}

/** Result of GET /api/v1/tnved/lookup/{code}. */
export interface TnvedCodeInfo {
  code: string;
  code_formatted: string;
  name: string;
  /** Intentionally free-form: backend gives no chain for lookup, so often empty. */
  chain: ClassificationChainStep[];
  duty_rate?: string | null;
  /** Откуда ставка пошлины: редакция ЕТТ ЕЭК, временная ставка по примечанию. */
  duty_info?: DutyInfo | null;
  vat_rate?: string | null;
  excise_rate?: string | null;
  unit_primary?: string | null;
  unit_secondary?: string | null;
  ntm_measures?: NtmMeasure[];
  /** Безусловная льгота НДС (уже учтена в vat_rate). */
  vat_exemption?: { type: string; legal_ref: string; note?: string | null } | null;
  /** Условные льготы НДС — только показываются, применяет декларант в позиции. */
  vat_conditional: VatConditional[];
  /** Меры защиты рынка ЕАЭС, совпавшие по коду (и стране, если указана). */
  trade_remedies: TradeRemedy[];
  /** Правило сбора за таможенные операции; null — расчёт сбора отключён. */
  customs_fee?: string | null;
}

/** Источник ставки пошлины на дату (бэкенд tariff.ett.resolve_duty). */
export interface DutyInfo {
  /** ett_base | ett_note | fallback (снимок TWS) */
  source: string;
  version?: string | null;
  base_rate?: string | null;
  note_id?: string | null;
  valid_to?: string | null;
  from_decision?: string | null;
  /** Ставку нельзя применить: код исключён из действующей редакции ЕТТ. */
  issue?: string | null;
}

export interface VatConditional {
  /** Ключ для ShipmentItemIn.vat_benefit. */
  source: string;
  rate: string;
  condition: string;
  legal_ref: string;
  note?: string | null;
  valid_to?: string | null;
}

export type TradeRemedyKind = "antidumping" | "special" | "countervailing" | string;

export interface TradeRemedyRate {
  rate_pct: string;
  country: string | null;
  /** Пусто = единая ставка / «прочие производители». */
  producers: string[];
  variant: string | null;
}

export interface TradeRemedy {
  measure_no: string;
  kind: TradeRemedyKind;
  title: string;
  product_description?: string | null;
  countries: string[];
  rates: TradeRemedyRate[];
  valid_to?: string | null;
  notes?: string | null;
  legal_basis?: string | null;
  source_url?: string | null;
  /** Всегда may_apply: код совпал, подпадание под описание решает человек. */
  status: string;
}

/** GET /api/v1/reference/trade-remedies — запись реестра ЕЭК. */
export interface TradeRemedyRegistryItem extends Omit<TradeRemedy, "status"> {
  /** Коды ТН ВЭД меры: 10 знаков или префиксы позиций ("7210"). */
  codes: string[];
  valid_from?: string | null;
  /** Ставку из текста реестра не удалось разобрать — вводится вручную. */
  needs_review: boolean;
  /** applied — применяется, suspended — временно не применяется. */
  status: "applied" | "suspended" | string;
}

/** GET /api/v1/reference/trade-agreements */
export interface TradeAgreement {
  country: string;
  regime: "fta" | "fta_interim" | string;
  agreement: string;
  status: "in_force" | "signed" | "terminated" | string;
  in_force_from?: string | null;
  origin_proof?: string | null;
  note?: string | null;
  verified: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// NTM — aligned with backend NtmMeasureInfo / NtmVerifiedMeasure
// ────────────────────────────────────────────────────────────────────────────

export type NtmApplyStatus =
  | "applies"
  | "does_not_apply"
  | "uncertain"
  | "may_apply"
  | "informational";

export interface NtmMeasure {
  /** Synthetic id for React keys — we derive it from (kind + name + scope). */
  id: string;
  measure_type: string;
  measure_type_kind: number;
  name: string;
  qualifier?: string | null;
  legal_basis?: string | null;
  note?: string | null;
  scope: string;
  valid_to?: string | null;
  /** For lookup: may_apply | applies | informational. */
  status?: NtmApplyStatus;
}

export interface NtmVerifiedMeasure extends NtmMeasure {
  status: NtmApplyStatus;
  reasoning?: string | null;
}

// ────────────────────────────────────────────────────────────────────────────
// Jobs (async batch)
// ────────────────────────────────────────────────────────────────────────────

export type JobType = "classify_batch" | "ocr" | "ocr_classify" | string;
export type JobStatus =
  | "pending"
  | "running"
  | "completed"
  | "needs_input"
  | "partial"
  | "failed"
  | "cancelled";

export interface JobProgress {
  total: number;
  completed: number;
  failed: number;
  needs_input: number;
  running: number;
  pending: number;
  cancelled?: number;
}

export interface Job {
  job_id: string;
  job_type: JobType;
  status: JobStatus;
  progress: JobProgress;
  parent_ocr_job_id?: string | null;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  error?: string | null;
}

export type JobItemStatus =
  | "pending"
  | "running"
  | "completed"
  | "needs_input"
  | "failed"
  | "cancelled";

export interface JobItem {
  item_id: string;
  position: number;
  status: JobItemStatus;
  product_description: string;
  result?: ClassificationResult | null;
  partial?: PartialResult | null;
  session_id?: string | null;
  source_ref?: Record<string, unknown> | null;
  error?: string | null;
}

export interface BatchItemInput {
  description: string;
  additional_info?: Record<string, string>;
  source_ref?: Record<string, unknown>;
}

export interface BatchRequest {
  items: BatchItemInput[];
  mode?: "auto" | "sync" | "async";
}

// ────────────────────────────────────────────────────────────────────────────
// OCR
// ────────────────────────────────────────────────────────────────────────────

/** UI label for the document type selector. Backend does not persist this. */
export type DocumentType = "invoice" | "customs" | "specification" | "contract" | "unknown";

export type OcrStatus =
  | "pending"
  | "extracting"
  | "structuring"
  | "completed"
  | "failed"
  | "cancelled";

export interface OcrProgress {
  stage: OcrStatus | string;
  stage_index?: number;
  stage_count?: number;
  message?: string;
}

/**
 * UI-facing flat product card. Draft-store works in this shape;
 * the OCR adapter folds `StructuredProduct.product_card` and `source_ref` together.
 */
export interface ProductCard {
  normalized_description: string;
  material?: string | null;
  function?: string | null;
  quantity?: number | null;
  unit?: string | null;
  country_of_origin?: string | null;
  hs_code_hint?: string | null;
  raw_row?: Record<string, unknown> | null;
  skipped?: boolean;
}

export interface OcrJob {
  ocr_job_id: string;
  status: OcrStatus;
  stage?: string | null;
  auto_classify?: boolean;
  progress?: OcrProgress;
  result?: {
    ocr_data: Record<string, unknown>;
    products: ProductCard[];
    skipped_lines?: number[];
  } | null;
  linked_classification_job_id?: string | null;
  error?: string | null;
  created_at: string;
  completed_at?: string | null;
}