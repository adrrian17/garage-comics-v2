import { describe, expect, it } from "vite-plus/test";

import { formatOrderNumber, parseOrderSearch } from "./order-number";

describe(formatOrderNumber, () => {
  it("prefixes the first number with GRG", () => {
    expect(formatOrderNumber(1000)).toBe("GRG-1000");
  });

  it("keeps growing past four digits", () => {
    expect(formatOrderNumber(10_000)).toBe("GRG-10000");
  });
});

describe(parseOrderSearch, () => {
  it("reads an Order Number however the Admin writes it", () => {
    expect(
      ["GRG-1042", "grg 1042", "GRG1042", " 1042 "].map(parseOrderSearch)
    ).toStrictEqual([
      { number: 1042 },
      { number: 1042 },
      { number: 1042 },
      { number: 1042 },
    ]);
  });

  it("reads anything else as an email, without case", () => {
    expect(parseOrderSearch(" Ana@Example.com ")).toStrictEqual({
      email: "ana@example.com",
    });
  });

  it("does not turn a number too long to be exact into another Order", () => {
    expect(parseOrderSearch("99999999999999999999")).toStrictEqual({
      email: "99999999999999999999",
    });
  });

  it("means no filter for an empty box", () => {
    expect(parseOrderSearch("   ")).toBeNull();
  });
});
