import { describe, expect, it } from "vitest";
import { formatBytes, formatCode, formatRate } from "@/lib/format";

describe("formatCode", () => {
  it("groups digits of a 10-digit TN VED code", () => {
    expect(formatCode("8509800000")).toBe("8509 80 00 00");
  });

  it("strips non-digits", () => {
    expect(formatCode("85 09 80-00-00")).toBe("8509 80 00 00");
  });

  it("handles short codes", () => {
    expect(formatCode("8509")).toBe("8509");
    expect(formatCode("85")).toBe("85");
  });

  it("returns empty string for nullish input", () => {
    expect(formatCode(null)).toBe("");
    expect(formatCode(undefined)).toBe("");
  });
});

describe("formatRate", () => {
  it("formats numbers as percent", () => {
    expect(formatRate(15)).toBe("15%");
  });
  it("passes through strings", () => {
    expect(formatRate("5 евро/кг")).toBe("5 евро/кг");
  });
  it("renders em-dash for missing", () => {
    expect(formatRate(null)).toBe("—");
  });
});

describe("formatBytes", () => {
  it("returns bytes for small values", () => {
    expect(formatBytes(512)).toBe("512 Б");
  });
  it("scales to KB/MB", () => {
    expect(formatBytes(2048)).toBe("2.0 КБ");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 МБ");
  });
});
