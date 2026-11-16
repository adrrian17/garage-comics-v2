import { orderStatuses } from "@garage-comics/db/schema/orders";
import { describe, expect, it } from "vite-plus/test";

import {
  cancellableStatuses,
  orderTotalCentavos,
  payableStatuses,
} from "./order";

describe("the Order state machine", () => {
  it("accepts a payment from pending and from cancelled", () => {
    expect(payableStatuses).toStrictEqual(["pending", "cancelled"]);
  });

  it("accepts a cancellation only from pending", () => {
    expect(cancellableStatuses).toStrictEqual(["pending"]);
  });

  it("never moves a paid Order", () => {
    expect(payableStatuses).not.toContain("paid");
    expect(cancellableStatuses).not.toContain("paid");
  });

  it("only names states the schema has", () => {
    for (const status of [...payableStatuses, ...cancellableStatuses]) {
      expect(orderStatuses).toContain(status);
    }
  });
});

describe(orderTotalCentavos, () => {
  it("adds up the prices of the items", () => {
    expect(
      orderTotalCentavos([{ priceCentavos: 10_000 }, { priceCentavos: 9000 }])
    ).toBe(19_000);
  });

  it("is zero for no items", () => {
    expect(orderTotalCentavos([])).toBe(0);
  });
});
