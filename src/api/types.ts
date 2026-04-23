/**
 * Hand-written stand-in for the FastAPI-generated types.
 * Replace with `npm run api:generate` output once the backend `/openapi.json` is reachable.
 *
 * Shapes are derived from frontend_spec.md, async_architecture.md, ocr_integration.md.
 */

// ────────────────────────────────────────────────────────────────────────────
// Classification — single product
// ────────────────────────────────────────────────────────────────────────────

export type ClassificationStatus = "completed" | "needs_input" | "error";

export interface ClassificationChainStep {
  level: string; // "section" | "group" | "position" | "subposition" | "code_10" | custom
  code: string;
  name?: string;
  reasoning?: string | null;
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
}

export interface PartialResult {
  partial_code: string | null;
  missing_parameters: string[];
  questions: string[];
  classification_chain_so_far: ClassificationChainStep[];
}

export interface ClassifyAdditionalInfoItem {
  key: string;
  value: string;
}

export interface ClassifyRequest {
  description: string;
  additional_info?: Record<string, string>;
}

export interface ClassifyCompleted {
  status: "completed";
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
  level: string;
  has_children: boolean;
  parent_code?: string | null;
}

export interface TnvedCodeInfo {
  code: string;
  code_formatted: string;
  name: string;
  level: string;
  chain: ClassificationChainStep[];
  duty_rate?: number | string | null;
  vat_rate?: number | string | null;
  excise_rate?: number | string | null;
  ntm_measures?: NtmMeasure[];
}

// ────────────────────────────────────────────────────────────────────────────
// NTM
// ────────────────────────────────────────────────────────────────────────────

export interface NtmMeasure {
  id: string;
  code: string;
  type: string;
  title: string;
  description?: string;
  source?: string;
  countries?: string[];
}

export interface NtmVerifiedMeasure extends NtmMeasure {
  status: "applies" | "does_not_apply" | "uncertain";
  reasoning: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Jobs (async batch)
// ────────────────────────────────────────────────────────────────────────────

export type JobType = "classify_batch" | "ocr" | "ocr_classify";
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

export type DocumentType = "invoice" | "customs" | "specification" | "contract" | "unknown";

export type OcrStatus =
  | "pending"
  | "uploading"
  | "ocr_processing"
  | "extracting"
  | "completed"
  | "failed"
  | "cancelled";

export interface OcrProgress {
  stage: OcrStatus | string;
  stage_index?: number;
  stage_count?: number;
  message?: string;
}

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
  document_type?: DocumentType;
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
