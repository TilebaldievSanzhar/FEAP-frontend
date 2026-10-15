import { describe, expect, it } from "vitest";
import { cleanDecimal, emptyLot, hasLotPrice, lotFromParams, lotToParams, toCalcIn } from "@/components/calc/lot";
import { formatDecimal, formatMoney, productTitle } from "@/lib/tariff";

describe("formatMoney / formatDecimal", () => {
  it("groups digits without touching floats", () => {
    expect(formatMoney("1321240.65")).toBe("1 321 240,65");
    expect(formatMoney("500")).toBe("500,00");
    expect(formatMoney("0.5")).toBe("0,50");
    expect(formatMoney(null)).toBe("—");
    expect(formatMoney("abc")).toBe("abc");
  });

  it("trims trailing zeros of rates", () => {
    expect(formatDecimal("87.450000")).toBe("87,45");
    expect(formatDecimal("10.000")).toBe("10");
    expect(formatDecimal("13.0658")).toBe("13,0658");
    expect(formatDecimal("100")).toBe("100");
  });
});

describe("lot ⇄ CalcIn", () => {
  it("cleans typed decimals", () => {
    expect(cleanDecimal("12,5 $")).toBe("12.5");
    expect(cleanDecimal("1.2.3")).toBe("1.23");
  });

  it("needs a lot value or unit price with qty", () => {
    expect(hasLotPrice(emptyLot())).toBe(false);
    expect(hasLotPrice(emptyLot({ price: "10000" }))).toBe(true);
    expect(hasLotPrice(emptyLot({ priceMode: "unit", unitPrice: "38.5" }))).toBe(false);
    expect(hasLotPrice(emptyLot({ priceMode: "unit", unitPrice: "38.5", qty: "100" }))).toBe(true);
    expect(hasLotPrice(emptyLot({ price: "0" }))).toBe(false);
  });

  it("sends unit price and qty instead of multiplying on the client", () => {
    const body = toCalcIn(
      emptyLot({ priceMode: "unit", unitPrice: "38.50", qty: "100", currency: "CNY", incoterms: "EXW" }),
      { code: "7615101000", origin: "CN" },
    );
    expect(body).toMatchObject({ hs_code: "7615101000", unit_price: "38.50", qty: "100", price: null, origin_country: "CN" });
  });

  it("drops empty costs and keeps decisions", () => {
    const params = lotToParams(
      emptyLot({
        price: "10000",
        costs: [{ kind: "broker", amount: "15000", currency: "KGS" }, { kind: "other", amount: "", currency: "KGS" }],
        remedyDecisions: { "AD-32": { decision: "applies" } },
      }),
      "CN",
    );
    expect(params.costs).toHaveLength(1);
    expect(params.remedy_decisions).toEqual({ "AD-32": { decision: "applies" } });
    expect(params.freight_to_border).toBe("0");
  });

  it("restores a saved passport", () => {
    const lot = lotFromParams({ unit_price: "38.50", qty: "100", currency: "CNY", incoterms: "EXW", freight_to_border: "0" });
    expect(lot.priceMode).toBe("unit");
    expect(lot.freightToBorder).toBe("");
    expect(lotFromParams({ price: "10000", currency: "USD", incoterms: "DAP" }).priceMode).toBe("lot");
  });
});

describe("productTitle", () => {
  it("takes the first sentence and cuts long ones at a word", () => {
    expect(productTitle("Бытовая кастрюля из литого алюминия. Объём 4,5 л.")).toBe("Бытовая кастрюля из литого алюминия");
    const long = "Кастрюля " + "очень ".repeat(40) + "большая";
    const title = productTitle(long, 60)!;
    expect(title.length).toBeLessThanOrEqual(61);
    expect(title.endsWith("…")).toBe(true);
    expect(productTitle("  ")).toBeNull();
  });
});
