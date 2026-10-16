/**
 * Boundary adapters between `types.generated.ts` (live FastAPI shapes) and
 * `types.ts` (normalized UI model). Keep all wire-shape knowledge here so the
 * rest of the frontend can ignore openapi regenerations.
 */

import type { components } from "./types.generated";
import type {
  ClassifyResponse,
  ClassificationChainStep,
  ClassificationResult,
  Job,
  JobItem,
  NtmMeasure,
  NtmVerifiedMeasure,
  OcrJob,
  PartialResult,
  ProductCard,
  TnvedCodeInfo,
  TnvedNode,
} from "./types";

type Schemas = components["schemas"];

// ── Classification chain ────────────────────────────────────────────────────

const LEVEL_NAMES = ["section", "group", "position", "subposition", "code_10"] as const;

export function entryToStep(
  entry: Schemas["DecisionChainEntry"] | undefined,
  fallbackLevel: string,
): ClassificationChainStep | null {
  if (!entry) return null;
  return {
    level: levelFromNumber(entry.level) ?? fallbackLevel,
    code: entry.code,
    name: entry.name,
    reasoning: entry.reasoning,
    confidence: entry.confidence,
  };
}

export function levelFromNumber(level: number): string | null {
  if (level >= 1 && level <= LEVEL_NAMES.length) return LEVEL_NAMES[level - 1];
  return null;
}

export function chainFromBackend(
  chain: Schemas["ClassificationChain"] | undefined,
): ClassificationChainStep[] {
  if (!chain) return [];
  const steps: ClassificationChainStep[] = [];
  const pairs: Array<[keyof Schemas["ClassificationChain"], string]> = [
    ["section", "section"],
    ["group", "group"],
    ["position", "position"],
    ["subposition", "subposition"],
    ["code_10", "code_10"],
  ];
  for (const [key, label] of pairs) {
    const step = entryToStep(chain[key], label);
    if (step) steps.push(step);
  }
  return steps;
}

export function chainFromEntries(
  entries: Schemas["DecisionChainEntry"][] | undefined,
): ClassificationChainStep[] {
  if (!entries?.length) return [];
  return entries
    .map((e) => entryToStep(e, levelFromNumber(e.level) ?? "step"))
    .filter((s): s is ClassificationChainStep => s !== null);
}

// ── Single classify response ────────────────────────────────────────────────

export function adaptClassifyResponse(raw: Schemas["ClassifyResponse"]): ClassifyResponse {
  if (raw.status === "completed" && raw.result) {
    return {
      status: "completed",
      session_id: raw.session_id,
      result: adaptClassificationResult(raw.result),
    };
  }
  if (raw.status === "needs_input" && raw.partial) {
    return {
      status: "needs_input",
      session_id: raw.session_id,
      partial: adaptPartial(raw.partial),
      // The backend does not (yet) expose answer counters — default to "first attempt".
      answers_used: 0,
      answers_limit: 3,
    };
  }
  return {
    status: "error",
    error: raw.error ?? "unknown",
  };
}

function adaptClassificationResult(r: Schemas["ClassificationResult"]): ClassificationResult {
  return {
    final_code: r.final_code,
    code_formatted: r.code_formatted,
    code_description: r.code_description,
    classification_chain: chainFromBackend(r.classification_chain),
    duty_rate: r.duty_rate,
    vat_rate: r.vat_rate,
    confidence: r.confidence,
    risk_flags: r.risk_flags ?? [],
    requires_human_review: r.requires_human_review,
    opi_applied: r.opi_applied ?? [],
    precedent_match: r.precedent_match,
    precedent_codes: r.precedent_codes,
  };
}

function adaptPartial(p: Schemas["PartialResult"]): PartialResult {
  const questions = p.questions?.length ? p.questions : p.question ? [p.question] : [];
  return {
    partial_code: p.partial_code,
    missing_parameters: p.missing_parameters ?? [],
    questions,
    classification_chain_so_far: chainFromEntries(p.classification_chain_so_far),
  };
}

// ── TNVED ───────────────────────────────────────────────────────────────────

export function adaptTreeNode(n: Schemas["TnvedNodeResponse"]): TnvedNode {
  return {
    code: n.code,
    code_formatted: n.code_formatted ?? undefined,
    name: n.name,
    level: levelFromNumber(n.level) ?? String(n.level),
    has_children: (n.children_count ?? 0) > 0,
    duty_rate: n.duty_rate,
  };
}

export function adaptCodeLookup(r: Schemas["CodeLookupResponse"]): TnvedCodeInfo {
  return {
    code: r.code,
    code_formatted: r.code_formatted,
    name: r.name,
    chain: [],
    duty_rate: r.duty_rate,
    duty_info: r.duty_info ?? null,
    vat_rate: r.vat?.rate ?? null,
    excise_rate: r.excise?.applicable ? (r.excise.rate ?? null) : null,
    unit_primary: r.unit_primary,
    unit_secondary: r.unit_secondary,
    ntm_measures: r.ntm?.measures?.map(adaptNtmMeasure),
    vat_exemption: r.vat?.exemption
      ? {
          type: r.vat.exemption.type,
          legal_ref: r.vat.exemption.legal_ref,
          note: r.vat.exemption.note ?? null,
        }
      : null,
    vat_conditional: (r.vat?.conditional ?? []).map((c) => ({
      source: c.source,
      rate: c.rate,
      condition: c.condition,
      legal_ref: c.legal_ref,
      note: c.note ?? null,
      valid_to: c.valid_to ?? null,
    })),
    trade_remedies: (r.trade_remedies ?? []).map((m) => ({
      measure_no: m.measure_no,
      kind: m.kind,
      title: m.title,
      product_description: m.product_description ?? null,
      countries: m.countries,
      rates: m.rates.map((x) => ({
        rate_pct: x.rate_pct,
        country: x.country ?? null,
        producers: x.producers ?? [],
        variant: x.variant ?? null,
      })),
      valid_to: m.valid_to ?? null,
      notes: m.notes ?? null,
      legal_basis: m.legal_basis ?? null,
      source_url: m.source_url ?? null,
      status: m.status ?? "may_apply",
    })),
    customs_fee: r.customs_fee ?? null,
  };
}

// ── NTM ─────────────────────────────────────────────────────────────────────

function measureId(
  m: Pick<Schemas["NtmMeasureInfo"], "measure_type_kind" | "name" | "scope">,
  idx: number,
): string {
  return `${m.measure_type_kind}-${m.scope}-${idx}-${m.name.slice(0, 32)}`;
}

export function adaptNtmMeasure(m: Schemas["NtmMeasureInfo"], idx = 0): NtmMeasure {
  return {
    id: measureId(m, idx),
    measure_type: m.measure_type,
    measure_type_kind: m.measure_type_kind,
    name: m.name,
    qualifier: m.qualifier,
    legal_basis: m.legal_basis,
    note: m.note,
    scope: m.scope,
    valid_to: m.valid_to,
    status: (m.status as NtmMeasure["status"]) ?? "may_apply",
  };
}

export function adaptNtmVerified(
  m: Schemas["NtmVerifiedMeasure"],
  idx = 0,
): NtmVerifiedMeasure {
  return {
    id: measureId(m, idx),
    measure_type: m.measure_type,
    measure_type_kind: m.measure_type_kind,
    name: m.name,
    qualifier: m.qualifier,
    legal_basis: m.legal_basis,
    note: m.note,
    scope: m.scope,
    valid_to: m.valid_to,
    status: (m.status as NtmVerifiedMeasure["status"]) ?? "uncertain",
    reasoning: m.reasoning,
  };
}

// ── OCR ─────────────────────────────────────────────────────────────────────

type StructuredProduct = Schemas["StructuredProduct"];

export function adaptStructuredProduct(sp: StructuredProduct): ProductCard {
  const pc = sp.product_card;
  const src = (sp.source_ref ?? {}) as Record<string, unknown>;
  const quantity = typeof src.quantity === "number" ? src.quantity : null;
  const unit = typeof src.unit === "string" ? src.unit : null;
  const hsHint = typeof src.hs_code_hint === "string" ? src.hs_code_hint : null;
  const country = typeof src.country_of_origin === "string" ? src.country_of_origin : null;

  return {
    normalized_description: pc.normalized_description || pc.original_description || "",
    material: pc.material ?? null,
    function: pc.function ?? null,
    quantity,
    unit,
    country_of_origin: country,
    hs_code_hint: hsHint,
    raw_row: sp.source_ref ? (sp.source_ref as Record<string, unknown>) : null,
  };
}

export function adaptOcrJob(r: Schemas["OcrJobResponse"]): OcrJob {
  const products = (r.products ?? []).map(adaptStructuredProduct);
  const stageCount = 4;
  const stageIndex = stageIndexFor(r.status);
  return {
    ocr_job_id: r.ocr_job_id,
    status: r.status,
    stage: r.stage,
    auto_classify: r.auto_classify,
    progress: {
      stage: r.status,
      stage_index: stageIndex,
      stage_count: stageCount,
      message: r.stage ?? undefined,
    },
    result: r.status === "completed"
      ? {
          ocr_data: { extraction: r.extraction ?? [] },
          products,
          skipped_lines: [],
        }
      : null,
    linked_classification_job_id: r.linked_classification_job_id,
    error: r.error,
    created_at: r.created_at,
    completed_at: r.completed_at,
  };
}

function stageIndexFor(status: Schemas["OcrJobResponse"]["status"]): number {
  switch (status) {
    case "pending":
      return 1;
    case "extracting":
      return 2;
    case "structuring":
      return 3;
    case "completed":
      return 4;
    case "failed":
    case "cancelled":
      return 4;
  }
}

// ── Jobs ────────────────────────────────────────────────────────────────────

export function adaptJob(r: Schemas["JobResponse"]): Job {
  return {
    job_id: r.job_id,
    job_type: r.job_type,
    status: r.status,
    progress: {
      total: r.progress.total,
      completed: r.progress.completed,
      failed: r.progress.failed,
      needs_input: r.progress.needs_input,
      running: r.progress.running,
      pending: r.progress.pending,
      cancelled: r.progress.cancelled,
    },
    parent_ocr_job_id: r.parent_ocr_job_id,
    created_at: r.created_at,
    started_at: r.started_at,
    completed_at: r.completed_at,
    error: r.error,
  };
}

export function adaptJobItem(r: Schemas["JobItemResponse"]): JobItem {
  return {
    item_id: r.item_id,
    position: r.position,
    status: r.status,
    product_description: r.product_description,
    result: r.result ? adaptClassificationResult(r.result) : null,
    partial: r.partial ? adaptPartial(r.partial) : null,
    session_id: r.session_id,
    source_ref: r.source_ref,
    error: r.error,
  };
}