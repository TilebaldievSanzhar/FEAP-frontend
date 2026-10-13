import { describe, expect, it } from "vitest";

import { applyFieldPatch } from "@/lib/shipment-patch";
import {
  codeSourceOf,
  emptyItem,
  emptyShipment,
  formatHsCode,
  itemConfidence,
  type ShipmentIn,
} from "@/api/dt-types";

function shipmentWithItems(n: number): ShipmentIn {
  const s = emptyShipment();
  s.items = Array.from({ length: n }, (_, i) => ({
    ...emptyItem(),
    description: `item ${i + 1}`,
    price: "100",
  }));
  return s;
}

describe("applyFieldPatch", () => {
  it("patches a header money field", () => {
    const next = applyFieldPatch(shipmentWithItems(1), "freight_to_border", "400.00");
    expect(next.freight_to_border).toBe("400.00");
  });

  it("patches an item field by 0-based index", () => {
    const next = applyFieldPatch(shipmentWithItems(3), "items[1].net_kg", "54.0");
    expect(next.items[1].net_kg).toBe("54.0");
    expect(next.items[0].net_kg).toBeNull();
  });

  it("coerces numeric item fields", () => {
    const next = applyFieldPatch(shipmentWithItems(1), "items[0].packages", "40");
    expect(next.items[0].packages).toBe(40);
  });

  it("patches a party field", () => {
    const next = applyFieldPatch(shipmentWithItems(1), "buyer.inn", "01234567890123");
    expect(next.buyer.inn).toBe("01234567890123");
  });

  it("throws on an out-of-range item index", () => {
    expect(() => applyFieldPatch(shipmentWithItems(1), "items[5].net_kg", "1")).toThrow(
      /Позиция 6/,
    );
  });

  it("throws on an unknown path", () => {
    expect(() => applyFieldPatch(shipmentWithItems(1), "nope_field", "x")).toThrow(
      /Неизвестное поле/,
    );
  });

  it("does not mutate the source model", () => {
    const src = shipmentWithItems(1);
    applyFieldPatch(src, "items[0].net_kg", "54.0");
    expect(src.items[0].net_kg).toBeNull();
  });
});

describe("dt-types helpers", () => {
  it("formats a 10-digit code", () => {
    expect(formatHsCode("8509800000")).toBe("8509 80 000 0");
    expect(formatHsCode("85098")).toBe("85098");
    expect(formatHsCode(null)).toBe("");
  });

  it("derives code source from classification_ref", () => {
    const base = { ...emptyItem(), hs_code: "8509800000" };
    expect(codeSourceOf({ ...base, classification_ref: "job_item:abc" })).toBe("cascade");
    expect(codeSourceOf({ ...base, classification_ref: "catalog:abc" })).toBe("catalog");
    expect(codeSourceOf({ ...base, classification_ref: null })).toBe("manual");
    expect(codeSourceOf({ ...base, hs_code: null })).toBeNull();
  });

  it("reads classify write-back confidence from extra", () => {
    const item = { ...emptyItem(), extra: { classification: { confidence: 0.91 } } };
    expect(itemConfidence(item)).toBe(0.91);
    expect(itemConfidence(emptyItem())).toBeNull();
  });
});
