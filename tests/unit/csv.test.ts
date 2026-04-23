import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/csv";

describe("toCsv", () => {
  it("emits header and rows in declared column order", () => {
    const csv = toCsv(
      [
        { a: 1, b: "x" },
        { a: 2, b: "y" },
      ],
      ["a", "b"],
    );
    expect(csv).toBe("a,b\r\n1,x\r\n2,y");
  });

  it("quotes cells containing commas, quotes and newlines", () => {
    const csv = toCsv(
      [{ text: 'hello, "world"\nline2' }],
      ["text"],
    );
    expect(csv).toBe('text\r\n"hello, ""world""\nline2"');
  });

  it("emits empty string for null / undefined / missing columns", () => {
    const csv = toCsv([{ a: null, b: undefined }], ["a", "b", "c"]);
    expect(csv).toBe("a,b,c\r\n,,");
  });
});
