import { describe, expect, it } from "vitest";

import { formatBishkek, fxFromMeta, type FxQuote } from "@/api/refdata";

const usd: FxQuote = { currency: "USD", day: "2026-10-16", rate: "87.45", source: "nbkr_daily" };
const eur: FxQuote = { currency: "EUR", day: "2026-10-16", rate: "98.08", source: "nbkr_daily" };

describe("formatBishkek", () => {
  it("shows the moment in Bishkek time (UTC+6), whatever the browser zone", () => {
    expect(formatBishkek("2026-10-15T09:59:04Z")).toBe("15.10 15:59");
    expect(formatBishkek("2026-10-15T19:30:00+00:00", true)).toBe("16.10.2026 01:30");
  });

  it("is a dash for empty or broken input", () => {
    expect(formatBishkek(null)).toBe("—");
    expect(formatBishkek("not a date")).toBe("—");
  });
});

describe("fxFromMeta", () => {
  it("keeps the requested currency order and skips missing ones", () => {
    expect(fxFromMeta({ USD: usd, EUR: eur }, ["eur", "USD", "CNY", "USD"])).toEqual([eur, usd]);
    expect(fxFromMeta(undefined, ["USD"])).toEqual([]);
  });
});
