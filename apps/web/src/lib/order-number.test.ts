import { describe, expect, it } from "vite-plus/test";

import { formatOrderNumber } from "./order-number";

describe(formatOrderNumber, () => {
  it("prefixes the first number with GRG", () => {
    expect(formatOrderNumber(1000)).toBe("GRG-1000");
  });

  it("keeps growing past four digits", () => {
    expect(formatOrderNumber(10_000)).toBe("GRG-10000");
  });
});
