import { describe, expect, it } from "vitest";
import type { TradeRemedy } from "@/api/types";
import {
  formatIsoDate,
  formatPct,
  hsSection,
  parseRemedyMissing,
  previewRemedyRate,
  producerMatches,
  remedyProducers,
  remedyRateSummary,
  splitFeeRule,
  sumMoney,
} from "@/lib/tariff";

const AD32: TradeRemedy = {
  measure_no: "AD-32",
  kind: "antidumping",
  title: "Алюминиевая посуда",
  countries: ["CN"],
  rates: [{ rate_pct: "21.89", country: null, producers: [], variant: null }],
  valid_to: "2027-05-28",
  status: "may_apply",
};

const AD27: TradeRemedy = {
  measure_no: "AD-27",
  kind: "antidumping",
  title: "Гусеничные бульдозеры",
  countries: ["CN"],
  rates: [
    { rate_pct: "11.31", country: "CN", producers: ["Shantui Construction Machinery Co., Ltd."], variant: null },
    { rate_pct: "34.31", country: "CN", producers: [], variant: null },
  ],
  status: "may_apply",
};

describe("sumMoney", () => {
  it("adds decimal strings exactly", () => {
    // 78750.00 + 191537.50 + 114450.00 + 3500.00 — the v3 spec example
    expect(sumMoney(["78750.00", "191537.50", "114450.00", "3500.00"])).toBe("388237.50");
  });

  it("does not drift like floats", () => {
    expect(sumMoney(["0.10", "0.20"])).toBe("0.30");
  });

  it("skips null and garbage", () => {
    expect(sumMoney([null, undefined, "abc", "5.5"])).toBe("5.50");
    expect(sumMoney([])).toBe("0.00");
  });
});

describe("remedy rates", () => {
  it("formats a single rate with a decimal comma", () => {
    expect(remedyRateSummary(AD32, "CN")).toBe("21,89%");
    expect(formatPct("21.89")).toBe("21,89%");
  });

  it("summarizes producer rates as a range", () => {
    expect(remedyRateSummary(AD27, "CN")).toBe("11,31–34,31%");
    expect(remedyProducers(AD27, "CN")).toEqual(["Shantui Construction Machinery Co., Ltd."]);
  });

  it("previews the producer rate, falling back to «прочие»", () => {
    expect(previewRemedyRate(AD27, { origin: "CN", manufacturer: "SHANTUI Construction Machinery" })?.rate_pct).toBe("11.31");
    expect(previewRemedyRate(AD27, { origin: "CN", manufacturer: "Zoomlion" })?.rate_pct).toBe("34.31");
  });

  // The cases below mirror backend tests/tariff/test_remedies.py::select_rate.
  it("needs a variant when rates differ by product kind", () => {
    const m: TradeRemedy = {
      ...AD32,
      rates: [
        { rate_pct: "18.9", country: null, producers: [], variant: "обсадных труб" },
        { rate_pct: "37.8", country: null, producers: [], variant: "нефтепроводных труб" },
      ],
    };
    expect(previewRemedyRate(m, { origin: "UA" })).toBeNull();
    expect(previewRemedyRate(m, { origin: "UA", variant: "нефтепроводных" })?.rate_pct).toBe("37.8");
  });

  it("gives no rate for an unmatched producer when the measure has only individual rates", () => {
    const m: TradeRemedy = {
      ...AD32,
      rates: [{ rate_pct: "10", country: null, producers: ["Acme Steel Co., Ltd."], variant: null }],
    };
    expect(previewRemedyRate(m, { origin: "CN", manufacturer: "Unknown Works" })).toBeNull();
    expect(previewRemedyRate(m, { origin: "CN", manufacturer: "Acme" })).toBeNull(); // fragment too short
    expect(previewRemedyRate(m, { origin: "CN", manufacturer: "Acme Steel Limited" })?.rate_pct).toBe("10");
  });

  it("picks the country row and applies «EU» rates only to EU states", () => {
    const m: TradeRemedy = {
      ...AD32,
      countries: ["AZ", "CN", "EU"],
      rates: [
        { rate_pct: "16.18", country: "AZ", producers: [], variant: null },
        { rate_pct: "13.14", country: "CN", producers: [], variant: null },
        { rate_pct: "30", country: "EU", producers: [], variant: null },
      ],
    };
    expect(previewRemedyRate(m, { origin: "AZ" })?.rate_pct).toBe("16.18");
    expect(previewRemedyRate(m, { origin: "CN" })?.rate_pct).toBe("13.14");
    expect(previewRemedyRate(m, { origin: "DE" })?.rate_pct).toBe("30");
    expect(remedyRateSummary(m, "CN")).toBe("13,14%");
  });

  it("matches producers loosely but not on short fragments", () => {
    expect(producerMatches("Shantui Construction Machinery Co., Ltd.", "Shantui Construction Machinery")).toBe(true);
    expect(producerMatches("Co", "Shantui Construction Machinery")).toBe(false);
    expect(producerMatches(null, "Shantui")).toBe(false);
  });
});

describe("parseRemedyMissing", () => {
  it("extracts position and measure from the backend needs_input line", () => {
    const line =
      "Товар 1 (7615101000): антидемпинговая мера AD-32 «Алюминиевая посуда» (CN) совпадает по коду — " +
      "подтвердите, подпадает ли товар под описание меры (remedy_decisions['AD-32']: applies / not_applicable / exempt)";
    expect(parseRemedyMissing(line)).toEqual({ position: 1, measureNo: "AD-32" });
  });

  it("ignores other missing parameters", () => {
    expect(parseRemedyMissing("курс USD НБКР на 2026-10-13 (графа 46)")).toBeNull();
  });
});

describe("splitFeeRule", () => {
  it("splits the backend fee rule into value, note and legal ref", () => {
    const rule =
      "0.4% от таможенной стоимости ДТ, не менее 500 сом и не более 250000 сом — ПП КР № 79 от 13.02.2020, п. 38";
    expect(splitFeeRule(rule)).toEqual({
      value: "0,4%",
      note: "от таможенной стоимости ДТ, не менее 500 сом и не более 250000 сом",
      legal: "ПП КР № 79 от 13.02.2020, п. 38",
    });
  });
});

describe("misc", () => {
  it("derives the HS section from the group", () => {
    expect(hsSection("7615101000")).toBe("XV");
    expect(hsSection("0804100000")).toBe("II");
    expect(hsSection("8429110000")).toBe("XVI");
  });

  it("formats ISO dates", () => {
    expect(formatIsoDate("2027-05-28")).toBe("28.05.2027");
    expect(formatIsoDate(null)).toBe("");
  });
});
