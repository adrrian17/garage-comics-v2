import { describe, expect, it } from "vite-plus/test";

import { CART_MAX_ITEMS } from "./cart";
import { checkoutInput, checkoutSessionParams } from "./checkout";

const now = new Date("2027-02-03T18:00:00.000Z");

const params = checkoutSessionParams({
  orderId: "order-1",
  email: "ana@example.com",
  priceIds: ["price_1", "price_2"],
  origin: "https://garagecomics.example",
  now,
});

describe(checkoutSessionParams, () => {
  it("accepts card and OXXO, with a voucher that lasts two days", () => {
    expect(params.mode).toBe("payment");
    expect(params.allowed_payment_method_types).toStrictEqual(["card", "oxxo"]);
    expect(params.payment_method_options?.oxxo?.expires_after_days).toBe(2);
  });

  it("sells each comic once, one line per price", () => {
    expect(params.line_items).toStrictEqual([
      { price: "price_1", quantity: 1 },
      { price: "price_2", quantity: 1 },
    ]);
  });

  it("carries the Order id where the webhook and the Transfers need it", () => {
    expect(params.metadata).toStrictEqual({
      kind: "order",
      orderId: "order-1",
    });
    expect(params.payment_intent_data?.transfer_group).toBe("order-1");
  });

  it("prefills the Customer's email", () => {
    expect(params.customer_email).toBe("ana@example.com");
  });

  it("expires within the 30 minutes to 24 hours Stripe allows", () => {
    const lifetimeSeconds = (params.expires_at ?? 0) - now.getTime() / 1000;

    expect(lifetimeSeconds).toBeGreaterThan(30 * 60);
    expect(lifetimeSeconds).toBeLessThan(24 * 60 * 60);
  });

  it("returns the Customer to the confirmation page or to the cart", () => {
    expect(params.success_url).toBe(
      "https://garagecomics.example/compra/lista"
    );
    expect(params.cancel_url).toBe("https://garagecomics.example/carrito");
  });
});

describe("the checkout input", () => {
  it("trims and lowercases the email", () => {
    expect(
      checkoutInput.parse({ ids: ["a"], email: "  Ana@Example.COM " }).email
    ).toBe("ana@example.com");
  });

  it("drops repeated ids", () => {
    expect(
      checkoutInput.parse({ ids: ["a", "b", "a"], email: "ana@example.com" })
        .ids
    ).toStrictEqual(["a", "b"]);
  });

  it.each([
    ["no comics", { ids: [], email: "ana@example.com" }],
    [
      "too many comics",
      {
        ids: Array.from({ length: CART_MAX_ITEMS + 1 }, (_item, i) => `c${i}`),
        email: "ana@example.com",
      },
    ],
    ["a bad email", { ids: ["a"], email: "ana" }],
    ["no email", { ids: ["a"], email: "" }],
  ])("rejects %s", (_name, input) => {
    expect(checkoutInput.safeParse(input).success).toBeFalsy();
  });
});
