import { describe, expect, it } from "vitest";
import {
  adaptClassifyResponse,
  adaptCodeLookup,
  adaptJob,
  adaptJobItem,
  adaptNtmMeasure,
  adaptNtmVerified,
  adaptOcrJob,
  adaptStructuredProduct,
  adaptTreeNode,
  chainFromBackend,
  chainFromEntries,
  levelFromNumber,
} from "@/api/adapters";
import type { components } from "@/api/types.generated";

type Schemas = components["schemas"];

function entry(level: number, code: string, name = `node-${code}`): Schemas["DecisionChainEntry"] {
  return { level, code, name, reasoning: "because", rules_applied: [], confidence: 0.9 };
}

describe("levelFromNumber", () => {
  it("maps 1..5 to canonical level tags", () => {
    expect(levelFromNumber(1)).toBe("section");
    expect(levelFromNumber(2)).toBe("group");
    expect(levelFromNumber(3)).toBe("position");
    expect(levelFromNumber(4)).toBe("subposition");
    expect(levelFromNumber(5)).toBe("code_10");
  });

  it("returns null for out-of-range levels", () => {
    expect(levelFromNumber(0)).toBeNull();
    expect(levelFromNumber(6)).toBeNull();
  });
});

describe("chainFromBackend", () => {
  it("flattens the five slots into an ordered array", () => {
    const chain: Schemas["ClassificationChain"] = {
      section: entry(1, "XVI"),
      group: entry(2, "85"),
      position: entry(3, "8509"),
      subposition: entry(4, "850980"),
      code_10: entry(5, "8509800000"),
    };
    const out = chainFromBackend(chain);
    expect(out.map((s) => s.code)).toEqual(["XVI", "85", "8509", "850980", "8509800000"]);
    expect(out[0].level).toBe("section");
    expect(out[4].level).toBe("code_10");
  });
});

describe("chainFromEntries", () => {
  it("maps numeric-level DecisionChainEntries to UI steps", () => {
    const out = chainFromEntries([entry(1, "XVI"), entry(3, "8509")]);
    expect(out).toHaveLength(2);
    expect(out[1].level).toBe("position");
  });

  it("returns [] for undefined/empty", () => {
    expect(chainFromEntries(undefined)).toEqual([]);
    expect(chainFromEntries([])).toEqual([]);
  });
});

describe("adaptClassifyResponse", () => {
  it("turns completed payload into the discriminated union", () => {
    const raw: Schemas["ClassifyResponse"] = {
      session_id: "s-1",
      status: "completed",
      result: {
        final_code: "8509800000",
        code_formatted: "8509 80 000 0",
        code_description: "Appliances",
        classification_chain: {
          section: entry(1, "XVI"),
          group: entry(2, "85"),
          position: entry(3, "8509"),
          subposition: entry(4, "850980"),
          code_10: entry(5, "8509800000"),
        },
        confidence: 0.88,
        precedent_match: false,
        requires_human_review: false,
      },
    };
    const out = adaptClassifyResponse(raw);
    expect(out.status).toBe("completed");
    if (out.status === "completed") {
      expect(out.result.final_code).toBe("8509800000");
      expect(out.result.classification_chain).toHaveLength(5);
      expect(out.session_id).toBe("s-1");
    }
  });

  it("falls back to partial.question when questions is absent", () => {
    const raw: Schemas["ClassifyResponse"] = {
      session_id: "s-2",
      status: "needs_input",
      partial: {
        partial_code: "8509",
        determined_to_level: 3,
        missing_parameters: ["мощность"],
        question: "Укажите мощность",
      },
    };
    const out = adaptClassifyResponse(raw);
    expect(out.status).toBe("needs_input");
    if (out.status === "needs_input") {
      expect(out.partial.questions).toEqual(["Укажите мощность"]);
      expect(out.answers_limit).toBe(3);
    }
  });

  it("returns error shape when status=error", () => {
    const raw: Schemas["ClassifyResponse"] = {
      session_id: "s-3",
      status: "error",
      error: "nope",
    };
    const out = adaptClassifyResponse(raw);
    expect(out.status).toBe("error");
    if (out.status === "error") expect(out.error).toBe("nope");
  });
});

describe("adaptTreeNode & adaptCodeLookup", () => {
  it("derives has_children from children_count and tags the level", () => {
    const out = adaptTreeNode({
      code: "85",
      code_formatted: "85",
      level: 2,
      name: "Group 85",
      duty_rate: null,
      children_count: 12,
    });
    expect(out.has_children).toBe(true);
    expect(out.level).toBe("group");
  });

  it("flattens vat/excise/ntm into UI-friendly fields", () => {
    const out = adaptCodeLookup({
      code: "8509800000",
      code_formatted: "8509 80 000 0",
      name: "Dishwashers",
      duty_rate: "10%",
      vat: { rate: "12%" },
      excise: { applicable: true, rate: "300" },
      ntm: {
        measures: [
          {
            measure_type: "Технический регламент",
            measure_type_kind: 1,
            name: "ТР ТС 004/2011",
            status: "applies",
            scope: "eaeu",
          },
        ],
        total_count: 1,
        has_prohibitions: false,
        has_licensing: false,
        has_technical_regulations: true,
        has_sanitary_control: false,
        has_veterinary_control: false,
        has_phytosanitary_control: false,
        has_marking: false,
      },
    });
    expect(out.vat_rate).toBe("12%");
    expect(out.excise_rate).toBe("300");
    expect(out.ntm_measures).toHaveLength(1);
    expect(out.ntm_measures?.[0].status).toBe("applies");
  });
});

describe("adaptNtm* helpers", () => {
  it("produces stable id and defaults status to may_apply", () => {
    const m = adaptNtmMeasure(
      {
        measure_type: "Лицензирование",
        measure_type_kind: 2,
        name: "Licensing of X",
        status: "may_apply",
        scope: "eaeu",
      },
      4,
    );
    expect(m.id).toContain("2-eaeu-4-");
    expect(m.status).toBe("may_apply");
  });

  it("verified variant preserves reasoning", () => {
    const m = adaptNtmVerified(
      {
        measure_type: "Санитарный контроль",
        measure_type_kind: 3,
        name: "Sanitary",
        status: "does_not_apply",
        scope: "national",
        reasoning: "Not food.",
      },
      0,
    );
    expect(m.reasoning).toBe("Not food.");
    expect(m.scope).toBe("national");
  });
});

describe("adaptStructuredProduct & adaptOcrJob", () => {
  it("merges product_card and source_ref into a flat UI product", () => {
    const sp = adaptStructuredProduct({
      product_card: {
        original_description: "orig",
        product_identification: "",
        classification_relevant_features: "",
        normalized_description: "Электрощётка",
        material: "пластик",
        function: "чистка зубов",
        is_set: false,
        is_disassembled: false,
        has_electric_motor: true,
      },
      source_ref: {
        quantity: 3,
        unit: "шт",
        hs_code_hint: "8509",
        country_of_origin: "КНР",
      },
    });
    expect(sp.normalized_description).toBe("Электрощётка");
    expect(sp.quantity).toBe(3);
    expect(sp.unit).toBe("шт");
    expect(sp.hs_code_hint).toBe("8509");
    expect(sp.country_of_origin).toBe("КНР");
  });

  it("gives completed jobs a populated result, pending jobs none", () => {
    const done = adaptOcrJob({
      ocr_job_id: "ocr-1",
      status: "completed",
      auto_classify: false,
      extraction: [],
      products: [],
      created_at: "2026-04-24T00:00:00Z",
      expires_at: "2026-04-25T00:00:00Z",
    });
    expect(done.result).toBeTruthy();
    expect(done.progress?.stage_index).toBe(4);

    const waiting = adaptOcrJob({
      ocr_job_id: "ocr-2",
      status: "extracting",
      auto_classify: false,
      created_at: "2026-04-24T00:00:00Z",
      expires_at: "2026-04-25T00:00:00Z",
    });
    expect(waiting.result).toBeNull();
    expect(waiting.progress?.stage_index).toBe(2);
  });
});

describe("adaptJob & adaptJobItem", () => {
  it("copies counters across and preserves job_type verbatim", () => {
    const job = adaptJob({
      job_id: "j-1",
      job_type: "classify_batch",
      status: "running",
      progress: {
        total: 10,
        pending: 2,
        running: 3,
        completed: 4,
        failed: 1,
        needs_input: 0,
        cancelled: 0,
      },
      created_at: "2026-04-24T00:00:00Z",
      expires_at: "2026-04-25T00:00:00Z",
    });
    expect(job.status).toBe("running");
    expect(job.progress.completed).toBe(4);
    expect(job.progress.cancelled).toBe(0);
  });

  it("adapts job item result when present", () => {
    const item = adaptJobItem({
      item_id: "i-1",
      position: 0,
      status: "completed",
      product_description: "desc",
      result: {
        final_code: "0000000000",
        code_formatted: "0000",
        code_description: "x",
        classification_chain: {
          section: entry(1, "I"),
          group: entry(2, "00"),
          position: entry(3, "0000"),
          subposition: entry(4, "000000"),
          code_10: entry(5, "0000000000"),
        },
        confidence: 0.5,
        precedent_match: false,
        requires_human_review: false,
      },
    });
    expect(item.result?.classification_chain).toHaveLength(5);
    expect(item.partial).toBeNull();
  });
});
