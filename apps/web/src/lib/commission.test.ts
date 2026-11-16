import { COMIC_MIN_PRICE_MXN } from "@garage-comics/db/schema/comics";
import { describe, expect, it } from "vite-plus/test";

import { commissionCentavos } from "./commission";
import { pesosToCentavos } from "./money";

const MAX_PRICE_MXN = 100_000;

describe(commissionCentavos, () => {
  it("is exactly 10% for every whole-peso price a comic can have", () => {
    for (let pesos = COMIC_MIN_PRICE_MXN; pesos <= MAX_PRICE_MXN; pesos += 1) {
      const price = pesosToCentavos(pesos);
      const commission = commissionCentavos(price);

      // 10% of `pesos` pesos is `pesos / 10` pesos, which is `pesos * 10` centavos.
      expect(commission).toBe(pesos * 10);
      // The Author's share is what is left, and the database requires something to be left.
      expect(commission).toBeLessThan(price);
    }
  });

  it("rounds half up when a rate does not divide the price", () => {
    // 5% of 10 centavos is 0.5.
    expect(commissionCentavos(10, 5)).toBe(1);
    // 5% of 9 centavos is 0.45.
    expect(commissionCentavos(9, 5)).toBe(0);
    // 12.5% of 10 centavos is 1.25.
    expect(commissionCentavos(10, 12.5)).toBe(1);
  });
});
