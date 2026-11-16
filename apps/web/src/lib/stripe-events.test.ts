import { describe, expect, it } from "vite-plus/test";

import { routeCheckoutEvent } from "./stripe-events";

interface SessionFixture {
  payment_status?: string;
  metadata?: Record<string, string>;
  payment_intent?: string;
  customer_details?: { email: string };
}

const eventOf = (type: string, session: SessionFixture) => ({
  type,
  data: { object: { id: "cs_1", ...session } },
});

const orderSession = {
  payment_status: "paid",
  metadata: { kind: "order", orderId: "order-1" },
  payment_intent: "pi_1",
  customer_details: { email: "  Ana@Example.com " },
};

describe(routeCheckoutEvent, () => {
  describe("an Order paid by card or later by OXXO", () => {
    it.each([
      "checkout.session.completed",
      "checkout.session.async_payment_succeeded",
    ])("is paid on %s", (type) => {
      expect(routeCheckoutEvent(eventOf(type, orderSession))).toStrictEqual({
        kind: "order_paid",
        orderId: "order-1",
        sessionId: "cs_1",
        paymentIntentId: "pi_1",
        email: "ana@example.com",
      });
    });

    it("has no email or payment intent when Stripe sends none, as the emulator does", () => {
      const action = routeCheckoutEvent(
        eventOf("checkout.session.completed", {
          payment_status: "paid",
          metadata: { kind: "order", orderId: "order-1" },
        })
      );

      expect(action).toMatchObject({
        kind: "order_paid",
        paymentIntentId: null,
        email: null,
      });
    });

    it("ignores the unpaid completion that issues an OXXO voucher", () => {
      expect(
        routeCheckoutEvent(
          eventOf("checkout.session.completed", {
            ...orderSession,
            payment_status: "unpaid",
          })
        )
      ).toStrictEqual({ kind: "ignore", reason: "not_paid" });
    });
  });

  describe("an Order that did not get paid", () => {
    it.each([
      "checkout.session.expired",
      "checkout.session.async_payment_failed",
    ])("is cancelled on %s", (type) => {
      expect(
        routeCheckoutEvent(
          eventOf(type, {
            payment_status: "unpaid",
            metadata: { kind: "order", orderId: "order-1" },
          })
        )
      ).toStrictEqual({
        kind: "order_cancelled",
        orderId: "order-1",
        sessionId: "cs_1",
      });
    });

    it("ignores the expiry of a Registration session", () => {
      expect(
        routeCheckoutEvent(
          eventOf("checkout.session.expired", {
            payment_status: "unpaid",
            metadata: { kind: "registration", proposalId: "proposal-1" },
          })
        )
      ).toStrictEqual({ kind: "ignore", reason: "unhandled_event" });
    });
  });

  describe("a Registration", () => {
    it("is routed by its kind", () => {
      const session = {
        payment_status: "paid",
        metadata: { kind: "registration", proposalId: "proposal-1" },
      };

      expect(
        routeCheckoutEvent(eventOf("checkout.session.completed", session))
      ).toMatchObject({ kind: "registration_paid" });
    });

    it("is still routed when the session was created before `kind` existed", () => {
      expect(
        routeCheckoutEvent(
          eventOf("checkout.session.async_payment_succeeded", {
            payment_status: "paid",
            metadata: { proposalId: "proposal-1" },
          })
        )
      ).toMatchObject({ kind: "registration_paid" });
    });

    it("is never mistaken for an Order", () => {
      expect(
        routeCheckoutEvent(
          eventOf("checkout.session.completed", {
            payment_status: "paid",
            metadata: {
              kind: "registration",
              proposalId: "proposal-1",
              orderId: "order-1",
            },
          })
        ).kind
      ).toBe("registration_paid");
    });
  });

  describe("anything else", () => {
    it("ignores a paid session of an unknown kind", () => {
      expect(
        routeCheckoutEvent(
          eventOf("checkout.session.completed", {
            payment_status: "paid",
            metadata: { kind: "gift" },
          })
        )
      ).toStrictEqual({ kind: "ignore", reason: "unrecognized_session" });
    });

    it("ignores a paid session with no metadata", () => {
      expect(
        routeCheckoutEvent(
          eventOf("checkout.session.completed", { payment_status: "paid" })
        )
      ).toStrictEqual({ kind: "ignore", reason: "unrecognized_session" });
    });

    it("ignores an order session that lost its Order id", () => {
      expect(
        routeCheckoutEvent(
          eventOf("checkout.session.completed", {
            payment_status: "paid",
            metadata: { kind: "order" },
          })
        )
      ).toStrictEqual({ kind: "ignore", reason: "unrecognized_session" });
    });

    it("ignores events it does not handle", () => {
      expect(routeCheckoutEvent(eventOf("charge.refunded", {}))).toStrictEqual({
        kind: "ignore",
        reason: "unhandled_event",
      });
    });
  });
});
