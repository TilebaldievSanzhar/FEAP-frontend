import { beforeEach, describe, expect, it } from "vitest";
import { computeDraftDiff, useDraftStore } from "@/stores/draft";
import type { ProductCard } from "@/api/types";

const OCR_ID = "ocr_test";

function sampleProducts(): ProductCard[] {
  return [
    { normalized_description: "Электрическая зубная щётка", country_of_origin: "КНР" },
    { normalized_description: "Кофемолка керамическая", material: "керамика" },
    { normalized_description: "Хлопковая ткань" },
  ];
}

describe("useDraftStore", () => {
  beforeEach(() => {
    useDraftStore.getState().clearDraft(OCR_ID);
    localStorage.clear();
  });

  it("initialises baseline and current from OCR products", () => {
    const items = useDraftStore.getState().initDraft(OCR_ID, sampleProducts());
    expect(items).toHaveLength(3);
    expect(items[0].local_id).toBeTruthy();

    const draft = useDraftStore.getState().byOcrJob[OCR_ID];
    expect(draft?.baseline).toHaveLength(3);
    expect(draft?.current).toHaveLength(3);
  });

  it("does not re-init when a draft already exists", () => {
    const first = useDraftStore.getState().initDraft(OCR_ID, sampleProducts());
    useDraftStore.getState().updateProduct(OCR_ID, first[0].local_id, {
      normalized_description: "edited",
    });
    const second = useDraftStore.getState().initDraft(OCR_ID, sampleProducts());
    expect(second[0].normalized_description).toBe("edited");
  });

  it("tracks changed/removed/added in diff", () => {
    const items = useDraftStore.getState().initDraft(OCR_ID, sampleProducts());
    useDraftStore.getState().updateProduct(OCR_ID, items[0].local_id, {
      material: "синтетика",
    });
    useDraftStore.getState().removeProduct(OCR_ID, items[1].local_id);
    useDraftStore.getState().duplicateProduct(OCR_ID, items[2].local_id);

    const diff = computeDraftDiff(useDraftStore.getState().byOcrJob[OCR_ID]);
    expect(diff.changed).toBe(1);
    expect(diff.removed).toBe(1);
    expect(diff.added).toBe(1);
  });

  it("bulk-applies country only to non-skipped items", () => {
    const items = useDraftStore.getState().initDraft(OCR_ID, sampleProducts());
    useDraftStore.getState().toggleSkip(OCR_ID, items[1].local_id);
    useDraftStore.getState().applyCountryBulk(OCR_ID, "Турция");

    const current = useDraftStore.getState().byOcrJob[OCR_ID]!.current;
    expect(current[0].country_of_origin).toBe("Турция");
    expect(current[1].country_of_origin).toBeUndefined(); // skipped row left as-is
    expect(current[2].country_of_origin).toBe("Турция");
  });

  it("resetDraft reverts current to baseline", () => {
    const items = useDraftStore.getState().initDraft(OCR_ID, sampleProducts());
    useDraftStore.getState().updateProduct(OCR_ID, items[0].local_id, {
      normalized_description: "edited",
    });
    useDraftStore.getState().resetDraft(OCR_ID);

    const current = useDraftStore.getState().byOcrJob[OCR_ID]!.current;
    expect(current[0].normalized_description).toBe("Электрическая зубная щётка");
  });
});
